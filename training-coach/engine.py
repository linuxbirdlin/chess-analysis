"""
Stockfish wrapper for game analysis and critical moment extraction.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import chess
import chess.pgn
import chess.engine

from config import (
    DEPTH_STANDARD,
    DEPTH_DEEP,
    TIME_STANDARD,
    TIME_DEEP,
    EVAL_SWING_THRESHOLD,
    MAX_CRITICAL_MOMENTS,
    STOCKFISH_THREADS,
    STOCKFISH_HASH_MB,
    OPENING_END_MOVE,
    ENDGAME_START_MOVE,
)

STOCKFISH_PATH = "/opt/homebrew/bin/stockfish"


@dataclass
class MoveEval:
    ply: int                  # half-moves from start (1 = White's first move)
    move_number: int          # full move number
    color: chess.Color        # chess.WHITE or chess.BLACK
    move: str                 # SAN notation
    move_uci: str             # UCI notation
    eval_before: float        # centipawns from White's perspective, before this move
    eval_after: float         # centipawns from White's perspective, after this move
    best_move_uci: str        # engine's top choice before this move
    best_line: list[str]      # top continuation (SAN), up to 5 moves
    phase: str                # "opening", "middlegame", or "endgame"


@dataclass
class CriticalMoment:
    move_eval: MoveEval
    swing: float              # abs(eval_after - eval_before), positive = blunder
    was_best: bool            # True if played move matched engine's best move


def _cp_to_pawns(cp: float) -> float:
    return cp / 100.0


def _score_to_pawns(score: chess.engine.Score) -> float:
    """Convert engine score to float pawns from White's perspective. Mate scores use ±999."""
    if score.is_mate():
        return 999.0 if score.mate() > 0 else -999.0
    return _cp_to_pawns(score.score())


def _get_phase(move_number: int, board: chess.Board) -> str:
    if move_number <= OPENING_END_MOVE:
        return "opening"
    piece_count = len(board.piece_map())
    if move_number >= ENDGAME_START_MOVE or piece_count <= 10:
        return "endgame"
    return "middlegame"


def _best_line_san(board: chess.Board, info: chess.engine.InfoDict) -> list[str]:
    """Convert the engine's PV (principal variation) to SAN notation."""
    pv = info.get("pv", [])
    san_moves = []
    b = board.copy()
    for move in pv[:5]:
        try:
            san_moves.append(b.san(move))
            b.push(move)
        except Exception:
            break
    return san_moves


class StockfishAnalyzer:
    def __init__(self, depth: int = DEPTH_STANDARD, time_limit: Optional[float] = None):
        self.depth = depth
        self.time_limit = time_limit if time_limit is not None else (
            TIME_DEEP if depth >= DEPTH_DEEP else TIME_STANDARD
        )
        self._engine: Optional[chess.engine.SimpleEngine] = None

    def __enter__(self):
        self._engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        self._engine.configure({
            "Threads": STOCKFISH_THREADS,
            "Hash": STOCKFISH_HASH_MB,
        })
        return self

    def __exit__(self, *_):
        if self._engine:
            self._engine.quit()
            self._engine = None

    def analyze_game(self, game: chess.pgn.Game) -> list[MoveEval]:
        """
        Analyze every move in the game. Returns one MoveEval per move.
        Skips moves with no legal alternatives (forced moves).
        """
        assert self._engine is not None, "Use StockfishAnalyzer as a context manager"

        board = game.board()
        evals: list[MoveEval] = []

        # Get starting eval
        info_before = self._engine.analyse(board, chess.engine.Limit(depth=self.depth, time=self.time_limit))
        prev_eval = _score_to_pawns(info_before["score"].white())
        prev_best_uci = info_before.get("pv", [None])[0]
        prev_best_line = _best_line_san(board, info_before)

        for node in game.mainline():
            move = node.move
            move_number = board.fullmove_number
            color = board.turn
            phase = _get_phase(move_number, board)

            try:
                move_san = board.san(move)
            except Exception:
                board.push(move)
                continue

            board.push(move)

            info_after = self._engine.analyse(board, chess.engine.Limit(depth=self.depth, time=self.time_limit))
            eval_after = _score_to_pawns(info_after["score"].white())

            evals.append(MoveEval(
                ply=board.ply(),
                move_number=move_number,
                color=color,
                move=move_san,
                move_uci=move.uci(),
                eval_before=prev_eval,
                eval_after=eval_after,
                best_move_uci=prev_best_uci.uci() if prev_best_uci else "",
                best_line=prev_best_line,
                phase=phase,
            ))

            prev_eval = eval_after
            prev_best_uci = info_after.get("pv", [None])[0]
            prev_best_line = _best_line_san(board, info_after)

        return evals

    def get_critical_moments(self, evals: list[MoveEval]) -> list[CriticalMoment]:
        """
        Return up to MAX_CRITICAL_MOMENTS moves with the largest eval swing,
        sorted by swing magnitude descending.
        Swing is computed from the moving side's perspective so both colors compare fairly.
        """
        moments = []
        for ev in evals:
            # From the moving side's perspective: positive swing = they played badly
            if ev.color == chess.WHITE:
                swing = ev.eval_before - ev.eval_after  # White loses eval → blunder
            else:
                swing = ev.eval_after - ev.eval_before  # Black: eval rising = bad for Black

            if swing >= EVAL_SWING_THRESHOLD:
                was_best = ev.move_uci == ev.best_move_uci
                moments.append(CriticalMoment(move_eval=ev, swing=swing, was_best=was_best))

        moments.sort(key=lambda m: m.swing, reverse=True)
        return moments[:MAX_CRITICAL_MOMENTS]


def select_depth(is_loss: bool, is_direct_encounter: bool) -> int:
    """Return deep depth for Austin's losses and direct encounters, standard otherwise."""
    if is_loss or is_direct_encounter:
        return DEPTH_DEEP
    return DEPTH_STANDARD
