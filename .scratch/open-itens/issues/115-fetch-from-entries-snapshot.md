# 115: Tasks come from the entries snapshot, and the heading rule runs in TS

**Origin:** `tasks-view` Issue 12, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. On 2026-11-12 its Issue numbers were translated to open-itens numbers and its blockers re-pointed after the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D1).

**What to build:** Source rules need note fields (type, tags, lifecycle, frontmatter) that `get_all_tasks_v2` does not carry (`task.rs:151-166`). The memoized entries snapshot already does (`src/lib/core/vault/vault-entries.service.ts:36`, `NoteEntry.ts:34-103`), shared with QueryJS. Move the view onto it and run the section tag as a TS heading rule over Issue 074's headings. The Rust command `get_tasks_in_section_v2` stops being called here and is removed in Issue 121.

**Fetch and rows**
- `buildTaskIndex` (`tasks.service.ts:63-84`) reads `getVaultEntries()`. `buildTaskRows(entries, vaultPath, overlay)` in `task-query.logic.ts` fills every `TaskRow` field (PRD "Task model"), with `headings` as the ancestor texts from `taskHeadings` and `Task.heading`. Keep the request-sequence guard (`:53-84`) and `resetTasks` (`:203-207`).
- Delete `fromV2` (`:18-46`) and the hand-written `FileTaskGroup` and `TaskItem` (`tasks.types.ts:3-29`) once nothing uses them. Trace every caller first (CLAUDE.md "Removing or Refactoring Code"). Removing the hand-written `FileTaskGroup` also removes its entry from the `ALLOWLIST` in `src/tests/lib/architecture/ipc-mirrors.test.ts:24-27`.

**Heading rule in TS (decision B6)**
- `matchesHeading(headings, tag, 'tag')`: the tag (a leading `#` added if missing, as `parsing.rs:1709-1713` does) appears as a whole tag token, case-insensitive, in any ancestor heading. `'substring'` keeps today's contains match, case-insensitive.
- The section tag textbox and the rule sentence (Issue 108) use it. The default section tag is empty since Issue 108.
- Update `help/documentation/10-tasks-and-todoist.md:97-103` with the three behavior changes pinned below.

**Freshness after the view's own writes** (PRD section of that name)
- The memo is only as fresh as the last version bump, throttled to 2 s, up to 10 s in a burst (`src/lib/app/tauri-listeners.service.ts:106`, indexing rule 12). The direct refetch in `afterTaskWrite` (Issue 114) would return the same stale snapshot.
- `toggleTask` and `updateTask` call `vaultStore.requestPromptIndexRefresh()` (`vault.store.svelte.ts:114`) right before `call('toggle_task_status' | 'update_task_lines')`, as `lifecycle.service.ts:34` does. Not in `afterTaskWrite`: it runs after the command returns, and the Rust command emits `vault-index-updated` during the call, so a flag set afterwards is consumed by a later, unrelated event. `afterTaskWrite` and records the written line's new text and status in an overlay keyed `filePath:lineNumber`. `buildTaskRows` applies the overlay. Each overlay entry stores the write's `updateResult.version`. It is dropped once `vaultStore.vaultIndexVersion` has reached that version, because the memo read at that version already includes the write (`bumpVaultIndexVersion` sets the Rust version, `vault.store.svelte.ts:108-111`).
- Toggle (Issue 021), the row status menu (Issue 241, when present) and row edits (Issue 122, when present) read `expectedText`/`expectedStatus` from the overlaid row.

**Keep what the earlier Tasks view Issues delivered.** This Issue rewrites the fetch path and the service tests that Issues 108, 234, 235 and 111 built on. Their behavior stays, and their tests stay green or move to the new path on purpose:
- the list stays mounted during a refetch, and "Indexing tasks..." shows only before the first list (108);
- note groups arrive in `filePath` order (234), whatever order the snapshot returns;
- a failed latest fetch sets the store's error and leaves the rows untouched; a success clears it; a superseded request touches neither (235);
- `buildTaskIndex` still fills `tasksStore.rows`, and `tasksStore.reset()` still clears every field the view added (rows, quick filters, scroll offset, error, current row, collapsed groups).

**Blocked by:** 239, 074

**Blocked by (origin):** 114 dropped (resolved 2026-11-09); 111 replaced by 239, the last Issue of the quick-filter split.

**Status:** ready-for-agent

**Answered:** PRD B6 (a) (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the view's fetch path changes (the e2e mock already serves `get_all_vault_entries_v2`, `e2e/mocks/tauri-core.ts:442`).

- [ ] Failing test first, `tasks.service.test.ts` with real `tasksStore` and `vaultStore`, mocking only `invoke`: `get_all_vault_entries_v2` keeps returning the pre-toggle snapshot; after a toggle the row shows `done` at once, and with fake timers the index refresh runs without advancing the 2 s throttle timer (asserting `takePromptIndexRefresh()` alone would pass wherever the call sits), and a second click within the same snapshot sends `expectedStatus: 'done'`, `target: 'todo'` and is not refused.
- [ ] The overlay entry is dropped once `vaultIndexVersion` reaches the write's version, and the row then reads from the snapshot.
- [ ] Parity for the heading rule, `task-query.logic.test.ts`, pinning the three intended differences from today's scan: `#To-List` now matches; `#to-listing` no longer matches; under `## A #to-list` / `### B #to-list` / `### C`, the `### C` tasks are now kept. A deeper sub-heading without the tag stays included, as today.
- [ ] `buildTaskRows` test: note fields come from the entry (type, tags, archived, frontmatter, relPath, folder).
- [ ] The `get_tasks_in_section_v2` / `get_all_tasks_v2` cases in `tasks.service.test.ts` (`:56-192`, including `:90`, `:183`, `:192`) and the refetch check in `task-toggle-dirty-buffer.test.ts:133` are rewritten to the new path, on purpose.
- [ ] No `src/lib` code calls `get_tasks_in_section_v2` any more (Issue 121 removes it).
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M. The overlay must ship with the fetch move, or the row lags up to 10 s after the view's own writes.
