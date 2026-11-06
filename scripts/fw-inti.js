const fs = require('fs');
const path = require('path');

const jsonFile = path.resolve(__dirname, 'inti-analysis-results-deep.json');
const raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

function extractAllMoments(data) {
  const moments = [];
  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      const prColor = obj.intiColor || obj.prColor;
      const prResult = obj.intiResult || obj.prResult;
      const oppElo = obj.opponentElo || obj.oppElo;
      const acc = obj.intiAccuracy || obj.prAccuracy;
      for (const m of obj.criticalMoments) {
        moments.push({
          game: label, moveNum: m.moveNum, san: m.san, bestMove: m.bestMove,
          cpl: Math.abs(m.cpl||0), classification: m.classification,
          evalBefore: parseFloat(m.evalBefore), evalAfter: parseFloat(m.evalAfter),
          evalBeforeRaw: m.evalBefore, evalAfterRaw: m.evalAfter,
          prColor, prResult, oppElo, leoAccuracy: acc, eco: obj.eco,
        });
      }
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k,v] of Object.entries(obj)) { if (typeof v==='object'&&!Array.isArray(v)) walk(v,[...pathParts,k]); }
    }
  }
  walk(data, []);
  return moments;
}

function countGames(data) {
  const games = [];
  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments) {
      const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
      games.push({
        label, color: obj.intiColor||obj.prColor, result: obj.intiResult||obj.prResult,
        acc: obj.intiAccuracy||obj.prAccuracy, oppElo: obj.opponentElo||obj.oppElo, eco: obj.eco,
      });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k,v] of Object.entries(obj)) { if (typeof v==='object'&&!Array.isArray(v)) walk(v,[...pathParts,k]); }
    }
  }
  walk(data, []);
  return games;
}

// Sniff fields
console.log('--- Field sniff ---');
const tk = Object.keys(raw)[0];
const sk = Object.keys(raw[tk])[0];
const g = raw[tk][sk];
console.log(`[${tk}/${sk}] fields:`, Object.keys(g).filter(f=>f!=='criticalMoments').join(', '));
if (g.criticalMoments && g.criticalMoments[0]) console.log('cm keys:', Object.keys(g.criticalMoments[0]).join(', '));

const moments = extractAllMoments(raw);
const games = countGames(raw);

console.log(`\nTotal games: ${games.length}`);
console.log(`Total critical moments: ${moments.length}`);
const blunders = moments.filter(m=>m.classification==='blunder');
const mistakes = moments.filter(m=>m.classification==='mistake');
console.log(`Blunders: ${blunders.length} | Mistakes: ${mistakes.length}`);

console.log('\n--- All games ---');
games.forEach(g => console.log(`  ${g.label} | color=${g.color} result=${g.result} acc=${g.acc} eco=${g.eco} oppElo=${g.oppElo}`));

// Pattern C
const patC = moments.filter(m => !isNaN(m.evalBefore)&&!isNaN(m.evalAfter)&&m.evalBefore>0.5&&m.evalAfter<-0.5);
console.log(`\n=== PATTERN C — Decisive (${patC.length}) ===`);
patC.forEach(m => {
  const bestIsPawn = m.bestMove && /^[a-h]/.test(m.bestMove);
  console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]${bestIsPawn?' [PAWN]':''}`);
});

// Pattern A
const patA = moments.filter(m=>m.bestMove&&(m.bestMove.includes('h7')||m.bestMove.includes('h2')));
console.log(`\n=== PATTERN A — Greek gift (${patA.length}) ===`);
patA.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult}`));

// Pattern B
const patB = moments.filter(m=>m.bestMove&&m.bestMove.endsWith('+')&&!(m.san&&m.san.endsWith('+'))&&m.cpl>=150);
console.log(`\n=== PATTERN B — Missed check (${patB.length}) ===`);
patB.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern D
const patD = moments.filter(m=>m.classification==='blunder'&&!isNaN(m.evalBefore)&&m.evalBefore>=4.0&&!isNaN(m.evalAfter)&&m.evalAfter>=-0.5);
console.log(`\n=== PATTERN D — Won-position collapse (${patD.length}) ===`);
patD.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));
if(patD.length){const r={win:0,draw:0,loss:0};patD.forEach(m=>{if(r[m.prResult]!==undefined)r[m.prResult]++;});console.log('  outcome:',r);}

// Pattern E (diagnostic)
const patE = moments.filter(m=>m.san&&m.san.startsWith('K')&&m.cpl>=300&&!isNaN(m.evalBefore)&&m.evalBefore>-3.0);
console.log(`\n=== PATTERN E — King errors diagnostic (${patE.length}) ===`);
patE.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Pattern F
const patF = moments.filter(m=>m.moveNum>=12&&m.moveNum<=28&&(m.classification==='blunder'||m.classification==='mistake')&&!isNaN(m.evalBefore)&&m.evalBefore>=-1.5&&m.evalBefore<=1.5);
console.log(`\n=== PATTERN F — Prep boundary mv12-28 (${patF.length}) ===`);
patF.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));
if(patF.length){const r={win:0,draw:0,loss:0};patF.forEach(m=>{if(r[m.prResult]!==undefined)r[m.prResult]++;});const c={white:0,black:0};patF.forEach(m=>{if(c[m.prColor]!==undefined)c[m.prColor]++;});console.log('  outcome:',r,'| color:',c);}

// Pattern G
const patG = moments.filter(m=>m.san&&(m.san.startsWith('R')||m.san.startsWith('Q'))&&!isNaN(m.evalBefore)&&m.evalBefore>=-1.5&&m.evalBefore<=2.0&&(m.classification==='mistake'||m.classification==='blunder')&&m.cpl>=150);
console.log(`\n=== PATTERN G — R/Q errors (${patG.length}) ===`);
patG.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));
if(patG.length){const r={win:0,draw:0,loss:0};patG.forEach(m=>{if(r[m.prResult]!==undefined)r[m.prResult]++;});console.log('  outcome:',r);}

// Pattern H
const patH = moments.filter(m=>m.san&&/^[fgh]/.test(m.san)&&!/^[fgh]x/.test(m.san)&&!isNaN(m.evalBefore)&&m.evalBefore>=-1.0&&m.evalBefore<=2.0&&m.cpl>=150&&m.moveNum<=40);
console.log(`\n=== PATTERN H — Kingside pawn errors (${patH.length}) ===`);
patH.forEach(m => console.log(`  mv#${m.moveNum} ${m.san} best=${m.bestMove} ${m.evalBeforeRaw}->${m.evalAfterRaw} cpl=${m.cpl} ${m.prResult} [${m.prColor}]`));

// Overall
console.log('\n=== OVERALL ===');
const allAcc = games.filter(g=>g.acc!=null).map(g=>g.acc);
const avgAcc = allAcc.length?(allAcc.reduce((s,a)=>s+a,0)/allAcc.length).toFixed(1):'N/A';
const wg=games.filter(g=>g.color==='white'),bg=games.filter(g=>g.color==='black');
const wAcc=wg.filter(g=>g.acc!=null).map(g=>g.acc),bAcc=bg.filter(g=>g.acc!=null).map(g=>g.acc);
const wAvg=wAcc.length?(wAcc.reduce((s,a)=>s+a,0)/wAcc.length).toFixed(1):'N/A';
const bAvg=bAcc.length?(bAcc.reduce((s,a)=>s+a,0)/bAcc.length).toFixed(1):'N/A';
console.log(`Avg: ${avgAcc}% | White: ${wAvg}% (${wg.length}g) | Black: ${bAvg}% (${bg.length}g)`);
const rByResult={win:0,draw:0,loss:0};
games.forEach(g=>{if(rByResult[g.result]!==undefined)rByResult[g.result]++;});
console.log(`Results: ${rByResult.win}W-${rByResult.loss}L-${rByResult.draw}D`);
const decBlunders=patC.length;
const wonPos=moments.filter(m=>m.classification==='blunder'&&!isNaN(m.evalBefore)&&m.evalBefore>=4.0).length;
console.log(`Decisive blunders: ${decBlunders} | Won-pos blunders: ${wonPos}`);

// Accuracy by result
const lG=games.filter(g=>g.result==='loss'),wG=games.filter(g=>g.result==='win'),dG=games.filter(g=>g.result==='draw');
const lAvg=lG.filter(g=>g.acc!=null).length?(lG.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/lG.filter(g=>g.acc!=null).length).toFixed(1):'N/A';
const wAvgR=wG.filter(g=>g.acc!=null).length?(wG.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/wG.filter(g=>g.acc!=null).length).toFixed(1):'N/A';
const dAvgR=dG.filter(g=>g.acc!=null).length?(dG.filter(g=>g.acc!=null).map(g=>g.acc).reduce((s,a)=>s+a,0)/dG.filter(g=>g.acc!=null).length).toFixed(1):'N/A';
console.log(`Accuracy: losses ${lAvg}% | wins ${wAvgR}% | draws ${dAvgR}%`);

// ECO breakdown
console.log('\n=== ECO BREAKDOWN ===');
const ecoMap={};
games.forEach(g=>{const eco=g.eco?g.eco.slice(0,3):'?';if(!ecoMap[eco])ecoMap[eco]={games:[],color:g.color};ecoMap[eco].games.push(g);});
Object.entries(ecoMap).sort(([a],[b])=>a.localeCompare(b)).forEach(([eco,d])=>{
  const accs=d.games.filter(g=>g.acc!=null).map(g=>g.acc);
  const avg=accs.length?(accs.reduce((s,a)=>s+a,0)/accs.length).toFixed(1):'N/A';
  const results=d.games.map(g=>g.result).join(',');
  console.log(`  ${eco} (${d.games[0].color}): ${d.games.length}g avg=${avg}% [${results}]`);
});

// All loss games
console.log('\n=== LOSS GAMES ===');
lG.forEach(g=>console.log(`  LOSS: ${g.label} | acc=${g.acc}% color=${g.color} eco=${g.eco} oppElo=${g.oppElo}`));
