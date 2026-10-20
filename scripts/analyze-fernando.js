'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'fernando-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

// Directory-based tournaments (one PGN per round)
const TOURNAMENTS = [
  { dir: 'pamschool2026',    name: 'PAM School 2026' },
  { dir: 'olypianational2026', name: 'Olympia Nacional 2026' },
  { dir: 'ed-national',      name: 'ED Nacional 2026' },
];

// Standalone multi-game PGN files (not directories)
const STANDALONE = [
  { file: 'mex-ch16th.pgn', name: 'MEX-ch 16th' },
  { file: 'mex-op71.pgn',   name: 'MEX Open 71st' },
];

function isFernando(name) { return /cortes\s*medina,?\s*fernando/i.test(name); }

function preprocessPgn(text) {
  text = text.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  text = text.replace(/\{[^{}]*\}/g, '');
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  return text;
}

function parseGameInfo(text) {
  const wm   = text.match(/\[White\s+"([^"]+)"\]/);
  const bm   = text.match(/\[Black\s+"([^"]+)"\]/);
  const welo = text.match(/\[WhiteElo\s+"([^"]+)"\]/);
  const belo = text.match(/\[BlackElo\s+"([^"]+)"\]/);
  const res  = text.match(/\[Result\s+"([^"]+)"\]/);
  const eco  = text.match(/\[ECO\s+"([^"]+)"\]/);

  const wName = wm ? wm[1] : '';
  const bName = bm ? bm[1] : '';
  const fIsW = isFernando(wName);
  const fIsB = isFernando(bName);
  if (!fIsW && !fIsB) return null;

  const fernandoColor = fIsW ? 'white' : 'black';
  const opponent      = fIsW ? bName : wName;
  const opponentElo   = fIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                              : (welo ? parseInt(welo[1]) || 0 : 0);
  const result        = res ? res[1] : '*';
  let fernandoResult  = '?';
  if (result === '1/2-1/2') fernandoResult = 'draw';
  else if (result === '1-0') fernandoResult = fernandoColor === 'white' ? 'win' : 'loss';
  else if (result === '0-1') fernandoResult = fernandoColor === 'black' ? 'win' : 'loss';

  return { fernandoColor, opponent, opponentElo, result, fernandoResult, eco: eco ? eco[1] : '?' };
}

function splitGames(text) {
  const parts = text.split(/(?=\[Event\s+")/);
  return parts.map(p => p.trim()).filter(p => p.length > 0);
}

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
  async evaluate(fen, useMoveTime = true) {
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

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp/100).toFixed(2); }

async function analyzeGame(pgnText, fernandoColor, engine) {
  const chess = new Chess();
  chess.loadPgn(preprocessPgn(pgnText));
  const history = chess.history({ verbose: true });
  const replay  = new Chess();
  let prevEval  = await engine.evaluate(replay.fen());
  const moves   = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isF = (fernandoColor === 'white' && sideToMove === 'w') ||
                (fernandoColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    moves.push({ san: move.san, isF, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: isF ? cpl : null, winPDrop,
      classification: isF ? classifyMove(rawCpl) : null });
    prevEval = afterEval;
  }

  const fMoves   = moves.filter(m => m.isF);
  const oppMoves = moves.filter(m => !m.isF);
  const avgWPD    = fMoves.reduce((s,m) => s+m.winPDrop, 0) / fMoves.length;
  const oppAvgWPD = oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length;

  return {
    fernandoAccuracy: winPDropToAccuracy(avgWPD),
    oppAccuracy:      winPDropToAccuracy(oppAvgWPD),
    avgCPL:           Math.round(fMoves.reduce((s,m) => s+m.cpl, 0) / fMoves.length),
    blunders:         fMoves.filter(m => m.classification === 'blunder').length,
    mistakes:         fMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies:     fMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed:    fMoves.length,
    criticalMoments:  [...fMoves].filter(m => m.cpl >= INACCURACY_CPL)
      .sort((a,b) => b.cpl-a.cpl).slice(0,3)
      .map(m => ({ san: m.san, bestMove: m.bestMove, cpl: Math.round(m.cpl),
        classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter) })),
  };
}

async function processGame(gamePgn, tournamentName, key, results, engine, label) {
  const info = parseGameInfo(gamePgn);
  if (!info) return;

  if (results[tournamentName]?.[key]?.fernandoAccuracy != null) {
    console.log(`${label}  cached ${results[tournamentName][key].fernandoAccuracy}%`);
    return;
  }

  let moveCount = 0;
  try {
    const tmp = new Chess();
    tmp.loadPgn(preprocessPgn(gamePgn));
    moveCount = tmp.history().length;
  } catch(e) {
    console.log(`${label} — SKIP parse: ${e.message}`);
    return;
  }
  if (moveCount < 5) {
    console.log(`${label} — SKIP ${moveCount} moves`);
    return;
  }

  process.stdout.write(`${label}  vs ${info.opponent} (${info.opponentElo})  Fernando ${info.fernandoColor}  ${info.fernandoResult.toUpperCase()}  ${moveCount}ply...`);
  const t0 = Date.now();
  let stats;
  try { stats = await analyzeGame(gamePgn, info.fernandoColor, engine); }
  catch(e) { console.error(`\n  Error: ${e.message}`); return; }
  console.log(` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.fernandoAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`);

  if (!results[tournamentName]) results[tournamentName] = {};
  results[tournamentName][key] = { ...info, ...stats };
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const engine = new StockfishEngine();
  await engine.init();

  // Build file list: directory-based tournaments
  let allTasks = [];
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/fernando', t.dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(pgn|ogn)$/i.test(f)).sort();
    for (const f of files) {
      const key = f.replace(/\.(pgn|ogn)$/i, '').replace(/^round/i, 'R');
      allTasks.push({ file: path.join(dir, f), name: t.name, key, multi: false });
    }
  }

  // Standalone multi-game files
  for (const s of STANDALONE) {
    const fp = path.join(ROOT, 'opponents/fernando', s.file);
    if (!fs.existsSync(fp)) continue;
    const text = fs.readFileSync(fp, 'utf8');
    const games = splitGames(text).filter(g => parseGameInfo(g) !== null);
    games.forEach((g, i) => {
      allTasks.push({ pgn: g, name: s.name, key: `G${i+1}`, multi: true });
    });
  }

  console.log(`Engine ready. Depth 18 (movetime 800)  Threads ${SF_THREADS}  Total tasks: ${allTasks.length}\n`);

  let num = 0;
  for (const task of allTasks) {
    num++;
    const label = `[${num}/${allTasks.length}] ${task.name} ${task.key}`;
    if (!results[task.name]) results[task.name] = {};
    const gamePgn = task.multi ? task.pgn : fs.readFileSync(task.file, 'utf8');
    // For directory files, each file may contain 1 game (or multiple — use splitGames)
    if (!task.multi) {
      const games = splitGames(gamePgn).filter(g => parseGameInfo(g) !== null);
      if (games.length === 0) { console.log(`${label} — SKIP (no Fernando game)`); continue; }
      for (let i = 0; i < games.length; i++) {
        const k = games.length > 1 ? `${task.key}-g${i+1}` : task.key;
        await processGame(games[i], task.name, k, results, engine, `[${num}/${allTasks.length}] ${task.name} ${k}`);
      }
    } else {
      await processGame(gamePgn, task.name, task.key, results, engine, label);
    }
  }

  engine.quit();

  console.log('\n' + '─'.repeat(60));
  const allNames = [...TOURNAMENTS.map(t => t.name), ...STANDALONE.map(s => s.name)];
  let allAccs = [], whiteAccs = [], blackAccs = [];
  for (const name of allNames) {
    const entries = Object.values(results[name] || {});
    const accs = entries.filter(g => g.fernandoAccuracy != null).map(g => g.fernandoAccuracy);
    if (!accs.length) continue;
    const avg = (accs.reduce((a,b)=>a+b,0)/accs.length).toFixed(1);
    const wins = entries.filter(g => g.fernandoResult==='win').length;
    const losses = entries.filter(g => g.fernandoResult==='loss').length;
    const draws = entries.filter(g => g.fernandoResult==='draw').length;
    console.log(`${name.padEnd(25)}  ${entries.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
    entries.filter(g => g.fernandoAccuracy != null).forEach(g => {
      if (g.fernandoColor === 'white') whiteAccs.push(g.fernandoAccuracy);
      else blackAccs.push(g.fernandoAccuracy);
    });
  }
  if (allAccs.length) {
    const overall = (allAccs.reduce((a,b)=>a+b,0)/allAccs.length).toFixed(1);
    const wAvg = whiteAccs.length ? (whiteAccs.reduce((a,b)=>a+b,0)/whiteAccs.length).toFixed(1) : 'n/a';
    const bAvg = blackAccs.length ? (blackAccs.reduce((a,b)=>a+b,0)/blackAccs.length).toFixed(1) : 'n/a';
    console.log(`\nOverall: ${allAccs.length} games  avg ${overall}%  (White ${wAvg}%  Black ${bAvg}%)`);
  }
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
