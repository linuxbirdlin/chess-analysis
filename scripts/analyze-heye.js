'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'heye-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

const TOURNAMENTS = [
  { dir: 'canadaclose2026', name: 'Canada Closed 2026' },
  { dir: 'ontario2026',     name: 'Ontario Open 2026' },
  { dir: 'pam2026',         name: 'PAM 2026' },
  { dir: 'torontopen2026',  name: 'Toronto Open 2026' },
];

// Single PGN files containing multiple games from multiple tournaments
// Each game's [Event] tag is used as the tournament key
const MULTI_GAME_FILES = [
  path.join(ROOT, 'opponents/heye/royalmaster2025.pgn'),
];

function isHeye(name) { return /gao,?\s*heye/i.test(name) || /heye,?\s*gao/i.test(name); }

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
  const hIsW = isHeye(wName);
  const hIsB = isHeye(bName);
  if (!hIsW && !hIsB) return null;

  const heyeColor  = hIsW ? 'white' : 'black';
  const opponent   = hIsW ? bName : wName;
  const opponentElo = hIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                            : (welo ? parseInt(welo[1]) || 0 : 0);
  const result     = res ? res[1] : '*';
  let heyeResult   = '?';
  if (result === '1/2-1/2') heyeResult = 'draw';
  else if (result === '1-0') heyeResult = heyeColor === 'white' ? 'win' : 'loss';
  else if (result === '0-1') heyeResult = heyeColor === 'black' ? 'win' : 'loss';

  return { heyeColor, opponent, opponentElo, result, heyeResult, eco: eco ? eco[1] : '?' };
}

// Split a file that may contain multiple PGN games
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
  async evaluate(fen, useMoveTime = false) {
    let score = null, pv1uci = null;
    this.send(`position fen ${fen}`);
    if (useMoveTime) {
      this.send(`go movetime 800`);
    } else {
      this.send(`go depth ${SF_DEPTH}`);
    }
    await this.waitFor(
      l => l.startsWith('bestmove'),
      l => {
        if (!useMoveTime) {
          const dm = l.match(/\bdepth (\d+)\b/);
          if (!dm || parseInt(dm[1]) !== SF_DEPTH) return;
        }
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

async function analyzeGame(pgnText, heyeColor, engine) {
  const chess = new Chess();
  chess.loadPgn(preprocessPgn(pgnText));
  const history = chess.history({ verbose: true });
  const replay  = new Chess();
  const useMT   = true;
  let prevEval  = await engine.evaluate(replay.fen(), useMT);
  const moves   = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isH = (heyeColor === 'white' && sideToMove === 'w') ||
                (heyeColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen(), useMT);
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    moves.push({ san: move.san, isH, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: isH ? cpl : null, winPDrop,
      classification: isH ? classifyMove(rawCpl) : null });
    prevEval = afterEval;
  }

  const hMoves   = moves.filter(m => m.isH);
  const oppMoves = moves.filter(m => !m.isH);
  const avgWPD    = hMoves.reduce((s,m) => s+m.winPDrop, 0) / hMoves.length;
  const oppAvgWPD = oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length;

  return {
    heyeAccuracy: winPDropToAccuracy(avgWPD),
    oppAccuracy:  winPDropToAccuracy(oppAvgWPD),
    avgCPL:       Math.round(hMoves.reduce((s,m) => s+m.cpl, 0) / hMoves.length),
    blunders:     hMoves.filter(m => m.classification === 'blunder').length,
    mistakes:     hMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies: hMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed: hMoves.length,
    criticalMoments: [...hMoves].filter(m => m.cpl >= INACCURACY_CPL)
      .sort((a,b) => b.cpl-a.cpl).slice(0,3)
      .map(m => ({ san: m.san, bestMove: m.bestMove, cpl: Math.round(m.cpl),
        classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter) })),
  };
}

async function processFile(filePath, inlinePgn, tournamentName, roundKey, results, engine, gameNum, totalGames) {
  const rawPgn = inlinePgn != null ? inlinePgn : fs.readFileSync(filePath, 'utf8');
  const games = inlinePgn != null ? [inlinePgn] : splitGames(rawPgn);

  // Find the game(s) involving Heye
  const heyeGames = games.filter(g => parseGameInfo(g) !== null);

  if (heyeGames.length === 0) {
    console.log(`[${gameNum}/${totalGames}] ${tournamentName} ${roundKey} — SKIP (no Heye header)`);
    return;
  }

  // For files with multiple games (e.g. direct-encounter.pgn), process each Heye game
  for (let i = 0; i < heyeGames.length; i++) {
    const gamePgn = heyeGames[i];
    const suffix = heyeGames.length > 1 ? `-g${i+1}` : '';
    const key = roundKey + suffix;
    const info = parseGameInfo(gamePgn);

    const cached = results[tournamentName]?.[key];
    if (cached?.skipped) {
      console.log(`[${gameNum}/${totalGames}] ${tournamentName} ${key}  SKIP (${cached.skipped})`);
      continue;
    }
    if (cached?.heyeAccuracy != null) {
      console.log(`[${gameNum}/${totalGames}] ${tournamentName} ${key}  cached ${cached.heyeAccuracy}%`);
      continue;
    }

    let moveCount = 0;
    try {
      const tmp = new Chess();
      tmp.loadPgn(preprocessPgn(gamePgn));
      moveCount = tmp.history().length;
    } catch(e) {
      console.log(`[${gameNum}/${totalGames}] ${tournamentName} ${key} — SKIP parse: ${e.message}`);
      continue;
    }
    if (moveCount < 5) {
      console.log(`[${gameNum}/${totalGames}] ${tournamentName} ${key} — SKIP ${moveCount} moves`);
      continue;
    }

    process.stdout.write(`[${gameNum}/${totalGames}] ${tournamentName} ${key}  vs ${info.opponent} (${info.opponentElo})  Heye ${info.heyeColor}  ${info.heyeResult.toUpperCase()}  ${moveCount}ply...`);
    const t0 = Date.now();
    let stats;
    try { stats = await analyzeGame(gamePgn, info.heyeColor, engine); }
    catch(e) { console.error(`\n  Error: ${e.message}`); continue; }
    console.log(` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.heyeAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`);

    if (!results[tournamentName]) results[tournamentName] = {};
    results[tournamentName][key] = { ...info, ...stats };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  }
}

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const engine = new StockfishEngine();
  await engine.init();

  // Count total files
  let allFiles = [];
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/heye', t.dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(pgn|ogn)$/i.test(f)).sort();
    files.forEach(f => allFiles.push({ file: path.join(dir, f), name: t.name, key: f.replace(/\.(pgn|ogn)$/i,'').replace(/^game_/,'G').replace(/^round/i,'R') }));
  }
  // Add direct encounter
  const directPath = path.join(ROOT, 'opponents/heye/direct-encounter.pgn');
  if (fs.existsSync(directPath)) allFiles.push({ file: directPath, name: 'Direct Encounter', key: 'direct' });

  // Add multi-tournament single PGN files — each game stored under its [Event] tag
  for (const mf of MULTI_GAME_FILES) {
    if (!fs.existsSync(mf)) continue;
    const raw = fs.readFileSync(mf, 'utf8');
    const games = splitGames(raw);
    for (const gamePgn of games) {
      if (!parseGameInfo(gamePgn)) continue;
      const evM  = gamePgn.match(/\[Event\s+"([^"]+)"\]/);
      const rndM = gamePgn.match(/\[Round\s+"([^"]+)"\]/);
      const evName = evM ? evM[1].trim() : 'Other';
      const rndKey = rndM ? 'R' + rndM[1].replace(/\.\d+$/, '') : 'R?';
      allFiles.push({ pgnText: gamePgn, name: evName, key: rndKey });
    }
  }

  console.log(`Engine ready. Depth ${SF_DEPTH}  Threads ${SF_THREADS}  Total files: ${allFiles.length}\n`);

  let gameNum = 0;
  for (const { file, pgnText, name, key } of allFiles) {
    gameNum++;
    if (!results[name]) results[name] = {};
    await processFile(file, pgnText, name, key, results, engine, gameNum, allFiles.length);
  }

  engine.quit();

  console.log('\n' + '─'.repeat(60));
  let allAccs = [];
  const extraNames = new Set(Object.keys(results).filter(k => !TOURNAMENTS.some(t => t.name === k) && k !== 'Direct Encounter'));
  const allTourneys = [...TOURNAMENTS, { name: 'Direct Encounter' }, ...[...extraNames].map(n => ({ name: n }))];
  for (const t of allTourneys) {
    const entries = Object.values(results[t.name] || {});
    const accs = entries.filter(g => !g.skipped).map(g => g.heyeAccuracy).filter(a => a != null);
    if (!accs.length) continue;
    const avg = (accs.reduce((a,b)=>a+b,0)/accs.length).toFixed(1);
    const wins = entries.filter(g => g.heyeResult==='win').length;
    const losses = entries.filter(g => g.heyeResult==='loss').length;
    const draws = entries.filter(g => g.heyeResult==='draw').length;
    console.log(`${t.name.padEnd(25)}  ${entries.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
  }
  if (allAccs.length) {
    const overall = (allAccs.reduce((a,b)=>a+b,0)/allAccs.length).toFixed(1);
    console.log(`\nOverall: ${allAccs.length} games  avg ${overall}%`);
  }
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
