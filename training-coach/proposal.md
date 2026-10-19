# Training Coach Upgrade — Proposal

**Goal:** Elevate game review and preparation to IM-level quality for Austin's NAYCC campaign.

---

## What "IM-Level" Means Here

An IM-level review does not just list blunders. It answers:
- *Why* did the position go wrong structurally, not just tactically?
- What was the best plan at the critical moment, and why?
- What does Austin need to *know* going into a game — specific lines, pawn structures, endgame patterns?

That requires three things: deep engine analysis, opening theory cross-reference, and pattern recognition across multiple games.

---

## Resources Available

| Resource | Status | Use |
|----------|--------|-----|
| Stockfish (local) | Ready | Tactical and positional evaluation |
| Lichess Opening Explorer API | Free, no key | Opening theory at each branching point |
| Lichess Tablebase API | Free, no key | Endgame verification |
| `.env` API key | Present | TBD (confirm which service) |
| Existing PGN files | Ready | Austin + Justin/Aarush/Zachary games |

---

## Proposed Pipeline

### Phase 1 — Deep One-Time Review (Priority: Zachary, then Heye)

For each direct-encounter game (Austin vs upcoming opponent):

1. **Parse PGN** — handle both Lichess broadcast format and PAM non-standard format
2. **Deep Stockfish analysis** — depth 25–30 on:
   - Austin's losses (all colors)
   - Every direct encounter game
   - Standard depth ~18–20 for remaining games
3. **Opening Explorer lookup** — at each deviation from theory, fetch the Lichess explorer line and note where Austin/opponent diverged and what the book move was
4. **Critical moment extraction** — flag positions where evaluation swings ≥1.0 pawn; annotate with the best continuation and *why* it works (structural, tactical, or endgame logic)
5. **Pattern tagging** — tag each critical moment by weakness category:
   - `endgame` / `conversion` (Austin's coaches' priority)
   - `king-safety-h-file`
   - `opening-prep`
   - `tactical-miss`
6. **Regenerate `review.html`** — update existing file in place with the enhanced annotations

### Phase 2 — Upgraded Future Reviews (All New Tournaments)

Apply the same pipeline automatically when new PGN files are added. Future reviews will include:
- Opening theory deviation map
- Endgame conversion quality score
- Per-game weakness tag summary
- Preparation notes specific to the next opponent

---

## Weakness Focus (Per Q&A + Existing Analysis)

Austin's coaches flag two persistent issues:

1. **Endgame technique** — passive endgames, losing won positions (NAYCC R7 vs Beegala, R9 vs Li; PAM R5 vs Vinales). The review will flag every endgame transition and annotate the key technique required.
2. **Conversion consistency** — winning positions not converted, especially vs higher-rated opponents. The pipeline will identify "last moment of advantage" in lost/drawn games.

These two tags will be prominently surfaced in the HTML report so Austin can build a focused study list.

---

## Output Format

`review.html` updated in place — readable by Austin, not coach notation. Each game gets:
- Result + opponent rating + color
- Opening name + deviation point
- 2–3 annotated critical moments (plain language explanation)
- Weakness tags
- One-line prep note for next time

---

## What's Not in Scope (Yet)

- Heye analysis — folder exists, games not yet added; will be done when games arrive
- USA/Mexico opponent batch — will be processed as files are added
- Engine cluster / cloud Stockfish — local depth 25–30 is sufficient for now

---

## Next Step

Once you confirm this proposal, I will:
1. Build the analysis script (`training-coach/analyze.py`)
2. Run the deep review on Zachary's direct encounter games first
3. Update `matchup/matchup-zachary.html` and `austin/` review files with enhanced annotations
