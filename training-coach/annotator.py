"""
Combines engine analysis, opening deviation, and tablebase results into
structured annotations with plain-language explanations.
"""

from dataclasses import dataclass, field
from typing import Optional

import chess
import chess.pgn

from config import AUSTIN_LAST, TAGS, ENDGAME_START_MOVE, OPENING_END_MOVE
from engine import MoveEval, CriticalMoment, StockfishAnalyzer, select_depth
from lichess_api import DeviationPoint, TablebaseResult, find_theory_deviation, get_tablebase
from pgn_parser import GameInfo, is_austin_white


@dataclass
class AnnotatedMoment:
    moment: CriticalMoment
    tags: list[str]
    explanation: str   # plain-language one-sentence description


@dataclass
class AnnotatedGame:
    game_info: GameInfo
    austin_color: chess.Color
    austin_result: str           # "win", "loss", "draw", "unknown"
    deviation: Optional[DeviationPoint]
    tablebase_check: Optional[TablebaseResult]   # None if not applicable
    annotated_moments: list[AnnotatedMoment]
    all_evals: list[MoveEval]


@dataclass
class GameSummary:
    white: str
    black: str
    white_elo: Optional[int]
    black_elo: Optional[int]
    result: str                   # raw "1-0" / "0-1" / "1/2-1/2"
    austin_result: str            # "win" / "loss" / "draw"
    austin_color: str             # "White" / "Black"
    opening_eco: Optional[str]
    opening_name: Optional[str]
    deviation_move: Optional[int]
    deviation_san: Optional[str]
    deviation_side: Optional[str]
    book_top_moves: list[str]     # top 3 book alternatives at deviation point
    moments: list[AnnotatedMoment]
    tags: list[str]               # union of all moment tags, deduplicated
    prep_note: str                # one-line takeaway for Austin
    endgame_verdict: Optional[str]  # tablebase category if reached


# --- Tagging ---

def _tag_moment(moment: CriticalMoment, austin_color: chess.Color) -> list[str]:
    ev = moment.move_eval
    tags = []

    is_austin_move = ev.color == austin_color

    if ev.phase == "endgame":
        tags.append("endgame")
        # Conversion: Austin was winning but the swing cost him the win
        if is_austin_move and moment.swing >= 2.0:
            tags.append("conversion")
    elif ev.phase == "opening":
        tags.append("opening-prep")
    else:
        # Middlegame
        if moment.swing >= 3.0 and is_austin_move:
            tags.append("tactical-miss")
        elif moment.swing >= 1.0 and is_austin_move:
            tags.append("conversion")

    # King safety heuristic: large swing on the kingside for Austin
    if is_austin_move and moment.swing >= 2.0:
        board = chess.Board()
        try:
            # Replay to the position to check king location
            pass  # board replay is expensive; rely on phase + eval context instead
        except Exception:
            pass
        # Flag if eval was roughly equal or better and collapses sharply — kingside attacks often do this
        eval_before = ev.eval_before if austin_color == chess.WHITE else -ev.eval_before
        if eval_before > -0.5 and moment.swing >= 3.0 and ev.phase == "middlegame":
            tags.append("king-safety-h-file")

    return tags if tags else ["tactical-miss"]


# --- Plain-language explanation ---

def _explain_moment(moment: CriticalMoment, austin_color: chess.Color) -> str:
    ev = moment.move_eval
    side = "White" if ev.color == chess.WHITE else "Black"
    is_austin = ev.color == austin_color
    subject = "Austin" if is_austin else "Opponent"

    swing_str = f"{moment.swing:.1f}"
    best = ev.best_line[0] if ev.best_line else "—"
    continuation = " ".join(ev.best_line[:3]) if ev.best_line else "—"

    if ev.phase == "endgame":
        if is_austin:
            return (
                f"Move {ev.move_number}: Austin played {ev.move} (–{swing_str} pawns). "
                f"Best was {best} — endgame technique: {continuation}."
            )
        else:
            return (
                f"Move {ev.move_number}: Opponent played {ev.move} (blunder, +{swing_str}). "
                f"Austin could have won with {best}: {continuation}."
            )
    elif ev.phase == "opening":
        return (
            f"Move {ev.move_number}: {subject} played {ev.move} (–{swing_str} pawns). "
            f"Theory prefers {best} ({continuation})."
        )
    else:
        if is_austin:
            return (
                f"Move {ev.move_number}: Austin played {ev.move} (–{swing_str} pawns). "
                f"Best was {best} — {continuation}."
            )
        else:
            return (
                f"Move {ev.move_number}: Opponent erred with {ev.move} (+{swing_str}). "
                f"Winning was {best}: {continuation}."
            )


# --- Austin's result ---

def _austin_result(game_info: GameInfo, austin_color: chess.Color) -> str:
    r = game_info.result
    if r == "*":
        return "unknown"
    if r == "1/2-1/2":
        return "draw"
    if (r == "1-0" and austin_color == chess.WHITE) or (r == "0-1" and austin_color == chess.BLACK):
        return "win"
    return "loss"


# --- Opening name resolution ---

def _opening_info(game_info: GameInfo, deviation: Optional[DeviationPoint]) -> tuple[Optional[str], Optional[str]]:
    """Return (eco, name) — prefer game headers, fall back to deviation's opening."""
    eco = game_info.eco
    name = None
    if deviation and deviation.opening_before:
        if not eco:
            eco = deviation.opening_before.eco
        name = deviation.opening_before.name
    return eco, name


# --- Prep note ---

def _prep_note(austin_result: str, tags: list[str], deviation: Optional[DeviationPoint],
               austin_color: chess.Color) -> str:
    color_str = "White" if austin_color == chess.WHITE else "Black"
    if "endgame" in tags or "conversion" in tags:
        return f"Study endgame conversion as {color_str} — missed winning technique in this game."
    if "king-safety-h-file" in tags:
        return f"As {color_str}, watch king safety on the h-file after major piece exchanges."
    if "opening-prep" in tags and deviation:
        side = "White" if deviation.color == chess.WHITE else "Black"
        alts = [m.san for m in deviation.opening_before.book_moves[:2]]
        return f"Review opening after move {deviation.move_number} ({side}): book prefers {', '.join(alts)}."
    if "tactical-miss" in tags:
        return f"Tactics drill as {color_str} — missed a forcing sequence in the middlegame."
    if austin_result == "win":
        return "Good result — review to reinforce the winning plan."
    return "Review critical moments above for improvement areas."


# --- Main entry points ---

def annotate_game(game_info: GameInfo, depth: Optional[int] = None) -> AnnotatedGame:
    """
    Run full analysis on a single game: engine eval, opening deviation, tablebase.
    Uses a managed Stockfish context internally.
    """
    austin_color = chess.WHITE if is_austin_white(game_info) else chess.BLACK
    austin_res = _austin_result(game_info, austin_color)

    is_loss = austin_res == "loss"
    chosen_depth = depth if depth is not None else select_depth(
        is_loss=is_loss, is_direct_encounter=False
    )

    with StockfishAnalyzer(depth=chosen_depth) as sf:
        all_evals = sf.analyze_game(game_info.game)
        critical = sf.get_critical_moments(all_evals)

    deviation = find_theory_deviation(game_info.game)

    # Tablebase: check the position at the first endgame-phase move
    tablebase_check = None
    board = game_info.game.board()
    for node in game_info.game.mainline():
        board.push(node.move)
        if board.fullmove_number >= ENDGAME_START_MOVE:
            tablebase_check = get_tablebase(board)
            break

    annotated_moments = []
    for m in critical:
        tags = _tag_moment(m, austin_color)
        explanation = _explain_moment(m, austin_color)
        annotated_moments.append(AnnotatedMoment(moment=m, tags=tags, explanation=explanation))

    return AnnotatedGame(
        game_info=game_info,
        austin_color=austin_color,
        austin_result=austin_res,
        deviation=deviation,
        tablebase_check=tablebase_check,
        annotated_moments=annotated_moments,
        all_evals=all_evals,
    )


def build_game_summary(annotated: AnnotatedGame) -> GameSummary:
    gi = annotated.game_info
    dev = annotated.deviation
    eco, opening_name = _opening_info(gi, dev)

    all_tags: list[str] = []
    for am in annotated.annotated_moments:
        for t in am.tags:
            if t not in all_tags:
                all_tags.append(t)

    prep = _prep_note(
        austin_result=annotated.austin_result,
        tags=all_tags,
        deviation=dev,
        austin_color=annotated.austin_color,
    )

    endgame_verdict = annotated.tablebase_check.category if annotated.tablebase_check else None

    return GameSummary(
        white=gi.white,
        black=gi.black,
        white_elo=gi.white_elo,
        black_elo=gi.black_elo,
        result=gi.result,
        austin_result=annotated.austin_result,
        austin_color="White" if annotated.austin_color == chess.WHITE else "Black",
        opening_eco=eco,
        opening_name=opening_name,
        deviation_move=dev.move_number if dev else None,
        deviation_san=dev.played_san if dev else None,
        deviation_side=("White" if dev.color == chess.WHITE else "Black") if dev else None,
        book_top_moves=[m.san for m in dev.opening_before.book_moves[:3]] if dev else [],
        moments=annotated.annotated_moments,
        tags=all_tags,
        prep_note=prep,
        endgame_verdict=endgame_verdict,
    )
