# deep-audit

## Purpose

Perform a GM-level deep preparation audit for Austin Lin against a specific opponent. Read **all** existing prep materials for that opponent, think as an experienced GM preparing for a critical game, and identify every meaningful gap, error, or improvement opportunity. Then implement every finding — no deferred items.

This skill is the quality gate before a tournament game. It is not a review pass that produces a to-do list — it reads, finds, implements, and commits.

Run this skill when:
- A full prep pipeline exists but has never been audited at GM depth
- A new tournament is approaching and prep materials may be stale
- Rating data was updated (FIDE list) and gap calculations need refreshing
- A direct encounter occurred and plans need updating with lessons learned

---

## Invocation

```
/deep-audit [opponent-name]
```

Examples:
- `/deep-audit zachary`
- `/deep-audit fernando`
- `/deep-audit inti`

If the opponent name is ambiguous, list available opponents from `analysis/{name}-analysis.md` and ask to confirm.

---

## Procedure

### Step 1 — Load All Materials

Read every file that exists for this opponent **before forming any opinion**. Do not skip files. Do not skim.

**Required reads (in order):**
1. `analysis/{name}-analysis.md` — opening repertoire, tournament record, tactical patterns
2. `matchup/matchup-{name}.md` — matchup prep source
3. `matchup/matchup-{name}.html` — general matchup HTML
4. `matchup/matchup-{name}-white.html` — Austin as White
5. `matchup/matchup-{name}-black.html` — Austin as Black
6. `matchup/matchup-{name}-deep.html` — engine accuracy HTML
7. `matchup/matchup-{name}-gm.html` — GM battle plan
8. `scripts/{name}-analysis-results.json` (or `-deep.json`) — raw engine data
9. `analysis/austin-analysis.md` — Austin's current repertoire and style
10. `CLAUDE.md` → Key Player Profiles table for the opponent
11. `next-step/naycc2026-gm-brief.html` — check how this opponent is classified in Austin's strategic brief

For each file that doesn't exist, note it as a gap but continue — do not abort.

---

### Step 2 — Build the Audit Brief

After reading everything, synthesize findings across **six audit dimensions**. For each issue found, assign a severity:

- 🔴 **Critical** — factual error, wrong move recommendation, or stale data that would hurt Austin OTB
- 🟡 **Important** — missing content that meaningfully strengthens preparation
- 🟢 **Minor** — polish, clarity, or nice-to-have additions

**Dimension 1 — Move-Order Correctness**
Check every specific move recommendation across all files for:
- Legality: is the move sequence legal chess?
- Consistency: does File A recommend Nd5 while File B recommends Nce2 for the same position? Flag contradictions.
- Engine soundness: does the recommendation match the engine data in the JSON? If a "key move" has a high CPL in the JSON, flag it.
- Move-order traps: does the recommended sequence contain a known move-order trap or transposition the opponent can exploit?

**FEN and position verification (mandatory):** Before flagging or accepting any FEN in the prep files as correct, verify it against Lichess — never accept a FEN on trust or re-derive it from first principles. Use `/lichess-verify` or fetch directly:
```
https://explorer.lichess.ovh/masters?play={uci_moves}   ← returns authoritative FEN from move sequence
https://lichess.org/analysis/standard/{FEN}             ← visual board check
```
Flag as 🔴 Critical any FEN where the piece placement does not match the stated position description (wrong side to move, impossible piece arrangement, wrong fullmove counter).

**Dimension 2 — Rating and Gap Accuracy**
- Cross-reference all rating figures against `CLAUDE.md` Key Player Profiles (which holds the authoritative Nov 1 FIDE values).
- Check: subtitle rating, profile grid rating, inline mentions of "Austin at ~X", gap calculations (+/– N points), tier labels (must-win / must-draw / prize-game).
- Flag every stale number. A wrong gap affects Austin's risk calibration OTB.

**Dimension 3 — Opening Preparation Completeness**
For Austin as White:
- Does the file cover the opponent's actual main line (backed by game count in analysis.md)?
- Are all significant secondary lines covered (>10% frequency from the dataset)?
- Is there a concrete novelty or deviation point, or only pattern-level advice?
- Does the Rossolimo/Exchange CK option get mentioned where applicable (vs Sicilian 2...Nc6)?

For Austin as Black:
- Does the file cover the opponent's actual main White system?
- Is there a concrete response to the opponent's best/sharpest White weapon (highest accuracy in JSON)?
- Are there any lines in the opponent's dataset with 0 coverage in Austin's prep?
- **Repertoire check (mandatory 🔴):** Austin's Black repertoire is fixed — flag any section that recommends a non-Taimanov Black line:
  - vs 1.e4: **Taimanov Sicilian ONLY** (`1...c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6`). Flag and remove any "System B" (Caro-Kann 1...c6) or "System C" (Italian / 1...e5) sections.
  - vs 1.d4: **Nimzo-Indian `Bxc3+`** with `...b6/...Ba6` only.
  - Any file recommending Najdorf (5...a6), Kan (4...a6), Caro-Kann (1...c6), or 1...e5 as Austin's primary line is 🔴 Critical — remove or replace it.

**Dimension 4 — Tactical and Psychological Accuracy**
- Do the "critical moments" cited match actual data in the JSON (correct CPL, correct move, correct game)?
- Is the blunder pattern correctly characterized? (e.g., "time pressure" vs "calculation error" vs "opening preparation gap")
- Are psychological notes grounded in documented game evidence, not generic chess advice?
- Is Austin's known tactical blind spot (Bxh7+ / Greek Gift) mentioned where relevant?

**Dimension 5 — Cross-File Consistency**
Compare all prep files for the opponent against each other:
- Does the GM file contradict the White/Black matchup files?
- Does the deep HTML cite the same accuracy numbers as the analysis.md?
- Does the GM brief (`naycc2026-gm-brief.html`) tier classification match the rating gap?
- Is the opponent correctly marked as in/out of Austin's field in all relevant files?
- **Austin Black repertoire consistency:** Do ALL files (black.html, gm.html, nightbefore.html, matchup.html) agree on Taimanov Sicilian vs 1.e4 and Nimzo-Indian vs 1.d4? Flag any file that still shows Caro-Kann, 1...e5, Najdorf, or Kan as Austin's recommendation.

**Dimension 6 — Missing Content Gaps**
- Is there a cheat sheet (quick reference card) present in the White and Black matchup files?
- Is there a day-of routine?
- Is there a concrete novelty tree entry for this opponent in `next-step/opening-novelty-trees.html`?
- Is there a GM battle plan file? Is it linked from `austin-prep.html`?
- Is the deep HTML linked from `austin-prep.html`?

---

### Step 3 — Present the Audit Brief

Before implementing any changes, present the full audit brief to the user as a structured list:

```
## Deep Audit: [Opponent Name]

### 🔴 Critical Issues (implement immediately)
1. [Issue description — file:line — what's wrong — what it should say]

### 🟡 Important Improvements
2. [Issue description — file — what's missing — recommended addition]

### 🟢 Minor Enhancements
3. [Issue description — file — note]

### ✅ No Issues Found
- [Dimension N]: [confirmation sentence]
```

Wait for the user to confirm before proceeding to Step 4. The user may:
- Say "implement all" → proceed with everything
- Say "implement critical only" → skip 🟡 and 🟢
- Say "skip N" → skip specific items
- Add their own items to the list

---

### Step 4 — Implement All Confirmed Issues

Work through the confirmed issues in order of severity (🔴 first, then 🟡, then 🟢).

For each change:
1. Re-read the target file section if needed (do not rely on memory of Step 1 reads)
2. Make the edit with the Edit tool — be surgical, touch only what is needed
3. After each 🔴 fix, verify the surrounding context is still coherent (no orphaned references to the old content)

**Move-order corrections:** When correcting a move recommendation, search the entire file for all instances of the wrong move in context — a single position may be cited in multiple places (main line, warn-box, cheat sheet, day-of routine). Fix every instance.

**Rating corrections:** When correcting a rating, also check:
- The subtitle line
- The profile grid
- Any "Austin at ~X" or "gap of N points" inline mentions
- The tier label (must-win / must-draw) if the gap change crosses a threshold

**Opening additions:** When adding a new line or variation:
- Place it in the correct Variance section (match the frequency order: A=main, B=second, C=rare/sideline)
- Follow the existing CSS class pattern (`.var-header`, `.var-body`, `.warn-box`, `.tip-box`)
- Include a move sequence in `.var-moves` format
- Include at least one concrete "if X then Y" note backed by game data

---

### Step 5 — Cross-File Sync

After implementing all per-file fixes, check cross-file consistency:
- If a GM file was changed: verify the index page link description is still accurate
- If rating data was corrected: check `next-step/naycc2026-gm-brief.html` for the same stale figure
- If a new section was added to a matchup file: check if `next-step/opening-novelty-trees.html` needs a corresponding entry

---

### Step 6 — Commit

Stage only the files that were changed:

```bash
git add [changed files]
git commit -m "Deep [Opponent] prep audit: [N] improvements across [M] files

- [Bullet per change group, not per file]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Do not push unless the user explicitly asks.

Report: how many issues were found, how many implemented, which files changed.

---

## Quality Standards

**No invented data.** Every move recommendation must come from the analysis.md or JSON — not from general opening theory applied without verification. If the opponent has never played a line, say so.

**No partial fixes.** A 🔴 Critical issue is not "noted for later" — it is fixed in this session. If it cannot be fixed (e.g., missing JSON data), explain why and propose the smallest safe change that reduces the risk.

**Surgical edits only.** Do not refactor or rewrite sections that are not broken. A bug fix does not justify surrounding cleanup.

**Cite the game.** Every tactical claim, psychological note, and blunder pattern must cite a specific game (tournament + round, or game ID). Generic chess advice without citation is not preparation.

**Verify positions via Lichess.** Never write or accept a FEN without checking it via the Lichess explorer API. See `/lichess-verify` for the exact calls. Hand-derived FENs have a track record of errors (impossible piece arrangements, wrong move counters) — Lichess is the ground truth.

**Austin's Black repertoire is fixed.** Do not invent or suggest alternative Black openings for Austin. The rules are:
- vs 1.e4 → Taimanov Sicilian (`1...c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6`) — no exceptions
- vs 1.d4 → Nimzo-Indian `Bxc3+` with `...b6/...Ba6` — no exceptions
- Caro-Kann (1...c6), 1...e5, Najdorf (5...a6), and Kan (4...a6) are NOT Austin's lines — remove them if found, never add them
These rules are also encoded in `CLAUDE.md` → Austin Lin profile.

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| Audit dimensions | All 6 | User can request subset (e.g. "ratings only") |
| Implementation | All confirmed issues | User confirms which tier(s) to implement |
| Commit | Yes, after implementation | Always commit; push only if user asks |
| Cross-file sync | Always | Never skip Step 5 |
