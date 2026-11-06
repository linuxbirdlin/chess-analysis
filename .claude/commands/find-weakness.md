# find-weakness

## Purpose

Systematically analyze a player's Stockfish JSON to find their true verified weaknesses across all games — not summaries from deep review HTML, not narrative guesses from PGN annotations, but aggregated critical moments directly from the engine JSON. Produces a ranked weakness report with specific game evidence, Lichess verification where possible, and a drill or exploitation plan.

This skill was developed after discovering that previous drill pages contained misattributed game examples (losses blamed on endgame moves that were actually decided in the middlegame). The only reliable source is the raw Stockfish JSON.

---

## Invocation

```
/find-weakness [player: austin|opponent-name] [json-path: optional]
```

Examples:
- `/find-weakness austin` — analyzes Austin's games from all available JSON files
- `/find-weakness austin scripts/study-pt5-results.json` — specific file
- `/find-weakness reyansh` — analyzes an opponent; output will be exploitation-oriented

**Player type matters.** If the player is `austin`, produce fix drills. If the player is any opponent name, produce exploitation notes formatted for Austin — how to trigger and profit from the weakness, not how to fix it.

---

## Step 1 — Locate JSON Files

For the named player, find all Stockfish analysis JSON files:

```bash
ls scripts/*results*.json scripts/*analysis*.json 2>/dev/null
```

The primary files for Austin are:
- `scripts/study-pt5-results.json` — personal study games
- `scripts/analysis-results.json` — NAYCC 2025 + PAM 2026

For opponent files: `scripts/{name}-analysis-results.json` or `scripts/{name}-analysis-results-deep.json` (prefer deep if both exist).

**STOP if no JSON found.** Do not infer weaknesses from HTML review pages — they may contain fabricated or misattributed analysis. Ask the user to run the Stockfish analysis script first.

---

## Step 2 — Aggregate ALL Critical Moments

Parse every critical moment entry from every game. The JSON structure varies:

**Structure A** (`study-pt5-results.json`): flat object keyed by game label
```json
{
  "Vs Zachary Liu": {
    "label": "...", "prColor": "white", "prResult": "win",
    "oppElo": 2185, "eco": "B46",
    "criticalMoments": [
      {"moveNum": 18, "san": "Qh5", "bestMove": "Bxh7+", "cpl": 382,
       "classification": "blunder", "evalBefore": "+3.79", "evalAfter": "-0.03"}
    ]
  }
}
```

**Structure B** (`*-analysis-results.json`): nested by tournament → round
```json
{
  "PAM 2026": {
    "R5_VinalesG": {
      "opponent": "Vinales Gonzalez", "prColor": "white",
      "prResult": "loss", "oppElo": 1731,
      "criticalMoments": [...]
    }
  }
}
```

**Critical parsing notes:**
- `evalBefore` and `evalAfter` are **strings** (e.g. `"+3.79"`, `"#"`, `"-0.03"`). Use `parseFloat()` — it returns `NaN` for `"#"` (forced mate). Handle NaN explicitly; never let NaN propagate into comparisons.
- `cpl` is a number. Use `Math.abs(m.cpl || 0)` for magnitude.
- A `cpl` of `1000` means the engine capped it (forced mate sequence or beyond rescue).
- `prColor` values are `"white"` or `"black"` (not `"w"`/`"b"`).
- `prResult` values are `"win"`, `"draw"`, `"loss"`, or `"?"`.
- `moveNum` is present in every `criticalMoments` entry — always extract it.

Run this Node.js aggregation:

```javascript
const fs = require('fs');

function extractAllMoments(data, sourceFile) {
  const moments = [];

  function walk(obj, pathParts) {
    if (obj && obj.criticalMoments) {
      // Build full label: tournament/round path + opponent name
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
          // Game-level context
          prColor: obj.prColor,
          prResult: obj.prResult,
          oppElo: obj.oppElo,
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
```

Collect all moments across all JSON files, then compute totals:
- Total games: count objects that have `criticalMoments` OR an accuracy field
- Total blunders: `classification === 'blunder'`
- Total mistakes: `classification === 'mistake'`
- Won-position blunders: `classification === 'blunder' && evalBefore >= 4.0 && !isNaN(evalBefore)`
- Decisive blunders: `evalBefore > 0.5 && evalAfter < -0.5 && !isNaN(evalBefore) && !isNaN(evalAfter)` (position flipped from winning to losing)

---

## Step 3 — Categorize by Pattern

Apply these filters to every extracted moment. Each moment can match multiple patterns.

### Pattern A — Missed Bxh7+/Bxh2+ (Greek Gift)
```
bestMove includes 'h7' OR 'h2'
```
Even 2–3 instances across 30 games is significant — this is a named tactical motif.

### Pattern B — Missed forcing check
```
bestMove ends with '+' AND san does NOT end with '+'
AND cpl >= 150
```
Collect: game, moveNum, played move (passive), correct check, eval swing.

### Pattern C — Decisive blunder (position flipped)
```
evalBefore > 0.5 AND evalAfter < -0.5
AND !isNaN(evalBefore) AND !isNaN(evalAfter)
```
These are the game-turning moments — positive position turned losing in one move. Weight 3× in ranking. Sub-categorize by what the player played (piece retreat, pawn push, exchange) vs what was best.

### Pattern D — Won-position collapse (non-decisive)
```
classification === 'blunder'
AND evalBefore >= 4.0 AND !isNaN(evalBefore)
AND evalAfter >= -0.5 (position still roughly equal or winning after — i.e., squandered advantage without crossing zero)
```
These are "wasted wins" — positions that should have been converted, but weren't. Common in endgames and K+P transitions.

### Pattern E — King navigation errors
```
san starts with 'K' (king move) AND cpl >= 300
```
Also check: was the bestMove a pawn push instead of a king move? That reveals the player moved the king when advancing a passer was correct.

### Pattern F — Preparation boundary (post-opening errors)
```
moveNum >= 12 AND moveNum <= 28
AND (classification === 'blunder' OR classification === 'mistake')
AND evalBefore between -1.5 and +1.5 (position was roughly equal — not a losing position spiraling)
```
This pattern finds errors that happen right after preparation ends, when the player must think independently. Cluster these by game to find if accuracy consistently drops after a specific move number. For opponent analysis this is especially actionable: "steer to unfamiliar positions past move 20."

### Pattern G — Passive piece placement (R/Q errors in equal positions)
```
(san starts with 'R' OR san starts with 'Q')
AND evalBefore between -1.5 and +2.0
AND classification === 'mistake' OR 'blunder'
AND cpl >= 150
```
Note: this filter identifies high-CPL rook/queen moves in equal positions. It does NOT prove the destination square was passive — label findings as "R/Q error in equal position," not "passive placement," since passivity can't be verified from SAN alone.

### Pattern H — Kingside pawn structure errors
```
san matches /^[fgh]/ (f-, g-, or h-pawn push, not a capture)
AND evalBefore between -1.0 and +2.0
AND cpl >= 150
AND moveNum <= 40
```
Narrowed from the prior version to only kingside pawns (f/g/h) — these directly affect king safety. Central pawn errors are captured by other patterns.

---

## Step 4 — Rank, Correlate, and Report

### Ranking formula

Score each pattern: `(instance_count × avg_cpl × decisive_weight) / total_games`

Where `decisive_weight` = 1.0 for normal blunders, 3.0 for Pattern C (decisive/game-flipping).

### Game-outcome correlation (required)

For the top 3 patterns, report how many instances appeared in each game outcome:

```javascript
const correlation = { win: 0, draw: 0, loss: 0, unknown: 0 };
for (const m of patternInstances) {
  correlation[m.prResult === '?' ? 'unknown' : m.prResult]++;
}
```

A pattern that only appears in wins is cosmetic. A pattern that appears in 80% of losses is critical.

### Color split (required)

For each pattern, split by `prColor`:
```javascript
const white = patternInstances.filter(m => m.prColor === 'white');
const black = patternInstances.filter(m => m.prColor === 'black');
```

Report: `[8 White, 12 Black]` — the asymmetry shows which color the weakness lives in.

### Move-phase distribution (required)

For the top patterns, count by phase:
- Opening: moveNum ≤ 15
- Transition: moveNum 16–28 (post-prep zone)
- Middlegame: moveNum 29–40
- Endgame: moveNum > 40

### Phase attribution rule

**Before labeling any error as an "endgame mistake," verify:**
- Was `evalBefore` already ≤ -3.0? If yes, the position was already lost — do NOT attribute the game result to this move.
- The decisive error is the one that first crossed into losing territory (Pattern C, above).

For the top 3 patterns, report:
1. Pattern name
2. Instance count, game count, color split `[W/B]`, phase distribution
3. Game-outcome correlation `[win/draw/loss]`
4. All specific instances: `[game] mv#N played=X best=Y eval=A→B cpl=N [outcome]`
5. The common thread (one sentence)

---

## Step 5 — Verify with Lichess Tools

For the top 2–3 critical positions, attempt FEN computation and independent verification.

### FEN computation via chess.js

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

Replay moves one by one; stop at `moveNum - 1` to get the position FEN just before the blunder. If chess.js throws `"Invalid move"` (common for disambiguated moves like `Rfe6`, `N6d5`):

**Fallback — Lichess explorer for FEN:**
Convert the move sequence to UCI and query the masters explorer — it returns the authoritative FEN:
```
GET https://explorer.lichess.ovh/masters?play=e2e4,c7c5,...
```
The response includes a `fen` field. This does not require the position to be in the masters database; it just traces the move sequence on a legal board.

If UCI conversion is also impractical: note the game label, moveNum, and SAN sequence in the report so the user can navigate there manually in Lichess.

### Lichess Cloud Eval (middlegame positions)
```
GET https://lichess.org/api/cloud-eval?fen=<URL-encoded FEN>&multiPv=3
```
**Important:** This only works for positions that appeared in Lichess games. Scholastic and amateur game positions almost never cache here — expect 404 in the majority of cases. When it does return a result, compare `pvs[0].moves.split(' ')[0]` (first UCI move) against the JSON's `bestMove`. If they match — confirmed.

### Lichess Tablebase (K+P endings, ≤7 pieces)
```
GET https://tablebase.lichess.ovh/standard?fen=<URL-encoded FEN>
```
- Count pieces: `fen.split(' ')[0].replace(/[0-9\/]/g, '').length`
- Only query if piece count ≤ 7
- **Also check the halfmove clock** (5th FEN field): if it is ≥ 90, the 50-move draw rule may already override the tablebase result. Only trust "win" verdicts when halfmove clock = 0.
- `category` field: `"win"` / `"draw"` / `"loss"` for the side to move
- Sleep 700ms between requests to avoid rate limits

**Label each finding:**
- `[Stockfish JSON]` — from the analysis files only
- `[Lichess cloud eval confirmed]` — cloud eval top move matched engine
- `[Lichess Tablebase confirmed]` — tablebase verified win/loss
- `[Stockfish JSON — unverified]` — cloud eval returned 404, no independent check possible

---

## Step 6 — Build Output (Drill or Exploitation Plan)

### If player is Austin (self-analysis) → Drill Recommendations

**Greek Gift (Bxh7+):**
- Practice: `https://lichess.org/practice/advanced-tactics/greekgift/`
- Puzzle theme: `https://lichess.org/training/kingsideAttack`
- Load Austin's own game FENs in Lichess Editor and play Bxh7+ against Stockfish

**Missed forcing checks:**
- Practice: `https://lichess.org/practice/advanced-tactics/deflection/`
- Practice: `https://lichess.org/practice/advanced-tactics/attraction/`
- Puzzle theme: `https://lichess.org/training/crushing`
- Habit: before every move, scan Checks → Captures → Threats (CCT)

**Decisive blunders / won-position collapse:**
- Puzzle theme: `https://lichess.org/training/advantage`
- Puzzle theme: `https://lichess.org/training/quietMove`
- Habit: in positions ≥ +3, always scan forcing moves before improving pieces

**K+P king navigation:**
- Practice: `https://lichess.org/practice/pawn-endgames/opposition/`
- Practice: `https://lichess.org/practice/pawn-endgames/keysquares/`
- Rule: in a pawn race, push the passer — the king often obstructs its own pawn

**Passive rooks:**
- Practice: `https://lichess.org/practice/rook-endgames/intermediate/`
- Rule: rook belongs behind a passed pawn or on the 7th rank

### If player is an opponent → Exploitation Plan

For each weakness found, reframe as a preparation instruction for Austin:

- **King navigation errors:** "Steer to pawn endgames or K+P endings where accurate king routes matter. Reyansh's 17 king errors across 83 games (8 in draws, 8 in losses) show this is game-impacting."
- **Preparation boundary (moves 14–28):** "Play into mainlines deep enough to exhaust his prep, then deviate at move 14–18 with a sideline he hasn't seen. His accuracy drops sharply in the transition zone."
- **Decisive blunders as Black:** "He flipped 5 winning Black positions to losing. Play sharp as White to keep complications alive past move 20 — he's likelier to collapse than to convert."
- **Rossolimo record 0–2:** "His 0W–2L in the Rossolimo is the strongest concrete exploit — keep the opening prep current for this specific line."

---

## Step 7 — Output the Report

```
WEAKNESS ANALYSIS — [player name]
Mode: [self-improvement | opponent-exploitation]
Source: [N] games from [file list]
Engine: Stockfish movetime-[N] (JSON), Lichess cloud eval, Lichess Tablebase

PATTERN 1 — [name] ([N] instances in [N] games) [decisive: N]
  Color split: [W: N | B: N]
  Outcome: [wins: N | draws: N | losses: N]
  Phase: [opening: N | transition: N | middlegame: N | endgame: N]
  Instances:
    [game] mv#N played=X best=Y eval=A→B cpl=N [outcome] [source]
  Root cause: [one sentence]
  [Drill URL | Exploitation note]

PATTERN 2 — ...

PATTERN 3 — ...

STATS: [total games] games · [blunders] blunders ([decisive] decisive) · [won-pos blunders] won-position blunders (eval ≥ +4)
```

Then ask the user: "Want me to write a drill HTML page from these findings?"

If yes — follow the same structure as `austin/endgame-drills-2026.html`: one section per verified pattern, FEN positions with Lichess editor links, verification badges, color/outcome correlation table, and a 3-day drill schedule table.

---

## Quality Rules

1. **Never attribute a game result to a move made when the position was already ≤ -3.0.** The decisive mistake is the one that first crossed into losing territory.
2. **Never use eval numbers from HTML review pages.** Always use the JSON as the source of truth.
3. **evalBefore and evalAfter are strings** — always use `parseFloat()`. Never compare them directly. Always guard `!isNaN()` before any numeric comparison.
4. **The drill/exploitation page must cite the data source** for every claim: `[Stockfish JSON]`, `[Lichess cloud eval confirmed]`, `[Lichess Tablebase confirmed]`, or `[Stockfish JSON — unverified]`.
5. **Don't label a pattern until you have ≥ 3 instances** in different games. A single game is an anecdote.
6. **Game-outcome correlation is mandatory for the top 3 patterns.** A weakness that only appears in wins is not a weakness.
7. **Attach game-level metadata to every moment** (`prColor`, `prResult`, `oppElo`) during extraction — not after. Retrofitting it is error-prone.
8. **Pattern G (preparation boundary)** requires the equal-position guard (`evalBefore between -1.5 and +1.5`). Without it, errors from already-losing positions pollute the pattern.
