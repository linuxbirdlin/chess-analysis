# pgn-pipeline

## Purpose

Extract games from a chess-reference HTML export, merge in any manually added PGN files,
deduplicate, group by tournament, update the pgnlib, and optionally add a player card to
`austin-prep.html`. Handles new opponents (full pipeline) and existing opponents
(pgnlib refresh only).

Run this skill whenever:
- A `html.html` file appears in an `opponents/` subfolder (chess-reference export)
- New PGN files are added to an opponent's folder and the pgnlib needs refreshing
- An opponent's player card is missing from `austin-prep.html`

---

## Invocation

```
/pgn-pipeline [opponent-folder-or-name] [options]
```

Options (all optional):
- `--pgnlib-only` — skip player card creation; only update pgnlib
- `--card-only`   — skip PGN extraction; only add/update the player card
- `--latest N`    — number of games to put in pgnlib (default: all OTB, or 64 if >200 OTB games)
- `--country CA|US|MX` — override country detection for card placement

Examples:
- `/pgn-pipeline calix`
- `/pgn-pipeline danielee --pgnlib-only`
- `/pgn-pipeline odyssey --latest 64`
- `/pgn-pipeline aarush --pgnlib-only`   ← refresh after new round files dropped in folder

If the argument is a folder path like `opponents/canada/calix/`, use that directly.
If it is a name like `calix`, search `opponents/` subdirectories for a matching folder.

---

## Procedure

### Step 1 — Locate files

1. Find the opponent's folder: `opponents/{country}/{name}/`
2. Identify the target player name from one of:
   - `chessData.targetPlayer.fullName` in `html.html` (if present)
   - The `[White]` / `[Black]` tags that appear most frequently across all PGN files in the folder
3. Collect all input sources in this priority order:
   a. `html.html` — chess-reference JSON export (parse `chessData.pgns`)
   b. `*.pgn` files already in the folder — merge these in (they may be manually added round files)
   c. Existing pgnlib file for this player (if updating rather than creating)
4. Determine the country from the folder path (`canada/` → CA, `usa/` → USA, `mexico/` → MEX, `others/` → ?)

---

### Step 2 — Parse the HTML export (if `html.html` exists)

The file contains a `<script>` tag at the top with:
```js
chessData = { ..., "pgns": [...], "targetPlayer": {...}, ... }
```

Parse it with Python by scanning for matching braces (do NOT use `json.loads` on the full
script tag — the closing `};` trips a parser error; brace-match to the first top-level `}`):

```python
start = content.index('chessData=') + len('chessData=')
depth = 0; in_str = False; escape = False; end = start
for i, c in enumerate(content[start:], start):
    if escape: escape = False; continue
    if c == chr(92) and in_str: escape = True; continue
    if c == '"' and not escape: in_str = not in_str; continue
    if in_str: continue
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0: end = i + 1; break
data = json.loads(content[start:end])
pgns_from_html = data['pgns']           # list of PGN strings
target = data['targetPlayer']           # {fullName, fideRating, country, birthYear}
```

---

### Step 3 — Merge all PGN sources

1. Collect `pgns_from_html` + all PGNs loaded from `*.pgn` files in the folder
   (skip `html.html` itself and any file already named `all.pgn`, `latest64.pgn`, or similar outputs)
2. Deduplicate by this key priority:
   - `[GameId]` tag (chess-reference internal ID) if present
   - `[GameURL]` tag (Lichess broadcast URL) if present
   - Fallback: tuple of `(White, Black, Date, first-80-chars-of-moves)`
3. Sort descending by `[Date]` tag (treat `?` or missing as `0000.00.00`)

---

### Step 4 — Group into tournament files

Write one `.pgn` per tournament slug under the opponent's folder.

**Slug assignment rules** (apply in order, case-insensitive on `[Event]` + year from `[Date]`):

| Pattern in Event name | Slug |
|---|---|
| `north american youth` / `naycc` | `naycc{year}` |
| `can-ch` / `canadian closed` / `canadian championship` | `canadaclosed{year}` |
| `can-op` / `canadian open` | `canadianopen{year}` |
| `cycc` / `can junior` | `cycc{year}` |
| `royal city` | `royalcity{year}` |
| `world youth` (non-NAYCC) | `worldyouth{year}` |
| `world cadet` / `world cup` | `international` |
| `panamericano` / `pan-american` | `panamerican` |
| `maritime` | `maritime` |
| `dalhousie` / `bluenose` / `halifax` | `atlantic` |
| `excelsior` | `excelsior` |
| `titled tue` / `titled tuesday` | `online_titled_tue` |
| `bullet brawl` / `3-0 thu` | `online_bullet` |
| `tech mahindra` / `gcl` | `online_otb` |
| Single-round events (`Round N: PlayerA - PlayerB`) | Guess from date+context: if year matches a known tournament already in the bucket, assign there; otherwise `misc{year}` |
| Everything else | `misc` |

**Year substitution:** replace `{year}` with the 4-digit year from the first game's `[Date]`. If multiple years appear for the same event name, use the most common year.

Do NOT write a file if it already exists with identical content — check with a hash or game count comparison.

---

### Step 5 — Determine pgnlib game set

Decide what goes into the pgnlib based on total game count:

| Total deduped games | pgnlib content |
|---|---|
| ≤ 150 | All deduped games (sorted date desc) |
| 151 – 300 | All **OTB** games (exclude `online_titled_tue`, `online_bullet`) |
| > 300 | Latest **64 OTB** games |

"Latest N OTB" = take the first N entries after sorting by date desc and filtering out online-blitz/bullet slugs.

If `--latest N` was passed, override the above with exactly N games (from OTB pool).

Write the pgnlib to `pgnlib/{country-subfolder}/{LastName}, {FirstName(s)}.pgn`
(match the naming convention of existing files in that directory — check `ls pgnlib/{country}/`).

Also write `all.pgn` (all deduped) and, if pgnlib is a subset, `latest64.pgn` (or `latestN.pgn`) to the opponent's folder.

---

### Step 6 — Repertoire analysis (for player card)

Skip if `--pgnlib-only`.

From the pgnlib game set, compute:

**As White:**
- First move distribution (count `1. e4` vs `1. d4` vs other)
- Top 5 ECO codes by frequency
- Record: W–L–D

**As Black vs 1.e4 and vs 1.d4:**
- Top 5 ECO codes by frequency
- Note any anti-Sicilian weapons (B22 Alapin, B23 Closed, Rossolimo) the opponent uses as White — these directly affect Austin's Taimanov prep

**Key notes to flag for Austin:**
- If opponent plays Alapin (B22) as White → flag: "CRITICAL — Taimanov enters Alapin after 1...c5 2.c3; Austin needs anti-Alapin d5 line"
- If opponent plays Maróczy Bind (B36/B38) → flag: "Maróczy Bind trap — avoid 5.c4 as Black"
- If opponent's ECO as White clusters in 1.d4 D/E codes → flag: "Austin must play Nimzo-Indian; never KID/QGD"

---

### Step 7 — Determine player card placement in `austin-prep.html`

Skip if `--pgnlib-only`.

**Check if card already exists:** grep `austin-prep.html` for the player's last name. If found, offer to update the existing card rather than duplicate.

**Placement logic:**

| Country | FIDE rating | Section |
|---|---|---|
| Canada | any | 🇨🇦 Canadian Opponents section (before the NAYCC USA/Mexico accordion) |
| USA | seeded (seed # known) | Inside NAYCC USA/Mexico accordion → USA sub-group |
| Mexico | seeded (seed # known) | Inside NAYCC USA/Mexico accordion → Mexico sub-group |
| USA/Mexico | not seeded / play-on | Inside accordion → appropriate country sub-group |
| Any | Sparring partner only | Sparring Partner section |

Insert **after** the last existing block in that section, **before** the next section boundary.

---

### Step 8 — Write the player card HTML

The card follows this template exactly (copy from an existing card in the same section for the
correct CSS classes — `opponent-block`, `opponent-header`, `opp-name`, `opp-meta`,
`direct-record`, `opp-links`, `opp-note`):

```html
<!-- {LastName}, {FirstName} — {country}, {rating} FIDE -->
<div class="opponent-block">
  <div class="opponent-header">
    <span class="opp-name">{LastName}, {FirstName}</span>
    <span class="opp-meta">{rating} FIDE ({month} {year}) · {country} · {born-year} ·
      {White opening summary} · {Black opening summary} ·
      {N} games ({year-range}) ·
      <span style="font-weight:600;color:{freshness-color}">Latest: {latest-month-year}</span>
    </span>
    <span class="direct-record {dr-class}">{direct-encounter-text}</span>
  </div>
  <div class="opp-links">
    <a class="opp-link pgn" href="pgnlib/{country-path}/{LastName}, {FirstName}.pgn"
       download="{LastName}, {FirstName}.pgn">&#8615; PGN Library ({N} games)</a>
    {extra links if matchup HTML exists}
  </div>
  <p class="opp-note">{prose summary — opening profile, record, key Austin prep notes}</p>
</div>
```

**`direct-record` CSS class:**
- `dr-win` — Austin has winning record
- `dr-loss` — Austin has losing record
- `dr-draw` — Austin has even/draw record
- `dr-none` — no direct encounter

**Freshness color:**
- Green `#2d7d46` — games within 3 months of today
- Amber `#856404` — 3–12 months ago
- Gray `#57606a` — over 12 months ago

**Rating gap note:**
- If Austin's FIDE > opponent's FIDE: `+{gap} Austin advantage`
- If opponent's FIDE > Austin's: `−{gap} Austin underdog`

**opp-note prose must include:**
1. Total game count + date range
2. As White: specific ECOs, notable weapons (name the variation)
3. As Black: specific ECOs, notable patterns
4. Record (W–L–D) over the pgnlib game set
5. Austin-specific prep recommendation (1–2 lines, using Austin's fixed repertoire from CLAUDE.md)

**Do NOT:**
- Invent game results not found in the PGN data
- Mention ECO codes without the variation name
- Write generic prep advice — tie it to Calix's specific ECO patterns

---

### Step 9 — Verify and commit

1. Run a quick div-balance check on `austin-prep.html`:
   ```python
   python3 -c "
   import re; c=open('austin-prep.html').read()
   d=0
   for ln in c.split('\n'):
       d += len(re.findall('<div\b',ln)) - ln.count('</div>')
   print('Div depth:', d)
   "
   ```
   Must print `Div depth: 0`. If not, find and fix the imbalance before committing.

2. Stage: tournament PGNs + `all.pgn` + `latestN.pgn` in the opponent folder, the updated pgnlib file, and `austin-prep.html` if changed.

3. Commit with message:
   ```
   Add/update {FirstName} {LastName} ({country}, {rating} FIDE): {summary}

   {bullet list of what changed: N games extracted, N tournament files,
    pgnlib updated to N games (date range), player card added/updated}

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```

4. Push to `origin main`.

---

## Handling edge cases

**Multiple extra PGN files** (e.g. `naycc2026-round9.pgn`, `naycc2026-round8.pgn`):
- Load all `*.pgn` files in the folder (skip output files: `all.pgn`, `latest*.pgn`, any file whose name is a slug from Step 4)
- Merge them all in Step 3

**pgnlib-only refresh** (no `html.html`, just new round files):
- Skip Steps 2 and 4
- Load existing pgnlib + new PGN files from folder → dedup → re-sort → rewrite pgnlib
- Report: `{player}: {before} → {after} games (+{N} new)`

**Player already has a card** in `austin-prep.html`:
- Report the existing card location (line number)
- Ask: "Card exists at line {N}. Update it with new game count / latest date, or skip?"
- If updating: edit only the `opp-meta` game count, latest date, and `opp-note` — do not restructure the card

**Large HTML files** (>200KB):
- Read in chunks if needed; the brace-matching parser handles any size

**Unlabeled single-round events** (`Round N: Player A - Player B`):
- Look at the date and check if other games in the same date window are already assigned to a named tournament (e.g., other rounds of NAYCC). If so, assign to the same slug.
- Otherwise use `misc{year}`

**Dedup false negatives** (same game, different GameId):
- After dedup by ID/URL, also check: if two games have same White, Black, Date AND first move, treat as duplicate regardless of ID mismatch

---

## Quick reference — country folder → pgnlib subfolder

| Folder | pgnlib subfolder |
|---|---|
| `opponents/canada/` | `pgnlib/canada/` |
| `opponents/usa/` | `pgnlib/usa/` |
| `opponents/mexico/` | `pgnlib/mexico/` |
| `opponents/others/` | `pgnlib/others/` |
| `opponents/tarun/` (root) | `pgnlib/others/` |
