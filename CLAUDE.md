# Chess Analysis Project — Agent Instructions

This file provides context, conventions, and instructions for any AI agent (including future Claude sessions) working on this chess preparation project.

---

## Project Purpose

This project helps **Austin Lin** prepare for competitive chess tournaments by:
1. Analyzing his own games (strengths, weaknesses, opening patterns)
2. Analyzing potential opponents' games
3. Generating matchup-specific preparation plans

Opponents analyzed to date: **Justin Huang, Aarush Ajith, Zachary Liu, Heye Gao, Fernando Cortes Medina, Pranav Santhosh, Emerson Johnson, Leo Jackson, Tarun Sankar, Daniel Hernandez Gamboa, Yaen Saenz Cabrera, Daniel Joshua Lee, Pablo Elliot De Alba Boudreau, Joel Ethan Jeyaraj** — full pipeline complete for all 14 opponents (deep HTML + white/black matchup HTMLs)

---

## Project Structure

```
chess-analysis/
├── readme.md                   # Project goals, task log, and shareable links
├── CLAUDE.md                   # This file — agent instructions
│
├── austin-prep.html            # Shareable preparation INDEX (pure navigation hub)
├── austin-training.html        # 4-week training plan detail (linked from index)
├── austin-prep.md              # Source markdown for training plan content
│
├── analysis/                   # Player analysis reports (one per player)
│   ├── austin-analysis.md      # Austin's detailed player analysis
│   └── {opponent}-analysis.md  # One per opponent: justin, aarush, zachary, heye,
│                               #   fernando, pranav, emerson, leo, tarun,
│                               #   danielh, yaen, danielee, pablo, joel
│
├── pgnlib/                     # Combined PGN library (one file per opponent)
│   └── {Legal Name}.pgn        # All games merged, sorted by date desc, deduplicated
│                               #   e.g. "Huang, Justin.pgn", "Ajith, Aarush.pgn"
│
├── matchup/
│   ├── matchup-{name}.md       # Matchup prep source (per opponent)
│   ├── matchup-{name}.html     # Matchup prep HTML (shareable)
│   ├── matchup-{name}-deep.html  # Engine-backed deep analysis HTML
│   ├── matchup-{name}-white.html # Austin as White per-color prep
│   └── matchup-{name}-black.html # Austin as Black per-color prep
│       # Full pipeline (deep + white + black) for all 12 opponents
│
├── austin/
│   ├── naycc2025/              # NAYCC 2025 games (9 games, PGN)
│   │   ├── review.html         # Standard tournament review (shareable)
│   │   └── review-deep.html    # Deep IM-level review (shareable)
│   ├── pam2026/                # PAM 2026 games (7 games, non-standard format)
│   │   ├── review.html
│   │   └── review-deep.html
│   ├── personal-study/         # Lichess study games (29 games, PGN)
│   │   ├── review.html
│   │   └── review-deep.html
│   └── copilot-review/         # Reference template (not Austin's games)
│
├── scripts/
│   ├── analyze-{opponent}.js   # Stockfish analysis scripts (one per opponent)
│   ├── build-pgnlib.js         # Builds pgnlib/ from opponents/ (deduplicates, sorts)
│   └── {opponent}-analysis-results.json  # Cached engine results
│
├── training-coach/             # Training coach proposal docs
│
└── opponents/
    ├── justin/                 # canadaclosed2026, pam2026, pamschool2026, torontoopen2026
    ├── aarush/                 # canadaclosed2026, pamschool2026, pam2026, torontoopen2026
    ├── zachary/                # britishleague, bscup2026, canadaclose2026, pam2026, pamschool2026
    ├── heye/                   # canadaclose2026, pam2026, pamschool2026, torontoopen2026
    ├── fernando/               # ed-national, mex-ch16th, mex-op71, olypianational2026, pamschool2026
    ├── pranav/                 # agcafall2026, agcasummer2026, worldyouth2026
    ├── emerson/                # 7 tournaments, 40 games
    ├── leo/                    # jackson,leo.pgn — 47 games
    ├── tarun/                  # Tarun.pgn, grandcircuit.pgn, skyline2026.pgn — 17 games
    ├── danielh/                # queretaro2024/2025/2026, anothergame — 8 games
    ├── yaen/                   # saenz cabrera, yaen.pgn — 64 games
    ├── danielee/               # canadaclose2026, pam2026, pamschool2026, torontoopen2026 — 24 games
    ├── pablo/                  # PabliElliot-ChaseBase.pgn (57 games) + newgames.pgn (3 Copa 2026 games)
    └── joel/                   # Joel-Ethan-chessBase.pgn (1 classical) + lichess_JEJ13_2026-10-26.pgn (100 Lichess)
```

---

## File Conventions

### Game file formats

**Lichess broadcast PGN format** (standard): Files under `naycc2025/`, `canadaclosed2026/`, `pamschool2026/`, and `torontoopen2026/` use full PGN headers including `[Event]`, `[White]`, `[Black]`, `[Result]`, `[ECO]`, `[BroadcastURL]`, `[GameURL]`, etc. These files also contain inline Stockfish evaluations (`[%eval ...]`) and clock annotations (`[%clk ...]`). Some broadcast games have `*` as the result when the game record was captured mid-stream or was incomplete.

**Non-standard format** (PAM 2026 files): The PAM 2026 files have a minimal header — just `PlayerName (rating) - PlayerName (rating)` on line 1, date on line 2, then moves, then result on the last line. Example:
```
Lin, Austin (1865) - Villalba, Pacha (1731)
28.07.2026

1.e4 c6 2.d4 d5 ...

1-0
```

### Result interpretation
- `1-0` = White wins
- `0-1` = Black wins
- `1/2-1/2` = Draw

### File naming
- NAYCC/Canada Closed files: `game_XXXXXXX.pgn` (game IDs from the tournament system)
- PAM 2026 files: `round{N}.pgn` (round number)

### HTML files

`austin-prep.html` is a hand-built navigation index (not pandoc-generated). Edit it directly. It links to all review pages, matchup pages, and `austin-training.html`. Shareable via:
```
https://linuxbirdlin.github.io/chess-analysis/austin-prep.html
```

`austin-training.html` is the 4-week training plan detail page. Edit it directly for weekly notes or content changes.

Matchup HTMLs (`matchup/matchup-{name}.html`) and deep HTMLs (`matchup/matchup-{name}-deep.html`) are hand-built. Deep HTMLs include Stockfish accuracy data sourced from `scripts/{name}-analysis-results.json`.

---

## How to Add New Games

When new games are added for Austin or an opponent:

1. Place PGN files in the appropriate subdirectory:
   - `austin/{tournament_name}/` for Austin's games
   - `{opponent_name}/{tournament_name}/` for opponent games

2. Update the relevant analysis report (`austin-analysis.md` or `{opponent}-analysis.md`) with:
   - New results table entries
   - Any new opening patterns observed
   - Notable tactical or strategic moments

3. Update `matchup/matchup-{opponent-name}.md` if new games reveal meaningful pattern changes.

4. Note the tournament name convention: use lowercase with no spaces (e.g., `naycc2025`, `pam2026`, `canadaclosed2026`).

---

## How to Add a New Opponent

When a new opponent folder is added:

1. Create `opponents/{opponentname}/` directory with tournament subdirectories.
2. Read all PGN files in that directory.
3. Create `{opponent-name}-analysis.md` following the same structure as `justin-analysis.md`:
   - Overall results table by tournament and color
   - Opening repertoire (as White and Black)
   - Tactical patterns (strengths and weaknesses)
   - Strategic patterns
   - Key game summaries
   - Summary profile table
4. Create `matchup/matchup-{opponent-name}.md` and `.html` with:
   - Analysis by color (Austin White and Austin Black)
   - Specific opening recommendations
   - Key tactical themes to prepare
   - Psychological and practical notes
5. Write `scripts/analyze-{name}.js` (copy `analyze-pranav.js` as a template) and run Stockfish analysis. Cache results to `scripts/{name}-analysis-results.json`.
6. Create `matchup/matchup-{name}-deep.html` using `matchup-pranav-deep.html` as a template — include per-game accuracy stats and critical moments from the JSON.
7. Add the opponent block to `austin-prep.html` (the index) with links to the matchup, deep, and review pages.

---

## Key Player Profiles (Quick Reference)

### Austin Lin
- **Rating:** ~1865–1968 (U14 level)
- **White opening:** 1.e4 exclusively — Exchange Caro-Kann (4.Bd3), Advanced French (3.e5/3.Nd2), Rossolimo Sicilian (Bb5) and h4 systems
- **Black opening:** Nimzo-Indian `Bxc3+` with `...b6/...Ba6` vs 1.d4; Sicilian vs 1.e4
- **Style:** Tactical, combinational, sharp positions
- **Strengths:** Knight sacrifices, IQP positions, Nimzo theory
- **Weaknesses:** King safety on h-file, passive endgames, accuracy drop vs 2000+

### Opponents (see individual {name}-analysis.md for full profiles)

| Opponent | Rating | White | Black | Direct record |
|---|---|---|---|---|
| Justin Huang | 2093 | 1.d4 QGD/Semi-Slav | French + Sicilian | 0W–1L (NAYCC R4) |
| Aarush Ajith | 1895 | 1.d4 | Sicilian Najdorf | No encounter |
| Zachary Liu | ~2050–2250 | Reti/English | Sicilian | No encounter |
| Heye Gao | ~2028–2065 | Italian | Slav | 1D (Mar 2026) |
| Fernando Cortes Medina | ~2026–2133 | 1.e4/1.c4 | French | No encounter |
| Pranav Santhosh | 1940 | 1.e4 English Attack/Maróczy | Italian/Lopez | No encounter |
| Emerson Johnson | 1925 FIDE / 2078 US | 1.e4 Rossolimo/Exch CK | Caro-Kann/QGA | No encounter |
| Leo Jackson | ~2077 FIDE (est. Oct 2026; was 2009 PAM) | 1.d4 Catalan (3.Nf3, no Nc3) | French Defense: Advance 3...c5 4.c3 Qa5; Tarrasch Chistyakov 3...c5 Qxd5 | No encounter |
| Tarun Sankar | ~1965 FIDE (peak 2002) | 1.c4 English (Catalan/Mikenas) | Sicilian | No encounter |
| Daniel Hernandez Gamboa | ~1685–1692 FIDE | 1.e4 (Philidor/Pirc/Sicilian) | 1...e5 Four Knights | No encounter |
| Yaen Saenz Cabrera | ~1841 FIDE (peak 1899) | 1.e4 Scotch C45 | Sicilian Sveshnikov B32/B33 | No encounter |
| Daniel Joshua Lee | ~2191 FIDE (Sep 2026; was 1942 Apr 2026) | 1.e4 Maróczy Bind B36/B38/Taimanov B45/B47 | Italian C54/C55 + QGA D27/D20 | No encounter |
| Pablo Elliot De Alba Boudreau | ~1824 FIDE (peaked 1937 Jun 2026) | 1.e4 English Attack vs Sicilian; Ruy Lopez vs e5 (1W–6L+) | Sicilian Kan/Taimanov (2…e6 4…a6) 15+ games | No encounter |
| Joel Ethan Jeyaraj | 1872 FIDE / 2114 Lichess Blitz | 1.Nf3 → Nimzo-Larsen (2.b3 Bb2) PRIMARY; 1.d4/1.c4 secondary | Scandinavian Modern B01 (3...Nf6 ...g6 fianchetto) PRIMARY; Caro-Kann secondary | No encounter |

---

## Analysis Standards

When writing or updating analysis reports, follow these standards:

1. **Back every claim with game references.** Do not make general statements without citing specific games (e.g., "NAYCC R3 vs Chitta" or "PAM R6 vs Marin Marin").
2. **Separate facts from interpretation.** State what happened in the game, then give your interpretation.
3. **Be specific about openings.** Use ECO codes where available. Name the specific variation (e.g., "Nimzo-Indian Bxc3+ variation with ...b6/...Ba6").
4. **Results by color matter.** Always break results down by White/Black — this is often more informative than overall score.
5. **Rating context matters.** Note when Austin or an opponent beat or lost to significantly higher/lower-rated players — these are the most informative data points.

---

## Future Tasks (Suggested)

- **Analyze Emerson Johnson, Leo Jackson, Tarun** — PGN files are in `opponents/{emerson,leo,tarun}/`. Follow the full pipeline: analysis.md → matchup.md → matchup.html → analyze script → deep HTML → add to index.
- **Update Austin's accuracy chart** — add accuracy data for new personal study games as they accumulate.
- **Opening database check** — verify where Austin/Justin/Pranav deviate from theory using Lichess explorer.
- **Endgame study list** — Austin's endgame losses: NAYCC R7 (Beegala), R9 (Li), PAM R5 (Vinales). Compile Lucena/Philidor drill set.
- **Pattern tracking** — as more games accumulate, track recurring blunder types to identify persistent habits.

## Engine Analysis Pipeline (reference)

Scripts in `scripts/` use `analyze-pranav.js` as the canonical template:
- Stockfish movetime-800, 16 threads
- Supports standard Lichess PGN and non-standard (PAM/World Youth) formats
- PGN repair: disambiguation of ambiguous moves, truncation at illegal moves
- Accuracy formula: Lichess win-probability drop → `103.1668 * exp(-0.04354 * avg) - 3.1669`
- CPL thresholds: inaccuracy ≥50, mistake ≥150, blunder ≥300
- Results cached to JSON; re-run is safe (cached games are skipped)

---

## Notes on Data Quality

- PAM 2026 files do not include full PGN headers, only players, date, moves, and result. Tournament name and round info may need to be inferred from context.
- Some PAM 2026 games appear to have incomplete move records (e.g., `opponents/justin/pam2026/round5.pgn` ends at move 15 despite showing a 1-0 result — may be a truncated PGN or an early resignation).
- NAYCC game IDs in filenames (e.g., `game_263278.pgn`) correspond to the `[GameId]` field in the PGN headers.
- `opponents/justin/pamschool2026/` uses Lichess broadcast PGN format (full headers, evals, clock). The file names are `round4.pgn`–`round8.pgn` but the actual `[Round]` tags in the PGNs may not match the filenames exactly (e.g., `round7.pgn` contains Round 8, `round8.pgn` contains Round 9). Several games have `*` as the Result tag — these were live-broadcast games with incomplete or unknown results.
- `opponents/justin/torontoopen2026/` also uses Lichess broadcast PGN format. Only rounds 2, 4, and 5 are present (rounds 1, 3 not included).
- `austin/copilot-review/Tournament_Review___Performance_Analysis.md` is an AI-generated reference document (likely GitHub Copilot). It covers a generic 6-round tournament for an unspecified ~1800–2000 Elo player and is NOT Austin's specific game analysis — treat it as a template/reference only.
