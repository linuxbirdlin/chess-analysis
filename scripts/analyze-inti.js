'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..');
const SF_MOVETIME = parseInt(process.env.SF_MOVETIME || '800', 10);
const RESULTS_FILE = SF_MOVETIME > 800
  ? path.join(__dirname, 'inti-analysis-results-deep.json')
  : path.join(__dirname, 'inti-analysis-results.json');

const SF_DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
const SF_THREADS = parseInt(process.env.SF_THREADS || '16', 10);
const INACCURACY_CPL = 50, MISTAKE_CPL = 150, BLUNDER_CPL = 300;

const TOURNAMENTS = [
  { dir: 'copa2025',     name: 'Copa Estado de México 2025', format: 'pgn' },
  { dir: 'Queretaro2026', name: 'Querétaro 2026',            format: 'pgn' },
  { dir: 'agua2026',     name: 'Aguascalientes 2026',        format: 'pgn' },
];

function isInti(name) { return /flores ojeda|inti/i.test(name); }

function preprocessPgn(text) {
  text = text.replace(/\[%eval[^\]]*\]/g, '').replace(/\[%clk[^\]]*\]/g, '');
  text = text.replace(/\{[^{}]*\}/g, '');
  let prev;
  do { prev = text; text = text.replace(/\([^()]*\)/g, ''); } while (text !== prev);
  return text;
}

function parseStandardPgn(text) {
  const wm   = text.match(/\[White\s+"([^"]+)"\]/);
  const bm   = text.match(/\[Black\s+"([^"]+)"\]/);
  const welo = text.match(/\[WhiteElo\s+"([^"]+)"\]/);
  const belo = text.match(/\[BlackElo\s+"([^"]+)"\]/);
  const res  = text.match(/\[Result\s+"([^"]+)"\]/);
  const eco  = text.match(/\[ECO\s+"([^"]+)"\]/);
  const opening = text.match(/\[Opening\s+"([^"]+)"\]/);
  const roundM  = text.match(/\[Round\s+"([^"]+)"\]/);

  const wName = wm ? wm[1] : '';
  const bName = bm ? bm[1] : '';
  const pIsW = isInti(wName);
  const pIsB = isInti(bName);
  if (!pIsW && !pIsB) return null;

  const prColor  = pIsW ? 'white' : 'black';
  const opponent = pIsW ? bName : wName;
  const oppElo   = pIsW ? (belo ? parseInt(belo[1]) || 0 : 0)
                        : (welo ? parseInt(welo[1]) || 0 : 0);
  const result   = res ? res[1] : '*';
  const prResult = deriveResult(result, prColor);

  // Generate a unique key from round + player names (handles deduplication)
  const roundTag = roundM ? roundM[1] : '';
  const uniqueKey = `${roundTag}|${wName}|${bName}`;

  return { prColor, opponent, oppElo, result, prResult,
    eco: eco ? eco[1] : '?', opening: opening ? opening[1] : '',
    uniqueKey,
    pgnText: text };
}

function deriveResult(result, prColor) {
  if (result === '1/2-1/2') return 'draw';
  if (result === '1-0') return prColor === 'white' ? 'win' : 'loss';
  if (result === '0-1') return prColor === 'black' ? 'win' : 'loss';
  return '?';
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
    this.send(`go movetime ${SF_MOVETIME}`);
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

// ─── Accuracy helpers ────────────────────────────────────────────────────────

function cpToWinP(cp) { return 100 / (1 + Math.exp(-0.00368208 * Math.max(-10000, Math.min(10000, cp)))); }
function winPDropToAccuracy(avg) { return Math.round(Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * avg) - 3.1669)) * 10) / 10; }
function classifyMove(cpl) { if (cpl >= BLUNDER_CPL) return 'blunder'; if (cpl >= MISTAKE_CPL) return 'mistake'; if (cpl >= INACCURACY_CPL) return 'inaccuracy'; return 'good'; }
function formatEval(cp) { if (cp >= 29000) return '#'; if (cp <= -29000) return '-#'; return (cp >= 0 ? '+' : '') + (cp/100).toFixed(2); }

// ─── PGN repair ──────────────────────────────────────────────────────────────

function repairPgn(pgnText) {
  const clean = preprocessPgn(pgnText);
  const body = clean.replace(/\[[^\]]*\]/g, '').trim();
  const tokens = body.split(/\s+/).filter(t =>
    t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)
  );
  const chess = new Chess();
  const played = [];
  for (const tok of tokens) {
    const legal = chess.moves();
    if (legal.includes(tok)) { chess.move(tok); played.push(tok); continue; }
    const piece = tok[0];
    const variants = legal.filter(m => {
      if (!m.startsWith(piece)) return false;
      const dest = tok.replace(/[+#=QRBN].*$/, '').slice(-2);
      return m.endsWith(dest) || m.replace(/[+#=QRBN].*$/, '').endsWith(dest);
    });
    if (variants.length === 1) { chess.move(variants[0]); played.push(variants[0]); continue; }
    if (variants.length > 1) {
      let found = false;
      for (const v of variants) {
        const test = new Chess(chess.fen());
        test.move(v);
        const nextTok = tokens[tokens.indexOf(tok) + 1];
        if (!nextTok || test.moves().includes(nextTok)) {
          chess.move(v); played.push(v); found = true; break;
        }
      }
      if (found) continue;
      chess.move(variants[0]); played.push(variants[0]); continue;
    }
    break;
  }
  const headers = pgnText.match(/(\[[^\]]*\])/g) || [];
  const moveStr = played.map((m, i) => i % 2 === 0 ? `${Math.floor(i/2)+1}. ${m}` : m).join(' ');
  return headers.join('\n') + '\n\n' + moveStr;
}

// ─── Per-game analysis ───────────────────────────────────────────────────────

async function analyzeGame(pgnText, prColor, engine) {
  const chess = new Chess();
  let processedPgn = preprocessPgn(pgnText);
  try {
    chess.loadPgn(processedPgn);
  } catch(e) {
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
  if (!prMoves.length) throw new Error('No Inti moves found');
  const avgWPD    = prMoves.reduce((s,m) => s+m.winPDrop, 0) / prMoves.length;
  const oppAvgWPD = oppMoves.length ? oppMoves.reduce((s,m) => s+m.winPDrop, 0) / oppMoves.length : 0;
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

// ─── Split multi-game PGN files ──────────────────────────────────────────────

function splitPgn(text) {
  // Split on blank line before [ to separate games
  const games = [];
  const blocks = text.split(/\n(?=\[Event\s)/);
  for (const b of blocks) {
    const trimmed = b.trim();
    if (trimmed) games.push(trimmed);
  }
  return games;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

  const engine = new StockfishEngine();
  await engine.init();

  // Count total games across all tournament files
  let totalGames = 0;
  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/inti', t.dir);
    if (!fs.existsSync(dir)) {
      // Check if it's a single file instead of directory
      const fileAsDir = path.join(ROOT, 'opponents/inti', t.dir + '.pgn');
      if (fs.existsSync(fileAsDir)) { totalGames += 1; continue; }
      continue;
    }
    totalGames += fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).length;
  }

  // Also handle single-file tournaments (copa2025.pgn, Queretaro2026.pgn, agua2026.pgn)
  // Detect: if t.dir is not a directory, try t.dir + '.pgn' as a file path
  console.log(`Engine ready. Movetime ${SF_MOVETIME}ms  Threads ${SF_THREADS}\n`);

  let gameNum = 0;
  const seenKeys = new Set(); // for deduplication

  for (const t of TOURNAMENTS) {
    const dir = path.join(ROOT, 'opponents/inti', t.dir);
    const singleFile = path.join(ROOT, 'opponents/inti', t.dir + '.pgn');
    if (!results[t.name]) results[t.name] = {};

    let pgnFiles = [];
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      pgnFiles = fs.readdirSync(dir).filter(f => f.endsWith('.pgn')).sort()
        .map(f => ({ key: f.replace(/\.pgn$/i,'').replace(/^round/i,'R'), fullPath: path.join(dir, f), multi: false }));
    } else if (fs.existsSync(singleFile)) {
      pgnFiles = [{ key: singleFile, fullPath: singleFile, multi: true }];
    } else {
      console.log(`[skip] ${t.name} — no files found`);
      continue;
    }

    for (const pf of pgnFiles) {
      const rawContent = fs.readFileSync(pf.fullPath, 'utf8');
      // Split multi-game PGN files
      const gameTexts = pf.multi ? splitPgn(rawContent) : [rawContent];

      for (const rawPgn of gameTexts) {
        if (!rawPgn.trim()) continue;
        const info = parseStandardPgn(rawPgn);
        if (!info) continue;

        // Deduplicate by uniqueKey (handles copa2025 round-1 duplicate)
        if (seenKeys.has(info.uniqueKey)) {
          console.log(`[dup skip] ${t.name} — duplicate game: ${info.uniqueKey}`);
          continue;
        }
        seenKeys.add(info.uniqueKey);

        gameNum++;
        const roundKey = pf.multi
          ? `R${info.uniqueKey.split('|')[0].split('.')[0]}`
          : pf.key;
        const cacheKey = `${t.name}:${roundKey}:${info.opponent}`;

        const cached = results[t.name][cacheKey];
        if (cached?.skipped) {
          console.log(`[${gameNum}] ${t.name} ${roundKey}  SKIP (${cached.skipped})`);
          continue;
        }
        if (cached?.prAccuracy != null) {
          console.log(`[${gameNum}] ${t.name} ${roundKey}  cached ${cached.prAccuracy}%`);
          continue;
        }

        if (info.result === '*') {
          let moveCount = 0;
          try { const tmp = new Chess(); tmp.loadPgn(preprocessPgn(info.pgnText)); moveCount = tmp.history().length; } catch(e) {}
          if (moveCount < 10) {
            console.log(`[${gameNum}] ${t.name} ${roundKey} — SKIP incomplete (* result, ${moveCount} moves)`);
            results[t.name][cacheKey] = { ...info, skipped: 'incomplete' };
            delete results[t.name][cacheKey].pgnText;
            fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
            continue;
          }
        }

        let moveCount = 0;
        try {
          const tmp = new Chess();
          tmp.loadPgn(preprocessPgn(info.pgnText));
          moveCount = tmp.history().length;
        } catch(e) {
          try {
            const repaired = repairPgn(info.pgnText);
            const tmp2 = new Chess();
            tmp2.loadPgn(repaired);
            moveCount = tmp2.history().length;
            info.pgnText = repaired;
            console.log(`[${gameNum}] ${t.name} ${roundKey} — repaired PGN (${moveCount} moves)`);
          } catch(e2) {
            console.log(`[${gameNum}] ${t.name} ${roundKey} — SKIP parse: ${e.message}`);
            results[t.name][cacheKey] = { ...info, skipped: 'parse-error' };
            delete results[t.name][cacheKey].pgnText;
            fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
            continue;
          }
        }
        if (moveCount < 5) {
          console.log(`[${gameNum}] ${t.name} ${roundKey} — SKIP ${moveCount} moves`);
          results[t.name][cacheKey] = { ...info, skipped: 'too-short' };
          delete results[t.name][cacheKey].pgnText;
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
          continue;
        }

        process.stdout.write(
          `[${gameNum}] ${t.name} ${roundKey}  vs ${info.opponent} (${info.oppElo})  Inti ${info.prColor}  ${info.prResult.toUpperCase()}  ${moveCount}ply...`
        );
        const t0 = Date.now();
        let stats;
        try { stats = await analyzeGame(info.pgnText, info.prColor, engine); }
        catch(e) { console.error(`\n  Error: ${e.message}`); continue; }
        console.log(
          ` ${((Date.now()-t0)/1000).toFixed(1)}s  acc:${stats.prAccuracy}%  opp:${stats.oppAccuracy}%  CPL:${stats.avgCPL}  B:${stats.blunders} M:${stats.mistakes} I:${stats.inaccuracies}`
        );
        results[t.name][cacheKey] = { ...info, ...stats };
        delete results[t.name][cacheKey].pgnText;
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      }
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
    console.log(`${t.name.padEnd(30)}  ${entries.length} games  ${wins}W-${losses}L-${draws}D  avg ${avg}%`);
    allAccs.push(...accs);
  }
  if (allAccs.length) {
    const overall = (allAccs.reduce((a,b) => a+b, 0) / allAccs.length).toFixed(1);
    console.log(`\nOverall: ${allAccs.length} games  avg ${overall}%`);
  }
  console.log(`Saved → ${path.relative(ROOT, RESULTS_FILE)}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
