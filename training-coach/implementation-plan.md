# Training Coach — Implementation Plan

---

## File Structure

```
training-coach/
├── analyze.py           # CLI entry point
├── pgn_parser.py        # Handles both PGN formats
├── engine.py            # Stockfish subprocess wrapper
├── lichess_api.py       # Opening Explorer + Tablebase API calls
├── annotator.py         # Critical moment extraction + pattern tagging
├── html_renderer.py     # Patches existing review.html in place
└── config.py            # Depth settings, thresholds, file paths
```

---

## Dependencies

```
python-chess     # PGN parsing, board/move manipulation
stockfish        # Python wrapper for local Stockfish binary
requests         # Lichess API calls
beautifulsoup4   # Parse and patch existing review.html files
```

Install: `pip install python-chess stockfish requests beautifulsoup4`

---

## Module Breakdown

### `config.py`
```python
DEPTH_STANDARD = 18
DEPTH_DEEP = 28          # for losses + direct encounters
EVAL_SWING_THRESHOLD = 1.0   # pawns — triggers critical moment flag
LICHESS_EXPLORER_URL = "https://explorer.lichess.ovh/lichess"
LICHESS_TABLEBASE_URL = "https://tablebase.lichess.ovh/standard"

# Weakness tag categories
TAGS = ["endgame", "conversion", "king-safety-h-file", "opening-prep", "tactical-miss"]
```

---

### `pgn_parser.py`

Two functions, one per format:

```python
def parse_lichess_pgn(filepath) -> list[Game]:
    # Uses python-chess pgn.read_game() — handles full headers,
    # [%eval] and [%clk] comments natively

def parse_pam_pgn(filepath) -> Game:
    # Reads line 1 (players + ratings), line 2 (date),
    # moves block, last line (result)
    # Returns a synthetic python-chess Game object

def load_game(filepath) -> Game:
    # Auto-detects format by checking if line 1 starts with '['
    # Dispatches to the right parser
```

---

### `engine.py`

```python
class StockfishAnalyzer:
    def __init__(self, depth: int)

    def analyze_game(self, game: Game) -> list[MoveEval]:
        # Returns list of {ply, move, eval_before, eval_after, best_move, best_line}

    def get_eval_swing(self, evals: list[MoveEval]) -> list[CriticalMoment]:
        # Filters positions where abs(eval_after - eval_before) >= EVAL_SWING_THRESHOLD
        # Returns sorted by swing magnitude (worst first)
```

Deep mode is selected by passing `depth=DEPTH_DEEP` — no separate code path needed.

---

### `lichess_api.py`

```python
def get_opening_at_fen(fen: str, color: str) -> OpeningData:
    # GET /lichess?fen=...&moves=10
    # Returns: {name, eco, top_moves: [{move, games, white_pct, draw_pct, black_pct}]}

def get_tablebase(fen: str) -> TablebassResult | None:
    # Only called when <= 7 pieces on board
    # Returns DTZ, outcome (win/draw/loss), best move

def find_theory_deviation(game: Game) -> DeviationPoint | None:
    # Walks moves, queries opening explorer each ply
    # Returns first move where played_move not in top_moves
    # Includes book recommendation at that point
```

---

### `annotator.py`

```python
def tag_moment(moment: CriticalMoment, game_phase: str) -> list[str]:
    # game_phase: "opening" | "middlegame" | "endgame" (by move number)
    # Returns applicable tags from TAGS list

def annotate_game(game: Game, evals: list[MoveEval], deviation: DeviationPoint) -> AnnotatedGame:
    # Combines: top 3 critical moments + opening deviation + endgame tablebase check
    # Adds plain-language explanation for each moment:
    #   "Move 24: Austin played Rxf7 (–1.2). Best was Nd5 — centralizing the knight
    #    keeps the e5 pawn defended and prepares a queenside breakthrough."

def build_game_summary(annotated: AnnotatedGame, player: str) -> GameSummary:
    # Returns: result, opponent, color, opening, deviation_point,
    #          top_moments (max 3), tags, prep_note (one line)
```

---

### `html_renderer.py`

```python
def patch_review_html(html_path: str, summaries: list[GameSummary]) -> None:
    # Loads existing review.html with BeautifulSoup
    # Finds the game section for each game by round/opponent name
    # Injects: opening deviation, annotated moments, weakness tags, prep note
    # Preserves all existing structure and styling
```

No full regeneration — surgical patch only, so existing formatting is kept.

---

### `analyze.py` (CLI entry point)

```python
# Usage:
#   python analyze.py --player austin --tournament naycc2025
#   python analyze.py --player austin --tournament all
#   python analyze.py --opponent zachary --deep

# Flags:
#   --deep       force depth 28 for all games (default: auto-select by game type)
#   --dry-run    print summaries to stdout, don't write HTML
```

Execution order per game:
1. `load_game()` → parse PGN
2. `find_theory_deviation()` → opening explorer
3. `analyze_game()` → Stockfish (depth auto-selected)
4. `get_eval_swing()` → critical moments
5. `tag_moment()` × N → weakness tags
6. `annotate_game()` → plain-language notes
7. `patch_review_html()` → update HTML

---

## Execution Order (Build Sequence)

1. `config.py` — constants only, no dependencies
2. `pgn_parser.py` — depends on `python-chess`
3. `engine.py` — depends on `python-chess` + `stockfish`
4. `lichess_api.py` — depends on `requests`
5. `annotator.py` — depends on 2, 3, 4
6. `html_renderer.py` — depends on `beautifulsoup4` + 5
7. `analyze.py` — wires everything together, add CLI last

Test each module independently before wiring. Start with `pgn_parser.py` since it has no network/engine dependency.

---

## First Run Target

Once built, first run:
```bash
python training-coach/analyze.py --opponent zachary --deep --dry-run
```
Verify output looks right, then drop `--dry-run` to write the HTML.
