"""
Lichess Opening Explorer and Tablebase API client.
Both APIs are free and require no authentication.
"""

import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import chess
import chess.pgn
import requests

from config import (
    LICHESS_EXPLORER_URL,
    LICHESS_TABLEBASE_URL,
    LICHESS_API_TIMEOUT,
    TABLEBASE_MAX_PIECES,
    EXPLORER_SPEED,
    EXPLORER_RATINGS,
    EXPLORER_MIN_GAMES,
    OPENING_END_MOVE,
)

_REQUEST_DELAY = 0.5   # seconds between API calls — stay within Lichess rate limits
_last_request_time: float = 0.0

# Load Lichess token from .env (one directory up from this file)
def _load_token() -> Optional[str]:
    env_path = Path(__file__).parent.parent / ".env"
    try:
        for line in env_path.read_text().splitlines():
            if line.startswith("LICHESS_TOKEN="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return os.environ.get("LICHESS_TOKEN")

_LICHESS_TOKEN = _load_token()
_AUTH_HEADERS = {"Authorization": f"Bearer {_LICHESS_TOKEN}"} if _LICHESS_TOKEN else {}


def _rate_limited_get(url: str, params: dict) -> Optional[dict]:
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _REQUEST_DELAY:
        time.sleep(_REQUEST_DELAY - elapsed)
    try:
        resp = requests.get(url, params=params, headers=_AUTH_HEADERS, timeout=LICHESS_API_TIMEOUT)
        _last_request_time = time.time()
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException:
        return None


# --- Data types ---

@dataclass
class BookMove:
    uci: str
    san: str
    total_games: int
    white_pct: float
    draw_pct: float
    black_pct: float
    avg_rating: Optional[int]


@dataclass
class OpeningData:
    eco: Optional[str]
    name: Optional[str]
    book_moves: list[BookMove]   # top moves at this position, filtered by min games


@dataclass
class DeviationPoint:
    move_number: int
    color: chess.Color
    played_uci: str
    played_san: str
    opening_before: OpeningData  # book state just before the deviation
    uci_path: list[str]          # UCI moves leading to this position (for reference)


@dataclass
class TablebaseResult:
    category: str        # "win", "loss", "draw", "unknown"
    dtz: Optional[int]   # distance to zero (mate/capture), None if not available
    best_move_uci: Optional[str]
    best_move_san: Optional[str]


# --- Opening Explorer ---

def get_opening_at_position(uci_moves: list[str]) -> Optional[OpeningData]:
    """
    Query the Lichess opening explorer for a position defined by the moves played
    from the starting position. Returns None on API failure.
    """
    params = {
        "play": ",".join(uci_moves),
        "speeds": EXPLORER_SPEED,
        "ratings": EXPLORER_RATINGS,
        "moves": 10,
        "topGames": 0,
        "recentGames": 0,
    }
    data = _rate_limited_get(LICHESS_EXPLORER_URL, params)
    if data is None:
        return None

    opening = data.get("opening") or {}
    raw_moves = data.get("moves", [])

    book_moves = []
    for m in raw_moves:
        total = m.get("white", 0) + m.get("draws", 0) + m.get("black", 0)
        if total < EXPLORER_MIN_GAMES:
            continue
        book_moves.append(BookMove(
            uci=m.get("uci", ""),
            san=m.get("san", ""),
            total_games=total,
            white_pct=round(m.get("white", 0) / total * 100, 1) if total else 0,
            draw_pct=round(m.get("draws", 0) / total * 100, 1) if total else 0,
            black_pct=round(m.get("black", 0) / total * 100, 1) if total else 0,
            avg_rating=m.get("averageRating"),
        ))

    return OpeningData(
        eco=opening.get("eco"),
        name=opening.get("name"),
        book_moves=book_moves,
    )


def find_theory_deviation(game: chess.pgn.Game) -> Optional[DeviationPoint]:
    """
    Walk the game move by move, querying the explorer at each step.
    Returns the first position where the played move is not in the book,
    or None if the game follows theory throughout (or beyond OPENING_END_MOVE).
    """
    board = game.board()
    uci_path: list[str] = []

    for node in game.mainline():
        if board.fullmove_number > OPENING_END_MOVE:
            break

        opening = get_opening_at_position(uci_path)
        if opening is None:
            break

        # If no book moves exist here, we've left theory
        if not opening.book_moves:
            move_san = board.san(node.move)
            return DeviationPoint(
                move_number=board.fullmove_number,
                color=board.turn,
                played_uci=node.move.uci(),
                played_san=move_san,
                opening_before=opening,
                uci_path=list(uci_path),
            )

        book_ucis = {bm.uci for bm in opening.book_moves}
        played_uci = node.move.uci()

        if played_uci not in book_ucis:
            move_san = board.san(node.move)
            return DeviationPoint(
                move_number=board.fullmove_number,
                color=board.turn,
                played_uci=played_uci,
                played_san=move_san,
                opening_before=opening,
                uci_path=list(uci_path),
            )

        uci_path.append(played_uci)
        board.push(node.move)

    return None  # game followed theory throughout the opening


# --- Tablebase ---

def get_tablebase(board: chess.Board) -> Optional[TablebaseResult]:
    """
    Query the Lichess tablebase for positions with <= TABLEBASE_MAX_PIECES pieces.
    Returns None if not applicable or on API failure.
    """
    if len(board.piece_map()) > TABLEBASE_MAX_PIECES:
        return None

    params = {"fen": board.fen()}
    data = _rate_limited_get(LICHESS_TABLEBASE_URL, params)
    if data is None:
        return None

    category = data.get("category", "unknown")
    dtz = data.get("dtz")
    best_uci = None
    best_san = None

    moves = data.get("moves", [])
    if moves:
        best = moves[0]
        best_uci = best.get("uci")
        if best_uci:
            try:
                move = chess.Move.from_uci(best_uci)
                best_san = board.san(move)
            except Exception:
                pass

    return TablebaseResult(
        category=category,
        dtz=dtz,
        best_move_uci=best_uci,
        best_move_san=best_san,
    )
