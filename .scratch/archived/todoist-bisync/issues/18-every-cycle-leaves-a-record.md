# 18: Every sync cycle leaves a record you can read later

**What to build:** Today the sync log (`todoist_sync_log`, newest 1000 rows, "Todoist: Show sync log") keeps only unusual events: conflicts, detaches, skips, command errors, stale writes. A cycle that ran fine leaves no trace, the status bar result lives only in memory, and the per-cycle summary goes to a single `debug()` line that is off by default. So "what did the sync do at 3 am, and what did it send?" has no answer. After this ticket every cycle writes one summary row, each command batch is traceable, and the log dialog can show cycles apart from events.

**Blocked by:** 14

**Status:** resolved

- [x] Failing tests first (fake `/sync`, real stores, the real log IPC through the fake vault).
- [x] Every cycle that starts (manual, interval, focus, after-save, vault open) appends one row of a new kind `cycle`, also when it fails or is cancelled. Its message holds: mode and trigger, start time and duration in ms, the counts (notes created, tasks inserted, lines updated, Todoist updated, created, detached, skipped by each cap), commands sent by type, whether the `sync_token` advanced, and the outcome (ok, the failure kind, or cancelled). A cycle refused before it starts (sync off, index not ready, a run already going) writes nothing.
- [x] Each command batch sent to Todoist goes to `debug('TODOIST', …)` with the command types, anchors and uuids, and each response with its `sync_status` per uuid. Each pull logs its kind (full or incremental) and item count. Task content, descriptions and note text never go into these lines or the `cycle` row (note paths, anchors and Todoist ids are fine).
- [x] Automatic cycles must not push events out of the 1000-row log: a run of automatic cycles that changed nothing writes one `cycle` row and then updates that row's count and time (or keeps the newest only) instead of a new row each time. A test pins it.
- [x] The sync log dialog gets a simple filter: All, Cycles, Events. The dialog shows the newest `cycle` row's summary at the top.
- [x] `help/documentation/10-tasks-and-todoist.md` gets a short "Troubleshooting the sync" part: the log dialog, what a `cycle` row means, and turning on Settings > Troubleshooting "Save debug log to file" for command traces. (Issue 15 rewrites the rest of that page.)
- [x] Gate: frontend, or Both if the log table or IPC changes.

## Notes

- Size: S to M.
- Owner request (2026-11-10): enough persisted logs to debug the sync and look at its status. Owner is the only recipient of telemetry; note content stays out of logs anyway.

## Comments

- 2026-11-10, branch `issue/18-every-cycle-leaves-a-record`: every started sync cycle writes a `cycle` row (mode, trigger, timing, counts, commands by type, token advance, outcome); quiet automatic cycles fold into the newest row via `replace_id` (Rust honours it only for the newest row); command batches, `sync_status` and pull kind go to `debug('TODOIST', …)` without task text; the log dialog gets All / Cycles / Events and the latest cycle summary; help page gets "Troubleshooting the sync". Known limit: an automatic cycle that re-logs the same event each run (for example a persistent `create-skipped`) does not fold, so it writes an event row plus a cycle row every time. Tests: pnpm check 0 errors; full vitest 609 files, 14989 passed, 54 skipped, 1 todo; cargo test 1432 passed, bindings unchanged. Reviews: round 1 APPROVED (3 findings: help sentence and JSDoc fixed, fold limit accepted), round 2 APPROVED (1 nit: state the fold limit, done here).
