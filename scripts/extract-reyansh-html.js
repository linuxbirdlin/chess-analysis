'use strict';
const fs   = require('fs');
const path = require('path');

const REYANSH_DIR = path.resolve(__dirname, '..', 'opponents', 'reyansh');
const HTML_FILE   = path.join(REYANSH_DIR, 'html-2.html'); // all 3 data files are identical
const OUT_FILE    = path.join(REYANSH_DIR, 'snoop-reyansh.pgn');

// ── parse chessData from SnoopChess HTML ──────────────────────────────────────

const html = fs.readFileSync(HTML_FILE, 'utf8');
const line3 = html.split('\n')[2]; // chessData is on line 3
const raw = line3
  .replace(/^<script>chessData=/, '')
  .replace(/<\/script>$/, '')
  .trim();

const data = JSON.parse(raw);
const games = data.games; // array of 12-element arrays

// Field index map (determined by inspection):
//   [0] display index (1-based)
//   [1] white player name
//   [2] black player name
//   [3] moves string (complete, no result token)
//   [4] HTML switch widget (unused)
//   [5] date "YYYY-MM-DD"
//   [6] source/event ("Online Broadcast", "chess.com", "twic", "mechanics-institute", "lichess_studies")
//   [7] result code ("10"=1-0, "½½"=1/2-1/2, "01"=0-1, "*"=unknown)
//   [8] SnoopChess game ID
//   [9] time control string
//  [10] boolean (unused)
//  [11] boolean (unused)

const RESULT_MAP = { '10': '1-0', '½½': '1/2-1/2', '01': '0-1', '*': '*' };

const EVENT_MAP = {
  'Online Broadcast': 'Online Broadcast',
  'chess.com':        'Chess.com',
  'twic':             'TWIC',
  'mechanics-institute': 'Mechanics Institute',
  'lichess_studies':  'Lichess Studies',
};

function formatDate(d) {
  // "2026-02-01" → "2026.02.01"
  return d.replace(/-/g, '.');
}

// Sort games by date descending (newest first), matching pgnlib convention
const sorted = [...games].sort((a, b) => {
  const da = a[5].replace(/-/g, '');
  const db = b[5].replace(/-/g, '');
  return db.localeCompare(da);
});

// Build PGN output
const lines = [];
for (const g of sorted) {
  const white   = g[1];
  const black   = g[2];
  const moves   = g[3].trim();
  const date    = formatDate(g[5]);
  const event   = EVENT_MAP[g[6]] || g[6];
  const result  = RESULT_MAP[g[7]] || g[7] || '*';
  const tc      = g[9] && g[9] !== 'time control tbd' ? g[9] : '?';

  lines.push(`[Event "${event}"]`);
  lines.push(`[Site "?"]`);
  lines.push(`[Date "${date}"]`);
  lines.push(`[White "${white}"]`);
  lines.push(`[Black "${black}"]`);
  lines.push(`[Result "${result}"]`);
  if (tc !== '?') lines.push(`[TimeControl "${tc}"]`);
  lines.push('');
  lines.push(`${moves} ${result}`);
  lines.push('');
}

fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');

console.log(`Extracted ${sorted.length} games → ${OUT_FILE}`);

// Summary by event source
const byEvent = {};
sorted.forEach(g => { byEvent[g[6]] = (byEvent[g[6]]||0)+1; });
Object.entries(byEvent).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v} games`));
