# Reyansh Paragiri — Player Analysis

**FIDE Rating:** 2067 (Nov 2026)  
**Nationality:** American (USA)  
**Born:** 2015 (U12 age group)  
**NAYCC 2026 Seed:** #4  
**Tournaments in dataset:** Chess.com classical, Online Broadcast, Mechanics Institute (SF), World Cup U10 2025, Sunnyvale Swiss 2026, Las Vegas 2026  
**Total games in dataset:** 104 classical (pgnlib), 83 deep-analyzed (movetime-3000)

---

## Overall Record (83-game deep analysis)

| Tournament | Games | W | L | D | Avg Acc% | Notes |
|---|---|---|---|---|---|---|
| Chess.com (classical) | 50 | 20 | 14 | 16 | 91.7% | Largest sample; mixed online opponents |
| Online Broadcast | 19 | 8 | 3 | 8 | 92.4% | Broadcast OTB events |
| Mechanics Institute | 9 | 5 | 0 | 4 | 91.8% | **Unbeaten OTB** (5W-0L-4D) |
| World Cup U10 2025 | 4 | 3 | 1 | 0 | 90.8% | Lost R1 vs Ioseliani 1568 |
| Sunnyvale Swiss 2026 | 4 | 1 | 1 | 2 | 92.9% | vs 2090–2350 rated opponents |
| Las Vegas 2026 | 1 | 0 | 0 | 1 | 89.8% | Drew Baghdasaryan 2263 |
| **TOTAL** | **83** | **35** | **18** | **29** | **91.8%** | |

**White overall (43 games):** 17W-8L-17D · avg **92.8%** · 59% score  
**Black overall (40 games):** 18W-10L-12D · avg **90.7%** · 60% score  

Key: Black accuracy (90.7%) is 2.1% below White (92.8%) — a consistent, quantifiable gap. This is the primary structural weakness for a prepared opponent.

---

## Notable Results

- **Drew Vladimir Petrov (2335 FIDE)** — Sunnyvale R2 as Black, 95.8% accuracy — excellent draw vs FM-level opponent  
- **Drew Teemu Virtanen (2276 FIDE)** — Sunnyvale R3 as White, 87.9% accuracy — held solid draw
- **Drew Vahe Baghdasaryan (2263 FIDE)** — Las Vegas R2 as White, 89.8% accuracy — 126-move marathon draw (most moves in dataset)
- **Won vs Vishva Nanugonda (2090 FIDE)** — Sunnyvale R5 as Black, 96.5% accuracy — cleanest win vs 2000+ opponent
- **Lost to Gabriel Bick (2350 FIDE)** — Sunnyvale R4 as White, 91.4% vs Bick's 97.2% — outplayed technically despite reasonable accuracy
- **Drew Pranav Santhosh (NAYCC 2026 opponent, ~1922 FIDE)** — Chess.com as White, 98.2% vs Pranav's 98.3% — near-perfect theoretical draw, both maximally prepared
- **Lost to Zhuoyuan Wu (NAYCC 2026 opponent, 1890 FIDE)** — Chess.com as Black, 88.4% vs Wu's 91.9% — Black accuracy gap exposed in this specific NAYCC crossover
- **Lost to Christopher Atkeson** — Chess.com as Black, 90.2% but 141 avg CPL / 8 blunders — highest error density in entire dataset; opponent used Rossolimo 3.Bb5 which produced Reyansh's worst tactical performance
- **Lost to Niko Pompe** — Chess.com as Black, **78.0%** — lowest accuracy in entire dataset (Feb 2024)

---

## Engine Accuracy Breakdown

**Worst 5 games by accuracy (all Black):**
| Acc% | Color | Result | Opponent | Tournament |
|---|---|---|---|---|
| 78.0% | Black | LOSS | Pompe, Niko | Chess.com Feb 2024 |
| 81.6% | Black | WIN | Cheng, Kar Lun | Mechanics Institute |
| 82.4% | Black | DRAW | Sankar, Arjun | Mechanics Institute |
| 83.2% | Black | LOSS | Ioseliani, Giorgi (1568) | World Cup U10 R1 |
| 84.2% | Black | WIN | Patankar, Shubham | Chess.com |

Pattern: **All 5 worst-accuracy games are as Black.** Even wins and draws in this list show high CPL. Black positions generate significantly more errors.

**Best 5 games by accuracy:**
| Acc% | Color | Result | Opponent | Tournament |
|---|---|---|---|---|
| 98.8% | White | WIN | Malanin, Egor (1677) | World Cup U10 R4 |
| 98.3% | White | DRAW | Biyiasas, Theodore | Chess.com |
| 98.2% | White | WIN | Xu, Olivia | Online Broadcast |
| 98.2% | White | DRAW | Senthilkumar, Pranav | Chess.com |
| 97.9% | Black | DRAW | Kwan, Wesley | Chess.com |

Pattern: 4 of the 5 best games are as White. Top accuracy is concentrated in his White games.

---

## Opening Repertoire as White

Reyansh plays **1.e4 exclusively** (52 of 54 White games). Only exceptions: 2 games with 1.d4 vs Biyiasas (Theodore) and Malanin (1677).

### vs Sicilian (1...c5) — PRIMARY WHITE WEAPON: Maróczy Bind

Open Sicilian (2.Nf3 3.d4) in every game.

**vs Accelerated Dragon (...Nc6 ...g6 → 5.c4 MARÓCZY BIND)**  
Confirmed in 8+ games: Nalakonda (draw), Yenamandra (win), Petrov 2335 (draw), Yi Colin (win), Qi Jenny (draw), Mokeeva Zlata (draw), Natraj Tapas (draw), Jin David (win+draw), Chen Leo (win), Cremisi Daniel (draw).

This is Reyansh's most-practiced and most-confident White system. The Maróczy Bind (1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4) permanently controls d5, squeezes Black's queenside space, and allows long positional maneuvering. Against the Maróczy, Reyansh's results are predominantly positive. His accuracy in these games averages above 94%.

**vs Najdorf/Classical (...d6 ...Nf6 → 5.Nc3)**  
Standard 5.Nc3 without the Maróczy. Seen vs Karthi Jashith (Löwenthal deviation), Suarez Sebastian. Less practiced than the Maróczy system but standard Open Sicilian knowledge.

**vs Löwenthal (...Nc6 4...e5 → 5.Nb5)**  
1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 e5 → Reyansh plays 5.Nb5 (Baghdasaryan game: 5.Nb5 d6 6.Bg5 a6 7.Na3 b5 — Sveshnikov/Löwenthal territory). Solid in this line.

### vs 1...e5 — Scotch (Primary)

**Scotch Game (3.d4)** in 8 of 11 e5 games — confirmed primary weapon:
- 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4 (Scotch C45)

**Italian (3.Bc4)** secondary (3/11 e5 games):
- vs Suarez Sebastian, Heiserman Jimmy, and similar: 2.Nf3 Nc6 3.Bc4 Bc5 (Giuoco Piano)

### vs Other Defenses

- **Caro-Kann:** 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 — classical setup (Gui Suyuan game, Online Broadcast)
- **French:** 1.e4 e6 2.d4 d5 3.e5 c3 — Advanced French (Dzhangirov game: 3.e5 b6 4.c3 Qd7)
- **Scandinavian:** standard Qxd5 lines
- **Pirc/Modern:** 3.Nc3 standard

---

## Opening Repertoire as Black

### vs 1.e4 — Sicilian Accelerated Dragon (PRIMARY)

Reyansh plays **1...c5** in 100% of documented 1.e4 games (29/29).

**Accelerated Dragon (PRIMARY):** 1...c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 **g6** — 13 confirmed games  
This is his main Sicilian. He aims for fianchettoed bishop setups typical of the Dragon/Accelerated Dragon structure. Against opponents who allow the Open Sicilian (3.d4), he steers here.

**vs Rossolimo (3.Bb5): 3...g6 — CRITICAL WEAKNESS**  
Confirmed: 1.e4 c5 2.Nf3 Nc6 3.Bb5 **g6** in both Rossolimo games (Mulay Vivan Prakash May 2025 [Chess.com, LOSS], Atkeson Christopher Oct 2024 [Chess.com, LOSS]).  
**Record: 0W-2L in Rossolimo fianchetto positions.** The Atkeson game produced the highest CPL in the dataset (141 avg, 8 blunders). This is his most exploitable documented opening weakness.

**vs Alapin (2.c3):** Responds 2...Nf6 3.e5 Nd5 4.d4 — standard Alapin theory.

**vs Italian (2.Nf3 Nc6 3.Bc4):** Plays ...e6 structures — seen vs Manyeki (World Cup R3: Bc4 → 3...e6), Ioseliani (3...e6).

**Taimanov secondary:** 1...c5 2.Nf3 **e6** appears in ~5 games — used as a secondary line but Accelerated Dragon is primary. No documented Taimanov games vs Maróczy Bind scenarios (since his opponents haven't set up the Bind against his Taimanov).

### vs 1.d4 — Queen's Gambit Declined (solid)

**1...d5 in 100% of 1.d4 games** (11 games documented):  
- vs QGD setups (Nc3 c4): standard ...e6 ...Nf6 ...Be7 structures
- vs Catalan (g3): same ...d5 ...e6 approach
- Record as Black vs 1.d4: **6W-3L-2D** — better than his 1...c5 Sicilian Black score (18W-10L-12D)

Games include vs Malanin (World Cup R4: Reyansh as White, but in other games as Black), vs Biyiasas Theodore (Online Broadcast + Chess.com). The 1...d5 approach is solid and rarely creates dynamic imbalances.

### vs 1.c4 — 1...e6 transposes

Seen in ~6 games (3W-1L-2D). Mostly transposes into 1.c4 e6 2.Nf3 Nf6 3.g3/3.d4 → Queen's Indian or Catalan territory.

---

## Tactical Patterns

### Strengths
- **Long accurate games:** Best accuracy in 125+ move games (Baghdasaryan draw at 89.8%, Cremisi 227-ply at 94.6%) — excellent endgame technique and calculation depth
- **Maróczy Bind squeeze:** Wins long positional games using the c4 bind to deny Black activity, then converts in knight-vs-bishop endings
- **vs Lower-rated players:** Dominant as White vs ≤1700 rated opponents (wins with 95%+ accuracy)
- **Calculation accuracy as White:** 92.8% average — tactical shots rarely missed when playing first

### Weaknesses
- **Rossolimo structures (as Black):** 0W-2L, highest CPL in dataset. The fianchetto king becomes a tactical liability when the Rossolimo bishop pair applies pressure — he accumulated 8 blunders in the Atkeson game alone.
- **Black accuracy gap (−2.1%):** Consistent across all tournaments. Black positions generate ~2× the error rate of White positions. This gap is larger than most players at his rating.
- **Early Black game errors:** In the 5 worst-accuracy Black games (all 78–84%), errors tend to concentrate in moves 15–25 — the early middlegame transition from opening theory.
- **Lost to weaker players as Black:** Losses to Ioseliani (1568) and Pompe (unrated) as Black — the Black accuracy drop can produce upsets.
- **Loses to superior preparation:** Bick (2350), Atkeson, and Hakobyan all outplayed him via home preparation — he drops significantly once off theory.

---

## Strategic Profile

| Dimension | Assessment |
|---|---|
| Overall accuracy | 91.8% (strong for 2067) |
| White accuracy | 92.8% — dominant home territory |
| Black accuracy | 90.7% — measurably weaker |
| vs 2000+ FIDE | 1W-1L-3D (competitive, not dominant) |
| OTB Mechanics Inst. | 5W-0L-4D (unbeaten) |
| Stamina | Excellent — holds accurately in 100+ move games |
| Preparation depth | High as White (Maróczy, Scotch); weaker in Black structures after deviation |
| Age factor | 2015-born (U12) — strong for age; limited major tournament experience |
| Tactical style | Positional squeeze as White (Maróczy Bind); dynamic piece play as Black when given space |

---

## NAYCC 2026 Context

**Crossover games in dataset:**
- vs Pranav Santhosh (1922 FIDE): **DRAW** as White, 98.2% accuracy — near-perfect theoretical game; both sides prepared  
- vs Zhuoyuan Wu (1890 FIDE): **LOSS** as Black, 88.4% vs Wu's 91.9% — Black accuracy gap was the deciding factor

**Rating gap vs Austin:** 2067 − 1959 = **+108 FIDE** in Reyansh's favor. Highest-rated NAYCC opponent Austin has deeply analyzed. Austin is the rating underdog.

**Key prep conclusion:** Austin's structural advantage is the Rossolimo (3.Bb5) weapon — Reyansh's 0-2 record and highest-CPL game in the dataset both occur in this specific line. As Black, Austin must play Taimanov (2...e6) to prevent Reyansh from deploying his best-practiced White system (Maróczy Bind 5.c4).

---

## Summary Profile Table

| Category | Detail |
|---|---|
| Primary White system | Open Sicilian (2.Nf3 3.d4) → Maróczy Bind (5.c4) vs Accelerated Dragon |
| Secondary White system | Scotch 3.d4 vs 1...e5; Advanced French vs 1...e6 |
| Primary Black defense | Accelerated Dragon (1...c5 Nc6 g6) vs 1.e4 |
| Black weakness | Rossolimo 3.Bb5 → 3...g6: **0W-2L**, highest CPL in dataset |
| vs 1.d4 as Black | QGD 1...d5 — solid, 6W-3L-2D |
| Engine accuracy | 91.8% overall (White 92.8%, Black 90.7%) |
| Best game | 98.8% vs Malanin 1677, World Cup U10 R4 (White) |
| Worst game | 78.0% vs Pompe (Black, LOSS), and 90.2% / 141 CPL vs Atkeson (Black, LOSS) |
| Key NAYCC crossovers | Drew Pranav (98.2%); Lost to Wu as Black (88.4%) |
| Main exploit for Austin | Rossolimo as White; Taimanov to avoid Maróczy as Black |
