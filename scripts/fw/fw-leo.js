const fs = require('fs');
const path = require('path');

const jsonFile = path.resolve(__dirname, 'leo-analysis-results-deep.json');
const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

function extractAllMoments(data) {
  const moments = [];
  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      // Detect field names
      const prColor = obj.leoColor || obj.prColor;
      const prResult = obj.leoResult || obj.prResult;
      const oppElo = obj.opponentElo || obj.oppElo;
      const acc = obj.leoAccuracy || obj.accuracy || obj.prAccuracy;
      for (const m of obj.criticalMoments) {
        moments.push({
          game: label,
          moveNum: m.moveNum,
          san: m.san,
          bestMove: m.bestMove,
          cpl: Math.abs(m.cpl || 0),
          classification: m.classification,
          evalBefore: parseFloat(m.evalBefore),
          evalAfter: parseFloat(m.evalAfter),
          evalBeforeRaw: m.evalBefore,
          evalAfterRaw: m.evalAfter,
          prColor, prResult, oppElo,
          leoAccuracy: acc,
          eco: obj.eco,
        });
      }
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) walk(v, [...pathParts, k]);
      }
    }
  }
  walk(data, []);
  return moments;
}

function countGames(data) {
  const games = [];
  function walk(obj, pathParts) {
    if (obj && (obj.criticalMoments !== undefined || obj.leoAccuracy !== undefined || obj.accuracy !== undefined)) {
      if (!obj.criticalMoments && obj.leoAccuracy === undefined && obj.accuracy === undefined) return;
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      const acc = obj.leoAccuracy !== undefined ? obj.leoAccuracy : (obj.accuracy !== undefined ? obj.accuracy : obj.prAccuracy);
      const color = obj.leoColor || obj.prColor;
      const result = obj.leoResult || obj.prResult;
      games.push({ label, color, result, acc, oppElo: obj.opponentElo || obj.oppElo, eco: obj.eco });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) walk(v, [...pathParts, k]);
      }
    }
  }
  walk(data, []);
  return games;
}

// Sniff field names from a sample game
console.log('--- Sniffing field names ---');
const topKeys = Object.keys(raw).slice(0,2);
topKeys.forEach(tk => {
  const sub = raw[tk];
  const subKeys = Object.keys(sub).slice(0,2);
  subKeys.forEach(sk => {
    const g = sub[sk];
    if (g && typeof g === 'object') {
      console.log(`[${tk}/${sk}] fields: ${Object.keys(g).filter(f=>f!=='criticalMoments').join(', ')}`);
      if (g.criticalMoments && g.criticalMoments[0])
        console.log(`  cm keys: ${Object.keys(g.criticalMoments[0]).join(', ')}`);
    }
  });
});

const moments = extractAllMoments(raw);
const games = countGames(raw);

console.log(`\nTotal games: ${games.length}`);
console.log(`Total critical moments: ${moments.length}`);
const blunders = moments.filter(m => m.classification === 'blunder');
const mistakes = moments.filter(m => m.classification === 'mistake');
console.log(`Blunders: ${blunders.length} | Mistakes: ${mistakes.length}`);

console.log('\n--- All games ---');
games.forEach(g => {
  console.log(`  ${g.label} | color=${g.color} result=${g.result} acc=${g.acc} eco=${g.eco} oppElo=${g.oppElo}`);
});

// Pattern C — decisive blunders
const patC = moments.filter(m =>
  !isNaN(m.evalBefore) && !isNaN(m.evalAfter) &&
  m.evalBefore > 0.5 && m.evalAfter < -0.5
);
console.log(`\n=== PATTERN C — Decisive (${patC.length}) ===`);
patC.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern A — Greek gift
const patA = moments.filter(m => m.bestMove && (m.bestMove.includes('h7') || m.bestMove.includes('h2')));
console.log(`\n=== PATTERN A — Greek gift (${patA.length}) ===`);
patA.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult}`));

// Pattern B — missed check
const patB = moments.filter(m =>
  m.bestMove && m.bestMove.endsWith('+') && !(m.san && m.san.endsWith('+')) && m.cpl >= 150
);
console.log(`\n=== PATTERN B — Missed check (${patB.length}) ===`);
patB.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern D — won-position collapse
const patD = moments.filter(m =>
  m.classification === 'blunder' &&
  !isNaN(m.evalBefore) && m.evalBefore >= 4.0 &&
  !isNaN(m.evalAfter) && m.evalAfter >= -0.5
);
console.log(`\n=== PATTERN D — Won-position collapse (${patD.length}) ===`);
patD.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern E — king navigation (non-already-losing)
const patE = moments.filter(m =>
  m.san && m.san.startsWith('K') && m.cpl >= 300 && !isNaN(m.evalBefore) && m.evalBefore > -3.0
);
console.log(`\n=== PATTERN E — King errors (diagnostic only, ${patE.length}) ===`);
patE.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern F — preparation boundary
const patF = moments.filter(m =>
  m.moveNum >= 12 && m.moveNum <= 28 &&
  (m.classification === 'blunder' || m.classification === 'mistake') &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 1.5
);
console.log(`\n=== PATTERN F — Prep boundary mv12-28 (${patF.length}) ===`);
patF.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));
// Phase breakdown
if (patF.length > 0) {
  const byGame = {};
  patF.forEach(m => { if (!byGame[m.game]) byGame[m.game]=0; byGame[m.game]++; });
  console.log('  By game:', JSON.stringify(byGame));
}

// Pattern G — R/Q errors
const patG = moments.filter(m =>
  m.san && (m.san.startsWith('R') || m.san.startsWith('Q')) &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 2.0 &&
  (m.classification === 'mistake' || m.classification === 'blunder') &&
  m.cpl >= 150
);
console.log(`\n=== PATTERN G — R/Q errors (${patG.length}) ===`);
patG.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern H — kingside pawn errors
const patH = moments.filter(m =>
  m.san && /^[fgh]/.test(m.san) && !/^[fgh]x/.test(m.san) &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.0 && m.evalBefore <= 2.0 &&
  m.cpl >= 150 && m.moveNum <= 40
);
console.log(`\n=== PATTERN H — Kingside pawn errors (${patH.length}) ===`);
patH.forEach(m => console.log(`  [${m.game}] mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Phase distribution for patterns with moveNum
function phaseOf(n) {
  if (n === undefined) return 'unknown';
  if (n <= 15) return 'opening';
  if (n <= 28) return 'transition';
  if (n <= 40) return 'middlegame';
  return 'endgame';
}

// Overall stats
console.log('\n=== OVERALL ===');
const allAcc = games.filter(g => g.acc != null).map(g => g.acc);
const avgAcc = allAcc.length ? (allAcc.reduce((s,a)=>s+a,0)/allAcc.length).toFixed(1) : 'N/A';
const wg = games.filter(g => g.color === 'white'), bg = games.filter(g => g.color === 'black');
const wAcc = wg.filter(g=>g.acc!=null).map(g=>g.acc);
const bAcc = bg.filter(g=>g.acc!=null).map(g=>g.acc);
const wAvg = wAcc.length ? (wAcc.reduce((s,a)=>s+a,0)/wAcc.length).toFixed(1) : 'N/A';
const bAvg = bAcc.length ? (bAcc.reduce((s,a)=>s+a,0)/bAcc.length).toFixed(1) : 'N/A';
console.log(`Avg accuracy: ${avgAcc}% | White: ${wAvg}% (${wg.length}g) | Black: ${bAvg}% (${bg.length}g)`);
const rByResult = {win:0,draw:0,loss:0};
games.forEach(g => { if (rByResult[g.result]!==undefined) rByResult[g.result]++; });
console.log(`Results: ${rByResult.win}W-${rByResult.loss}L-${rByResult.draw}D`);

// Pattern C color/outcome breakdown
if (patC.length > 0) {
  const cByResult={win:0,draw:0,loss:0}, cByColor={white:0,black:0};
  patC.forEach(m=>{if(cByResult[m.prResult]!==undefined)cByResult[m.prResult]++;if(cByColor[m.prColor]!==undefined)cByColor[m.prColor]++;});
  console.log(`PatC outcome: ${JSON.stringify(cByResult)} | color: ${JSON.stringify(cByColor)}`);
  const phases={opening:0,transition:0,middlegame:0,endgame:0,unknown:0};
  patC.forEach(m=>{phases[phaseOf(m.moveNum)]++;});
  console.log(`PatC phases: ${JSON.stringify(phases)}`);
}

// ECO breakdown
console.log('\n=== ECO BREAKDOWN ===');
const ecoMap = {};
games.forEach(g => {
  const eco = g.eco ? g.eco.slice(0,3) : '?';
  if (!ecoMap[eco]) ecoMap[eco] = {games:[], color:g.color};
  ecoMap[eco].games.push(g);
});
Object.entries(ecoMap).sort(([a],[b])=>a.localeCompare(b)).forEach(([eco,d])=>{
  const accs = d.games.filter(g=>g.acc!=null).map(g=>g.acc);
  const avg = accs.length ? (accs.reduce((s,a)=>s+a,0)/accs.length).toFixed(1) : 'N/A';
  const results = d.games.map(g=>g.result).join(',');
  console.log(`  ${eco} (${d.games[0].color}): ${d.games.length}g avg=${avg}% [${results}]`);
});

// Accuracy in losses vs wins
console.log('\n=== ACCURACY BY RESULT ===');
const lossGames = games.filter(g=>g.result==='loss');
const winGames = games.filter(g=>g.result==='win');
const drawGames = games.filter(g=>g.result==='draw');
const lAvg = lossGames.length ? (lossGames.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/lossGames.filter(g=>g.acc!=null).length).toFixed(1) : 'N/A';
const wAvgR = winGames.length ? (winGames.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/winGames.filter(g=>g.acc!=null).length).toFixed(1) : 'N/A';
const dAvgR = drawGames.length ? (drawGames.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/drawGames.filter(g=>g.acc!=null).length).toFixed(1) : 'N/A';
console.log(`Losses (${lossGames.length}g): ${lAvg}% | Wins (${winGames.length}g): ${wAvgR}% | Draws (${drawGames.length}g): ${dAvgR}%`);
lossGames.forEach(g => console.log(`  LOSS: ${g.label} | acc=${g.acc}% color=${g.color} eco=${g.eco} oppElo=${g.oppElo}`));
