#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, 'irene-analysis-results-deep.json');
const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

// ── Extract all moments ──────────────────────────────────────────────────
const moments = [];
let gameCount = 0;

function walk(obj, pathParts) {
  if (obj && obj.criticalMoments) {
    const label = pathParts.join(' / ') + (obj.opponent ? ' vs ' + obj.opponent : '');
    gameCount++;
    for (const m of obj.criticalMoments) {
      moments.push({
        game:          label,
        moveNum:       m.moveNum,
        san:           m.san,
        bestMove:      m.bestMove,
        cpl:           Math.abs(m.cpl || 0),
        classification: m.classification,
        evalBefore:    parseFloat(m.evalBefore),
        evalAfter:     parseFloat(m.evalAfter),
        evalBeforeRaw: m.evalBefore,
        evalAfterRaw:  m.evalAfter,
        prColor:       obj.prColor,
        prResult:      obj.prResult,
        oppElo:        obj.oppElo,
        eco:           obj.eco,
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
walk(raw, []);

// ── Global stats ─────────────────────────────────────────────────────────
const blunders  = moments.filter(m => m.classification === 'blunder');
const mistakes  = moments.filter(m => m.classification === 'mistake');
const decisive  = moments.filter(m =>
  m.evalBefore > 0.5 && m.evalAfter < -0.5 &&
  !isNaN(m.evalBefore) && !isNaN(m.evalAfter));
const wonPos    = moments.filter(m =>
  m.classification === 'blunder' &&
  !isNaN(m.evalBefore) && m.evalBefore >= 4.0 &&
  !isNaN(m.evalAfter)  && m.evalAfter >= -0.5);

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`FIND-WEAKNESS — Irene Xie (opponent-exploitation mode)`);
console.log(`Source: irene-analysis-results-deep.json (movetime-3000)`);
console.log(`═══════════════════════════════════════════════════════`);
console.log(`Games: ${gameCount}  |  Moments: ${moments.length}  |  Blunders: ${blunders.length}  |  Mistakes: ${mistakes.length}`);
console.log(`Decisive blunders (pos flipped): ${decisive.length}  |  Won-pos blunders (≥+4→≥-0.5): ${wonPos.length}`);

// ── Helpers ───────────────────────────────────────────────────────────────
function corr(arr) {
  const c = { win:0, draw:0, loss:0, unknown:0 };
  arr.forEach(m => { c[m.prResult === '?' ? 'unknown' : (m.prResult||'unknown')]++; });
  return c;
}
function phase(arr) {
  const p = { opening:0, transition:0, middlegame:0, endgame:0 };
  arr.forEach(m => {
    if (m.moveNum <= 15)       p.opening++;
    else if (m.moveNum <= 28)  p.transition++;
    else if (m.moveNum <= 40)  p.middlegame++;
    else                       p.endgame++;
  });
  return p;
}
function colorSplit(arr) {
  return { white: arr.filter(m=>m.prColor==='white').length, black: arr.filter(m=>m.prColor==='black').length };
}
function avgCpl(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s,m)=>s+m.cpl,0)/arr.length);
}
function printInstances(arr, limit=20) {
  arr.slice(0, limit).forEach(m => {
    const eB = isNaN(m.evalBefore) ? m.evalBeforeRaw : m.evalBefore.toFixed(2);
    const eA = isNaN(m.evalAfter)  ? m.evalAfterRaw  : m.evalAfter.toFixed(2);
    console.log(`  mv#${m.moveNum} ${m.san} (best ${m.bestMove}) ${eB}→${eA} cpl=${m.cpl} [${m.prColor}][${m.prResult}] ${m.game}`);
  });
  if (arr.length > limit) console.log(`  ... and ${arr.length - limit} more`);
}

// ── Pattern C — Decisive blunders ─────────────────────────────────────────
const patC = decisive.filter(m => !isNaN(m.evalBefore) && !isNaN(m.evalAfter));
const patC_corr = corr(patC);
const patC_col  = colorSplit(patC);
const patC_ph   = phase(patC);
console.log(`\n─── PATTERN C — Decisive blunders (position flipped +→-) ───`);
console.log(`Count: ${patC.length} instances  Color: W:${patC_col.white} B:${patC_col.black}  AvgCPL: ${avgCpl(patC)}`);
console.log(`Outcome: wins:${patC_corr.win} draws:${patC_corr.draw} losses:${patC_corr.loss}`);
console.log(`Phase: opening:${patC_ph.opening} transition:${patC_ph.transition} middlegame:${patC_ph.middlegame} endgame:${patC_ph.endgame}`);
patC.sort((a,b)=>b.cpl-a.cpl);
printInstances(patC);

// ── Pattern D — Won-position collapse ─────────────────────────────────────
const patD = moments.filter(m =>
  m.classification === 'blunder' &&
  !isNaN(m.evalBefore) && m.evalBefore >= 4.0 &&
  !isNaN(m.evalAfter)  && m.evalAfter >= -0.5);
const patD_corr = corr(patD);
const patD_col  = colorSplit(patD);
const patD_ph   = phase(patD);
console.log(`\n─── PATTERN D — Won-position collapse (≥+4 blunder, stays ≥-0.5) ───`);
console.log(`Count: ${patD.length} instances  Color: W:${patD_col.white} B:${patD_col.black}  AvgCPL: ${avgCpl(patD)}`);
console.log(`Outcome: wins:${patD_corr.win} draws:${patD_corr.draw} losses:${patD_corr.loss}`);
console.log(`Phase: opening:${patD_ph.opening} transition:${patD_ph.transition} middlegame:${patD_ph.middlegame} endgame:${patD_ph.endgame}`);
patD.sort((a,b)=>b.evalBefore-a.evalBefore);
printInstances(patD);

// ── Pattern F — Preparation boundary ─────────────────────────────────────
const patF = moments.filter(m =>
  m.moveNum >= 12 && m.moveNum <= 28 &&
  (m.classification === 'blunder' || m.classification === 'mistake') &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 1.5);
const patF_corr = corr(patF);
const patF_col  = colorSplit(patF);
console.log(`\n─── PATTERN F — Preparation boundary (mv12-28, equal pos error) ───`);
console.log(`Count: ${patF.length} instances  Color: W:${patF_col.white} B:${patF_col.black}  AvgCPL: ${avgCpl(patF)}`);
console.log(`Outcome: wins:${patF_corr.win} draws:${patF_corr.draw} losses:${patF_corr.loss}`);
patF.sort((a,b)=>b.cpl-a.cpl);
printInstances(patF, 25);

// ── Pattern G — R/Q error in equal position ───────────────────────────────
const patG = moments.filter(m =>
  (m.san && (m.san.startsWith('R') || m.san.startsWith('Q'))) &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.5 && m.evalBefore <= 2.0 &&
  (m.classification === 'blunder' || m.classification === 'mistake') &&
  m.cpl >= 150);
const patG_corr = corr(patG);
const patG_col  = colorSplit(patG);
console.log(`\n─── PATTERN G — R/Q error in equal position (cpl≥150) ───`);
console.log(`Count: ${patG.length} instances  Color: W:${patG_col.white} B:${patG_col.black}  AvgCPL: ${avgCpl(patG)}`);
console.log(`Outcome: wins:${patG_corr.win} draws:${patG_corr.draw} losses:${patG_corr.loss}`);
patG.sort((a,b)=>b.cpl-a.cpl);
printInstances(patG);

// ── Pattern A — Missed Bxh7+/Bxh2+ ──────────────────────────────────────
const patA = moments.filter(m =>
  m.bestMove && (m.bestMove.includes('h7') || m.bestMove.includes('h2')) &&
  !isNaN(m.evalBefore) && m.evalBefore > -3.0);
const patA_corr = corr(patA);
const patA_col  = colorSplit(patA);
console.log(`\n─── PATTERN A — Missed Bxh7+/Bxh2+ (Greek Gift) ───`);
console.log(`Count: ${patA.length} instances  Color: W:${patA_col.white} B:${patA_col.black}  AvgCPL: ${avgCpl(patA)}`);
console.log(`Outcome: wins:${patA_corr.win} draws:${patA_corr.draw} losses:${patA_corr.loss}`);
patA.sort((a,b)=>b.cpl-a.cpl);
printInstances(patA);

// ── Pattern B — Missed forcing check ─────────────────────────────────────
const patB = moments.filter(m =>
  m.bestMove && m.bestMove.endsWith('+') &&
  m.san && !m.san.endsWith('+') &&
  m.cpl >= 150 &&
  !isNaN(m.evalBefore) && m.evalBefore > -3.0);
const patB_corr = corr(patB);
const patB_col  = colorSplit(patB);
console.log(`\n─── PATTERN B — Missed forcing check (cpl≥150) ───`);
console.log(`Count: ${patB.length} instances  Color: W:${patB_col.white} B:${patB_col.black}  AvgCPL: ${avgCpl(patB)}`);
console.log(`Outcome: wins:${patB_corr.win} draws:${patB_corr.draw} losses:${patB_corr.loss}`);
patB.sort((a,b)=>b.cpl-a.cpl);
printInstances(patB);

// ── Pattern E — King navigation errors ───────────────────────────────────
const patE = moments.filter(m =>
  m.san && m.san.startsWith('K') &&
  m.cpl >= 300 &&
  !isNaN(m.evalBefore) && m.evalBefore > -3.0);
const patE_corr = corr(patE);
const patE_col  = colorSplit(patE);
console.log(`\n─── PATTERN E — King navigation errors (cpl≥300) ───`);
console.log(`Count: ${patE.length} instances  Color: W:${patE_col.white} B:${patE_col.black}  AvgCPL: ${avgCpl(patE)}`);
console.log(`Outcome: wins:${patE_corr.win} draws:${patE_corr.draw} losses:${patE_corr.loss}`);
patE.sort((a,b)=>b.cpl-a.cpl);
printInstances(patE);

// ── Pattern H — Kingside pawn errors ─────────────────────────────────────
const patH = moments.filter(m =>
  m.san && /^[fgh]/.test(m.san) && !m.san.includes('x') &&
  !isNaN(m.evalBefore) && m.evalBefore >= -1.0 && m.evalBefore <= 2.0 &&
  m.cpl >= 150 && m.moveNum <= 40);
const patH_corr = corr(patH);
const patH_col  = colorSplit(patH);
console.log(`\n─── PATTERN H — Kingside pawn errors (fgh push, cpl≥150, mv≤40) ───`);
console.log(`Count: ${patH.length} instances  Color: W:${patH_col.white} B:${patH_col.black}  AvgCPL: ${avgCpl(patH)}`);
console.log(`Outcome: wins:${patH_corr.win} draws:${patH_corr.draw} losses:${patH_corr.loss}`);
patH.sort((a,b)=>b.cpl-a.cpl);
printInstances(patH);

// ── Ranking summary ───────────────────────────────────────────────────────
console.log('\n─── RANKING (score = instances × avgCPL × decisiveWeight / games) ───');
const patterns = [
  { name:'C (decisive)',        arr:patC, dw:3.0 },
  { name:'D (won-pos)',         arr:patD, dw:1.0 },
  { name:'F (prep boundary)',   arr:patF, dw:1.0 },
  { name:'G (R/Q equal)',       arr:patG, dw:1.0 },
  { name:'B (missed check)',    arr:patB, dw:1.0 },
  { name:'A (Greek Gift)',      arr:patA, dw:1.0 },
  { name:'E (king nav)',        arr:patE, dw:1.0 },
  { name:'H (kside pawn)',      arr:patH, dw:1.0 },
];
patterns
  .map(p => ({ ...p, score: (p.arr.length * avgCpl(p.arr) * p.dw) / gameCount }))
  .sort((a,b) => b.score - a.score)
  .forEach(p => console.log(`  ${p.name.padEnd(22)} n=${String(p.arr.length).padStart(3)}  avgCPL=${String(avgCpl(p.arr)).padStart(4)}  score=${p.score.toFixed(1)}`));

console.log(`\nSTATS: ${gameCount} games · ${blunders.length} blunders (${decisive.length} decisive) · ${wonPos.length} won-pos blunders (≥+4→≥-0.5)\n`);
