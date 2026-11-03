# lichess-verify

## Purpose

Verify any chess position, FEN, or move sequence against Lichess before writing it into a file. Use this any time you are about to:
- Write a FEN into an HTML file (`.fen-box`, analysis position, drill position)
- Assert that a sequence of moves is legal
- Claim an opening statistic (e.g., "masters play X in 45% of games")
- Build a move trail for an opening deviation map

**Never derive FEN positions by hand from first principles.** The Asher/Vadim sessions audit produced two impossible FENs because move sequences were traced manually. Lichess is authoritative; manual derivation is not.

---

## Invocation

```
/lichess-verify [FEN or move sequence]
```

Examples:
- `/lichess-verify r1bqkb1r/pp1p1ppp/2n1pn2/8/2PNP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 0 6`
- `/lichess-verify 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Nf6 6.c4`
- `/lichess-verify` (no args — verify whatever position is currently being discussed)

---

## Verification Procedures

### A — Verify a FEN is legal and matches the intended position

Fetch the Lichess analysis page with the FEN embedded in the URL:

```
https://lichess.org/analysis/{URL-encoded FEN}
```

The page will show the board position. Confirm:
1. All pieces are on the expected squares
2. It is the expected side's turn (w/b)
3. The fullmove counter is correct
4. No pieces are missing or doubled

**Quick WebFetch call:**
```
WebFetch("https://lichess.org/analysis/standard/{FEN}", "What pieces are on the board and whose turn is it?")
```

If Lichess rejects the FEN as illegal, the FEN is wrong. Do not write it.

---

### B — Verify a move sequence is legal and reaches the expected position

Use the Lichess opening explorer API to trace the sequence and confirm each move is legal:

```
https://explorer.lichess.ovh/masters?play={move1},{move2},...
```

Moves are in UCI format (e.g., `e2e4,c7c5,g1f3`). The API returns:
- The resulting FEN
- Top book responses at that position
- Game count in the Lichess masters database

**Example — verify 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Nf6 6.c4:**
```
WebFetch("https://explorer.lichess.ovh/masters?play=e2e4,c7c5,g1f3,e7e6,d2d4,c5d4,f3d4,b8c6,b1c3,g8f6,c2c4", 
         "What is the FEN of this position and what are the top moves?")
```

---

### C — Verify an opening statistic

Use the masters explorer to get accurate move frequencies at any position:

```
https://explorer.lichess.ovh/masters?fen={FEN}
```

Returns: top moves with `white`/`draws`/`black` game counts. Calculate percentage as `count / total`.

**Example — verify "masters play Qd2 in 39% of games" at a Taimanov position:**
```
WebFetch("https://explorer.lichess.ovh/masters?fen=r1bqkb1r/pp1p1ppp/2n1pn2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 3 6",
         "What are the top moves and their percentages?")
```

---

### D — Verify a FEN from a known move sequence (most reliable path)

1. Trace the moves via the explorer API (Procedure B) to get the FEN from Lichess
2. Compare the Lichess-returned FEN against the FEN in the document
3. If they differ, use the Lichess FEN — not the document's

This is the most reliable path when building FEN reference tables for drill positions.

---

## When to invoke

| Situation | Required? |
|---|---|
| Writing a new `.fen-box` into any HTML file | **Always** |
| Editing an existing FEN in an HTML file | **Always** |
| Claiming "masters play X in Y% of games" | **Always** |
| Tracing a 6+ move opening sequence from scratch | **Always** |
| Building opening deviation map chips from JSON (pcts already verified by script) | Skip — JSON is already sourced from Lichess API |
| Copying a FEN verbatim from another verified file in this project | Skip |

---

## Quick Reference — Lichess API Endpoints

| Purpose | Endpoint |
|---|---|
| Verify position visually | `https://lichess.org/analysis/standard/{FEN}` |
| Get FEN from move sequence | `https://explorer.lichess.ovh/masters?play={uci_moves}` |
| Get book moves at a position | `https://explorer.lichess.ovh/masters?fen={FEN}` |
| Lichess games database (all players) | `https://explorer.lichess.ovh/lichess?fen={FEN}` |

FEN encoding for URLs: replace spaces with `%20` or `_`, `/` stays as `/`.

---

## Example output to check

When `WebFetch` returns from the masters explorer, the JSON looks like:

```json
{
  "fen": "r1bqkb1r/pp1p1ppp/2n1pn2/8/2PNP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 0 6",
  "moves": [
    { "uci": "d6d5", "san": "d6",  "white": 120, "draws": 80, "black": 100, "averageRating": 2580 },
    { "uci": "a7a6", "san": "a6",  "white": 90,  "draws": 70, "black": 95  }
  ]
}
```

`fen` is the authoritative position FEN. Use it directly.
