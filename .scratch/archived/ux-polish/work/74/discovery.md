# Issue 74 discovery

## Files that change

- `src/tests/help/queryjs-contract.test.ts:404-414`: the one `beforeAll` that runs
  every block and script once (sequentially) to record each script's caller
  input into `CALLS`. It runs under vitest's 10 000 ms default hook timeout.

No app code changes. No vitest config change.

## Measurement (hook body timed with `performance.now()`, temporary, not committed)

Machine: 10 cores (4 P + 6 E), every run under `taskpolicy -c background`.

| Condition | Hook time |
|-----------|-----------|
| File alone, 3 runs | 2383, 2373, 2345 ms |
| File alone + 10 background busy loops (`yes`), 2 runs | 4987, 5064 ms |
| File alone + 20 background busy loops, 1 run | 9451 ms |
| Real full suite under parallel worktrees (ux-polish logs 04, 05, 10, 17, 23, 36, 38, 49, 64, 73) | killed at 10 000 ms; file total 10.2 to 14.6 s |

The hook scales linearly with CPU contention (about 2x per 10 competing
loops) and reaches the 10 s default at roughly the load the real full suite
puts on the E-cores. No full-suite run was made for this (owner note 2026-11-05).

## Plan

Option 1 of the Issue: an explicit timeout on this hook only, named constant
with a comment, `30_000` ms. Why 30 s:

- About 12x the alone time and 3x the 20-loop time, so a regression that makes
  the setup an order of magnitude slower alone still fails it; not "infinite".
- The same 30 s budget the file's per-run cases and the sort case already use
  (`LOADED_RUN_TIMEOUT`); the sort case runs every block twice concurrently.

Splitting the hook per root is rejected: script cases read `CALLS`, which is
filled across roots in one order (own-root blocks, then borrowing roots, then
scripts); per-root hooks would change which caller a script records and with it
the snapshots.

## Risks

- A load heavier than any seen could still pass 30 s; accepted, it is a
  visible, recoverable flake.

## Prior art

`LOADED_RUN_TIMEOUT` in the same file (comment + constant pattern).
