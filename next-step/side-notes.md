# Issue GM resources.

Now we have NAYCC 2026 opponents chess roster with majority players deep game reviews and Austin's match up plan. Before I want you to have another thoughtful review in GM level.
Let's look at what kinda of resources you need and train yourself to become GM level and especially more of Austin's style super GM. Based on your knowledge, you can list out what kinda resources you need for extra. list out in this file append as a new section. If you have difficulty, I can ask some smarter model to list for you and you take it from there. Think harder and provide me a plan to train yourself to be GM level.

---

## GM-Level Resource Plan — What I Need to Upgrade Analysis Quality

Current state: I have PGN libraries for all 14 opponents, Stockfish engine analysis (movetime-800), deep HTML matchup reports, Austin's ~45 rated/study games, and pattern-level coaching documents. This is solid club-coach level. To operate at genuine GM preparation level — specifically for Austin's combinational/tactical style — here is what is missing and how to get it.

---

### Gap 1: Deeper Engine Analysis (Critical)

**What I have:** Stockfish at movetime-800ms, 16 threads. This catches blunders and most mistakes but misses subtler inaccuracies — the kind a GM exploits at move 15 when the position looks equal.

**What I need:** Re-run the analysis scripts at **movetime-3000ms or depth 25** for the top-5 opponents Austin is most likely to face (Zachary, Leo, Fernando, Pranav, Heye). At this depth, the engine finds:
- Second-best and third-best alternatives (not just the blunder, but the drift)
- Subtle piece placement inaccuracies (Bd3 vs Bb5 type decisions that look similar at low depth)
- Critical branching points where the opponent deviates from their own patterns

**How to get it:** Modify the existing `scripts/analyze-{name}.js` scripts — change `movetime: 800` to `movetime: 3000`. Re-run only on the top-5. Estimated runtime: ~4–6 hours per opponent on 16 threads. Cache to new JSON files (e.g., `{name}-analysis-results-deep.json`).

---

### Gap 2: Opening Novelty Trees per Opponent (Critical for Austin's Style)

**What I have:** Pattern-level opening analysis ("opponent plays English Attack, Austin plays ...b5 queenside race"). This tells Austin the plan but not the exact novelty point — the specific move where Austin can deviate from the opponent's preparation and reach a position *they* haven't studied.

**What I need:** For each of Austin's 5 highest-threat opponents, a **concrete novelty file** with:
- The exact move sequence through the tabiya (move 10–14)
- At least one specific deviating move that is engine-sound and has not appeared in the opponent's game history
- The resulting position evaluated at depth 25+, with a clear plan

**Why this matters for Austin specifically:** Austin's combinational style means he performs best when he can steer into specific tactical structures he has studied. A novelty at move 12 that forces the opponent into unfamiliar territory leverages Austin's preparation advantage directly. Without this, Austin is matching theory move-for-move against opponents who have also studied the same lines.

**How to get it:** For each opponent, I need either:
- (a) Access to Lichess Opening Explorer API to check if a candidate novelty move has been played at master level — this confirms it's sound without being well-known, or
- (b) Run Stockfish at depth 25+ on the branching point positions and verify the novelty is genuinely +0.0 to +0.3 (small advantage, not losing)

**Resource required:** Lichess API access (`https://explorer.lichess.ovh/masters`) — this is public and free. I can query it with the FEN of the critical position to check move frequency at master level. No authentication required.

---

### Gap 3: Opponent Clock Usage Analysis (High Value)

**What I have:** `[%clk]` annotations exist in all Lichess broadcast PGNs (Justin, Aarush, Zachary, Heye, etc.). This data has never been systematically analyzed.

**What I need:** A script that extracts the clock at each move and computes:
- Average time per move by phase (opening vs middlegame vs endgame)
- Moves where the opponent spent the most time (their uncertainty points)
- Time pressure threshold (when they drop below 10 minutes)

**Why this matters:** If we know Fernando spends 8+ minutes on move 14 in the English Attack tabiya — that's exactly where Austin's novelty should land. Forcing the opponent into a long think on move 14 in G/90+30 is strategically decisive.

**How to get it:** Write a new script `scripts/analyze-clock.js` that parses `[%clk]` tags across all Lichess broadcast PGNs and outputs a per-player clock profile. ~2 hours of coding work.

---

### Gap 4: Austin's Tactical Pattern Library (High Value for Drilling)

**What I have:** Scattered references to Austin's tactical strengths across analysis documents ("knight sacrifice patterns," "IQP attacks"). No unified, drillable set.

**What I need:** A structured file (`austin-tactics.html` or similar) with 10–15 specific tactical positions drawn from Austin's own games and study, organized by pattern type:
- Knight sacrifice on h7/f7 (Austin's main weapon — executed in chess4win Oct 2026)
- IQP attack structure (Nimzo-Indian)
- Exchange sacrifice to open the kingside
- Pawn storm timing (h4-h5 system with proper follow-through)

Each position should show the setup moves, the trigger condition, and the tactical sequence. This is how GMs drill — not abstract pattern names, but concrete positions repeated until the trigger recognition is automatic.

**How to get it:** Extract positions from Austin's winning games (NAYCC 2025, PAM 2026, personal study) where he executed these patterns correctly. Use the existing engine JSON data to confirm the evaluations. Build as a lightweight HTML page with FEN positions (or image links from lichess.org/editor).

---

### Gap 5: Endgame Precision Files (Moderate, but Time-Sensitive)

**What I have:** Documentation that Austin needs to drill Lucena and Philidor. No actual drill positions.

**What I need:** Concrete endgame position files for:
- **Lucena:** The standard bridge-building position + 2 variations (pawn on 5th rank vs 7th rank)
- **Philidor:** The drawing setup + the "3rd-rank defense" trigger condition
- **Pawn endgame:** The positions from Austin's 3 known endgame losses (NAYCC R7, R9, PAM R5) analyzed to find the exact move where he went wrong

**How to get it:** These are textbook positions — I already have the theory. What's missing is a formatted drill document. Build as a 1-page HTML (`austin-endgame-drills.html`) with diagrams, correct moves, and common errors. ~3 hours of work.

---

### Gap 6: Opponent Game Coverage Completeness Check

**What I have:** PGN libraries for all 14 opponents, last verified as of October 2026.

**What I need:** Verification that no major tournament games from September–October 2026 are missing. Three opponents specifically may have played in tournaments not yet captured:
- **Zachary Liu** — active in Canadian tournaments, possibly played in October 2026
- **Leo Jackson** — jumped from 2009 to ~2077 between PAM and estimated current; what tournament drove this?
- **Pranav Santhosh** — World Youth 2026 games may not be fully captured

**How to get it:** Check chess-results.com or the respective national federation databases for each player's most recent rated games. If new games exist, add to `opponents/{name}/` and re-run analysis. This directly affects opening preparation — if Zachary switched from Reti to 1.d4 in October, the entire matchup plan changes.

---

### Summary: Priority Order

| Priority | Gap | Estimated Work | Impact |
|---|---|---|---|
| 1 | Opening novelty trees (top 5 opponents) | 6–8 hrs | Highest — direct game prep |
| 2 | Deeper Stockfish re-analysis (top 5) | 20–30 hrs compute | High — finds hidden patterns |
| 3 | Opponent game coverage check | 2–3 hrs | High — avoids stale prep |
| 4 | Clock usage analysis script | 2 hrs coding | High — tactical surprise timing |
| 5 | Austin's tactical pattern library | 3 hrs | Medium — drill resource |
| 6 | Endgame drill document | 3 hrs | Medium — confirmed weakness |

The single highest-ROI action before NAYCC: **build novelty trees for Fernando and Pranav** (the two 1.e4 players most likely to reach Austin's Taimanov preparation), verified against Lichess master database and Stockfish depth 25. This is work that takes ~4 hours and directly neutralizes the biggest risk identified in the GM brief.

---

## Implementation Status (Oct 30, 2026)

| Gap | Status | Output |
|---|---|---|
| Gap 1: Opening novelty trees | ✅ **Done** | `next-step/opening-novelty-trees.html` · `scripts/opening-novelty-data.json` |
| Gap 2: Deep Stockfish analysis | ⏳ Running (movetime-3000, background) | `scripts/*-analysis-results-deep.json` (Zachary ~50% complete; others queued) |
| Gap 3: Opponent coverage check | ✅ Done (flagged Heye/Zachary as possibly missing Oct games) | Noted in GM Brief |
| Gap 4: Clock usage analysis | ✅ Done | `scripts/clock-analysis-results.json` · `scripts/analyze-clock.js` |
| Gap 5: Austin's tactical pattern library | ⬜ Not started | — |
| Gap 6: Endgame drill document | ✅ Done | `next-step/austin-endgame-drills.html` |

**Key novelty-trees findings (Gap 1):**
- Taimanov 6.Ndb5: `d6 → e5 → a6` is 100% consensus at every step — zero branches to memorize
- Batrikov 6.g4: **0 master games** — not a prep gap, principled play (`d6` then `Nd7` or `d5`) is sufficient
- English Attack 6.Be3: `Bb4!` at 86% consensus — the pin is Austin's main weapon  
- Catalan Bogo vs Leo: `4...Qe7 → 5.g3 Nc6 → 6.Bg2 Bxd2+!` — delay exchange to move 6 (93% of masters confirm timing)
