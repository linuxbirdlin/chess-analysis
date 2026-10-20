# GM-Level Preparation — Proposal

**Context:** We already have an IM-level pipeline (Stockfish analysis, CPL accuracy, opening ECO, critical moments, matchup HTMLs). This proposal defines what additional resources and methods are required to elevate to **GM-level preparation** for a single critical game — a scenario where Austin is in the top 3 and the result against a specific opponent decides a podium finish.

---

## What I Need From the Internet

### 1. Lichess Games API — Full Opponent History
```
GET https://lichess.org/api/games/user/{username}?perfType=classical,rapid&max=500&clocks=true&evals=false&opening=true
```
- Pulls all rated classical + rapid games for the opponent (potentially 200–500+ games)
- Our current PGN files have 8–64 games per opponent — a Lichess pull gives 5–10× more data
- `clocks=true` includes `[%clk]` annotations for time-pressure analysis
- **Requires:** Opponent's Lichess username

### 2. Lichess Player-Specific Opening Explorer
```
GET https://explorer.lichess.ovh/lichess?player={username}&color=white&fen=...&moves=20
```
- Unlike the generic Lichess explorer, `player=` returns stats *for that specific person*
- Shows their personal move frequency, win rate, and draw rate at every branch
- Lets us map their preparation depth: where they play instantly vs where they deviate
- **Requires:** Opponent's Lichess username

### 3. Lichess Tablebase API (already in IM pipeline)
```
GET https://tablebase.lichess.ovh/standard?fen=...
```
- For endgame positions with ≤7 pieces: exact DTZ (distance to zeroing) + best move
- Needed if the prepared line leads to a theoretical endgame

---

## What I Need From You

| Item | Why |
|---|---|
| **Target opponent name** (one of the 12) | Determines which existing analysis to build on |
| **Opponent's Lichess username** | Unlocks the full game history and personal opening explorer |
| **Austin's Lichess username** (optional) | Lets me cross-reference their opening choices to find the best collision point |
| **Tournament + time control** | GM prep for a 90+30 classical game is different from a 15+10 rapid |
| **When is the critical game?** | Sets the prep depth: 3 days vs 3 weeks changes the scope |

---

## What "GM Level" Means vs What We Have

| Dimension | IM Level (current) | GM Level (proposed) |
|---|---|---|
| Game sample | 8–64 games from recent tournaments | 200–500+ games (full Lichess history) |
| Opening analysis | ECO code + deviation point | Personal opening tree to move 20+, exact variation stats |
| Engine depth | movetime-800 (~depth 18) | depth 40+ on key positions; multi-PV |
| Second engine | None | Leela Chess Zero (LC0) cross-check for positional subtleties |
| Clock analysis | None | Time profiling per position — find where preparation ends |
| Output | Pattern report + general recommendation | Specific move-by-move battle plan Austin can memorize |
| Novelty prep | None | Identifies one concrete novelty in the opponent's main line |

---

## The GM Pipeline — 6 Phases

### Phase 1: Full Database Pull
Pull the opponent's complete Lichess game history. Filter to classical + rapid (same time control as the tournament). This gives the statistical foundation for all subsequent analysis.

**Output:** `{opponent}-full-games.pgn` (~200–500 games) stored in `pgnlib/` or `training-coach/gm-preparation/`

---

### Phase 2: Personal Opening Tree
Build a branching tree of the opponent's exact variation choices. At each position where they have ≥5 games, record:
- Their most-played move (and frequency)
- Their win rate with that move
- How deep their preparation goes (where response times spike)

**Output:** `{opponent}-opening-tree.json` — a move-frequency tree for both colors

---

### Phase 3: Clock Profiling
Parse `[%clk]` annotations from all games with clock data. For each move, record the time delta (time spent on this move). Build a "heat map" of positions:
- **Fast moves** (< 10s) = well-prepared, probably theory
- **Slow moves** (> 3 min) = uncertain, improvising
- **Very slow moves** (> 5 min) = critical decision point

**Output:** `{opponent}-clock-profile.json` — time-per-position data keyed by FEN

---

### Phase 4: Novelty Discovery
At the intersection of:
- The opponent's most-played main line
- The point where their clock time spikes (preparation ends)
- Engine evaluation of alternatives

Find **one concrete novelty**: a move Austin can play that is (a) theoretically sound, (b) the opponent has never faced or prepared against, (c) leads to a position type that suits Austin's style.

**Output:** `{opponent}-novelty.md` — the specific position, the novelty move, and 10 moves of worked lines

---

### Phase 5: Deep Engine Verification
For the 3–5 positions that matter most (the novelty + two likely alternatives), run:
- **Stockfish depth 40+** — tactical verification, exact evaluation
- **LC0** (Leela Chess Zero) — positional cross-check (neural network sees differently from SF)
- **Multi-PV = 5** — understand all serious options, not just the top move

**Output:** `{opponent}-deep-positions.json` — engine verdicts for key positions

---

### Phase 6: Battle Plan Document
The final deliverable — a concrete, memorizable document Austin takes into the game:

```
1. e4 — if opponent plays 1...e5:
   → Play 2.Nf3 3.Bb5 (Exchange Spanish)
   → After 3...a6 4.Bxc6 dxc6:
      Critical position: [diagram FEN]
      Play: 5.0-0 → 5...f6 → 6.d4 exd4 → 7.Nxd4 (our novelty region)
      Opponent's clock profile: plays FAST here → they know this
      Our preparation: at move 9, play Bg5 (rarely seen, NN-validated)

2. If opponent plays 1...c5:
   → [Sveshnikov line]
   ...
```

**Format:** Printable HTML with move trees, diagrams, and "think here / play fast here" annotations.

---

## Architecture: What's New vs What We Reuse

```
training-coach/gm-preparation/
├── lichess_fetch.py        # NEW — Lichess Games API + player opening explorer
├── opening_tree.py         # NEW — build personal variation tree from game database
├── clock_analyzer.py       # NEW — parse [%clk] annotations, build time profiles
├── novelty_finder.py       # NEW — identify preparation opportunities
├── deep_engine.py          # EXTENDS engine.py — depth 40, multi-PV, LC0 support
└── battle_plan.py          # NEW — generate the memorizable HTML battle plan

# Reused from training-coach/ (IM pipeline):
../pgn_parser.py            # PGN parsing (both formats)
../lichess_api.py           # Opening explorer + tablebase
../engine.py                # Stockfish wrapper (base for deep_engine.py)
../config.py                # Constants
```

---

## What Makes This "GM Level"

Real GM tournament preparation has three properties this pipeline replicates:

1. **Specificity**: Not "opponent plays the Sicilian" but "opponent plays 1...c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 e5 5.Nb5 d6 6.c4 Nf6 — and at move 7 they always play 7...a6, never 7...Be7." That level of specificity comes only from a large personal database.

2. **Depth**: GMs prepare past the point where the opponent's preparation ends. The clock profile tells us exactly where that point is. The novelty targets one move *after* their preparation ends.

3. **Memorability**: A GM battle plan is not a report — it is a decision tree Austin can walk through in his head during the game. The output must be structured as IF/THEN branches, not paragraphs.

---

## Leela Chess Zero (LC0) — Why It's Needed

Stockfish plays perfectly within its search horizon but can miss positional plans that take 15+ moves to materialize. LC0 (neural network) was trained on millions of games and evaluates positions more "humanly" — it notices that a knight on the rim will be a long-term liability even if there's no immediate tactic.

For Austin's opening preparation, LC0 is specifically valuable when:
- The prepared line leads to a slow, maneuvering position (Italian/Spanish structures)
- We want to verify that our novelty doesn't have a "silent" long-term drawback

**Requirement:** LC0 binary + a compatible network weights file. Both are free downloads. If not available locally, the Lc0.org API can be used as a fallback.

---

## Scope and Time Estimate

| Phase | Time to build script | Time to run (per opponent) |
|---|---|---|
| 1: Database pull | 1–2 hours | 5 min (API) |
| 2: Opening tree | 3–4 hours | 10–20 min |
| 3: Clock profiling | 2–3 hours | 5–10 min |
| 4: Novelty discovery | 3–4 hours | 15–30 min |
| 5: Deep engine | 1–2 hours | 30–90 min (depth 40 is slow) |
| 6: Battle plan HTML | 3–4 hours | 5 min (rendering) |
| **Total** | **~15 hours** | **~2 hours per opponent** |

Build time is one-time. After that, a new opponent prep runs in ~2 hours.

---

## Next Step

To proceed, provide:
1. **Which opponent** from the 12 should be the first GM prep target?
2. **Their Lichess username** (find at lichess.org/@/{username})
3. **Tournament + approximate date** of the critical game
4. **Time control** (classical 90+30? rapid 15+10?)

Once confirmed, I'll build the pipeline starting with `lichess_fetch.py` and `opening_tree.py`.
