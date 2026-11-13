# 244 discovery: Tasks from the entries snapshot, with a write overlay

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. 115 (heading rule, `task-headings.logic.ts`) and 243 (saved tags) have landed, so 243's tests must stay green.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts:178-209` `buildTaskRows(groups, vaultPath)` becomes `buildTaskRows(entries, vaultPath, sectionTags, overlay)`; `TaskRow` (:14-33) gains `noteType`, `noteTags`, `archived`, `organized`, `favorite`, `properties`, `headings`; new `TaskOverlayEntry` / `TaskOverlay` types.
- `src/lib/features/tasks/tasks.service.ts:94-123` `buildTaskIndex` reads `vaultStore.vaultIndexVersion` + `getVaultEntries()` synchronously, drops overlay entries at or below that version, sets rows. `fromV2` (:25) stays unreferenced (Issue 121). `setTaskStatus` (:193-238): `requestPromptIndexRefresh()` right before `call('toggle_task_status')`, `takePromptIndexRefresh()` on throw / stale / unchanged; stale and "line moved" refusals call `invalidateVaultEntries()` and delete the overlay key before `buildTaskIndex()`. `afterTaskWrite` (:291) takes the written line and records the overlay. `resetTasks` (:343) clears the overlay.
- Comments: `tasks.service.ts` doc comments, `tasks.logic.ts:8-24` (header + `parseSectionTags` JSDoc, which says the tags go to `get_tasks_in_section_v2` and match case-sensitively), `event-calendar.service.ts:106`, `app-lifecycle.service.ts:417-419`, `vault.store.svelte.ts:38-41`, `tauri-listeners.service.ts:296-297`, `docs/agents/indexing-watcher-rules.md` rules 2 and 12.
- `help/documentation/10-tasks-and-todoist.md:111` Section filter row.
- `e2e/specs/tasks-view.spec.ts`: the four `fs.writeFile` tests (:34, :177, :206, :231) get `{ timeout: 12_000 }` on their first Tasks assertion.

## Tests
- `src/tests/fixtures/tasks.fixture.ts` `mockTaskFetch`: answers `get_all_vault_entries_v2` with each group as `entryV2(...)` plus `opts.entries`; calls `invalidateVaultEntries()` on install. Export the group-to-entry helper for logic tests.
- `tasks.service.test.ts`: re-point every `get_all_tasks_v2` / `get_tasks_in_section_v2` / `fileTaskGroups` case to entries and `tasksStore.rows`; drop the local `group()`; the new failing-first overlay test with a fake Rust over a fake disk (copy `task-toggle-dirty-buffer.test.ts:11-32`); prompt-flag, drop-rule, refusal and reset-overlay cases.
- `task-toggle-dirty-buffer.test.ts`: fake answers `get_all_vault_entries_v2` from the fake disk; flag probe inside `writeTextFile`; "line moved" asserts the fresh row.
- `task-query.logic.test.ts`, `tasks.store.test.ts`: `buildTaskRows` input becomes entries; new note-field, sort, no-mutation, heading-filter and overlay cases.
- Component tests (`TasksView*.test.ts`, `tasks-view-settings.test.ts`): move with `mockTaskFetch`; `opts.section` becomes entries with headings; tests that expected a second IPC at the same version call `invalidateVaultEntries()` (or bump the version) first. Service-writing `beforeEach` use `resetTasks()`.

## Plan (commits)
1. discovery.md.
2. Logic: `buildTaskRows` over entries + overlay types, with `task-query.logic.test.ts` / `tasks.store.test.ts`.
3. Service fetch move + overlay + prompt flag, `mockTaskFetch`, service and dirty-buffer tests, component tests re-pointed (one commit, so the suite stays green).
4. Comments, rules doc, help doc, e2e timeouts.

## Risks / defaults taken
- `vaultIndexVersion` is never rewound in a test file: tests that bump it restore it in `afterEach` so later overlay entries (version 1-2) are not dropped.
- Row TaskItem fields are copied explicitly (not `...task`) so `heading` (the index) does not leak into rows.
- Overlay `text` replaces the row text; `metadata` stays the snapshot's (status writes keep the text).
- `mockTaskFetch` serves groups first, then `opts.entries`.
