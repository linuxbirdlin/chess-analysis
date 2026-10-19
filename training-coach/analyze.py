"""
CLI entry point for the training coach analysis pipeline.

Usage:
  python analyze.py --player austin --tournament naycc2025
  python analyze.py --player austin --tournament all
  python analyze.py --opponent zachary
  python analyze.py --opponent zachary --deep --dry-run

Flags:
  --deep      Force depth 28 for all games (default: auto-select per game)
  --dry-run   Print summaries to stdout; do not write HTML
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import PROJECT_ROOT, AUSTIN_DIR, OPPONENTS_DIR, DEPTH_DEEP, AUSTIN_LAST
from pgn_parser import load_tournament, load_game, filter_by_player, filter_or_all, is_austin_white, GameInfo
from annotator import annotate_game, build_game_summary, GameSummary
from html_renderer import patch_review_html, patch_matchup_html


# --- Helpers ---

def _print_summary(summary: GameSummary, label: str = "") -> None:
    if label:
        print(f"\n{'─'*60}")
        print(f"  {label}")
        print(f"{'─'*60}")
    color_vs = f"Austin ({summary.austin_color}) vs"
    opp = summary.black if summary.austin_color == "White" else summary.white
    opp_elo = summary.black_elo if summary.austin_color == "White" else summary.white_elo
    elo_str = f" ({opp_elo})" if opp_elo else ""
    print(f"  {color_vs} {opp}{elo_str}  →  {summary.austin_result.upper()}")
    if summary.opening_eco or summary.opening_name:
        print(f"  Opening: {summary.opening_eco or ''} {summary.opening_name or ''}".strip())
    if summary.deviation_move:
        print(f"  Deviation: move {summary.deviation_move} ({summary.deviation_side}): {summary.deviation_san}")
        if summary.book_top_moves:
            print(f"  Book prefers: {', '.join(summary.book_top_moves[:3])}")
    if summary.moments:
        print(f"  Critical moments ({len(summary.moments)}):")
        for am in summary.moments:
            print(f"    • {am.explanation}")
    if summary.tags:
        print(f"  Tags: {', '.join(summary.tags)}")
    print(f"  Prep: {summary.prep_note}")


def _is_direct_encounter(game: GameInfo, opponent_last: str) -> bool:
    opp = opponent_last.lower()
    return opp in game.white.lower() or opp in game.black.lower()


def _run_tournament(
    tournament_dir: Path,
    review_html: Path | None,
    force_depth: int | None,
    dry_run: bool,
    opponent_filter: str | None = None,
    output_filename: str = "review.html",
) -> list[GameSummary]:
    """
    Analyze all games in a tournament directory, optionally filtered by opponent.
    Returns list of summaries (for callers that want to aggregate).
    """
    all_games = load_tournament(tournament_dir)
    austin_games = filter_by_player(all_games, AUSTIN_LAST)

    if not austin_games:
        print(f"  No Austin games found in {tournament_dir.name}")
        return []

    if opponent_filter:
        austin_games = [g for g in austin_games if _is_direct_encounter(g, opponent_filter)]
        if not austin_games:
            print(f"  No Austin vs {opponent_filter} games in {tournament_dir.name}")
            return []

    print(f"\n[{tournament_dir.name}] {len(austin_games)} game(s) to analyze...")

    summaries: list[GameSummary] = []
    for i, game in enumerate(austin_games, 1):
        opp = game.black if is_austin_white(game) else game.white
        print(f"  [{i}/{len(austin_games)}] {opp} ...", end=" ", flush=True)

        is_loss = False  # determined after annotation
        is_direct = bool(opponent_filter)
        depth = force_depth or (DEPTH_DEEP if is_direct else None)

        try:
            annotated = annotate_game(game, depth=depth)
            summary = build_game_summary(annotated)
            summaries.append(summary)
            print(f"{summary.austin_result.upper()}")
        except Exception as e:
            print(f"ERROR: {e}")
            continue

    if dry_run:
        for s in summaries:
            opp = s.black if s.austin_color == "White" else s.white
            _print_summary(s, label=f"{tournament_dir.name} — vs {opp}")
    elif review_html and review_html.exists() and summaries:
        output_path = review_html.parent / output_filename
        patch_review_html(review_html, summaries, output_path=output_path)

    return summaries


# --- Encounters command ---

def cmd_encounters(args: argparse.Namespace) -> None:
    """
    Analyze games from a specific PGN file (e.g. direct-encounter files in opponents/).
    Optionally patch a matchup HTML with the results.
    """
    pgn_path = Path(args.file)
    if not pgn_path.exists():
        print(f"File not found: {pgn_path}")
        return

    force_depth = DEPTH_DEEP  # always deep for direct encounters
    games = load_game(pgn_path)
    # Filter to Austin's games; fall back to all if headers are missing
    austin_games = filter_or_all(games, AUSTIN_LAST)

    print(f"\n[{pgn_path.name}] {len(austin_games)} game(s) to analyze...")

    summaries: list[GameSummary] = []
    for i, game in enumerate(austin_games, 1):
        opp = game.black if is_austin_white(game) else game.white
        if not opp or opp == "?":
            opp = f"Game {i}"
        print(f"  [{i}/{len(austin_games)}] {opp} ...", end=" ", flush=True)
        try:
            annotated = annotate_game(game, depth=force_depth)
            summary = build_game_summary(annotated)
            summaries.append(summary)
            print(summary.austin_result.upper())
        except Exception as e:
            print(f"ERROR: {e}")
            continue

    if args.dry_run:
        for s in summaries:
            opp = s.black if s.austin_color == "White" else s.white
            _print_summary(s, label=f"vs {opp}")
        return

    if args.matchup:
        matchup_path = Path(args.matchup)
        if not matchup_path.exists():
            print(f"Matchup file not found: {matchup_path}")
            return
        out = matchup_path.parent / (matchup_path.stem + "-deep" + matchup_path.suffix)
        patch_matchup_html(matchup_path, summaries, output_path=out)
    else:
        # Just print if no matchup target given
        for s in summaries:
            opp = s.black if s.austin_color == "White" else s.white
            _print_summary(s, label=f"vs {opp}")


# --- Command handlers ---

def cmd_player(args: argparse.Namespace) -> None:
    tournament = args.tournament
    force_depth = DEPTH_DEEP if args.deep else None
    out_filename = getattr(args, "out", None) or "review.html"

    if tournament == "all":
        dirs = sorted([d for d in AUSTIN_DIR.iterdir() if d.is_dir()])
    else:
        dirs = [AUSTIN_DIR / tournament]

    for d in dirs:
        if not d.is_dir():
            print(f"Directory not found: {d}")
            continue
        review_html = d / "review.html"
        if not args.dry_run and not review_html.exists():
            print(f"  No review.html found at {review_html} — use --dry-run to preview")
            continue
        _run_tournament(d, review_html, force_depth, args.dry_run, output_filename=out_filename)


def cmd_opponent(args: argparse.Namespace) -> None:
    opp_name = args.opponent.lower()
    force_depth = DEPTH_DEEP if args.deep else DEPTH_DEEP  # always deep for direct encounters

    # Search Austin's own tournaments for direct encounter games
    all_summaries: list[GameSummary] = []
    austin_dirs = sorted([d for d in AUSTIN_DIR.iterdir() if d.is_dir()])

    for d in austin_dirs:
        sums = _run_tournament(
            d,
            review_html=None,          # never write HTML from opponent mode (matchup HTML differs)
            force_depth=force_depth,
            dry_run=True,              # always print; no HTML target yet
            opponent_filter=opp_name,
        )
        all_summaries.extend(sums)

    if not all_summaries:
        print(f"\nNo direct encounter games found between Austin and '{args.opponent}'.")
        return

    if not args.dry_run:
        print(
            f"\n[Note] --opponent mode prints analysis only. "
            f"HTML injection for matchup files is not yet implemented."
        )

    print(f"\n{'═'*60}")
    print(f"  SUMMARY: Austin vs {args.opponent.title()} ({len(all_summaries)} game(s))")
    print(f"{'═'*60}")
    wins   = sum(1 for s in all_summaries if s.austin_result == "win")
    losses = sum(1 for s in all_summaries if s.austin_result == "loss")
    draws  = sum(1 for s in all_summaries if s.austin_result == "draw")
    print(f"  Record: {wins}W / {losses}L / {draws}D")

    all_tags: list[str] = []
    for s in all_summaries:
        for t in s.tags:
            if t not in all_tags:
                all_tags.append(t)
    if all_tags:
        print(f"  Recurring patterns: {', '.join(all_tags)}")


# --- Main ---

def main() -> None:
    parser = argparse.ArgumentParser(
        description="IM-level chess game analysis for Austin Lin",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command")

    # --player austin --tournament X
    p_player = subparsers.add_parser("player", help="Analyze Austin's tournament games")
    p_player.add_argument("--name",       default="austin", help="Player name (default: austin)")
    p_player.add_argument("--tournament", required=True,    help="Tournament folder name or 'all'")
    p_player.add_argument("--deep",       action="store_true", help="Force deep analysis (depth 28)")
    p_player.add_argument("--dry-run",    action="store_true", help="Print only, don't write HTML")
    p_player.add_argument("--out",        metavar="FILENAME",  help="Output HTML filename (default: review.html)")

    # --opponent zachary
    p_opp = subparsers.add_parser("opponent", help="Analyze Austin's direct encounter vs an opponent")
    p_opp.add_argument("--name",    required=True, dest="opponent", help="Opponent last name")
    p_opp.add_argument("--deep",    action="store_true")
    p_opp.add_argument("--dry-run", action="store_true")

    # encounters --file PATH --matchup PATH
    p_enc = subparsers.add_parser("encounters", help="Analyze a specific direct-encounter PGN file")
    p_enc.add_argument("--file",    required=True, help="Path to PGN file")
    p_enc.add_argument("--matchup", metavar="PATH", help="Matchup HTML to inject results into")
    p_enc.add_argument("--dry-run", action="store_true")

    # Shorthand flags at top level for convenience
    parser.add_argument("--player",     metavar="NAME",     help="Shorthand: analyze Austin's games")
    parser.add_argument("--tournament", metavar="FOLDER",   help="Tournament folder or 'all'")
    parser.add_argument("--opponent",   metavar="NAME",     help="Shorthand: direct encounter mode")
    parser.add_argument("--deep",       action="store_true")
    parser.add_argument("--dry-run",    action="store_true")
    parser.add_argument("--out",        metavar="FILENAME", help="Output HTML filename (default: review.html)")

    args = parser.parse_args()

    # Handle top-level shorthand (e.g. python analyze.py --opponent zachary --deep)
    if args.command is None:
        if args.opponent:
            args.command = "opponent"
        elif args.player or args.tournament:
            args.command = "player"
            if not hasattr(args, "name"):
                args.name = args.player or "austin"
            if not args.tournament:
                parser.error("--tournament is required with --player")
        else:
            parser.print_help()
            sys.exit(0)

    if args.command == "player":
        cmd_player(args)
    elif args.command == "opponent":
        cmd_opponent(args)
    elif args.command == "encounters":
        cmd_encounters(args)


if __name__ == "__main__":
    main()
