"""
Phase 6 — Battle Plan Generator
Produces a printable HTML decision tree Austin can memorize before the game.
Collapsible CSS-only accordion. No external dependencies or JavaScript required.
"""

from __future__ import annotations

import html as html_module
import json
from pathlib import Path
from typing import Optional


# ── Decision tree builder ─────────────────────────────────────────────────────

def build_decision_tree(
    color: str,
    main_lines: list[list[str]],
    novelty: Optional[dict],
    clock_profile: dict,
    deep_results: dict,
    tree_json: dict,
) -> dict:
    """
    Build a nested IF/THEN decision tree for the battle plan.

    Each node:
    {
      "san": move,
      "fen": position after,
      "freq": opponent frequency (0.0–1.0),
      "eval_pawns": float,
      "clock_note": "fast" | "slow" | None,
      "is_novelty": bool,
      "branches": {opp_reply_san: child_node}
    }
    """
    root = {
        "san": "start",
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "branches": {},
        "clock_note": None,
        "is_novelty": False,
        "eval_pawns": 0.0,
        "freq": 1.0,
    }

    # Walk each main line and populate the tree
    opponent_color = "black" if color == "white" else "white"
    opp_tree = tree_json.get(opponent_color, {})

    for line in main_lines:
        node = root
        opp_node = opp_tree

        for i, san in enumerate(line):
            if san not in node["branches"]:
                # Look up clock and frequency data from opponent tree
                opp_child = (opp_node.get("children") or {}).get(san, {})
                avg_clock = opp_child.get("avg_clock_s")
                games = opp_child.get("games", 0)
                total = sum((opp_node.get("children") or {}).get(s, {}).get("games", 0)
                            for s in (opp_node.get("children") or {}))
                freq = games / total if total else 0.0

                # Clock annotation
                if avg_clock is not None:
                    clock_note = "fast" if avg_clock <= 30 else ("slow" if avg_clock >= 120 else "normal")
                else:
                    clock_note = None

                # Deep engine eval
                fen_key = opp_child.get("fen_after", "")
                eval_pawns = None
                if fen_key and fen_key in deep_results:
                    dr = deep_results[fen_key]
                    if dr:
                        eval_pawns = dr[0].get("eval_pawns")

                node["branches"][san] = {
                    "san": san,
                    "fen": fen_key,
                    "freq": round(freq, 3),
                    "eval_pawns": eval_pawns,
                    "clock_note": clock_note,
                    "avg_clock_s": avg_clock,
                    "is_novelty": False,
                    "branches": {},
                }
            node = node["branches"][san]
            opp_node = (opp_node.get("children") or {}).get(san, {})

    # Mark novelty position
    if novelty and novelty.get("path"):
        node = root
        for san in novelty["path"]:
            node = node["branches"].get(san, {})
            if not node:
                break
        if node and node.get("san"):
            node["is_novelty"] = True
            node["novelty_alt"] = novelty.get("alternative_moves", [])[:1]

    return root


# ── HTML renderer ─────────────────────────────────────────────────────────────

_CSS = """
:root {
  --green: #2d6a2d; --yellow: #b8860b; --red: #8b1a1a;
  --gold: #d4a017; --blue: #1a4a8b; --gray: #555;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #222;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
  background: #fafafa;
}
h1 { font-size: 1.5em; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
h2 { font-size: 1.1em; margin: 20px 0 8px; color: #333; border-left: 4px solid var(--blue); padding-left: 8px; }
h3 { font-size: 1em; margin: 12px 0 4px; color: #444; }
.meta { font-size: 0.85em; color: #666; margin-bottom: 20px; }
.meta span { margin-right: 16px; }

/* Key positions */
.key-positions { background: #fff8e7; border: 1px solid #e8c84a; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
.key-position { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
.kp-num { font-weight: bold; color: var(--gold); font-size: 1.1em; min-width: 20px; }
.kp-text { flex: 1; }

/* Decision tree */
.tree { font-family: 'Courier New', monospace; font-size: 13px; }
.tree-node { margin: 2px 0; }

/* CSS accordion — uses hidden checkboxes */
.branch-toggle { display: none; }
.branch-label {
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; user-select: none; padding: 3px 6px;
  border-radius: 4px; transition: background 0.1s;
}
.branch-label:hover { background: #eee; }
.branch-content { display: none; margin-left: 20px; border-left: 2px solid #ddd; padding-left: 8px; }
.branch-toggle:checked + .branch-label + .branch-content { display: block; }
.branch-toggle:checked + .branch-label::before { content: '▾ '; }
.branch-label::before { content: '▸ '; color: #666; font-size: 0.9em; }

/* Move badges */
.move { font-weight: bold; }
.freq { font-size: 0.8em; color: #888; }
.eval-badge {
  font-size: 0.75em; padding: 1px 4px; border-radius: 3px;
  font-family: monospace; font-weight: bold;
}
.eval-pos { background: #d4edda; color: #155724; }
.eval-neg { background: #f8d7da; color: #721c24; }
.eval-even { background: #d1ecf1; color: #0c5460; }
.clock-fast { color: #e67e00; font-size: 0.85em; }
.clock-slow { color: #6c3483; font-size: 0.85em; }
.novelty { background: var(--gold); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.prep-line { color: var(--green); }
.improvise { color: var(--red); }

/* Print */
@media print {
  body { max-width: 100%; font-size: 11px; padding: 8px; }
  .branch-content { display: block !important; }
  .branch-label::before { content: '' !important; }
  .branch-toggle, .branch-label { cursor: default; }
  h1 { font-size: 1.2em; }
}
"""


def _eval_badge(eval_pawns: Optional[float]) -> str:
    if eval_pawns is None:
        return ""
    cls = "eval-pos" if eval_pawns >= 0.2 else ("eval-neg" if eval_pawns <= -0.2 else "eval-even")
    sign = "+" if eval_pawns >= 0 else ""
    return f'<span class="eval-badge {cls}">{sign}{eval_pawns:.2f}</span>'


def _clock_badge(clock_note: Optional[str], avg_s: Optional[float]) -> str:
    if clock_note == "fast":
        return f'<span class="clock-fast">⚡ fast ({avg_s:.0f}s)</span>' if avg_s else '<span class="clock-fast">⚡</span>'
    if clock_note == "slow":
        return f'<span class="clock-slow">⏳ slow ({avg_s:.0f}s)</span>' if avg_s else '<span class="clock-slow">⏳</span>'
    return ""


def _render_node(node: dict, depth: int, node_id: str) -> str:
    san = html_module.escape(node.get("san", ""))
    freq = node.get("freq", 0.0)
    is_novelty = node.get("is_novelty", False)
    eval_pawns = node.get("eval_pawns")
    clock_note = node.get("clock_note")
    avg_s = node.get("avg_clock_s")
    branches = node.get("branches", {})

    # Build move label
    if is_novelty:
        move_html = f'<span class="novelty">★ NOVELTY: {san}</span>'
    else:
        move_html = f'<span class="move">{san}</span>'

    freq_html = f'<span class="freq">({freq*100:.0f}%)</span>' if freq > 0 else ""
    eval_html = _eval_badge(eval_pawns)
    clock_html = _clock_badge(clock_note, avg_s)

    label_parts = [move_html, freq_html, eval_html, clock_html]
    label_inner = " ".join(p for p in label_parts if p)

    if not branches:
        return f'<div class="tree-node" style="margin-left:{depth*16}px">{label_inner}</div>'

    # Accordion
    checkbox_id = f"n{node_id}"
    children_html = ""
    for i, (child_san, child) in enumerate(branches.items()):
        child_id = f"{node_id}_{i}"
        children_html += _render_node(child, 0, child_id)

    return (
        f'<div class="tree-node" style="margin-left:{depth*16}px">'
        f'<input class="branch-toggle" type="checkbox" id="{checkbox_id}" checked>'
        f'<label class="branch-label" for="{checkbox_id}">{label_inner}</label>'
        f'<div class="branch-content">{children_html}</div>'
        f'</div>'
    )


def render_html(
    decision_tree: dict,
    opponent: str,
    color: str,
    tournament: str,
    time_control: str,
    novelty_candidates: Optional[list[dict]] = None,
) -> str:
    """Generate the full battle plan HTML."""

    # Key positions to memorize (novelty positions + first branch with evaluation)
    key_positions_html = ""
    if novelty_candidates:
        sound = [c for c in novelty_candidates if c.get("is_sound")]
        if sound:
            items = []
            for i, c in enumerate(sound[:3], 1):
                path_str = " ".join(c.get("path", [])[:8])
                expected = c.get("opponent_expected_move", "?")
                alts = c.get("alternative_moves", [])
                alt_str = alts[0]["san"] if alts else "?"
                items.append(
                    f'<div class="key-position">'
                    f'<span class="kp-num">★{i}</span>'
                    f'<span class="kp-text">After <code>{path_str}</code> — '
                    f'opponent expected <b>{expected}</b>, play <span class="novelty">{alt_str}</span></span>'
                    f'</div>'
                )
            key_positions_html = (
                '<div class="key-positions">'
                '<h3>Key Positions to Memorize</h3>'
                + "".join(items) +
                '</div>'
            )

    # Render tree nodes
    branches = decision_tree.get("branches", {})
    tree_html_parts = []
    for i, (san, child) in enumerate(branches.items()):
        tree_html_parts.append(_render_node(child, 0, str(i)))
    tree_html = "".join(tree_html_parts)

    legend = (
        '<div class="meta" style="margin-top:12px">'
        '⚡ = opponent plays fast (preparation) &nbsp;'
        '⏳ = opponent thinks (uncertainty) &nbsp;'
        '<span class="novelty" style="font-size:0.8em">★ NOVELTY</span> = surprise weapon'
        '</div>'
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Battle Plan: Austin ({color.title()}) vs {html_module.escape(opponent)}</title>
<style>{_CSS}</style>
</head>
<body>
<h1>Battle Plan: Austin ({color.title()}) vs {html_module.escape(opponent)}</h1>
<div class="meta">
  <span>Tournament: {html_module.escape(tournament)}</span>
  <span>Time control: {html_module.escape(time_control)}</span>
</div>
{key_positions_html}
<h2>Decision Tree</h2>
<div class="tree">
{tree_html}
</div>
{legend}
</body>
</html>"""


def save_battle_plan(html_content: str, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html_content, encoding="utf-8")
    print(f"  Battle plan saved → {output_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate HTML battle plan")
    parser.add_argument("--tree", required=True, help="Opening tree JSON")
    parser.add_argument("--novelty", help="Novelty candidates JSON")
    parser.add_argument("--deep", help="Deep engine results JSON")
    parser.add_argument("--color", required=True, choices=["white", "black"])
    parser.add_argument("--opponent", default="Opponent")
    parser.add_argument("--tournament", default="Tournament")
    parser.add_argument("--time-control", default="90+30")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    tree_data = json.loads(Path(args.tree).read_text())
    novelty_data = json.loads(Path(args.novelty).read_text()) if args.novelty else []
    deep_data = json.loads(Path(args.deep).read_text()) if args.deep else {}

    from opening_tree import find_main_lines
    main_lines = find_main_lines(tree_data, "black" if args.color == "white" else "white")
    best_novelty = novelty_data[0] if novelty_data else None

    dtree = build_decision_tree(
        color=args.color,
        main_lines=main_lines,
        novelty=best_novelty,
        clock_profile={},
        deep_results=deep_data,
        tree_json=tree_data,
    )

    html_out = render_html(
        decision_tree=dtree,
        opponent=args.opponent,
        color=args.color,
        tournament=args.tournament,
        time_control=args.time_control,
        novelty_candidates=novelty_data,
    )
    save_battle_plan(html_out, Path(args.output))
