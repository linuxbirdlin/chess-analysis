"""
Phase 3 — Clock Profiler
Parses [%clk] annotations from Lichess PGN games to build a per-position
time-usage profile. Reveals where the opponent's preparation ends (time spikes)
vs where they play on autopilot (fast moves).
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

import chess
import chess.pgn

sys.path.insert(0, str(Path(__file__).parent.parent))
from pgn_parser import parse_lichess_pgn  # noqa: E402

CLK_RE = re.compile(r'\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]')


def _parse_clock(comment: str) -> Optional[float]:
    """Return clock reading in seconds, or None if no annotation."""
    m = CLK_RE.search(comment or "")
    if m:
        h, mn, s = float(m.group(1)), float(m.group(2)), float(m.group(3))
        return h * 3600 + mn * 60 + s
    return None


def _norm_fen(fen: str) -> str:
    """Strip halfmove/fullmove counters for position-comparable FEN keys."""
    return " ".join(fen.split()[:4])


def _is_player(name: str, player_name: str) -> bool:
    return player_name.lower() in name.lower()


def classify_speed(seconds: float, game_avg: float) -> str:
    """
    Classify move speed relative to the game average.
    Relative classification prevents time-control skew (90+30 vs 15+10).
    """
    if seconds < 5:
        return "instant"
    if seconds < game_avg * 0.5:
        return "fast"
    if seconds < game_avg * 1.5:
        return "normal"
    if seconds < game_avg * 3:
        return "long"
    return "critical"


def extract_clocks(pgn_path: Path, player_name: str) -> dict:
    """
    Walk all games in pgn_path. For every position where it's the player's turn,
    record time spent (clock_before − clock_after).

    Returns:
    {
      norm_fen: {
        "times": [list of seconds],
        "avg_s": float,
        "median_s": float,
        "move_number": int,  # typical move number this position arises
        "san_played": [list of moves played here],
      }
    }
    """
    games = parse_lichess_pgn(pgn_path)
    profile: dict = {}
    clock_games = 0

    for game_info in games:
        is_white = _is_player(game_info.white, player_name)
        is_black = _is_player(game_info.black, player_name)
        if not is_white and not is_black:
            continue

        color = chess.WHITE if is_white else chess.BLACK
        board = game_info.game.board()
        prev_clock: Optional[float] = None
        has_clocks = False
        move_times: list[tuple[str, int, float, str]] = []  # (fen, move_num, time, san)

        for pgn_node in game_info.game.mainline():
            move = pgn_node.move
            try:
                san = board.san(move)
            except Exception:
                board.push(move)
                prev_clock = None
                continue

            is_player_turn = board.turn == color
            clock_now = _parse_clock(pgn_node.comment or "")
            if clock_now is not None:
                has_clocks = True

            if is_player_turn and prev_clock is not None and clock_now is not None:
                time_spent = max(0.0, prev_clock - clock_now)
                fen_key = _norm_fen(board.fen())
                move_num = board.fullmove_number
                move_times.append((fen_key, move_num, time_spent, san))

            if is_player_turn:
                prev_clock = clock_now
            board.push(move)

        if not has_clocks or not move_times:
            continue

        clock_games += 1
        # Game average time per move
        times_only = [t for _, _, t, _ in move_times]
        game_avg = sum(times_only) / len(times_only) if times_only else 30.0

        for fen_key, move_num, time_spent, san in move_times:
            if fen_key not in profile:
                profile[fen_key] = {
                    "times": [],
                    "move_numbers": [],
                    "sans_played": [],
                }
            profile[fen_key]["times"].append(time_spent)
            profile[fen_key]["move_numbers"].append(move_num)
            profile[fen_key]["sans_played"].append(san)

    # Compute aggregates
    for fen_key, data in profile.items():
        times = data["times"]
        times_sorted = sorted(times)
        n = len(times)
        avg = sum(times) / n
        median = times_sorted[n // 2] if n % 2 == 1 else (times_sorted[n//2 - 1] + times_sorted[n//2]) / 2
        data["avg_s"] = round(avg, 1)
        data["median_s"] = round(median, 1)
        data["sample_size"] = n
        data["typical_move"] = round(sum(data["move_numbers"]) / n)
        # Most common move played
        from collections import Counter
        data["most_common_san"] = Counter(data["sans_played"]).most_common(1)[0][0]
        # Remove raw lists to keep JSON lean
        del data["move_numbers"]
        del data["sans_played"]

    print(f"  Clock profile built from {clock_games} games with clock data. {len(profile)} unique positions.")
    return profile


def find_clock_spikes(profile: dict, threshold_multiplier: float = 3.0) -> list[dict]:
    """
    Find positions where the player spent unusually long — signalling uncertainty.
    These are positions where their preparation has ended.
    Returns list sorted by avg_s descending, filtered to positions with ≥3 samples.
    """
    spikes = []
    all_avgs = [v["avg_s"] for v in profile.values() if v.get("sample_size", 0) >= 3]
    if not all_avgs:
        return []
    global_avg = sum(all_avgs) / len(all_avgs)

    for fen, data in profile.items():
        if data.get("sample_size", 0) < 3:
            continue
        if data["avg_s"] >= global_avg * threshold_multiplier:
            spikes.append({
                "fen": fen,
                "avg_s": data["avg_s"],
                "median_s": data["median_s"],
                "sample_size": data["sample_size"],
                "typical_move": data["typical_move"],
                "most_common_san": data["most_common_san"],
                "times": data["times"],
            })

    spikes.sort(key=lambda x: -x["avg_s"])
    return spikes


def save_profile(profile: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    print(f"  Clock profile saved → {output_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract clock profile from PGN")
    parser.add_argument("--input", required=True, help="PGN file path")
    parser.add_argument("--player", required=True, help="Player name substring")
    parser.add_argument("--output", help="Output JSON path")
    args = parser.parse_args()

    profile = extract_clocks(Path(args.input), args.player)
    spikes = find_clock_spikes(profile)

    print(f"\n  Top clock spikes (positions where {args.player} thinks longest):")
    for s in spikes[:10]:
        print(f"    Move ~{s['typical_move']}: {s['most_common_san']:6s}  avg {s['avg_s']:.0f}s  "
              f"({s['sample_size']} games)  FEN: {s['fen'][:40]}...")

    if args.output:
        save_profile(profile, Path(args.output))


if __name__ == "__main__":
    main()
