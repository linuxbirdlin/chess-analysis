"""
Phase 4 — Novelty Discovery
Finds the optimal position for Austin to deviate from the opponent's known preparation:
  - The opponent plays the same move ≥70% of the time (predictable)
  - Their clock data shows they play fast (= deeply prepared, they assume you follow)
  - Engine says an alternative move is theoretically sound (eval ≥ −0.3)
  - The resulting position suits Austin's tactical style
"""

import json
import sys
from pathlib import Path
from typing import Optional

import chess
import chess.pgn

sys.path.insert(0, str(Path(__file__).parent.parent))
from lichess_api import get_opening_at_position  # noqa: E402

from deep_engine import DeepStockfish  # same package

NOVELTY_MIN_FREQ = 0.70    # opponent plays this move ≥70% of the time
NOVELTY_MAX_EVAL = -0.30   # novelty move must not be worse than −0.30 pawns
MIN_GAMES_AT_NODE = 5      # need ≥5 games at this position to trust frequency stats
CLOCK_FAST_THRESHOLD = 30  # ≤30s avg = deep preparation (playing on autopilot)


def _walk_tree(node: dict, path: list[tuple[str, dict]]) -> list[list[tuple[str, dict]]]:
    """DFS: return all root-to-leaf paths through the opening tree."""
    children = node.get("children", {})
    if not children:
        return [path]
    all_paths = []
    for san, child in children.items():
        all_paths.extend(_walk_tree(child, path + [(san, child)]))
    return all_paths


def _dominant_move(node: dict) -> Optional[tuple[str, float]]:
    """
    Return (san, frequency) for the most-played child move if it dominates ≥ NOVELTY_MIN_FREQ.
    Returns None if the position is contested or has too few games.
    """
    children = node.get("children", {})
    if not children:
        return None
    total = sum(c.get("games", 0) for c in children.values())
    if total < MIN_GAMES_AT_NODE:
        return None
    top_san, top_node = max(children.items(), key=lambda kv: kv[1].get("games", 0))
    freq = top_node.get("games", 0) / total
    if freq >= NOVELTY_MIN_FREQ:
        return (top_san, freq)
    return None


def _is_fast_move(node: dict) -> bool:
    """True if the opponent plays this position quickly (avg_clock_s ≤ CLOCK_FAST_THRESHOLD)."""
    avg = node.get("avg_clock_s")
    if avg is None:
        return False
    return avg <= CLOCK_FAST_THRESHOLD


def find_candidates(
    tree: dict,
    clock_profile: dict,
    color: str,            # Austin's color ("white" or "black")
    style: str = "tactical",
) -> list[dict]:
    """
    Walk the opening tree to find positions where:
      1. The opponent overwhelmingly plays one move (≥70%)
      2. They play it quickly (clock ≤ 30s avg) — so they assume Austin will follow
      3. There is at least one other legal move at this position
    Returns a ranked list of novelty candidates.
    """
    opponent_color = "black" if color == "white" else "white"
    tree_root = tree.get(opponent_color, {})

    candidates = []

    def _search(node: dict, ply: int, san_path: list[str]):
        if ply > 30:
            return

        dominant = _dominant_move(node)
        if dominant:
            top_san, freq = dominant
            child = node["children"][top_san]
            is_fast = _is_fast_move(child)

            # We want positions where the opponent moves predictably AND fast
            score = freq * (1.0 if is_fast else 0.5)

            candidates.append({
                "ply": ply,
                "path": san_path.copy(),
                "opponent_expected_move": top_san,
                "frequency": round(freq, 3),
                "opponent_fast": is_fast,
                "avg_clock_s": child.get("avg_clock_s"),
                "games_here": child.get("games", 0),
                "fen_before": node.get("fen_after", ""),
                "score": round(score, 3),
                "engine_eval": None,   # filled in by verify_novelty
                "alternative_moves": [],  # filled in by verify_novelty
            })

            # Continue down the dominant line
            _search(child, ply + 1, san_path + [top_san])

    _search(tree_root, 0, [])

    # Sort by score descending, take top 10 for engine verification
    candidates.sort(key=lambda c: -c["score"])
    return candidates[:10]


def verify_novelty(candidate: dict, stockfish_depth: int = 30, multipv: int = 3) -> dict:
    """
    Run Stockfish multi-PV on the candidate position to:
      1. Confirm the expected move is reasonable
      2. Find alternative moves that are theoretically sound (≥ NOVELTY_MAX_EVAL)
      3. Work out Austin's response to the opponent's 3 most likely replies

    Returns the candidate dict enriched with engine data.
    """
    fen = candidate.get("fen_before")
    if not fen:
        candidate["engine_eval"] = None
        return candidate

    try:
        with DeepStockfish(depth=stockfish_depth, multipv=multipv) as sf:
            # Analyze the position from the pre-move FEN
            board = chess.Board(fen)
            results = sf.analyze_position(fen, depth=stockfish_depth, multipv=multipv)
            candidate["engine_eval"] = results[0]["eval_pawns"] if results else None
            candidate["top_engine_moves"] = [r["san"] for r in results]

            # Filter alternatives that are sound (not losing)
            expected = candidate["opponent_expected_move"]
            sound_alternatives = []
            for r in results:
                if r["san"] == expected:
                    continue
                if r["eval_pawns"] >= NOVELTY_MAX_EVAL:
                    # Work out 3 opponent replies to this alternative
                    b2 = board.copy()
                    alt_move = board.parse_san(r["san"])
                    b2.push(alt_move)
                    opp_replies = sf.analyze_position(b2.fen(), depth=stockfish_depth - 5, multipv=3)
                    reply_lines = []
                    for reply_info in opp_replies[:3]:
                        # Austin's response to each opponent reply
                        b3 = b2.copy()
                        reply_uci = reply_info.get("uci", "")
                        if reply_uci:
                            try:
                                b3.push(chess.Move.from_uci(reply_uci))
                                austin_responses = sf.analyze_position(b3.fen(), depth=stockfish_depth - 10, multipv=1)
                                austin_san = austin_responses[0]["san"] if austin_responses else "?"
                            except Exception:
                                austin_san = "?"
                        else:
                            austin_san = "?"
                        reply_lines.append({
                            "opp_response": reply_info["san"],
                            "austin_reply": austin_san,
                            "eval_cp": reply_info["eval_cp"],
                        })
                    sound_alternatives.append({
                        "san": r["san"],
                        "eval_pawns": r["eval_pawns"],
                        "pv": r["pv"],
                        "opp_replies": reply_lines,
                    })

            candidate["alternative_moves"] = sound_alternatives
            candidate["is_sound"] = len(sound_alternatives) > 0

    except Exception as e:
        candidate["engine_error"] = str(e)
        candidate["is_sound"] = False

    return candidate


def generate_novelty_report(candidates: list[dict], opponent: str, color: str) -> str:
    """
    Generate a markdown report with the best novelty + worked lines.
    """
    sound = [c for c in candidates if c.get("is_sound")]
    if not sound:
        return f"# Novelty Report: {opponent}\n\nNo sound novelty candidates found.\n"

    best = sound[0]
    lines = [
        f"# Novelty Report: Austin ({color.title()}) vs {opponent}",
        "",
        "## Best Novelty Target",
        "",
        f"**Path to novelty:** {' '.join(best['path'][:8])}",
        f"**Opponent expected:** {best['opponent_expected_move']} "
        f"({best['frequency']*100:.0f}% of games, "
        f"avg {best['avg_clock_s']:.0f}s clock)",
        "",
    ]

    for i, alt in enumerate(best["alternative_moves"][:3], 1):
        lines.append(f"### Alternative {i}: **{alt['san']}** (eval: {alt['eval_pawns']:+.2f})")
        lines.append("")
        lines.append(f"Principal variation: {' '.join(alt['pv'][:8])}")
        lines.append("")
        if alt.get("opp_replies"):
            lines.append("**Opponent replies:**")
            for reply in alt["opp_replies"]:
                lines.append(f"- After {reply['opp_response']}: Austin plays **{reply['austin_reply']}**")
        lines.append("")

    # Remaining candidates
    if len(sound) > 1:
        lines.append("## Other Candidates")
        for c in sound[1:5]:
            lines.append(f"- Move {c['ply']//2 + 1}: {c['opponent_expected_move']} "
                         f"({c['frequency']*100:.0f}%, {len(c.get('alternative_moves', []))} alternatives)")

    return "\n".join(lines)


def save_report(report: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    print(f"  Novelty report saved → {output_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Find novelty candidates from opening tree + clock data")
    parser.add_argument("--tree", required=True, help="Opening tree JSON")
    parser.add_argument("--clocks", required=True, help="Clock profile JSON")
    parser.add_argument("--color", required=True, choices=["white", "black"], help="Austin's color")
    parser.add_argument("--opponent", default="Opponent")
    parser.add_argument("--depth", type=int, default=30)
    parser.add_argument("--output", help="Output .md path")
    parser.add_argument("--json-output", help="Output candidates JSON path")
    args = parser.parse_args()

    tree = json.loads(Path(args.tree).read_text())
    clocks = json.loads(Path(args.clocks).read_text())

    print(f"  Finding novelty candidates (Austin as {args.color})...")
    candidates = find_candidates(tree, clocks, args.color)
    print(f"  Found {len(candidates)} candidates. Verifying top 3 with engine...")

    verified = [verify_novelty(c, stockfish_depth=args.depth) for c in candidates[:3]]
    verified += candidates[3:]

    report = generate_novelty_report(verified, args.opponent, args.color)
    print(report)

    if args.output:
        save_report(report, Path(args.output))

    if args.json_output:
        Path(args.json_output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json_output).write_text(json.dumps(verified, indent=2), encoding="utf-8")
        print(f"  Candidates JSON saved → {args.json_output}")
