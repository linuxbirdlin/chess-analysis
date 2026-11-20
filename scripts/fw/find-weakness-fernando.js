const fs = require('fs');
const path = require('path');

// Fernando JSON uses: fernandoColor, fernandoResult, opponentElo (not prColor/prResult/oppElo)
// criticalMoments entries: san, bestMove, cpl, classification, evalBefore, evalAfter (no moveNum field)

function extractAllMoments(data, sourceFile) {
  const moments = [];
  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments && Array.isArray(obj.criticalMoments)) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      obj.criticalMoments.forEach((m, idx) => {
        moments.push({
          game: label,
          source: sourceFile,
          moveIdx: idx,  // position within criticalMoments array (not actual move number)
          san: m.san,
          bestMove: m.bestMove,
          cpl: Math.abs(m.cpl || 0),
          classification: m.classification,
          evalBefore: parseFloat(m.evalBefore),
          evalAfter: parseFloat(m.evalAfter),
          evalBeforeRaw: m.evalBefore,
          evalAfterRaw: m.evalAfter,
          // Fernando-specific field names
          prColor: obj.fernandoColor,
          prResult: obj.fernandoResult,
          oppElo: obj.opponentElo,
          eco: obj.eco,
          movesAnalyzed: obj.movesAnalyzed,
        });
      });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) walk(v, [...pathParts, k]);
      }
    }
  }
  walk(data, []);
  return moments;
}

function countGames(obj) {
  let count = 0;
  if (obj && obj.criticalMoments) return 1;
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const v of Object.values(obj)) count += countGames(v);
  }
  return count;
}

const deepPath = path.resolve(__dirname, 'fernando-analysis-results-deep.json');
const data = JSON.parse(fs.readFileSync(deepPath, 'utf8'));
const moments = extractAllMoments(data, 'deep');
const totalGames = countGames(data);

const blunders = moments.filter(m => m.classification === 'blunder');
const mistakes = moments.filter(m => m.classification === 'mistake');
const decisive = moments.filter(m => m.evalBefore > 0.5 && m.evalAfter < -0.5 && !isNaN(m.evalBefore) && !isNaN(m.evalAfter));
const wonPos = moments.filter(m => m.classification === 'blunder' && m.evalBefore >= 4.0 && !isNaN(m.evalBefore));

console.log(`\n=== FERNANDO CORTES MEDINA — RAW STATS ===`);
console.log(`Total games: ${totalGames}`);
console.log(`Total critical moments: ${moments.length}`);
console.log(`Blunders: ${blunders.length} | Mistakes: ${mistakes.length}`);
console.log(`Decisive blunders (flipped): ${decisive.length}`);
console.log(`Won-position blunders (eval ≥+4): ${wonPos.length}`);

// Color/result breakdown
const whiteGames = []; const blackGames = [];
function walkGames(obj, pathParts) {
  if (obj && obj.criticalMoments) {
    if (obj.fernandoColor === 'white') whiteGames.push(obj);
    else blackGames.push(obj);
    return;
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k,v] of Object.entries(obj)) walkGames(v, [...pathParts, k]);
  }
}
walkGames(data, []);
console.log(`\nColor split: ${whiteGames.length} as White, ${blackGames.length} as Black`);
const wins = [...whiteGames,...blackGames].filter(g=>g.fernandoResult==='win').length;
const losses = [...whiteGames,...blackGames].filter(g=>g.fernandoResult==='loss').length;
const draws = [...whiteGames,...blackGames].filter(g=>g.fernandoResult==='draw').length;
console.log(`Results: ${wins}W ${draws}D ${losses}L`);

function correlate(arr) {
  const c = {win:0, draw:0, loss:0, unknown:0};
  arr.forEach(m => { c[m.prResult === '?' ? 'unknown' : (m.prResult||'unknown')]++; });
  return c;
}
function colorSplit(arr) {
  return { W: arr.filter(m=>m.prColor==='white').length, B: arr.filter(m=>m.prColor==='black').length };
}

function score(arr, decWeight, total) {
  if (!arr.length) return 0;
  const avgCpl = arr.reduce((s,m)=>s+m.cpl,0)/arr.length;
  return (arr.length * avgCpl * decWeight) / total;
}
function printInstances(arr) {
  if (!arr.length) { console.log(`  (none)`); return; }
  arr.forEach(m => {
    console.log(`  [${m.game}] played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${isNaN(m.evalAfter)?m.evalAfterRaw:m.evalAfter.toFixed(2)} cpl=${m.cpl} [${m.prResult}] [${m.prColor}]`);
  });
}

// Patterns — note: no moveNum field in Fernando JSON, skip pattern F and E (need moveNum for phase distribution and F filter)
// Pattern A: Missed Bxh7+/Bxh2+
const patA = moments.filter(m => m.bestMove && (m.bestMove.includes('h7') || m.bestMove.includes('h2')));
// Pattern B: Missed forcing check
const patB = moments.filter(m => m.bestMove && m.bestMove.endsWith('+') && m.san && !m.san.endsWith('+') && m.cpl >= 150);
// Pattern C: Decisive blunder
const patC = decisive;
// Pattern D: Won-position collapse
const patD = moments.filter(m => m.classification==='blunder' && m.evalBefore>=4.0 && !isNaN(m.evalBefore) && m.evalAfter>=-0.5 && !isNaN(m.evalAfter));
// Pattern G: R/Q errors in equal positions
const patG = moments.filter(m => m.san && (m.san.startsWith('R')||m.san.startsWith('Q')) && m.evalBefore>=-1.5 && m.evalBefore<=2.0 && !isNaN(m.evalBefore) && (m.classification==='mistake'||m.classification==='blunder') && m.cpl>=150);
// Pattern H: Kingside pawn errors (no moveNum filter)
const patH = moments.filter(m => m.san && /^[fgh]/.test(m.san) && !m.san.includes('x') && m.evalBefore>=-1.0 && m.evalBefore<=2.0 && !isNaN(m.evalBefore) && m.cpl>=150);

const patterns = [
  { id:'C', name:'Decisive Blunder (position flipped winning→losing)', arr: patC, decW: 3.0 },
  { id:'D', name:'Won-Position Collapse (eval ≥+4)', arr: patD, decW: 1.0 },
  { id:'B', name:'Missed Forcing Check', arr: patB, decW: 1.0 },
  { id:'G', name:'R/Q Error in Equal Position', arr: patG, decW: 1.0 },
  { id:'H', name:'Kingside Pawn Error', arr: patH, decW: 1.0 },
  { id:'A', name:'Missed Greek Gift (Bxh7/Bxh2)', arr: patA, decW: 1.0 },
].map(p => ({...p, sc: score(p.arr, p.decW, totalGames)})).sort((a,b)=>b.sc-a.sc);

console.log('\n=== PATTERN ANALYSIS (ranked by score) ===');
patterns.forEach(p => {
  if (!p.arr.length) { console.log(`\nPattern ${p.id} — ${p.name}: 0 instances`); return; }
  const c = correlate(p.arr);
  const cs = colorSplit(p.arr);
  const uniqueGames = new Set(p.arr.map(m=>m.game)).size;
  const avgCpl = Math.round(p.arr.reduce((s,m)=>s+m.cpl,0)/p.arr.length);
  console.log(`\nPATTERN ${p.id} — ${p.name}`);
  console.log(`  ${p.arr.length} instances in ${uniqueGames} games | avg CPL: ${avgCpl} | score: ${p.sc.toFixed(1)}`);
  console.log(`  Color: [W:${cs.W} | B:${cs.B}]  Outcome: [win:${c.win} | draw:${c.draw} | loss:${c.loss}]`);
  printInstances(p.arr);
});

// Also count blunders/mistakes by color
const wBlunders = blunders.filter(m=>m.prColor==='white');
const bBlunders = blunders.filter(m=>m.prColor==='black');
const wMistakes = mistakes.filter(m=>m.prColor==='white');
const bMistakes = mistakes.filter(m=>m.prColor==='black');
const dW = decisive.filter(m=>m.prColor==='white');
const dB = decisive.filter(m=>m.prColor==='black');
console.log(`\n=== COLOR-SPLIT SUMMARY ===`);
console.log(`As White: ${wBlunders.length} blunders, ${wMistakes.length} mistakes, ${dW.length} decisive`);
console.log(`As Black: ${bBlunders.length} blunders, ${bMistakes.length} mistakes, ${dB.length} decisive`);

// Decisive blunders detail
if (decisive.length > 0) {
  console.log('\n=== ALL DECISIVE BLUNDERS (C) ===');
  decisive.forEach(m => {
    console.log(`  [${m.game}] played=${m.san} best=${m.bestMove} eval=${m.evalBeforeRaw}→${m.evalAfter.toFixed(2)} cpl=${m.cpl} [${m.prResult}] [${m.prColor}]`);
  });
}
