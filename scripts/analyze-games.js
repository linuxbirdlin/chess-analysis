#!/usr/bin/env node
/**
 * analyze-games.js
 *
 * Uses a local Stockfish engine + chess.js to:
 *   1. Evaluate every position in Austin's tournament games
 *   2. Compute per-game accuracy using the Lichess CPL formula
 *   3. Identify blunders / mistakes / inaccuracies
 *   4. Write accuracy % into review HTML files and austin-prep.html
 *   5. Save a full JSON report to scripts/analysis-results.json
 *
 * Usage:
 *   node scripts/analyze-games.js
 *
 * Options (env vars):
 *   SF_DEPTH=18          Stockfish search depth (default 15; higher = more accurate but slower)
 *   SF_THREADS=4         Stockfish threads (default 2)
 *
 * Requirements: stockfish in PATH, Node.js 18+, chess.js installed (npm install chess.js)
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const { spawn }     = require('child_process');
const { Chess }     = require('chess.js');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'analysis-results.json');
const PREP_HTML    = path.join(ROOT, 'austin-prep.html');

const TOURNAMENTS = [
  {
    key:        'NAYCC 2025',
    pgnDir:     path.join(ROOT, 'austin/naycc2025'),
    reviewHtml: path.join(ROOT, 'austin/naycc2025/review.html'),
  },
  {
    key:        'PAM 2026',
    pgnDir:     path.join(ROOT, 'austin/pam2026'),
    reviewHtml: path.join(ROOT, 'austin/pam2026/review.html'),
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const SF_DEPTH   = parseInt(process.env.SF_DEPTH   || '15', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '2',  10);

// CPL thresholds for move classification
const INACCURACY_CPL = 50;
const MISTAKE_CPL    = 150;
const BLUNDER_CPL    = 300;

// ─── PGN normalisation ────────────────────────────────────────────────────────
function normalizePgn(pgn, round, tournamentKey) {
  if (pgn.trimStart().startsWith('[')) return pgn;

  const lines        = pgn.split('\n');
  const firstLine    = lines[0].trim();
  const dateLine     = lines[1]?.trim() || '';
  const movesSection = lines.slice(2).join('\n').trim();

  const pm        = firstLine.match(/^(.+?)\s*\((\d+)\)\s*-\s*(.+?)\s*\((\d+)\)\s*$/);
  const whiteName = pm ? pm[1].trim() : '?';
  const whiteElo  = pm ? pm[2]       : '?';
  const blackName = pm ? pm[3].trim() : '?';
  const blackElo  = pm ? pm[4]       : '?';

  const dm      = dateLine.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const pgnDate = dm ? `${dm[3]}.${dm[2]}.${dm[1]}` : '????.??.??';

  const rm     = movesSection.match(/(1-0|0-1|1\/2-1\/2|\*)\s*$/);
  const result = rm ? rm[1] : '*';

  return [
    `[Event "${tournamentKey}"]`,
    `[Site "?"]`,
    `[Date "${pgnDate}"]`,
    `[Round "${round}"]`,
    `[White "${whiteName}"]`,
    `[Black "${blackName}"]`,
    `[Result "${result}"]`,
    `[WhiteElo "${whiteElo}"]`,
    `[BlackElo "${blackElo}"]`,
    '',
    movesSection,
  ].join('\n');
}

function parseRound(filename, pgn) {
  const fnMatch = path.basename(filename).match(/^round(\d+)/i);
  if (fnMatch) return parseInt(fnMatch[1], 10);
  const hdrMatch = pgn.match(/\[Round\s+"(\d+)/);
  if (hdrMatch) return parseInt(hdrMatch[1], 10);
  return null;
}

function parseAustinColor(pgn) {
  const white = pgn.match(/\[White\s+"([^"]+)"\]/);
  const black = pgn.match(/\[Black\s+"([^"]+)"\]/);
  if (white && /Lin,?\s*Austin/i.test(white[1])) return 'white';
  if (black && /Lin,?\s*Austin/i.test(black[1])) return 'black';
  const firstLine = pgn.split('\n').find(l => l.trim());
  if (firstLine && /^Lin,?\s*Austin/i.test(firstLine.trim())) return 'white';
  return 'black';
}

// ─── Stockfish engine wrapper ─────────────────────────────────────────────────
class StockfishEngine {
  constructor() {
    this.proc   = spawn('stockfish');
    this.rl     = readline.createInterface({ input: this.proc.stdout });
    this.queue  = [];          // { check, accum, resolve }
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

  send(cmd) {
    this.proc.stdin.write(cmd + '\n');
  }

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

  // Returns { cp: number, mate: number|null, bestMoveSan: string|null }
  // cp is from the perspective of the side to move (positive = side to move is better)
  async evaluate(fen, chess) {
    let score  = null;
    let pv1uci = null;

    this.send(`position fen ${fen}`);
    this.send(`go depth ${SF_DEPTH}`);

    await this.waitFor(
      line  => line.startsWith('bestmove'),
      line  => {
        // Only capture the line at the exact target depth (skip multipv lines, seldepth-only lines)
        const depthM = line.match(/\bdepth (\d+)\b/);
        if (!depthM || parseInt(depthM[1]) !== SF_DEPTH) return;
        if (line.includes('lowerbound') || line.includes('upperbound')) return;

        const cpM   = line.match(/score cp (-?\d+)/);
        const mateM = line.match(/score mate (-?\d+)/);
        const pvM   = line.match(/\bpv\s+(\S+)/);

        if (cpM)  score  = { type: 'cp',   value: parseInt(cpM[1]) };
        if (mateM) score = { type: 'mate', value: parseInt(mateM[1]) };
        if (pvM)  pv1uci = pvM[1];
      }
    );

    // Convert UCI best move to SAN using a clone of the chess object
    let bestMoveSan = null;
    if (pv1uci) {
      try {
        const tmp = new Chess(fen);
        const from = pv1uci.slice(0, 2);
        const to   = pv1uci.slice(2, 4);
        const promo = pv1uci[4] || undefined;
        const m    = tmp.move({ from, to, promotion: promo });
        if (m) bestMoveSan = m.san;
      } catch { /* ignore */ }
    }

    // Normalise: convert mate to large cp, keep sign (positive = side to move is better)
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
// Convert centipawns → win probability (0–100%).
// Lichess uses a logistic curve with this specific constant.
function cpToWinP(cp) {
  // Cap to avoid overflow on extreme mate-in-1 evals
  const capped = Math.max(-10000, Math.min(10000, cp));
  return 100 / (1 + Math.exp(-0.00368208 * capped));
}

// Accuracy from average win-probability drop per move (Lichess formula).
// avgWinPDrop is in percentage points (0–100 scale).
//   accuracy = 103.1668 * exp(-0.04354 * avgWinPDrop) - 3.1669
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

// ─── Game analysis ────────────────────────────────────────────────────────────
async function analyzeGame(pgn, austinColor, engine) {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (e) {
    throw new Error(`PGN parse error: ${e.message}`);
  }

  const history  = chess.history({ verbose: true });
  const moves    = [];

  // Replay from the start, evaluating before each move
  const replay = new Chess();

  // Get initial position evaluation
  let prevEval = await engine.evaluate(replay.fen(), replay);

  for (const move of history) {
    const fenBefore   = replay.fen();
    const sideToMove  = replay.turn(); // 'w' or 'b'
    const isAustin    = (austinColor === 'white' && sideToMove === 'w') ||
                        (austinColor === 'black' && sideToMove === 'b');

    replay.move(move.san);
    const fenAfter = replay.fen();

    // Evaluate position AFTER the move (from new side-to-move perspective)
    const afterEval = await engine.evaluate(fenAfter, replay);

    // Win-probability drop (for accuracy formula):
    // Before move: winP from Austin's perspective = cpToWinP(prevEval.cp)
    // After move:  from opponent's perspective → Austin's winP = 100 - cpToWinP(afterEval.cp)
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = isAustin ? Math.max(0, winPBefore - winPAfter) : 0;

    // Centipawn loss (for move classification — blunder/mistake/inaccuracy).
    // Cap at 1000 so a single catastrophic move (e.g. walking into mate) doesn't
    // dominate the average CPL summary.
    const rawCpl   = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl      = isAustin ? Math.min(rawCpl, 1000) : 0;
    const classification = isAustin ? classifyMove(rawCpl) : null;   // use raw for classification

    moves.push({
      fullMoveNum:   replay.moveNumber() - (sideToMove === 'b' ? 0 : 1),
      san:           move.san,
      color:         sideToMove === 'w' ? 'white' : 'black',
      isAustin,
      evalBefore:    prevEval.cp,
      evalAfter:     -afterEval.cp,   // from mover's perspective
      bestMove:      prevEval.bestMoveSan,
      cpl:           isAustin ? cpl : null,
      winPDrop:      isAustin ? winPDrop : null,
      classification,
    });

    prevEval = afterEval;
  }

  // Accuracy from Austin's moves only
  const austinMoves  = moves.filter(m => m.isAustin && m.cpl !== null);
  const avgWinPDrop  = austinMoves.length
    ? austinMoves.reduce((s, m) => s + m.winPDrop, 0) / austinMoves.length
    : 0;
  const avgCPL       = austinMoves.length
    ? austinMoves.reduce((s, m) => s + m.cpl, 0) / austinMoves.length
    : 0;
  const accuracy     = winPDropToAccuracy(avgWinPDrop);

  const blunders    = austinMoves.filter(m => m.classification === 'blunder').length;
  const mistakes    = austinMoves.filter(m => m.classification === 'mistake').length;
  const inaccuracies = austinMoves.filter(m => m.classification === 'inaccuracy').length;

  // Top 3 worst moves (highest CPL) for the summary
  const criticalMoments = [...austinMoves]
    .filter(m => m.cpl >= INACCURACY_CPL)
    .sort((a, b) => b.cpl - a.cpl)
    .slice(0, 3)
    .map(m => ({
      san:          m.san,
      bestMove:     m.bestMove,
      cpl:          Math.round(m.cpl),
      classification: m.classification,
      evalBefore:   formatEval(m.evalBefore),
      evalAfter:    formatEval(m.evalAfter),
    }));

  return {
    accuracy,
    avgCPL:         Math.round(avgCPL),
    blunders,
    mistakes,
    inaccuracies,
    movesAnalyzed:  austinMoves.length,
    criticalMoments,
  };
}

function formatEval(cp) {
  if (cp >= 29000)  return '#';     // forced mate
  if (cp <= -29000) return '-#';
  const pawns = (cp / 100).toFixed(2);
  return cp >= 0 ? `+${pawns}` : pawns;
}

// ─── HTML patching ────────────────────────────────────────────────────────────
function patchReviewHtml(htmlPath, roundMap) {
  const lines   = fs.readFileSync(htmlPath, 'utf8').split('\n');
  const updated = lines.map(line => {
    const m = line.match(
      /^(\s*<tr><td>(\d+)<\/td>.*class="accuracy"\s+data-val=")[^"]*(".*)/
    );
    if (!m) return line;
    const acc = roundMap[parseInt(m[2], 10)];
    return acc != null ? m[1] + acc + m[3] : line;
  });
  fs.writeFileSync(htmlPath, updated.join('\n'));
}

function patchPrepHtml(prepPath, tournamentKey, roundMap) {
  const lines  = fs.readFileSync(prepPath, 'utf8').split('\n');
  let inBlock  = false;
  let depth    = 0;

  const updated = lines.map(line => {
    if (!inBlock) {
      if (line.includes(`'${tournamentKey}': [`)) { inBlock = true; depth = 1; }
      return line;
    }
    for (const ch of line) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
    }
    if (depth <= 0) { inBlock = false; return line; }

    const m = line.match(
      /^(\s*\{ label: 'R(\d+)[^']*',\s+result: '[WLD]',\s+acc: )(?:null|\d+\.?\d*)(,?\s*\}.*)$/
    );
    if (m) {
      const acc = roundMap[parseInt(m[2], 10)];
      if (acc != null) return m[1] + acc + m[3];
    }
    return line;
  });

  fs.writeFileSync(prepPath, updated.join('\n'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Load existing results so we can skip already-analyzed games
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
    const roundMap = {};

    const pgnFiles = fs.readdirSync(tournament.pgnDir)
      .filter(f => f.toLowerCase().endsWith('.pgn'))
      .sort();

    for (const filename of pgnFiles) {
      const rawPgn = fs.readFileSync(
        path.join(tournament.pgnDir, filename), 'utf8'
      ).trim();
      const round = parseRound(filename, rawPgn);
      if (!round) { console.log(`  [SKIP] ${filename} — no round number\n`); continue; }

      const color = parseAustinColor(rawPgn);
      const pgn   = normalizePgn(rawPgn, round, tournament.key);
      const key   = `R${round}`;

      // Skip if already analyzed
      if (results[tournament.key][key]?.accuracy != null) {
        const cached = results[tournament.key][key];
        console.log(`  R${round}  ${filename}  (cached)`);
        console.log(`  Accuracy: ${cached.accuracy}%  CPL: ${cached.avgCPL}  ` +
          `Blunders: ${cached.blunders}  Mistakes: ${cached.mistakes}  Inaccuracies: ${cached.inaccuracies}\n`);
        roundMap[round] = cached.accuracy;
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

      console.log(`  R${round}  ${filename}  (Austin plays ${color})`);
      console.log(`  ${moveCount} moves — analyzing at depth ${SF_DEPTH}...`);

      const t0  = Date.now();
      let stats;
      try {
        stats = await analyzeGame(pgn, color, engine);
      } catch (e) {
        console.error(`  Error: ${e.message}\n`);
        continue;
      }
      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`  ✓ Accuracy: ${stats.accuracy}%  avgCPL: ${stats.avgCPL}  ` +
        `Blunders: ${stats.blunders}  Mistakes: ${stats.mistakes}  Inaccuracies: ${stats.inaccuracies}  (${secs}s)`);

      if (stats.criticalMoments.length > 0) {
        console.log('  Critical moments:');
        stats.criticalMoments.forEach(cm => {
          console.log(`    ${cm.classification.toUpperCase().padEnd(11)} ${cm.san.padEnd(8)} ` +
            `(best: ${cm.bestMove || '?'})  ${cm.evalBefore} → ${cm.evalAfter}  CPL: ${cm.cpl}`);
        });
      }
      console.log('');

      results[tournament.key][key] = stats;
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      roundMap[round] = stats.accuracy;
    }

    // Patch HTML files
    if (Object.keys(roundMap).length > 0) {
      process.stdout.write(`  Updating ${path.relative(ROOT, tournament.reviewHtml)}... `);
      patchReviewHtml(tournament.reviewHtml, roundMap);
      console.log('done.');

      process.stdout.write('  Updating austin-prep.html ACCURACY_DATA... ');
      patchPrepHtml(PREP_HTML, tournament.key, roundMap);
      console.log('done.\n');
    }
  }

  engine.quit();

  // Summary
  console.log(`${'─'.repeat(60)}`);
  console.log('\nAccuracy summary:\n');
  for (const tournament of TOURNAMENTS) {
    const games = Object.entries(results[tournament.key] || {})
      .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    if (!games.length) continue;
    const accs = games.map(([, g]) => g.accuracy).filter(a => a != null);
    const avg  = accs.length
      ? (accs.reduce((s, a) => s + a, 0) / accs.length).toFixed(1)
      : '—';
    console.log(`  ${tournament.key}  (avg: ${avg}%)`);
    games.forEach(([k, g]) => {
      if (!g.accuracy) return;
      console.log(`    ${k}:  ${String(g.accuracy).padStart(5)}%  ` +
        `CPL ${String(g.avgCPL).padStart(3)}  ` +
        `B:${g.blunders} M:${g.mistakes} I:${g.inaccuracies}`);
    });
    console.log('');
  }

  console.log(`Full results saved to ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
