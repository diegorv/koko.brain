# Issue 15 discovery: retire the old send/sync path, document the two-way sync

## Callers of the old path (traced on `19418a1c0`)
- `features/tasks/todoist.service.ts` (fetch/send/`getTask` polling, `todoist-sent.json` read+write): imported only by `TasksView.svelte:18` (`initTodoist` on mount, `syncTodoistTasks` from the toolbar button) and `TodoistPopover.svelte:8`.
- `features/tasks/todoist.store.svelte.ts`: `TasksView.svelte:14` (Sync button spinner, `isSent`/`isCompletedInTodoist`/`getTodoistUrl` badges `:269-294`), `TodoistPopover.svelte:7`, `app/lifecycle/app-lifecycle.service.ts:71,674` (`todoistStore.reset()` in teardown; it resets only this store, `todoistSyncStore.reset()` on the next line stays).
- `todoist-bridge.logic.ts`, `todoist.types.ts`: only the service, the store and the popover.
- `TodoistPopover.svelte`: only `TasksView.svelte:26,293`.
- `syncOwnsTaskLine` + `LineOwnerContext` (`todoist-sync/create.logic.ts:401-424`): only `TasksView.svelte:85-95`, to hide the popover; orphaned by the removal, so removed with its test block. That also drops TasksView's imports of `isInSyncScope`, `collectionStore`, `settingsStore` (feature pairs `tasks -> todoist-sync` and `tasks -> collection` leave `feature-cycle-baseline.json`, which the test rewrites itself; `featureCycleEdges` is untouched).
- Tests: `tests/lib/features/tasks/todoist.{service,store}.test.ts`, `todoist-bridge.logic.test.ts` deleted; `app-lifecycle.service.test.ts:292,1169-1175`; `TasksView.test.ts:193-269`; `raw-write-ratchet.test.ts:44`.
- No E2E spec, Rust code or IPC touches the old path. `todoist-client.ts`, `priority.logic.ts`, `tauri-fetch-adapter.ts` stay (the sync uses them).

## Plan (one commit each)
1. TasksView test first: with a token, no "Send to Todoist" trigger, no toolbar Sync button, no Todoist badge link, and `todoist-sent.json` never read. Then delete the five old files and their tests, the popover/Sync/badge markup, the lifecycle reset, the ratchet line, `syncOwnsTaskLine`.
2. Settings > Todoist: the default label row's description and `TodoistSettings.defaultLabel` JSDoc say what it does now (kept out of tag mapping, never removed by a push; design rule 8). Token and sync rows unchanged.
3. Help: `10-tasks-and-todoist.md` Todoist part rewritten (every topic the criterion lists); `19-settings.md` Todoist table lists every row; `01-getting-started.md:137` says `todoist-sent.json` is no longer read.
4. ADR-0037 "Todoist two-way sync" + README index row.
5. `.scratch/open-itens/issues/`: delete 072, 073, 127, 128, 130 in one closing commit; rewrite 129 (linked / frozen / error states), Blocked by `111, 113`; drop 031's Todoist half.

## Defaults taken
- 073 is closed, not rewritten: every bullet is popover work, and its recurring `{date, string}` rule already ships in brain-side creation (Issue 10). The `deadline` aside is no ticket.
- 129's states come from `todoist_task_link` (`todoist_read_links`): linked (attached), frozen, detached, pending, plus the last terminal command error in the sync log; the filter part is kept.
- `.scratch/open-itens/ledger.md` is relay-written ("never edit it by hand"): not touched; the main session drops rows 072, 073, 127, 128, 130 and updates 129's blockers.

## Risks
- Other open tickets still name the removed code in their text (not Blocked by): 071 (`todoist-sent.json` section), 113 (Todoist trigger, `tasks:sync-todoist` command), 205 (`TodoistPopover` raw error). Left for triage; listed in the report.
- Gate: frontend (`pnpm check`, targeted vitest) plus `src/tests/help/`.
