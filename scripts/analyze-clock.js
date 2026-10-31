'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const OPPDIR = path.join(ROOT, 'opponents');
const OUT    = path.join(__dirname, 'clock-analysis-results.json');

// Convert "H:MM:SS" or "MM:SS" to total seconds
function toSecs(str) {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Extract all clock values in move order from a PGN game string.
// Returns seconds-remaining for each half-move: [W1, B1, W2, B2, ...]
function extractClocks(pgn) {
  const clockRe = /\[%clk\s+([\d:]+)\]/g;
  const allClocks = [];
  let cm;
  while ((cm = clockRe.exec(pgn)) !== null) {
    allClocks.push(toSecs(cm[1]));
  }
  return allClocks;
}

// Split a PGN file text into individual game strings (split on [Event ...])
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

function header(pgn, tag) {
  const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
  return m ? m[1].trim() : '';
}

// Recursively find PGN files
function findPgns(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findPgns(full));
    else if (e.name.endsWith('.pgn')) out.push(full);
  }
  return out;
}

// Identify the opponent's player name pattern
const PLAYER_PATTERNS = {
  zachary:  /liu.*zachary|zachary.*liu/i,
  heye:     /gao.*heye|heye.*gao/i,
  justin:   /huang.*justin|justin.*huang/i,
  aarush:   /ajith.*aarush|aarush.*ajith/i,
  leo:      /jackson.*leo|leo.*jackson/i,
  fernando: /cortes.*fernando|fernando.*cortes/i,
  pranav:   /santhosh.*pranav|pranav.*santhosh/i,
};

function phase(moveIdx) {
  // moveIdx is 0-indexed clock index for one player (so move 1 = index 0)
  if (moveIdx <= 9)  return 'opening';    // moves 1–10
  if (moveIdx <= 29) return 'middlegame'; // moves 11–30
  return 'endgame';
}

function analyzePlayerClocks(name, oppDir) {
  const pgns = findPgns(oppDir);
  const gameProfiles = [];

  for (const pgnFile of pgns) {
    const text = fs.readFileSync(pgnFile, 'utf8');
    // Only process standard PGN (has [Event] header and [%clk] annotations)
    if (!text.includes('[%clk')) continue;
    const games = splitGames(text);

    for (const game of games) {
      if (!game.includes('[%clk')) continue;
      const white   = header(game, 'White');
      const black   = header(game, 'Black');
      const result  = header(game, 'Result');
      const dateStr = header(game, 'Date');
      const isPlayerW = PLAYER_PATTERNS[name] ? PLAYER_PATTERNS[name].test(white) : false;
      const isPlayerB = PLAYER_PATTERNS[name] ? PLAYER_PATTERNS[name].test(black) : false;
      if (!isPlayerW && !isPlayerB) continue;

      const playerColour = isPlayerW ? 'white' : 'black';
      const opponent     = isPlayerW ? black : white;

      // Extract all clocks in order (W move 1, B move 1, W move 2, B move 2, ...)
      const allClocks = extractClocks(game);
      if (allClocks.length < 4) continue;

      // Separate white and black clocks
      const wClocks = allClocks.filter((_, i) => i % 2 === 0);
      const bClocks = allClocks.filter((_, i) => i % 2 === 1);
      const playerClocks = playerColour === 'white' ? wClocks : bClocks;

      // Compute time used per move
      // time_used[i] = playerClocks[i-1] - playerClocks[i] + increment
      // If no increment known, just use raw delta (negative = increment > used)
      const timeUsed = [];
      for (let i = 1; i < playerClocks.length; i++) {
        const delta = playerClocks[i - 1] - playerClocks[i];
        // Positive = used more than increment, treat negative as ~0 (used < increment = very fast)
        timeUsed.push(Math.max(0, delta));
      }

      // Phase breakdowns
      const phases = { opening: [], middlegame: [], endgame: [] };
      timeUsed.forEach((t, i) => phases[phase(i)].push(t));

      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

      // Slow moves (>= 5 minutes = 300s used)
      const slowMoves = timeUsed
        .map((t, i) => ({ moveNum: i + 2, secs: t })) // i=0 is move 2 (first delta)
        .filter(m => m.secs >= 300)
        .sort((a, b) => b.secs - a.secs)
        .slice(0, 5);

      // Panic zone: first move where remaining < 600s (10 min)
      const panicMove = playerClocks.findIndex(c => c < 600);

      gameProfiles.push({
        file:          path.relative(ROOT, pgnFile),
        date:          dateStr,
        colour:        playerColour,
        opponent,
        result,
        totalMoves:    playerClocks.length,
        avgOpen:       avg(phases.opening),
        avgMid:        avg(phases.middlegame),
        avgEnd:        avg(phases.endgame),
        slowMoves,
        panicAtMove:   panicMove === -1 ? null : panicMove + 1,
        panicRemaining: panicMove === -1 ? null : playerClocks[panicMove],
      });
    }
  }

  if (!gameProfiles.length) return null;

  // Aggregate across all games
  const allAvgOpen = gameProfiles.map(g => g.avgOpen).filter(x => x > 0);
  const allAvgMid  = gameProfiles.map(g => g.avgMid).filter(x => x > 0);
  const allAvgEnd  = gameProfiles.map(g => g.avgEnd).filter(x => x > 0);
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  // Most commonly slow move numbers (= uncertainty points)
  const slowMoveCounts = {};
  gameProfiles.forEach(g => g.slowMoves.forEach(m => {
    slowMoveCounts[m.moveNum] = (slowMoveCounts[m.moveNum] || 0) + 1;
  }));
  const topSlowMoves = Object.entries(slowMoveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([move, count]) => ({ move: parseInt(move), games: count }));

  const panicMoves = gameProfiles.map(g => g.panicAtMove).filter(x => x !== null);
  const avgPanicMove = panicMoves.length ? Math.round(avg(panicMoves)) : null;

  return {
    player:       name,
    gamesAnalyzed: gameProfiles.length,
    avgSecsPerMove: {
      opening:    avg(allAvgOpen),
      middlegame: avg(allAvgMid),
      endgame:    avg(allAvgEnd),
    },
    topUncertaintyMoves: topSlowMoves,
    avgPanicMove,
    games: gameProfiles,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const results = {};

for (const name of Object.keys(PLAYER_PATTERNS)) {
  const oppDir = path.join(OPPDIR, name);
  if (!fs.existsSync(oppDir)) continue;
  console.log(`Analyzing ${name}...`);
  const profile = analyzePlayerClocks(name, oppDir);
  if (profile) {
    results[name] = profile;
    console.log(`  ${profile.gamesAnalyzed} games · avg mid: ${profile.avgSecsPerMove.middlegame}s/move · panic move: ${profile.avgPanicMove}`);
  } else {
    console.log(`  No clock data found.`);
  }
}

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nSaved → ${path.relative(ROOT, OUT)}`);
