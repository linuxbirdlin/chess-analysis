'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'zachary-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

const TOURNAMENTS = [
  { dir: 'britishleague',   name: 'BC Chess Cup 2026' },
  { dir: 'bscup2026',       name: 'Greater Vancouver 2026' },
  { dir: 'canadaclose2026', name: 'Canada Closed 2026' },
  { dir: 'pam2026',         name: 'PAM 2026' },
  { dir: 'pamschool2026',   name: 'PAM School 2026' },
];

function isZachary(name) { return /liu,?\s*zachary/i.test(name); }

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
  const zIsW = isZachary(wName);
  const zIsB = isZachary(bName);
  if (!zIsW && !zIsB) return null;

  const zacharyColor = zIsW ? 'white' : 'black';
  const opponent     = zIsW ? bName : wName;
  const opponentElo  = zIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                             : (welo ? parseInt(welo[1]) || 0 : 0);
  const result       = res ? res[1] : '*';
  let zacharyResult  = '?';
  if (result === '1/2-1/2') zacharyResult = 'draw';
  else if (result === '1-0') zacharyResult = zacharyColor === 'white' ? 'win' : 'loss';
  else if (result === '0-1') zacharyResult = zacharyColor === 'black' ? 'win' : 'loss';

  return { zacharyColor, opponent, opponentElo, result, zacharyResult, eco: eco ? eco[1] : '?' };
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

async function analyzeGame(pgnText, zacharyColor, engine) {
  const chess = new Chess();
  chess.loadPgn(preprocessPgn(pgnText));
  const history = chess.history({ verbose: true });
  const replay  = new Chess();
  const useMT   = true;
  let prevEval  = await engine.evaluate(replay.fen(), useMT);
  const moves   = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isZach = (zacharyColor === 'white' && sideToMove === 'w') ||
                   (zacharyColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen(), useMT);
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    moves.push({ san: move.san, isZach, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: isZach ? cpl : null, winPDrop,
      classification: isZach ? classifyMove(rawCpl) : null });
    prevEval = afterEval;
  }

  const zachMoves = moves.filter(m => m.isZach);
  const oppMoves  = moves.filter(m => !m.isZach);
  const avgWPD    = zachMoves.reduce((s,m) => s+m.winPDrop, 0) / zachMoves.length;
  const oppAvgWPD = oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length;

  return {
    zacharyAccuracy: winPDropToAccuracy(avgWPD),
    oppAccuracy:     winPDropToAccuracy(oppAvgWPD),
    avgCPL:          Math.round(zachMoves.reduce((s,m) => s+m.cpl, 0) / zachMoves.length),
    blunders:        zachMoves.filter(m => m.classification === 'blunder').length,
    mistakes:        zachMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies:    zachMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed:   zachMoves.length,
    criticalMoments: [...zachMoves].filter(m => m.cpl >= INACCURACY_CPL)
      .sort((a,b) => b.cpl-a.cpl).slice(0,3)
      .map(m => ({ san: m.san, bestMove: m.bestMove, cpl: Math.round(m.cpl),
        classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter) })),
  };
}

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const engine = new StockfishEngine();
  await engine.init();

  let totalGames = 0;
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/zachary', t.dir);
    totalGames += fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).length;
  }
  console.log(`Engine ready. Depth ${SF_DEPTH}  Threads ${SF_THREADS}  Total games: ${totalGames}\n`);

  let gameNum = 0;
  for (const t of TOURNAMENTS) {
    const dir   = path.join(ROOT, 'opponents/zachary', t.dir);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).sort();
    if (!results[t.name]) results[t.name] = {};

    for (const file of files) {
      gameNum++;
      const roundKey = file.replace(/\.pgn$/i, '')
        .replace(/^game_/, 'G').replace(/^roung/i, 'R').replace(/^round/i, 'R');
      const rawPgn = fs.readFileSync(path.join(dir, file), 'utf8');
      const info   = parseGameInfo(rawPgn);
      if (!info) { console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP (no Zachary header)`); continue; }

      const cached = results[t.name][roundKey];
      if (cached?.skipped) { console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey}  SKIP (${cached.skipped})`); continue; }
      if (cached?.zacharyAccuracy != null) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey}  cached ${cached.zacharyAccuracy}%`);
        continue;
      }

      let moveCount = 0;
      try { const tmp = new Chess(); tmp.loadPgn(preprocessPgn(rawPgn)); moveCount = tmp.history().length; }
      catch(e) { console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP parse: ${e.message}`); continue; }
      if (moveCount < 5) { console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP ${moveCount} moves`); continue; }

      process.stdout.write(`[${gameNum}/${totalGames}] ${t.name} ${roundKey}  vs ${info.opponent} (${info.opponentElo})  Zachary ${info.zacharyColor}  ${info.zacharyResult.toUpperCase()}  ${moveCount}ply...`);
      const t0 = Date.now();
      let stats;
      try { stats = await analyzeGame(rawPgn, info.zacharyColor, engine); }
      catch(e) { console.error(`\n  Error: ${e.message}`); continue; }
      console.log(` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.zacharyAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`);

      results[t.name][roundKey] = { ...info, ...stats };
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    }
  }

  engine.quit();

  console.log('\n' + '─'.repeat(60));
  let allAccs = [];
  for (const t of TOURNAMENTS) {
    const entries = Object.values(results[t.name] || {});
    const accs = entries.filter(g => !g.skipped).map(g => g.zacharyAccuracy).filter(a => a != null);
    if (!accs.length) continue;
    const avg = (accs.reduce((a,b)=>a+b,0)/accs.length).toFixed(1);
    const wins = entries.filter(g => g.zacharyResult==='win').length;
    const losses = entries.filter(g => g.zacharyResult==='loss').length;
    const draws = entries.filter(g => g.zacharyResult==='draw').length;
    console.log(`${t.name.padEnd(25)}  ${entries.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
  }
  const overall = (allAccs.reduce((a,b)=>a+b,0)/allAccs.length).toFixed(1);
  console.log(`\nOverall: ${allAccs.length} games  avg ${overall}%`);
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
