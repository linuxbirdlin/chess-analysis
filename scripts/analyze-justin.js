#!/usr/bin/env node
/**
 * analyze-justin.js
 *
 * Runs local Stockfish depth-18 analysis on all of Justin Huang's tournament
 * games, computing accuracy for Justin and his opponents using the Lichess
 * win-probability formula.
 *
 * Results are saved to scripts/justin-analysis-results.json for use in
 * matchup preparation and review.
 *
 * Usage:
 *   node scripts/analyze-justin.js
 *
 * Options (env vars):
 *   SF_DEPTH=18     Stockfish search depth (default 18)
 *   SF_THREADS=4    Stockfish threads (default 2)
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const { spawn }     = require('child_process');
const { Chess }     = require('chess.js');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'justin-analysis-results.json');

const TOURNAMENTS = [
  {
    key:    'Canada Closed 2026',
    pgnDir: path.join(ROOT, 'justin/canadaclosed2026'),
  },
  {
    key:    'PAM 2026',
    pgnDir: path.join(ROOT, 'justin/pam2026'),
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const SF_DEPTH   = parseInt(process.env.SF_DEPTH   || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '2',  10);

const INACCURACY_CPL = 50;
const MISTAKE_CPL    = 150;
const BLUNDER_CPL    = 300;

// ─── PGN helpers ──────────────────────────────────────────────────────────────
function parseRound(filename, pgn) {
  const fnMatch = path.basename(filename).match(/^round(\d+)/i);
  if (fnMatch) return parseInt(fnMatch[1], 10);
  const hdrMatch = pgn.match(/\[Round\s+"(\d+)/);
  if (hdrMatch) return parseInt(hdrMatch[1], 10);
  return null;
}

// Returns 'white' or 'black' for the color Justin played.
function parseJustinColor(pgn) {
  const white = pgn.match(/\[White\s+"([^"]+)"\]/);
  const black = pgn.match(/\[Black\s+"([^"]+)"\]/);
  if (white && /Huang,?\s*Justin/i.test(white[1])) return 'white';
  if (black && /Huang,?\s*Justin/i.test(black[1])) return 'black';
  return null;
}

function parseOpponentName(pgn, justinColor) {
  if (justinColor === 'white') {
    const m = pgn.match(/\[Black\s+"([^"]+)"\]/);
    return m ? m[1] : '?';
  }
  const m = pgn.match(/\[White\s+"([^"]+)"\]/);
  return m ? m[1] : '?';
}

function parseResult(pgn) {
  const m = pgn.match(/\[Result\s+"([^"]+)"\]/);
  if (!m) return '?';
  const raw = m[1];
  // Return from Justin's perspective
  return raw; // caller will interpret based on color
}

// ─── Stockfish engine wrapper ─────────────────────────────────────────────────
class StockfishEngine {
  constructor() {
    this.proc   = spawn('stockfish');
    this.rl     = readline.createInterface({ input: this.proc.stdout });
    this.queue  = [];
    this.buffer = [];

    this.rl.on('line', line => {
      if (this.queue.length === 0) return;
      const head = this.queue[0];
      head.accum?.(line);
      if (head.check(line)) {
        this.queue.shift();
        head.resolve(line);
      }
    });
  }

  send(cmd) { this.proc.stdin.write(cmd + '\n'); }

  waitFor(check, accum) {
    return new Promise(resolve => {
      this.queue.push({ check, accum, resolve });
    });
  }

  async init() {
    this.send('uci');
    await this.waitFor(l => l.trim() === 'uciok');
    this.send(`setoption name Threads value ${SF_THREADS}`);
    this.send('setoption name Hash value 256');
    this.send('isready');
    await this.waitFor(l => l.trim() === 'readyok');
  }

  async evaluate(fen) {
    let score  = null;
    let pv1uci = null;

    this.send(`position fen ${fen}`);
    this.send(`go depth ${SF_DEPTH}`);

    await this.waitFor(
      line => line.startsWith('bestmove'),
      line => {
        const depthM = line.match(/\bdepth (\d+)\b/);
        if (!depthM || parseInt(depthM[1]) !== SF_DEPTH) return;
        if (line.includes('lowerbound') || line.includes('upperbound')) return;
        const cpM   = line.match(/score cp (-?\d+)/);
        const mateM = line.match(/score mate (-?\d+)/);
        const pvM   = line.match(/\bpv\s+(\S+)/);
        if (cpM)   score  = { type: 'cp',   value: parseInt(cpM[1]) };
        if (mateM) score  = { type: 'mate', value: parseInt(mateM[1]) };
        if (pvM)   pv1uci = pvM[1];
      }
    );

    let bestMoveSan = null;
    if (pv1uci) {
      try {
        const tmp  = new Chess(fen);
        const from = pv1uci.slice(0, 2);
        const to   = pv1uci.slice(2, 4);
        const promo = pv1uci[4] || undefined;
        const m    = tmp.move({ from, to, promotion: promo });
        if (m) bestMoveSan = m.san;
      } catch { /* ignore */ }
    }

    let cp;
    if (!score) {
      cp = 0;
    } else if (score.type === 'mate') {
      cp = score.value > 0 ? 30000 - score.value * 10 : -30000 - score.value * 10;
    } else {
      cp = score.value;
    }

    return { cp, bestMoveSan };
  }

  quit() {
    this.send('quit');
    this.proc.kill();
  }
}

// ─── Accuracy formula ─────────────────────────────────────────────────────────
function cpToWinP(cp) {
  const capped = Math.max(-10000, Math.min(10000, cp));
  return 100 / (1 + Math.exp(-0.00368208 * capped));
}

function winPDropToAccuracy(avgWinPDrop) {
  const raw = 103.1668 * Math.exp(-0.04354 * avgWinPDrop) - 3.1669;
  return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}

function classifyMove(cpl) {
  if (cpl >= BLUNDER_CPL)    return 'blunder';
  if (cpl >= MISTAKE_CPL)    return 'mistake';
  if (cpl >= INACCURACY_CPL) return 'inaccuracy';
  return 'good';
}

function formatEval(cp) {
  if (cp >= 29000)  return '#';
  if (cp <= -29000) return '-#';
  return (cp >= 0 ? '+' : '') + (cp / 100).toFixed(2);
}

// ─── Game analysis ────────────────────────────────────────────────────────────
async function analyzeGame(pgn, justinColor, engine) {
  const chess = new Chess();
  try { chess.loadPgn(pgn); }
  catch (e) { throw new Error(`PGN parse error: ${e.message}`); }

  const history = chess.history({ verbose: true });
  const replay  = new Chess();

  let prevEval = await engine.evaluate(replay.fen());

  const moves = [];
  for (const move of history) {
    const sideToMove = replay.turn();
    const isJustin   = (justinColor === 'white' && sideToMove === 'w') ||
                       (justinColor === 'black' && sideToMove === 'b');

    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());

    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);

    const rawCpl = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl    = Math.min(rawCpl, 1000);

    moves.push({
      san:            move.san,
      color:          sideToMove === 'w' ? 'white' : 'black',
      isJustin,
      winPDrop,
      cpl,
      classification: isJustin ? classifyMove(rawCpl) : null,
      bestMove:       prevEval.bestMoveSan,
      evalBefore:     prevEval.cp,
      evalAfter:      -afterEval.cp,
    });

    prevEval = afterEval;
  }

  // Justin's accuracy
  const justinMoves     = moves.filter(m => m.isJustin);
  const justinAvgDrop   = justinMoves.length
    ? justinMoves.reduce((s, m) => s + m.winPDrop, 0) / justinMoves.length : 0;
  const justinAvgCPL    = justinMoves.length
    ? justinMoves.reduce((s, m) => s + m.cpl, 0) / justinMoves.length : 0;
  const justinAccuracy  = winPDropToAccuracy(justinAvgDrop);
  const blunders        = justinMoves.filter(m => m.classification === 'blunder').length;
  const mistakes        = justinMoves.filter(m => m.classification === 'mistake').length;
  const inaccuracies    = justinMoves.filter(m => m.classification === 'inaccuracy').length;

  // Opponent's accuracy
  const oppMoves        = moves.filter(m => !m.isJustin);
  const oppAvgDrop      = oppMoves.length
    ? oppMoves.reduce((s, m) => s + m.winPDrop, 0) / oppMoves.length : 0;
  const oppAccuracy     = winPDropToAccuracy(oppAvgDrop);

  // Top 3 worst Justin moves
  const criticalMoments = [...justinMoves]
    .filter(m => m.cpl >= INACCURACY_CPL)
    .sort((a, b) => b.cpl - a.cpl)
    .slice(0, 3)
    .map(m => ({
      san:            m.san,
      bestMove:       m.bestMove,
      cpl:            Math.round(m.cpl),
      classification: m.classification,
      evalBefore:     formatEval(m.evalBefore),
      evalAfter:      formatEval(m.evalAfter),
    }));

  return {
    justinAccuracy,
    oppAccuracy,
    avgCPL:        Math.round(justinAvgCPL),
    blunders,
    mistakes,
    inaccuracies,
    movesAnalyzed: justinMoves.length,
    criticalMoments,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  }

  console.log(`Stockfish depth: ${SF_DEPTH}  threads: ${SF_THREADS}`);
  console.log('Starting engine...\n');

  const engine = new StockfishEngine();
  await engine.init();
  console.log('Engine ready.\n');

  for (const tournament of TOURNAMENTS) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`  ${tournament.key}`);
    console.log(`${'─'.repeat(60)}\n`);

    results[tournament.key] = results[tournament.key] || {};

    const pgnFiles = fs.readdirSync(tournament.pgnDir)
      .filter(f => f.toLowerCase().endsWith('.pgn'))
      .sort();

    for (const filename of pgnFiles) {
      const rawPgn = fs.readFileSync(
        path.join(tournament.pgnDir, filename), 'utf8'
      ).trim();

      const round = parseRound(filename, rawPgn);
      if (!round) { console.log(`  [SKIP] ${filename} — no round number\n`); continue; }

      const justinColor = parseJustinColor(rawPgn);
      if (!justinColor) { console.log(`  [SKIP] ${filename} — Justin not found in headers\n`); continue; }

      const opponent = parseOpponentName(rawPgn, justinColor);
      const key      = `R${round}`;

      // Skip if already analyzed
      if (results[tournament.key][key]?.justinAccuracy != null) {
        const c = results[tournament.key][key];
        console.log(`  R${round}  ${filename}  (cached)`);
        console.log(`  Justin: ${c.justinAccuracy}%  Opp: ${c.oppAccuracy}%  CPL: ${c.avgCPL}  ` +
          `B:${c.blunders} M:${c.mistakes} I:${c.inaccuracies}\n`);
        continue;
      }

      const chess = new Chess();
      let moveCount;
      try {
        chess.loadPgn(rawPgn);
        moveCount = chess.history().length;
      } catch (e) {
        console.log(`  [SKIP] R${round} — PGN parse error: ${e.message}\n`);
        continue;
      }

      console.log(`  R${round}  ${filename}  (Justin plays ${justinColor} vs ${opponent})`);
      console.log(`  ${moveCount} moves — analyzing at depth ${SF_DEPTH}...`);

      const t0 = Date.now();
      let stats;
      try {
        stats = await analyzeGame(rawPgn, justinColor, engine);
      } catch (e) {
        console.error(`  Error: ${e.message}\n`);
        continue;
      }
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`  ✓ Justin: ${stats.justinAccuracy}%  Opp: ${stats.oppAccuracy}%  ` +
        `avgCPL: ${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}  (${secs}s)`);

      if (stats.criticalMoments.length > 0) {
        console.log('  Critical moments:');
        stats.criticalMoments.forEach(cm => {
          console.log(`    ${cm.classification.toUpperCase().padEnd(11)} ${cm.san.padEnd(8)} ` +
            `(best: ${cm.bestMove || '?'})  ${cm.evalBefore} → ${cm.evalAfter}  CPL: ${cm.cpl}`);
        });
      }
      console.log('');

      results[tournament.key][key] = {
        ...stats,
        justinColor,
        opponent,
        round,
      };
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    }
  }

  engine.quit();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(60)}`);
  console.log('\nAccuracy summary:\n');

  for (const tournament of TOURNAMENTS) {
    const games = Object.entries(results[tournament.key] || {})
      .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    if (!games.length) continue;

    const jaccs = games.map(([, g]) => g.justinAccuracy).filter(a => a != null);
    const oaccs = games.map(([, g]) => g.oppAccuracy).filter(a => a != null);
    const javg  = jaccs.length ? (jaccs.reduce((s, a) => s + a, 0) / jaccs.length).toFixed(1) : '—';
    const oavg  = oaccs.length ? (oaccs.reduce((s, a) => s + a, 0) / oaccs.length).toFixed(1) : '—';

    console.log(`  ${tournament.key}  (Justin avg: ${javg}%  Opp avg: ${oavg}%)`);
    games.forEach(([k, g]) => {
      if (g.justinAccuracy == null) return;
      const color = g.justinColor === 'white' ? 'W' : 'B';
      console.log(`    ${k} [${color}] vs ${g.opponent.padEnd(28)} ` +
        `Justin: ${String(g.justinAccuracy).padStart(5)}%  ` +
        `Opp: ${String(g.oppAccuracy).padStart(5)}%  ` +
        `CPL ${String(g.avgCPL).padStart(3)}  B:${g.blunders} M:${g.mistakes} I:${g.inaccuracies}`);
    });
    console.log('');
  }

  console.log(`Full results saved to ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
