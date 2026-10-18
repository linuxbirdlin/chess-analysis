# The goal for this project
The project in this folder is trying to help Austin to prepare the next big chess tournament. I will put more and more Austin's games and his potential opponent's games here. You need come up a plan to how we can prepare it. Let's start with Justin as a example.

## Task #1
- go though Austin's games at [austin], create a detail analysis report for his chess skill, I will add more recent games for you updating. but let's start with it.
- go through Justin's games at [justin], create a detail analysis report for his chess skill, I will add more recent games for you updating. but let's start with it.
- based on what you have now. provide an recommendation plan when Austin play with Justin, analyze it differently when white and black
- let's setup whatever we need for CLAUDE.md or agent.md for future need, you can provide your suggestion here.

## Austin's Preparation Plan (shareable)

https://linuxbirdlin.github.io/chess-analysis/austin-prep.html

## Austin vs Justin — Matchup Plan (shareable)

https://linuxbirdlin.github.io/chess-analysis/matchup/matchup-justin.html

## Tournament Reviews (shareable)

NAYCC 2025: https://linuxbirdlin.github.io/chess-analysis/austin/naycc2025/review.html

PAM 2026: https://linuxbirdlin.github.io/chess-analysis/austin/pam2026/review.html

## Task #2

Looking through the different tournament under [austin], in each folder of tournament, please create a review report including
 - what is Austin was doing good in this tournament, which opening and which variance.
 - what kinda opening he didn't understand and didn't do well.
 - what kinda ending game he is good and what kinda ending game is bad.
 - next step what he need to improve from this tournament
 - what's your detail recommendation of he need improvement.
 - any other suggestions you could have in the tournament analysis report make it as html and create a section called tournament review at prep html and put the link there

## Task #3 — Update Justin analysis with new game data

New Justin Huang game folders have been added:

- **`opponents/justin/pamschool2026/`** — 5 games from XV Campeonato Panamericano U7–U17 (May 2026, Lichess broadcast PGN). Justin's FIDE rating at this event: **1894**. Results: 1 win (R4), 1 draw (R5), 3 incomplete/unknown (R6–R9).
- **`opponents/justin/torontoopen2026/`** — 3 games from 2026 Toronto Open (July–Sep 2026, Lichess broadcast PGN). Justin's FIDE rating at this event: **2093**. Results: 1 loss (R2 vs GM Preotu 2475), 1 draw (R4), 1 win (R5).

**Key new findings that require updating `justin-analysis.md` and `matchup/matchup-justin.md`:**

1. **Justin now plays the Sicilian (1...c5) as Black against 1.e4** — observed in Toronto Open R4 vs Achyuth (1934). This breaks from his previous French-only pattern and is critical for Austin's preparation.
2. **Justin's rating has jumped to 2093** — significantly higher than the 1963–2023 range in the current analysis.
3. **As White vs KID/Grünfeld**: Justin used a quiet Semi-Classical setup (e3, Be2, Nf3) in both Toronto Open games vs KID players — won one (R5 vs Wang Nathan, 2011) and lost one (R2 vs GM Preotu, 2475).
4. **Chronological rating progression**: pamschool2026 (1894, May 2026) → canadaclosed2026 (1963) → pam2026 (2023) → torontoopen2026 (2093, Jul–Sep 2026).

Also note: **`austin/copilot-review/`** contains an AI-generated template review document (not Austin's games). It can serve as a formatting reference. 
-- it is Austin's game for chess4win-thanksgiving tournament.

## Task #4 — Add Aarush Ajith as a new opponent

New opponent folder `opponents/aarush/` has been added with 3 tournaments:
- **`opponents/aarush/canadaclosed2026/`** — 9 games from Canada Closed 2026 (April 2026, Lichess broadcast PGN). Aarush's rating: 1908. Score: 2W-6L-1D.
- **`opponents/aarush/pamschool2026/`** — PAM School 2026 (May 2026). 2 games captured (R7 empty, R8 incomplete).
- **`opponents/aarush/pam2026/`** — PAM 2026 (July 2026, non-standard format). 5 games captured. Rating: 1941. Score: 2W-3L.

Created:
- `aarush-analysis.md` — full player analysis
- `matchup/matchup-aarush.md` — Austin vs Aarush preparation plan
- `opponents/aarush/canadaclosed2026/review.html` — Stockfish-powered game review
- `opponents/aarush/pamschool2026/review.html` — game review
- `opponents/aarush/pam2026/review.html` — game review
- `scripts/analyze-aarush.js` — Stockfish analysis script
- `scripts/aarush-analysis-results.json` — depth-18 results (16 games)

**Key findings:** Aarush's primary weaknesses are (1) king-and-pawn endgame blunders (confirmed R7 Canada Closed, R8 PAM), (2) h4 kingside attack vulnerability as Black in Sicilian/KID, (3) Catalan collapse vs 2000+ opponents. Austin should use h4 English Attack in the Sicilian and Catalan Open as Black.