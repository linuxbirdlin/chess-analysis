#!/usr/bin/env node
/**
 * analyze-aarush.js
 *
 * Runs local Stockfish depth-18 analysis on all of Aarush Ajith's tournament
 * games, computing accuracy for Aarush and his opponents using the Lichess
 * win-probability formula.
 *
 * Results are saved to scripts/aarush-analysis-results.json.
 *
 * Usage:
 *   node scripts/analyze-aarush.js
 *
 * Options (env vars):
 *   SF_DEPTH=18     Stockfish search depth (default 18)
 *   SF_THREADS=8    Stockfish threads (default 2)
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const { spawn }     = require('child_process');
const { Chess }     = require('chess.js');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'aarush-analysis-results.json');

const TOURNAMENTS = [
  {
    key:    'Canada Closed 2026',
    pgnDir: path.join(ROOT, 'opponents/aarush/canadaclosed2026'),
  },
  {
    key:    'PAM School 2026',
    pgnDir: path.join(ROOT, 'opponents/aarush/pamschool2026'),
  },
  {
    key:    'PAM 2026',
    pgnDir: path.join(ROOT, 'opponents/aarush/pam2026'),
  },
  {
    key:    'Canada Open 2026',
    pgnDir: path.join(ROOT, 'opponents/aarush/canadaopen2026'),
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const SF_DEPTH   = parseInt(process.env.SF_DEPTH   || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '2',  10);

const INACCURACY_CPL = 50;
const MISTAKE_CPL    = 150;
const BLUNDER_CPL    = 300;

// ─── PGN helpers ──────────────────────────────────────────────────────────────

// Split a multi-game PGN file into individual game strings
function splitGames(text) {
  const games = [];
  const lines = text.split('\n');
  let cur = [];
  for (const line of lines) {
    if (line.startsWith('[Event ') && cur.length) {
      const g = cur.join('\n').trim();
      if (g) games.push(g);
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) { const g = cur.join('\n').trim(); if (g) games.push(g); }
  return games;
}

// Strip all {…} annotation blocks before passing to chess.js.
// Lichess broadcast PGNs have [%eval ...] and [%clk ...] inside braces.
function stripComments(pgn) {
  return pgn.replace(/\{[^}]*\}/g, '');
}

function parseRound(filename, pgn) {
  const fnMatch = path.basename(filename).match(/^(?:round|game_?(\d+))(\d*)/i);
  // Try [Round "N.M"] header first
  const hdrMatch = pgn.match(/\[Round\s+"(\d+)/);
  if (hdrMatch) return parseInt(hdrMatch[1], 10);
  // Fall back to filename: round3.pgn → 3, game_266853.pgn → null (use file order)
  const fnRound = path.basename(filename).match(/^round(\d+)/i);
  if (fnRound) return parseInt(fnRound[1], 10);
  // For game_XXXXXXX.pgn use file sort order (handled by caller)
  return null;
}

// Returns 'white' or 'black' for the color Aarush played.
function parseAarushColor(pgn) {
  const white = pgn.match(/\[White\s+"([^"]+)"\]/);
  const black = pgn.match(/\[Black\s+"([^"]+)"\]/);
  const isAarushName = n => /Ajith,?\s*Aarush|Aarush\s+Ajith|^Aarush$/i.test(n);
  if (white && isAarushName(white[1])) return 'white';
  if (black && isAarushName(black[1])) return 'black';
  return null;
}

function parseOpponentName(pgn, aarushColor) {
  if (aarushColor === 'white') {
    const m = pgn.match(/\[Black\s+"([^"]+)"\]/);
    return m ? m[1] : '?';
  }
  const m = pgn.match(/\[White\s+"([^"]+)"\]/);
  return m ? m[1] : '?';
}

function parseOpponentElo(pgn, aarushColor) {
  if (aarushColor === 'white') {
    const m = pgn.match(/\[BlackElo\s+"([^"]+)"\]/);
    return m ? parseInt(m[1]) || null : null;
  }
  const m = pgn.match(/\[WhiteElo\s+"([^"]+)"\]/);
  return m ? parseInt(m[1]) || null : null;
}

function parseResult(pgn) {
  const m = pgn.match(/\[Result\s+"([^"]+)"\]/);
  return m ? m[1] : '?';
}

function parseEco(pgn) {
  const eco = pgn.match(/\[ECO\s+"([^"]+)"\]/);
  const opening = pgn.match(/\[Opening\s+"([^"]+)"\]/);
  if (eco && opening) return `${eco[1]} — ${opening[1]}`;
  if (eco) return eco[1];
  return '?';
}

// ─── Stockfish engine wrapper ─────────────────────────────────────────────────
class StockfishEngine {
  constructor() {
    this.proc   = spawn('stockfish');
    this.rl     = readline.createInterface({ input: this.proc.stdout });
    this.queue  = [];

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
async function analyzeGame(pgn, aarushColor, engine) {
  const chess = new Chess();
  try { chess.loadPgn(pgn); }
  catch (e) { throw new Error(`PGN parse error: ${e.message}`); }

  const history = chess.history({ verbose: true });
  const replay  = new Chess();

  let prevEval = await engine.evaluate(replay.fen());

  const moves = [];
  for (const move of history) {
    const sideToMove = replay.turn();
    const isAarush   = (aarushColor === 'white' && sideToMove === 'w') ||
                       (aarushColor === 'black' && sideToMove === 'b');

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
      isAarush,
      winPDrop,
      cpl,
      classification: isAarush ? classifyMove(rawCpl) : null,
      bestMove:       prevEval.bestMoveSan,
      evalBefore:     prevEval.cp,
      evalAfter:      -afterEval.cp,
    });

    prevEval = afterEval;
  }

  // Aarush's accuracy
  const aarushMoves    = moves.filter(m => m.isAarush);
  const aarushAvgDrop  = aarushMoves.length
    ? aarushMoves.reduce((s, m) => s + m.winPDrop, 0) / aarushMoves.length : 0;
  const aarushAvgCPL   = aarushMoves.length
    ? aarushMoves.reduce((s, m) => s + m.cpl, 0) / aarushMoves.length : 0;
  const aarushAccuracy = winPDropToAccuracy(aarushAvgDrop);
  const blunders       = aarushMoves.filter(m => m.classification === 'blunder').length;
  const mistakes       = aarushMoves.filter(m => m.classification === 'mistake').length;
  const inaccuracies   = aarushMoves.filter(m => m.classification === 'inaccuracy').length;

  // Opponent's accuracy
  const oppMoves    = moves.filter(m => !m.isAarush);
  const oppAvgDrop  = oppMoves.length
    ? oppMoves.reduce((s, m) => s + m.winPDrop, 0) / oppMoves.length : 0;
  const oppAccuracy = winPDropToAccuracy(oppAvgDrop);

  // Top 3 worst Aarush moves
  const criticalMoments = [...aarushMoves]
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
    aarushAccuracy,
    oppAccuracy,
    avgCPL:        Math.round(aarushAvgCPL),
    blunders,
    mistakes,
    inaccuracies,
    movesAnalyzed: aarushMoves.length,
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

    let fileIdx = 0;
    for (const filename of pgnFiles) {
      fileIdx++;
      const rawPgn = fs.readFileSync(
        path.join(tournament.pgnDir, filename), 'utf8'
      ).trim();

      // Skip files with no moves (just headers or bare `*`)
      const stripped = stripComments(rawPgn);
      if (!stripped.match(/\d+\./)) {
        console.log(`  [SKIP] ${filename} — no moves\n`);
        continue;
      }

      const pgn = stripComments(rawPgn);

      const aarushColor = parseAarushColor(pgn);
      if (!aarushColor) {
        console.log(`  [SKIP] ${filename} — Aarush not found in headers\n`);
        continue;
      }

      // Derive round: prefer [Round] header, then filename, then file index
      let round = parseRound(filename, pgn);
      if (!round) {
        // game_XXXXXXX.pgn — use file sort order
        round = fileIdx;
      }

      const opponent    = parseOpponentName(pgn, aarushColor);
      const opponentElo = parseOpponentElo(pgn, aarushColor);
      const result      = parseResult(pgn);
      const eco         = parseEco(pgn);
      const key         = `R${round}`;

      // Derive Aarush's result from his perspective
      let aarushResult;
      if (result === '*') aarushResult = '?';
      else if (result === '1/2-1/2') aarushResult = 'draw';
      else if ((result === '1-0' && aarushColor === 'white') ||
               (result === '0-1' && aarushColor === 'black'))  aarushResult = 'win';
      else aarushResult = 'loss';

      // Skip if already analyzed
      if (results[tournament.key][key]?.aarushAccuracy != null) {
        const c = results[tournament.key][key];
        console.log(`  R${round}  ${filename}  (cached)`);
        console.log(`  Aarush: ${c.aarushAccuracy}%  Opp: ${c.oppAccuracy}%  CPL: ${c.avgCPL}  ` +
          `B:${c.blunders} M:${c.mistakes} I:${c.inaccuracies}\n`);
        continue;
      }

      const chess = new Chess();
      let moveCount;
      try {
        chess.loadPgn(pgn);
        moveCount = chess.history().length;
      } catch (e) {
        console.log(`  [SKIP] R${round} — PGN parse error: ${e.message}\n`);
        continue;
      }

      if (moveCount < 5) {
        console.log(`  [SKIP] R${round} — too few moves (${moveCount})\n`);
        continue;
      }

      console.log(`  R${round}  ${filename}  (Aarush ${aarushColor} vs ${opponent}${opponentElo ? ` ${opponentElo}` : ''})`);
      console.log(`  ${moveCount} moves — analyzing at depth ${SF_DEPTH}...`);

      const t0 = Date.now();
      let stats;
      try {
        stats = await analyzeGame(pgn, aarushColor, engine);
      } catch (e) {
        console.error(`  Error: ${e.message}\n`);
        continue;
      }
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`  ✓ Aarush: ${stats.aarushAccuracy}%  Opp: ${stats.oppAccuracy}%  ` +
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
        aarushColor,
        opponent,
        opponentElo,
        round,
        result,
        aarushResult,
        eco,
      };
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    }
  }

  // ── Direct encounter (multi-game Lichess study PGN) ─────────────────────
  const directPath = path.join(ROOT, 'opponents/aarush/direct-encouter.pgn');
  if (fs.existsSync(directPath)) {
    console.log(`${'─'.repeat(60)}`);
    console.log('  Direct Encounter (Austin vs Aarush)');
    console.log(`${'─'.repeat(60)}\n`);
    results['Direct Encounter'] = results['Direct Encounter'] || {};
    const raw = fs.readFileSync(directPath, 'utf8');
    const games = splitGames(raw);
    let gIdx = 0;
    for (const gamePgn of games) {
      gIdx++;
      const stripped = stripComments(gamePgn);
      if (!stripped.match(/\d+\./)) { console.log(`  [SKIP] game ${gIdx} — no moves\n`); continue; }
      const aarushColor = parseAarushColor(stripped);
      if (!aarushColor) { console.log(`  [SKIP] game ${gIdx} — Aarush not found\n`); continue; }
      const dateM   = gamePgn.match(/\[Date\s+"([^"]+)"\]/);
      const dateStr = dateM ? dateM[1] : '?';
      const key     = `G${gIdx}_${dateStr.replace(/\./g, '')}`;
      const opponent    = parseOpponentName(stripped, aarushColor);
      const opponentElo = parseOpponentElo(stripped, aarushColor);
      const result      = parseResult(stripped);
      const eco         = parseEco(stripped);
      let aarushResult;
      if (result === '1/2-1/2') aarushResult = 'draw';
      else if ((result === '1-0' && aarushColor === 'white') || (result === '0-1' && aarushColor === 'black')) aarushResult = 'win';
      else if (result === '*') aarushResult = '?';
      else aarushResult = 'loss';
      if (results['Direct Encounter'][key]?.aarushAccuracy != null) {
        console.log(`  [CACHED] ${key}  ${aarushResult.toUpperCase()}  ${aarushColor}  vs ${opponent}\n`);
        continue;
      }
      console.log(`  Analyzing game ${gIdx}: ${dateStr}  Aarush ${aarushColor}  ${aarushResult.toUpperCase()}  vs ${opponent}`);
      try {
        const stats = await analyzeGame(stripped, aarushColor, engine);
        results['Direct Encounter'][key] = { ...stats, aarushColor, opponent, opponentElo, result, aarushResult, eco, date: dateStr };
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        console.log(`    acc:${stats.aarushAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}\n`);
      } catch(e) { console.error(`    Error: ${e.message}\n`); }
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

    const aaccs = games.map(([, g]) => g.aarushAccuracy).filter(a => a != null);
    const oaccs = games.map(([, g]) => g.oppAccuracy).filter(a => a != null);
    const aavg  = aaccs.length ? (aaccs.reduce((s, a) => s + a, 0) / aaccs.length).toFixed(1) : '—';
    const oavg  = oaccs.length ? (oaccs.reduce((s, a) => s + a, 0) / oaccs.length).toFixed(1) : '—';

    console.log(`  ${tournament.key}  (Aarush avg: ${aavg}%  Opp avg: ${oavg}%)`);
    games.forEach(([k, g]) => {
      if (g.aarushAccuracy == null) return;
      const color = g.aarushColor === 'white' ? 'W' : 'B';
      console.log(`    ${k} [${color}] vs ${(g.opponent || '?').padEnd(28)} ` +
        `Aarush: ${String(g.aarushAccuracy).padStart(5)}%  ` +
        `Opp: ${String(g.oppAccuracy).padStart(5)}%  ` +
        `CPL ${String(g.avgCPL).padStart(3)}  B:${g.blunders} M:${g.mistakes} I:${g.inaccuracies}  ${g.aarushResult}`);
    });
    console.log('');
  }

  console.log(`Full results saved to ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
