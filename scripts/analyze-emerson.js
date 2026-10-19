'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'emerson-analysis-results.json');
const PGN_FILE = path.join(ROOT, 'opponents/emerson/johnson, emerson aurelius.pgn');

const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

function isEmerson(name) { return /emerson|aurelius.*johnson|johnson.*emerson/i.test(name); }

// Map YottaBase event names to clean tournament keys
function tournamentKey(eventName) {
  if (/92nd Southwest/i.test(eventName))              return 'SW Open 2026';
  if (/81st Texas State/i.test(eventName))             return 'TX State Amateur 2026';
  if (/Texas Scholastic/i.test(eventName))             return 'TX Scholastic 2026';
  if (/National K-12/i.test(eventName))                return 'Natl K-12 2025';
  if (/91st Southwest/i.test(eventName) ||
      eventName === 'International')                   return 'SW Open 2025';
  if (eventName === '?'  || eventName === '')          return 'Unknown Tournament 2025';
  if (/National Elementary/i.test(eventName))          return 'Natl Elem 2024';
  return eventName.replace(/\s+/g, ' ').trim();
}

// Split a multi-game PGN blob into individual game strings
function splitPgn(text) {
  const games = [];
  const lines = text.split('\n');
  let current = [];
  for (const line of lines) {
    if (line.startsWith('[Event ') && current.length > 0) {
      const g = current.join('\n').trim();
      if (g) games.push(g);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    const g = current.join('\n').trim();
    if (g) games.push(g);
  }
  return games;
}

function preprocessPgn(text) {
  text = text.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  text = text.replace(/\{[^{}]*\}/g, '');
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  return text;
}

function parseGame(text) {
  const wm   = text.match(/\[White\s+"([^"]+)"\]/);
  const bm   = text.match(/\[Black\s+"([^"]+)"\]/);
  const welo = text.match(/\[WhiteElo\s+"([^"]+)"\]/);
  const belo = text.match(/\[BlackElo\s+"([^"]+)"\]/);
  const res  = text.match(/\[Result\s+"([^"]+)"\]/);
  const eco  = text.match(/\[ECO\s+"([^"]+)"\]/);
  const ev   = text.match(/\[Event\s+"([^"]+)"\]/);
  const dt   = text.match(/\[Date\s+"([^"]+)"\]/);
  const rnd  = text.match(/\[Round\s+"([^"]+)"\]/);

  const wName = wm ? wm[1] : '';
  const bName = bm ? bm[1] : '';
  const eIsW  = isEmerson(wName);
  const eIsB  = isEmerson(bName);
  if (!eIsW && !eIsB) return null;

  const prColor  = eIsW ? 'white' : 'black';
  const opponent = eIsW ? bName : wName;
  const oppElo   = eIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                        : (welo ? parseInt(welo[1]) || 0 : 0);
  const result   = res ? res[1] : '*';
  const prResult = deriveResult(result, prColor);
  const eventName = ev ? ev[1] : '?';
  // Strip sub-board suffix from round: "6.5" → "R6", "7.156" → "R7"
  const rndRaw = rnd ? rnd[1] : '?';
  const roundKey = 'R' + rndRaw.replace(/\.\d+$/, '');

  return { prColor, opponent, oppElo, result, prResult,
    eco: eco ? eco[1] : '?', event: eventName,
    tournKey: tournamentKey(eventName),
    date: dt ? dt[1] : '', roundKey, pgnText: text };
}

function deriveResult(result, prColor) {
  if (result === '1/2-1/2') return 'draw';
  if (result === '1-0') return prColor === 'white' ? 'win' : 'loss';
  if (result === '0-1') return prColor === 'black' ? 'win' : 'loss';
  return '?';
}

// ─── Stockfish engine wrapper ────────────────────────────────────────────────

class StockfishEngine {
  constructor() {
    this.proc  = spawn('stockfish');
    this.rl    = readline.createInterface({ input: this.proc.stdout });
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
    this.send('setoption name Hash value 1024');
    this.send('isready');
    await this.waitFor(l => l.trim() === 'readyok');
  }
  async evaluate(fen) {
    let score = null, pv1uci = null;
    this.send(`position fen ${fen}`);
    this.send(`go movetime 800`);
    await this.waitFor(
      l => l.startsWith('bestmove'),
      l => {
        if (l.includes('lowerbound') || l.includes('upperbound')) return;
        const cpM   = l.match(/score cp (-?\d+)/);
        const mateM = l.match(/score mate (-?\d+)/);
        const pvM   = l.match(/\bpv\s+(\S+)/);
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
    else if (score.type === 'mate') cp = score.value > 0 ? 30000 - score.value*10 : -30000 - score.value*10;
    else cp = score.value;
    return { cp, bestMoveSan };
  }
  quit() { this.send('quit'); this.proc.kill(); }
}

// ─── Accuracy helpers ────────────────────────────────────────────────────────

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp/100).toFixed(2); }

// ─── PGN repair ──────────────────────────────────────────────────────────────

function repairPgn(pgnText) {
  const clean  = preprocessPgn(pgnText);
  const body   = clean.replace(/\[[^\]]*\]/g, '').trim();
  const tokens = body.split(/\s+/).filter(t =>
    t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)
  );
  const chess  = new Chess();
  const played = [];
  for (const tok of tokens) {
    const legal = chess.moves();
    if (legal.includes(tok)) { chess.move(tok); played.push(tok); continue; }
    const piece    = tok[0];
    const variants = legal.filter(m => {
      if (!m.startsWith(piece)) return false;
      const dest = tok.replace(/[+#=QRBN].*$/, '').slice(-2);
      return m.endsWith(dest) || m.replace(/[+#=QRBN].*$/, '').endsWith(dest);
    });
    if (variants.length === 1) { chess.move(variants[0]); played.push(variants[0]); continue; }
    if (variants.length > 1) {
      let found = false;
      for (const v of variants) {
        const test    = new Chess(chess.fen());
        test.move(v);
        const nextTok = tokens[tokens.indexOf(tok) + 1];
        if (!nextTok || test.moves().includes(nextTok)) {
          chess.move(v); played.push(v); found = true; break;
        }
      }
      if (found) continue;
      chess.move(variants[0]); played.push(variants[0]); continue;
    }
    break; // completely illegal — truncate
  }
  const headers = pgnText.match(/(\[[^\]]*\])/g) || [];
  const moveStr = played.map((m, i) => i % 2 === 0 ? `${Math.floor(i/2)+1}. ${m}` : m).join(' ');
  return headers.join('\n') + '\n\n' + moveStr;
}

// ─── Per-game analysis ───────────────────────────────────────────────────────

async function analyzeGame(pgnText, prColor, engine) {
  const chess = new Chess();
  let processedPgn = preprocessPgn(pgnText);
  try { chess.loadPgn(processedPgn); }
  catch(e) {
    processedPgn = repairPgn(pgnText);
    chess.loadPgn(processedPgn);
  }
  const history = chess.history({ verbose: true });
  const replay  = new Chess();
  let prevEval  = await engine.evaluate(replay.fen());
  const moves   = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isPr = (prColor === 'white' && sideToMove === 'w') ||
                 (prColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval  = await engine.evaluate(replay.fen());
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    const moveNum    = Math.ceil(moves.length / 2) + 1;
    moves.push({
      san: move.san, isPr, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: isPr ? cpl : null, winPDrop,
      classification: isPr ? classifyMove(rawCpl) : null, moveNum,
    });
    prevEval = afterEval;
  }

  const prMoves  = moves.filter(m => m.isPr);
  const oppMoves = moves.filter(m => !m.isPr);
  if (!prMoves.length) throw new Error('No Emerson moves found');

  const avgWPD    = prMoves.reduce((s,m) => s+m.winPDrop, 0) / prMoves.length;
  const oppAvgWPD = oppMoves.length
    ? oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length : 0;

  return {
    prAccuracy:    winPDropToAccuracy(avgWPD),
    oppAccuracy:   winPDropToAccuracy(oppAvgWPD),
    avgCPL:        Math.round(prMoves.reduce((s,m) => s+m.cpl, 0) / prMoves.length),
    blunders:      prMoves.filter(m => m.classification === 'blunder').length,
    mistakes:      prMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies:  prMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed: prMoves.length,
    criticalMoments: [...prMoves].filter(m => m.cpl >= INACCURACY_CPL)
      .sort((a,b) => b.cpl - a.cpl).slice(0, 3)
      .map(m => ({
        moveNum: m.moveNum, san: m.san, bestMove: m.bestMove,
        cpl: Math.round(m.cpl), classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter),
      })),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const rawPgn  = fs.readFileSync(PGN_FILE, 'utf8');
  const allGames = splitPgn(rawPgn).map(parseGame).filter(Boolean);

  // Deduplicate: same tournament + round + opponent prefix
  const seen = new Set();
  const games = [];
  for (const g of allGames) {
    const dedupeKey = g.tournKey + '|' + g.roundKey + '|' + g.opponent.replace(/[^a-zA-Z]/g, '').slice(0, 8).toLowerCase();
    if (!seen.has(dedupeKey)) { seen.add(dedupeKey); games.push(g); }
    else console.log(`Skipping duplicate: ${g.tournKey} ${g.roundKey} vs ${g.opponent}`);
  }

  const engine = new StockfishEngine();
  await engine.init();
  console.log(`Engine ready. Threads ${SF_THREADS}  Unique games: ${games.length}\n`);

  let gameNum = 0;
  for (const info of games) {
    gameNum++;
    const { tournKey, roundKey } = info;
    if (!results[tournKey]) results[tournKey] = {};
    // Storage key: round + opponent snippet
    const key = roundKey + '_' + info.opponent.replace(/[^a-zA-Z]/g, '').slice(0, 8);

    const cached = results[tournKey][key];
    if (cached?.skipped) {
      console.log(`[${gameNum}/${games.length}] ${tournKey} ${key}  SKIP (${cached.skipped})`);
      continue;
    }
    if (cached?.prAccuracy != null) {
      console.log(`[${gameNum}/${games.length}] ${tournKey} ${key}  cached ${cached.prAccuracy}%`);
      continue;
    }

    let moveCount = 0;
    try {
      const tmp = new Chess();
      tmp.loadPgn(preprocessPgn(info.pgnText));
      moveCount = tmp.history().length;
    } catch(e) {
      try {
        const repaired = repairPgn(info.pgnText);
        const tmp2 = new Chess(); tmp2.loadPgn(repaired);
        moveCount = tmp2.history().length;
        info.pgnText = repaired;
        console.log(`[${gameNum}/${games.length}] ${tournKey} ${key} — repaired PGN (${moveCount} moves)`);
      } catch(e2) {
        console.log(`[${gameNum}/${games.length}] ${tournKey} ${key} — SKIP parse: ${e.message}`);
        results[tournKey][key] = { ...info, skipped: 'parse-error' };
        delete results[tournKey][key].pgnText;
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        continue;
      }
    }
    if (moveCount < 5) {
      console.log(`[${gameNum}/${games.length}] ${tournKey} ${key} — SKIP ${moveCount} moves`);
      results[tournKey][key] = { ...info, skipped: 'too-short' };
      delete results[tournKey][key].pgnText;
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      continue;
    }

    process.stdout.write(
      `[${gameNum}/${games.length}] ${tournKey} ${key}  vs ${info.opponent.split(',')[0]} (${info.oppElo})  ${info.prColor}  ${info.prResult.toUpperCase()}  ${moveCount}ply...`
    );
    const t0 = Date.now();
    let stats;
    try { stats = await analyzeGame(info.pgnText, info.prColor, engine); }
    catch(e) { console.error(`\n  Error: ${e.message}`); continue; }
    console.log(
      ` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.prAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`
    );

    results[tournKey][key] = { ...info, ...stats };
    delete results[tournKey][key].pgnText;
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  }

  engine.quit();

  console.log('\n' + '─'.repeat(60));
  let allAccs = [];
  for (const [tk, gamesObj] of Object.entries(results)) {
    const entries = Object.values(gamesObj);
    const accs    = entries.filter(g => !g.skipped && g.prAccuracy != null).map(g => g.prAccuracy);
    if (!accs.length) continue;
    const avg    = (accs.reduce((a,b) => a+b, 0) / accs.length).toFixed(1);
    const wins   = entries.filter(g => g.prResult === 'win').length;
    const losses = entries.filter(g => g.prResult === 'loss').length;
    const draws  = entries.filter(g => g.prResult === 'draw').length;
    console.log(`${tk.padEnd(32)} ${accs.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
  }
  if (allAccs.length) {
    const overall = (allAccs.reduce((a,b) => a+b, 0) / allAccs.length).toFixed(1);
    console.log(`\n=== OVERALL: ${allAccs.length} games  avg acc ${overall}% ===`);
  }
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
