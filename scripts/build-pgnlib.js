'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const OPPDIR = path.join(ROOT, 'opponents');
const OUTDIR = path.join(ROOT, 'pgnlib');

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

// ── helpers ──────────────────────────────────────────────────────────────────

function findPgns(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findPgns(full));
    else if (entry.name.endsWith('.pgn')) results.push(full);
  }
  return results;
}

function splitPgn(text) {
  const games = [];
  const lines  = text.split('\n');
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
  if (cur.length) {
    const g = cur.join('\n').trim();
    if (g) games.push(g);
  }
  return games;
}

function header(pgn, tag) {
  const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
  return m ? m[1].trim() : '';
}

// Normalize date "2026.04.02" | "2026-04-02" | "2026/04/02" → "20260402"
function normDate(d) {
  if (!d) return '00000000';
  return d.replace(/[.\-/]/g, '').padEnd(8, '0').slice(0, 8);
}

// Normalize name for frequency counting: collapse spaces, lowercase
function normName(n) {
  return n.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Filesystem-safe name: keep commas and spaces (valid on macOS/Linux), strip illegal chars
function fsName(n) {
  return n.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
}

// ── per-opponent processing ──────────────────────────────────────────────────

const oppDirs = fs.readdirSync(OPPDIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

for (const opp of oppDirs) {
  const oppPath = path.join(OPPDIR, opp);
  const pgnFiles = findPgns(oppPath);
  if (!pgnFiles.length) { console.log(`${opp}: no pgn files`); continue; }

  // Parse all games
  const rawGames = [];
  for (const f of pgnFiles) {
    const text = fs.readFileSync(f, 'utf8');
    for (const g of splitPgn(text)) {
      if (!g.includes('[White ') && !g.includes('[Black ')) continue;
      rawGames.push(g);
    }
  }

  // Count names to identify the opponent (most frequent non-trivial name)
  const freq = {};
  for (const g of rawGames) {
    for (const tag of ['White', 'Black']) {
      const n = header(g, tag);
      if (!n || n === '?' || n === '-') continue;
      const k = normName(n);
      if (!freq[k]) freq[k] = { canonical: n, count: 0 };
      // Keep the canonical form that appears most often
      freq[k].count++;
    }
  }

  // Sort by frequency; the opponent should dominate
  const sorted = Object.values(freq).sort((a, b) => b.count - a.count);
  if (!sorted.length) { console.log(`${opp}: could not detect player name`); continue; }
  const opponentName = sorted[0].canonical;

  // Deduplicate by (white, black, date, round)
  const seen = new Set();
  const deduped = [];
  for (const g of rawGames) {
    const w   = normName(header(g, 'White'));
    const b   = normName(header(g, 'Black'));
    const dt  = normDate(header(g, 'Date'));
    const rnd = header(g, 'Round').replace(/\.\d+$/, ''); // strip board suffix
    const key = `${w}|${b}|${dt}|${rnd}`;
    if (!seen.has(key)) { seen.add(key); deduped.push({ g, dt }); }
  }

  // Sort date descending (newest first)
  deduped.sort((a, b) => b.dt.localeCompare(a.dt));

  // Write output
  const outName = fsName(opponentName) + '.pgn';
  const outPath = path.join(OUTDIR, outName);
  const content = deduped.map(x => x.g).join('\n\n') + '\n';
  fs.writeFileSync(outPath, content, 'utf8');

  console.log(`${opp.padEnd(12)} → "${outName}"  (${deduped.length} games, ${rawGames.length - deduped.length} dupes removed)`);
}

console.log(`\nDone. Output: ${path.relative(ROOT, OUTDIR)}/`);
