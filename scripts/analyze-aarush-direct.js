'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const PGN_FILE = path.join(ROOT, 'opponents/aarush/direct-encouter.pgn');
const RESULTS_FILE = path.join(__dirname, 'aarush-direct-results.json');

const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

function preprocessPgn(text) {
  text = text.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  text = text.replace(/\{[^{}]*\}/g, '');
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  return text;
}

// Split multi-game PGN into individual games
function splitGames(text) {
  const games = [];
  const chunks = text.split(/(?=\[Event\s)/);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (trimmed) games.push(trimmed);
  }
  return games;
}

function parseHeaders(text) {
  const get = tag => { const m = text.match(new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`)); return m ? m[1] : null; };
  return {
    white: get('White'),
    black: get('Black'),
    result: get('Result'),
    eco: get('ECO'),
    opening: get('Opening'),
    date: get('Date'),
    event: get('Event'),
    chapterName: get('ChapterName'),
  };
}

class StockfishEngine {
  constructor() {
    this.proc = spawn('stockfish');
    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.queue = [];
    this.rl.on('line', line => {
      if (!this.queue.length) return;
      const head = this.queue[0];
      head.accum?.(line);
      if (head.check(line)) { this.queue.shift(); head.resolve(line); }
    });
  }
  send(cmd) { this.proc.stdin.write(cmd + '\n'); }
  waitFor(check, accum) { return new Promise(r => this.queue.push({ check, accum, resolve: r })); }
  async init() {
    this.send('uci');
    await this.waitFor(l => l.trim() === 'uciok');
    this.send(`setoption name Threads value ${SF_THREADS}`);
    this.send('setoption name Hash value 512');
    this.send('isready');
    await this.waitFor(l => l.trim() === 'readyok');
  }
  async evaluate(fen) {
    let score = null, pv1uci = null;
    this.send(`position fen ${fen}`);
    this.send(`go movetime 1500`);
    await this.waitFor(
      l => l.startsWith('bestmove'),
      l => {
        if (l.includes('lowerbound') || l.includes('upperbound')) return;
        const cpM = l.match(/score cp (-?\d+)/);
        const mateM = l.match(/score mate (-?\d+)/);
        const pvM = l.match(/\bpv\s+(\S+)/);
        if (cpM)   score  = { type: 'cp',   value: parseInt(cpM[1]) };
        if (mateM) score  = { type: 'mate', value: parseInt(mateM[1]) };
        if (pvM)   pv1uci = pvM[1];
      }
    );
    let bestMoveSan = null;
    if (pv1uci) {
      try {
        const tmp = new Chess(fen);
        const m = tmp.move({ from: pv1uci.slice(0,2), to: pv1uci.slice(2,4), promotion: pv1uci[4] });
        if (m) bestMoveSan = m.san;
      } catch {}
    }
    let cp;
    if (!score) cp = 0;
    else if (score.type === 'mate') cp = score.value > 0 ? 30000 - score.value * 10 : -30000 - score.value * 10;
    else cp = score.value;
    return { cp, bestMoveSan };
  }
  quit() { this.send('quit'); this.proc.kill(); }
}

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp / 100).toFixed(2); }

async function analyzeGame(pgnText, austinColor, engine) {
  const chess = new Chess();
  try { chess.loadPgn(preprocessPgn(pgnText)); } catch(e) { throw new Error('PGN parse: ' + e.message); }
  const history = chess.history({ verbose: true });
  if (history.length < 5) throw new Error('Too short: ' + history.length + ' moves');

  const replay = new Chess();
  let prevEval = await engine.evaluate(replay.fen());
  const moves = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isAustin = (austinColor === 'white' && sideToMove === 'w') ||
                     (austinColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    moves.push({
      san: move.san, isAustin, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: cpl, winPDrop,
      classification: classifyMove(rawCpl),
    });
    prevEval = afterEval;
  }

  const austinMoves = moves.filter(m => m.isAustin);
  const oppMoves    = moves.filter(m => !m.isAustin);
  const avgWPD    = austinMoves.reduce((s, m) => s + m.winPDrop, 0) / austinMoves.length;
  const oppAvgWPD = oppMoves.reduce((s, m) => s + m.winPDrop, 0) / oppMoves.length;

  return {
    austinAccuracy: winPDropToAccuracy(avgWPD),
    oppAccuracy:    winPDropToAccuracy(oppAvgWPD),
    avgCPL:         Math.round(austinMoves.reduce((s, m) => s + m.cpl, 0) / austinMoves.length),
    blunders:       austinMoves.filter(m => m.classification === 'blunder').length,
    mistakes:       austinMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies:   austinMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed:  austinMoves.length,
    criticalMoments: [...moves].filter(m => m.isAustin && m.cpl >= INACCURACY_CPL)
      .sort((a, b) => b.cpl - a.cpl).slice(0, 5)
      .map(m => ({
        san: m.san, bestMove: m.bestMove, cpl: Math.round(m.cpl),
        classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter),
      })),
    // Full move list for detailed review
    allMoves: moves.map(m => ({
      san: m.san, isAustin: m.isAustin,
      evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter),
      cpl: Math.round(m.cpl), classification: m.classification, bestMove: m.bestMove,
    })),
  };
}

async function main() {
  const rawPgn = fs.readFileSync(PGN_FILE, 'utf8');
  const games = splitGames(rawPgn);
  console.log(`Found ${games.length} games in ${path.basename(PGN_FILE)}\n`);

  const engine = new StockfishEngine();
  await engine.init();
  console.log(`Engine ready. Threads ${SF_THREADS}  movetime 1500ms\n`);

  const results = [];

  for (let i = 0; i < games.length; i++) {
    const pgn = games[i];
    const h = parseHeaders(pgn);
    const label = h.chapterName || h.event || `Game ${i+1}`;
    const date = h.date || '?';

    // Determine Austin's color
    let austinColor = 'unknown';
    if (h.white && h.white.toLowerCase().includes('austin')) austinColor = 'white';
    else if (h.black && h.black.toLowerCase().includes('austin')) austinColor = 'black';
    else if (h.white && h.white.toLowerCase().includes('aarush')) austinColor = 'black';
    else if (h.black && h.black.toLowerCase().includes('aarush')) austinColor = 'white';
    // Games without headers: infer from opening (1.d4 = likely Aarush White per his known repertoire)
    // Strip headers first so UTCDate "2026.02.16" doesn't match before the move text
    else {
      const noHeaders = pgn.replace(/^\[.*?\]\s*$/gm, '');
      const firstMove = noHeaders.match(/\b1\.\s*([A-Za-z]\w*)/);
      if (firstMove && firstMove[1] === 'd4') austinColor = 'black';
      else if (firstMove && firstMove[1] === 'e4') austinColor = 'white';
    }

    const result = h.result || '*';
    const eco = h.eco || '?';
    const opening = h.opening || '?';

    console.log(`[${i+1}/${games.length}] ${label} (${date})  ECO:${eco}  Austin:${austinColor}  Result:${result}`);

    let stats;
    try {
      const t0 = Date.now();
      stats = await analyzeGame(pgn, austinColor, engine);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  Done in ${elapsed}s  Austin acc:${stats.austinAccuracy}%  Opp acc:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`);
      if (stats.criticalMoments.length) {
        console.log('  Critical moments (Austin):');
        stats.criticalMoments.forEach(cm => {
          console.log(`    ${cm.san} (${cm.classification}, ${cm.cpl}cpl) best:${cm.bestMove}  ${cm.evalBefore} → ${cm.evalAfter}`);
        });
      }
    } catch(e) {
      console.log(`  SKIP: ${e.message}`);
      stats = null;
    }

    results.push({ label, date, eco, opening, austinColor, result, stats });
  }

  engine.quit();

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nSaved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
