# review-tournament

## Purpose

Automated tournament review combining Stockfish engine analysis with structured HTML reports. When the user runs `/review-tournament` or asks Claude to "review a tournament", follow the steps below precisely and in order.

This skill produces:
- Per-game review cards grounded entirely in engine findings
- A tournament-level overview identifying patterns and recurring errors
- Cross-tournament pattern analysis (if multiple tournaments are available)
- Prioritized next steps and training recommendations
- Updated HTML report files committed and pushed to the repository

---

## Standard Procedure

### Step 1 — Locate PGN Files

- Identify the tournament directory. If the user has not specified one, ask: "Which tournament directory should I review? (e.g., `tournaments/austin-2024/`)"
- Confirm PGN files exist. Accepted naming conventions: `roundN.pgn`, `round-N.pgn`, `RN.pgn`, or similar.
- List which round files are present and note any gaps (e.g., "Round 3 PGN is missing").
- If no PGN files are found, stop and inform the user before proceeding.

---

### Step 2 — Run Stockfish Analysis

1. If re-analyzing from scratch, clear the cache first:
   ```
   rm scripts/analysis-results.json
   ```
2. Run the analysis script:
   ```
   SF_DEPTH=18 node scripts/analyze-games.js
   ```
3. Wait for completion. Full tournament analysis typically takes **30–90 minutes** depending on depth and number of games. Do not proceed until the script exits successfully.
4. After completion, confirm `scripts/analysis-results.json` was written and is non-empty.
5. For each game, note the following from the output:
   - Accuracy percentage
   - Average centipawn loss (CPL)
   - Blunder count (B), Mistake count (M), Inaccuracy count (I)
   - Critical moments (move number, move played, engine best, CPL, eval swing)

---

### Step 3 — Read Analysis Data

Read the following files before writing any review content:

- `scripts/analysis-results.json` — complete engine data for all games
- Each round PGN file — for opening names, move sequences, and opponent details
- The existing review HTML file — to preserve current page structure, CSS, and the scoreboard/game log table

Do not fabricate or infer engine numbers. Every statistic written in the review must come directly from `analysis-results.json`.

---

### Step 4 — Rewrite Individual Game Reviews

For each game, produce a review card containing the following sections in order:

**Game Header**
- Round number
- Opponent name and rating
- Color played (White / Black)
- Opening name (from PGN `[Opening]` or `[ECO]` tag, or identified from moves)
- Result (Win / Draw / Loss)
- Accuracy percentage (from engine data)

**Engine Stats Bar**
Display inline: `CPL: X | Blunders: X | Mistakes: X | Inaccuracies: X`

**Critical Moments Table**
Columns: `Type | Move Played | Engine Best | CPL | Eval Swing`

Include all moments flagged as blunders or mistakes. Include inaccuracies only if CPL > 20 or if they directly preceded a blunder.

Special cases:
- If best move = move played in a critical moment row: note "position was already difficult; engine confirms this was the best available defense" rather than treating it as an error.
- If the game has 0 blunders, 0 mistakes, 0 inaccuracies: omit the table and display "No critical moments — clean game."

**Narrative (1–2 sentences)**
Write a concise narrative grounded exclusively in engine findings. Do not use generic phrases like "active play" or "tactical oversight" unless supported by a specific engine line. Reference the move numbers and positions identified in the critical moments data.

Examples of grounded vs. ungrounded writing:
- Grounded: "The game was decided on move 23 when Nxe5 (CPL 87) allowed a discovered attack that the engine evaluates at +3.1 for Black; Bc4 was the correct defensive resource."
- Ungrounded (avoid): "Some tactical inaccuracies in the middlegame cost the game."

---

### Step 5 — Write Tournament Overview

After all game cards are complete, write a tournament overview section covering:

1. **Best games** — games with the highest accuracy and zero errors; explain what went right
2. **Most error-prone games** — identify which games had the most blunders/mistakes and summarize the position types where errors occurred (opening transition, middlegame tactics, endgame technique, time pressure)
3. **Recurring mistake types** — look for patterns across games, e.g.:
   - Premature pawn pushes weakening king shelter
   - King safety errors in open positions
   - Passive piece placement (high CPL on development moves)
   - Endgame technique failures (pawn endings, rook endings)
4. **Color imbalance** — compare average accuracy and error counts as White vs. Black
5. **Rating context** — if opponent ratings are available, estimate performance rating and compare to expected score

---

### Step 6 — Write Cross-Tournament Patterns (if applicable)

If multiple tournament review HTML files or analysis JSON files are present in the repository:

- Identify weaknesses that recur across tournaments (same error types appearing in 2+ events)
- Note measurable improvements tournament-to-tournament (accuracy trend, CPL trend)
- Highlight confirmed gaps that have appeared in every reviewed tournament — these are priority training targets
- If only one tournament has been analyzed, skip this section entirely

---

### Step 7 — Write Next Steps and Recommendations

Base every recommendation directly on engine findings. Do not give generic chess advice.

Structure the section as follows:

**Opening Recommendations**
- Openings where accuracy was high and errors were rare: recommend keeping
- Openings where blunders or early mistakes occurred: recommend replacing or studying specific lines
- Gaps in opening repertoire revealed by opponent choices: recommend adding

**Tactical Patterns to Drill**
- List the specific tactic types that appear most often in critical moments (e.g., discovered attacks, back-rank threats, piece forks)
- Recommend a drill volume (e.g., "50 puzzles on discovered attacks")

**Endgame Training Focus**
- If endgame blunders occurred, specify the endgame type (K+P, rook ending, etc.)
- Reference the specific game and move number where the endgame error occurred

**Priority Ordering**
Order recommendations from highest to lowest expected improvement impact. Place items that recur across multiple games at the top.

---

### Step 8 — Update HTML Files

1. **Rewrite `review.html`** using the page structure defined below. Preserve existing CSS, the page header, the scoreboard, and the game log table with its auto-calc script. Add or replace the following sections:
   - Section 1: Per-game review cards (from Step 4)
   - Section 2: Tournament overview (from Step 5)
   - Section 3: Next steps (from Step 7)
   - Section 4: Detailed recommendations (from Step 7)
   - Section 5 (optional): Cross-tournament patterns (from Step 6, only if applicable)

2. **Update `data-val` accuracy attributes** in the game log table rows to match the engine accuracy values from `analysis-results.json`.

3. **Update `ACCURACY_DATA`** in `austin-prep.html` (or the equivalent prep file for this tournament) with the new per-game accuracy values.

---

### Step 9 — Commit and Push

```bash
git add review.html austin-prep.html scripts/analyze-games.js
git commit -m "Add tournament review: [Tournament Name] — avg accuracy X.X% (White X.X% / Black X.X%)"
git push
```

Include the average accuracy for the full tournament and color split in the commit message. Do not commit `scripts/analysis-results.json` (it is gitignored and serves as a local incremental cache).

---

## Review Page HTML Structure

When rewriting `review.html`, follow this section layout:

```
<head>
  [Preserve all existing CSS — do not modify]
</head>
<body>
  [Preserve: page header / title]
  [Preserve: scoreboard summary block]
  [Preserve: game log table with data-val accuracy attributes]
  [Preserve: auto-calc script for the game log table]

  <!-- Section 1: Per-Game Reviews -->
  <section id="game-reviews">
    [One card per game, structure defined in Step 4]
  </section>

  <!-- Section 2: Tournament Overview -->
  <section id="tournament-overview">
    [Content from Step 5]
  </section>

  <!-- Section 3: Next Steps -->
  <section id="next-steps">
    [Content from Step 7]
  </section>

  <!-- Section 4: Detailed Recommendations -->
  <section id="recommendations">
    [Expanded recommendations from Step 7]
  </section>

  <!-- Section 5: Cross-Tournament Patterns (optional) -->
  <section id="cross-tournament">
    [Content from Step 6, only if multiple tournaments analyzed]
  </section>
</body>
```

---

## Accuracy Formula

Accuracy is computed using the Lichess win-probability formula:

```
cpToWinP(cp) = 100 / (1 + exp(-0.00368208 * cp))

accuracy = 103.1668 * exp(-0.04354 * avgWinPDrop) - 3.1669
```

Where `avgWinPDrop` is the average drop in win probability per move across all moves played. This matches Lichess accuracy displayed on game review pages.

---

## Configuration Notes

| Variable | Default | Notes |
|---|---|---|
| `SF_DEPTH` | `18` | Use `15` for faster analysis (~half the time); use `20+` for deeper analysis on critical games |
| `SF_THREADS` | `1` | Set to number of CPU cores for significant speed improvement (e.g., `SF_THREADS=8`) |
| `analysis-results.json` | — | Gitignored; acts as an incremental cache. Delete this file to force a full re-analysis from scratch. Partial results are preserved if the script is interrupted. |

Example fast run:
```
SF_DEPTH=15 SF_THREADS=8 node scripts/analyze-games.js
```

Example deep run on a single critical game:
```
SF_DEPTH=22 SF_THREADS=8 node scripts/analyze-games.js --round 4
```
