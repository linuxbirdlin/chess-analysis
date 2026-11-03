'use strict';
const { execSync } = require('child_process');
const { Chess } = require('../node_modules/chess.js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const env = fs.existsSync(envPath)
  ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').trim().split('\n').map(l => l.split('=')))
  : {};
const TOKEN = env.LICHESS_TOKEN || process.env.LICHESS_TOKEN;

function sleep(ms) { execSync(`sleep ${ms / 1000}`); }

function queryMasters(fen) {
  sleep(1200);
  const enc = encodeURIComponent(fen);
  const url = `https://explorer.lichess.ovh/masters?fen=${enc}&moves=12&recentGames=0&topGames=0`;
  const args = TOKEN ? `-H "Authorization: Bearer ${TOKEN}"` : '';
  const raw = execSync(
    `curl -s "${url}" ${args} -H "Accept: application/json" --max-time 15`,
    { encoding: 'utf8' }
  );
  return JSON.parse(raw);
}

function stripAnnotations(pgn) {
  let s = pgn.replace(/\{[^}]*\}/g, '');
  let result = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') { if (depth > 0) depth--; }
    else if (depth === 0) result += ch;
  }
  return result.replace(/\$\d+/g, '');
}

function parsePgnFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const chunks = content.split(/\n(?=\[Event\s)/).filter(c => c.trim());
  const games = [];
  for (const chunk of chunks) {
    try {
      const chess = new Chess();
      chess.loadPgn(stripAnnotations(chunk));
      const white = (chunk.match(/\[White "([^"]+)"\]/) || [])[1] || '';
      const black = (chunk.match(/\[Black "([^"]+)"\]/) || [])[1] || '';
      const isTarunWhite = /sankar.*tarun|tarun.*sankar/i.test(white);
      const isTarunBlack = /sankar.*tarun|tarun.*sankar/i.test(black);
      if (!isTarunWhite && !isTarunBlack) continue;
      const moves = chess.history();
      if (moves.length < 8) continue;
      games.push({ color: isTarunWhite ? 'white' : 'black', moves, white, black });
    } catch (e) { /* skip unparseable */ }
  }
  return games;
}

function groupByOpening(games, prefixLen) {
  const groups = {};
  for (const g of games) {
    const key = g.moves.slice(0, prefixLen).join(' ');
    if (!groups[key]) groups[key] = { moves_list: [], color: g.color, examples: [] };
    groups[key].moves_list.push(g.moves);
    groups[key].examples.push(`${g.white} vs ${g.black}`);
  }
  return groups;
}

function computeTrunk(movesList, maxDepth) {
  const trunk = [];
  let active = [...movesList];
  for (let i = 0; i < maxDepth; i++) {
    if (!active.length) break;
    const votes = {};
    for (const moves of active) {
      if (moves.length > i) votes[moves[i]] = (votes[moves[i]] || 0) + 1;
    }
    if (!Object.keys(votes).length) break;
    const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    trunk.push({ move: top[0], votes: top[1], total: active.length });
    // only keep games still following the trunk
    active = active.filter(moves => moves.length <= i || moves[i] === top[0]);
  }
  return trunk;
}

function analyzeDeviation(trunkEntries, color, label, gameCount) {
  const chess = new Chess();
  const steps = [];
  let firstDeviationIdx = -1;

  for (let i = 0; i < trunkEntries.length; i++) {
    const { move, votes, total } = trunkEntries[i];
    const isZacharyTurn = (color === 'white' && chess.turn() === 'w') ||
                          (color === 'black' && chess.turn() === 'b');
    const fen = chess.fen();
    const moveNum = Math.floor(i / 2) + 1;

    if (isZacharyTurn) {
      let bookData = null;
      try {
        const data = queryMasters(fen);
        const total_db = (data.white || 0) + (data.draws || 0) + (data.black || 0);
        const bookMoves = (data.moves || []).map(m => ({
          san: m.san,
          count: m.white + m.draws + m.black,
          pct: total_db ? Math.round(100 * (m.white + m.draws + m.black) / total_db) : 0
        }));
        const rank = bookMoves.findIndex(m => m.san === move);
        const top3Sans = bookMoves.slice(0, 3).map(m => m.san);
        bookData = {
          bookTop: bookMoves[0] || null,
          bookTop3: bookMoves.slice(0, 3),
          playerRank: rank,
          playerPct: rank >= 0 ? bookMoves[rank].pct : 0,
          totalGames: total_db,
          isDeviation: rank !== 0,
          isNovelty: rank < 0 || (rank >= 0 && bookMoves[rank].pct < 2)
        };
        if (bookData.isDeviation && firstDeviationIdx < 0) firstDeviationIdx = steps.length;
        console.log(`  ${moveNum}${color === 'white' ? '.' : '...'} ${move.padEnd(8)} rank=${rank >= 0 ? rank + 1 : 'novel'} book=${bookMoves[0]?.san || '?'} (${bookMoves[0]?.pct || 0}%) [db:${total_db}]`);
      } catch (e) {
        console.error(`  API error at move ${moveNum}: ${e.message}`);
      }
      steps.push({ i, moveNum, move, color: 'tarun', isZacharyTurn: true, agreementPct: Math.round(100 * votes / total), bookData });
    } else {
      steps.push({ i, moveNum, move, color: 'opponent', isZacharyTurn: false });
    }

    try {
      chess.move(move);
    } catch (e) {
      console.error(`Illegal move at step ${i}: ${move}`);
      break;
    }
  }

  return { label, color, gameCount, steps, firstDeviationIdx };
}

// ── Main ────────────────────────────────────────────────────────────────────
const pgnPath = path.resolve(__dirname, '../pgnlib/Sankar, Tarun.pgn');
const games = parsePgnFile(pgnPath);
console.log(`Parsed ${games.length} Tarun games`);

const whiteGames = games.filter(g => g.color === 'white');
const blackGames = games.filter(g => g.color === 'black');
console.log(`White: ${whiteGames.length}  Black: ${blackGames.length}`);

const analyses = [];

// Top 3 White systems
const whiteGroups = groupByOpening(whiteGames, 4);
const topWhite = Object.entries(whiteGroups).sort((a, b) => b[1].moves_list.length - a[1].moves_list.length).slice(0, 3);
for (const [key, data] of topWhite) {
  console.log(`\nWhite system (${data.moves_list.length} games): ${key}`);
  const trunk = computeTrunk(data.moves_list, 20);
  const result = analyzeDeviation(trunk, 'white', key, data.moves_list.length);
  result.examples = data.examples.slice(0, 3);
  analyses.push(result);
}

// Top 3 Black systems
const blackGroups = groupByOpening(blackGames, 4);
const topBlack = Object.entries(blackGroups).sort((a, b) => b[1].moves_list.length - a[1].moves_list.length).slice(0, 3);
for (const [key, data] of topBlack) {
  console.log(`\nBlack system (${data.moves_list.length} games): ${key}`);
  const trunk = computeTrunk(data.moves_list, 20);
  const result = analyzeDeviation(trunk, 'black', key, data.moves_list.length);
  result.examples = data.examples.slice(0, 3);
  analyses.push(result);
}

const outPath = path.resolve(__dirname, 'tarun-deviation-results.json');
fs.writeFileSync(outPath, JSON.stringify(analyses, null, 2));
console.log(`\nSaved → ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
