# Irene Xie — Sparring Partner Analysis

**Role:** Sparring partner for NAYCC 2026 preparation  
**Rating:** ~1888–1977 FIDE (Apr 2026 1888; peak ~1977 Aug–Sep 2025)  
**Engine analysis (standard):** 36 games, movetime-800 · `scripts/irene-analysis-results.json` · avg 91.0% · 1.00 blunders/game  
**Engine analysis (deep):** 36 games, movetime-3000 · `scripts/irene-analysis-results-deep.json` · avg 90.6% · White 91.7% · Black 89.7% · Best game 98.5% (Saravia draw, Pan Am) · Pattern D: 4 conversion failures from +4.85–+10.15 · Pattern G: 2 White losses from pawn-push error (Qd2/a5!, Rf5/g3!)  
**Tournaments (snoop2026.pgn):** Toronto Open 2026, Pan American Youth 2026 (Girls/Open U18), Canadian Open 2026, Canadian Youth Championships 2026 (CYCC), Toronto Open Crown 2025, NAYCC U18 2025

---

## 1. Overall Results (snoop2026.pgn, 36 unique games)

| Color | W | L | D | Avg Acc | Notes |
|---|---|---|---|---|---|
| As White | 7 | 4 | 5 | 92.0% (mv-800) / 91.7% (mv-3000) | Best White: 97.1% (Toronto Open vs Qian) |
| As Black | 7 | 6 | 7 | 90.2% (mv-800) / 89.7% (mv-3000) | Best Black: 97.9% (CYCC Nimzo vs Ruchinskaya) |
| **Combined** | **14** | **10** | **12** | **91.0% (mv-800) / 90.6% (mv-3000)** | 36 games · 1.00 blunders/game · 47 mistakes · 125 inaccuracies |

- **Best game (mv-800):** 98.1% (Black, draw vs Ruchinskaya — CYCC, Nimzo-Indian Bxc3+)
- **Best game (mv-3000):** 98.5% (Black, draw vs Saravia Delgadillo — Pan Am, only 15 ply)
- **Worst game:** 68.2% (Black, draw vs Acuna Alarcon — 4 blunders in 46 moves)
- **Opponent avg accuracy:** 90.7% (closely matched)

---

## 2. Opening Repertoire

### As White — 1.e4 exclusively

| Opponent system | Variation | Record | Notes |
|---|---|---|---|
| Caro-Kann (1...c6) | Exchange Nd2-Nxe4-Nxf6+ 6.c3 Bd3 O-O-O | 3W–0D (CYCC, NAYCC 2025, Toronto Crown 2025) | Queenside castle, aggressive system |
| Sicilian (1...c5) | Rossolimo 3.Bb5 → Exchange 4.Bxc6 bxc6 | 1D (Toronto Open R1 vs Qian) | Exchange Rossolimo, slow d3/Nge2 build |
| Sicilian (1...c5 2...d6) | Rossolimo 3.Bb5+ (anti-Dragon), retreat 6.Bf1 | 0W–1L (Toronto Open vs Zeming Yin) | Retreated bishop, endgame technique loss |
| Sicilian (1...c5 3...Najdorf a6) | Bd3/g3 setup with f4 plans | 0W–1L (Pan Am vs Quevedo Bonilla) | Development issues in sharp line |
| 1...e5 | Italian Bc4→Bb3 + h3/c3/d3 slow build | 3W–2D (CYCC, NAYCC 2025) | Solid positional attacker |
| French (1...e6) | Tarrasch 3.Nd2 with f4-h4 kingside storm | 1W (Pan Am vs Posada Torres — NAYCC FM) | Aggressive 3.Nd2 followed by castle queenside |
| French Advance (3.e5) vs 1...e6 | Not confirmed in dataset | Unknown | |

**White opening notes:**
- Best White result: Caro-Kann Exchange with O-O-O → 3W–0D, her most reliable White system
- French Tarrasch 3.Nd2 with f4-h4-h5 pawn storm: won vs FM-caliber opponent (Posada Torres)
- Italian slow build: wins come from patient IQP/space advantage; does NOT play sharp Open Games
- Rossolimo: Exchange 4.Bxc6 bxc6 preferred over maintaining the pin

### As Black — Nimzo-Indian primary vs 1.d4

| Opponent system | Variation | Record | Notes |
|---|---|---|---|
| 1.d4 → QGD/NImzo | Nimzo-Indian 3.Nc3 Bb4 4.e3 Bxc3+ ...b6 ...Bb7 ...Ne4 | 4W–1L–3D | Her best-performing Black system |
| 1.d4 Catalan | Bogo-Indian Bb4+ → ...d5 ...Bb7 ...b6 structure | 2W–1D | Similar queenside fianchetto idea |
| 1.Nf3 | 1...d5 ...e6 ...Bf5 QID-adjacent | 1W–1L | Solid, no surprises |
| 1.c4 | Dutch Leningrad 1...f5! (vs Nc3 1.c4) or QI structure | 1W–1L | Flexible, picks between Dutch and QI |
| 1.e4 | French Defense (1...e6) | 3W–1L–3D | Primary Black weapon vs 1.e4 |
| 1.e4 → French Advance | 3...c5 4.Nf3 ...Nc6/...Nge7, standard Advance Black setup | 2W–1D | Knows French Advance theory |

**Black opening notes:**
- Nimzo-Indian Bxc3+ + ...b6 + ...Bb7 + ...Ne4 — this is **the same structure Austin plays**. She has deep familiarity with these positions from both sides.
- French Defense vs 1.e4: consistent use across all tournaments. She knows French Advance (3.e5) theory and plays Classical French (3.Nc3 Nf6).
- Dutch Leningrad (1.c4 f5!) appears once vs Nc3 English — shows willingness to play double-edged openings.

---

## 3. Tactical Patterns

### Strengths
- **Italian patience**: Slow build Italian positions with h3/Re1 plan — knows when to break with d4
- **Caro-Kann Nd2-Nxf6+ attack**: Queenside castle, aggressive bishop pair play
- **French defense technique**: Converts French ...c5/...d4 central breaks and endgame technique
- **Nimzo-Indian Ne4 outpost**: Knows how to maintain the ...Ne4 knight on strong squares

### Weaknesses
- **Sharp Sicilian positions as White**: 1–2 losses to opponents who outplayed her in complex Sicilian middlegames (Open Sicilian positions she's less comfortable with)
- **Endgame conversion**: Multiple endgame losses vs lower-rated opponents (Canadian Open vs Berube — reached R+P vs R ending, lost)
- **Queenside attack defense**: NAYCC 2025: lost to Yang Aimee (Nimzo game where kingside counterplay was mishandled)

---

## 4. Sparring Value for Austin

### Austin as White vs Irene
- Irene plays **French Defense** vs 1.e4 → Austin practices his Tarrasch weapon (3.Nd2) against a real opponent
- She plays Classical French (3.Nc3 Nf6) too → Austin can test his 3.e5 Advance lines
- **Key practice position:** After 1.e4 e6 2.d4 d5 3.Nd2, Irene plays either ...Nf6 (Classical Tarrasch) or the Advance side (...c5). Austin should drill both.

### Austin as Black vs Irene
- Irene plays **1.e4** → Austin plays Taimanov Sicilian (1...c5 2...e6 3...Nc6)
- Irene's Sicilian-White is: Rossolimo 3.Bb5 (Exchange variant) and some Open Sicilian structures
- **Important**: Her Rossolimo uses 4.Bxc6 (Exchange) — different from Austin's plan vs Zhuoyuan (which maintains the pin). Austin should practice holding the position after the exchange.
- If Irene plays Open Sicilian: her system is Bd3/f4 style, not 6.Bg5 English Attack → Austin's Taimanov development is clean

### Mirror positions
- Both Austin and Irene play the **Nimzo-Indian Bxc3+** as Black. Drilling Nimzo positions from both sides with Irene provides double practice value — Austin improves his White handling of Nimzo positions, and Irene practices her Black setup.

---

## 5. Summary Profile

| Attribute | Value |
|---|---|
| Rating (Apr 2026) | 1888 FIDE |
| Rating (peak 2025) | ~1977 FIDE |
| Role | Sparring partner — not NAYCC 2026 opponent |
| Best White system | Caro-Kann Exchange Nd2 + O-O-O |
| Best Black system | Nimzo-Indian Bxc3+ ...b6 ...Bb7 ...Ne4 |
| Practice value: Austin White | French Tarrasch + Advance drill partner |
| Practice value: Austin Black | Taimanov vs Rossolimo drill partner |
| Endgame | Weaker — good for Austin to press in R+P endings |
| Engine avg (36g) | 91.0% overall · 92.0% as White · 90.2% as Black |
| Blunders/game | 1.00 (high — double Zhuoyuan's 0.63/game) |
| Best game | 98.1% vs Ruchinskaya (Nimzo draw, CYCC) |
| Worst game | 68.2% vs Acuna Alarcon (4 blunders, Pan Am draw) |
