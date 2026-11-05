'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const REYANSH_DIR = path.join(ROOT, 'opponents', 'reyansh');
const PGNLIB_DIR  = path.join(ROOT, 'pgnlib');

const SNOOP_PGN     = path.join(REYANSH_DIR, 'snoop-reyansh.pgn');
const CHESSBASE_PGN = path.join(REYANSH_DIR, 'chessbase_Paragiri_Reyansh.pgn');

const OUT_CLASSICAL = path.join(PGNLIB_DIR, 'Paragiri, Reyansh.pgn');
const OUT_RAPID     = path.join(REYANSH_DIR, 'chess-com-rapid.pgn');

// ── PGN helpers ───────────────────────────────────────────────────────────────

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
  const last = cur.join('\n').trim();
  if (last) games.push(last);
  return games;
}

function tag(pgn, t) {
  const m = pgn.match(new RegExp(`\\[${t}\\s+"([^"]*)"\\]`));
  return m ? m[1].trim() : '';
}

// "2026.06.11" | "2026-06-11" → "20260611"
function normDate(d) {
  return d.replace(/[.\-/]/g, '').padEnd(8, '0').slice(0, 8);
}

// Normalize player name for dedup: sort tokens alphabetically (handles Last,First vs First Last)
// and cap at 3 tokens (some sources append extra middle/suffix names).
function normName(n) {
  return n.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    .split(' ').sort().slice(0, 3).join(' ');
}

// ── Time-control classification ───────────────────────────────────────────────

// Returns 'classical' | 'rapid' | 'blitz' | 'unknown'
function classifyTC(tcStr) {
  if (!tcStr || tcStr === '?' || tcStr.toLowerCase().includes('tbd')) return 'unknown';
  const s = tcStr.toLowerCase().replace(/g\//g, '').trim(); // strip "G/" prefix
  // "standard" label
  if (s === 'standard') return 'classical';
  // "N+inc" or "N+inc" (seconds)
  const m = s.match(/^(\d+)\+(\d+)$/);
  if (m) {
    const base = parseInt(m[1]);
    if (base >= 3600) return 'classical'; // 60 min+
    if (base >= 600)  return 'rapid';     // 10-59 min
    return 'blitz';
  }
  // "90;+30" or "90+30" style in minutes (ChessBase)
  const m2 = tcStr.match(/^(\d+)\s*[;:]\s*\+(\d+)$/i);
  if (m2) {
    const base = parseInt(m2[1]);
    if (base >= 60) return 'classical';
    if (base >= 10) return 'rapid';
    return 'blitz';
  }
  return 'unknown';
}

// For SnoopChess Event field: these are always classical OTB or serious online
function snoopSourceIsClassical(eventTag, tcTag) {
  const ev = eventTag.toLowerCase();
  if (ev === 'online broadcast' || ev === 'twic' || ev === 'mechanics institute' || ev === 'lichess studies') {
    return true; // always OTB classical
  }
  if (ev === 'chess.com') {
    const cls = classifyTC(tcTag);
    return cls === 'classical' || cls === 'unknown';
  }
  return true; // default conservative
}

function isClassicalGame(pgn) {
  const event = tag(pgn, 'Event');
  const tc    = tag(pgn, 'TimeControl');
  // Games from chessbase source have no SnoopChess event labels
  if (!['Online Broadcast','TWIC','Mechanics Institute','Chess.com','Lichess Studies'].includes(event)) {
    const cls = classifyTC(tc);
    return cls === 'classical' || cls === 'unknown'; // unknown OTB = treat as classical
  }
  return snoopSourceIsClassical(event, tc);
}

function isRapidBlitz(pgn) {
  return !isClassicalGame(pgn);
}

// ── Load and parse both sources ───────────────────────────────────────────────

const snoopGames     = splitPgn(fs.readFileSync(SNOOP_PGN,     'utf8'));
const chessbaseGames = splitPgn(fs.readFileSync(CHESSBASE_PGN, 'utf8'));

console.log(`Loaded ${snoopGames.length} SnoopChess games, ${chessbaseGames.length} ChessBase games`);

// ── Deduplication: prefer chessbase (richer headers) ─────────────────────────

// Key = normName(white) | normName(black) | normDate
function dedupKey(pgn) {
  return `${normName(tag(pgn,'White'))}|${normName(tag(pgn,'Black'))}|${normDate(tag(pgn,'Date'))}`;
}

const seen = new Map(); // key → pgn string (best version)

// Add chessbase first (preferred)
for (const g of chessbaseGames) {
  seen.set(dedupKey(g), g);
}

// Add snoop; skip if already seen
let snoopDups = 0;
for (const g of snoopGames) {
  const k = dedupKey(g);
  if (seen.has(k)) { snoopDups++; continue; }
  seen.set(k, g);
}

console.log(`${snoopDups} SnoopChess games deduplicated against ChessBase`);

// ── Classify ──────────────────────────────────────────────────────────────────

const classical = [];
const rapidBlitz = [];

for (const pgn of seen.values()) {
  if (isRapidBlitz(pgn)) rapidBlitz.push(pgn);
  else classical.push(pgn);
}

console.log(`Classical: ${classical.length} games | Rapid/Blitz: ${rapidBlitz.length} games`);

// ── Sort by date descending ───────────────────────────────────────────────────

function sortDesc(games) {
  return games.sort((a, b) => normDate(tag(b,'Date')).localeCompare(normDate(tag(a,'Date'))));
}

sortDesc(classical);
sortDesc(rapidBlitz);

// ── Write output ──────────────────────────────────────────────────────────────

function writeGames(games, outPath) {
  const out = games.map(g => g.trim()).join('\n\n') + '\n';
  fs.writeFileSync(outPath, out, 'utf8');
}

writeGames(classical, OUT_CLASSICAL);
writeGames(rapidBlitz, OUT_RAPID);

console.log(`\nWrote classical pgnlib → ${OUT_CLASSICAL}`);
console.log(`Wrote rapid/blitz file  → ${OUT_RAPID}`);

// ── Summary ───────────────────────────────────────────────────────────────────

const evCounts = {};
for (const g of classical) {
  const ev = tag(g, 'Event') || '(no event)';
  evCounts[ev] = (evCounts[ev]||0)+1;
}
console.log('\nClassical games by source:');
Object.entries(evCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

const results = { '1-0': 0, '0-1': 0, '1/2-1/2': 0, '*': 0 };
for (const g of classical) {
  const r = tag(g, 'Result');
  results[r] = (results[r]||0)+1;
}
console.log('\nClassical results:');
Object.entries(results).filter(([,v]) => v > 0).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

// GitHub Pages download link
const fname = path.basename(OUT_CLASSICAL);
console.log(`\nGitHub Pages link (classical):`);
console.log(`  https://linuxbirdlin.github.io/chess-analysis/pgnlib/${encodeURIComponent(fname)}`);
const fname2 = path.basename(OUT_RAPID);
console.log(`\nGitHub Pages link (rapid/blitz):`);
console.log(`  https://linuxbirdlin.github.io/chess-analysis/opponents/reyansh/${encodeURIComponent(fname2)}`);
