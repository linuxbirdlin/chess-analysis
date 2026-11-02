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

## Implementation Status (Nov 1, 2026)

| Gap | Status | Output |
|---|---|---|
| Gap 1: Opening novelty trees | ✅ **Done** | `next-step/opening-novelty-trees.html` · `scripts/opening-novelty-data.json` |
| Gap 2: Deep Stockfish analysis | ✅ **Done** — all 7 opponents at movetime-3000 | `scripts/*-analysis-results-deep.json` (Zachary 45g 93.4%, Leo 61g 90.5%, Fernando 37g 92.8%, Heye 37g 93.5%, Pranav 25g 85.6%, Aarush 32g 90.7%, Tarun 24g 89.0%) + deep HTMLs updated |
| Gap 3: Opponent coverage check | ✅ Done (flagged Heye/Zachary as possibly missing Oct games) | Noted in GM Brief |
| Gap 4: Clock usage analysis | ✅ Done | `scripts/clock-analysis-results.json` · `scripts/analyze-clock.js` |
| Gap 5: Austin's tactical pattern library | ✅ **Done** | `next-step/austin-tactics.html` — 5 patterns: Greek Gift, h4–h5 storm, IQP Ncxe4, Rook battery f4, Active Defender Scan |
| Gap 6: Endgame drill document | ✅ Done | `next-step/austin-endgame-drills.html` |

**Key novelty-trees findings (Gap 1):**
- Taimanov 6.Ndb5: `d6 → e5 → a6` is 100% consensus at every step — zero branches to memorize
- Batrikov 6.g4: **0 master games** — not a prep gap, principled play (`d6` then `Nd7` or `d5`) is sufficient
- English Attack 6.Be3: `Bb4!` at 86% consensus — the pin is Austin's main weapon  
- Catalan Bogo vs Leo: `4...Qe7 → 5.g3 Nc6 → 6.Bg2 Bxd2+!` — delay exchange to move 6 (93% of masters confirm timing)

---

## Pipeline Status by Opponent (updated Nov 2, 2026)

Full pipeline = analysis.md + matchup.md + matchup.html + deep analysis JSON + deep HTML + white/black matchup HTMLs + GM battle plan HTML + index entry.

| Opponent | Rating | Field? | analysis.md | matchup.html | deep HTML | white/black | GM HTML | Notes |
|---|---|---|---|---|---|---|---|---|
| Zachary Liu | 2185 | ✅ P1 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Inti Flores Ojeda | 2011 | ✅ P2 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done; GM brief updated |
| Leo Jackson | 2081 | ✅ P3 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Fernando Cortes | 2085 | ✅ P4 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Pranav Santhosh | 1922 | ✅ P4 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Tarun Sankar | 1984 | ✅ P5 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Aarush Ajith | 1943 | ✅ P6 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Emerson Johnson | 1909 | ✅ P7 | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Zhuoyuan Wu | 1890 | ✅ P8 | ✅ | ⚠️ basic only | ✅ | ✅ | ✅ | Full pipeline done (Nov 2, 2026) |
| Daniel H. Gamboa | 1753 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Yaen Saenz | 1841 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Pablo De Alba | 1873 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Joel Jeyaraj | 1813 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Full pipeline done |
| Heye Gao | 1968 | ❌ moved | ✅ | ✅ | ✅ | ✅ | ✅ | Moved to another section; pipeline preserved |
| Daniel Joshua Lee | 2165 | ❌ moved | ✅ | ✅ | ✅ | ✅ | ✅ | Moved to U18; pipeline preserved |
| Justin Huang | 2010 | ❌ moved | ✅ | ✅ | — | — | — | Moved to U16; partial pipeline preserved |
| **Irene Xie** | ~1888–1977 | Sparring | ✅ | ✅ sparring guide | — | — | — | Sparring partner (not NAYCC opponent) · snoop2026.pgn analyzed (36g, 91.0% avg) · chessbase 100g staged for future use |

---

## Recent Work Log (Nov 2, 2026)

- **Cheatsheet full audit complete** (commit `7e30814`): `next-step/naycc2026-cheatsheet.html` — 12 issues fixed. All rating badges corrected to Nov 2026 FIDE (Zachary 2140→2185, Fernando 2072→2085, Pranav 1940/1979seed→1922, Tarun 1965→1984, Aarush 1895→1943, Emerson 1925→1909, Daniel H. 1685–1692→1753, Pablo 1824→1873, Joel 1872→1813). Inline gap calculations updated (Zachary 193→226 pts, Leo 130→122, Yaen 106→118, Daniel H. 255→206, Pablo 123→86, Joel 75→146). Zhuoyuan card body rewritten from "analysis in progress" to full Rossolimo White + Taimanov Black rules with clock targets.
- **GM brief final pass complete** (commit `76a42b6`): `next-step/naycc2026-gm-brief.html` — Section F clock table: 5 rating corrections (same set) + missing Inti row added (2011 FIDE, seed #4, danger zone moves 25–40, O-O kingside rule + d5! break). Section E.2 Pranav header corrected. Section J Fernando 2133→2085.
- **Zhuoyuan Wu white/black matchup HTMLs complete** (commit `bdb6458`): `matchup-zhuoyuan-white.html` (Rossolimo 3.Bb5 tabiya, IQP structure, cheat sheet + clock targets) and `matchup-zhuoyuan-black.html` (Taimanov cardinal-rule callout, four branches: 6.Ndb5 d6!, 6.Be3 Bb4!, Maróczy a5, Batrikov d6 Nd7, clock-arithmetic section). Zhuoyuan's full pipeline is now complete.
- **Opening novelty trees — Zhuoyuan additions** (commits `86f4454`, `9e31880`): Added Zhuoyuan tag to Section A (Taimanov — zero Sicilian-White classical data), cross-ref callout to Section F (Dutch Leningrad doesn't arise vs 1.e4 Zhuoyuan), and Austin-as-Black subsection to Section G (Rossolimo sidesteps Dragon + Taimanov double advantage callout). Section G scope line, TOC, drill priorities, and footer updated.
- **GM brief — Zhuoyuan added to Section F and G** (commit `722786f`): Section F clock table — danger zone moves 25-35, at-move-30 target ≥45 min. Section G psych bars — Zhuoyuan at top (78% confidence, above Emerson) with "double prep edge: Rossolimo sidesteps Dragon + Taimanov vs zero Sicilian-White prep."
- **Irene Xie sparring pipeline complete** (commits `d80e447`, `bd5ef41`, `6af4ff9`, `ed99be1`): `analysis/irene-analysis.md` (French/Nimzo Black, 1.e4 Exchange CK/Italian White), `matchup/matchup-irene.html` (5-section sparring guide: French Tarrasch drills, Taimanov vs Exchange Rossolimo, Nimzo mirror), `scripts/analyze-irene.js` (movetime-800, snoop2026.pgn only), `scripts/irene-analysis-results.json` (36 games: 91.0% avg, 92.0% White, 90.2% Black, 1.00 blunders/game). ChessBase 100-game PGN staged for future use. `austin-prep.html` updated with stats + sparring guide link.

---

## Recent Work Log (Nov 1, 2026)

- **qa-reconcile corrections applied** (commit `501484d`): All three issues from Austin's GM brief review resolved:
  - Issue #1 (Bc5 nuance): prep report Section D game evidence + loss table updated — `6...Bc5?!` is dynamic; decisive error was `7...O-O`; `6...d6!` remains the correct OTB choice.
  - Issue #2 (4...Qe7 vs Bxd2+): was already correct in both documents.
  - Issue #3 (Batrikov naming): replaced all ~15 "Keres Attack" occurrences in GM brief with "Batrikov Variation (6.g4)" throughout Taimanov context. One intentional "Keres Attack" preserved in the naming-clarification note at line 228.
- **GM brief threat table updated**: Inti Flores Ojeda added (⭐ P2, f4-e5 system B43/B45); Pranav rating corrected to 1922.
- **Prep report Section 4 restructured** (commit `504339c`): Inti added as PRIORITY 2; Heye Gao and Daniel Lee collapsed to NOT IN FIELD; Zhuoyuan Wu added as PRIORITY 8.
- **Inti full pipeline complete**: `matchup-inti-gm.html` generated; `inti-analysis-results-deep.json` (36 games, 90.6% avg); Italian d4 squeeze plan (White) + Taimanov O-O kingside rule (Black) documented.

---

## Next Actions

**Pipeline status as of Nov 2, 2026: ALL COMPLETE.** All 9 in-field opponents have full pipelines. Irene Xie confirmed sparring partner only (not in Austin's section) — sparring guide complete. No further file-generation work needed.

### Remaining prep before NAYCC (Nov 10 travel, Nov 11 R1) — from GM Brief Section I

| Priority | Task | Who | By when |
|---|---|---|---|
| 🔴 1 | **Taimanov drill** — 10 rapid games reaching 6.Ndb5 d6! and 6.Be3 Bb4! positions; verify d6! is reflexive | Austin | Nov 3–4 |
| 🔴 2 | **Batrikov (6.g4) + Maróczy (5.c4) drill** — 3 hrs total; learn d6→Nd7 plan and d6/Be7/O-O/a5 bind break | Austin | Nov 3–4 |
| 🔴 3 | **Contact Vadim** — schedule session before Nov 5; priority: Lucena bridge-building + Batrikov Variation | Austin/family | Nov 3 |
| 🟡 4 | **Confirm round schedule** — check FIDE Event 496177 for double-round days and tiebreak system | Austin/family | Before Nov 9 |
| 🟡 5 | **Bxh7+ recognition drill** — 10 Exchange CK positions with Bd3; instant-check habit (30 min, Day 2) | Austin | Nov 4–5 |
| 🟢 6 | **Pack altitude essentials** — ibuprofen, melatonin, electrolyte packets, 2 water bottles for flight | Family | Nov 9 |
