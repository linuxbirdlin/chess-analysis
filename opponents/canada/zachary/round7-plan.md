# Round 7 Implementation Plan: Austin (Black) vs Zachary Liu (White)
*Generated 2026-11-14 — NAYCC 2026, game to be played 2026-11-15*

---

## Tournament Stakes

| Player | Needs | Current position |
|---|---|---|
| Zachary Liu (2185 CM) | Win — only path to first place | Likely near top |
| Austin Lin (1959) | Draw minimum — cannot lose; draw may keep top 3 | Cannot afford loss |

---

## Phase 0: What We Already Know (intelligence base)

**Data available:**
- 51 games in pgnlib (27 as White, 24 as Black)
- 49 games deep-analyzed (Stockfish movetime-3000, 93.3% avg)
- PAM 2026: 3 White games (R4 B75 82.5%, R6 B75 95.4%, R8 A09 90.6%)
- PAM School 2026: 4 White games (R1 C47 97.8%, R3 B47 96.7%, R5 A15 94.4%, R8 A13 97.0%)
- NAYCC 2026 White games so far: R4 Catalan (E05, win 92.3%), R6 English/Reti (A15, draw 96.6%)

**Zachary's White move distribution (24 confirmed White games):**

| First move | Count | % | Avg accuracy |
|---|---|---|---|
| 1.Nf3 → Reti/English | 13 | 54.2% | ~94.5% |
| 1.e4 | 9 | 37.5% | ~92.0% (drops to ~82% in sharp Sicilian) |
| 1.d4 / 1.c4 | 2 | 8.3% | ~95%+ |

**Most recent NAYCC White games (critical context):**
- R4 (Nov 13): 1.d4 → Catalan vs Joel (1813) — WIN
- R6 (Nov 11): 1.Nf3 → English/Reti vs Fernando (2085) — DRAW

---

## Phase 1: Opening Response Tree

What Austin plays as Black vs each Zachary White system:

### Scenario A: Zachary plays 1.Nf3 (54.2% probability — MOST LIKELY)
```
1. Nf3 Nf6 2. c4 e6
  → 3. Nc3: Austin plays 3...Bb4 (Nimzo-Indian) ← Austin's main repertoire
  → 3. g3: Austin plays 3...d5 (Catalan/Queen's Indian territory)
     → 4. Bg2 d5 5. 0-0 Be7 6. d4 → Catalan Open (dxc4) — DANGEROUS: Zachary 96%+ here
     → 4. Bg2 d5 5. 0-0 0-0 6. Qc2 — Zachary's known Catalan line (R4 NAYCC vs Joel)
  → 3. b3: Austin plays 3...d5 (Nimzo-Larsen territory — Austin has this, Oct 2026 vs Sriram)
1. Nf3 c5 2. c4 → English reversed — Austin less prepared here
```
**Risk:** Zachary's highest accuracy territory. If he gets into A-series Reti/English structures, Austin is in trouble. Need to steer toward Nimzo (3.Nc3 → Bb4) rather than Catalan.

### Scenario B: Zachary plays 1.e4 (37.5% probability — HIGH)
```
Austin responds: 1...c5 (Taimanov Sicilian — fixed repertoire)
  → 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 → B47/B48 Taimanov
     Zachary played B47 in PAM School R3 (vs Yin Aiden 1734, WIN 96.7%)
     → 5. Nc3 Qc7 → Bastrikov (Austin's main Taimanov line)
     → 5. Nb5 → Austin must know 5...d6! (not Bc5?? — PAM 2026 R7 blunder warning)
  → 2. c3 → Sicilian Alapin (Zachary beat Aljo 2209 here — but rarely played)
  → 2. Nf3 g6 → Dragon territory (NOT Austin's repertoire — Austin plays 2...e6 not 2...g6)
```
**Opportunity:** Zachary scored 82.5% (3 blunders) in his only sharp Sicilian game at PAM 2026 (B75 Dragon). If Austin steers into sharp Taimanov complications, Zachary's accuracy drops from 97% to potentially 82-85%.

### Scenario C: Zachary plays 1.d4 or 1.c4 (8.3% probability — UNLIKELY)
```
Austin responds: 1...Nf6 2...e6 3...Bb4 → Nimzo-Indian
```

---

## Phase 2: Detailed Line Analysis

### Line A — The Taimanov Battleground (via 1.e4)
*Austin's winning chance lives here. This is the target scenario.*

**Zachary's known B47 handling (PAM School R3 vs Yin Aiden 1734):**
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 a6 6.Nxc6 bxc6 7.e5...
  Wait — the R3 PAM School was B47 Sicilian Paulsen, ECO B47. Let me verify the exact move order.

**Austin's Taimanov: 1...c5 2.Nf3 e6 → Bastrikov B47 with 5...Qc7**
Key question: Can Zachary handle sharp Taimanov complications at the same accuracy as his Reti structures?
Evidence: His only Sicilian-sharp game (PAM R4, Dragon Yugoslav) → 82.5%, 3 blunders including Rc1?? (-2.40 → forced mate).

### Line B — The Catalan Defense Problem (via 1.Nf3)
*Zachary's comfort zone. Austin needs Nimzo transposition, NOT Catalan.*

**Zachary's Catalan game at NAYCC R4 (vs Joel, 1.d4 → E05 Catalan Open):**
- 1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 dxc4 6.0-0 0-0 7.Qc2 a6 8.Qxc4 b5 9.Qc2 Bb7...
  Zachary won this 92.3% accuracy. Joel made mistakes (...c6?! inaccuracy at move 34, ...Kg7?? blunder at 37).
  
**Austin vs Catalan Open (Austin as Black):** This is a known problem — Austin needs to know:
- After 1.Nf3 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4 → Catalan Open accepted
- Key question for SURVEY: Does Austin know Catalan Open theory from Black? Can he hold it?

**Avoid:** If Zachary plays 1.Nf3 → c4 → g3, Austin should NOT immediately go into Catalan Open. Instead prefer:
- 1.Nf3 Nf6 2.c4 e6 and wait — if 3.Nc3 → Bb4 (Nimzo); if 3.g3 → consider 3...c5 (English territory where both are equal) or 3...d5 (Catalan territory, more risky)

### Line C — The Nimzo-Indian Path (via 1.Nf3 Nc3 or 1.d4 Nc3)
*Austin's most reliable drawing weapon and known repertoire.*

If Zachary plays 1.Nf3 Nf6 2.c4 e6 3.Nc3 → Austin plays 3...Bb4 (Nimzo-Indian)
- Austin has proven Nimzo preparation: wins vs Laksshana Deepak (E46), Aaryan Kovuru (E01)
- Austin's Nimzo: Bxc3+ with ...b6/...Ba6/...Ne4 structure
- Zachary has NO documented Nimzo-Indian White games (he avoids early Nc3)

**KEY INSIGHT:** Zachary's standard 1.Nf3 → c4 → g3 deliberately AVOIDS Nc3, keeping the bishop off c3. He plays g3 precisely to prevent the Nimzo. Austin cannot force the Nimzo if Zachary plays g3 first.

---

## Phase 3: Lichess Masters API Verification

Planned API calls to verify opening positions:
1. `1.Nf3 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dxc4` — Catalan Open: what do Black players do?
2. `1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7` — Bastrikov B47: what does White play?
3. `1.Nf3 Nf6 2.c4 e6 3.g3 c5` — English: what's the theory here?
4. Verify Zachary's specific deviation point in the Catalan vs Joel (Qc2 system)

These calls will verify exact FENs, top master continuations, and where Zachary deviates from theory.

---

## Phase 4: Weakness Exploitation Matrix

| Zachary weakness | Trigger condition | Austin's tactic |
|---|---|---|
| Sharp Sicilian accuracy drop (82.5%) | Zachary plays 1.e4, Austin plays 1...c5 Taimanov | Steer into unbalanced Taimanov middle game, avoid early simplifications |
| Large-advantage conversion (PAM R8: Bf4?? from +5.82 to 0.00) | Reach complex endgame with active pieces | Don't resign early — Zachary may misplay a won endgame |
| Dragon Yugoslav blunders (Rc1?? -1.94 → forced mate, PAM R4) | 1.e4 → Dragon-type pawn storms | Force tactical complications by move 20 |
| b5?? in A37 English (+4.75 → near-equality, GV 2026) | Closed structures with Zachary having a large advantage | Stay active, give him structural decisions to make |
| Draw tendency under pressure | Zachary needs to WIN in R7 | Austin holding = Austin winning. Zachary must overpress. |

**Critical psychological fact:** Zachary NEEDS to win this game. His natural draw-seeking style (50%+ draw rate, plays safe continuations) is in direct conflict with his tournament necessity to win. This creates a psychological pressure point: if Austin reaches a drawish position, Zachary may try to push too hard and blunder.

---

## Phase 5: Document Production

**Output:** `opponents/zachary/round7-battleplan.html`

Structure:
1. Stakes header (tournament context, psychological pressure)
2. Opening decision tree — Austin's choices by Zachary's first move
3. Main line analysis: Scenario A (1.Nf3), Scenario B (1.e4)
4. If/Then quick reference table (Day-of reference, one glance)
5. Critical positions with Lichess-verified FENs
6. Engine backing for key recommendations
7. Psychological game plan (exploit Zachary's draw-seeking vs win-needing conflict)

---

## Survey Questions for Austin

Before writing the final battle plan, Austin should answer these:

**Q1 (opening readiness):** When Zachary plays 1.Nf3 Nf6 2.c4 e6 3.g3, do you:
  a) Know the Catalan Open (3...d5 4.Bg2 dxc4) and can hold it as Black?
  b) Prefer to transpose to English-type (3...c5)?
  c) Not sure — need a recommendation?

**Q2 (Taimanov sharpness):** If Zachary plays 1.e4 and you play the Taimanov, are you prepared for:
  a) Sharp English Attack (5.Nb5 d6 6.Bf4 e5 → complex) — do you know this line?
  b) Bastrikov (5.Nc3 Qc7) — your main line, comfortable?
  c) Both? Neither?

**Q3 (risk preference for this game):** Given you need a draw (not necessarily a win):
  a) Prefer a solid draw-oriented line even if it's Zachary's comfort zone?
  b) Prefer to play for complications and imbalance — accept that the game might go sharp both ways?
  c) Play normally and adapt — no preference?

**Q4 (Catalan/Reti knowledge):** Have you studied the Nimzo-Larsen (1.Nf3 Nf6 2.b3 → 2...d5) or Queen's Indian (1.Nf3 Nf6 2.c4 e6 3.g3 b6) from Black's side? These might be relevant if Zachary avoids Nc3.

---

## Decision Dependencies

The final battle plan document will be tailored based on Austin's answers:

| Austin's answer | Plan focus |
|---|---|
| Q1=a (knows Catalan) | Include Catalan Open line as viable option, teach specific deviation point from Zachary's R4 NAYCC game |
| Q1=c (needs guidance) | Steer AWAY from Catalan, emphasize getting sharp Taimanov via 1...c5 vs 1.e4 or QI via 1.Nf3 |
| Q2=b (Bastrikov ready) | Write full B47 Bastrikov tree vs Zachary; include anti-draws in English Attack |
| Q3=b (wants complications) | Recommend: if 1.Nf3 → 1...c5 (force English imbalance); if 1.e4 → Taimanov (target sharp B47) |
| Q3=a (wants safe draw) | Recommend: if 1.Nf3 → 1...Nf6 2.c4 e6 → aim for draw in solid pawn structure |

---

## Timeline

- **Now**: Present this plan + survey to Austin
- **After survey answers**: Write `round7-battleplan.html` (1–2 hours work)
- **Lichess API calls**: 4–6 key positions (~30 min)
- **Final review**: Austin reads the battle plan the morning of the game

---

*Note: Austin's Black repertoire is fixed — Taimanov Sicilian vs 1.e4, Nimzo-Indian vs 1.d4. This plan never recommends deviating from that.*
