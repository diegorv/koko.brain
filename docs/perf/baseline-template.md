# Performance Baseline (Template)

This template captures perf timings before any phase of the
[performance-architecture-refactor](../../tasks/todo/performance-architecture-refactor.md)
is run. After collecting the numbers, copy this file to
`docs/perf/baseline-<YYYY-MM-DD>.md` (replace `<YYYY-MM-DD>` with today's date),
fill in the **Numbers** section, and commit.

The same template is reused for per-phase comparison files
(`docs/perf/phase-<n>-comparison.md`) and the final tally
(`docs/perf/final-<YYYY-MM-DD>.md`).

## What gets measured

The repro sequence below exercises every probe wired up in Phase 0.1. The
labels are emitted as `[PERF-BASELINE] <label>: <ms>ms` lines in the session
log file.

| Label | Where it fires |
|---|---|
| `openFileInEditor:cached` | File already open; just refocuses tab |
| `openFileInEditor:raceCached` | Concurrent open of the same path; race lost |
| `openFileInEditor:fresh` | Cold open: read disk + add tab |
| `switchTab:sync` | Synchronous part of `switchTab` (store update + fs sync) |
| `closeTab` | Successful close path (after any dirty-confirm dialog) |
| `updateIndexesForFile` | Full 3-phase indexer (debounced 1 s after a keystroke) |
| `updateActiveTabLinks` | Backlinks + outgoing links update on tab switch (debounced 150 ms) |
| `contentSyncEffect:noop` | Fires every keystroke; toString round-trip with no dispatch |
| `contentSyncEffect:dispatched` | Fires when external mutator wrote tab content (Properties panel, task toggle, link rename) |

## How to run

1. **Enable logging.** Open the app, go to Settings -> Troubleshooting ->
   Frontend, and toggle **Save debug log to file** on. Logs go to
   `~/Library/Logs/com.diegorv.kokobrain/<timestamp>.log` (one file per
   session).

2. **Pick a vault.** Use a representative vault (your real one, ideally).
   Note its size (file count + MB) in the Numbers section below.

3. **Run the repro sequence** without rushing. Pause briefly between actions
   so the 1 s debounce on `updateIndexesForFile` and the 150 ms debounce on
   `updateActiveTabLinks` actually fire.

   1. Open file 1 (cmd-click in file explorer or Cmd+P).
   2. Repeat for files 2-10 (use 10 files of varying sizes from the same vault).
   3. Switch between tabs 20 times. Mix of recently-opened (cache hot) and
      older tabs (cache cold). Keep a steady ~1 s rhythm.
   4. Close 5 tabs. Use Cmd+W or middle-click. Mix dirty + clean.
   5. Type 500 characters in one tab. A continuous burst is fine.
   6. Save with Cmd+S (the autosave will eventually fire too; the explicit
      save makes the timestamp easier to find in the log).

4. **Parse the log.**

   ```sh
   python3 scripts/perf-baseline.py
   ```

   This grabs the most recent log file. Pass `--log <path>` to point at a
   specific one or `--filter <substring>` to narrow to one label set
   (e.g. `--filter switchTab`). Use `--json` for machine-readable output.

5. **Copy this template** to `docs/perf/baseline-<YYYY-MM-DD>.md`, paste the
   numbers, commit on the branch.

## One-line setup-and-parse

```sh
# Enable Settings -> Troubleshooting -> Save debug log to file once (persists).
# Then after each repro:
python3 scripts/perf-baseline.py
```

## Numbers (fill in after the repro)

**Date:** `<YYYY-MM-DD>`
**Branch / commit:** `<branch>` at `<sha>`
**Vault size:** `<N>` markdown files, `<M>` MB total
**App version:** `<version from About>`
**Repro deviations:** `<any change from the standard sequence above, or "none">`

| Label | count | median ms | p95 ms | min ms | max ms |
|---|---:|---:|---:|---:|---:|
| `openFileInEditor:cached` | | | | | |
| `openFileInEditor:raceCached` | | | | | |
| `openFileInEditor:fresh` | | | | | |
| `switchTab:sync` | | | | | |
| `closeTab` | | | | | |
| `updateIndexesForFile` | | | | | |
| `updateActiveTabLinks` | | | | | |
| `contentSyncEffect:noop` | | | | | |
| `contentSyncEffect:dispatched` | | | | | |

### Notes / observations

- _Add anything that affected the run: cold start vs warm, any concurrent
  semantic indexing, manual interruptions, etc._

## Comparison (only for `phase-<n>-comparison.md` files)

When this template is used for a per-phase comparison, add a second numbers
table populated with the post-flag-on values, then a delta table:

| Label | Baseline median | Phase N median | Delta | Baseline p95 | Phase N p95 | Delta |
|---|---:|---:|---:|---:|---:|---:|
| ... | | | | | | |

Negative delta = improvement. Comment on any regressions or no-change rows.
