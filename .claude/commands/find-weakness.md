# find-weakness

## Purpose

Systematically analyze a player's Stockfish JSON to find their true verified weaknesses across all games — not summaries from deep review HTML, not narrative guesses from PGN annotations, but aggregated critical moments directly from the engine JSON. Produces a ranked weakness report with specific game evidence, Lichess verification where possible, and a drill plan.

This skill was developed after discovering that previous drill pages contained misattributed game examples (losses blamed on endgame moves that were actually decided in the middlegame). The only reliable source is the raw Stockfish JSON.

---

## Invocation

```
/find-weakness [player: austin|opponent-name] [json-path: optional]
```

Examples:
- `/find-weakness austin` — analyzes Austin's games from all available JSON files
- `/find-weakness austin scripts/study-pt5-results.json` — specific file
- `/find-weakness justin scripts/justin-analysis-results.json`

---

## Step 1 — Locate JSON Files

For the named player, find all Stockfish analysis JSON files:

```bash
ls scripts/*results*.json scripts/*analysis*.json 2>/dev/null
```

The primary files for Austin are:
- `scripts/study-pt5-results.json` — personal study games (Sep–Oct 2026)
- `scripts/analysis-results.json` — NAYCC 2025 + PAM 2026 (nested under tournament/round keys)

For opponent files: `scripts/{name}-analysis-results.json`

**STOP if no JSON found.** Do not infer weaknesses from HTML review pages — they may contain fabricated or misattributed analysis. Ask the user to run the Stockfish analysis script first.

---

## Step 2 — Aggregate ALL Critical Moments

Parse every critical moment entry from every game. The JSON structure varies:

**Structure A** (`study-pt5-results.json`): flat object keyed by game label
```json
{
  "Vs Zachary Liu": {
    "label": "...", "accuracy": 91.8, "blunders": 1,
    "criticalMoments": [
      {"san": "Qh5", "bestMove": "Bxh7+", "cpl": 382,
       "classification": "blunder", "evalBefore": "+3.79", "evalAfter": "-0.03"}
    ]
  }
}
```

**Structure B** (`analysis-results.json`): nested by tournament → round
```json
{
  "PAM 2026": {
    "R5": {
      "opponent": "Vinales Gonzalez", "austinAccuracy": 90.1,
      "criticalMoments": [...]
    }
  }
}
```

**Critical parsing notes:**
- `evalBefore` and `evalAfter` are **strings** (e.g. `"+3.79"`, `"#"`, `"-0.03"`). Use `parseFloat()` — it returns `NaN` for `"#"` (forced mate). Handle NaN separately.
- `cpl` is a number. Use `Math.abs(m.cpl)` for magnitude.
- A `cpl` value of `1000` means the engine capped it (either forced mate or position beyond rescue).

Run this Node.js aggregation:

```javascript
const fs = require('fs');

function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function extractMoments(data, source) {
  const moments = [];
  function walk(obj, gameLabel) {
    if (obj && obj.criticalMoments) {
      for (const m of obj.criticalMoments) {
        moments.push({
          game: gameLabel,
          source,
          san: m.san,
          bestMove: m.bestMove,
          cpl: Math.abs(m.cpl || 0),
          classification: m.classification,
          evalBefore: parseFloat(m.evalBefore),
          evalAfter: parseFloat(m.evalAfter),
          evalBeforeRaw: m.evalBefore,
        });
      }
    } else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && !Array.isArray(v)) walk(v, k);
      }
    }
  }
  walk(data, source);
  return moments;
}
```

Collect all moments, then compute totals:
- Total games (count top-level keys with criticalMoments OR accuracy data)
- Total blunders (`classification === 'blunder'`)
- Total mistakes (`classification === 'mistake'`)
- Won-position blunders: `classification === 'blunder' && evalBefore >= 4.0`

---

## Step 3 — Categorize by Pattern

Apply these filters in order to every critical moment:

### Pattern A — Missed Bxh7+/Bxh2+ (Greek Gift)
```
bestMove includes 'h7' OR 'h2'
```
Collect: game, played move, eval swing. This is a specific named pattern — even 2-3 instances across 30 games is significant.

### Pattern B — Missed forcing check
```
bestMove ends with '+' AND played move does NOT end with '+'
AND cpl >= 150
```
Collect: game, played move (passive), correct check, eval swing.

### Pattern C — Won position collapse
```
classification === 'blunder'
AND evalBefore >= 4.0 (parseFloat — skip NaN)
```
For these: note what the played move WAS (starting piece letter) vs what was best. Sub-categorize:
- Played a piece move to a passive/defensive square when a forcing move existed
- Played a pawn push when a piece activation was better
- Played the wrong piece (e.g. Nf3 when Nf5 — same piece, wrong square)

### Pattern D — Passive piece placement (non-won positions)
```
classification === 'mistake' OR 'blunder'
AND evalBefore between -2.0 and +2.0
AND played move is a rook/queen move
AND cpl >= 150
```

### Pattern E — King navigation errors
```
san starts with 'K' (king move) AND cpl >= 300
```
Note: in K+P endings, sometimes the best move is a PAWN push (not a king move) — compare whether bestMove also starts with 'K' or is a pawn push.

### Pattern F — Premature pawn pushes
```
san matches /^[a-h]/ (pawn move, no capture)
AND evalBefore between -1.0 and +2.0
AND cpl >= 150
```

---

## Step 4 — Rank and Report

Rank patterns by: (instance count × average CPL) / total games analyzed.

For the top 3 patterns, report:
1. Pattern name
2. Instance count and game count
3. All specific instances: `[game] played=X best=Y eval=A→B cpl=N`
4. The common thread (e.g. "In all cases Austin played a piece move when a queen check was decisive")

**Key rule — phase attribution:** Before calling a mistake an "endgame error," verify when in the game it occurred. Check the move number from the game context. If Austin was already losing by -3 or more before the flagged move, the game was decided earlier — do NOT attribute the loss to that move.

---

## Step 5 — Verify with Lichess Tools

For the top 2-3 critical positions, compute FENs using chess.js and verify:

### FEN computation
```javascript
const { Chess } = require('./node_modules/chess.js');

function stripAnnotations(pgn) {
  let s = pgn.replace(/\{[^}]*\}/g, '');
  let result = ''; let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') { if (depth > 0) depth--; }
    else if (depth === 0) result += ch;
  }
  return result.replace(/\$\d+/g, '').replace(/\[[^\]]*\]/g, '').trim();
}
```

Replay moves one by one; stop ONE move BEFORE the blunder to get the position FEN.

### Lichess Cloud Eval (middlegame / complex positions)
```
GET https://lichess.org/api/cloud-eval?fen=<URL-encoded FEN>&multiPv=3
```
- Returns cached Stockfish evaluations if the position appeared in Lichess games
- **Will NOT work** for private Lichess studies or personal game positions
- If it returns a result: compare the top move against the JSON's `bestMove`. If they match — confirmed.

### Lichess Tablebase (K+P endings, ≤7 pieces)
```
GET https://tablebase.lichess.ovh/standard?fen=<URL-encoded FEN>
```
- Count pieces in FEN: `fen.split(' ')[0].replace(/[0-9\/]/g, '').length`
- Only query if piece count ≤ 7
- `category` field: "win" / "draw" / "loss" for the side to move
- `moves[0].category` shows what happens after the best move
- Sleep 700ms between requests to avoid rate limits

**Label each finding:**
- `[Stockfish JSON]` — from the analysis files only
- `[Lichess cloud eval confirmed]` — cloud eval matched the engine
- `[Lichess Tablebase confirmed]` — tablebase verified win/loss

---

## Step 6 — Build Drill Recommendations

For each verified top pattern, recommend:

**Greek Gift (Bxh7+):**
- `https://lichess.org/practice/advanced-tactics/greekgift/` — complete the full set
- Load Austin's own game FENs in Lichess Editor and play Bxh7+ against Stockfish
- Puzzle theme: `https://lichess.org/training/kingsideAttack`

**Missed forcing checks:**
- `https://lichess.org/practice/advanced-tactics/deflection/`
- `https://lichess.org/practice/advanced-tactics/attraction/`
- Puzzle theme: `https://lichess.org/training/crushing`
- CCT rule: before every move ask Checks → Captures → Threats

**Won position collapse:**
- Puzzle theme: `https://lichess.org/training/advantage`
- Puzzle theme: `https://lichess.org/training/quietMove` (best move is often non-obvious)
- The key habit: in won positions (+3 or more), scan for forcing moves first — not "improve a piece"

**Passive rooks:**
- `https://lichess.org/practice/rook-endgames/intermediate/`
- `https://lichess.org/practice/rook-endgames/practical/`
- Rule: rook belongs behind a passed pawn or on the 7th rank — never on a reactive square

**K+P king navigation:**
- `https://lichess.org/practice/pawn-endgames/opposition/`
- `https://lichess.org/practice/pawn-endgames/keysquares/`
- Rule: in a pawn race, push the passer — the king often blocks its own pawn

**Note on Lichess puzzle API:** `lichess.org/api/puzzle/next?themes=X` does NOT filter reliably. Use `lichess.org/training/<theme>` and `lichess.org/practice` directly.

---

## Step 7 — Output the Report

Write a summary with:

```
WEAKNESS ANALYSIS — [player name]
Source: [N] games from [file list]
Engine: Stockfish movetime-800 (JSON), Lichess cloud eval, Lichess Tablebase

PATTERN 1 — [name] ([N] instances in [N] games)
[All instances with game, move, eval swing]
Root cause: [one sentence]
Drill: [specific Lichess URL]

PATTERN 2 — ...

PATTERN 3 — ...

STATS: [total games] games · [blunders] blunders · [won-pos blunders] won-position blunders (eval ≥ +4)
```

Then ask the user: "Want me to write a drill HTML page from these findings?"

If yes — follow the same structure as `austin/endgame-drills-2026.html`: one section per verified pattern, FEN positions with Lichess editor links, verification badges, and a 3-day drill schedule table.

---

## Quality Rules

1. **Never attribute a game loss to a move made when the position was already -3 or worse.** The decisive mistake is the one that crossed from roughly equal into losing — find that move.
2. **Never use eval numbers from HTML review pages** — they may differ from the JSON due to different Stockfish settings. Always use the JSON as the source of truth.
3. **evalBefore is a string** — always use `parseFloat()` and handle `"#"` (NaN) separately.
4. **The drill page must cite the data source** for every claim: `[Stockfish JSON]`, `[Lichess cloud eval]`, or `[Lichess Tablebase]`.
5. **Don't label a pattern until you have ≥ 3 instances.** A single game is an anecdote. Three games in different contexts is a pattern.
