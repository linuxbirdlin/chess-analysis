# Reorganization Implementation Plan

> Generated: 2026-11-19. All open questions answered — plan is now decision-final.

---

## Current State Audit

### What's messy right now

| Area | Problem |
|------|---------|
| `opponents/` | All 20+ opponent folders are flat — no country grouping; `lower-rates/` only wraps `santino/` |
| `play-on/` | NAYCC 2026 live-prep folder (benito, cristian, erik, ian-axel, ian-marco, marco, mateo-ruiz, neel) — detached from main opponent tree |
| `scripts/` | 95+ files flat: analysis scripts, deviation scripts, JSON data, utility scripts, one-offs all mixed together |
| `pgnlib/` | Literal duplicate filenames (Pablo, Irene, Reyansh have multiple versions; Joel has username + full-name version); no country subfolders |
| `austin-prep.html` | NAYCC 2026 prep links buried with no tournament grouping or room for future tournaments |
| Root level | `fernando-analysis.html`, `austin-prep-archive.html` are orphaned stray files |
| `training-coach/` | Python tool with `.venv/` committed — no readme explaining what it does |

---

## Decisions Made

| # | Question | Decision |
|---|----------|---------|
| 1 | Ian-Axel, Ian-Marco, Cristian countries | All MEX: Calzada Martinez, Ian Axel; Martinez Nestor, Ian Marco; Lagunes Mendez, Cristian Jeron |
| 1b | Pranav Santhosh | USA |
| 1c | Neel Yadatore | USA |
| 1d | Yaen Saenz Cabrera | Mexico |
| 1e | Marco (play-on) | MEX: Olivo Diaz, Marco Cristofer |
| 2 | `side-issues/` folder | Keep in repo — will migrate out when it grows |
| 3 | `training-coach/` | Keep; add `readme.md` explaining the tool |
| 4 | Irene Xie nationality | Canada |
| 5 | HTML access control | Implement Option B (URL token + localStorage) first; fall back to Cloudflare Access if needed (account exists) |
| 6 | pgnlib namespacing | Add country subfolders; update all link paths accordingly |

---

## Phase 0 — Nationality Table (now complete)

### Confirmed

| Player | Country | Source |
|--------|---------|--------|
| Justin Huang | Canada | Canada Closed, Toronto Open, PAM |
| Aarush Ajith | Canada | Canada Closed, PAM School |
| Zachary Liu | Canada | Canada Closed, BSC Cup |
| Heye Gao | Canada | Canada Closed, PAM |
| Daniel Joshua Lee | Canada | Canada Closed, PAM — explicit CAN flag |
| Joel Ethan Jeyaraj | Canada | Played Canada Closed / PAM — confirm via Lichess JEJ13 |
| Jordan Szeto | Canada | Confirm via FIDE (Szeto is a BC/Ontario Cantonese name) |
| Pablo Elliot De Alba Boudreau | Canada | Confirm via FIDE (Boudreau = Acadian surname) |
| Irene Xie | Canada | Confirmed by user |
| Pranav Santhosh | USA | Confirmed by user |
| Reyansh Paragiri | USA | CLAUDE.md explicit |
| Zhuoyuan Wu | USA | CLAUDE.md explicit |
| Asher Chodniewicz | USA (Texas) | CLAUDE.md explicit |
| Emerson Johnson | USA | US tournaments only |
| Leo Jackson | USA | leodanieljackson Lichess + US tournaments |
| Neel Yadatore | USA | Confirmed by user |
| Fernando Cortes Medina | Mexico | CLAUDE.md MEX flag, national titles |
| Daniel Hernandez Gamboa | Mexico | Querétaro tournaments |
| Inti Flores Ojeda | Mexico | CLAUDE.md MEX flag |
| Santino Valdez Alvarez | Mexico | CLAUDE.md MEX (Baja Cal. Sur) |
| Yaen Saenz Cabrera | Mexico | Confirmed by user |
| Benito Salazar Rodriguez | Mexico | Surname pattern + play-on context |
| Erik Dominguez Alarcon | Mexico | Surname pattern + pgnlib |
| Mateo Ruiz Gastelum | Mexico | Gastelum = Sinaloa surname |
| Ian Axel Calzada Martinez | Mexico | Confirmed by user |
| Ian Marco Martinez Nestor | Mexico | Confirmed by user |
| Cristian Jeron Lagunes Mendez | Mexico | Confirmed by user |

### All nationalities confirmed

Phase 0 is complete. No lookups remaining.

---

## Phase 1 — Opponents Folder: Country Grouping

### Target structure

```
opponents/
  canada/
    justin/        (Justin Huang)
    aarush/        (Aarush Ajith)
    zachary/       (Zachary Liu)
    heye/          (Heye Gao)
    danielee/      (Daniel Joshua Lee)
    joel/          (Joel Ethan Jeyaraj)
    jordan/        (Jordan Szeto)
    pablo/         (Pablo De Alba Boudreau)
    irene/         (Irene Xie)

  usa/
    emerson/       (Emerson Johnson)
    leo/           (Leo Jackson)
    reyansh/       (Reyansh Paragiri)
    zhuoyuan/      (Zhuoyuan Wu)
    asher/         (Asher Chodniewicz)
    pranav/        (Pranav Santhosh)
    neel/          (Neel Yadatore)

  mexico/
    fernando/      (Fernando Cortes Medina)
    danielh/       (Daniel Hernandez Gamboa)
    inti/          (Inti Flores Ojeda)
    santino/       (Santino Valdez Alvarez — promote from lower-rates/)
    yaen/          (Yaen Saenz Cabrera)
    benito/        (Benito Salazar Rodriguez — from play-on/)
    erik/          (Erik Dominguez Alarcon — from play-on/)
    mateo-ruiz/    (Mateo Ruiz Gastelum — from play-on/)
    ian-axel/      (Ian Axel Calzada Martinez — from play-on/)
    ian-marco/     (Ian Marco Martinez Nestor — from play-on/)
    cristian/      (Cristian Jeron Lagunes Mendez — from play-on/)
    marco/         (Marco Cristofer Olivo Diaz — from play-on/)

  others/          (empty — all players assigned)

  lichess-accounts.txt   (stays at top level of opponents/)
```

Note: `heye/` is NOT moved to `_archive/` — Heye Gao moved to a different section at NAYCC 2026 but is still a real opponent. Keep under `canada/heye/` and note the section change in `heye-analysis.md`.

### Migration script skeleton

```bash
# Confirmed Canada
for name in justin aarush zachary heye danielee joel jordan pablo irene; do
  mkdir -p opponents/canada/$name
  mv opponents/$name/* opponents/canada/$name/
  rmdir opponents/$name
done

# Confirmed USA
for name in emerson leo reyansh zhuoyuan asher pranav neel; do
  mkdir -p opponents/usa/$name
  mv opponents/$name/* opponents/usa/$name/
  rmdir opponents/$name
done

# Confirmed Mexico
for name in fernando danielh inti yaen; do
  mkdir -p opponents/mexico/$name
  mv opponents/$name/* opponents/mexico/$name/
  rmdir opponents/$name
done

# Promote santino from lower-rates
mkdir -p opponents/mexico/santino
mv opponents/lower-rates/santino/* opponents/mexico/santino/
rmdir opponents/lower-rates/santino opponents/lower-rates

# Integrate play-on/ Mexico players
for name in benito erik mateo-ruiz ian-axel ian-marco cristian marco; do
  mkdir -p opponents/mexico/$name
  mv play-on/$name/* opponents/mexico/$name/
  rmdir play-on/$name
done

# Integrate neel (verify country first)
# mkdir -p opponents/usa/neel && mv play-on/neel/* opponents/usa/neel/ && rmdir play-on/neel
```

### Path updates required after migration

Every script in `scripts/` that opens files from `opponents/{name}/` must be updated to `opponents/{country}/{name}/`. The `analyze-*.js` scripts are the main concern. Run a search after moving:

```bash
grep -r "opponents/" scripts/ | grep -v ".json" | awk -F: '{print $1}' | sort -u
```

Also update `CLAUDE.md` path table in the Project Structure section.

---

## Phase 2 — pgnlib Cleanup + Country Subfolders

### Step 1: Dedup first (before adding subfolders)

```bash
# Real duplicates — remove the malformed versions:
rm "pgnlib/De Alba Boudreau,Pablo Elliot.pgn"       # keep space version
rm "pgnlib/Xie,Irene.pgn"                           # keep "Xie, Irene.pgn"
rm "pgnlib/Paragiri Reyansh.pgn"                    # keep "Paragiri, Reyansh.pgn"
# Merge Paragiri Latest64 into canonical, then remove:
# cat "pgnlib/Paragiri, Reyansh - Latest64.pgn" >> "pgnlib/Paragiri, Reyansh.pgn"
# Then dedup with build-reyansh-pgnlib.js, then:
rm "pgnlib/Paragiri, Reyansh - Latest64.pgn"
# Merge JEJ13 (Lichess games) into Joel's full-name file, then remove:
# cat "pgnlib/JEJ13.pgn" >> "pgnlib/Jeyaraj, Joel Ethan.pgn"
# Then dedup, then:
rm "pgnlib/JEJ13.pgn"
```

### Step 2: Create country subfolders

```
pgnlib/
  canada/
    Ajith, Aarush.pgn
    De Alba Boudreau, Pablo Elliot.pgn
    Gao, Heye.pgn
    Huang, Justin.pgn
    Jeyaraj, Joel Ethan.pgn
    Lee, Daniel Joshua.pgn
    Liu, Zachary Hankun.pgn
    Szeto, Jordan.pgn
    Xie, Irene.pgn
  usa/
    Chodniewicz, Asher.pgn
    Jackson, Leo Daniel Olivera.pgn
    Johnson, Emerson Aurelius.pgn
    Paragiri, Reyansh.pgn
    Santhosh, Pranav.pgn
    Wu, Zhuoyuan.pgn
    Yadatore, Neel.pgn
  mexico/
    Calzada Martinez, Ian Axel.pgn
    Cortes Medina, Fernando.pgn
    Dominguez Alarcon, Erik Samuel.pgn
    Flores Ojeda, Inti Dario.pgn
    Hernandez Gamboa, Daniel.pgn
    Lagunes Mendez, Cristian Jeron.pgn
    Martinez Nestor, Ian Marco.pgn
    Ruiz Gastelum, Mateo.pgn
    Saenz Cabrera, Yaen.pgn
    Olivo Diaz, Marco Cristofer.pgn
    Salazar Rodriguez, Benito.pgn
    Valdez Alvarez, Santino.pgn
  others/
    (empty — all players confirmed)
  MANIFEST.md
```

### Step 3: Update all pgnlib references in scripts

```bash
grep -r "pgnlib/" scripts/ | awk -F: '{print $1}' | sort -u
```

Also update `build-pgnlib.js` to output to `pgnlib/{country}/` subfolders.

### Step 4: Add MANIFEST.md

`pgnlib/MANIFEST.md` should document:
- Canonical naming: `{LastName}, {FirstName(s)}.pgn`
- Country subfolder assignment rules
- Format: sorted date desc, deduplicated by game ID or header hash
- How to append: run `scripts/build-pgnlib.js --player {name}` (or manually append + re-sort)
- Last-updated log per player (update when you add games)

### Optional: metadata.json

```json
{
  "canada/Huang, Justin.pgn": { "lastUpdated": "2026-11-19", "gameCount": 42 },
  "mexico/Cortes Medina, Fernando.pgn": { "lastUpdated": "2026-10-15", "gameCount": 31 }
}
```

This lets a script quickly check whether a file is stale without re-reading all PGNs.

---

## Phase 3 — Scripts Folder Reorganization

Split 95+ flat files into logical subfolders:

```
scripts/
  analyze/            # Stockfish analysis drivers (one per opponent)
    analyze-{name}.js
    analyze-clock.js
    analyze-games.js
    analyze-study-pt5.js

  deviation/          # Opening deviation analysis
    {name}-opening-deviation.js
    aarush-direct-results.json

  fw/                 # Find-weakness scripts
    fw-{name}.js
    find-weakness-fernando.js

  utils/              # Shared / reusable tools
    build-pgnlib.js
    fetch-accuracy.js
    query-openings.js
    extract-reyansh-html.js
    archive/
      build-pablo-pgnlib.js      # one-off, superseded
      build-reyansh-pgnlib.js    # one-off, superseded

  data/               # Cached engine results
    {name}-analysis-results.json
    {name}-analysis-results-deep.json
    {name}-deviation-results.json
    accuracy-cache.json
    opening-novelty-data.json
    study-pt5-results.json
    clock-analysis-results.json
```

**After moving, update all `require()` / `fs.readFile()` paths inside each script.**

One-off play-on scripts (`analyze-benito.js`, `analyze-erik.js`, `analyze-marco.js`, `analyze-mateo.js`) — move to `scripts/analyze/` alongside the others; they are legitimate analysis scripts even if the players came from play-on.

---

## Phase 4 — austin-prep.html: Tournament-Grouped Index

### Target layout

```
AUSTIN LIN CHESS PREP
├── 2026 Tournaments
│   ├── NAYCC 2026 (Nov 2026) — U14 · 3rd place · CM-eligible ★
│   │   Opponents (by seeding):
│   │     Reyansh Paragiri (#4) — matchup / deep / white / black / gm
│   │     Asher Chodniewicz — matchup / deep / white / black / gm
│   │     Zhuoyuan Wu (#10) — matchup / deep / white / black / gm
│   │     [all remaining NAYCC 2026 opponents]
│   │     [play-on round opponents: benito, neel, ian-axel, ian-marco, cristian…]
│   │   NAYCC 2026 Results (link to review when available)
│   ├── PAM 2026 (Jul 2026)
│   │     Austin review / deep review
│   ├── Canada Closed 2026
│   └── Personal Study (ongoing)
├── 2025 Tournaments
│   └── NAYCC 2025
│         Austin review / deep review
├── Training & Drills
│   ├── 4-week training plan
│   ├── Endgame drills
│   ├── Blunder patterns
│   └── Opening theory check
└── [2027 Tournaments — placeholder section]
```

### Key changes from current state
- Wrap all NAYCC 2026 cards in a `<section id="naycc2026">` with a header and achievement badge
- Add a placeholder `<section id="naycc2027">` so the structure is ready for the next tournament
- Anchor links at the top for fast navigation between tournament years
- Keep the existing visual style — only structural HTML changes

---

## Phase 5 — HTML Access Control

### Decision: Option B — URL token + localStorage (implement first)

Add this snippet inside `<head>` of every HTML file:

```html
<script>
(function() {
  var KEY = 'chess2026';
  var p = new URLSearchParams(location.search);
  if (p.get('key') === KEY) {
    localStorage.setItem('chess-key', KEY);
  }
  if (localStorage.getItem('chess-key') !== KEY) {
    var input = prompt('Access code:');
    if (input !== KEY) {
      document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px">Access denied.</p>';
      return;
    }
    localStorage.setItem('chess-key', KEY);
  }
})();
</script>
```

**How it works:**
- Austin's first visit: `austin-prep.html?key=chess2026` — auto-stores token, never prompted again on that device
- Subsequent visits: `austin-prep.html` — localStorage check passes silently
- Anyone else who lands on the URL without the key gets a password prompt; wrong answer = blank page

**Files to update:** every `.html` in `matchup/`, `austin/*/`, root level (`austin-prep.html`, `austin-training.html`), and `play-on/naycc2026-tracker.html`

```bash
# Count of files to update:
find . -name "*.html" -not -path "./.git/*" | wc -l
```

**Fallback:** Cloudflare Access (account exists). If the URL-token approach proves annoying (Austin forgets or clears localStorage), set up Cloudflare Zero Trust in front of the GitHub Pages URL — no code changes needed at that point.

---

## Phase 6 — Repository Housekeeping

### 6a. Integrate `play-on/` after Phase 1

Once all play-on players are moved to `opponents/{country}/`:
- Move `play-on/naycc2026-tracker.html` → `austin/naycc2026/naycc2026-tracker.html`
- Move `play-on/chess-roster-final.xlsx` → `austin/naycc2026/chess-roster-final.xlsx`
- Delete empty `play-on/`

### 6b. `side-issues/` — keep as-is

Leave in repo for now. When it outgrows the chess context, migrate to a separate personal notes repo.

### 6c. Root-level orphan files

- `fernando-analysis.html` — delete (full matchup pipeline in `matchup/` supersedes it)
- `austin-prep-archive.html` — delete (confirm it's just an old draft of `austin-prep.html`)

### 6d. `analysis/` folder — stays flat

No country grouping needed. These are small markdown files; flat is fine.

### 6e. `training-coach/` gitignore + readme

Add to `.gitignore`:
```
training-coach/.venv/
training-coach/__pycache__/
training-coach/gm-preparation/__pycache__/
```

Add `training-coach/README.md` explaining what the tool does (created separately — see action item below).

### 6f. `matchup/` rename — skip

Keep `matchup/` as-is. The redirect cost (updating every link in every HTML) is not worth the minor clarity gain.

---

## Execution Order

| Phase | Effort | Prerequisite | Breaks links? |
|-------|--------|-------------|---------------|
| 0 — finish nationality lookups (Pranav, Neel, Yaen, Marco) | Low | None | No |
| 2a — pgnlib dedup | Low | None | No |
| 6c — delete root orphan files | Trivial | Confirm obsolete | No |
| 6e — gitignore training-coach | Trivial | None | No |
| 6e — training-coach readme | Low | None | No |
| 4 — austin-prep.html index redesign | Medium | None | No |
| 5 — URL token auth in all HTML files | Medium | None | No |
| 2b — pgnlib country subfolders | Medium | Phase 2a done | Yes — update script paths |
| 1 — opponents/ by country | High | Phase 0 done | Yes — update script paths + CLAUDE.md |
| 3 — scripts/ reorganize | High | Phase 1 done | Yes — update require paths |
| 6a — integrate play-on/ | Medium | Phase 1 done | Minimal |

**Safe to do now (zero risk):** phases 0, 2a, 6c, 6e (gitignore + readme), 4, 5.  
**Do together (path rewrites cascade):** phases 1 + 2b + 3 in one session.

---

## Action Items After Plan Approval

- [x] Phase 0 complete — all nationalities confirmed (Marco = Olivo Diaz, Marco Cristofer, MEX)
- [x] Create `training-coach/README.md` — IM pipeline + GM 6-phase pipeline documented
- [x] Dedup pgnlib (Phase 2a) — 25 clean files, Reyansh 118 games (merged NAYCC 2026 R3-R6), removed 6 duplicates/subsets
- [x] Delete orphan root files — `pranav-analysis.html` deleted; `fernando-analysis.html` + `austin-prep-archive.html` confirmed NOT orphans (keep)
- [x] Add gitignore entries for training-coach (Phase 6e) — already present, no action needed
- [x] Redesign `austin-prep.html` (Phase 4):
      - Rating fixed: 1865 → 1959 FIDE (Nov 2026)
      - White pill: "Advanced French" removed → "Tarrasch French 3.Nd2"
      - Year nav bar added (2026 / 2025 / Training / 2027)
      - NAYCC 2026 achievement banner added (3rd Place · CM-eligible · 1959 FIDE)
      - Opponents section renamed "NAYCC 2026 Opponents · ordered by seed"
      - 2026 Game Reviews: NAYCC 2025 card removed (now in its own 2025 section)
      - 2025 season section added with NAYCC 2025 deep + standard review cards
      - Training section given year-heading label
      - 2027 future placeholder section added
      - Bug fixes: Paragiri Latest64 link removed, Xie Snoop2026 link removed, Leo PGN path space fixed, Reyansh count 114→118, Asher White "Advanced French 3.e5"→"Tarrasch 3.Nd2", Asher GM badge class fixed (deep→gm-plan)
- [x] Add URL token auth to all HTML files (Phase 5) — `scripts/inject-auth.js` written and run; 176 files injected with chess-auth-v1 marker; revertible via `--revert` flag
- [ ] Execute opponents/ country migration + script path rewrites (Phases 1 + 2b + 3) — in progress (big-migration agent)
- [ ] Update `CLAUDE.md` with new folder structure — pending migration completion
- [ ] Integrate `play-on/` and clean it up (Phase 6a) — pending migration completion
