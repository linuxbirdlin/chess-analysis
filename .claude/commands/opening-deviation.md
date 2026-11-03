# opening-deviation

## Purpose

Build an Opening Deviation Map for a named opponent — a visual HTML page showing where the opponent deviates from master-level theory in their top 3 White and top 3 Black systems. Uses the Lichess Masters explorer API (FIDE 2300+) to classify each player-turn move by frequency rank: top book move, 2nd–3rd choice, minor sideline, rare, or novelty.

This skill was developed for Zachary Liu and Fernando Cortes Medina. The canonical scripts are `scripts/zachary-opening-deviation.js` (template) and `scripts/fernando-opening-deviation.js` (diff).

---

## Invocation

```
/opening-deviation [opponent-name]
```

Examples:
- `/opening-deviation pranav` — build deviation map for Pranav Santhosh
- `/opening-deviation justin` — build deviation map for Justin Huang

---

## Step 1 — Verify Prerequisites

Check that the pgnlib file exists for the opponent:

```bash
ls pgnlib/
```

The pgnlib file must follow the naming convention: `pgnlib/{Last, First}.pgn` — e.g. `pgnlib/Santhosh, Pranav.pgn`. If it doesn't exist, run `node scripts/build-pgnlib.js` first or create it manually by merging the opponent's PGN files from `opponents/{name}/`.

Also check that `node_modules/chess.js` is available:
```bash
ls node_modules/chess.js/src/chess.js 2>/dev/null && echo "OK" || echo "MISSING"
```

---

## Step 2 — Adapt the Script

Copy `scripts/zachary-opening-deviation.js` to `scripts/{name}-opening-deviation.js`.

**Only 4 things need to change** (the script is otherwise identical):

| Line | zachary (original) | {name} (new) |
|------|-------------------|--------------|
| 49 | `/liu.*zachary\|zachary.*liu/i` | regex matching opponent's name |
| 51 | same regex | same regex |
| 144 | `'../pgnlib/Liu, Zachary Hankun.pgn'` | `'../pgnlib/{Last, First}.pgn'` |
| 176 | `'zachary-deviation-results.json'` | `'{name}-deviation-results.json'` |
| 123 | `console.log(...)` labels say "zachary" | update to opponent name (cosmetic only) |

**Example diff for pranav:**
```javascript
// Line 49 (inside parsePgnFile)
const isPranavWhite = /santhosh.*pranav|pranav.*santhosh/i.test(white);
const isPranavBlack = /santhosh.*pranav|pranav.*santhosh/i.test(black);
if (!isPranavWhite && !isPranavBlack) continue;
const moves = chess.history();
if (moves.length < 8) continue;
games.push({ color: isPranavWhite ? 'white' : 'black', moves, white, black });

// Line 144 (main section)
const pgnPath = path.resolve(__dirname, '../pgnlib/Santhosh, Pranav.pgn');
const games = parsePgnFile(pgnPath);
console.log(`Parsed ${games.length} Pranav games`);

// Line 176 (output)
const outPath = path.resolve(__dirname, 'pranav-deviation-results.json');
```

The step in `analyzeDeviation` that logs move analysis (line 127) also uses 'zachary' in the color label — change `color: 'zachary'` to `color: '{name}'` in the `steps.push(...)` call. This is cosmetic only; the JSON key doesn't affect the HTML.

---

## Step 3 — Run the Script

```bash
node scripts/{name}-opening-deviation.js
```

Expected output per move analyzed:
```
  5... a6       rank=2 book=Qc7 (66%) [db:1200]
  10... a5      rank=novel book=b5 (40%) [db:800]
```

The script outputs progress to stdout and saves to `scripts/{name}-deviation-results.json`.

**Rate limiting:** The script already sleeps 1200ms between each Lichess masters API call. For 6 systems × ~10 moves per system = ~60 API calls, expect ~2 minutes total. Do not reduce the sleep — the masters API has strict rate limits.

---

## Step 4 — Interpret the JSON

The output is an array of system objects (3 White + 3 Black):

```json
[
  {
    "label": "e4 e5 Nf3 Nc6",     // first 4 moves (opening fingerprint)
    "color": "white",              // opponent's color in this system
    "gameCount": 8,                // games in this system
    "firstDeviationIdx": 4,        // step index of first non-book move
    "examples": ["A vs B", ...],   // up to 3 example pairings
    "steps": [
      {
        "i": 0, "moveNum": 1, "move": "e4",
        "color": "opponent-name",   // set when it's the player's turn
        "isZacharyTurn": true,       // field name stays "isZacharyTurn" even for other players
        "agreementPct": 100,
        "bookData": {
          "bookTop": { "san": "e4", "count": 500, "pct": 45 },
          "bookTop3": [...],
          "playerRank": 0,          // 0 = top book move
          "playerPct": 45,
          "totalGames": 1100,
          "isDeviation": false,
          "isNovelty": false
        }
      },
      {
        "i": 1, "moveNum": 1, "move": "e5",
        "color": "opponent",        // opponent's move
        "isZacharyTurn": false       // no bookData for opponent moves
      }
    ]
  }
]
```

**Chip classification rules** (applied per step where `isZacharyTurn: true`):

| Chip class | CSS class | Condition |
|---|---|---|
| Top book move | `chip-book` | `playerRank === 0` |
| 2nd–3rd choice | `chip-good` | `playerRank === 1 or 2` AND `playerPct >= 20` |
| Minor sideline | `chip-side` | `playerPct` between 5–19 |
| Rare / personal prep | `chip-rare` | `playerPct < 5` AND `playerRank >= 0` |
| Novelty | `chip-novel` | `playerRank === -1` (not in DB) OR `isNovelty: true` |

Opponent moves (where `isZacharyTurn === false`) always use `chip-opp`.

**Deviation severity** (for callout boxes):
- `level-side` → `chip-side` moves (minor sideline)
- `level-rare` → `chip-rare` moves (rare)
- `level-novel` → `chip-novel` moves (novelty)

Only generate deviation callouts for non-book moves on the player's turn. Skip opponent moves.

---

## Step 5 — Build the HTML

**Before writing any FEN box:** The deviation script sources FENs from the Lichess masters API, so chip data is already verified. But if you are writing a `.fen-box` for a drill position or any position not directly in the JSON, verify it first using `/lichess-verify`:
```
https://explorer.lichess.ovh/masters?play={uci_moves}   ← get FEN from move sequence
https://lichess.org/analysis/standard/{FEN}             ← confirm visually
```
Never hand-derive a FEN from first principles — the Vadim sessions audit produced two impossible FENs that way.

Create `matchup/opening-deviation-{name}.html` using `matchup/opening-deviation-zachary.html` as the template. Swap:

1. All occurrences of "Zachary Liu" → opponent display name
2. Player stats in the header (rating, game count, White/Black split)
3. The summary table rows (opening system, color, games, first deviation, move vs book)
4. The system cards (one per system)

### HTML skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{Opponent} — Opening Deviation Map</title>
  <!-- copy all CSS from opening-deviation-zachary.html verbatim -->
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="doc-header">
    <h1>{Opponent Full Name} — Opening Deviation Map</h1>
    <div class="meta">
      <span><strong>Player:</strong> {Name} · {Rating} FIDE</span>
      <span><strong>Games analyzed:</strong> {N} ({W} as White, {B} as Black)</span>
      <span><strong>Database:</strong> Lichess Masters (FIDE 2300+)</span>
      <span><strong>Generated:</strong> {today}</span>
    </div>
    <a href="../austin-prep.html" class="back-link">← Back to Prep Index</a>
  </div>

  <!-- Legend (copy verbatim from zachary template, swap "Zachary's moves" label) -->
  <div class="legend">
    <strong style="...">{Name}'s moves:</strong>
    <!-- legend items same as zachary -->
  </div>

  <!-- Summary table -->
  <h2>Deviation Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Opening System</th><th>Color</th><th>Games</th>
        <th>First Deviation</th><th>{Name}'s Move vs Book</th>
      </tr>
    </thead>
    <tbody>
      <!-- one row per system, 6 rows total (3 White + 3 Black) -->
    </tbody>
  </table>

  <!-- Systems: As White -->
  <h2>As White</h2>
  <!-- system cards here -->

  <!-- Systems: As Black -->
  <h2>As Black</h2>
  <!-- system cards here -->

  <!-- Insight grid (optional) — two columns: "Exploit as Austin" / "Prepare against" -->

</div>
</body>
</html>
```

### System card structure

```html
<div class="system-card">
  <div class="system-card-header">
    <h3>{Opening Name} <small style="color:#57606a;font-weight:400;">{ECO}</small></h3>
    <span class="game-count">{N} games · trunk depth {D}</span>
  </div>
  <div class="system-card-body">

    <div class="trail-label">Most-played trunk</div>
    <div class="move-trail">
      <!-- One chip per step in steps[] -->
      <!-- For isZacharyTurn=true: apply chip classification from Step 4 rules above -->
      <!-- For isZacharyTurn=false: chip-opp -->
      <!-- Add ⚑ flag on rare deviations, ★ flag on novelties -->
      <!-- title tooltip: "{Name}: {pct}% | Book: {top}({pct}%) {2nd}({pct}%)" -->
      <span class="chip chip-book" title="...">e4</span>
      <span class="chip chip-opp">e5</span>
      <!-- etc -->
    </div>

    <!-- Deviation callouts: one per non-book player move -->
    <div class="dev-list">
      <div class="dev-row level-rare">
        <span class="dev-move">3. b3</span>
        <span class="dev-detail">
          <em>Context.</em> Masters play <strong>{bookTop}</strong> ({bookTopPct}%)
          [and <strong>{2nd}</strong> ({2ndPct}%) / <strong>{3rd}</strong> ({3rdPct}%)].
          {Name}'s <strong>{move}</strong> ({playerPct}%) — [interpretation: is it a
          system choice, a personal repertoire line, a sideline avoiding theory, or
          a positional preference?]
        </span>
      </div>
    </div>

    <!-- Austin prep note: specific advice for playing against this system -->
    <div class="austin-note">
      <div class="note-label">Austin — Prep note</div>
      [Specific advice: what to expect in this system, where Austin can steer,
       any known weaknesses or forced lines from the matchup analysis.]
    </div>
  </div>
</div>
```

### Generating the deviation callout text

For each deviation, use the bookData to write an interpretation sentence:

- `level-novel` (rank=-1): "No master games found at this position — {Name} is in personal prep territory from move {N}. Preparation likely extends further."
- `level-rare` (pct<5): "Masters prefer {bookTop} ({bookTopPct}%) or {2nd} ({2ndPct}%). {Name}'s {move} ({playerPct}%) is a personal sideline — [explain what it achieves positionally]."
- `level-side` (pct 5-19): "Masters most often play {bookTop} ({bookTopPct}%). {Name}'s {move} ({playerPct}%) is a reasonable but less-tested alternative — [explain the strategic idea]."

Cross-reference with the opponent's `{name}-analysis.md` to add context: does this deviation match a known repertoire pattern? Did it appear in a specific tournament?

---

## Step 6 — Add to the Prep Index

Open `austin-prep.html` and find the opponent's card in the `#opponents` section. Add a link to the new deviation map:

```html
<a href="matchup/opening-deviation-{name}.html" class="btn btn-outline">Opening Map</a>
```

Place it alongside the existing matchup and deep analysis buttons for that opponent.

---

## Quality Rules

1. **Every chip tooltip must be accurate** — copy the `playerPct` and `bookTop.pct` values directly from the JSON. Do not estimate or round differently.
2. **Only analyze player-turn moves** (`isZacharyTurn: true`) for deviations. Opponent moves (`isZacharyTurn: false`) are grey chips with no deviation callout.
3. **Interpret deviations, don't just list them.** A rare move is not automatically a mistake — it may be a prepared sideline. Check whether the same system appears repeatedly across the opponent's games (high gameCount = prepared).
4. **Austin notes must be specific.** "Expect 1.e4 — be prepared" is useless. Name the exact variation, recommend a specific move, reference the matchup analysis.
5. **The script takes ~2 minutes** — do not re-run if the JSON already exists from a prior run. Only re-run if new games have been added to pgnlib.
6. **pgnlib path is case-sensitive** — match the exact filename in `pgnlib/` including spaces and commas (e.g., `Liu, Zachary Hankun.pgn`).
7. **Never hand-derive FENs.** For any position added to the HTML that isn't directly sourced from the deviation JSON, verify via `/lichess-verify` before writing. The Vadim sessions audit produced two impossible FENs by manual derivation; Lichess is authoritative.
