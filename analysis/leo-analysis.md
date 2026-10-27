# Leo Jackson — Player Analysis

## Background

Leo Daniel Olivera Jackson is a junior player based in the Americas, competing at international youth events (Pan American, World U12, North American U20, American Continental, and NAYCC 2026). He is currently rated approximately **2077 FIDE** (estimated post-Queretaro Oct 2026; was 2009 at PAM entry, 1886 at Am Continental Jun 2026). His rating trajectory — 1731 → 1886 → 2009 → ~2077 in under a year — marks him as one of the fastest-improving players in the NAYCC 2026 U14 field.

The dataset now contains **60 games** across 10 tournaments and 3 time controls (PAM 2026 and Queretaro 2026 added Oct 2026). This analysis uses all time controls for pattern recognition but notes where classical, rapid, and blitz differ.

---

## Overall Record by Tournament

### Classical Games

| Tournament | Date | Rating | Score | Record |
|---|---|---|---|---|
| Queretaro 2026 (Expertos) | Oct 2026, Mexico | 2009 | ~4/6* | 3W–1L–2D |
| PAM 2026 (O14) | Jul 2026, — | 1878 | 3/8 | 4W–4L–0D |
| American Continental 20th | Jun 2026, Oaxtepec | 1886 | 3.5/9 | 2W–4L–3D |
| North American U20 Championship | Dec 2025, Oaxtepec | 1731 | 2.5/8† | 2W–5L–1D |
| World U12 Championship | Sep 2025, Almaty | 1887 | 0.0/1‡ | 0W–1L–0D |
| Charlotte Carolinas Open | Jun 2025 | ~2000 US Chess | 1.0/1 | 1W–0L–0D |
| Pan American U12 (34th) | Jul 2024, Orlando | 1746 | 0.0/1 | 0W–1L–0D |
| **Classical total** | | | **15/34** | **12W–16L–6D** |

*6 rounds recorded in dataset; full tournament may have had more rounds.
†R3 of NA U20 not in file.
‡One game recorded for World U12 (R6 only).

### All Time Controls Combined

| Tournament | Time Control | Score | Record |
|---|---|---|---|
| Queretaro 2026 (Expertos) | Classical (60+30) | ~4/6 | 3W–1L–2D |
| PAM 2026 (O14) | Classical | 3/8 | 4W–4L–0D |
| Am Continental 20th | Classical | 3.5/9 | 2W–4L–3D |
| Am Continental Rapid 20th | Rapid | ~3.5/8 | 3W–4L–1D |
| Am Continental Blitz 20th | Blitz | ~3.0/8 | 2W–4L–2D |
| NA U20 Championship | Classical | 2.5/8 | 2W–5L–1D |
| NA U20 Blitz Open | Blitz | 4.0/8 | 3W–3L–2D |
| World U12 | Classical | 0.0/1 | 0W–1L–0D |
| Charlotte Carolinas Open | Classical | 1.0/1 | 1W–0L–0D |
| Pan American U12 | Classical | 0.0/1 | 0W–1L–0D |

### Results by Color (Classical Only — Updated)

| Color | W | L | D | Score% |
|---|---|---|---|---|
| White | 5 | 9 | 3 | 30% |
| Black | 7 | 6 | 4 | 53% |

**Key insight:** Leo scores dramatically better as Black (53%) than as White (30%) in classical games. This is the reverse of most players' color preference. His French Defense as Black is more effective than his Catalan as White for converting points.

---

## Opening Repertoire

### As White (Classical)

Leo plays **1.d4 2.c4** in all classical games, with a consistent **Catalan setup** (3.Nf3 with g3/Bg2) as his primary weapon. This is confirmed across PAM 2026 and Queretaro 2026 as well.

| System | Moves | Occurrence | Notes |
|---|---|---|---|
| Open Catalan | 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3 dxc4 5.Bg2 | 4+ games | Core weapon; PAM R7 vs Liu (2167) same structure |
| Catalan vs QGD | 1.d4 d5 2.c4 e6 3.Nf3 Nf6 4.g3 Be7 5.Bg2 | 3+ games | Queretaro R5 (1.d4 d5 2.c4 e6 3.Nf3 a6 4.g3 dxc4) |
| Queen's Indian | 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 | 2 games | vs QI setups |
| Bogo-Indian 5.Nbd2 | 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3 Bb4+ 5.Nbd2 | 1 game | Queretaro R3 vs Vasquez (2081) — drew |
| Grünfeld Exchange | 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 | 1 game | Outlier; lost to Osorio (2246) — not his repertoire |

**Critical note for Austin:** Leo consistently plays **3.Nf3** rather than **3.Nc3**, which *prevents the Nimzo-Indian*. Austin's main d4 defense (Nimzo Bxc3+/b6/Ba6) requires 3.Nc3. Against Leo, Austin should prepare **Queen's Indian (3...b6)** or **Open Catalan (3...d5 dxc4)** instead.

**1.f4 (Bird's Opening):** Leo uses Bird's extensively in **blitz and rapid** games but **0 classical games**. Not a NAYCC concern.

### As Black (Classical)

Leo plays **1...e6** in response to both 1.e4 and 1.d4.

| Situation | System | ECO | Record | Notes |
|---|---|---|---|---|
| vs 1.e4 | French Defense | C00/C02/C07/C12 | 5W–5L–1D | 100% consistent — confirmed Queretaro 2026 |
| vs 1.d4 | Dutch-type (...e6 + ...f5) | A83–A84 | 0W–3L–2D | Am Continental data |
| vs 1.Nf3/1.d4 Catalan | QGD/Bogo structure | D02 | 1W–1L–0D | 1...d5 2...Nf6 3...e6 4...Bb4+ |

**vs 1.e4 (French Defense) — CONFIRMED PRIMARY:**
Leo plays the French in 100% of recorded 1.e4 games. Queretaro 2026 provides the clearest specific line data:

- **Advance French (3.e5):** Leo plays **3...c5 4.c3 Qa5** — the critical Milner-Barry-adjacent line. Source: Queretaro R4 vs Ruiz Perez (2126), C02. Leo lost (91.7% vs 97.5%), but the opening choice was deliberate.
- **Tarrasch (3.Nd2) — Chistyakov Defense:** Leo plays **3...c5 4.exd5 Qxd5** — the most aggressive Tarrasch response. Source: Queretaro R7 vs Nipita Medina (2098), C07. **Leo won with 96.2% accuracy** — his best Queretaro result.
- **KIA/Irregular (2.d3):** When White avoided mainlines, Leo played solid French setup and drew vs Rodriguez Rivera (2136), C00, with 94.8% accuracy.
- **Exchange French (3.exd5):** Comfortable — won vs Cruz Vargas (1648) in 134 moves.

**CRITICAL FOR AUSTIN:** Austin plays 1.e4 exclusively and his repertoire includes both Advanced French (3.e5) and Tarrasch (3.Nd2). Leo is deeply prepared in **both** lines as Black. The specific variations to watch:
- vs 3.e5: Leo plays 3...c5 4.c3 Qa5 — Austin must know the 4.c3 Qa5 5.Nf3 Bd7 6.Be2 Nc6 theory cold
- vs 3.Nd2: Leo plays 3...c5 4.exd5 Qxd5 — Austin must avoid simplifications; this equalizes quickly

**vs 1.d4 (Dutch-type structure):**
In Am Continental data, Leo plays 1...e6 2...f5 Dutch setup (0W–3L–2D). However, in Queretaro R2 vs Del Rosario Silva (1.Nf3 d5 2.d4 Nf6), Leo played **1...d5 2...Nf6 3...e6 4...Bb4+ Bogo-Indian** and won (87.4%, vs 2125). This may reflect flexibility depending on opponent's move order.

---

## Tactical and Strategic Patterns

### Strengths

**1. Endgame technique — exceptional in long games**

Leo's defining characteristic is his ability to play and win (or hold draws in) extremely long technical games:
- Am Continental R2: **Win in 152 moves** vs Martinez Castaneda (2061) as White
- Am Continental R3: **Draw in 149 moves** vs Alfaro Caracas (2118) as Black
- NA U20 R8: **Win in 134 moves** vs Cruz Vargas (1648) as Black
- Am Continental R8: **Draw in 117 moves** vs Monroy Lopez (2062) as Black
- Rapid R4: 170 moves vs Galvan Rodriguez (1545) — very long even against weaker opposition
- Rapid R2: 204-move game vs Martinez Nestor (1823)

This pattern directly mirrors Emerson Johnson's profile: Leo is an endgame specialist who grinds long technical games.

**2. Defense against higher-rated opponents**

Leo drew multiple 2000–2100 rated opponents as Black:
- Drew Alfaro Caracas (2118) in 149 moves — Am Continental R3
- Drew Fogo Esquivel (2090) as White — Am Continental R4
- Drew Monroy Lopez (2062) as Black — Am Continental R8
- Drew Angeles Vera (1904) as White — NA U20 R2

These draws were all achieved through patient, solid defense rather than tactical victories.

**3. French Defense solidity**

As Black vs 1.e4, Leo's French provides reliable, concrete positions. He has not been blown out of the opening against significantly stronger opponents — even the losses (to 2109, 2144, 2190) were long games where the position degraded gradually, not early tactical collapses.

### Weaknesses

**1. Losing as White to lower-rated opponents**

- NA U20 R5: Lost as White (1731) to Estrada (1609) — an ~120-rating-point upset
- Am Continental R9: Lost as White (1886) to Linares (2021) — White is expected to press; a neutral or winning position was not converted
- Am Continental R6: Lost in 138 moves as White to Osorio (2246) after entering unusual Grünfeld Exchange territory

**2. Catalan as White struggles to win**

Classical White record (updated): 5W–9L–3D = 30% score. PAM 2026 added 1W–4L (only beat Liem 1641; lost to Gao 2065, Castillo 1929, Liu 2167, and even Mintz 1665). The pattern is consistent: Leo's Catalan is technically sound but does not generate decisive winning chances vs prepared opponents. When his calculated plan doesn't work, he loses. Austin should fight for the win as Black — Leo is beatable on the White side.

**3. Dutch-type structure as Black vs 1.d4**

In the ...e6+...f5 Dutch, Leo scores 0W–3L–2D in classical. This is not a strong choice. However, Leo also demonstrated the Bogo-Indian (Bb4+) vs Catalan setups — so his 1.d4 defense may be evolving.

**4. Blunder chains under complexity**

Queretaro R2 win (87.4%, 5 blunders in 148 moves) shows Leo can blunder in long, complex games even while winning. The game had multiple positional blunders in the endgame (h4+?? letting White back in at move 60) before Leo recovered. This is the tactical moment Austin should manufacture: complex positions where small errors compound.

**5. 2100+ barrier (mostly historical)**

Previous classical results vs 2100+: 0W–5L–2D. However, Queretaro 2026 shows meaningful progress: Drew Rodriguez Rivera (2136) with 94.8%, Drew Vasquez Jimenez (2081) with 92.0%, Won vs Nipita Medina (2098) with 96.2%. Leo is now capable of beating 2000+ players and drawing 2100+ — the 2100 ceiling is nearly broken.

---

## Key Game Summaries

### 1. Am Continental R2: Leo–Martinez Castaneda (2061) 1–0 (152 moves)

Leo White. 1.d4 Nf6 2.c4 e6 3.Nf3 c5 4.d5 b5 — opponent played Benko Gambit-type approach. Leo kept material balance and converted a long endgame advantage in 152 moves. This is Leo's signature win type — endgame technique over a 2061 opponent.

### 2. Am Continental R3: Alfaro Caracas (2118)–Leo ½–½ (149 moves)

Leo Black. 1.d4 e6 2.c4 f5 — Leo played his Dutch-type system. Despite facing a 2118 opponent (~230 points higher), Leo held a draw through 149 moves. Shows his defensive endgame resilience.

### 3. NA U20 R8: Cruz Vargas (1648)–Leo 0–1 (134 moves)

Leo Black. Exchange French or similar — this was a 134-move endgame where Leo as Black ground down a 1648-rated opponent. Confirms Leo's endgame strength even with Black.

### 4. NA U20 R5: Leo–Estrada (1609) 0–1

Leo White, rated 1731, losing to a 1609 opponent as White. This is the most telling upset — it suggests that when Leo does not create lasting imbalances from the opening as White, lower-rated opponents can outplay him in tactical moments. This is the exact scenario Austin excels at.

### 5. Am Continental R8: Monroy (2062)–Leo ½–½ (117 moves)

Leo Black vs a 2062 opponent. Drew in 117 moves. French structure — Leo was comfortable defending for very long periods.

### 6. Am Continental R1: Cu Hor (2311)–Leo 1–0

Leo Black vs 2311-rated opponent. Loss — the largest rating gap in the dataset. This is what upper 2000s strength looks like against Leo's current level.

---

## Summary Profile

| Attribute | Assessment |
|---|---|
| Rating | ~2077 FIDE (estimated post-Queretaro Oct 2026; was 2009 at PAM) |
| Style | Patient, technical, endgame-oriented; improving rapidly |
| White opening | 1.d4 → Catalan (3.Nf3, avoids Nimzo); Bogo-Indian 5.Nbd2 variant |
| Black vs 1.e4 | **French Defense (100%)** — Advance 3...c5 4.c3 Qa5; Tarrasch 3...c5 Qxd5 |
| Black vs 1.d4 | Dutch-type (...e6+...f5) historically; Bogo-Indian (Bb4+) emerging |
| Strength | Endgame technique, long games, defensive solidity; now beating 2000+ regularly |
| Weakness | Catalan White struggles (30% score); complex blunder chains in long games |
| Color preference | BLACK (53% as Black vs 30% as White — unusual for sub-2100 player) |
| Long game indicator | Multiple 100–200 move games; 148-move win at Queretaro |
| Opening trademark | Catalan as White, French Defense as Black |
| Blitz weapon (not classical) | 1.f4 Bird's Opening |

---

## PAM 2026 Results (Jul 2026)

| Rnd | Color | Opponent | Opp Elo | Result | Acc% | Opp Acc% | Notes |
|---|---|---|---|---|---|---|---|
| R2 | White | Mintz, Nathan | 1665 | **Loss** | 92.4% | 88.7% | 127 moves; 4B 1M — unexpected loss vs lower-rated |
| R3 | Black | Lara Santos, Angel Sebastian | 2011 | **Win** | 89.1% | 83.7% | Strong Black win vs 2011 |
| R4 | White | Gao, Heye | 2065 | **Loss** | 93.6% | 96.5% | Heye outplayed Leo precisely |
| R5 | Black | Jimenez Gamboa, Diego | 1794 | **Win** | 92.8% | 88.7% | |
| R6 | White | Castillo Romero, Jasmany | 1929 | **Loss** | 91.8% | 94.7% | Opponent outaccurate |
| R7 | White | Liu, Zachary Hankun | 2167 | **Loss** | 91.9% | 96.8% | Zachary dominant |
| R8 | Black | Monsalve Zuluaga, Santiago | 1645 | **Win** | 93.3% | 88.2% | |
| R9 | White | Liem, Jasper | 1641 | **Win** | 98.8% | 92.2% | Near-perfect White win |

PAM 2026 White: 1W–4L | Black: 3W–0L | Avg acc: 93.0%

## Queretaro 2026 Results (Oct 2026)

| Rnd | Color | Opponent | Opp Elo | Result | Acc% | Opp Acc% | ECO | Notes |
|---|---|---|---|---|---|---|---|---|
| R2 | Black | Del Rosario Silva, Dexnisi | 2125 (WFM) | **Win** | 87.4% | 85.6% | D02 | 148 moves; messy but won |
| R3 | White | Vasquez Jimenez, Cristhian | 2081 | **Draw** | 92.0% | 91.9% | — | Bogo-Indian 5.Nbd2 Catalan |
| R4 | Black | Ruiz Perez, Juan Octavio | 2126 | **Loss** | 91.7% | 97.5% | C02 | French Advance; crushed by opponent near-perfect play |
| R5 | White | Sanchez Tlapale, Anthony Amaury | 1887 | **Win** | 95.2% | 92.8% | — | Clean Catalan win |
| R6 | Black | Rodriguez Rivera, Pedro | 2136 | **Draw** | 94.8% | 95.1% | C00 | French KIA; 94.8% draw vs 2136 impressive |
| R7 | Black | Nipita Medina, Jesus Hassan | 2098 | **Win** | 96.2% | 94.1% | C07 | French Tarrasch Chistyakov; Leo's best result |

Queretaro White: 1W–0L–1D | Black: 2W–1L–1D | Avg acc: 92.9%
