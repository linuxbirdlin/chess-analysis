# GM-Level Preparation — Implementation Plan

---

## File Structure

```
training-coach/gm-preparation/
├── start.md                    # Brief from user (already exists)
├── proposal.md                 # This proposal (already exists)
├── implementation-plan.md      # This file
│
├── lichess_fetch.py            # Phase 1: pull full game history from Lichess API
├── opening_tree.py             # Phase 2: build personal opening variation tree
├── clock_analyzer.py           # Phase 3: time profiling from [%clk] annotations
├── novelty_finder.py           # Phase 4: identify preparation opportunities
├── deep_engine.py              # Phase 5: depth-40 + multi-PV + LC0 support
├── battle_plan.py              # Phase 6: generate HTML battle plan
│
├── run_gm_prep.py              # CLI entry — orchestrates all 6 phases
│
└── output/                     # Generated per-opponent prep files
    ├── {opponent}-full.pgn     # Full downloaded game history
    ├── {opponent}-tree.json    # Personal opening tree
    ├── {opponent}-clocks.json  # Time profiling data
    ├── {opponent}-novelty.md   # Discovered novelty + worked lines
    ├── {opponent}-positions.json # Deep engine results
    └── {opponent}-battle-plan.html  # Final deliverable
```

---

## Dependencies

```bash
# Python packages
pip install python-chess requests beautifulsoup4 ndjson

# Engines (must be installed separately)
# Stockfish: already present (used in IM pipeline)
# LC0: optional — download from lc0.org if available
#   macOS: brew install lc0  OR  download binary from releases.lc0.org
#   network weights: maia-1900.pb.gz (human-style, best for positional check)
```

---

## Module Breakdown

### `lichess_fetch.py`

```python
"""
Pull the opponent's complete Lichess game history and personal opening stats.
"""

LICHESS_GAMES_URL = "https://lichess.org/api/games/user/{username}"
LICHESS_PLAYER_EXPLORER = "https://explorer.lichess.ovh/player"

def fetch_all_games(username: str, perf_types=("classical", "rapid")) -> str:
    """
    Returns a combined PGN string of all rated games.
    Uses streaming NDJSON endpoint for large histories.
    Params: clocks=true, opening=true, evals=false
    """

def fetch_player_opening(username: str, color: str, fen: str, moves: int = 20) -> dict:
    """
    Returns personal opening stats at a given FEN position.
    Response: {moves: [{uci, san, white, draws, black, averageRating}], ...}
    The 'white/draws/black' counts are this player's personal results.
    """

def save_games(pgn_text: str, output_path: str) -> int:
    """Saves PGN to file, returns game count."""
```

**API notes:**
- No authentication required for public Lichess profiles
- Rate limit: 20 requests/second (streaming endpoint handles large histories automatically)
- The `player=` opening explorer is different from `lichess=` — it returns personal stats, not population-wide stats

---

### `opening_tree.py`

```python
"""
Build a personal opening variation tree from the opponent's full game database.
Tracks: move frequency, win rate, average depth reached, and response time.
"""

from dataclasses import dataclass, field
from typing import Optional

@dataclass
class TreeNode:
    san: str                    # Move in SAN notation
    fen_after: str              # Position after this move
    games: int = 0              # Times this move was played
    wins: int = 0               # Wins for the player who played this move
    draws: int = 0
    losses: int = 0
    avg_clock_seconds: float = 0.0   # Average time spent on this move
    children: dict = field(default_factory=dict)  # {san: TreeNode}

def build_tree(pgn_path: str, player_name: str, max_depth: int = 25) -> dict:
    """
    Reads all games, returns two trees: {"white": TreeNode, "black": TreeNode}
    Only branches with >= 3 games are kept (statistical significance floor).
    """

def find_main_lines(tree: dict, color: str, top_n: int = 3) -> list[list[str]]:
    """
    Returns the top-N most-played move sequences (by frequency at each node).
    These are the opponent's "main preparation lines."
    """

def find_preparation_depth(tree: dict, color: str) -> dict:
    """
    For each main line, returns the move number where avg_clock_seconds spikes
    above 2× the game average — this is where book preparation ends.
    Returns: {line_key: prep_depth_ply}
    """

def save_tree(tree: dict, output_path: str) -> None:
    """Serializes tree to JSON."""
```

---

### `clock_analyzer.py`

```python
"""
Parse [%clk] annotations from games and build a per-position time profile.
Positions are keyed by FEN (normalized — no halfmove/fullmove counters).
"""

import chess.pgn
import re

def extract_clock_data(pgn_path: str, player_name: str) -> dict:
    """
    Returns: {fen: {"times": [t1, t2, ...], "avg": avg_s, "median": med_s}}
    Only includes positions where it was the player's turn to move.
    """

def classify_move_speed(seconds: float, game_avg: float) -> str:
    """
    Returns: "instant" (<5s), "normal" (5s–2min), "long" (2–5min), "critical" (>5min)
    Relative to that game's average so time control differences don't skew results.
    """

def find_clock_spikes(clock_data: dict, game_pgn: str) -> list[dict]:
    """
    Returns positions where the opponent spent 3× their game average.
    These are their hardest decisions — where they're not in preparation.
    Format: [{fen, move_number, san_played, seconds, eval_if_known}]
    """

def save_profile(profile: dict, output_path: str) -> None:
    """Saves clock profile JSON."""
```

---

### `novelty_finder.py`

```python
"""
Find the optimal novelty position: the move where Austin can deviate from
the opponent's known preparation with a theoretically sound surprise.

Target criteria:
  1. The opponent has played the same move here in 80%+ of games
  2. Engine says the alternative is also ≥0 (not losing)
  3. The resulting position type suits Austin's style
  4. The opponent has NEVER or rarely faced this alternative
"""

def find_novelty_candidates(
    tree: dict,
    clock_profile: dict,
    color: str,          # Austin's color
    style: str = "tactical"  # "tactical" | "positional" | "endgame"
) -> list[dict]:
    """
    Returns candidates ranked by:
      - frequency of opponent's expected response (higher = more predictable)
      - engine evaluation of the surprise move (must be >= -0.3)
      - clock data (opponent spent little time here = they assumed we'd play normally)
    Format: [{fen, expected_move, novelty_move, engine_eval, rationale}]
    """

def verify_novelty(candidate: dict, stockfish_depth: int = 30) -> dict:
    """
    Runs targeted Stockfish analysis on the novelty position.
    Checks: is the move sound? What are the 3 likely opponent responses?
    For each response, what does Austin play?
    Returns: {novelty_move, eval, lines: [{opp_response, austin_reply, eval}]}
    """

def generate_novelty_report(candidate: dict, lines: dict) -> str:
    """Returns a markdown report with the novelty + 10-move worked lines."""
```

---

### `deep_engine.py`

```python
"""
Extends training-coach/engine.py with:
  - Depth 40 analysis (vs movetime-800)
  - Multi-PV support (top 5 moves)
  - LC0 (Leela) integration for positional cross-check
"""
import sys
sys.path.insert(0, '..')
from engine import StockfishAnalyzer  # reuse base class

class DeepStockfish(StockfishAnalyzer):
    def analyze_position(self, fen: str, depth: int = 40, multipv: int = 5) -> list[dict]:
        """
        Returns top-N moves with full principal variation.
        Format: [{rank, san, eval_cp, depth, pv: [san, ...]}]
        """

class LC0Analyzer:
    """
    Leela Chess Zero integration — positional/strategic verification.
    Falls back gracefully if LC0 binary not found.
    """
    def __init__(self, binary_path: str = "lc0", network: str = "maia-1900.pb.gz"):
        ...

    def evaluate(self, fen: str) -> dict:
        """Returns {eval_wdl: [w, d, l], best_move, policy_top5}"""

    def is_available(self) -> bool:
        """Returns True if LC0 binary and network file are found."""

def cross_check_position(fen: str, sf_result: dict, lc0_result: dict) -> dict:
    """
    Compares SF and LC0 evaluations.
    Flags positions where they disagree significantly (>0.5 pawn) —
    these require human judgment and are highlighted in the battle plan.
    """
```

---

### `battle_plan.py`

```python
"""
Generate the final HTML battle plan document — a memorizable decision tree
Austin can walk through during the game.
"""

def build_decision_tree(
    color: str,
    main_lines: list,      # from opening_tree.py
    novelty: dict,         # from novelty_finder.py
    clock_profile: dict,   # from clock_analyzer.py
    deep_results: dict,    # from deep_engine.py
) -> dict:
    """
    Structures the battle plan as an IF/THEN tree:
    {
      "root": {
        "position": "start",
        "austin_move": "1.e4",
        "branches": {
          "1...e5": {
            "austin_move": "2.Nf3",
            "clock_note": "opponent plays fast here (theory)",
            "branches": {...}
          },
          "1...c5": {
            "austin_move": "2.Nf3",
            "branches": {...}
          }
        }
      }
    }
    """

def render_battle_plan_html(tree: dict, opponent: str, color: str) -> str:
    """
    Generates a printable HTML document:
    - Collapsible move tree (click to expand branches)
    - Color-coded nodes: green (preparation memorized), yellow (know the plan), red (improvise)
    - Clock annotations: ⚡ = opponent plays fast / ⏳ = opponent thinks
    - Engine eval badges on key positions
    - Novelty highlighted in gold
    - "Key positions to memorize" section at top (max 5 diagrams)
    """

def save_battle_plan(html: str, output_path: str) -> None:
    ...
```

---

### `run_gm_prep.py` (CLI entry point)

```bash
# Full GM prep for a specific opponent:
python training-coach/gm-preparation/run_gm_prep.py \
  --opponent zachary \
  --lichess-username zachary_lichess_handle \
  --color white \
  --tournament "Canada Closed 2027" \
  --time-control classical

# Options:
#   --skip-fetch     use existing full-games.pgn (don't re-download)
#   --skip-deep      skip depth-40 analysis (use IM-depth for speed)
#   --no-lc0         skip LC0 cross-check
#   --dry-run        print summary, don't write files
```

**Execution order:**
```
1. lichess_fetch.py  → {opponent}-full.pgn
2. opening_tree.py   → {opponent}-tree.json
3. clock_analyzer.py → {opponent}-clocks.json
4. novelty_finder.py → {opponent}-novelty.md    (uses tree + clocks)
5. deep_engine.py    → {opponent}-positions.json (for novelty positions)
6. battle_plan.py    → {opponent}-battle-plan.html
```

Each phase caches its output. Re-running is safe — cached phases are skipped unless `--force`.

---

## Build Sequence (Correct Dependency Order)

| Step | Module | Depends on | Time |
|---|---|---|---|
| 1 | `lichess_fetch.py` | `requests`, Lichess API | 1–2 hr |
| 2 | `opening_tree.py` | `python-chess`, step 1 output | 2–3 hr |
| 3 | `clock_analyzer.py` | `python-chess`, step 1 output | 1–2 hr |
| 4 | `novelty_finder.py` | steps 2+3, Stockfish | 2–3 hr |
| 5 | `deep_engine.py` | step 4 output, Stockfish, LC0 (optional) | 1–2 hr |
| 6 | `battle_plan.py` | all prior outputs | 2–3 hr |
| 7 | `run_gm_prep.py` | wires steps 1–6 | 1 hr |

**Total build: ~10–16 hours. Per-opponent runtime: ~2 hours.**

---

## Reuse from IM Pipeline

These modules from `training-coach/` are imported directly — no duplication:

| IM Module | What We Reuse |
|---|---|
| `pgn_parser.py` | Standard + PAM format parsing |
| `lichess_api.py` | Opening explorer + tablebase calls |
| `engine.py` | Base Stockfish subprocess wrapper |
| `config.py` | Depth constants, threshold values |
| `html_renderer.py` | CSS/styling reference for battle plan HTML |

---

## First Run Target

Once you provide the target opponent's Lichess username:

```bash
# Step 1: Verify Lichess pull works
python training-coach/gm-preparation/lichess_fetch.py \
  --username {lichess_handle} --output output/{opponent}-full.pgn

# Step 2: Build opening tree, check main lines
python training-coach/gm-preparation/opening_tree.py \
  --input output/{opponent}-full.pgn --player "{Legal Name}" --output output/{opponent}-tree.json

# Step 3: Full pipeline dry run
python training-coach/gm-preparation/run_gm_prep.py \
  --opponent {name} --lichess-username {handle} --color white --dry-run
```

---

## Output: The Battle Plan

The final `{opponent}-battle-plan.html` is the key deliverable. Its structure:

```
┌──────────────────────────────────────────────────────┐
│  BATTLE PLAN: Austin (White) vs {Opponent}            │
│  Tournament: X  |  Time control: 90+30                │
├──────────────────────────────────────────────────────┤
│  KEY POSITIONS TO MEMORIZE (5 diagrams)               │
│  ★ Position 1 (novelty): after 9.Bg5 — memorize this │
│  ★ Position 2: the critical endgame type              │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│  DECISION TREE                                        │
│  1.e4                                                 │
│  ├── 1...e5 (opponent plays this 71% of the time)    │
│  │   2.Nf3 3.Bb5 → Exchange Spanish                  │
│  │   ├── 3...a6 4.Bxc6 (our line)                   │
│  │   │   ⚡ Opponent plays fast here (theory)         │
│  │   │   5.0-0 f6 6.d4 exd4 7.Nxd4                  │
│  │   │   ⏳ Opponent spends time on move 8            │
│  │   │   ★ NOVELTY: 9.Bg5! (never played vs them)   │
│  │   └── 3...Nf6 → [alternative line]               │
│  └── 1...c5 (opponent plays this 18%)               │
│      → Sveshnikov 4...e5 [tree continues]            │
└──────────────────────────────────────────────────────┘
```

---

## What Provides the GM Edge

The IM pipeline tells Austin what the opponent does. The GM pipeline tells Austin **what to do about it, move by move**. The battle plan is not read once and put aside — it is memorized. Austin walks into the game knowing:

1. Exactly which opening to play
2. Exactly where his preparation ends and the opponent's preparation ends
3. The one position where the opponent will be surprised
4. Whether to play fast (save time) or slow (use the clock) at each key junction

That is what separates GM preparation from IM preparation.
