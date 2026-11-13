VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first (fake `/sync`, real stores, the real log IPC through the fake vault). — `sync-now.service.test.ts` "syncNow: every cycle leaves a record" and `sync-scheduler.service.test.ts` "the cycle row names its trigger" run against `FakeTodoist` (`server`), the real `todoistSyncStore` / `settingsStore` / `vaultStore`, and `todoist_append_log` / `todoist_read_log` through `createFakeVault`, which now honours `replaceId` like Rust (`src/tests/fixtures/todoist-vault.fake.ts:162-170`). Test-first order cannot be read from the commits (tests ship in the same commits as the code); the tests exist and would fail without the code.
- [met] Every cycle that starts (manual, interval, focus, after-save, vault open) appends one row of a new kind `cycle`, also when it fails or is cancelled. Its message holds: mode and trigger, start time and duration in ms, the counts (notes created, tasks inserted, lines updated, Todoist updated, created, detached, skipped by each cap), commands sent by type, whether the `sync_token` advanced, and the outcome (ok, the failure kind, or cancelled). A cycle refused before it starts (sync off, index not ready, a run already going) writes nothing. — `syncNow` writes the row via `logCycle` on ok (`sync-now.service.ts:252`), on failure and cancel (`:267-271`), none on refusals (all returns precede `todoistSyncStore.start()` at `:243`) or vault switch. `CycleRun` carries mode, trigger, startedAt, durationMs, outcome, counts (PullCounts + detached), skipped per cap, commands by type (`tracedClient` `:291-302`), tokenAdvanced (`:577`). Triggers threaded through `requestAutoCycle`, `dueTimer` and `followUp` (`sync-scheduler.service.ts:177-221`). Tests: ok, failure (`invalid-token`), cancel, refusals + vault switch write nothing, and all five triggers including deferred/queued.
- [met] Each command batch sent to Todoist goes to `debug('TODOIST', …)` with the command types, anchors and uuids, and each response with its `sync_status` per uuid. Each pull logs its kind (full or incremental) and item count. Task content, descriptions and note text never go into these lines or the `cycle` row (note paths, anchors and Todoist ids are fine). — `sendCommands` logs `send N commands: <type> <ref> <uuid>` before each batch and `sync_status: <uuid> <status>` after (`sync-now.service.ts:998-1014`); refs are anchors, note paths or project ids. `tracedClient` logs `pull full|incremental: N items`. Tests pin both line shapes and assert "Call Bob secretly" and the fixture task texts appear in no debug line and no cycle row.
- [met] Automatic cycles must not push events out of the 1000-row log: a run of automatic cycles that changed nothing writes one `cycle` row and then updates that row's count and time (or keeps the newest only) instead of a new row each time. A test pins it. — `cycleLogEntry` folds a quiet auto cycle into the newest row (`cycle-log.logic.ts:93-98`) via `replace_id`, honoured in Rust only while that row is newest (`todoist_repo.rs:223-234`). Pinned by "keeps one row for a run of automatic cycles that changed nothing" (repeats 4), the fold-over-event test, `logCycle` tests, and Rust `log_replace_id_rewrites_the_newest_row_in_place` / `log_replace_id_of_an_older_row_appends_instead`. See finding 2 for a case it does not cover.
- [met] The sync log dialog gets a simple filter: All, Cycles, Events. The dialog shows the newest `cycle` row's summary at the top. — `TodoistSyncLogDialog.svelte` adds the three buttons (`aria-pressed`), `filterLogEntries`, and the `data-sync-log-latest-cycle` line; cycle rows render `formatCycleSummary`. `TodoistSyncLogDialog.test.ts` "cycle rows" covers summary text, filter switching, empty filter result and no summary without a cycle row.
- [met] `help/documentation/10-tasks-and-todoist.md` gets a short "Troubleshooting the sync" part: the log dialog, what a `cycle` row means, and turning on Settings > Troubleshooting "Save debug log to file" for command traces. (Issue 15 rewrites the rest of that page.) — New `### Troubleshooting the sync` subsection covers all three. One sentence is inaccurate (finding 1).
- [met] Gate: frontend, or Both if the log table or IPC changes. — IPC DTO changed (`TodoistSyncLogInput.replace_id`), so Both. I ran `pnpm check` (0 errors, 0 warnings), the targeted vitest files (15 files, 331 tests passed), `cargo test --test todoist_state_test` (17 passed) and `cargo test --lib export_bindings` (49 passed, worktree clean afterwards, so the committed binding is fresh). The full vitest and cargo suites are deliver's to run.

## Findings

1. minor — `help/documentation/10-tasks-and-todoist.md:149`: "Neither the sync log nor these lines hold task text or note content" is false for the sync log's event rows: `create-skipped` (`create.logic.ts:180`) and `content-not-pushed` (`fields.logic.ts:355`) store the line text, and `conflict` rows store "Brain value". Fix: say "Neither the cycle rows nor these lines hold task text or note content."
2. minor — `src/lib/features/todoist-sync/cycle-log.logic.ts:95`: the fold only looks at the newest row, so an automatic cycle that changes nothing but logs a repeated event every cycle (a persistent `create-skipped` line, logged on each run by `create.logic.ts:173,180`, appended at `sync-now.service.ts:578` before `logCycle`) never folds: each interval writes event + cycle row, doubling how fast older events leave the 1000-row log compared with before this branch. The pinned scenario (no events) is met. Fix (optional, or a follow-up): fold when the newest *cycle* row is quiet and only events identical to those the previous cycle wrote follow it, or accept the limit and note it in the Issue.
3. nit — `src/lib/features/todoist-sync/cycle-log.logic.ts:28,37,41`: `CycleSkips.detaches`, `CycleRun.mode`, `CycleRun.trigger`, `CycleRun.durationMs` have no JSDoc; CLAUDE.md asks for JSDoc on every interface field. Fix: add one-line comments.

## Test verdict rests on

- `src/tests/lib/features/todoist-sync/cycle-log.logic.test.ts`
- `src/tests/lib/features/todoist-sync/sync-log.service.test.ts`
- `src/tests/lib/features/todoist-sync/sync-now.service.test.ts`
- `src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts`
- `src/tests/lib/features/todoist-sync/TodoistSyncLogDialog.test.ts`
- `src/tests/lib/app/commands.todoist.test.ts` (uses the changed fake vault)
- `src/tests/lib/architecture/` (layer rules; no baseline entry added)
- `src-tauri/tests/todoist_state_test.rs`, plus `cargo test --lib export_bindings` for binding freshness

## Scope

No scope creep: every changed file traces to a criterion. No layer-baseline entry, no BASELINE_SIZE change, no new composition root.

## Resolution

1. Fixed: the help page now says "Neither the cycle rows nor these lines hold task text or note content".
2. Accepted as a limit, not changed: the criterion's pinned case (automatic cycles that change nothing and log nothing) folds. A cycle that re-logs the same event each run still writes event + cycle row; folding across repeated events would need the fold to compare event rows across cycles, extra logic for a case the review marks optional. Noted in the Issue's comment.
3. Fixed: JSDoc on `CycleSkips.detaches`, `CycleRun.mode`, `CycleRun.trigger`, `CycleRun.durationMs`.
