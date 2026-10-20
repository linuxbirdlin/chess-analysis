"""
Phase 2 — Personal Opening Tree Builder
Builds a move-frequency tree from the opponent's full game database.
Tracks: move frequency, win/draw/loss rate, average clock time per position.
"""

import argparse
import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import chess
import chess.pgn

sys.path.insert(0, str(Path(__file__).parent.parent))
from pgn_parser import parse_lichess_pgn  # noqa: E402

MIN_GAMES = 3   # minimum games at a node to include in tree
MAX_DEPTH = 25  # maximum ply depth to track


@dataclass
class TreeNode:
    san: str
    uci: str
    fen_after: str
    games: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    clock_times: list[float] = field(default_factory=list)  # seconds spent on this move
    children: dict = field(default_factory=dict)  # san -> TreeNode

    @property
    def win_pct(self) -> float:
        return round(self.wins / self.games * 100, 1) if self.games else 0.0

    @property
    def avg_clock(self) -> Optional[float]:
        return round(sum(self.clock_times) / len(self.clock_times), 1) if self.clock_times else None

    def to_dict(self) -> dict:
        d = {
            "san": self.san,
            "uci": self.uci,
            "fen_after": self.fen_after,
            "games": self.games,
            "wins": self.wins,
            "draws": self.draws,
            "losses": self.losses,
            "win_pct": self.win_pct,
            "avg_clock_s": self.avg_clock,
            "children": {k: v.to_dict() for k, v in self.children.items()
                         if v.games >= MIN_GAMES},
        }
        return d


def _parse_clock(comment: str) -> Optional[float]:
    """Extract seconds from a [%clk H:MM:SS] annotation in a PGN comment."""
    import re
    m = re.search(r'\[%clk\s+(\d+):(\d+):(\d+)\]', comment)
    if m:
        h, mn, s = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return h * 3600 + mn * 60 + s
    return None


def _norm_fen(fen: str) -> str:
    """Strip halfmove clock and fullmove number so FENs are position-comparable."""
    parts = fen.split()
    return " ".join(parts[:4])


def _is_player(name: str, player_name: str) -> bool:
    """Case-insensitive substring match for player identification."""
    return player_name.lower() in name.lower()


def build_tree(pgn_path: Path, player_name: str, max_depth: int = MAX_DEPTH) -> dict:
    """
    Build opening trees for both colors from the opponent's full game database.
    Returns {"white": root_node_dict, "black": root_node_dict}.
    """
    roots = {
        "white": TreeNode(san="root", uci="", fen_after=""),
        "black": TreeNode(san="root", uci="", fen_after=""),
    }

    games = parse_lichess_pgn(pgn_path)
    print(f"  Building opening tree from {len(games)} games for '{player_name}'...")

    processed = 0
    for game_info in games:
        is_white = _is_player(game_info.white, player_name)
        is_black = _is_player(game_info.black, player_name)
        if not is_white and not is_black:
            continue

        color = "white" if is_white else "black"
        result = game_info.result

        # Determine win/draw/loss from the player's perspective
        if result == "1-0":
            is_win = is_white
            is_loss = is_black
        elif result == "0-1":
            is_win = is_black
            is_loss = is_white
        else:
            is_win = False
            is_loss = False
        is_draw = not is_win and not is_loss

        board = game_info.game.board()
        node = roots[color]
        prev_clock: Optional[float] = None
        ply = 0

        for pgn_node in game_info.game.mainline():
            # Only track moves by the player
            is_player_turn = (
                (color == "white" and board.turn == chess.WHITE) or
                (color == "black" and board.turn == chess.BLACK)
            )

            if ply >= max_depth:
                break

            move = pgn_node.move
            try:
                san = board.san(move)
                uci = move.uci()
            except Exception:
                break

            # Extract clock time for this move
            clock_now = _parse_clock(pgn_node.comment or "")
            time_spent: Optional[float] = None
            if is_player_turn and prev_clock is not None and clock_now is not None:
                time_spent = max(0.0, prev_clock - clock_now)
            if is_player_turn:
                prev_clock = clock_now

            board.push(move)
            fen_after = _norm_fen(board.fen())
            ply += 1

            if not is_player_turn:
                continue  # only track the opponent's own moves in their tree

            if san not in node.children:
                node.children[san] = TreeNode(san=san, uci=uci, fen_after=fen_after)

            child = node.children[san]
            child.games += 1
            if is_win:
                child.wins += 1
            elif is_loss:
                child.losses += 1
            else:
                child.draws += 1
            if time_spent is not None:
                child.clock_times.append(time_spent)

            node = child

        processed += 1

    print(f"  Processed {processed} games.")
    return {
        "white": roots["white"].to_dict(),
        "black": roots["black"].to_dict(),
    }


def find_main_lines(tree_dict: dict, color: str, top_n: int = 3) -> list[list[str]]:
    """
    Walk the tree greedily by highest game count at each branch.
    Returns top_n move sequences (list of SAN strings).
    """
    root = tree_dict[color]
    lines = []

    def _walk(node: dict, current_line: list[str]):
        children = node.get("children", {})
        children_filtered = {k: v for k, v in children.items() if v.get("games", 0) >= MIN_GAMES}
        if not children_filtered or len(current_line) >= MAX_DEPTH:
            if current_line:
                lines.append(list(current_line))
            return
        # Take top_n branches at each level
        top = sorted(children_filtered.values(), key=lambda c: c["games"], reverse=True)[:top_n]
        for child in top:
            _walk(child, current_line + [child["san"]])

    _walk(root, [])
    # Return the longest/most-played lines
    lines.sort(key=lambda l: -len(l))
    return lines[:top_n]


def find_prep_depth(tree_dict: dict, clock_data: dict, color: str) -> dict:
    """
    For each main line, find the move number where avg clock time spikes ≥2× game average.
    Returns {line_key: prep_depth_ply}.
    """
    main_lines = find_main_lines(tree_dict, color)
    result = {}
    for i, line in enumerate(main_lines):
        key = f"line_{i+1}"
        prep_ply = len(line)  # default: preparation goes to end of tracked line
        root = tree_dict[color]
        node = root
        for ply, san in enumerate(line):
            child = node.get("children", {}).get(san)
            if not child:
                break
            avg_clk = child.get("avg_clock_s")
            if avg_clk is not None and avg_clk > 120:  # >2 min average = uncertain
                prep_ply = ply
                break
            node = child
        result[key] = {"line": line, "prep_depth_ply": prep_ply}
    return result


def save_tree(tree: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(tree, indent=2), encoding="utf-8")
    print(f"  Tree saved → {output_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Build opening tree from PGN")
    parser.add_argument("--input", required=True, help="PGN file path")
    parser.add_argument("--player", required=True, help="Player name substring to match")
    parser.add_argument("--output", help="Output JSON path (default: print summary)")
    parser.add_argument("--depth", type=int, default=MAX_DEPTH)
    args = parser.parse_args()

    tree = build_tree(Path(args.input), args.player, args.depth)

    # Print summary of main lines
    for color in ("white", "black"):
        print(f"\n  Top lines as {color.upper()}:")
        lines = find_main_lines(tree, color)
        for i, line in enumerate(lines):
            root = tree[color]
            node = root
            games_at_root = 0
            for san in line[:1]:
                child = node.get("children", {}).get(san)
                if child:
                    games_at_root = child["games"]
            print(f"    Line {i+1} ({games_at_root}g): {' '.join(line[:10])}{'...' if len(line) > 10 else ''}")

    if args.output:
        save_tree(tree, Path(args.output))


if __name__ == "__main__":
    main()
