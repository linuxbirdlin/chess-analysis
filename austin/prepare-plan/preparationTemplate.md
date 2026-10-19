# Opponent Preparation Template — Austin Lin

**Role:** Act as an International Master (IM) chess coach and data analyst preparing Austin Lin for a specific game against a specific opponent. Ground every claim in engine data from the deep analysis JSON and PGN files. Never fabricate or infer statistics.

---

## How to Use This Template

1. Read the opponent's `{name}-analysis.md`, `scripts/{name}-analysis-results.json`, and all PGN files in `opponents/{name}/`.
2. Read Austin's `austin-analysis.md` to understand his current style, strengths, and weaknesses.
3. Fill in every section below. Delete placeholder text in `[brackets]`.
4. Generate two output files:
   - `matchup/matchup-{name}-white.html` — Austin's plan when Austin plays White
   - `matchup/matchup-{name}-black.html` — Austin's plan when Austin plays Black
5. Link both from `austin-prep.html`.

**Data quality rules:**
- Every win-rate % must come from actual game records (not estimated).
- Every CPL / accuracy figure must come from `{name}-analysis-results.json`.
- Every opening move sequence must be verified against PGN files.
- If data is insufficient (< 5 games in a line), say so explicitly.

---

## Section 1 — Opponent Profile

```
Name: [Full name]
FIDE Rating: [current] (peak: [peak], as of [date])
US Chess Rating: [if applicable]
Style keywords: [3–5 words, e.g. "tactical, aggressive, sharp-opening specialist"]
Improvement trend: [stable / improving / declining — with evidence]
Sample size: [N games, N tournaments]
Direct record vs Austin: [W-L-D or "no prior encounter"]
```

**Opening fingerprint (one sentence each):**
- As White: [Primary first move and main system]
- As Black vs 1.e4: [Consistent response]
- As Black vs 1.d4: [Consistent response]
- As Black vs 1.c4: [Consistent response]

---

## Section 2 — Repertoire Overview (What They Play)

### As White — Opening Frequency & Results

| Opening System | ECO | Games | W% | D% | L% | Notes |
|---|---|---|---|---|---|---|
| [e.g. English Catalan] | [A14] | [N] | [X%] | [X%] | [X%] | [Key line: 1.c4 g3 Bg2] |
| [e.g. Mikenas Attack] | [A19] | [N] | [X%] | [X%] | [X%] | [Used vs strong opponents] |
| [secondary / rare] | | | | | | |

**Summary:** [1–2 sentences: what White system accounts for what % of games, what's the main weapon vs sublines]

### As Black — Opening Frequency & Results

| Situation | System | ECO | Games | W% | D% | L% | Notes |
|---|---|---|---|---|---|---|---|
| vs 1.e4 | [Sicilian / Caro-Kann / etc.] | | [N] | | | | |
| vs 1.d4 | [Nimzo / QGD / etc.] | | [N] | | | | |
| vs 1.c4 | [response] | | [N] | | | | |

**Key variation depth:** [How far does their opening prep appear to go in the main lines? Note any observed deviations from theory.]

---

## Section 3 — Vulnerabilities & Blind Spots (Where They Break)

### A. Opening Lines Where They Score Poorly

List specific lines (ECO + move sequence) where the opponent has a losing or weak record:

| Line | ECO | Their record | Why they struggle |
|---|---|---|---|
| [e.g. Exchange Rossolimo dxc6 structure] | B31 | [0W-2L-0D] | [Bishop pair unexploited, king safety weak] |
| [e.g. Advance French f4-f5 attack] | C02 | [0W-3L-1D] | [Queenside play too slow vs kingside attack] |

*Minimum threshold: include only lines with 2+ games or 1 game with a ≥500cpl blunder.*

### B. Tactical Weaknesses (Engine-Confirmed)

From `{name}-analysis-results.json`:
- **Recurring error type 1:** [e.g. King-walk blunders — documented N times: move X game Y, move Z game W]
- **Recurring error type 2:** [e.g. Throwing winning positions with impatient lunges — documented N times]
- **Recurring error type 3:** [e.g. Technical endgame passive piece placement — accumulated mistakes in long games]

CPL evidence: list the 2–3 highest-CPL critical moments across all games with context.

### C. Strategic & Positional Tendencies

- **Strength:** [What they do well — ground in game evidence]
- **Weakness:** [What consistently fails — ground in game evidence]
- **Under time pressure:** [Does accuracy drop sharply late in games? Any documented time-trouble blunders?]
- **As White vs as Black:** [Color imbalance — which side is weaker, by how much?]

### D. Opening Preparation Depth

[Based on when errors start appearing — does their theory end around move 8? Move 12? Move 15+? Cite specific game examples where they deviated or blundered early.]

---

## Section 4 — Recommended Weapons for Austin

### Austin as White

**Primary recommendation:**

```
1.[move] [move] [move] → [Opening name, ECO]
```
*Why this hits their weakness:* [Connect the opening choice to a specific vulnerability from Section 3]

*Critical decision point at move N:* [The exact moment where Austin should know the plan]

**Side-line (if primary isn't available):**

```
1.[move] [move] → [Alternative, ECO]
```
*When to use:* [Trigger condition — e.g. "if opponent plays 2...e6 instead of 2...Nc6"]

**Traps and pitfalls Austin must avoid:**
- [Opening mistake Austin has made before in this structure, if any]
- [Common beginner mistake White makes in this system]

### Austin as Black

**Primary recommendation:**

```
1.[opponent's move] [Austin's response] → [Opening name, ECO]
```
*Why this hits their weakness:* [Connect to Section 3 evidence]

*Critical decision point at move N:* [The exact branching moment]

**Side-line (if primary isn't available):**

```
1.[move] [Austin's response] → [Alternative, ECO]
```

**Traps and pitfalls Austin must avoid:**
- [Opening mistake Austin has made before]
- [Line that leads to opponent's comfort zone]

---

## Section 5 — Model Game / Reference Plan

*Ground this in real master games that match the recommended opening and strategic plan.*

**Model game:** [Player A (rating) vs Player B (rating), Tournament Year, ECO]

```
Key moves: 1.[move] 2.[move] ... N.[critical decision move] → [what White/Black achieves]
```

**Why this game is the template:**
- [Move X established the plan Austin should copy]
- [The strategic idea Austin should replicate is: ...]
- [The endgame type or middlegame pattern to study from this game]

**If no exact model game exists:** Name the structural type (e.g. "IQP position with Nd5 outpost" or "Sicilian Dragon White kingside attack") and cite a known GM practitioner of this plan.

---

## Section 6 — Top 3 Variance Plans

*Based on all observed games, rank the 3 most likely opening lines the opponent will play. For each, give Austin's exact response tree.*

### Variance A — [Most likely, estimated X% of games]

```
Opponent: 1.[m] 2.[m] 3.[m] 4.[m]
Austin:   1.[m] 2.[m] 3.[m] 4.[m]
→ after 4 moves: [describe position type, e.g. "closed Catalan — IQP for Black"]
```

**Austin's plan in this variation:**
- Move 5–10: [Key ideas — castling timing, pawn breaks, piece placement]
- Move 10–15: [Middlegame plan — which file, which outpost, which attack]
- Endgame alert: [Any specific endgame type to target or avoid]

**Watch out for:** [Specific trap or surprise the opponent has played before in this line]

### Variance B — [Second most likely, estimated X% of games]

```
Opponent: 1.[m] 2.[m] 3.[m]
Austin:   1.[m] 2.[m] 3.[m]
→ after 3 moves: [position type]
```

**Austin's plan in this variation:**
- [Same structure as Variance A]

**Watch out for:** [Specific trap]

### Variance C — [Surprise / third option, estimated X% of games]

```
Opponent: 1.[m] 2.[m]
Austin:   1.[m] 2.[m]
→ after 2 moves: [position type]
```

**Austin's plan in this variation:**
- [Same structure]

**Watch out for:** [Specific trap]

---

## Section 7 — Practical Cheat Sheet

*This section is Austin's pre-game reference. Print it or keep it in mind during the last 30 minutes before the game.*

### Three Golden Rules for This Game

**Rule 1 — Clock Strategy:**
[Specific advice about time management against this opponent. e.g. "Spend your clock on moves 10–20 — this opponent plays best from a quick position but his clock management falls apart in long, complex middlegames. Do not rush the opening."]

**Rule 2 — Psychological Approach:**
[Specific advice. e.g. "This opponent self-destructs from winning positions (documented: N instances). Do NOT panic if behind early — keep the position complex. The blunder may come. Conversely: if Austin has a clear advantage, convert immediately without giving counterplay."]

**Rule 3 — Risk Profile:**
[How much risk Austin should take. e.g. "Play for a win — this opponent is rated within 50 points. Don't play for a draw. Take the sharp variation (Option A, not Option B) unless Austin is badly prepared or already tired from a tough prior game."]

### Opening Reference Card

*Ultra-concise moves to know cold. Each line ends with the key strategic idea.*

**Austin as White:**
```
Main: 1.[m] 2.[m] 3.[m] 4.[m] → [key idea]
  If 4...[alt]: 5.[m] → [key idea]
  If 3...[alt]: 4.[m] → [key idea]
```

**Austin as Black:**
```
vs [opponent's 1st move]: 1...[m] 2...[m] 3...[m] → [key idea]
  If [opponent plays alt]: [Austin's response] → [key idea]
```

### Tactical Motifs to Watch For

Based on engine analysis of opponent's games, these are the specific tactic types that arise:

| Tactic | Context | Example game |
|---|---|---|
| [e.g. King walk into mating net] | [e.g. Lost endgame positions] | [Tournament/Round] |
| [e.g. Queen misplacement] | [e.g. Middlegame pawn tensions] | [Tournament/Round] |
| [e.g. Bishop pair underuse] | [e.g. After Bxc6 exchange] | [Tournament/Round] |

---

## Section 8 — Day-of Preparation

*What Austin should do the morning of / 30 minutes before the game.*

### Warm-Up Exercises (30 minutes)

1. **Tactics drill (15 min):** [Specific tactic type from Section 7 tactical motifs — e.g. "10 puzzles on king safety / discovered attacks from the patterns observed in this opponent's games"]

2. **Opening review (10 min):** [The exact opening line Austin will play — Variance A if playing White, Variance A if playing Black. Replay the key moves mentally to move 12.]

3. **Model game replay (5 min):** [The reference game from Section 5 — replay to the critical decision point, stop and ask "what's the plan from here?"]

### Mental Frame

[1–2 sentences: what mindset Austin should carry into this game. What's the one thing to remember when sitting across from this opponent.]

---

## Output Format Notes

When generating this plan as HTML, follow these conventions:

**`matchup-{name}-white.html`** — Austin as White:
- Part-card with green header (`background: #2d7d46`)
- warn-box for traps and pitfalls
- tip-box for key strategic ideas
- Cheat sheet in a code-style block or styled table

**`matchup-{name}-black.html`** — Austin as Black:
- Part-card with blue header (`background: #1a5276`)
- Same box conventions

Both files must:
- Link to each other and to the matchup deep HTML
- Link back to `../austin-prep.html`
- Include the ECO quick reference table
- Include the variance plans as expandable/clear sections
- Include the cheat sheet as a distinct visually scannable section near the bottom
