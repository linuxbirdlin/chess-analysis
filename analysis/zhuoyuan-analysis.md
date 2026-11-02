# Zhuoyuan Wu — Chess Analysis Report

**Rating:** 1890 FIDE (Nov 2026) · Seed #10 NAYCC 2026 · USA
**Engine analysis:** 46 games, movetime-3000 · `scripts/zhuoyuan-analysis-results-deep.json`
**Tournaments:** World Schools 2026 (7g), 59th Stamer 2025 (2g), 53rd Capps 2025 (4g), 24th Addison 2025 (2g), SnoopChess Mixed 2024–2026 (32g)

---

## 1. Overall Results

| Tournament | As White | As Black | Total |
|---|---|---|---|
| World Schools 2026 | 1W–1L–1D (3g) | 2W–1L–1D (4g) | 3W–2L–2D |
| 59th Stamer Memorial 2025 | 0W–0L–0D | 0W–2L (2g) | 0W–2L |
| 53rd Capps Memorial 2025 | 1W–0L–2D (3g) | 0W–0L–1D (1g) | 1W–0L–3D |
| 24th Addison Memorial 2025 | 1W–0L (1g) | 0W–0L–1D (1g) | 1W–0L–1D |
| SnoopChess Mixed (2024–26) | 4W–6L–4D (14g) | 5W–7L–4D (16g†) | 9W–13L–8D |
| **Combined** | **7W–7L–7D (21g)** | **7W–9L–9D (25g)** | **14W–16L–16D** |

*† One SnoopChess black game (vs Heiserman) was a draw with 98.7% — Zhuoyuan's best single game.*

**Engine accuracy summary:**
- Overall avg: **91.9%** (46 games, excl. 1 incomplete)
- As White avg: **91.2%** (21 games)
- As Black avg: **92.5%** (25 games)
- Best game: 98.7% (SnoopChess vs Heiserman, draw)
- Worst game: 74.7% (SnoopChess vs Srinivasan, loss — 3B/3M)
- Total blunders: **29** | Total mistakes: **43** (high — avg 0.63 blunders/game)

---

## 2. Opening Repertoire

### As White — 1.e4 exclusively

| Opponent System | Variation Played | Record | Notes |
|---|---|---|---|
| French (1...e6) | Tarrasch 3.Nd2 → 4.e5 Nfd7 5.c3 c5 6.f4 | 1W (WS R2 vs 1691) | h4-h5 kingside storm |
| Caro-Kann (1...c6) | Exchange 3.exd5 cxd5 4.Bd3 → Ne5 + f4 | 0W–1L–1D (WS R5, R8) | 5 blunders in R5 vs 1969 |
| Sicilian (1...c5) | Likely Open Sicilian — no classical ECO data | Unknown | SnoopChess unrecorded |

**White opening notes:**
- Aggressive attacking style: Tarrasch with f4-h4-h5 pawn storm, Exchange CK with Ne5/f4.
- Critical White vulnerability: B13 Exchange CK crumbled completely vs 1969-rated Meneses (WS R5) — 5 blunders from an equal position under time pressure.
- No observed Sicilian White repertoire in classical games — opponent must improvise vs Austin's Taimanov.

### As Black — Sicilian Dragon / Accelerated Dragon primary

| Opponent System | Variation Played | Record | Notes |
|---|---|---|---|
| 1.e4 (Open Sicilian) | B34 Sicilian Accel. Dragon (2...Nc6 3...g6) | 1W–0L (WS R3 win vs 1866) | 93.3% acc |
| 1.e4 (Classical) | B73 Dragon Classical | 0W–0L–1D (WS R7 draw vs 1929) | 94.6% acc |
| 1.d4 | 1...Nf6 + ...d5 + ...g6 (Rapport-Jobava D01 response) | 1W (WS R1 win vs 1690) | 97% acc |
| 1.c4 | English Closed/symmetric (A26) | 0W–1L (WS R6 loss vs 1971) | 87.1% acc |

**Black opening notes:**
- Primary weapon: Sicilian with ...Nc6 and ...g6 fianchetto (Accelerated Dragon / Dragon structure).
- Strongest Black performance: vs 1.d4 Rapport-Jobava (97%) and Dragon (93–95% range).
- Weakest Black performance: A26 English Closed (87.1%, 2 blunders, loss vs 1971).
- Stamer R4 vs Bhaduri 2162: 92.3% but 5 blunders — accuracy ceiling against 2100+ opponents has structural holes.

---

## 3. Tactical Patterns

### Strengths
- **Dragon fianchetto structures**: Comfortable in long maneuvering Sicilian Dragon positions (B34/B73). Knows ...Ne5-...Nc4 piece rerouting.
- **Endgame technique in won positions**: WS R1 vs 1690 — converted a rook endgame cleanly at 97%.
- **Opening preparation depth**: WS R3 win vs 1866 shows solid Dragon theory knowledge.

### Weaknesses — Confirmed by Engine Data

**Critical pattern #1 — Time pressure blunder chain as White**
WS R5 vs Meneses Morales (1969): Equal position at move 24. Then:
- Move 25 h4? (inaccuracy, clock ~4:17 remaining)
- Move 28 Rc1? (inaccuracy, clock 1:24)
- Move 29 **Qf3??** (eval +0.2 → -4.9, clock 1:15) — decisive blunder
- Move 30 **Ne2?** (eval → -8.5, clock 0:13) — game over

Pattern: From equal position → time scramble → catastrophic collapse (5 blunders total). This is his most dangerous documented failure mode.

**Critical pattern #2 — Accuracy floor vs 2100+ opponents**
Stamer R4 vs Bhaduri (2162): 5 blunders as Black despite 92.3% average. Strong opponents trigger calculation errors that don't appear against 1700–1900 range.

**Critical pattern #3 — Rapid evaluation collapses**
Two worst games (74.7%, 79.7%) both involve positions that look manageable but collapse when Zhuoyuan must calculate concrete forcing lines. The 74.7% game had +4.95 eval for him at the point he started blundering — he was winning and still blundered.

---

## 4. Strategic Notes for Austin

- **Must-win**: Austin is +69 FIDE. Any result short of a win is a significant setback.
- **Time pressure exploit**: Steer into complex positions by move 20-25. Zhuoyuan's clock management breaks down and his blunder rate spikes.
- **Austin as White**: Rossolimo 3.Bb5 sidesteps Zhuoyuan's Dragon preparation. Zhuoyuan knows Dragon from both sides — do NOT enter standard Dragon positions. Rossolimo forces him into unfamiliar territory.
- **Austin as Black**: Zhuoyuan's 1.e4 + Tarrasch/Exchange CK setup means he likes aggressive pawn structures. Austin's Taimanov (Nc6, e6) avoids both his favorite anti-French and anti-CK setups.

---

## 5. Summary Profile

| Attribute | Value |
|---|---|
| FIDE (Nov 2026) | 1890 |
| NAYCC 2026 seed | #10 |
| Engine avg (46g) | 91.9% |
| Blunders/game | 0.63 (high) |
| Best format | Black in Dragon structures |
| Worst format | White under time pressure (B13 5-blunder game) |
| Highest-rated win | vs Capps R02: Silva 2005 (96.7% acc Black win) |
| Best accuracy | 98.7% vs Heiserman (draw) |
| Worst accuracy | 74.7% vs Srinivasan (loss) |
| Key vulnerability | Time pressure → blunder chain from equal positions |
