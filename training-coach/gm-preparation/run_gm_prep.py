"""
GM Preparation Pipeline — CLI Orchestrator
Runs all 6 phases in order with caching at each phase.

Usage:
  python run_gm_prep.py \\
    --opponent zachary \\
    --lichess-username leilei8514 \\
    --color white \\
    --tournament "Canada Closed 2027" \\
    --time-control 90+30

Flags:
  --skip-fetch    reuse existing {opponent}-full.pgn (skip Lichess download)
  --skip-deep     skip depth-40 analysis (faster, less accurate novelty verification)
  --dry-run       print plan to stdout without writing files
  --force         overwrite cached phase outputs
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

# Module imports from same package
sys.path.insert(0, str(Path(__file__).parent.parent))

OUTPUT_DIR = Path(__file__).parent / "output"

# Known opponent configs
OPPONENTS = {
    "zachary": {
        "legal_name": "Liu, Zachary",
        "lichess_username": "leilei8514",
        # PGN from Lichess uses the username, not the legal name
        "pgn_player_name": "leilei8514",
        "known_white": "1.Nf3 English/Reti (local PGN) / 1.e4 Open Sicilian (Lichess 2020-2022)",
        "known_weakness": "Taimanov English Attack (B46/B47) — 4 blunders in worst game",
        "austin_weapon_black": "Dutch Leningrad (1...f5) to avoid Reti preparation",
    },
    "heye": {
        "legal_name": "Gao, Heye",
        "lichess_username": "Carlnosen",
        "pgn_player_name": "Carlnosen",
        "known_white": "1.e4 Italian (C54/C55) — Bc4/d3/c3 + b4/a4 queenside expansion; Yugoslav Attack vs Sicilian",
        "known_weakness": "Tactical blunders as Black under time pressure (23...Kg8??, 24...Qe7??)",
        "austin_weapon_white": "English Attack vs Sicilian Kan (B43) — Heye's confirmed Black system vs Austin",
        "austin_weapon_black": "Sicilian Najdorf (5...a6) — avoids Heye's deep Italian White preparation",
    },
    "aarush": {
        "legal_name": "Ajith, Aarush",
        "lichess_username": "makoshark12",
        "pgn_player_name": "makoshark12",
        "known_white": "1.d4 Catalan/fianchetto (E04/E08/D10/D11/E68) — exclusively g3/Bg2",
        "known_weakness": "h4 kingside attack as Black (0W-3L); king-endgame navigation (1000 CPL blunders); time pressure cascade",
        "austin_weapon_white": "h4 English Attack vs Najdorf — Aarush 0W-3L, blundered from +7.31 in Toronto",
        "austin_weapon_black": "Catalan Open (4...dxc4) — forces concrete imbalance vs his positional setup",
    },
    "fernando": {
        "legal_name": "Cortes Medina, Fernando",
        "lichess_username": None,  # no Lichess account — pipeline uses local pgnlib
        "pgn_player_name": "Cortes Medina, Fernando",
        "known_white": "1.e4 English/Yugoslav Attack vs Sicilian (f3/Be3/Qd2/O-O-O); 1.c4 English",
        "known_weakness": "Collapses vs 2300+ rated opponents (86–88% worst games, 6 blunders vs Cori 2586); back-to-back blunder pattern from winning positions",
        "austin_weapon_white": "Advanced French 6.a3 — Fernando's French Advance not tested vs 6.a3 system in dataset",
        "austin_weapon_black": "Sicilian Taimanov/Kan — Fernando plays English Attack but accuracy dips under pressure",
    },
    "pranav": {
        "legal_name": "Santhosh, Pranav",
        "lichess_username": None,  # no Lichess account found (FIDE ID 39951596)
        "pgn_player_name": "santhosh",  # substring matches both 'Santhosh, Pranav' and 'Pranav Santhosh'
        "known_white": "1.e4 always — English Attack (Be3/f3/Qd2/O-O-O) vs Sicilian; Maróczy Bind (5.c4) vs Accelerated Dragon; quiet Italian (d3/c3) vs 1...e5",
        "known_weakness": "Back-rank blunder pattern (Qxc7?? squandered +9.43 in SW Open R4); 0W-3L as Black vs 2100+ in Open Game; endgame squander from dominant positions",
        "austin_weapon_white": "Italian d4 attack — Pranav plays Giuoco Piano ...Bc5 as Black; target endgame conversion weakness",
        "austin_weapon_black": "Sicilian Kan (5...a6) — Pranav's English Attack is Austin's home territory from both sides",
    },
}


def _phase(n: int, name: str, dry_run: bool = False):
    tag = "[DRY]" if dry_run else f"[{n}/6]"
    print(f"\n{tag} Phase {n}: {name}")
    print("  " + "-" * 50)


def _cached(path: Path, force: bool) -> bool:
    if path.exists() and not force:
        print(f"  [cached] {path.name} — use --force to rerun")
        return True
    return False


def run(
    opponent: str,
    lichess_username: str,
    color: str,
    tournament: str,
    time_control: str,
    skip_fetch: bool,
    skip_deep: bool,
    dry_run: bool,
    force: bool,
):
    opp_config = OPPONENTS.get(opponent, {})
    legal_name = opp_config.get("legal_name", opponent.title())
    # Lichess PGNs use usernames; local PGNs use "Last, First" format
    pgn_player_name = opp_config.get("pgn_player_name", legal_name)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pgn_path       = OUTPUT_DIR / f"{opponent}-full.pgn"
    tree_path      = OUTPUT_DIR / f"{opponent}-tree.json"
    clocks_path    = OUTPUT_DIR / f"{opponent}-clocks.json"
    novelty_path   = OUTPUT_DIR / f"{opponent}-novelty.md"
    novelty_json   = OUTPUT_DIR / f"{opponent}-novelty.json"
    deep_path      = OUTPUT_DIR / f"{opponent}-positions.json"
    battle_path    = OUTPUT_DIR / f"{opponent}-battle-plan.html"

    print(f"\n{'='*60}")
    print(f"  GM Preparation: Austin ({color.title()}) vs {legal_name}")
    print(f"  Tournament: {tournament}  |  Time control: {time_control}")
    print(f"  Lichess: {lichess_username}")
    if opp_config.get("known_weakness"):
        print(f"  Known weakness: {opp_config['known_weakness']}")
    print(f"{'='*60}")

    # ── Phase 1: Fetch ────────────────────────────────────────────────────────
    _phase(1, "Fetch full Lichess game history", dry_run)
    if dry_run:
        print(f"  Would download {lichess_username}'s games → {pgn_path}")
    elif skip_fetch and pgn_path.exists():
        print(f"  Skipped (--skip-fetch). Using {pgn_path}")
    elif not _cached(pgn_path, force):
        from lichess_fetch import fetch_all_games, save_games
        pgn_text = fetch_all_games(lichess_username)
        count = save_games(pgn_text, pgn_path)
        print(f"  Downloaded {count} games → {pgn_path}")

    # ── Phase 2: Opening tree ─────────────────────────────────────────────────
    _phase(2, "Build personal opening tree", dry_run)
    if dry_run:
        print(f"  Would build opening tree from {pgn_path} → {tree_path}")
    elif not _cached(tree_path, force):
        from opening_tree import build_tree, save_tree
        tree = build_tree(pgn_path, pgn_player_name)
        save_tree(tree, tree_path)

    # ── Phase 3: Clock profiling ──────────────────────────────────────────────
    _phase(3, "Build clock profile", dry_run)
    if dry_run:
        print(f"  Would extract [%clk] annotations → {clocks_path}")
    elif not _cached(clocks_path, force):
        from clock_analyzer import extract_clocks, save_profile
        clocks = extract_clocks(pgn_path, pgn_player_name)
        save_profile(clocks, clocks_path)

    # ── Phase 4: Novelty discovery ────────────────────────────────────────────
    _phase(4, "Find novelty candidates", dry_run)
    if dry_run:
        print(f"  Would cross opening tree + clock data → {novelty_path}")
        if opp_config.get("known_weakness"):
            print(f"  Key target: {opp_config['known_weakness']}")
    elif not _cached(novelty_json, force):
        from novelty_finder import find_candidates, verify_novelty, generate_novelty_report, save_report
        tree_data = json.loads(tree_path.read_text())
        clock_data = json.loads(clocks_path.read_text())

        candidates = find_candidates(tree_data, clock_data, color)
        print(f"  Found {len(candidates)} candidates. Verifying top 3 with Stockfish...")
        verified = [verify_novelty(c, stockfish_depth=30) for c in candidates[:3]]
        verified += candidates[3:]

        novelty_json.write_text(json.dumps(verified, indent=2), encoding="utf-8")
        print(f"  Novelty candidates → {novelty_json}")

        report = generate_novelty_report(verified, legal_name, color)
        save_report(report, novelty_path)

    # ── Phase 5: Deep engine verification ────────────────────────────────────
    _phase(5, "Deep engine verification (depth 40)", dry_run)
    if skip_deep:
        print("  Skipped (--skip-deep).")
    elif dry_run:
        print(f"  Would run Stockfish depth=40 on key positions → {deep_path}")
    elif not _cached(deep_path, force):
        from deep_engine import analyze_key_positions
        from novelty_finder import find_candidates
        tree_data = json.loads(tree_path.read_text())
        clock_data = json.loads(clocks_path.read_text())
        candidates = find_candidates(tree_data, clock_data, color)

        # Collect FENs from top candidates
        fens = [c["fen_before"] for c in candidates[:5] if c.get("fen_before")]
        fens = list(dict.fromkeys(fens))  # deduplicate, preserve order

        if fens:
            results = analyze_key_positions(fens, depth=40, multipv=5)
            deep_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
            print(f"  Deep analysis of {len(fens)} positions → {deep_path}")
        else:
            print("  No FEN positions to analyze.")
            deep_path.write_text("{}", encoding="utf-8")

    # ── Phase 6: Battle plan HTML ─────────────────────────────────────────────
    _phase(6, "Generate battle plan HTML", dry_run)
    if dry_run:
        print(f"  Would render decision tree HTML → {battle_path}")
        print()
        _print_dry_run_summary(opponent, color, opp_config)
        return

    if not _cached(battle_path, force):
        from opening_tree import find_main_lines
        from battle_plan import build_decision_tree, render_html, save_battle_plan

        tree_data = json.loads(tree_path.read_text())
        novelty_data = json.loads(novelty_json.read_text()) if novelty_json.exists() else []
        deep_data = json.loads(deep_path.read_text()) if deep_path.exists() else {}

        opponent_color = "black" if color == "white" else "white"
        main_lines = find_main_lines(tree_data, opponent_color)

        best_novelty = next((c for c in novelty_data if c.get("is_sound")), None)

        dtree = build_decision_tree(
            color=color,
            main_lines=main_lines,
            novelty=best_novelty,
            clock_profile={},
            deep_results=deep_data,
            tree_json=tree_data,
        )

        html_out = render_html(
            decision_tree=dtree,
            opponent=legal_name,
            color=color,
            tournament=tournament,
            time_control=time_control,
            novelty_candidates=novelty_data,
        )
        save_battle_plan(html_out, battle_path)

    print(f"\n{'='*60}")
    print(f"  COMPLETE. Open your battle plan:")
    print(f"  open {battle_path}")
    print(f"{'='*60}\n")


def _print_dry_run_summary(opponent: str, color: str, config: dict):
    """Print what the battle plan would contain based on known analysis."""
    print("  DRY RUN SUMMARY — Expected battle plan content:")
    print()
    if opponent == "zachary":
        if color == "white":
            print("  Austin as WHITE:")
            print("    → Zachary plays Sicilian Taimanov (B46/B47)")
            print("    → Line: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3")
            print("    → Weapon: English Attack (6.Be3 7.f3 g4 h4)")
            print("    → Novelty zone: move 7-10 in English Attack")
            print("    → DO NOT play 6.Nxc6 Exchange (losing in direct encounter)")
        else:
            print("  Austin as BLACK:")
            print("    → Zachary plays 1.Nf3 → c4 (Reti/English)")
            print("    → Weapon: Dutch Leningrad (1...f5 2...Nf6 3...g6 4...Bg7)")
            print("    → Avoid Catalan — Zachary is deeply prepared")
            print("    → Novelty zone: Dutch Leningrad with ...d6 early")


def main():
    parser = argparse.ArgumentParser(
        description="GM-level chess preparation pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--opponent", required=True, help="Opponent key (e.g. zachary)")
    parser.add_argument("--lichess-username", help="Opponent's Lichess username (overrides config)")
    parser.add_argument("--color", required=True, choices=["white", "black"], help="Austin's color")
    parser.add_argument("--tournament", default="Tournament", help="Tournament name")
    parser.add_argument("--time-control", default="90+30", help="Time control string")
    parser.add_argument("--skip-fetch", action="store_true", help="Reuse existing PGN")
    parser.add_argument("--skip-deep", action="store_true", help="Skip depth-40 engine analysis")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without writing files")
    parser.add_argument("--force", action="store_true", help="Overwrite all cached outputs")
    args = parser.parse_args()

    opp_config = OPPONENTS.get(args.opponent, {})
    lichess_username = args.lichess_username or opp_config.get("lichess_username") or "N/A"
    if lichess_username == "N/A" and not args.skip_fetch:
        print(f"Error: no Lichess username for '{args.opponent}' — use --skip-fetch with a pre-placed PGN")
        sys.exit(1)

    run(
        opponent=args.opponent,
        lichess_username=lichess_username,
        color=args.color,
        tournament=args.tournament,
        time_control=args.time_control,
        skip_fetch=args.skip_fetch,
        skip_deep=args.skip_deep,
        dry_run=args.dry_run,
        force=args.force,
    )


if __name__ == "__main__":
    main()
