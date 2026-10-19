"""
PGN parser for two formats used in this project:
  - Lichess broadcast PGN (standard headers, optional [%eval] / [%clk] annotations)
  - PAM non-standard format (player+rating line, date line, moves, result)
"""

import re
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import chess
import chess.pgn


@dataclass
class GameInfo:
    white: str
    black: str
    white_elo: Optional[int]
    black_elo: Optional[int]
    result: str          # "1-0", "0-1", "1/2-1/2", or "*"
    date: str            # "YYYY.MM.DD" or "DD.MM.YYYY" (normalized on load)
    event: Optional[str]
    round: Optional[str]
    eco: Optional[str]
    game_url: Optional[str]
    game: chess.pgn.Game  # full python-chess game tree


def _normalize_date(raw: str) -> str:
    """Convert DD.MM.YYYY to YYYY.MM.DD; leave YYYY.MM.DD unchanged."""
    parts = raw.strip().split(".")
    if len(parts) == 3 and len(parts[0]) == 2:
        return f"{parts[2]}.{parts[1]}.{parts[0]}"
    return raw.strip()


def _parse_player_rating(token: str) -> tuple[str, Optional[int]]:
    """
    Parse 'Last, First (1865)' into ('Last, First', 1865).
    Also handles 'Last, First' with no rating.
    """
    m = re.match(r"^(.*?)\s*\((\d+)\)\s*$", token.strip())
    if m:
        return m.group(1).strip(), int(m.group(2))
    return token.strip(), None


def parse_lichess_pgn(filepath: Path) -> list[GameInfo]:
    """
    Parse a file containing one or more standard PGN games.
    Handles Lichess broadcast headers and inline eval/clock annotations.
    Returns a list — some files hold multiple games.
    """
    games = []
    with open(filepath, encoding="utf-8") as f:
        while True:
            game = chess.pgn.read_game(f)
            if game is None:
                break
            h = game.headers
            white_elo = int(h["WhiteElo"]) if h.get("WhiteElo", "?") not in ("?", "-1", "") else None
            black_elo = int(h["BlackElo"]) if h.get("BlackElo", "?") not in ("?", "-1", "") else None
            games.append(GameInfo(
                white=h.get("White", ""),
                black=h.get("Black", ""),
                white_elo=white_elo,
                black_elo=black_elo,
                result=h.get("Result", "*"),
                date=h.get("Date", ""),
                event=h.get("Event"),
                round=h.get("Round"),
                eco=h.get("ECO"),
                game_url=h.get("GameURL") or h.get("Site"),
                game=game,
            ))
    return games


def parse_pam_pgn(filepath: Path) -> GameInfo:
    """
    Parse PAM 2026 non-standard format:
      Line 1: 'Last, First (rating) - Last, First (rating)'
      Line 2: date (DD.MM.YYYY)
      Lines 3+: moves
      Last line: result ('1-0', '0-1', '1/2-1/2')
    """
    text = filepath.read_text(encoding="utf-8").strip()
    lines = [l for l in text.splitlines()]

    # Line 1: players
    header = lines[0]
    if " - " in header:
        white_raw, black_raw = header.split(" - ", 1)
    else:
        raise ValueError(f"Cannot parse PAM header in {filepath}: {lines[0]!r}")
    white, white_elo = _parse_player_rating(white_raw)
    black, black_elo = _parse_player_rating(black_raw)

    # Line 2: date
    date = _normalize_date(lines[1])

    # Last line: result
    result_line = lines[-1].strip()
    if result_line in ("1-0", "0-1", "1/2-1/2"):
        result = result_line
        move_text = "\n".join(lines[2:-1]).strip()
    else:
        result = "*"
        move_text = "\n".join(lines[2:]).strip()

    # Build a minimal PGN string for python-chess to parse
    pgn_str = (
        f'[White "{white}"]\n'
        f'[Black "{black}"]\n'
        f'[Result "{result}"]\n'
        f'[WhiteElo "{white_elo or "?"}"]\n'
        f'[BlackElo "{black_elo or "?"}"]\n'
        f'[Date "{date}"]\n\n'
        f'{move_text} {result}\n'
    )

    game = chess.pgn.read_game(io.StringIO(pgn_str))
    if game is None:
        raise ValueError(f"python-chess failed to parse moves in {filepath}")

    return GameInfo(
        white=white,
        black=black,
        white_elo=white_elo,
        black_elo=black_elo,
        result=result,
        date=date,
        event=None,
        round=filepath.stem,  # e.g. "round3"
        eco=None,
        game_url=None,
        game=game,
    )


def load_game(filepath: Path | str) -> list[GameInfo]:
    """
    Auto-detect format and return all games in the file.
    Lichess broadcast files may contain multiple games; PAM files always contain one.
    """
    filepath = Path(filepath)
    first_line = filepath.read_text(encoding="utf-8").splitlines()[0].strip()
    if first_line.startswith("["):
        return parse_lichess_pgn(filepath)
    else:
        return [parse_pam_pgn(filepath)]


def load_tournament(tournament_dir: Path | str) -> list[GameInfo]:
    """Load all .pgn files from a tournament directory, sorted by filename."""
    tournament_dir = Path(tournament_dir)
    games = []
    for pgn_file in sorted(tournament_dir.glob("*.pgn")):
        games.extend(load_game(pgn_file))
    return games


def filter_by_player(games: list[GameInfo], last_name: str) -> list[GameInfo]:
    """Return only games where last_name appears in White or Black."""
    last = last_name.lower()
    return [g for g in games if last in g.white.lower() or last in g.black.lower()]


def is_austin_white(game: GameInfo) -> bool:
    from config import AUSTIN_LAST
    return AUSTIN_LAST.lower() in game.white.lower()


def filter_or_all(games: list[GameInfo], last_name: str) -> list[GameInfo]:
    """
    Like filter_by_player but falls back to all games if none match —
    useful for study/encounter files where player headers may be missing.
    """
    filtered = filter_by_player(games, last_name)
    return filtered if filtered else games
