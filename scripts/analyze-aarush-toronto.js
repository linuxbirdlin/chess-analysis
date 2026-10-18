'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const PGN_FILE = path.join(ROOT, 'opponents/aarush/torontoopen2026/round6.pgn');
const RESULTS_FILE = path.join(__dirname, 'aarush-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '8', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

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
    this.send(`go depth ${SF_DEPTH}`);
    await this.waitFor(
      l => l.startsWith('bestmove'),
      l => {
        const dm = l.match(/\bdepth (\d+)\b/);
        if (!dm || parseInt(dm[1]) !== SF_DEPTH) return;
        if (l.includes('lowerbound') || l.includes('upperbound')) return;
        const cpM = l.match(/score cp (-?\d+)/);
        const mateM = l.match(/score mate (-?\d+)/);
        const pvM = l.match(/\bpv\s+(\S+)/);
        if (cpM) score = { type: 'cp', value: parseInt(cpM[1]) };
        if (mateM) score = { type: 'mate', value: parseInt(mateM[1]) };
        if (pvM) pv1uci = pvM[1];
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
    else if (score.type === 'mate') cp = score.value > 0 ? 30000 - score.value*10 : -30000 - score.value*10;
    else cp = score.value;
    return { cp, bestMoveSan };
  }
  quit() { this.send('quit'); this.proc.kill(); }
}

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp/100).toFixed(2); }

async function main() {
  // Strip inline Lichess annotations and comments so chess.js can parse cleanly
  let pgn = fs.readFileSync(PGN_FILE, 'utf8');
  pgn = pgn.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  // Strip comments
  pgn = pgn.replace(/\{[^{}]*\}/g, '');
  // Strip RAVs iteratively
  let prev;
  do { prev = pgn; pgn = pgn.replace(/\([^()]*\)/g, ''); } while (pgn !== prev);

  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  console.log(`Loaded ${history.length} moves. Aarush is Black.`);

  const engine = new StockfishEngine();
  await engine.init();
  console.log(`Engine ready. Analyzing at depth ${SF_DEPTH}...`);

  const replay = new Chess();
  let prevEval = await engine.evaluate(replay.fen());
  const moves = [];

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const sideToMove = replay.turn();
    const isAarush = sideToMove === 'b'; // Aarush is Black
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());

    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter = 100 - cpToWinP(afterEval.cp);
    const winPDrop = Math.max(0, winPBefore - winPAfter);
    const rawCpl = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl = Math.min(rawCpl, 1000);

    moves.push({ san: move.san, isAarush, evalBefore: prevEval.cp, evalAfter: -afterEval.cp, bestMove: prevEval.bestMoveSan, cpl: isAarush ? cpl : null, winPDrop, classification: isAarush ? classifyMove(rawCpl) : null });
    process.stdout.write(`\r  Move ${i+1}/${history.length}`);
    prevEval = afterEval;
  }

  const aarushMoves = moves.filter(m => m.isAarush);
  const oppMoves = moves.filter(m => !m.isAarush);
  const avgWPD = aarushMoves.reduce((s,m) => s+m.winPDrop, 0) / aarushMoves.length;
  const oppAvgWPD = oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length;

  const result = {
    aarushAccuracy: winPDropToAccuracy(avgWPD),
    oppAccuracy: winPDropToAccuracy(oppAvgWPD),
    avgCPL: Math.round(aarushMoves.reduce((s,m) => s+m.cpl, 0) / aarushMoves.length),
    blunders: aarushMoves.filter(m => m.classification === 'blunder').length,
    mistakes: aarushMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies: aarushMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed: aarushMoves.length,
    criticalMoments: [...aarushMoves].filter(m => m.cpl >= INACCURACY_CPL).sort((a,b) => b.cpl-a.cpl).slice(0,3).map(m => ({
      san: m.san, bestMove: m.bestMove, cpl: Math.round(m.cpl), classification: m.classification,
      evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter)
    })),
    aarushColor: 'black',
    opponent: 'Gao, Raymond',
    opponentElo: 2086,
    round: 6,
    result: '1-0',
    aarushResult: 'loss',
    eco: 'A00'
  };

  engine.quit();
  console.log(`\n\nAarush acc: ${result.aarushAccuracy}%  Opp: ${result.oppAccuracy}%  CPL: ${result.avgCPL}  B:${result.blunders} M:${result.mistakes} I:${result.inaccuracies}`);
  result.criticalMoments.forEach(cm => console.log(`  ${cm.classification.toUpperCase().padEnd(11)} ${cm.san.padEnd(8)} best:${cm.bestMove||'?'}  ${cm.evalBefore}→${cm.evalAfter}  CPL:${cm.cpl}`));

  const all = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  if (!all['Toronto Open 2026']) all['Toronto Open 2026'] = {};
  all['Toronto Open 2026']['R6'] = result;
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(all, null, 2));
  console.log('\nSaved to aarush-analysis-results.json');
}

main().catch(e => { console.error('\nError:', e.message); process.exit(1); });
