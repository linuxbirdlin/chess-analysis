'use strict';
// Builds pgnlib/De Alba Boudreau, Pablo Elliot.pgn
// Merges ChessBase PGN + Lichess newgames.pgn, strips Lichess headers, sorts by date desc.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'pgnlib', 'De Alba Boudreau, Pablo Elliot.pgn');

function splitPgn(text) {
  const games = [];
  const lines  = text.split('\n');
  let current  = [];
  for (const line of lines) {
    if (line.startsWith('[Event ') && current.length > 0) {
      const g = current.join('\n').trim();
      if (g) games.push(g);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    const g = current.join('\n').trim();
    if (g) games.push(g);
  }
  return games;
}

function cleanLichessPgn(text) {
  // Remove Lichess-specific headers
  text = text.replace(/^\[(BroadcastName|BroadcastURL|GameURL|UTCDate|UTCTime|WhiteFideId|BlackFideId|Variant|WhiteTitle|BlackTitle)[^\n]*\n?/mg, '');
  // Strip inline eval/clock annotations
  text = text.replace(/\[%eval[^\]]*\]/g, '');
  text = text.replace(/\[%clk[^\]]*\]/g, '');
  // Strip comment text in {} (inaccuracy/mistake/blunder labels)
  text = text.replace(/\{[^{}]*\}/g, '');
  // Strip variation moves in ()
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  // Clean up extra whitespace in move text
  text = text.replace(/\s+/g, ' ').replace(/ \[/g, '\n[').replace(/\n\[/g, '\n[');
  // Re-split headers and move text
  const headerLines = [];
  const otherLines  = [];
  let inHeader = true;
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) { if (!inHeader) otherLines.push(''); continue; }
    if (l.startsWith('[')) { headerLines.push(l); }
    else { inHeader = false; otherLines.push(l); }
  }
  return headerLines.join('\n') + '\n\n' + otherLines.filter(l => l.trim()).join(' ').trim();
}

function getDate(pgn) {
  const m = pgn.match(/\[Date\s+"([^"]+)"\]/);
  return m ? m[1] : '0000.00.00';
}

// Read ChessBase PGN (standard format, no cleaning needed)
const cbText   = fs.readFileSync(path.join(ROOT, 'opponents/pablo/PabliElliot-ChaseBase.pgn'), 'utf8');
const cbGames  = splitPgn(cbText);

// Read Lichess newgames.pgn (needs cleaning)
const lgText   = fs.readFileSync(path.join(ROOT, 'opponents/pablo/newgames.pgn'), 'utf8');
const lgGamesRaw = splitPgn(lgText);
const lgGames  = lgGamesRaw.map(cleanLichessPgn);

// Merge and deduplicate
const all = [...cbGames, ...lgGames];

// Deduplicate by event+round+opponent
const seen = new Set();
const deduped = [];
for (const g of all) {
  const evM  = g.match(/\[Event\s+"([^"]+)"\]/);
  const rndM = g.match(/\[Round\s+"([^"]+)"\]/);
  const wM   = g.match(/\[White\s+"([^"]+)"\]/);
  const bM   = g.match(/\[Black\s+"([^"]+)"\]/);
  const ev   = evM  ? evM[1]  : '';
  const rnd  = rndM ? rndM[1] : '';
  const w    = wM   ? wM[1]   : '';
  const b    = bM   ? bM[1]   : '';
  // Copa games from Lichess have very long event names like "Round 1: ..."
  // ChessBase doesn't have Copa games so no overlap — no dedup needed for Copa
  const key = ev.slice(0, 30) + '|' + rnd.replace(/\.\d+$/, '') + '|' + (w+b).replace(/[^a-zA-Z]/g,'').slice(0,16).toLowerCase();
  if (!seen.has(key)) { seen.add(key); deduped.push(g); }
  else console.log(`Dup: ${key}`);
}

// Sort by date descending
deduped.sort((a, b) => {
  const da = getDate(a), db = getDate(b);
  if (db > da) return 1;
  if (db < da) return -1;
  return 0;
});

console.log(`ChessBase games: ${cbGames.length}`);
console.log(`Lichess games:   ${lgGames.length}`);
console.log(`Total unique:    ${deduped.length}`);

fs.writeFileSync(OUT, deduped.join('\n\n') + '\n');
console.log(`Written: ${path.relative(ROOT, OUT)}`);
