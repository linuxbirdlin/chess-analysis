"""
Phase 1 — Lichess Game Fetcher
Pulls the full classical+rapid game history for an opponent from Lichess,
and provides the player-specific opening explorer endpoint.
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Optional

import requests

# Allow imports from parent training-coach/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))
from lichess_api import _load_token, _AUTH_HEADERS, LICHESS_API_TIMEOUT  # noqa: E402

LICHESS_GAMES_URL = "https://lichess.org/api/games/user/{username}"
LICHESS_PLAYER_EXPLORER = "https://explorer.lichess.ovh/player"

_REQUEST_DELAY = 0.5
_last_request: float = 0.0


def _get(url: str, params: dict, stream: bool = False, extra_headers: dict | None = None):
    global _last_request
    elapsed = time.time() - _last_request
    if elapsed < _REQUEST_DELAY:
        time.sleep(_REQUEST_DELAY - elapsed)
    headers = dict(_AUTH_HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    resp = requests.get(url, params=params, headers=headers,
                        timeout=LICHESS_API_TIMEOUT * 6, stream=stream)
    _last_request = time.time()
    resp.raise_for_status()
    return resp


def fetch_all_games(
    username: str,
    perf_types: tuple[str, ...] = ("classical", "rapid"),
    max_games: int = 1000,
) -> str:
    """
    Download all rated games for `username` from Lichess.
    Returns a combined PGN string (one game per block).
    Uses the streaming PGN endpoint so large histories don't time out.
    """
    token = _load_token()
    params = {
        "perfType": ",".join(perf_types),
        "rated": "true",
        "clocks": "true",
        "opening": "true",
        "evals": "false",
        "max": str(max_games),
    }
    url = LICHESS_GAMES_URL.format(username=username)
    extra = {"Accept": "application/x-chess-pgn"}
    if token:
        extra["Authorization"] = f"Bearer {token}"

    print(f"  Fetching games for {username} from Lichess...", flush=True)
    resp = _get(url, params, stream=True, extra_headers=extra)

    chunks = []
    for chunk in resp.iter_content(chunk_size=8192):
        if chunk:
            chunks.append(chunk.decode("utf-8", errors="replace"))
    pgn_text = "".join(chunks).strip()

    # Count games
    game_count = pgn_text.count("\n[Event ")
    if pgn_text.startswith("[Event "):
        game_count += 1

    print(f"  Downloaded {game_count} games.")
    return pgn_text


def save_games(pgn_text: str, output_path: Path) -> int:
    """Save PGN text to file. Returns number of games saved."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(pgn_text, encoding="utf-8")
    count = pgn_text.count("\n[Event ")
    if pgn_text.startswith("[Event "):
        count += 1
    return count


def fetch_player_opening(
    username: str,
    color: str,
    uci_moves: list[str],
    ratings: str = "1600,1800,2000,2200,2500",
) -> Optional[dict]:
    """
    Query the Lichess player-specific opening explorer.
    Returns personal move statistics for this exact player (not population-wide).

    color: "white" or "black"
    uci_moves: list of UCI moves from starting position, e.g. ["e2e4", "c7c5", ...]
    """
    params = {
        "player": username,
        "color": color,
        "play": ",".join(uci_moves),
        "moves": 15,
        "topGames": 0,
        "recentGames": 0,
    }
    try:
        resp = _get(LICHESS_PLAYER_EXPLORER, params)
        return resp.json()
    except Exception as e:
        print(f"  Warning: player opening explorer failed: {e}", file=sys.stderr)
        return None


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch Lichess game history for an opponent")
    parser.add_argument("--username", required=True, help="Lichess username")
    parser.add_argument("--output", required=True, help="Output PGN file path")
    parser.add_argument("--perf", default="classical,rapid", help="Comma-separated perf types")
    parser.add_argument("--max", type=int, default=1000, help="Max games to download")
    args = parser.parse_args()

    perf_types = tuple(p.strip() for p in args.perf.split(","))
    pgn_text = fetch_all_games(args.username, perf_types=perf_types, max_games=args.max)

    output_path = Path(args.output)
    count = save_games(pgn_text, output_path)

    import chess.pgn, io
    # Report date range
    dates = []
    buf = io.StringIO(pgn_text)
    while True:
        g = chess.pgn.read_game(buf)
        if g is None:
            break
        d = g.headers.get("Date", "")
        if d and "?" not in d:
            dates.append(d)
    if dates:
        dates.sort()
        print(f"  Date range: {dates[0]} → {dates[-1]}")
    print(f"  Saved {count} games → {output_path}")


if __name__ == "__main__":
    main()
