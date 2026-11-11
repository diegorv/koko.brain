# Issue 16 discovery: a way past the line brake

Owner decision (Issue Notes, 2026-11-10): option (a). A manual "Sync now" at the
brake asks, naming the missing line count; yes runs the cycle and counts the
misses; no stops with nothing written. Automatic cycles abort as today.

## Files that change

- `src/lib/features/todoist-sync/detach.logic.ts:110-120` - add
  `missingLineCount(links, occurrences)`: active links without a line in the
  scan. `belowLineBrake` stays as is (its tests untouched).
- `src/lib/features/todoist-sync/sync-now.service.ts:289` - at the brake:
  `mode === 'auto'` throws `LINES_MISSING` as now; `manual` calls a new
  `confirmLineBrake(missing, active)` dialog (same `ask` options as the caps)
  and throws `LINES_MISSING` / `lines-missing` on no. The check stays before
  every plan and write, so "no" writes nothing. Doc comment of `syncNow`
  (`:188-205`) updated.
- `src/lib/features/todoist-sync/sync-scheduler.logic.ts:52-53` - the
  persistent automatic toast names the way out (`Run "Todoist: Sync now" ...`),
  like the cap toasts.

## Tests (fake `/sync`, real stores)

- `src/tests/lib/features/todoist-sync/sync-now.service.test.ts:1387-1427`
  (`syncNow: the line brake`): existing abort tests set `ask` to false and
  assert the dialog names the count (`ask`'s implementation leaks across
  tests: `clearAllMocks` keeps it). New: yes runs and counts the misses; three
  manual yes cycles detach the missing links and a fourth does not ask; an
  automatic cycle at the brake never asks. Prior art: `syncNow: detach cap`
  (`:1429`).
- `detach.logic.test.ts:201` - `missingLineCount` cases next to `belowLineBrake`.
- `sync-scheduler.logic.test.ts:73`, `sync-scheduler.service.test.ts:423` -
  new toast text; the UI "Sync now" part sets `ask` to false explicitly.

## Defaults taken

- "No" keeps the brake's message and `lines-missing` failure (not the caps'
  "cancelled"): the store and toast still say why the sync stopped.
- Over 10 missing links, the third cycle also hits the detach cap dialog;
  left as is (each brake is its own "pause and ask").

## Risks

- The confirm comes after both pulls (network), as the caps do; still before
  any vault or DB write.
