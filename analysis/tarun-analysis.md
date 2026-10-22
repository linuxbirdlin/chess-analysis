# Tarun Sankar — Player Analysis

## Background

Tarun Sankar is a fast-improving junior player based in the United States (Texas area), competing in national and regional open tournaments. His FIDE rating progression is one of the steepest in this dataset:

| Date | Tournament | FIDE Rating |
|---|---|---|
| Dec 2023 | Madurai Athens 2023 | 1406 |
| Oct 2024 | Dulles Skyline op 3rd | 1706 |
| Dec 2024 | North American Championship | 1750 |
| Dec 2025 | North American Open (35th) | 1871 |
| Mar 2026 | Texas Grand Circuit | **2002** |
| Oct 2026 | 5th Skyline Open | 1965 |

That is approximately **600 Elo points gained in 2.5 years** (Dec 2023 → Mar 2026). His current active FIDE rating is ~1965 (Oct 2026), just below his peak of 2002. He is clearly still in a strong growth phase.

The PGN collection contains **23 unique games** across 7 tournaments. The sample is heavily biased toward strong opposition — his Dulles Skyline 2024 games include opponents rated 1829–2130, both Texas Grand Circuit games were against titled or near-titled players (IM Fus 2419, Pyrig 2395), and the 3-0 Thursday Club 2026 games include opponents rated 1943–2265. His record in the PGN looks weak (5W–15L–3D) precisely because these were "playing up" events; his actual rating rise proves he won many games not captured here.

---

## Overall Record by Tournament

| Tournament | Date | Rating | Record | Score |
|---|---|---|---|---|
| 5th Skyline Open 2026 | Oct 2026, Dulles | 1965 | 0W–1L–1D | 0.5/2 |
| 3-0 Thursday Club 2026 | Jul–Oct 2026, UK/intl | ~1965 | 1W–5L–1D | 1.5/7 |
| Texas Grand Circuit 2026 | Mar 2026, Dallas | 2002 | 0W–2L–0D | 0/2 |
| NA Open 2025 (35th) | Dec 2025, Las Vegas | 1871 | 0W–1L–0D | 0/1 |
| NA Championship 2024 | Dec 2024, Dulles | 1750 | 0W–1L–0D | 0/1 |
| Dulles Skyline 2024 (3rd) | Oct 2024, Dulles | 1706 | 2W–4L–1D | 3/7 |
| Madurai Athens 2023 | Dec 2023, Madurai | 1406 | 2W–1L–0D | 2/3 |
| **Total (PGN sample)** | | | **5W–15L–3D** | 6.5/23 |

*Note: PGN sample excludes the many games against similarly-rated opponents that fueled Tarun's 600-point rating gain. This is a "strong opponent sample" biased toward losses.*

### Results by Color

| Color | W | L | D | Score% |
|---|---|---|---|---|
| White | 4 | 8 | 2 | 36% |
| Black | 1 | 7 | 1 | 17% |

Black results are dragged down significantly by losses to Dilanian (2239) and Boutikos (2144) in the Thursday Club, Roman Pyrig (2395), Zachary Liu (2153), and multiple 1800–2100 players at Dulles Skyline when Tarun was rated only 1706. Thursday Club 2026 (1W–5L–1D, avg 86.1%) is the weakest tournament in the dataset — his worst accuracy average across any event.

---

## Opening Repertoire

### As White

Tarun plays **1.c4 (English Opening) exclusively** in all 7 recorded White games. No 1.e4 or 1.d4 as White.

| System | Moves | Games | Notes |
|---|---|---|---|
| English Catalan-type | 1.c4 e6 2.g3 d5 3.Bg2 Nf6 4.Nf3 | 3 games | Standard Reti/English fianchetto |
| English→Sicilian (Maróczy) | 1.c4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 | 2 games | Converts to Sicilian Maróczy structure |
| Mikenas Attack | 1.c4 e6 2.Nc3 Nf6 3.e4 (c5 4.e5) | 1 game | vs IM Fus — ECO A19 Anglo-Indian Mikenas |
| English vs Dutch | 1.c4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.e4 | 1 game | Sicilian-type formation |

The **Mikenas Attack** (1.c4 e6 2.Nc3 Nf6 3.e4) deserves attention: Tarun used this against IM Jakub Fus (2419) at Texas Grand Circuit — facing the strongest opposition he has encountered in these records. After 3...c5 4.e5 Ng8, White's pawn wedge on e5 gave Tarun a sharp game even against an IM. This is his most ambitious White opening and appears reserved for critical games.

**Critical note for Austin:** When Austin plays Black against Tarun, he will face 1.c4. If Austin responds with 1...Nf6 2.Nc3 e6, **Tarun may play 3.e4 (Mikenas)** rather than 3.g3. Austin's Nimzo-Indian requires 3.Nc3 in a 1.d4 context — the Mikenas (3.e4 in 1.c4 context) is a completely different structure requiring separate preparation.

### As Black

**vs 1.e4: Sicilian Defense (1...c5) — 100% consistent**

| Situation | System | ECO | Record | Notes |
|---|---|---|---|---|
| vs 1.e4 | Sicilian 1...c5 2...Nc6 | B20–B30 | 0W–3L–1D | Consistent across all ratings/years |
| vs 1.e4 (alt) | Sicilian 1...c5 2...e6 | B40 | 0W–1L–0D | Texas Grand Circuit R4 (vs unusual 3.b3) |
| vs 1.d4 | King's Indian (g6/Bg7) | E60 | 1W–0L–0D | Madurai 2023 only |
| vs 1.d4 | Queen's Gambit Accepted (d5 dxc4) | D20 | 0W–1L–0D | vs Hebbar 2130 (Dulles R2) |
| vs 1.c4 | 1...e5 then 2...c6 | A25–A26 | 0W–1L–0D | vs Zachary Liu (NA Championship) |

Tarun's Sicilian specifics at current rating (1965, Oct 2026):
- **vs 2.Nf3 Nc6 3.Bc4 (anti-Sicilian):** 1.e4 c5 2.Nf3 Nc6 3.Bc4 e6 4.O-O d5 5.Bb5 a6 6.Bxc6+ bxc6 7.d4 — handled with ...e6 ...d5, created counterplay, drew Le-Tran (1908)
- **vs Rossolimo (3.Bb5):** 1.e4 c5 2.Na3 Nc6 3.Bb5 Nf6 **4.Bxc6 dxc6** 5.d3 g6 — accepted doubled c-pawns, played ...g6 ...Bg7 fianchetto setup, created complex tactical game vs Lin (2099)

**Key finding for Austin's preparation:** When Austin plays 3.Bb5 (Rossolimo), Tarun responds with **3...Nf6 then 4.Bxc6 dxc6**, accepting the structural damage in exchange for the bishop pair. He then plays ...g6 ...Bg7 creating a fianchetto Sicilian with doubled pawns. This is a well-known and principled response — the position is rich and tactical.

**vs 1.d4:** Mixed — King's Indian at lower rating, QGA vs a strong d4 player (Hebbar 2130). The KI was at rating 1406 in Madurai 2023 and may not reflect current prep. The QGA vs Hebbar at Dulles 2024 may be his attempt to create dynamic play vs d4.

---

## Tactical and Strategic Patterns

### Strengths

**1. Opening aggression and surprise factor**

Tarun's English Mikenas attack (3.e4) is his sharpest White weapon. The pawn wedge creates rich middlegame positions that many opponents are unfamiliar with. At Dulles 2024, the Catalan-English setup gave him tactically rich positions (3 draws/wins against 1800–1845-rated opponents at his 1706 rating).

**2. Sicilian complexity**

As Black, Tarun consistently steers into Sicilian structures that reward tactical accuracy over positional understanding. The ...g6/...Bg7 fianchetto setup (after 4.Bxc6 dxc6) gives Black the bishop pair and play against White's weakened pawn structure, even at the cost of doubled pawns.

**3. Fast improvement — suggests strong pattern recognition**

A 600-point jump in 2.5 years reflects not just hard work but strong tactical calculation ability. Players who improve this fast typically have excellent calculation depth even if positional understanding lags.

### Weaknesses

**1. Critical tactical errors under pressure**

In 5th Skyline R4 (vs Lin Benjamin 2099): On move 14, Tarun played **14...e4??** (from an eval of −2.0, meaning Black was already winning!) to +1.65 — a self-destructive blunder that gave away a winning position. This type of error (panicking and making an aggressive but losing move when already ahead) is a recurring junior pattern.

**2. Technical endgame play vs elite opponents**

- vs IM Fus (2419): Tarun had a sharp position from the Mikenas but got outplayed in the technical endgame phase. The loss suggests his endgame conversion is behind his tactical ability.
- vs Pyrig (2395): 393-point rating gap; lost as Black in a relatively short game (the position never developed in Tarun's favor against such a strong opponent).

**3. Losing as Black to similarly-rated players**

At Dulles 2024 (1706 rating), Tarun lost all three Black games: to Debmisra (1861), Sridhar (1838), and to a player in R2. His Black record at this period was 0W–3L vs 130–150 point higher opponents. While this has likely improved with his rating, it suggests Black was (and may still be) his weaker side.

**4. Throwing away winning positions — g4?? and Bd3?? patterns**

Thursday Club R5 (vs Mirzaliyeva 1829): From an equal position (0.00), Tarun played **31.g4??** (CPL 699), swinging the eval to -6.99. Two moves later, **32.Bf3??** (1000 CPL, -#). Lost to a player ~136 points below his rating from a level position. This is the same impulse blunder pattern as the 14...e4?? (Skyline R4) — aggression at the worst moment.

Thursday Club R4 (vs Boutikos 2144 as Black): **26...Bd3??** (CPL 1000, swings eval from +5.76 to -4.91) threw away a winning position that should have been won. Then two more 1000-CPL blunders before resignation. His 76.1% accuracy (9 blunders) is the worst single-game performance in the entire dataset.

**5. Stamina in long games — uncertain**

No long endgame games (100+ moves) appear in the dataset (unlike Leo Jackson or Emerson Johnson). Most games are medium length. Whether Tarun can hold or win long technical games is unknown — this may be an exploitable gap vs Austin's style of grinding for small advantages.

---

## Key Game Summaries

### 1. 5th Skyline Open R4 — Lin Benjamin (2099) vs Tarun (1965) 1–0

ECO B20 Sicilian Kronberger. 1.e4 c5 2.Na3 Nc6 3.Bb5 Nf6 4.Bxc6 dxc6 5.d3 g6 6.c3 Bg7 7.Be3 b6 8.Nf3 Ng4 9.Bg5 Qd7 10.Nf1 h6 11.Bg3 0-0-0 12.Nf5... On move 14, with Black holding an advantage around −2.0, Tarun played 14...e4?? — a critical blunder that turned a winning position into a lost one. Eventually resigned. Shows: Tarun can collapse tactically when the position is most critical.

### 2. 5th Skyline Open R6 — Le-Tran Leo (1908) vs Tarun (1965) ½–½

ECO B30 Sicilian Old. 1.e4 c5 2.Nf3 Nc6 3.Bc4 e6 4.O-O d5 5.Bb5 a6 6.Bxc6+ bxc6 7.d4... Tarun created complications and at one point had a clear advantage (approximately +2.45 for Black around move 22), but allowed White to equalize. Drew in a complex middlegame. Shows: Tarun can generate strong positions from Sicilian structures but misses the precise winning moment.

### 3. Texas Grand Circuit R5 — Tarun (2002) vs IM Fus Jakub (2419) 0–1

ECO A19 English Anglo-Indian Mikenas. 1.c4 e6 2.Nc3 Nf6 3.e4 c5 4.e5 Ng8... Tarun's most ambitious White opening, played against an IM 400+ points stronger. He created a complex position with the pawn wedge on e5 but ultimately lost in the endgame — a respectable performance given the rating gap.

### 4. Texas Grand Circuit R4 — Pyrig Roman (2395) vs Tarun (2002) 0–1

Black vs 2395 with 393-point rating gap. 1.e4 c5 2.Nf3 e6 3.b3 a6 — White played an unusual Sicilian sideline. Tarun played the standard Sicilian response (...e6, ...a6) but could not hold against such a strong opponent.

### 5. NA Championship 2024 R1 — Zachary Liu (2153) vs Tarun (1750) 0–1

With Tarun rated 1750, 403 points below Liu. 1.c4 e5 2.g3 c6 — Tarun played ...e5 ...c6 vs the English. Lost in 83 moves. Direct connection: Liu is also a potential Austin opponent.

### 6. Dulles Skyline 2024 R1 — Tarun (1706) vs Jackson Cayden (1876) 1–0

White win vs an opponent 170 points higher. 1.c4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4. Tarun's English opening with early d4 created a Sicilian Maróczy-type structure where he outplayed a stronger opponent — his clearest demonstration of tactical skill in the English.

---

## Summary Profile

| Attribute | Assessment |
|---|---|
| Rating | ~1965 FIDE (Oct 2026); peak 2002 (Mar 2026) |
| Style | Tactical, aggressive, complexity-seeking |
| White opening | 1.c4 English — Catalan-English (g3/Bg2) or Mikenas (e4/Nc3) |
| Black vs 1.e4 | Sicilian 1...c5 → 2...Nc6 (Old Sicilian/Kan-type) — 100% consistent |
| Black vs Rossolimo | 3...Nf6 4.Bxc6 dxc6 + fianchetto (...g6 ...Bg7) |
| Black vs 1.d4 | Flexible — KI or QGA; less consistent than vs 1.e4 |
| Black vs 1.c4 | 1...e5 then ...c6 (reversed Sicilian-type) |
| Strength | Opening complexity (Mikenas, Sicilian), tactical calculation, fast improver |
| Weakness | Blundering from winning/equal positions (g4??, Bd3??, e4?? pattern); endgame king misplacement; Black side unreliable vs 2000+ |
| Worst game in dataset | Thursday Club R4 vs Boutikos — 76.1% acc, 9 blunders; threw away +5.76 winning position |
| Direct rating gap vs Austin | ~0–100 points (Austin ~1865–1968, Tarun ~1965) — effectively even |
| vs Zachary Liu | Lost (1750 vs 2153, 2024) |
