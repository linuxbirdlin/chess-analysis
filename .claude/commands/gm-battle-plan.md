# gm-battle-plan

## Purpose

Generate an IM/GM-level battle plan HTML for Austin Lin against a specific opponent. Distills engine data, repertoire analysis, and critical moment patterns into a single actionable HTML document (`matchup-{name}-gm.html`) structured for same-day tournament use.

This skill produces the most strategically dense document in the pipeline — not a reference sheet but a concrete combat manual with exact move trees, if/then tables, and psychological notes grounded entirely in game data.

Run this skill when:
- A new opponent has been added but the GM file needs freshening with deeper analysis
- The Stockfish JSON was updated and the GM file needs to reflect new accuracy data
- A direct encounter occurred and the plan needs to incorporate what was learned

---

## Invocation

```
/gm-battle-plan [opponent-name]
```

Examples:
- `/gm-battle-plan pablo`
- `/gm-battle-plan zachary`
- `/gm-battle-plan justin`

If the opponent name is ambiguous, list available opponents from `analysis/{name}-analysis.md` files and ask the user to confirm.

---

## Procedure

### Step 1 — Load All Data

Read the following files **before generating any content**. Do not fabricate statistics.

1. `analysis/{name}-analysis.md` — opening repertoire, tournament record by color, tactical patterns
2. `scripts/{name}-analysis-results-deep.json` (prefer over standard if it exists) — per-game engine data: accuracy %, CPL, blunders, mistakes, inaccuracies, criticalMoments
3. `matchup/matchup-{name}.md` — existing matchup notes (use as context, not the final output)
4. `analysis/austin-analysis.md` — Austin's current repertoire, verified openings, strengths/weaknesses
5. `CLAUDE.md` — Austin's opening repertoire and key player profiles quick-reference

If neither JSON file exists or has fewer than 3 games analyzed, stop and notify the user. Do not proceed with invented data.

---

### Step 2 — Build the Intelligence Brief

From the data, compile two Intel Cards (one for each color role):

**Opponent as White:**
- First move (1.e4 / 1.d4 / 1.Nf3 / 1.c4)
- Main systems used (e.g. "Ruy Lopez vs 1…e5, English Attack vs Sicilian")
- Win/Loss/Draw record as White and average accuracy as White (from JSON — count only non-skipped entries where `prColor === 'white'`)
- Biggest White vulnerability: the line/color/situation with the worst record (backed by a specific game cite)

**Opponent as Black:**
- Responses to Austin's 1.e4 — identify the primary defense (Sicilian variant, Caro-Kann, French, etc.)
- Count how many documented games exist in the main defense
- Win/Loss/Draw record as Black and average accuracy as Black (from JSON)
- Identify whether opponent's best accuracy games are as Black or White

**Critical Weaknesses Card:**
- Top 3 documented error patterns from the JSON `criticalMoments` data, each citing: tournament, round, move number, move played, CPL, eval swing
- **Attribution rule:** Every `criticalMoments` entry tracks the named player's moves only. Before citing any moment, confirm the `san` field is a move by the named player (not their opponent). Do not cite opponent moves as the subject player's errors.
- These must be facts from the JSON, not general impressions

**Key Game Facts Card:**
- Overall average accuracy from JSON
- Best single-game accuracy (cite game)
- Worst single-game accuracy (cite game)
- Most notable upset win (beat someone significantly higher-rated)
- Rating trajectory (from the analysis.md)

---

### Step 2.5 — Variation Frequency Breakdown (required when opponent uses ≥2 Black systems)

If the opponent has 2 or more documented Black defenses vs 1.e4 (e.g., Accelerated Dragon AND 2...e6 Taimanov, or Sicilian AND French), build a variation frequency table to place between the intel grid and Part 1:

```html
<h3>Opponent Black vs 1.e4 — Variation Breakdown (N games, years)</h3>
<table>
  <thead>
    <tr><th>Variation</th><th>Games</th><th>%</th><th>Years active</th><th>Austin's weapon</th></tr>
  </thead>
  <tbody>
    <!-- one row per variation, row-danger class on the highest-threat line -->
  </tbody>
</table>
<div class="callout callout-gold">
  <strong>Current-year picture:</strong> [describe what the opponent actually played most recently — the last 1–2 tournament seasons]
</div>
```

Count games per variation from the pgnlib ECO distribution or from the analysis.md opening section. Mark the highest-frequency current-year system as the primary threat. Austin's weapon column must name the specific Austin repertoire weapon for that system.

---

### Step 3 — Determine Austin's Weapons

**Austin as White:**
1. Identify what the opponent plays as Black vs 1.e4 (from Step 2 + 2.5)
2. Cross-reference with Austin's repertoire (CLAUDE.md): Austin plays Rossolimo (3.Bb5) vs Sicilian 2…Nc6, Exchange Caro-Kann (4.Bd3), Tarrasch French (3.Nd2 — NEVER Advance 3.e5), h4 systems
3. If the opponent plays a Sicilian variant that DOES require 2…Nc6 → Rossolimo applies. If the opponent plays a variant that does NOT require 2…Nc6 (e.g. Kan 2…e6/4…a6, Dragon 2…d6, Najdorf) → Austin must use the Open Sicilian with a concrete system (English Attack 6.Be3 7.f3 8.g4!, Maróczy Bind, or similar)
4. Select the system that exploits the opponent's specific weakness from Step 2 — the one that puts them in the LEAST familiar territory
5. Validate: does Austin have documented experience with this system from other matchup files? If yes, note it. If no, flag it.

**Austin as Black:**
1. Identify what the opponent plays as White (from Step 2)
2. Recommend Austin's standard response:
   - vs 1.e4: Austin plays **Taimanov Sicilian ONLY** (`1...c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6`) — never Caro-Kann, never 1...e5, never Najdorf
   - vs 1.d4: Austin plays Nimzo-Indian (3…Bb4, then Bxc3+ …b6/…Ba6)
   - vs 1.c4/1.Nf3: Nimzo transposition or QI-adjacent setup
3. Identify the critical decision point — the single move or moment in the game tree where Austin must know the plan cold

---

### Step 4 — Build Move Trees (4 branches per color)

For each color (Austin White, Austin Black), build 4 opening branches:

**Branch A — Main line:** The opponent's most-played opening (highest game count). Give the move sequence 8–12 moves deep with the critical decision point highlighted. Include a 3-sentence plan: what to aim for in the middlegame, where the pieces go, what the winning idea is.

**Branch B — Second line or variation:** The second-most-played opening or a common variation within the main system. Same depth.

**Branch C — Surprise/rare line:** A line the opponent has played 1–2 times or might play as a surprise. Austin must be ready for this even though it is less likely.

**Branch D — Sidestep option:** An alternative for Austin to simplify or change the game type. Include the trade-off: why might Austin choose this, and what does he give up.

**Format requirement:** Each branch must include:
- The exact move sequence in `Austin: 1.e4 c5 2.Nf3 e6...` notation (blue for Austin's moves annotated with `.mv-a`, red for opponent's with `.mv-z`)
- At least one `[key-move]` annotation on Austin's critical choice
- At least one `.note` line explaining WHY this is the right plan
- A 1–2 sentence paragraph after the move line explaining the positional/strategic idea

**⚠️ MANDATORY — Move legality verification (run after writing each branch):**

After writing each branch's move sequence, verify legality by replaying every move with chess.js:

```javascript
const { Chess } = require('chess.js');
const chess = new Chess();
const moves = ['e4', 'c5', 'Nf3', 'e6', ...]; // paste the branch moves
for (const m of moves) {
  const result = chess.move(m);
  if (!result) { console.error('ILLEGAL:', m, chess.fen()); break; }
}
```

Do NOT skip this for any branch. Common failure modes found in past plans:
- Castling twice (O-O after already having castled earlier in the variation)
- Pawn to occupied square (e.g., d4 when a piece is already on d4)
- Moving a captured piece (e.g., citing a continuation for a piece that was exchanged two moves prior)
- Incorrect move order relative to what the opponent can play

If a move is illegal: replace the entire continuation with legal alternatives. Never leave an illegal sequence and note it as "approximate."

---

### Step 5 — Eval Badge Requirement for Key Positions

For every position you label as "key," "best," "winning," or the target of a "critical decision" in Branches A and B, fetch the Lichess cloud eval and embed it inline:

```
GET https://lichess.org/api/cloud-eval?fen=<URL-encoded FEN>&multiPv=3
```

Add an eval badge immediately before the position's "Why" paragraph:

```html
<p class="note">✅ Lichess cloud eval <strong>+0.63 depth 27</strong> — [one-line interpretation]. FEN: <code>…</code></p>
```

If the cloud eval returns 404 (position not in Lichess database), note it honestly: `⚠️ Lichess cloud eval unavailable for this position — assessment based on Stockfish analysis`.

**Never** describe a position as "winning," "structural win," or "best" without a backing eval badge or JSON citation. The Reyansh audit found Branch B2 described as "Austin's strongest structural Rossolimo path" when the eval was −0.03 (objectively equal). That kind of overstatement misleads Austin OTB.

To get the FEN for a position after N moves, use the UCI move trace approach:
```
GET https://explorer.lichess.ovh/masters?play=e2e4,c7c5,...   ← returns `fen` field
```
Or use chess.js: replay the sequence to that position and call `chess.fen()`.

---

### Step 6 — Accuracy Profile Section

From the JSON, build a per-tournament accuracy table for the most recent and most relevant events (prioritize classical over blitz/rapid, prioritize events vs stronger opposition):

Table columns: `Tournament | Rnd | Color | Opponent | Elo | Result | Acc% | ECO | B/M/I`

After the table, write a 2–3 sentence summary:
- Which format/color shows the highest accuracy
- Which format/color shows the biggest accuracy drop
- What this means for Austin's game plan

---

### Step 7 — Error Pattern Reference

From the JSON `criticalMoments` (across all games), extract the 3 most significant recurring error patterns.

**Before writing any critical moment:**
1. Identify which player the JSON file tracks (the named player, not their opponent)
2. Confirm the `san` field at that moveNum is the tracked player's move — not an opponent move misattributed
3. Cross-check CPL and eval values against the JSON exactly — do not round or estimate

For each pattern:
- Pattern name (e.g. "Late-game blunder chain", "Blunder under tactical pressure", "Opening preparation gap")
- Critical example: tournament, round, move number, move played, eval before, eval after, CPL (all verbatim from JSON)
- How Austin should exploit this specific pattern

Do not invent patterns. If the JSON has no blunders (opponent is very accurate), write: "High-accuracy player — {N} total blunders across {M} games. Primary exploit: opening preparation gaps rather than calculation errors."

---

### Step 8 — If/Then Quick Reference Tables

Build two if/then decision tables — one for Austin as White, one for Austin as Black.

**Table structure:**
```
| If opponent plays... | Austin plays... | Why |
```

Cover all plausible first moves and the most critical early deviations (at least 5 rows per table). Each "Why" entry must cite the specific data point from Steps 2–4 (not generic chess advice).

Add a third accordion section: **Key principles for this matchup** — 5–6 bullet points, each a specific, evidence-based rule (not generic advice). Every bullet must cite a specific game, stat, or pattern from the data.

---

### Step 9 — Critical Moments Reference

Pull the 2–3 most instructive game fragments from the JSON (highest CPL blunders or most pattern-defining moments). For each:

1. Header: `Pattern name (Tournament, Color, Acc%, Result vs Elo)`
2. Move sequence leading to the critical moment (5–6 moves before + the blunder)
3. The bad move annotated with `.bad-move` styling
4. A 2-sentence analysis: what should have been played and what this reveals about the opponent's chess psychology

Include at least one "best game" reference showing the opponent's defensive ceiling.

---

### Step 10 — Generate the GM Battle Plan HTML

**Filename:** `matchup/matchup-{name}-gm.html`

**HTML structure** (follow `matchup-reyansh-gm.html` as the canonical template — it includes Lichess eval badges, variation breakdown table, and `.row-danger` highlighting. Copy the full `<style>` block verbatim):

```
<h1>Battle Plan: Austin (White & Black) vs [Full Name]</h1>
<div class="subtitle"> Rating | Direct record | Games analyzed </div>
<div class="rating-note"> Rating context paragraph </div>

<div class="intel-grid">
  [4 intel-cards from Step 2]
</div>

[Variation Frequency table from Step 2.5, if applicable]

<hr class="section-divider">

<h2 class="white-section">Part 1 — Austin as White: [Headline describing weapon]</h2>
  callout-blue: core challenge sentence
  h3: Main line name
  move-line (main line)
  4 accordion branches (acc-toggle / acc-label / acc-content)
  Eval badges on key positions (Step 5)
  h3: Key tactical themes table

<hr class="section-divider">

<h2 class="black-section">Part 2 — Austin as Black: [Headline describing defense]</h2>
  callout-green: core insight sentence
  h3: Austin's defense name (Taimanov Sicilian vs 1.e4 / Nimzo-Indian vs 1.d4)
  move-line (main line)
  4 accordion branches
  Eval badges on key positions (Step 5)

<hr class="section-divider">

<h2 class="analysis">Part 3 — Accuracy Profile and Error Patterns</h2>
  h3: Most recent classical accuracy table
  callout-gold: accuracy summary paragraph
  h3: Known error patterns table (from Step 7)
  h3: Psychological notes

<hr class="section-divider">

<h2 class="reference">Part 4 — If / Then Quick Reference</h2>
  3 accordion sections (Austin as White, Austin as Black, Key principles)

<hr class="section-divider">

<h2 class="reference">Part 5 — Critical Moments Reference</h2>
  2-3 critical moment fragments (from Step 9)

<hr class="section-divider">

<h2 class="reference">Part 6 — Engine Accuracy Reference</h2>
  Full accuracy table (most important games) from Step 6
  Back links: ← austin-prep.html, matchup-{name}-deep.html
```

**CSS requirements (all from existing template — do not modify):**
- `.intel-grid` — 2-column grid for the 4 intel cards
- `.callout-blue`, `.callout-green`, `.callout-gold`, `.callout-danger` — colored callout boxes
- `.move-line`, `.mv-a` (blue bold = Austin), `.mv-z` (red bold = opponent)
- `.key-move` — highlighted key move (blue background)
- `.bad-move` — opponent's blunder (red background)
- `.note` — italic grey annotation
- `.acc-toggle` / `.acc-label` / `.acc-content` — collapsible accordion sections (checked = open)
- `.row-danger` — red-tinted table rows for the opponent's most dangerous weapon
- `h2.white-section` (blue left border), `h2.black-section` (red), `h2.analysis` (gold), `h2.reference` (grey)

**Accordion default state:** Branch A and B should start open (`checked`), Branch C and D should start closed. If/Then tables start open.

---

### Step 11 — Pre-Publish Quality Gate

Before writing the file, run this internal checklist. Do not skip items:

**Legality check:**
- [ ] Every move sequence in every branch replayed with chess.js (or manually move-by-move) — no illegal moves

**Stats consistency check:**
- [ ] Intel card accuracy numbers match the JSON (count non-skipped entries, compute average)
- [ ] Subtitle/header game count matches JSON entry count
- [ ] Blunder/mistake counts in critical moment citations match JSON `criticalMoments[].cpl` values exactly
- [ ] All accuracy figures cited in the error pattern section are verbatim from JSON

**Eval badge check:**
- [ ] Every "key" or "critical" position in Branches A and B has a Lichess cloud eval badge
- [ ] No position is described as "winning," "best," or "strongest" without a backing eval or JSON CPL

**Attribution check:**
- [ ] Every `criticalMoments` entry cited was confirmed to be a move by the tracked player (not their opponent)
- [ ] The game, round, and color cited in each critical moment match the JSON structure

**Cheat sheet sync (if present):**
- [ ] Cheat sheet move sequence is identical to Branch A main line, not a variation of it

**Repertoire check:**
- [ ] Austin as Black vs 1.e4: Taimanov Sicilian only — no Caro-Kann, 1...e5, Najdorf, or Kan
- [ ] Austin as Black vs 1.d4: Nimzo-Indian Bxc3+ only
- [ ] Austin as White: Tarrasch French (3.Nd2) only — never Advance (3.e5)

---

### Step 12 — Update austin-prep.html

Check if `austin-prep.html` already has a GM link for this opponent:
- If NO GM link exists: add one as the last link in the opponent's `opp-links` div, following the exact pattern of other GM links (purple background `#2c1a6b`, gold badge)
- If a GM link already exists: verify the href is `matchup/matchup-{name}-gm.html` and the description text matches the new plan's core weapon. Update if stale.
- Badge text format: `<span class="badge-tag" style="background:#b8a000;">GM</span> GM Battle Plan — [one-line weapon description]`

---

### Step 13 — Commit

```bash
git add matchup/matchup-{name}-gm.html austin-prep.html
git commit -m "Add {opponent} GM battle plan: [weapon summary]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Do not push unless the user explicitly asks.

---

## Quality Standards

**No illegal chess.** Every move sequence must pass chess.js replay (Step 4 mandatory check). Past plans had illegal double-castles, pawns onto occupied squares, and continuations for already-captured pieces. These are 🔴 Critical — they mislead Austin at the board.

**No invented data.** Every statistic must come directly from `{name}-analysis-results-deep.json` (or `-analysis-results.json`). Forbidden: inventing accuracy percentages, blunder counts, or game results.

**No overstatement.** A position is only as strong as its eval. Never describe a continuation as "winning" or "best" without a backing cloud eval badge or JSON CPL. The Reyansh audit found Branch B2 described as "Austin's strongest structural path" when the eval was −0.03 (equal). That misleads Austin into forcing a line that offers no objective advantage.

**No misattributed blunders.** The JSON `criticalMoments` tracks only the named player's moves. Before citing any critical moment, confirm whose turn it was at that moveNum. The Reyansh audit found Pablo's move (`Bf6??`) cited as Reyansh's error because both played in the same round.

**Austin's Black repertoire is fixed.** vs 1.e4 → Taimanov Sicilian only. vs 1.d4 → Nimzo-Indian Bxc3+ only. Caro-Kann, 1...e5, Najdorf, Kan are never Austin's lines — remove if found, never add.

**Cite the game.** Every tactical claim, psychological note, and blunder pattern must name the specific game (tournament + round or opponent name).

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| Branch depth | 8–12 moves | Extend to 14 for the main line if opponent is deeply prepared |
| Branches per color | 4 | Reduce to 3 if opponent has very narrow repertoire |
| Accuracy table rows | Top 10 by recency | Show all if ≤ 15 games total |
| Accordion default | A+B open, C+D closed | Change if a Branch C is the most likely scenario |
| GM link description | Core weapon summary | Max 60 chars — keep it sharp |
| Eval badges | Required for Branches A+B key positions | Cloud eval or note unavailability |
| Move legality | Mandatory chess.js replay | No exceptions |
