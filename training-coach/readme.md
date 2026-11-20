# Training Coach

A Python-based chess analysis and preparation pipeline for Austin Lin's tournament prep. It operates at two levels: **IM-level** (deep game review) and **GM-level** (single-opponent battle preparation).

---

## Two Pipelines

### 1. IM-Level Review — `analyze.py`

Runs Stockfish analysis on Austin's games or an opponent's games and regenerates the HTML review files.

```bash
cd training-coach

# Review Austin's games from a tournament
python analyze.py --player austin --tournament naycc2025
python analyze.py --player austin --tournament all

# Review an opponent's games
python analyze.py --opponent zachary

# Deep analysis (depth 28) without writing files
python analyze.py --opponent zachary --deep --dry-run
```

**What it does:**
1. Parses PGN files (supports both Lichess broadcast format and PAM non-standard format)
2. Runs Stockfish at configurable depth (auto-selects depth 18–28 per game importance)
3. Flags critical moments where evaluation swings ≥ 1.0 pawn
4. Tags each moment by weakness category: `endgame`, `king-safety`, `opening-prep`, `tactical-miss`
5. Patches the existing `review.html` or `matchup.html` in place with annotations

**Key modules:**
| File | Purpose |
|------|---------|
| `analyze.py` | CLI entry point |
| `pgn_parser.py` | Loads PGN files, handles both Lichess and PAM formats |
| `engine.py` | Stockfish wrapper (movetime or depth) |
| `annotator.py` | Computes CPL, accuracy, tags critical moments |
| `html_renderer.py` | Patches `review.html` / `matchup.html` with new annotations |
| `lichess_api.py` | Lichess Opening Explorer + Tablebase API calls |
| `config.py` | Paths, depth thresholds, CPL cutoffs |

**CPL thresholds** (matches the Node.js pipeline):
- Inaccuracy: ≥ 50 centipawns
- Mistake: ≥ 150 centipawns
- Blunder: ≥ 300 centipawns

---

### 2. GM-Level Prep — `gm-preparation/run_gm_prep.py`

For high-stakes games (top-3 finish at stake), this pipeline goes deeper: pulls the opponent's full Lichess history, builds a personal opening tree, finds novelty candidates, and writes a battle plan HTML.

```bash
cd training-coach/gm-preparation

python run_gm_prep.py \
  --opponent zachary \
  --lichess-username leilei8514 \
  --color white \
  --tournament "Canada Closed 2027" \
  --time-control 90+30

# Resume without re-fetching games:
python run_gm_prep.py --opponent zachary --lichess-username leilei8514 --skip-fetch

# Skip depth-40 analysis (faster):
python run_gm_prep.py --opponent zachary --lichess-username leilei8514 --skip-deep
```

**6-phase pipeline:**

| Phase | Module | What it does |
|-------|--------|-------------|
| 1 — Fetch | `lichess_fetch.py` | Pulls up to 500 classical + rapid games via Lichess API; saves to `{opponent}-full.pgn` |
| 2 — Opening Tree | `opening_tree.py` | Builds a personal opening tree from all games; finds where opponent deviates from book |
| 3 — Deep Engine | `deep_engine.py` | Runs Stockfish depth 40 on critical lines; verifies novelty candidates are sound |
| 4 — Novelty Finder | `novelty_finder.py` | Identifies deviations from Lichess master DB; scores by win rate and engine evaluation |
| 5 — Clock Analysis | `clock_analyzer.py` | Maps time usage by move number; finds where opponent goes into time pressure |
| 6 — Battle Plan | `battle_plan.py` | Assembles all findings into a `gm-{opponent}.html` battle plan |

**Outputs:** written to `gm-preparation/output/{opponent}/`

---

## Setup

Requires Python 3.10+ and Stockfish installed locally.

```bash
cd training-coach
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install chess requests   # only standard deps

# Stockfish path is configured in config.py:
# STOCKFISH_PATH = "/usr/local/bin/stockfish"  (adjust as needed)
```

The `.env` file at the project root holds the Lichess API token. `lichess_api.py` reads it automatically.

```
LICHESS_TOKEN=lip_xxxx...
```

---

## Relationship to Node.js Scripts

The `scripts/` folder at the project root contains Node.js scripts (`analyze-{name}.js`) that run the same Stockfish analysis and produce the deep HTML files. The two pipelines overlap in function but were built at different times:

- **Node.js scripts** — mature, produce the final HTML files committed to the repo; use them for the standard pipeline
- **Python training-coach** — newer, more modular; use it for GM-level prep and when you need opening tree or clock analysis features not in the Node scripts

---

## Status

| Component | Status |
|-----------|--------|
| `analyze.py` IM pipeline | Working |
| `gm-preparation/` GM pipeline | Working — used for Reyansh, Zachary, Asher prep (NAYCC 2026) |
| Opening tree builder | Working |
| Novelty finder | Working |
| Clock analyzer | Working |
| Battle plan HTML output | Working |
