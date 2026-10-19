# chess-prep

## Purpose

Generate a comprehensive tournament preparation plan for Austin Lin against a specific opponent. Follows the enhanced 8-section template from `austin/prepare-plan/preparationTemplate.md`. Produces two shareable HTML files (one per color), grounded entirely in engine data from the deep analysis JSON.

Run this skill when Austin is about to face a specific opponent and needs game-ready preparation. Works for any opponent with existing analysis data in the repository.

---

## Invocation

```
/chess-prep [opponent-name] [color: white|black|both] [tournament: optional context]
```

Examples:
- `/chess-prep zachary both naycc2026`
- `/chess-prep justin white`
- `/chess-prep tarun both`

If opponent name is ambiguous, list available opponents from `{name}-analysis.md` files and ask the user to confirm.

---

## Procedure

### Step 1 — Load All Existing Data

Read the following files **before generating any content**:

1. `{name}-analysis.md` — opponent profile, record, opening patterns
2. `scripts/{name}-analysis-results.json` — engine accuracy data, critical moments, blunder patterns
3. `matchup/matchup-{name}.md` — existing matchup plan (if present) — used as a starting point, not the final output
4. `austin-analysis.md` — Austin's current openings, strengths, and weaknesses
5. `CLAUDE.md` — project context, Austin's opening repertoire, key player profiles

If `{name}-analysis-results.json` does not exist or has fewer than 5 games analyzed:
- Stop and notify the user: "Insufficient engine data for [name] — only N games analyzed. Recommend running `node scripts/analyze-{name}.js` first or finding additional PGNs."
- Do not proceed with fabricated accuracy data.

Also scan for any PGN files in `opponents/{name}/` that have not yet been referenced in the analysis — flag them if found.

---

### Step 2 — Build the Opponent Profile (Template Section 1)

From the analysis data, compile:

```
Name: [from PGN White/Black tags]
FIDE Rating: [current] (peak: [peak], period)
Style keywords: [derive from engine patterns — not invented labels]
Improvement trend: [compute from rating history in analysis.md]
Sample size: [count from JSON]
Direct record vs Austin: [search austin-analysis.md and all Austin PGN files for games vs this opponent]
```

**Direct encounter check:** Search `austin/*/` for any PGN where White or Black contains the opponent's name. If found, run the critical moment analysis on that specific game and include it prominently.

---

### Step 3 — Build the Repertoire Frequency Table (Template Section 2)

From all games in `{name}-analysis-results.json`:

**For each color:**
1. Group games by ECO family (A, B, C, D, E) → then by opening name
2. Count W/D/L per group
3. Compute W%, D%, L% = count / total games in group × 100

**Minimum threshold:** Include a row only if N ≥ 2 games, or N = 1 with a documented critical moment.

**Report format (must be a table — do not use prose for statistics):**

```
| Opening | ECO | N | W% | D% | L% | Notes |
```

If ECO data is unavailable (YottaBase format without ECO tags), derive opening names from the first 4–6 moves in the PGN using chess.js-standard naming. Note "ECO estimated from moves" in the table.

---

### Step 4 — Identify Vulnerabilities (Template Section 3)

From the engine JSON, extract:

**A. Lines with weak records:**
- Sort all ECO groups by L% descending
- For L% ≥ 50% with N ≥ 2, include in the vulnerabilities table
- For N = 1: include only if critical moment CPL ≥ 300

**B. Tactical patterns (recurring errors):**
- Scan all `criticalMoments` across all games
- Classify each by type: king-walk, queen misplacement, piece sacrifice error, endgame passive piece, pawn structure blunder, time-pressure blunder
- Count occurrences per type; report top 3 with:
  - Type name
  - Count of occurrences
  - Best example: `Game [tournament/round], Move [N], [san], CPL [N], eval [before] → [after]`

**C. Color imbalance:**
- Compute average accuracy as White vs Black from the JSON
- Report the gap and which color is weaker

**D. Opening preparation depth:**
- Find the earliest move with a blunder (CPL ≥ 300) in any game
- If blunders appear before move 10 consistently, note "shallow opening prep"
- If no blunders before move 12+, note "solid opening theory"

---

### Step 5 — Choose Austin's Weapons (Template Section 4)

**Selection criteria:**
1. Primary weapon: the opening that creates the position type where the opponent's L% is highest (from Step 3A) AND fits Austin's repertoire (from `CLAUDE.md` — Austin plays 1.e4, Rossolimo, Advance French, h4 systems; Black: Nimzo, QI, Sicilian)
2. Side-line: an alternative Austin can reach if the primary is avoided

**Validation check:** Cross-reference with `austin-analysis.md` to confirm Austin has actually played this opening (or the skills needed for it). Do not recommend an opening Austin has never played or explicitly avoids.

**For each color, provide:**
- The exact move sequence (1.[m] 2.[m] 3.[m]...)
- Why it targets the specific vulnerability from Section 3
- The critical decision point (move N where Austin must know the plan)
- Two pitfalls Austin must avoid (ground in Austin's own game history if possible)

---

### Step 6 — Find the Model Game (Template Section 5)

This step uses Lichess opening explorer data or known GM games:

**Process:**
1. Identify the specific ECO and variation from Step 5 (Austin's weapon)
2. Look for master-level reference games in this exact line that illustrate the strategic plan
3. If you know a relevant game (GM A vs GM B, year, result in this line), include it
4. If no specific game is known: name the structural plan type and 1–2 GMs who specialize in it

**Do not fabricate game scores.** If uncertain, write: "No specific reference game identified — study IQP positions in ECO [X] by Kramnik / Karpov / [relevant GM] as structural analogs."

**The model game description must include:**
- The critical move (move N) where the winner executed the winning plan
- What Austin should replicate from this game against this specific opponent

---

### Step 7 — Build the Variance Plans (Template Section 6)

**Goal:** Give Austin a concrete move tree for the 3 most likely opening paths.

**How to determine the 3 variances:**
1. **Variance A:** The opponent's most frequent opening (highest game count from Section 2)
2. **Variance B:** The opponent's second most frequent opening, or an alternative within the same system (e.g. if Variance A is Sicilian Nc6, Variance B is Sicilian e6/Kan)
3. **Variance C:** A surprise or rare line the opponent has played once (or theoretically could play) that Austin must be ready for

**For each variance, provide:**
```
Opponent's moves: 1.[m] 2.[m] 3.[m] 4.[m]
Austin's moves:   1.[m] 2.[m] 3.[m] 4.[m]
Position type after move 4–5: [describe in one sentence]
```

Then write a concrete **4-point plan** for Austin in this variation:
1. **Moves 1–6:** Key first moves and any tricky deviations to handle
2. **Moves 7–12:** Development plan — where does each piece go?
3. **Moves 13–20:** Middlegame plan — which file, which break, which outpost, which attack
4. **Endgame alert:** What endgame type to steer toward (or avoid)

**Trap/surprise:** One specific move or move order in this variation that the opponent has used before to confuse opponents.

---

### Step 8 — Write the Cheat Sheet (Template Section 7)

**Three Golden Rules:**

Derive each rule from evidence, not generic chess advice:

- **Rule 1 (Clock):** Based on engine data — does the opponent's accuracy drop in games that go past move 30? Do they have more blunders in games with longer move counts? If yes: "Play for complexity past move 30 — their accuracy drops to X% in games ≥ 40 moves." If no data supports this: give standard advice based on style.

- **Rule 2 (Psychology):** Based on observed blunder patterns — e.g. "This opponent self-destructs from winning positions (N documented cases, avg CPL [X] on the blunder move). Do not panic early; wait for them to crack." OR "This opponent has never been observed losing from a won position — convert advantages decisively."

- **Rule 3 (Risk profile):** Based on rating gap and Austin's direct record — "Play for a win, not a draw" vs "One point is acceptable" vs "Draw with Black is fine, win aggressively with White." Ground in the practical tournament context (what result does Austin need?).

**Opening Reference Card:**

Ultra-concise. No prose. Key moves + strategic idea:

```
AS WHITE:
  Main: [move sequence] → [2-word strategic idea]
  If [variation]: [Austin's response] → [2-word idea]
  If [surprise]: [Austin's response] → [2-word idea]

AS BLACK:
  vs [1st move]: [Austin's response] → [2-word strategic idea]
  If [variation]: [Austin's response] → [2-word idea]
```

**Tactical Motifs Table:**

3–5 rows. Derived from Section 3B critical moment analysis:

```
| Tactic | When it arises | Example game/move |
```

---

### Step 9 — Day-of Preparation (Template Section 8)

**Warm-up exercises (30 min total):**

1. **Tactics drill (15 min):** Specify the tactic type from Section 7 tactical motifs. E.g.: "10 puzzles on 'king walk / mating net' patterns — search Lichess puzzle database with tag [fork / discovered check / mating net]." Be specific about the puzzle type matching the opponent's actual weakness.

2. **Opening line review (10 min):** The exact variation tree from Variance A (most likely). Spell out which moves Austin should replay mentally or on a board.

3. **Model game (5 min):** The reference game from Section 5. Specify: "Play through to move N, then pause and think: what is White's plan here? The answer is [X]."

**Mental frame (2 sentences):** What mindset should Austin carry in — specific to this opponent, this game, this tournament context.

---

### Step 10 — Generate HTML Output

Produce **two separate HTML files**:

**File 1: `matchup/matchup-{name}-white.html`** (Austin as White)

Content includes (in order):
1. Header (green theme, `#2d7d46`) — opponent name, Austin's color, engine data credit
2. Section 1: Opponent profile (from Step 2)
3. Section 2: Opponent's Black repertoire (their responses vs 1.e4 — from Steps 3–4)
4. Section 3: Vulnerabilities as Black (from Step 4)
5. Section 4: Austin's recommended weapon (from Step 5)
6. Section 5: Variance A plan (from Step 7)
7. Section 6: Variance B and C (from Step 7)
8. Section 7: Cheat sheet — clock rule + psychology rule + risk rule + opening card (from Step 8)
9. Section 8: Day-of prep (from Step 9)
10. Back links: `← austin-prep.html`, `← matchup-{name}.html`, `Engine Analysis →`

**File 2: `matchup/matchup-{name}-black.html`** (Austin as Black)

Content includes (in order):
1. Header (blue theme, `#1a5276`) — opponent name, Austin's color, engine data credit
2. Section 1: Opponent profile
3. Section 2: Opponent's White repertoire (from Steps 3–4)
4. Section 3: Vulnerabilities as White
5. Section 4: Austin's recommended response (from Step 5)
6. Section 5: Variance A plan (from Step 7)
7. Section 6: Variance B and C (from Step 7)
8. Section 7: Cheat sheet — adapted for Black (from Step 8)
9. Section 8: Day-of prep (from Step 9)
10. Back links

**HTML style standards:**
- Use the same CSS conventions as `matchup/matchup-{name}.html` (part-card, warn-box, tip-box, info-box, game-block, badge classes)
- Cheat sheet section uses a `cheat-card` styled div (monospace font, compact table layout)
- Variance plans use numbered `var-card` or similar divs with the move tree in `<code>` blocks
- Golden rules use three `rule-card` items (numbered, styled boxes)

---

### Step 11 — Update Index and Commit

1. **Update `austin-prep.html`:**
   - In the opponent's block, add links to the new `-white.html` and `-black.html` files
   - Add a `[WHITE PREP]` and `[BLACK PREP]` badge alongside the existing `[PLAN]` and `[DEEP]` links
   - Update the `opp-note` if the new analysis reveals more precise statistics

2. **Commit message format:**
   ```
   Add {opponent} game prep: {N}-section plan, White+Black HTML, variance trees
   
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```

3. **Push** to remote.

---

## Quality Standards

Every sentence in the output that cites a statistic, move, or pattern must:
- Name the specific game (tournament + round) it came from
- Include the move number
- Include the CPL or accuracy value from the JSON

Forbidden phrases:
- "often plays aggressively" (vague — cite game evidence)
- "may struggle in endgames" (vague — cite specific endgame losses and their CPL)
- "tactical player" (only if documented in multiple games with blunder patterns)
- Any accuracy % not sourced from `{name}-analysis-results.json`

---

## NAYCC 2026 Context

When preparing for NAYCC 2026 specifically:

- Austin's current tournament rating entry: ~1865–1968 FIDE
- Likely opponents in the field: Justin Huang (2093), Aarush Ajith (1895), Zachary Liu (~2050–2250), Heye Gao (~2065), Fernando Cortes Medina (~2133), Pranav Santhosh (1940), Tarun Sankar (~1965), Emerson Johnson (~1925), Leo Jackson (~1886)
- Austin needs full points to finish near the top — plan for wins, not draws, against players within 100 rating points
- Against 2050+ opponents, draw with Black may be acceptable depending on tournament standing
- Austin's strongest color is White (check `austin-analysis.md` for current color accuracy split)
- Prioritize: Justin Huang (prior loss at NAYCC 2025) and Zachary Liu (highest-rated likely opponent, ongoing direct record) — run these first if time permits

**Tournament prep sequence suggestion:**
1. Run `/chess-prep zachary both naycc2026` — hardest opponent
2. Run `/chess-prep justin both naycc2026` — previous direct loss to prepare revenge
3. Run `/chess-prep aarush both naycc2026` — close rating, no prior encounter
4. Others as time allows

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| Depth of variance plans | 4 moves deep | Can extend to move 8 for critical lines |
| Min games threshold | 2 games | Lower to 1 for 2400+ opponents (less data available) |
| Model game source | Agent knowledge | Flag if uncertain — do not fabricate |
| HTML output | Separate White + Black files | Can request unified if user prefers |
