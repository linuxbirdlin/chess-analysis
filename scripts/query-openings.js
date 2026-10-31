'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load token from .env
const envPath = path.resolve(__dirname, '../.env');
const env = fs.existsSync(envPath)
  ? Object.fromEntries(fs.readFileSync(envPath,'utf8').trim().split('\n').map(l => l.split('=')))
  : {};
const TOKEN = env.LICHESS_TOKEN || process.env.LICHESS_TOKEN;
if (!TOKEN) { console.error('No LICHESS_TOKEN found in .env'); process.exit(1); }

function query(fen, label, topGames = 3) {
  const enc = encodeURIComponent(fen);
  const url = `https://explorer.lichess.ovh/masters?fen=${enc}&topGames=${topGames}&recentGames=0&moves=12`;
  const raw = execSync(
    `curl -s "${url}" -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" --max-time 12`,
    { encoding: 'utf8' }
  );
  const d = JSON.parse(raw);
  const total = (d.white||0) + (d.draws||0) + (d.black||0);
  return { label, fen, total, moves: d.moves || [], topGames: d.topGames || [] };
}

function fmt(r) {
  const lines = [`\n=== ${r.label} ===`, `    ${r.total} master games`];
  r.moves.forEach(m => {
    const t = m.white + m.draws + m.black;
    const pct = r.total ? Math.round(100 * t / r.total) : 0;
    const avgRating = m.averageRating ? ` avgR:${m.averageRating}` : '';
    lines.push(`    ${m.san.padEnd(8)} ${String(t).padStart(5)}g (${pct}%)  W:${m.white} D:${m.draws} L:${m.black}${avgRating}`);
  });
  if (r.topGames.length) {
    lines.push('    Top games:');
    r.topGames.forEach(g => lines.push(`      ${g.white?.name||'?'} vs ${g.black?.name||'?'} (${g.year||'?'}) ${g.winner==='white'?'1-0':g.winner==='black'?'0-1':'½-½'}`));
  }
  return lines.join('\n');
}

const results = [];

// ── SECTION 1: Taimanov B45 — Austin as Black ─────────────────────────────
// After 5...Nf6, White plays 6.Ndb5

results.push(query(
  'r1bqkb1r/pp1p1ppp/2n1pn2/1N6/4P3/2N5/PPP2PPP/R1BQKB1R b KQkq - 5 6',
  'Taimanov B45 after 6.Ndb5 — Black to play (6...d6! vs alternatives)'
));

// After 6...d6! 7.Bf4 — White's main try
results.push(query(
  'r1bqkb1r/pp3ppp/2nppn2/1N6/4PB2/2N5/PPP2PPP/R2QKB1R b KQkq - 1 7',
  'After 6...d6! 7.Bf4 — Black to play (Austin\'s key response point)'
));

// After 6...d6! 7.Bf4 e5 8.Bg5 — approach to Sveshnikov
results.push(query(
  'r1bqkb1r/pp3ppp/2np1n2/1N2p1B1/4P3/2N5/PPP2PPP/R2QKB1R b KQkq - 1 8',
  'After 7.Bf4 e5 8.Bg5 — Black to play (a6 or Nb4?)'
));

// ── SECTION 2: Batrikov Variation (6.g4) in Taimanov ─────────────────────
// After 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Nf6 6.g4
results.push(query(
  'r1bqkb1r/pp1p1ppp/2n1pn2/8/3NP1P1/2N5/PPP2PP1/R1BQKB1R b KQkq g3 0 6',
  'Batrikov Variation 6.g4 (Taimanov) — Black to play (6...d6 main line vs alternatives)'
));

// ── SECTION 3: English Attack 6.Be3 in Taimanov ──────────────────────────
// After 5...Nc6 6.Be3
results.push(query(
  'r1bqkb1r/pp1p1ppp/2n1pn2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6',
  'Taimanov English Attack 6.Be3 — Black to play'
));

// After 6.Be3 a6 7.f3 — main English Attack tabiya
results.push(query(
  'r1bqkb1r/1p1p1ppp/p1n1pn2/8/3NP3/2N1BP2/PPP3PP/R2QKB1R b KQkq - 0 7',
  'English Attack tabiya after 6.Be3 a6 7.f3 — Black to play (...b5 race)'
));

// ── SECTION 4: Catalan with 4...Qe7 (vs Leo) ─────────────────────────────
// After 1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+ 4.Bd2 Qe7
results.push(query(
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/5N2/PP1BPPPP/RN1QKB1R w KQkq - 2 5',
  'Catalan Bogo-Indian after 4.Bd2 Qe7 — White to play (Austin\'s actual plan)'
));

// After 4...Qe7 5.Bg2
results.push(query(
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/5N2/PP1BPPPP/RN1QKB1R w KQkq - 2 5',
  'After 4...Qe7 5.g3 — White develops bishop (Leo\'s Catalan setup)'
));

// After 4...Qe7 5.Nc3 — transposition back to Nimzo
results.push(query(
  'rnb1k2r/pppp1ppp/4pn2/8/1bPP4/2N2N2/PP1BPPPP/R2QKB1R b KQkq - 3 5',
  'After 4...Qe7 5.Nc3 Bxc3 — Nimzo transposition (Austin familiar territory)'
));

// ── SECTION 5: Maróczy Bind (vs Pranav) ──────────────────────────────────
// After 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 5.c4
results.push(query(
  'r1bqkbnr/pp1ppppp/2n5/8/2PNP3/8/PP3PPP/RNBQKB1R b KQkq c3 0 5',
  'Maróczy Bind after 5.c4 — Black to play (Austin needs a plan)'
));

// After 5.c4 Nf6 6.Nc3 d6 — main Maróczy tabiya
results.push(query(
  'r1bqkb1r/pp2pppp/2np1n2/8/2PNP3/2N5/PP3PPP/R1BQKB1R w KQkq - 0 7',
  'Maróczy Bind tabiya after 5.c4 Nf6 6.Nc3 d6 — White to play'
));

// Print all results
results.forEach(r => console.log(fmt(r)));

// Save to JSON
const outPath = path.join(__dirname, 'opening-novelty-data.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved → ${path.relative(path.resolve(__dirname,'..'), outPath)}`);
