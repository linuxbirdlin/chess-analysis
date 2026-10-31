# deep-analyze

## Purpose

Run Stockfish deep analysis (movetime-3000, 3× longer than standard) for one or more opponents. Saves results to `scripts/{name}-analysis-results-deep.json` without overwriting the existing standard-depth cache.

Use this skill when you need engine accuracy at GM prep quality — before generating a deep HTML report, before a tournament, or when suspicious of shallow inaccuracies in the standard results.

---

## Invocation

```
/deep-analyze [name] [name2] [name3] ...
```

Examples:
- `/deep-analyze tarun`
- `/deep-analyze aarush tarun`
- `/deep-analyze zachary leo fernando heye pranav`

Player names map to `scripts/analyze-{name}.js`. If a name is ambiguous or no script exists, stop and report before running anything.

---

## Procedure

### Step 1 — Validate Inputs

For each player name in the argument list:

1. Check that `scripts/analyze-{name}.js` exists. If it does not:
   - Report: `No analyze script found for "{name}". Available scripts: [list all scripts/analyze-*.js names]`
   - Ask whether to create one from the `analyze-pranav.js` template before proceeding.
   - Do not run anything until all names are validated.

2. Check whether `scripts/{name}-analysis-results-deep.json` already exists. If it does:
   - Report its size and the number of cached games it contains (count top-level keys in the JSON).
   - The script will skip already-cached games and only analyze new ones — this is safe to re-run.

3. Check whether a deep analysis is already running for this player:
   - Run `ps aux | grep "analyze-{name}" | grep -v grep`
   - If a process is found, report it and ask the user whether to proceed (would run a second instance).

---

### Step 2 — Run the Analysis

**If only one player:**

Run in the background, writing output to `/tmp/deep-{name}.log`:

```bash
SF_MOVETIME=3000 node scripts/analyze-{name}.js > /tmp/deep-{name}.log 2>&1
```

Use `run_in_background: true` so the session stays responsive.

**If multiple players:**

Run sequentially in a single chained background command so they don't compete for CPU (Stockfish uses 16 threads per instance):

```bash
SF_MOVETIME=3000 node scripts/analyze-{name1}.js > /tmp/deep-{name1}.log 2>&1 && \
SF_MOVETIME=3000 node scripts/analyze-{name2}.js > /tmp/deep-{name2}.log 2>&1 && \
...
echo "ALL DONE" > /tmp/deep-all-done.flag
```

After launching, report:
- How many players are queued
- Estimated total runtime: `(number of PGN files across all players) × ~4–5 min per game`
  - Count PGN files: `find opponents/{name}/ -name "*.pgn" | wc -l` for each player
  - Note that already-cached games will be skipped and run in seconds

---

### Step 3 — Monitor Progress (on request)

If the user asks for status, tail the current log:

```bash
tail -5 /tmp/deep-{name}.log
```

The log format is: `[N/Total] Tournament RoundKey  vs Opponent (Rating)  Color  RESULT  Xply...  Ys  acc:Z%  opp:A%  CPL:B  B:C M:D I:E`

Report: current game number, total games, current accuracy reading, estimated time remaining.

---

### Step 4 — On Completion

When notified that the background task finished (or when the user asks):

1. Check the output file exists and has content:
   ```bash
   wc -c scripts/{name}-analysis-results-deep.json
   ```

2. Print a summary — for each player, count:
   - Total games analyzed (non-skipped entries)
   - Average accuracy (player and opponent)
   - Number of blunders, mistakes, inaccuracies

3. Ask the user whether to:
   - **Generate a deep HTML report** (`matchup/matchup-{name}-deep.html`) — use the existing deep HTML as a template, substituting the new accuracy data
   - **Commit the JSON files** — stage only the `*-analysis-results-deep.json` files and commit with message: `Add deep Stockfish analysis for {names} (movetime-3000)`

---

## Output Files

| File | Description |
|---|---|
| `scripts/{name}-analysis-results-deep.json` | Cached engine results (movetime-3000) — one entry per game |
| `/tmp/deep-{name}.log` | Live log for the running analysis |
| `/tmp/deep-all-done.flag` | Created when the full chain finishes |

---

## Technical Notes

- **SF_MOVETIME=3000** is the only change vs standard runs — all other parameters (threads, hash, accuracy formula) are identical.
- Results files are separate (`-deep.json` suffix) — the standard `-analysis-results.json` is never modified.
- Scripts support incremental runs: games already in the JSON are skipped. Re-running after interruption is safe.
- For opponents with non-standard PGN formats (Fernando World Youth, PAM 2026), the script already handles parsing — no extra steps needed.
- Stockfish uses 16 threads per instance. Running two instances simultaneously would cause CPU contention. Always use sequential chaining for multiple players.

---

## Common Errors

| Error | Fix |
|---|---|
| `stockfish: command not found` | `brew install stockfish` |
| `Cannot find module 'chess.js'` | `cd chess-analysis && npm install` |
| Script exits immediately with no output | Check `/tmp/deep-{name}.log` for the error message |
| JSON file exists but is empty `{}` | All games were skipped — the opponent directory may have no PGN files, or all files were already cached at standard depth (different keys won't conflict) |
