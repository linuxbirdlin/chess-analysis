#!/usr/bin/env node
/**
 * analyze-study-pt5.js
 *
 * Analyzes Austin's "Games Pt.5" personal study games not yet run through
 * Stockfish. The source file mixes PAM 2026 broadcast games (already in
 * analysis-results.json) with new personal study games. This script skips
 * the PAM games and processes only the new ones.
 *
 * Produces:
 *   austin/personal-study/pt5-new-games.pgn   clean PGN of study games only
 *   scripts/study-pt5-results.json            Stockfish analysis results
 *
 * Usage:
 *   node scripts/analyze-study-pt5.js
 *
 * Options (env vars):
 *   SF_DEPTH=18     Stockfish depth (default 18)
 *   SF_THREADS=8    Stockfish threads (default 8)
 */

'use strict';

const fs         = require('fs');
const path       = require('path');
const readline   = require('readline');
const { spawn }  = require('child_process');
const { Chess }  = require('chess.js');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const SOURCE_PGN  = path.join(ROOT, 'austin/personal-study/lichess_study_games-pt5_by_iusedf5_2026.09.12.pgn');
const CLEAN_PGN   = path.join(ROOT, 'austin/personal-study/pt5-new-games.pgn');
const RESULTS_FILE = path.join(__dirname, 'study-pt5-results.json');

// ─── Config ───────────────────────────────────────────────────────────────────
const SF_DEPTH   = parseInt(process.env.SF_DEPTH   || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '8',  10);

const INACCURACY_CPL = 50;
const MISTAKE_CPL    = 150;
const BLUNDER_CPL    = 300;

// ─── PGN helpers ──────────────────────────────────────────────────────────────

function splitPgnGames(content) {
  // Each game starts with [Event — split on newline immediately before [Event
  return content
    .split(/\n(?=\[Event\b)/)
    .map(c => c.trim())
    .filter(c => c.startsWith('['));
}

function isPamBroadcast(text) {
  return /lichess\.org\/broadcast\/xxxvi-pan-american-youth-chess-festival/i.test(text);
}

// Determine Austin's color:
//   1. Explicit [White "Austin Lin"] / [Black "Austin Lin"] header
//   2. Infer from first move: 1.d4 or 1.c4 → Austin is Black; else White
function inferAustinColor(text) {
  const wm = text.match(/\[White\s+"([^"]+)"\]/);
  const bm = text.match(/\[Black\s+"([^"]+)"\]/);
  if (wm && /lin,?\s*austin/i.test(wm[1])) return 'white';
  if (bm && /lin,?\s*austin/i.test(bm[1])) return 'black';

  // Find "1. <move>" — skip any alternative in parens before the move
  const mm = text.match(/\n\s*1\.\s+([a-zA-Z][^\s({]*)/m);
  if (mm) {
    const mv = mm[1].replace(/[+#!?].*/, '');
    if (mv === 'd4' || mv === 'c4') return 'black';
  }
  return 'white';
}

function getLabel(text) {
  const cn = text.match(/\[ChapterName\s+"([^"]+)"\]/);
  if (cn) return cn[1];
  const ev = text.match(/\[Event\s+"([^"]+)"\]/);
  return ev ? ev[1] : 'Unknown';
}

// ─── Stockfish engine wrapper ─────────────────────────────────────────────────

class StockfishEngine {
  constructor() {
    this.proc  = spawn('stockfish');
    this.rl    = readline.createInterface({ input: this.proc.stdout });
    this.queue = [];

    this.rl.on('line', line => {
      if (!this.queue.length) return;
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
    return new Promise(resolve => this.queue.push({ check, accum, resolve }));
  }

  async init() {
    this.send('uci');
    await this.waitFor(l => l.trim() === 'uciok');
    this.send(`setoption name Threads value ${SF_THREADS}`);
    this.send('setoption name Hash value 512');
    this.send('isready');
    await this.waitFor(l => l.trim() === 'readyok');
  }

  async evaluate(fen) {
    let score  = null;
    let pv1uci = null;

    this.send(`position fen ${fen}`);
    this.send(`go depth ${SF_DEPTH}`);

    await this.waitFor(
      line  => line.startsWith('bestmove'),
      line  => {
        const dm = line.match(/\bdepth (\d+)\b/);
        if (!dm || parseInt(dm[1]) !== SF_DEPTH) return;
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
        const tmp   = new Chess(fen);
        const from  = pv1uci.slice(0, 2);
        const to    = pv1uci.slice(2, 4);
        const promo = pv1uci[4] || undefined;
        const m     = tmp.move({ from, to, promotion: promo });
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

  quit() { this.send('quit'); this.proc.kill(); }
}

// ─── Accuracy formulas (Lichess) ──────────────────────────────────────────────

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

// ─── PGN preprocessing ────────────────────────────────────────────────────────
// chess.js fails on consecutive comment blocks: { text1 } { text2 }
// Fix: remove comment blocks that contain only [%cal]/[%csl] annotations —
// these are arrow/square overlays with no textual content worth keeping.
function preprocessPgn(text) {
  return text.replace(/\{\s*(\[%(?:cal|csl)[^\]]*\]\s*)+\}/g, '');
}

// ─── Game analysis ────────────────────────────────────────────────────────────

async function analyzeGame(pgnText, austinColor, engine) {
  const chess = new Chess();
  chess.loadPgn(preprocessPgn(pgnText));

  const history = chess.history({ verbose: true });
  const replay  = new Chess();
  let prevEval  = await engine.evaluate(replay.fen());
  const moves   = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isAustin   = (austinColor === 'white' && sideToMove === 'w') ||
                       (austinColor === 'black' && sideToMove === 'b');

    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());

    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);

    const rawCpl = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl    = Math.min(rawCpl, 1000);

    moves.push({
      fullMoveNum:    replay.moveNumber() - (sideToMove === 'b' ? 0 : 1),
      san:            move.san,
      color:          sideToMove === 'w' ? 'white' : 'black',
      isAustin,
      evalBefore:     prevEval.cp,
      evalAfter:      -afterEval.cp,
      bestMove:       prevEval.bestMoveSan,
      cpl:            isAustin ? cpl : null,
      winPDrop,
      classification: isAustin ? classifyMove(rawCpl) : null,
    });

    prevEval = afterEval;
  }

  const austinMoves = moves.filter(m => m.isAustin);
  const avgWinPDrop = austinMoves.length
    ? austinMoves.reduce((s, m) => s + m.winPDrop, 0) / austinMoves.length
    : 0;
  const avgCPL = austinMoves.length
    ? austinMoves.reduce((s, m) => s + m.cpl, 0) / austinMoves.length
    : 0;

  const blunders     = austinMoves.filter(m => m.classification === 'blunder').length;
  const mistakes     = austinMoves.filter(m => m.classification === 'mistake').length;
  const inaccuracies = austinMoves.filter(m => m.classification === 'inaccuracy').length;

  const oppMoves       = moves.filter(m => !m.isAustin);
  const oppAvgWinPDrop = oppMoves.length
    ? oppMoves.reduce((s, m) => s + m.winPDrop, 0) / oppMoves.length
    : 0;

  const criticalMoments = [...austinMoves]
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
    accuracy:       winPDropToAccuracy(avgWinPDrop),
    oppAccuracy:    winPDropToAccuracy(oppAvgWinPDrop),
    avgCPL:         Math.round(avgCPL),
    blunders,
    mistakes,
    inaccuracies,
    movesAnalyzed:  austinMoves.length,
    criticalMoments,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const content  = fs.readFileSync(SOURCE_PGN, 'utf8');
  const allGames = splitPgnGames(content);
  const pam      = allGames.filter(isPamBroadcast);
  const study    = allGames.filter(g => !isPamBroadcast(g));

  console.log(`Source PGN: ${allGames.length} games total`);
  console.log(`  PAM 2026 broadcast (skip — already in analysis-results.json): ${pam.length}`);
  console.log(`  Personal study games (new): ${study.length}\n`);

  // Write the clean PGN of study-only games
  fs.writeFileSync(CLEAN_PGN, study.join('\n\n') + '\n');
  console.log(`Wrote study games → ${path.relative(ROOT, CLEAN_PGN)}\n`);

  // Load any cached results
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  }

  console.log(`Stockfish  depth: ${SF_DEPTH}   threads: ${SF_THREADS}`);
  console.log('Starting engine...\n');

  const engine = new StockfishEngine();
  await engine.init();
  console.log('Engine ready.\n');
  console.log('─'.repeat(60));

  for (let i = 0; i < study.length; i++) {
    const pgnText = study[i];
    const label   = getLabel(pgnText);
    const color   = inferAustinColor(pgnText);
    const key     = label;

    // Skip cached
    if (results[key]?.oppAccuracy != null) {
      const c = results[key];
      console.log(`[${i+1}/${study.length}] ${label}  (cached)`);
      console.log(`  Austin ${c.color || color}  acc: ${c.accuracy}%  opp: ${c.oppAccuracy}%  CPL: ${c.avgCPL}  B:${c.blunders} M:${c.mistakes} I:${c.inaccuracies}\n`);
      continue;
    }

    // Parse PGN
    const chess = new Chess();
    let moveCount = 0;
    try {
      chess.loadPgn(preprocessPgn(pgnText));
      moveCount = chess.history().length;
    } catch (e) {
      console.log(`[${i+1}/${study.length}] ${label}  [SKIP] PGN parse error: ${e.message}\n`);
      continue;
    }

    if (moveCount < 5) {
      console.log(`[${i+1}/${study.length}] ${label}  [SKIP] too few moves (${moveCount})\n`);
      continue;
    }

    console.log(`[${i+1}/${study.length}] ${label}  (Austin ${color}, ${moveCount} moves)`);
    process.stdout.write(`  Analyzing at depth ${SF_DEPTH}...`);

    const t0 = Date.now();
    let stats;
    try {
      stats = await analyzeGame(pgnText, color, engine);
    } catch (e) {
      console.error(`\n  Error: ${e.message}\n`);
      continue;
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);

    process.stdout.write(` done (${secs}s)\n`);
    console.log(`  ✓ acc: ${stats.accuracy}%  opp: ${stats.oppAccuracy}%  CPL: ${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`);

    if (stats.criticalMoments.length > 0) {
      stats.criticalMoments.forEach(cm => {
        console.log(`    ${cm.classification.toUpperCase().padEnd(11)} ${cm.san.padEnd(8)} (best: ${cm.bestMove || '?'})  ${cm.evalBefore} → ${cm.evalAfter}  CPL: ${cm.cpl}`);
      });
    }
    console.log('');

    results[key] = { label, color, ...stats };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  }

  engine.quit();

  // Summary
  console.log('─'.repeat(60));
  const entries = Object.values(results).sort((a, b) => a.label.localeCompare(b.label));
  const accs    = entries.map(g => g.accuracy).filter(a => a != null);
  const avg     = accs.length
    ? (accs.reduce((s, a) => s + a, 0) / accs.length).toFixed(1)
    : '—';

  console.log(`\nPersonal Study Games Pt.5 — Summary (${entries.length} games, avg acc: ${avg}%)\n`);
  entries.forEach(g => {
    const colorTag = (g.color || '?').padEnd(5);
    const acc      = String(g.accuracy ?? '?').padStart(5);
    const cpl      = String(g.avgCPL   ?? '?').padStart(3);
    console.log(`  ${g.label.padEnd(35)} ${colorTag}  acc: ${acc}%  CPL: ${cpl}  B:${g.blunders} M:${g.mistakes} I:${g.inaccuracies}`);
  });

  console.log(`\nResults saved → ${path.relative(ROOT, RESULTS_FILE)}`);
  console.log(`Clean PGN   → ${path.relative(ROOT, CLEAN_PGN)}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
