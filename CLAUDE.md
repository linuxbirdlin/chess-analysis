# Chess Analysis Project — Agent Instructions

This file provides context, conventions, and instructions for any AI agent (including future Claude sessions) working on this chess preparation project.

---

## Project Purpose

This project helps **Austin Lin** prepare for competitive chess tournaments by:
1. Analyzing his own games (strengths, weaknesses, opening patterns)
2. Analyzing potential opponents' games
3. Generating matchup-specific preparation plans

Current opponent being analyzed: **Justin Huang**

---

## Project Structure

```
chess-analysis/
├── readme.md                  # Project goals and task descriptions
├── CLAUDE.md                  # This file — agent instructions
├── austin-analysis.md         # Austin's detailed player analysis
├── austin-prep.md             # Austin's 1-month training and exercise plan (source)
├── austin-prep.html           # Shareable HTML version of austin-prep.md
├── justin-analysis.md         # Justin's detailed player analysis
├── matchup-justin.md          # Austin vs Justin preparation plan
│
├── austin/
│   ├── naycc2025/             # NAYCC 2025 games (9 games, PGN format)
│   └── pam2026/               # PAM 2026 games (7 games, non-standard format)
│
└── justin/
    ├── canadaclosed2026/      # Canada Closed 2026 games (9 games, PGN format)
    └── pam2026/               # PAM 2026 games (9 games, non-standard format)
```

---

## File Conventions

### Game file formats

**PGN format** (standard): Files under `naycc2025/` and `canadaclosed2026/` use full PGN headers including `[Event]`, `[White]`, `[Black]`, `[Result]`, `[ECO]`, etc.

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

### HTML preparation plan
`austin-prep.html` is a hand-styled HTML version of `austin-prep.md`, shareable via:
```
https://linuxbirdlin.github.io/chess-analysis/austin-prep.html
```
When `austin-prep.md` is updated, regenerate the HTML with pandoc and re-apply the custom styles:
```bash
pandoc austin-prep.md --standalone --metadata title="Austin Lin — Tournament Preparation Plan" -o austin-prep.html
# then replace the <style> block with the custom CSS from the existing austin-prep.html
```
Or edit `austin-prep.html` directly if the change is small (e.g., filling in weekly notes).

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

3. Update `matchup-{opponent-name}.md` if new games reveal meaningful pattern changes.

4. Note the tournament name convention: use lowercase with no spaces (e.g., `naycc2025`, `pam2026`, `canadaclosed2026`).

---

## How to Add a New Opponent

When a new opponent folder is added:

1. Create `{opponentname}/` directory with tournament subdirectories.
2. Read all PGN files in that directory.
3. Create `{opponent-name}-analysis.md` following the same structure as `justin-analysis.md`:
   - Overall results table by tournament and color
   - Opening repertoire (as White and Black)
   - Tactical patterns (strengths and weaknesses)
   - Strategic patterns
   - Key game summaries
   - Summary profile table
4. Create `matchup-{opponent-name}.md` (e.g., `matchup-justin.md`, `matchup-alex.md`) with:
   - Analysis by color (Austin White and Austin Black)
   - Specific opening recommendations
   - Key tactical themes to prepare
   - Psychological and practical notes

---

## Key Player Profiles (Quick Reference)

### Austin Lin
- **Rating:** ~1865–1968 (U14 level)
- **White opening:** 1.e4 exclusively
  - vs Caro-Kann: Exchange (4.Bd3)
  - vs French: Advanced (3.e5 / 3.Nd2)
  - vs Sicilian: Rossolimo (Bb5) and h4 systems
- **Black opening:** Nimzo-Indian (1.d4 Nf6 2.c4 e6 3.Nc3 Bb4) as primary weapon; Sicilian vs 1.e4
- **Style:** Tactical, combinational, prefers sharp positions
- **Strengths:** Knight sacrifices, IQP positions, Nimzo-Indian theory
- **Weaknesses:** King safety on h-file, passive endgames, vs 2000+ opposition

### Justin Huang
- **Rating:** ~1963–2023
- **White opening:** 1.d4 exclusively, QGD-based structures
- **Black opening:** French Defense (1...e6) against 1.e4; QGD-type against 1.d4
- **Style:** Positional, solid, patient; strong in technical endgames
- **Strengths:** French expertise, long endgame technique, pawn structures
- **Weaknesses:** Passive when Black against strong opposition, kingside attacks in Classical French

### Direct Encounter
- NAYCC 2025 R4: Austin (White) vs Justin (Black), French Advanced C02, **Justin won (0-1)**

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

When more games are added, consider:

- **Engine analysis:** Run Stockfish or Leela on key games to find critical missed moves (especially Austin's losses as White).
- **Opening database check:** Verify where Austin/Justin deviate from theory in their main lines.
- **Pattern tracking:** As more games accumulate, track recurring tactical motifs and blunders to identify persistent habits.
- **Endgame study list:** Based on Austin's endgame losses (NAYCC R7 vs Beegala, R9 vs Li, PAM R5 vs Vinales), compile specific endgame types for Austin to study.

---

## Notes on Data Quality

- PAM 2026 files do not include full PGN headers, only players, date, moves, and result. Tournament name and round info may need to be inferred from context.
- Some PAM 2026 games appear to have incomplete move records (e.g., `justin/pam2026/round5.pgn` ends at move 15 despite showing a 1-0 result — may be a truncated PGN or an early resignation).
- NAYCC game IDs in filenames (e.g., `game_263278.pgn`) correspond to the `[GameId]` field in the PGN headers.
