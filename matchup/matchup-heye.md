# Austin Lin vs Heye Gao — Tournament Preparation Plan

**Austin's rating:** ~1865–1968  
**Heye's rating:** CM, ~2028–2065  
**Rating gap:** Heye is roughly 100–200 points stronger on paper — Austin needs concrete preparation and imbalance  
**Direct record:** 3 games (Jul 2024–Jul 2026) — 0W–2L–1D (Austin)

---

## Direct Encounters (3 games — 2024–2026)

Stockfish movetime-800 analysis. Austin: **0W–2L–1D**.

| Date | Austin | Opening | Result | Austin Acc | Heye Acc |
|------|--------|---------|--------|-----------|---------|
| Jul 18 2026 | White | C54 Italian Classical | **Loss 0-1** | 88.4% | 91.8% |
| Oct 12 2025 | Black | B32 Sicilian Löwenthal | **Loss 0-1** | 92.5% | **97.0%** |
| Jul 12 2024 | Black | B45 Sicilian Four Knights Cobra | **Draw** | **91.7%** | 91.6% |

**Game 1 (Jul 18 2026):** Austin White, C54 Italian Classical. Heye played **1...e5/Nc6/Bc5 — Italian mirror** (NOT the Kan). Heye built a +5.09 Black advantage in the middlegame but blundered `gxf4` (best Re1, CPL 309), dropping to +2.00. He had multiple more chances to win cleanly (Nd5 CPL187, g5 CPL142) but missed them. Austin played 88.4% and couldn't capitalize on Heye's errors. Lost the 53-move rook endgame. **This changes the Part 1 preparation: Italian mirror is the confirmed Black weapon, not Kan.**

**Game 2 (Oct 12 2025):** Heye White, B32 Löwenthal. Heye played **97.0%** — the most accurate game in the dataset. Austin played 1...c5 2...Nc6 and was outclassed by Heye's queenside expansion (Nd6+, c5, b5, a4). Only 2 minor inaccuracies in 30 moves from Heye. Austin's 92.5% was decent but strategically dominated. **The Löwenthal (B32) is NOT the right Black system vs Heye.**

**Game 3 (Jul 12 2024):** Heye White, B45 Sicilian Four Knights Cobra. Both players at essentially equal accuracy (91.6% vs 91.7%). Heye had +1.89 early but played Nd6+ instead of a3 (CPL 138), squandering the edge. Austin defended the Cobra variation (Bxc3+, d5 break, active piece play) and drew in a 52-move rook endgame. **The Four Knights Cobra (B45) is Austin's best-performing Sicilian vs Heye.**

**What the 3 games prove:**
1. Austin's record is 0W–2L–1D — Heye is clearly the stronger player and has won both recent games.
2. **Heye plays Italian mirror (1...e5/Bc5) vs Austin's 1.e4** — the old Kan preparation (based on a removed study game) is no longer primary. Italian mirror prep is the new priority.
3. Austin plays Sicilian as Black vs Heye (confirmed). Four Knights Cobra (B45) drew in 2024; Löwenthal (B32) lost badly in 2025. Use Cobra, not Löwenthal.
4. When both players are at equal accuracy (~91.7%), Austin can draw. The key is avoiding the type of positional drift that occurred in Games 1 and 2.

---

## Part 1 — Austin as White vs Heye

### What Heye will play

**Updated (Jul 2026):** Heye plays **Italian mirror (1...e5/Nc6/Bc5)** — confirmed by the most recent competitive game (Jul 18 2026, C54 Italian Classical). The old Kan preparation was based on a study game that has been removed. Austin should now primarily prepare for the Italian structure as White.

Heye's Italian mirror setup: `1...e5 2...Nc6 3...Bc5 4...Nf6` — the same Bc5 structure Heye plays in his tournament games against other 1.e4 players. He is comfortable in these positions with both colors.

**Backup:** If Heye reverts to the Kan (B43), the `7.Bf3!/a4/Nd5` system is still the correct plan (see below).

### Recommended White Preparation: Italian Game (C54/C55)

Austin plays 1.e4. When Heye plays 1...e5/Nc6/Bc5:

```
1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4
```

This is exactly what was played in the Jul 2026 game. After `6...Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2`, the position is an IQP Italian where Austin has central pawn control. Austin should study the resulting middlegame structures — he had a fine position early but drifted in the endgame.

**Alternative: Giuoco Pianissimo (4.d3)**  
Instead of the aggressive 4.c3/5.d4, playing 4.d3 leads to slower positions where Austin avoids giving Heye sharp complications to calculate.

### Backup Preparation: English Attack vs Kan (6.Be2/7.Bf3!)

If Heye plays Kan (secondary option):

```
1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6 5.Nc3 Qc7
6.Be2 b5 7.Bf3!
```

Key line: `7...Nc6 8.Re1 d6 9.a4 b4 10.Nd5 Qa5 11.Nxc6 Bxc6 12.Nxb4` — Austin wins a pawn.  
If `7...Nf6 8.O-O Be7 9.Re1 d6 10.a4 b4 11.Nd5` — standard Kan with Nd5 outpost.

### Key tactical themes Austin White should target

1. **d5 knight outpost:** In the Kan, White's `Nd5` is always the central motif. After `...Nc6 Nd5 Qa5 Nxc6 bxc6`, Black gets the c6 pawn but White controls d5 and d6. Austin should aim for this trade structure and then exploit the isolated d6 pawn.

2. **a4 challenge to b5:** Heye will push ...b5. Austin should respond with `a4` as seen in the direct encounter. If Heye plays ...b4, White can respond with `Nd5` or `Nb1-d2-b3` maneuvering.

3. **Kingside attack after long castle:** If Austin plays `O-O-O`, the `g4-g5` pawn storm is the standard Kan attacking plan. Heye has faced `h4` attacks from White before (Ontario R4 he beat Vettese's attack, but that was after White made a tactical blunder `g4??`). A properly prepared `g4` storm from Austin is more dangerous.

4. **Keep Queens on:** Heye's White endgame technique is very strong. Avoid queen exchanges into pawn endgames — keep the game complex. Heye converts cleanly in endgames with rook + pawn advantages (PAM R1, R8).

### What NOT to do as Austin White

- **Do not simplify into an endgame early.** Heye's White record (8W/1D/3L) vs his Black record (4W/4D/4L) shows he's a much better technical player than a fighting player. As Black in a simplified endgame, he will still be solid and hard to beat. Austin needs to keep the tension.
- **Do not play passive setups.** Against the Kan, passive White play (Be2/Nf3/O-O without a plan) lets Black organize with ...d6/...Nf6/...Be7/...O-O and reach a solid position. Austin must be concrete and aggressive.

---

## Part 2 — Austin as Black vs Heye

### What Heye will play as White

Heye plays **1.e4 exclusively** and primarily the **Italian Game (C54/C55)**: `Bc4/d3/c3` with `b4/a4` queenside expansion. His main structure:

```
1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 (or ...Nf6) 4.d3 d6 5.c3 O-O 6.b4
```

He also plays:
- Queenside expansion with `a4/a5` locking queenside space
- `Nbd2–Nc4` central knight maneuver to attack d6 or support b4
- `Bxe6 fxe6` exchange to give Black doubled e-pawns (seen in Ontario R2 and PAM R8)

Heye is **unlikely to face Austin's standard Nimzo-Indian** since he plays 1.e4. Austin's regular Black weapon (Nimzo vs 1.d4) does not apply here.

### Austin should play the Sicilian vs 1.e4

Austin's standard weapon vs 1.e4 is the **Sicilian Defense**. This is confirmed by his games across NAYCC and PAM 2026. Against Heye's 1.e4, Austin should absolutely play Sicilian and force Heye into sharp Sicilian positions — which is NOT Heye's primary White system (he prefers the Italian against 1...e5).

**If Heye plays the Closed Sicilian or Anti-Sicilian:** Heye has only been observed playing `2.Nf3 3.d4` Open Sicilian against `1...c5`. If he plays `2.Nc3` or `2.c3`, Austin should be aware — but the data suggests he will enter the Open Sicilian.

**Austin's Sicilian system recommendation: Four Knights Cobra (B45) or Najdorf**

Direct encounter data now gives us a clear answer:
- **Löwenthal (B32) — AVOID.** Oct 2025 game showed Heye handles it at 97% accuracy. The 1...c5/2...Nc6/3...e5 structure plays right into Heye's Italian technique (queenside expansion, passed pawn creation).
- **Four Knights Cobra (B45) — PREFERRED.** The 2024 draw shows Austin can hold with `5...Nc6 6.Ndb5 Bc5 7.Bf4 e5 8.Be3 Bb4` — early piece complications limit Heye's technique-heavy style. Both players played equal accuracy (91.7% draw).
- **Najdorf (5...a6)** — still valid as an option. Heye has no documented Najdorf games in the dataset.

Recommendation: **Austin plays Four Knights Cobra (B45)** as the primary Sicilian, with Najdorf as backup.

**Alternatively: Nimzo/Benko-Indian idea doesn't apply** — since Heye plays 1.e4, Austin cannot use his d4 Black weapons. The Sicilian is Austin's true weapon here.

### Key themes Austin Black should target

1. **Counterattack against Italian expansion:** If Heye plays the Italian and Austin plays `1...e5`, the `...d5` counter in the right moment (typically after `Be3` or when White has committed his queenside pawns) gives Austin play. The `...Nf4` knight intrusion motif (seen in PAM R8: opponent played `Nf4?` but Heye missed the idea) is relevant.

2. **Piece activity over pawn structure:** Heye's Italian as White converts when he gets a structural advantage (passed queenside pawn). Austin should prioritize **keeping pieces active** and not allow Heye's queenside to expand unopposed. The `...d5` break at the right moment liquidates Heye's advantage.

3. **Target the h2/g3 weakness:** In multiple Heye White games, his g3/h3/h2 complex becomes weak when he advances queenside pawns. Canada R7 (vs Zachary Dukic): Black won with `Bxh2`. Canada R9 (vs Yin): Black had `...e4 f3 Bf4 Ne5 Nf3` attack pattern. Austin should watch for similar tactical opportunities when Heye's king is in the corner.

4. **Avoid simplified endgames.** Heye converts Italian endings cleanly — Austin should fight for the middlegame and avoid trading into rook+pawn endings where Heye's endgame technique dominates.

---

## Part 3 — Psychological and Practical Notes

**Heye's rating volatility:** He went from 2028 to 2065 to 2044 across three tournaments. This suggests he is still developing and can be inconsistent — especially as Black under pressure. Austin should be confident playing sharp positions.

**Heye blunders under time pressure:** Both documented Heye losses in PAM 2026 (R7 `24...Qe7??`, R9 `23...Kg8??`) occurred when he was under 25 minutes. Austin should **manage the clock aggressively** — playing quickly in known positions to force Heye into time pressure.

**Heye's Italian is deep-prepared:** He plays the same `d3/c3/b4` Italian system consistently across Canada Closed, Ontario, and PAM. Austin should not try to "out-prepare" Heye in the Italian as Black — instead, play the Sicilian to take Heye out of his best preparation.

**The Vettese upset (Ontario R4):** Heye beat 2410-rated Vettese as Black after a tactical miscue by White. This shows Heye can calculate precisely when given concrete targets. If Austin gets into tactical complications as White, Heye may find the shot. Austin should seek **controlled aggression** (clear attacking plans) rather than random complications.

**Heye has never lost as White in the Italian Game** in this dataset (PAM R7 loss was as Black). His Italian confidence is high. Austin must avoid the Italian mirror with 1...e5 and instead play Sicilian to break Heye's rhythm.

---

## Summary Cheat Sheet

| Situation | Action |
|---|---|
| Austin as White vs Heye | Play 1.e4; prepare Italian mirror (C54/C55) — Heye plays 1...e5/Bc5 |
| Heye plays Italian mirror | Italian positions (4.c3/d4 or 4.d3 Pianissimo) |
| If Heye plays Kan (backup) | 7.Bf3! then `a4 → Nd5 → Nxb4` pawn win |
| Austin as Black vs Heye | Play Sicilian — Four Knights Cobra (B45); avoid Löwenthal (B32) |
| Heye plays Italian as White | Execute `...d5` break when ready; watch `Bxh2/...e4` tactics |
| Endgame situations | Keep queens + pieces; Heye converts endgames cleanly |
| Time trouble situations | Austin manages clock; Heye blunders under 25 min |
| Key tactical theme to drill | `Nd5` outpost in Kan; `...d5!` break in Italian |
