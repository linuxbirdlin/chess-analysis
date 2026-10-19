"""
Patches existing review.html files with IM-level analysis.
Surgically injects into each .game-body, preserving all existing structure and styling.
"""

import re
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup, Tag

from annotator import GameSummary, AnnotatedMoment


# --- CSS injected once into the <style> block ---

_IM_CSS = """
    /* ── IM Analysis injection ── */
    .im-analysis { margin-top: 14px; border-top: 1px dashed #d0d7de; padding-top: 12px; }
    .im-section-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #57606a;
      margin: 10px 0 4px;
    }
    .im-opening-row {
      font-size: 0.85rem;
      margin: 4px 0 8px;
      padding: 7px 12px;
      background: #f6f8fa;
      border-left: 3px solid #2d7d46;
      border-radius: 0 4px 4px 0;
    }
    .im-dev { color: #b91c1c; font-weight: 600; }
    .im-book { color: #2d7d46; }
    .im-moment {
      font-size: 0.84rem;
      padding: 6px 10px;
      margin: 4px 0;
      border-radius: 4px;
      border-left: 3px solid #d4750a;
      background: #fff8f0;
    }
    .im-moment.austin-blunder { border-left-color: #cf2222; background: #fff5f5; }
    .im-moment.opponent-miss  { border-left-color: #2d7d46; background: #dafbe1; }
    .im-tags { margin: 8px 0 4px; }
    .im-tag {
      display: inline-block;
      background: #f0f4f8;
      border: 1px solid #d0d7de;
      border-radius: 12px;
      padding: 2px 10px;
      font-size: 0.77rem;
      margin: 2px 3px;
      color: #444;
    }
    .im-tag.endgame       { background: #fff8e6; border-color: #d4a017; color: #7a4f00; }
    .im-tag.conversion    { background: #fff8e6; border-color: #d4a017; color: #7a4f00; }
    .im-tag.king-safety-h-file { background: #fff5f5; border-color: #cf2222; color: #7a0000; }
    .im-tag.opening-prep  { background: #eaf5fb; border-color: #1a5276; color: #1a3a5c; }
    .im-tag.tactical-miss { background: #fdf2f8; border-color: #9b59b6; color: #5b2c6f; }
    .im-prep {
      font-size: 0.86rem;
      margin-top: 10px;
      padding: 8px 12px;
      background: #fff8e6;
      border-left: 3px solid #d4a017;
      border-radius: 0 4px 4px 0;
      color: #7a4f00;
    }
"""

_IM_CSS_MARKER = "/* ── IM Analysis injection ── */"


# --- Round number extraction ---

def _round_number(raw: str) -> Optional[int]:
    """
    Extract integer round from various formats:
      'R4' → 4,  '1.11' → 1,  'round3' → 3,  '4.8' → 4
    """
    raw = raw.strip()
    m = re.search(r'(\d+)', raw)
    return int(m.group(1)) if m else None


def _opponent_last_name(opp_text: str) -> str:
    """'Huang, Justin (1811)' → 'huang'"""
    return opp_text.split(",")[0].strip().lower()


# --- HTML block builders ---

def _build_im_block(summary: GameSummary, soup: BeautifulSoup) -> Tag:
    wrapper = soup.new_tag("div", attrs={"class": "im-analysis"})

    # Opening deviation
    if summary.deviation_move:
        lbl = soup.new_tag("div", attrs={"class": "im-section-label"})
        lbl.string = "Opening Deviation"
        wrapper.append(lbl)

        row = soup.new_tag("div", attrs={"class": "im-opening-row"})
        eco_str = f"{summary.opening_eco} " if summary.opening_eco else ""
        name_str = summary.opening_name or ""
        opener = soup.new_tag("span")
        opener.string = f"{eco_str}{name_str} — "
        row.append(opener)

        dev = soup.new_tag("span", attrs={"class": "im-dev"})
        dev.string = f"Move {summary.deviation_move} ({summary.deviation_side}): {summary.deviation_san}"
        row.append(dev)

        if summary.book_top_moves:
            book = soup.new_tag("span", attrs={"class": "im-book"})
            book.string = f" · Book: {', '.join(summary.book_top_moves[:3])}"
            row.append(book)

        wrapper.append(row)

    # Critical moments
    if summary.moments:
        lbl2 = soup.new_tag("div", attrs={"class": "im-section-label"})
        lbl2.string = "Critical Moments"
        wrapper.append(lbl2)

        for am in summary.moments:
            ev = am.moment.move_eval
            import chess
            is_austin = ev.color == (chess.WHITE if summary.austin_color == "White" else chess.BLACK)
            if is_austin:
                css = "im-moment austin-blunder"
            else:
                css = "im-moment opponent-miss"
            div = soup.new_tag("div", attrs={"class": css})
            div.string = am.explanation
            wrapper.append(div)

    # Weakness tags
    if summary.tags:
        lbl3 = soup.new_tag("div", attrs={"class": "im-section-label"})
        lbl3.string = "Patterns"
        wrapper.append(lbl3)

        tag_row = soup.new_tag("div", attrs={"class": "im-tags"})
        for t in summary.tags:
            span = soup.new_tag("span", attrs={"class": f"im-tag {t}"})
            span.string = t.replace("-", " ")
            tag_row.append(span)
        wrapper.append(tag_row)

    # Prep note
    prep_div = soup.new_tag("div", attrs={"class": "im-prep"})
    prep_div.string = f"Prep note: {summary.prep_note}"
    wrapper.append(prep_div)

    return wrapper


# --- CSS injection ---

def _ensure_im_css(soup: BeautifulSoup) -> None:
    style_tag = soup.find("style")
    if style_tag and _IM_CSS_MARKER not in style_tag.string:
        style_tag.string = style_tag.string + _IM_CSS


# --- Main entry point ---

def patch_review_html(
    html_path: Path | str,
    summaries: list[GameSummary],
    output_path: Path | str | None = None,
) -> None:
    """
    Inject IM analysis into each matching .game-review in the HTML file.
    If output_path differs from html_path, the original is left untouched and
    a new file is written instead (useful for side-by-side comparison).
    Idempotent: removes any prior .im-analysis block before re-injecting.
    """
    import shutil
    html_path = Path(html_path)
    output_path = Path(output_path) if output_path else html_path

    if output_path != html_path:
        shutil.copy(html_path, output_path)

    html = output_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    _ensure_im_css(soup)

    # Build lookup: round_number → GameSummary
    by_round: dict[int, GameSummary] = {}
    for s in summaries:
        rnd = None
        # Try game_info.round first (available via summary — we pass it through)
        # Fall back to opponent-name matching handled below
        by_round[len(by_round) + 1] = s   # placeholder; overwritten below

    # Better: build by opponent last name for flexibility
    by_opponent: dict[str, GameSummary] = {}
    for s in summaries:
        opp = s.black if s.austin_color == "White" else s.white
        key = opp.split(",")[0].strip().lower()
        by_opponent[key] = s

    game_divs = soup.find_all("div", class_="game-review")
    for div in game_divs:
        # Remove any prior IM injection (idempotent)
        prior = div.find("div", class_="im-analysis")
        if prior:
            prior.decompose()

        # Identify the game
        opp_span = div.find("span", class_="game-opp")
        if not opp_span:
            continue
        opp_last = _opponent_last_name(opp_span.get_text())
        summary = by_opponent.get(opp_last)
        if summary is None:
            continue

        game_body = div.find("div", class_="game-body")
        if not game_body:
            continue

        block = _build_im_block(summary, soup)
        game_body.append(block)

    output_path.write_text(str(soup), encoding="utf-8")
    if output_path != html_path:
        print(f"Created: {output_path} (source: {html_path.name}, {len(game_divs)} game sections)")
    else:
        print(f"Patched: {output_path} ({len(game_divs)} game sections)")


# --- Matchup HTML injection ---

def _build_encounter_block(summaries: list[GameSummary], soup: BeautifulSoup) -> Tag:
    """Build a self-contained deep analysis block for the Direct Encounters section."""
    wrapper = soup.new_tag("div", attrs={
        "id": "im-direct-encounters",
        "style": "margin-top:24px; border-top:2px solid #1a5276; padding-top:18px;",
    })

    heading = soup.new_tag("div", attrs={
        "style": "display:flex; align-items:center; gap:10px; margin-bottom:14px;"
    })
    h = soup.new_tag("strong", attrs={"style": "font-size:1rem; color:#1f2328;"})
    h.string = "Deep Analysis"
    badge = soup.new_tag("span", attrs={
        "style": "font-size:0.72rem; font-weight:700; background:#1a5276; color:#fff; "
                 "border-radius:4px; padding:1px 8px; letter-spacing:0.04em;"
    })
    badge.string = "DEPTH 22"
    heading.append(h)
    heading.append(badge)
    wrapper.append(heading)

    for s in summaries:
        opp = s.black if s.austin_color == "White" else s.white
        card = soup.new_tag("div", attrs={
            "style": "border:1px solid #d0d7de; border-radius:8px; margin-bottom:14px; overflow:hidden;"
        })

        # Card header
        hdr = soup.new_tag("div", attrs={
            "style": "background:#f6f8fa; border-bottom:1px solid #d0d7de; "
                     "padding:9px 14px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"
        })
        color_style = ("background:#fff;color:#1f2328;border:1px solid #aaa;" if s.austin_color == "White"
                       else "background:#2d2d2d;color:#fff;")
        color_span = soup.new_tag("span", attrs={
            "style": f"font-size:0.74rem; font-weight:700; border-radius:3px; padding:1px 6px; {color_style}"
        })
        color_span.string = f"Austin {s.austin_color}"

        opp_span = soup.new_tag("span", attrs={"style": "font-weight:600; font-size:0.92rem; flex:1;"})
        opp_span.string = f"vs {opp}"

        result_colors = {"win": "#dafbe1;color:#1a4731", "loss": "#fff5f5;color:#7a0000",
                         "draw": "#fff8e6;color:#7a4f00", "unknown": "#f6f8fa;color:#57606a"}
        rc = result_colors.get(s.austin_result, result_colors["unknown"])
        res_span = soup.new_tag("span", attrs={
            "style": f"font-size:0.8rem; font-weight:700; border-radius:4px; padding:2px 8px; background:{rc};"
        })
        res_span.string = s.austin_result.upper()

        hdr.append(color_span); hdr.append(opp_span); hdr.append(res_span)
        card.append(hdr)

        # Card body — reuse _build_im_block
        body = soup.new_tag("div", attrs={"style": "padding:12px 16px;"})
        im = _build_im_block(s, soup)
        # Remove the outer wrapper div class (already inside body here)
        im.attrs["class"] = []
        im.attrs["style"] = "margin-top:0;"
        body.append(im)
        card.append(body)
        wrapper.append(card)

    return wrapper


def patch_matchup_html(
    html_path: Path | str,
    summaries: list[GameSummary],
    output_path: Path | str | None = None,
) -> None:
    """
    Inject deep encounter analysis into a matchup HTML file.
    Looks for <h2>Direct Encounters</h2> and appends the block after that section's content.
    Idempotent: removes any prior #im-direct-encounters block first.
    """
    import shutil
    html_path = Path(html_path)
    output_path = Path(output_path) if output_path else html_path

    if output_path != html_path:
        shutil.copy(html_path, output_path)

    html = output_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    _ensure_im_css(soup)

    # Remove prior injection
    prior = soup.find(id="im-direct-encounters")
    if prior:
        prior.decompose()

    # Find the Direct Encounters h2
    target_h2 = None
    for h2 in soup.find_all("h2"):
        if "Direct Encounters" in h2.get_text():
            target_h2 = h2
            break

    if not target_h2:
        print(f"  No 'Direct Encounters' section found in {html_path.name}")
        return

    # Walk forward to find the last sibling before the next <h2> or <hr>
    last_node = target_h2
    for sib in target_h2.next_siblings:
        if isinstance(sib, Tag) and sib.name in ("h2", "hr"):
            break
        if isinstance(sib, Tag):
            last_node = sib

    block = _build_encounter_block(summaries, soup)
    last_node.insert_after(block)

    output_path.write_text(str(soup), encoding="utf-8")
    action = "Created" if output_path != html_path else "Patched"
    print(f"{action}: {output_path} (Direct Encounters deep analysis injected)")
