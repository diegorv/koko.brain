# Issue 18 discovery: every cycle leaves a record

No `spec.md` in the feature folder; design is `research/design.md`.

## Files that change

- `src-tauri/src/db/todoist_repo.rs:86-93,214-228` - `TodoistSyncLogInput` gets
  `replace_id: Option<i64>` (serde default, ts optional): when it names the
  newest row, `append_log` updates that row (time, kind, anchor, message)
  instead of inserting. Regenerated `TodoistSyncLogInput.ts`. Rust test in
  `src-tauri/tests/todoist_state_test.rs` (prior art `log_append_keeps_...`).
- New `src/lib/features/todoist-sync/cycle-log.logic.ts`: `CycleRecord`,
  `cycleLogEntry(record, newest)` (message text; a quiet automatic cycle, i.e.
  no commands and zero counts, whose newest row is a quiet row with the same
  outcome replaces it with count + 1 and its first start kept),
  `filterLogEntries`, `newestCycle`.
- `sync-log.service.ts` - `logCycle(vaultPath, record)`: reads the newest row,
  appends (or replaces) the `cycle` row; a failure is `error()`-logged and
  never changes the sync outcome.
- `sync-now.service.ts:208-245` - `syncNow(mode, trigger?)`: a trace object
  (start, commands by type, token advanced, counts) filled during `cycle()`,
  written by `logCycle` after the try/catch. The client is wrapped
  (`tracedClient`) so every `/sync` counts its commands and logs each pull
  (full or incremental, item count). `sendCommands:933` takes `{ ref, command }`
  pairs and debug-logs types, refs (anchor, note path or project id) and uuids,
  then `sync_status` per uuid. `cycle()` also returns `detached`.
- `sync-scheduler.service.ts:88-216` - triggers (`vault-open`, `interval`,
  `focus`, `after-save`) threaded through `requestAutoCycle`, the deferred
  `dueTimer` and the queued follow-up into `syncNow`.
- `TodoistSyncLogDialog.svelte` - All / Cycles / Events buttons, newest
  `cycle` row's summary at the top.
- `src/tests/fixtures/todoist-vault.fake.ts` - stores rows and honours
  `replaceId`; `log` lists event rows only, `cycles` the cycle rows, so the
  existing event assertions stay as they are.
- `help/documentation/10-tasks-and-todoist.md` - "Troubleshooting the sync".

## Tests

- `cycle-log.logic.test.ts` (new): message, quiet collapse, filter.
- `sync-now.service.test.ts`: one cycle row on ok, failure, cancel; none on a
  refusal; three quiet auto cycles leave one row with count 3; debug lines
  carry no task content. `syncNow: mode` type test gains `trigger?`.
- `sync-scheduler.service.test.ts`: the row names its trigger.
- `TodoistSyncLogDialog.test.ts`: filter and summary.

## Defaults taken

- A cycle stopped by a vault switch writes no row: design rule 9 (nothing
  more is written after a switch; Rust refuses the old vault anyway).
- Quiet failures collapse too (same outcome, no commands sent): an offline
  machine on a 5-minute interval would otherwise fill the log.
- Counts are only known for a cycle that finished; a failed one records the
  commands sent so far and the token flag.
- The summary comes from the 100 rows the dialog reads.
