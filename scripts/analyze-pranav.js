'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(__dirname, 'pranav-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

// World Youth uses non-standard format; all others use standard PGN
const TOURNAMENTS = [
  { dir: 'agcafall2026',   name: 'AGCA Fall 2026',    format: 'pgn' },
  { dir: 'agcasummer2026', name: 'AGCA Summer 2026',  format: 'pgn' },
  { dir: 'worldyouth2026', name: 'World Youth 2026',  format: 'nonstandard' },
  { dir: 'blueridge2026',  name: 'Blue Ridge 2026',   format: 'pgn' },
  { dir: 'swopen2026',     name: 'SW Open 2026',      format: 'pgn' },
];

function isPranav(name) { return /santhosh|pranav/i.test(name); }

// Strip eval/clock annotations and variation trees so chess.js can load cleanly
function preprocessPgn(text) {
  text = text.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  text = text.replace(/\{[^{}]*\}/g, '');
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  return text;
}

// Parse standard PGN format
function parseStandardPgn(text) {
  const wm   = text.match(/\[White\s+"([^"]+)"\]/);
  const bm   = text.match(/\[Black\s+"([^"]+)"\]/);
  const welo = text.match(/\[WhiteElo\s+"([^"]+)"\]/);
  const belo = text.match(/\[BlackElo\s+"([^"]+)"\]/);
  const res  = text.match(/\[Result\s+"([^"]+)"\]/);
  const eco  = text.match(/\[ECO\s+"([^"]+)"\]/);
  const opening = text.match(/\[Opening\s+"([^"]+)"\]/);

  const wName = wm ? wm[1] : '';
  const bName = bm ? bm[1] : '';
  const pIsW = isPranav(wName);
  const pIsB = isPranav(bName);
  if (!pIsW && !pIsB) return null;

  const prColor  = pIsW ? 'white' : 'black';
  const opponent = pIsW ? bName : wName;
  const oppElo   = pIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                        : (welo ? parseInt(welo[1]) || 0 : 0);
  const result   = res ? res[1] : '*';
  const prResult = deriveResult(result, prColor);

  return { prColor, opponent, oppElo, result, prResult,
    eco: eco ? eco[1] : '?', opening: opening ? opening[1] : '',
    pgnText: text };
}

// Parse non-standard World Youth format:
//   SANTHOSH, Pranav (1940) - NEGREAN, Andrei (2366)
//   Event description, date
//
//   1.e4 c5 2.Nf3 ...
//
//   0-1
// Ratings may be absent for one player (e.g. "SANTHOSH, Pranav (1940) - PHILLIPS, Maximus A")
function parseNonstandardPgn(text) {
  const lines = text.split('\n').map(l => l.trim());
  // Skip leading blank lines
  const firstLineIdx = lines.findIndex(l => l.length > 0);
  if (firstLineIdx < 0 || !lines[firstLineIdx].includes(' - ')) return null;
  const firstLine = lines[firstLineIdx];

  // Try with both ratings first, then with optional second rating
  let headerMatch = firstLine.match(/^(.+?)\s*\((\d+)\)\s*-\s*(.+?)\s*\((\d+)\)$/);
  let p2EloRaw = null;
  if (!headerMatch) {
    // One player may have no rating (e.g. unknown opponent)
    headerMatch = firstLine.match(/^(.+?)\s*\((\d+)\)\s*-\s*(.+)$/);
    if (!headerMatch) return null;
    p2EloRaw = 0;
  }

  const p1Name = headerMatch[1].trim();
  const p1Elo  = parseInt(headerMatch[2]);
  const p2Name = headerMatch[3].trim().replace(/\s*\(\d+\)\s*$/, '');
  const p2Elo  = p2EloRaw !== null ? p2EloRaw : parseInt(headerMatch[4]);

  const pIsW = isPranav(p1Name);
  const pIsB = isPranav(p2Name);
  if (!pIsW && !pIsB) return null;

  const prColor  = pIsW ? 'white' : 'black';
  const opponent = pIsW ? p2Name : p1Name;
  const oppElo   = pIsW ? p2Elo : p1Elo;

  // Last non-empty line is the result
  const nonEmpty = lines.filter(l => l.length > 0);
  const lastLine = nonEmpty[nonEmpty.length - 1];
  const result   = /^(1-0|0-1|1\/2-1\/2)$/.test(lastLine) ? lastLine : '*';
  const prResult = deriveResult(result, prColor);

  // Move text: everything that starts with a digit and a dot (move notation lines)
  // Collect lines that look like move sequences (start with digit or continue moves)
  const moveLines = [];
  let inMoves = false;
  for (let i = firstLineIdx + 2; i < lines.length; i++) {
    const l = lines[i];
    if (!l) { if (inMoves) break; continue; }
    if (/^\d+\./.test(l)) { inMoves = true; moveLines.push(l); }
    else if (inMoves && /[a-zA-Z]/.test(l) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(l)) {
      moveLines.push(l);
    }
  }
  const moveText = moveLines.join(' ');

  // Build synthetic PGN chess.js can load
  const wName = pIsW ? p1Name : p2Name;
  const bName = pIsW ? p2Name : p1Name;
  const wElo  = pIsW ? p1Elo : p2Elo;
  const bElo  = pIsW ? p2Elo : p1Elo;
  const syntheticPgn = [
    `[White "${wName}"]`,
    `[Black "${bName}"]`,
    `[WhiteElo "${wElo}"]`,
    `[BlackElo "${bElo}"]`,
    `[Result "${result}"]`,
    '',
    result !== '*' ? moveText + ' ' + result : moveText,
  ].join('\n');

  return { prColor, opponent, oppElo, result, prResult, eco: '?', opening: '',
    pgnText: syntheticPgn };
}

function deriveResult(result, prColor) {
  if (result === '1/2-1/2') return 'draw';
  if (result === '1-0') return prColor === 'white' ? 'win' : 'loss';
  if (result === '0-1') return prColor === 'black' ? 'win' : 'loss';
  return '?';
}

function parseGameInfo(text, format) {
  if (format === 'pgn') return parseStandardPgn(text);
  return parseNonstandardPgn(text);
}

// ─── Stockfish engine wrapper ────────────────────────────────────────────────

class StockfishEngine {
  constructor() {
    this.proc  = spawn('stockfish');
    this.rl    = readline.createInterface({ input: this.proc.stdout });
    this.queue = [];
    this.rl.on('line', line => {
      if (!this.queue.length) return;
      const head = this.queue[0];
      head.accum?.(line);
      if (head.check(line)) { this.queue.shift(); head.resolve(line); }
    });
  }
  send(cmd) { this.proc.stdin.write(cmd + '\n'); }
  waitFor(check, accum) { return new Promise(r => this.queue.push({ check, accum, resolve: r })); }
  async init() {
    this.send('uci');
    await this.waitFor(l => l.trim() === 'uciok');
    this.send(`setoption name Threads value ${SF_THREADS}`);
    this.send('setoption name Hash value 1024');
    this.send('isready');
    await this.waitFor(l => l.trim() === 'readyok');
  }
  async evaluate(fen) {
    let score = null, pv1uci = null;
    this.send(`position fen ${fen}`);
    this.send(`go movetime 800`);
    await this.waitFor(
      l => l.startsWith('bestmove'),
      l => {
        if (l.includes('lowerbound') || l.includes('upperbound')) return;
        const cpM   = l.match(/score cp (-?\d+)/);
        const mateM = l.match(/score mate (-?\d+)/);
        const pvM   = l.match(/\bpv\s+(\S+)/);
        if (cpM)   score  = { type: 'cp',   value: parseInt(cpM[1]) };
        if (mateM) score  = { type: 'mate', value: parseInt(mateM[1]) };
        if (pvM)   pv1uci = pvM[1];
      }
    );
    let bestMoveSan = null;
    if (pv1uci) {
      try {
        const tmp = new Chess(fen);
        const m = tmp.move({ from: pv1uci.slice(0,2), to: pv1uci.slice(2,4), promotion: pv1uci[4] });
        if (m) bestMoveSan = m.san;
      } catch {}
    }
    let cp;
    if (!score) cp = 0;
    else if (score.type === 'mate') cp = score.value > 0 ? 30000 - score.value*10 : -30000 - score.value*10;
    else cp = score.value;
    return { cp, bestMoveSan };
  }
  quit() { this.send('quit'); this.proc.kill(); }
}

// ─── Accuracy + classification helpers ──────────────────────────────────────

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp/100).toFixed(2); }

// ─── PGN repair: replay move-by-move, disambiguate or truncate on failure ────

function repairPgn(pgnText) {
  // Extract move tokens from PGN text
  const clean = preprocessPgn(pgnText);
  // Remove header tags
  const body = clean.replace(/\[[^\]]*\]/g, '').trim();
  // Tokenize: strip move numbers, result tokens
  const tokens = body.split(/\s+/).filter(t =>
    t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)
  );

  const chess = new Chess();
  const played = [];
  for (const tok of tokens) {
    const legal = chess.moves();
    if (legal.includes(tok)) {
      chess.move(tok);
      played.push(tok);
      continue;
    }
    // Try disambiguation: for moves like "Nh2", try "N1h2","N2h2","N3h2","Nxh2"
    // Also try with file prefix "Nah2","Nbh2","Nch2","Ndh2","Neh2","Nfh2","Ngh2","Nhh2"
    const piece = tok[0];
    const variants = legal.filter(m => {
      if (!m.startsWith(piece)) return false;
      // The destination squares must match the last 2 chars of tok (ignoring promotion/check)
      const dest = tok.replace(/[+#=QRBN].*$/, '').slice(-2);
      return m.endsWith(dest) || m.replace(/[+#=QRBN].*$/, '').endsWith(dest);
    });
    if (variants.length === 1) {
      chess.move(variants[0]);
      played.push(variants[0]);
      continue;
    }
    if (variants.length > 1) {
      // Try each variant and pick the first that allows the next token to succeed
      let found = false;
      for (const v of variants) {
        const test = new Chess(chess.fen());
        test.move(v);
        const nextTok = tokens[tokens.indexOf(tok) + 1];
        if (!nextTok || test.moves().includes(nextTok)) {
          chess.move(v);
          played.push(v);
          found = true;
          break;
        }
      }
      if (found) continue;
      // Fall back to first variant
      chess.move(variants[0]);
      played.push(variants[0]);
      continue;
    }
    // Completely illegal — truncate here
    break;
  }

  // Rebuild as minimal PGN preserving original headers
  const headers = pgnText.match(/(\[[^\]]*\])/g) || [];
  const moveStr = played.map((m, i) =>
    i % 2 === 0 ? `${Math.floor(i/2)+1}. ${m}` : m
  ).join(' ');
  return headers.join('\n') + '\n\n' + moveStr;
}

// ─── Per-game analysis ───────────────────────────────────────────────────────

async function analyzeGame(pgnText, prColor, engine) {
  const chess = new Chess();
  let processedPgn = preprocessPgn(pgnText);
  try {
    chess.loadPgn(processedPgn);
  } catch(e) {
    // Attempt repair (disambiguation / truncation)
    processedPgn = repairPgn(pgnText);
    chess.loadPgn(processedPgn);
  }
  const history = chess.history({ verbose: true });
  const replay  = new Chess();

  let prevEval = await engine.evaluate(replay.fen());
  const moves  = [];

  for (const move of history) {
    const sideToMove = replay.turn();
    const isPr = (prColor === 'white' && sideToMove === 'w') ||
                 (prColor === 'black' && sideToMove === 'b');
    replay.move(move.san);
    const afterEval = await engine.evaluate(replay.fen());
    const winPBefore = cpToWinP(prevEval.cp);
    const winPAfter  = 100 - cpToWinP(afterEval.cp);
    const winPDrop   = Math.max(0, winPBefore - winPAfter);
    const rawCpl     = Math.max(0, prevEval.cp + afterEval.cp);
    const cpl        = Math.min(rawCpl, 1000);
    const moveNum    = Math.ceil(moves.length / 2) + 1;
    moves.push({
      san: move.san, isPr, evalBefore: prevEval.cp, evalAfter: -afterEval.cp,
      bestMove: prevEval.bestMoveSan, cpl: isPr ? cpl : null, winPDrop,
      classification: isPr ? classifyMove(rawCpl) : null,
      moveNum,
    });
    prevEval = afterEval;
  }

  const prMoves  = moves.filter(m => m.isPr);
  const oppMoves = moves.filter(m => !m.isPr);
  if (!prMoves.length) throw new Error('No Pranav moves found');

  const avgWPD    = prMoves.reduce((s,m) => s+m.winPDrop, 0) / prMoves.length;
  const oppAvgWPD = oppMoves.length
    ? oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length
    : 0;

  return {
    prAccuracy:    winPDropToAccuracy(avgWPD),
    oppAccuracy:   winPDropToAccuracy(oppAvgWPD),
    avgCPL:        Math.round(prMoves.reduce((s,m) => s+m.cpl, 0) / prMoves.length),
    blunders:      prMoves.filter(m => m.classification === 'blunder').length,
    mistakes:      prMoves.filter(m => m.classification === 'mistake').length,
    inaccuracies:  prMoves.filter(m => m.classification === 'inaccuracy').length,
    movesAnalyzed: prMoves.length,
    criticalMoments: [...prMoves].filter(m => m.cpl >= INACCURACY_CPL)
      .sort((a,b) => b.cpl - a.cpl).slice(0, 3)
      .map(m => ({
        moveNum: m.moveNum, san: m.san, bestMove: m.bestMove,
        cpl: Math.round(m.cpl), classification: m.classification,
        evalBefore: formatEval(m.evalBefore), evalAfter: formatEval(m.evalAfter),
      })),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const engine = new StockfishEngine();
  await engine.init();

  let totalGames = 0;
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/pranav', t.dir);
    if (!fs.existsSync(dir)) continue;
    totalGames += fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).length;
  }
  console.log(`Engine ready. Depth movetime-800  Threads ${SF_THREADS}  Total game files: ${totalGames}\n`);

  let gameNum = 0;
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/pranav', t.dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).sort();
    if (!results[t.name]) results[t.name] = {};

    for (const file of files) {
      gameNum++;
      const roundKey = file.replace(/\.pgn$/i, '').replace(/^round/i, 'R');
      const rawPgn   = fs.readFileSync(path.join(dir, file), 'utf8');

      if (!rawPgn.trim()) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP (empty file)`);
        results[t.name][roundKey] = { skipped: 'empty' };
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        continue;
      }

      const info = parseGameInfo(rawPgn, t.format);
      if (!info) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP (no Pranav header)`);
        results[t.name][roundKey] = { skipped: 'no-pranav' };
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        continue;
      }

      const cached = results[t.name][roundKey];
      if (cached?.skipped) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey}  SKIP (${cached.skipped})`);
        continue;
      }
      if (cached?.prAccuracy != null) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey}  cached ${cached.prAccuracy}%`);
        continue;
      }

      // Skip games with no result (incomplete broadcast captures)
      if (info.result === '*') {
        let moveCount = 0;
        try { const tmp = new Chess(); tmp.loadPgn(preprocessPgn(info.pgnText)); moveCount = tmp.history().length; }
        catch(e) {}
        if (moveCount < 10) {
          console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP incomplete (* result, ${moveCount} moves)`);
          results[t.name][roundKey] = { ...info, skipped: 'incomplete' };
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
          continue;
        }
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — analyzing despite * result (${moveCount} moves)`);
      }

      let moveCount = 0;
      try {
        const tmp = new Chess();
        tmp.loadPgn(preprocessPgn(info.pgnText));
        moveCount = tmp.history().length;
      } catch(e) {
        // Try repair (disambiguation / truncation at illegal move)
        try {
          const repaired = repairPgn(info.pgnText);
          const tmp2 = new Chess();
          tmp2.loadPgn(repaired);
          moveCount = tmp2.history().length;
          info.pgnText = repaired; // use repaired version for analysis
          console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — repaired PGN (${moveCount} moves)`);
        } catch(e2) {
          console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP parse: ${e.message}`);
          results[t.name][roundKey] = { ...info, skipped: 'parse-error' };
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
          continue;
        }
      }
      if (moveCount < 5) {
        console.log(`[${gameNum}/${totalGames}] ${t.name} ${roundKey} — SKIP ${moveCount} moves`);
        results[t.name][roundKey] = { ...info, skipped: 'too-short' };
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        continue;
      }

      process.stdout.write(
        `[${gameNum}/${totalGames}] ${t.name} ${roundKey}  vs ${info.opponent} (${info.oppElo})  Pranav ${info.prColor}  ${info.prResult.toUpperCase()}  ${moveCount}ply...`
      );
      const t0 = Date.now();
      let stats;
      try { stats = await analyzeGame(info.pgnText, info.prColor, engine); }
      catch(e) { console.error(`\n  Error: ${e.message}`); continue; }
      console.log(
        ` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.prAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`
      );

      results[t.name][roundKey] = { ...info, ...stats };
      // Don't save pgnText to JSON — too large
      delete results[t.name][roundKey].pgnText;
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    }
  }

  engine.quit();

  console.log('\n' + '─'.repeat(60));
  let allAccs = [];
  for (const t of TOURNAMENTS) {
    const entries = Object.values(results[t.name] || {});
    const accs = entries.filter(g => !g.skipped && g.prAccuracy != null).map(g => g.prAccuracy);
    if (!accs.length) continue;
    const avg    = (accs.reduce((a,b) => a+b, 0) / accs.length).toFixed(1);
    const wins   = entries.filter(g => g.prResult === 'win').length;
    const losses = entries.filter(g => g.prResult === 'loss').length;
    const draws  = entries.filter(g => g.prResult === 'draw').length;
    console.log(`${t.name.padEnd(25)}  ${entries.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
  }
  if (allAccs.length) {
    const overall = (allAccs.reduce((a,b) => a+b, 0) / allAccs.length).toFixed(1);
    console.log(`\nOverall: ${allAccs.length} games  avg ${overall}%`);
  }
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
