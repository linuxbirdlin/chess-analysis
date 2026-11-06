const fs = require('fs');
const path = require('path');

const jsonFile = path.resolve(__dirname, 'fernando-analysis-results-deep.json');
const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

function extractAllMoments(data, sourceFile) {
  const moments = [];
  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      for (const m of obj.criticalMoments) {
        moments.push({
          game: label,
          source: sourceFile,
          moveNum: m.moveNum,
          san: m.san,
          bestMove: m.bestMove,
          cpl: Math.abs(m.cpl || 0),
          classification: m.classification,
          evalBefore: parseFloat(m.evalBefore),
          evalAfter: parseFloat(m.evalAfter),
          evalBeforeRaw: m.evalBefore,
          evalAfterRaw: m.evalAfter,
          prColor: obj.fernandoColor || obj.prColor,
          prResult: obj.fernandoResult || obj.prResult,
          oppElo: obj.opponentElo || obj.oppElo,
          fernandoAccuracy: obj.fernandoAccuracy,
          eco: obj.eco,
        });
      }
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) {
          walk(v, [...pathParts, k]);
        }
      }
    }
  }
  walk(data, []);
  return moments;
}

// Count games
function countGames(data) {
  const games = [];
  function walk(obj, pathParts) {
    if (obj && (obj.criticalMoments || obj.fernandoAccuracy !== undefined || obj.accuracy !== undefined)) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      games.push({
        label,
        color: obj.fernandoColor || obj.prColor,
        result: obj.fernandoResult || obj.prResult,
        acc: obj.fernandoAccuracy,
        oppAcc: obj.opponentAccuracy,
        oppElo: obj.opponentElo || obj.oppElo,
        eco: obj.eco,
      });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) {
          walk(v, [...pathParts, k]);
        }
      }
    }
  }
  walk(data, []);
  return games;
}

const moments = extractAllMoments(raw, 'fernando-analysis-results-deep.json');
const games = countGames(raw);

console.log(`\n=== FERNANDO ANALYSIS ===`);
console.log(`Total games: ${games.length}`);
console.log(`Total critical moments: ${moments.length}`);

const blunders = moments.filter(m => m.classification === 'blunder');
const mistakes = moments.filter(m => m.classification === 'mistake');
console.log(`Blunders: ${blunders.length} | Mistakes: ${mistakes.length}`);

// Sample a few game records to see field names
console.log('\n--- Sample game fields ---');
const sampleKeys = Object.keys(raw).slice(0, 2);
sampleKeys.forEach(k => {
  const sub = raw[k];
  const subKeys = Object.keys(sub).slice(0, 2);
  subKeys.forEach(sk => {
    const game = sub[sk];
    if (game && typeof game === 'object') {
      const fieldNames = Object.keys(game).filter(f => f !== 'criticalMoments' && f !== 'moves');
      console.log(`  [${k} / ${sk}] fields: ${fieldNames.join(', ')}`);
      if (game.criticalMoments && game.criticalMoments.length > 0) {
        console.log(`    critMoment keys: ${Object.keys(game.criticalMoments[0]).join(', ')}`);
      }
    }
  });
});

console.log('\n--- All games summary ---');
games.forEach(g => {
  console.log(`  ${g.label} | color=${g.color} result=${g.result} acc=${g.acc} eco=${g.eco}`);
});

// Pattern C — decisive blunders
const patternC = moments.filter(m =>
  !isNaN(m.evalBefore) && !isNaN(m.evalAfter) &&
  m.evalBefore > 0.5 && m.evalAfter < -0.5
);
console.log(`\n=== PATTERN C — Decisive blunders (position flipped): ${patternC.length} instances ===`);
patternC.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern A — Greek gift
const patternA = moments.filter(m =>
  m.bestMove && (m.bestMove.includes('h7') || m.bestMove.includes('h2'))
);
console.log(`\n=== PATTERN A — Missed Bxh7+/h2+: ${patternA.length} instances ===`);
patternA.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult}`);
});

// Pattern B — missed forcing check
const patternB = moments.filter(m =>
  m.bestMove && m.bestMove.endsWith('+') &&
  !(m.san && m.san.endsWith('+')) &&
  m.cpl >= 150
);
console.log(`\n=== PATTERN B — Missed forcing check: ${patternB.length} instances ===`);
patternB.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern D — won-position collapse (non-decisive)
const patternD = moments.filter(m =>
  m.classification === 'blunder' &&
  !isNaN(m.evalBefore) && m.evalBefore >= 4.0 &&
  !isNaN(m.evalAfter) && m.evalAfter >= -0.5
);
console.log(`\n=== PATTERN D — Won-position collapse (still ok after): ${patternD.length} instances ===`);
patternD.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern E — king navigation
const patternE = moments.filter(m =>
  m.san && m.san.startsWith('K') && m.cpl >= 300
);
console.log(`\n=== PATTERN E — King navigation errors: ${patternE.length} instances ===`);
patternE.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern F — preparation boundary
const patternF = moments.filter(m =>
  m.moveNum >= 12 && m.moveNum <= 28 &&
  (m.classification === 'blunder' || m.classification === 'mistake') &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 1.5
);
console.log(`\n=== PATTERN F — Preparation boundary (mv12-28, equal position): ${patternF.length} instances ===`);
patternF.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern G — R/Q errors in equal positions
const patternG = moments.filter(m =>
  m.san && (m.san.startsWith('R') || m.san.startsWith('Q')) &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 2.0 &&
  (m.classification === 'mistake' || m.classification === 'blunder') &&
  m.cpl >= 150
);
console.log(`\n=== PATTERN G — R/Q errors in equal positions: ${patternG.length} instances ===`);
patternG.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// Pattern H — kingside pawn errors
const patternH = moments.filter(m =>
  m.san && /^[fgh]/.test(m.san) && !m.san.startsWith('x') &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.0 && m.evalBefore <= 2.0 &&
  m.cpl >= 150 && m.moveNum <= 40
);
console.log(`\n=== PATTERN H — Kingside pawn errors: ${patternH.length} instances ===`);
patternH.forEach(m => {
  console.log(`  [${m.game}] mv#${m.moveNum} played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`);
});

// ECO breakdown
const ecoMap = {};
games.forEach(g => {
  if (!g.eco) return;
  const family = g.eco.slice(0, 3);
  if (!ecoMap[family]) ecoMap[family] = { games: [], color: g.color };
  ecoMap[family].games.push(g);
});
console.log('\n=== ECO ACCURACY BREAKDOWN ===');
Object.entries(ecoMap).sort(([a], [b]) => a.localeCompare(b)).forEach(([eco, d]) => {
  const accs = d.games.filter(g => g.acc !== null && g.acc !== undefined).map(g => g.acc);
  const avg = accs.length ? (accs.reduce((s, a) => s + a, 0) / accs.length).toFixed(1) : 'N/A';
  const results = d.games.map(g => g.result).join(',');
  console.log(`  ${eco} (${d.games[0].color}): ${d.games.length}g avg=${avg}% results=${results}`);
});

// Overall stats
console.log('\n=== OVERALL ===');
const allAcc = games.filter(g => g.acc !== null && g.acc !== undefined).map(g => g.acc);
const avgAcc = allAcc.length ? (allAcc.reduce((s,a)=>s+a,0)/allAcc.length).toFixed(1) : 'N/A';
const whiteGames = games.filter(g => g.color === 'white');
const blackGames = games.filter(g => g.color === 'black');
const whiteAcc = whiteGames.filter(g => g.acc).map(g => g.acc);
const blackAcc = blackGames.filter(g => g.acc).map(g => g.acc);
const wAvg = whiteAcc.length ? (whiteAcc.reduce((s,a)=>s+a,0)/whiteAcc.length).toFixed(1) : 'N/A';
const bAvg = blackAcc.length ? (blackAcc.reduce((s,a)=>s+a,0)/blackAcc.length).toFixed(1) : 'N/A';
console.log(`  Overall avg accuracy: ${avgAcc}% (${allAcc.length} games)`);
console.log(`  White avg: ${wAvg}% (${whiteGames.length}g) | Black avg: ${bAvg}% (${blackGames.length}g)`);

// Won-position collapse total
const wonPosBlunders = moments.filter(m =>
  m.classification === 'blunder' && !isNaN(m.evalBefore) && m.evalBefore >= 4.0
);
console.log(`  Won-position blunders (evalBefore ≥ +4): ${wonPosBlunders.length}`);
const decisiveBlunders = moments.filter(m =>
  !isNaN(m.evalBefore) && !isNaN(m.evalAfter) &&
  m.evalBefore > 0.5 && m.evalAfter < -0.5
);
console.log(`  Decisive blunders (position flipped): ${decisiveBlunders.length}`);
