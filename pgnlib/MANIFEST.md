# pgnlib — Game Library Manifest

Canonical PGN library for Austin Lin's chess preparation. One file per opponent, organized by country.

---

## Naming Convention

```
{LastName}, {FirstName(s)}.pgn
```

- Last name first, then a comma + space, then all given names
- Diacritics preserved (not ASCII-folded)
- Multi-word last names written solid: `Cortes Medina, Fernando.pgn`, `De Alba Boudreau, Pablo Elliot.pgn`
- Files sorted by date descending within each file; deduplicated by composite key (White | Black | Date | Result)

## Country Subfolders

| Folder | Players |
|--------|---------|
| `canada/` | Ajith, De Alba Boudreau, Gao, Huang, Jeyaraj, Lee, Liu, Szeto, Xie |
| `usa/` | Chodniewicz, Jackson, Johnson, Paragiri, Santhosh, Wu, Yadatore |
| `mexico/` | Cortes Medina, Dominguez Alarcon, Flores Ojeda, Hernandez Gamboa, Ruiz Gastelum, Saenz Cabrera, Salazar Rodriguez, Valdez Alvarez |
| `others/` | Sankar (country unconfirmed — move to canada/ or usa/ once confirmed) |

---

## Game Counts (last updated 2026-11-19)

### Canada (9 players)

| File | Games | Last updated |
|------|-------|--------------|
| Ajith, Aarush.pgn | 70 | Nov 2026 |
| De Alba Boudreau, Pablo Elliot.pgn | 61 | Nov 2026 |
| Gao, Heye.pgn | 89 | Nov 2026 |
| Huang, Justin.pgn | 66 | Nov 2026 |
| Jeyaraj, Joel Ethan.pgn | 101 | Nov 2026 |
| Lee, Daniel Joshua.pgn | 56 | Nov 2026 |
| Liu, Zachary Hankun.pgn | 139 | Nov 2026 |
| Szeto, Jordan.pgn | 17 | Nov 2026 |
| Xie, Irene.pgn | 137 | Nov 2026 |

### USA (7 players)

| File | Games | Last updated |
|------|-------|--------------|
| Chodniewicz, Asher.pgn | 35 | Nov 2026 |
| Jackson, Leo Daniel Olivera.pgn | 62 | Nov 2026 |
| Johnson, Emerson Aurelius.pgn | 96 | Nov 2026 |
| Paragiri, Reyansh.pgn | 118 | Nov 2026 |
| Santhosh, Pranav.pgn | 27 | Nov 2026 |
| Wu, Zhuoyuan.pgn | 54 | Nov 2026 |
| Yadatore, Neel.pgn | 15 | Nov 2026 |

### Mexico (8 players)

| File | Games | Last updated |
|------|-------|--------------|
| Cortes Medina, Fernando.pgn | 40 | Nov 2026 |
| Dominguez Alarcon, Erik Samuel.pgn | 7 | Nov 2026 |
| Flores Ojeda, Inti Dario.pgn | 93 | Nov 2026 |
| Hernandez Gamboa, Daniel.pgn | 12 | Nov 2026 |
| Ruiz Gastelum, Mateo.pgn | 64 | Nov 2026 |
| Saenz Cabrera, Yaen.pgn | 237 | Nov 2026 |
| Salazar Rodriguez, Benito.pgn | 21 | Nov 2026 |
| Valdez Alvarez, Santino.pgn | 3 | Nov 2026 |

### Others (1 player)

| File | Games | Notes |
|------|-------|-------|
| Sankar, Tarun.pgn | 28 | Country unconfirmed — move to canada/ or usa/ once confirmed |

---

## How to Add Games

1. Place new PGN files in `opponents/{country}/{name}/`
2. Run `node scripts/utils/build-pgnlib.js` or manually append + re-sort by date
3. Dedup: composite key = White field + Black field + Date field + Result field
4. Update the game count and "Last updated" date in this file

## How to Add a New Player

1. Determine country (canada / usa / mexico / others)
2. Create `pgnlib/{country}/{LastName}, {FirstName(s)}.pgn`
3. Add a row to the table above
4. Update all script references to use `pgnlib/{country}/{filename}`
