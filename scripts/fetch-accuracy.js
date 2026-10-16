#!/usr/bin/env node
/**
 * fetch-accuracy.js
 *
 * Imports Austin's OTB PGN files to Lichess, requests computer analysis,
 * then writes accuracy % back into the review HTML files and austin-prep.html.
 *
 * Usage:
 *   LICHESS_TOKEN=lip_xxxx node scripts/fetch-accuracy.js
 *
 * Or put your token in a .env file at the project root:
 *   LICHESS_TOKEN=lip_xxxx
 *
 * Get a token at: https://lichess.org/account/oauth/token
 *   → Required scope: "Read preferences" is enough; no special scope needed for import.
 *   → For requesting analysis you need a logged-in account (any free account works).
 *
 * Requirements: Node.js 18+ (uses built-in fetch)
 *
 * Progress is saved to scripts/accuracy-cache.json so you can safely re-run:
 *   - Already-imported games are not re-imported
 *   - Already-requested analysis is not re-requested
 *   - Games whose analysis isn't ready yet will be retried on the next run
 *
 * Lichess rate limits:
 *   - Import: generous (no hard limit documented)
 *   - Analysis requests: ~3–5/day on a free account; more on accounts with more games
 *   The script paces requests with delays to avoid hitting limits.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT       = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(__dirname, 'accuracy-cache.json');
const PREP_HTML  = path.join(ROOT, 'austin-prep.html');
const LICHESS    = 'https://lichess.org';

// ─── Tournament map ───────────────────────────────────────────────────────────
// key must match the string used in ACCURACY_DATA in austin-prep.html
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

// ─── Delays (ms) ─────────────────────────────────────────────────────────────
const DELAY_AFTER_IMPORT   = 2000;
const DELAY_AFTER_ANALYSIS = 4000;
const POLL_INTERVAL        = 25000;   // 25 s between polls
const MAX_POLL_ATTEMPTS    = 12;      // up to 5 minutes total

// ─── Utilities ───────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch { return {}; }
}
function saveCache(c) { fs.writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2)); }

// Load .env from project root if present
function loadDotEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

// ─── PGN parsing ─────────────────────────────────────────────────────────────

// Returns the round number from filename (round3.pgn → 3)
// or from PGN [Round "X.Y"] header (takes the first integer).
function parseRound(filename, pgn) {
  const fnMatch = path.basename(filename).match(/^round(\d+)/i);
  if (fnMatch) return parseInt(fnMatch[1], 10);
  const hdrMatch = pgn.match(/\[Round\s+"(\d+)/);
  if (hdrMatch) return parseInt(hdrMatch[1], 10);
  return null;
}

// Returns 'white' or 'black' for the color Austin played.
// Handles both NAYCC full-header PGNs and PAM minimal-header PGNs.
function parseAustinColor(pgn) {
  const white = pgn.match(/\[White\s+"([^"]+)"\]/);
  const black = pgn.match(/\[Black\s+"([^"]+)"\]/);
  if (white && /Lin,?\s*Austin/i.test(white[1])) return 'white';
  if (black && /Lin,?\s*Austin/i.test(black[1])) return 'black';
  // PAM format first line: "Lin, Austin (1865) - Opponent (1234)"
  const firstLine = pgn.split('\n').find(l => l.trim());
  if (firstLine && /^Lin,?\s*Austin/i.test(firstLine.trim())) return 'white';
  return 'black';   // default — log a warning
}

// ─── Lichess API ─────────────────────────────────────────────────────────────

async function lichessFetch(url, options = {}) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`);
  }
  return resp;
}

// POST /api/import → { id, url }
async function importGame(pgn) {
  const resp = await lichessFetch(`${LICHESS}/api/import`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'pgn=' + encodeURIComponent(pgn),
  });
  return resp.json();
}

// POST /api/game/:id/request-analysis  (requires OAuth token)
async function requestAnalysis(gameId, token) {
  await lichessFetch(`${LICHESS}/api/game/${gameId}/request-analysis`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// GET /api/game/:id?accuracy=true → accuracy fields (null if not yet analyzed)
async function getAccuracy(gameId) {
  const resp = await lichessFetch(
    `${LICHESS}/api/game/${gameId}?accuracy=true`,
    { headers: { Accept: 'application/json' } },
  );
  const data = await resp.json();
  return {
    white: data?.players?.white?.analysis?.accuracy ?? null,
    black: data?.players?.black?.analysis?.accuracy ?? null,
  };
}

// Poll until accuracy is available, or timeout
async function waitForAccuracy(gameId) {
  for (let i = 1; i <= MAX_POLL_ATTEMPTS; i++) {
    process.stdout.write(`  ⏳ Polling (${i}/${MAX_POLL_ATTEMPTS})...`);
    const acc = await getAccuracy(gameId);
    if (acc.white !== null || acc.black !== null) {
      process.stdout.write(' ready!\n');
      return acc;
    }
    process.stdout.write(' not ready yet.\n');
    if (i < MAX_POLL_ATTEMPTS) await sleep(POLL_INTERVAL);
  }
  return { white: null, black: null };
}

// ─── HTML patching ────────────────────────────────────────────────────────────

// Update data-val attributes in a review HTML file.
// Each game row is a single line containing: <tr><td>{round}</td>...<td class="accuracy" data-val="">—</td></tr>
// roundMap: { roundNumber: accuracyValue }
function patchReviewHtml(htmlPath, roundMap) {
  const lines = fs.readFileSync(htmlPath, 'utf8').split('\n');
  const updated = lines.map(line => {
    // Match rows that have a leading round number and an accuracy cell
    const m = line.match(
      /^(\s*<tr><td>(\d+)<\/td>.*class="accuracy"\s+data-val=")[^"]*(".*)/
    );
    if (!m) return line;
    const round = parseInt(m[2], 10);
    const acc   = roundMap[round];
    return acc != null ? m[1] + acc + m[3] : line;
  });
  fs.writeFileSync(htmlPath, updated.join('\n'));
}

// Update acc values inside ACCURACY_DATA in austin-prep.html.
// Uses bracket-depth tracking to only modify entries inside the target tournament block.
function patchPrepHtml(prepPath, tournamentKey, roundMap) {
  const lines  = fs.readFileSync(prepPath, 'utf8').split('\n');
  let inBlock  = false;
  let depth    = 0;

  const updated = lines.map(line => {
    // Enter block
    if (!inBlock) {
      if (line.includes(`'${tournamentKey}': [`)) {
        inBlock = true;
        depth   = 1;      // we're now inside the opening [
        return line;
      }
      return line;
    }

    // Track bracket depth to know when the block ends
    for (const ch of line) {
      if (ch === '[') depth++;
      if (ch === ']') depth--;
    }
    if (depth <= 0) { inBlock = false; return line; }

    // Match entry lines:  { label: 'R3 Villalba',  result: 'W', acc: null },
    const m = line.match(
      /^(\s*\{ label: 'R(\d+)[^']*',\s+result: '[WLD]',\s+acc: )(?:null|\d+)(,?\s*\}.*)$/
    );
    if (m) {
      const round = parseInt(m[2], 10);
      const acc   = roundMap[round];
      if (acc != null) return m[1] + acc + m[3];
    }
    return line;
  });

  fs.writeFileSync(prepPath, updated.join('\n'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadDotEnv();
  const TOKEN = process.env.LICHESS_TOKEN;

  if (!TOKEN) {
    console.error([
      '',
      '  Error: LICHESS_TOKEN is not set.',
      '',
      '  1. Create a free Lichess account at https://lichess.org',
      '  2. Go to https://lichess.org/account/oauth/token',
      '  3. Create a personal token (no special scope required)',
      '  4. Either:',
      '       export LICHESS_TOKEN=lip_xxxx',
      '     or add  LICHESS_TOKEN=lip_xxxx  to a .env file in the project root',
      '',
    ].join('\n'));
    process.exit(1);
  }

  const cache = loadCache();
  const allRoundMaps = {};   // key → { round: accuracy }

  for (const tournament of TOURNAMENTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${tournament.key}`);
    console.log(`${'─'.repeat(60)}`);

    const roundMap = {};
    allRoundMaps[tournament.key] = roundMap;

    const pgnFiles = fs.readdirSync(tournament.pgnDir)
      .filter(f => f.toLowerCase().endsWith('.pgn'))
      .sort();   // sort for consistent ordering

    for (const filename of pgnFiles) {
      const filePath = path.join(tournament.pgnDir, filename);
      const pgn      = fs.readFileSync(filePath, 'utf8').trim();
      const round    = parseRound(filename, pgn);
      const color    = parseAustinColor(pgn);

      if (round === null) {
        console.log(`\n  [SKIP] ${filename} — could not determine round number`);
        continue;
      }

      const cacheKey = `${tournament.key}:R${round}`;
      console.log(`\n  R${round}  ${filename}  (Austin plays ${color})`);

      // ── Step 1: Import ──────────────────────────────────────────────────
      let entry = cache[cacheKey] || {};
      if (!entry.gameId) {
        process.stdout.write('  Importing to Lichess... ');
        try {
          const res     = await importGame(pgn);
          entry.gameId  = res.id;
          entry.gameUrl = res.url;
          cache[cacheKey] = entry;
          saveCache(cache);
          console.log(`done → ${res.url}`);
        } catch (err) {
          console.error(`\n  ✗ Import failed: ${err.message}`);
          continue;
        }
        await sleep(DELAY_AFTER_IMPORT);
      } else {
        console.log(`  Already imported → ${LICHESS}/${entry.gameId}`);
      }

      // ── Step 2: Request analysis ────────────────────────────────────────
      if (!entry.analysisRequested) {
        process.stdout.write('  Requesting computer analysis... ');
        try {
          await requestAnalysis(entry.gameId, TOKEN);
          entry.analysisRequested = true;
          cache[cacheKey] = entry;
          saveCache(cache);
          console.log('queued.');
        } catch (err) {
          // 400 often means analysis was already requested or game is too short
          if (err.message.includes('400')) {
            console.log('already analyzed or too short — skipping request.');
            entry.analysisRequested = true;
            cache[cacheKey] = entry;
            saveCache(cache);
          } else {
            console.error(`\n  ✗ Analysis request failed: ${err.message}`);
          }
        }
        await sleep(DELAY_AFTER_ANALYSIS);
      } else {
        console.log('  Analysis already requested.');
      }

      // ── Step 3: Retrieve accuracy ───────────────────────────────────────
      if (entry.accuracy != null) {
        console.log(`  Cached accuracy: ${entry.accuracy}%`);
        roundMap[round] = entry.accuracy;
        continue;
      }

      console.log('  Waiting for analysis...');
      const acc       = await waitForAccuracy(entry.gameId);
      const austinAcc = color === 'white' ? acc.white : acc.black;

      if (austinAcc !== null) {
        console.log(`  ✓ Austin's accuracy: ${austinAcc}%`);
        entry.accuracy      = austinAcc;
        entry.opponentColor = color === 'white' ? 'black' : 'white';
        entry.opponentAcc   = color === 'white' ? acc.black : acc.white;
        cache[cacheKey] = entry;
        saveCache(cache);
        roundMap[round] = austinAcc;
      } else {
        console.log('  Analysis not ready — re-run this script in a few minutes.');
      }

      await sleep(2000);
    }

    // ── Patch HTML files ──────────────────────────────────────────────────
    if (Object.keys(roundMap).length === 0) {
      console.log('\n  No new accuracy data to write for this tournament.');
      continue;
    }

    console.log(`\n  Writing accuracy to ${path.relative(ROOT, tournament.reviewHtml)}...`);
    patchReviewHtml(tournament.reviewHtml, roundMap);

    console.log('  Writing accuracy to austin-prep.html ACCURACY_DATA...');
    patchPrepHtml(PREP_HTML, tournament.key, roundMap);

    console.log('  Done.');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  const pending = Object.entries(cache)
    .filter(([, v]) => v.accuracy == null)
    .map(([k]) => k);

  if (pending.length) {
    console.log(`\n  ${pending.length} game(s) still awaiting analysis:`);
    pending.forEach(k => console.log(`    ${k}`));
    console.log('\n  Re-run this script in a few minutes to pick them up.');
  } else {
    console.log('\n  All games have accuracy data. ✓');
  }

  // Show a summary table of what we have
  console.log('\n  Accuracy summary:');
  for (const tournament of TOURNAMENTS) {
    const roundMap = allRoundMaps[tournament.key] || {};
    // Also include cached values not newly fetched
    const allForT = Object.entries(cache)
      .filter(([k]) => k.startsWith(tournament.key + ':'))
      .map(([k, v]) => ({ round: parseInt(k.split(':R')[1]), acc: v.accuracy }))
      .sort((a, b) => a.round - b.round);
    if (allForT.length) {
      console.log(`\n  ${tournament.key}`);
      allForT.forEach(({ round, acc }) => {
        console.log(`    R${round}: ${acc != null ? acc + '%' : '(pending)'}`);
      });
    }
  }
}

main().catch(err => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
