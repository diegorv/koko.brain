# 121 discovery: remove `get_tasks_in_section_v2`

Trace (Issue's two greps, at d78a708f6): no `src/lib` code calls the command
(only `commands.ts` declares it); `fileTaskGroups`/`setFileTaskGroups` are read
only in `tasks.store.svelte.ts` and `tasks.store.test.ts`; `tasks.service.ts::fromV2`
has no caller. Safe to delete.

## Files
- `src-tauri/src/commands/vault.rs:7,11,665-763`: `SectionTaskCandidate`, `section_task_candidates`, `tasks_in_section`, `get_tasks_in_section_v2`; imports `extract_tasks_from_sections`, `display_name` (only user is `tasks_in_section`). `NoteEntry` stays (used by `collect_v2_entries`).
- `src-tauri/src/lib.rs:353`: handler entry.
- `src-tauri/src/vault/parsing.rs:1430` comment, `:1462` `HEADING_RE` doc, `:1766-1846` both extractors + `SectionMatch`, `:3153-3240` inline tests (`NESTED_SECTIONS`, `tags`).
- `src-tauri/tests/commands/vault_test.rs:4,7,8,1108-1229`: `index_note` + 5 `tasks_in_section_*` tests (end of file); imports `section_task_candidates`, `tasks_in_section`, `extract_tasks_from_section`, `FileTaskGroup`.
- `src-tauri/tests/vault_task_test.rs:3` module doc.
- `src-tauri/src/vault/task.rs:3-4,171` docs -> regenerate `src/lib/contracts/generated/FileTaskGroup.ts`.
- `src/lib/contracts/commands.ts:106-107,288`.
- `src/tests/lib/contracts/ipc.test.ts:91-92` -> `toggle_task_status` case.
- `e2e/mocks/tauri-core.ts:163-165,497`; `e2e/mocks/vault-index.ts:532-570`; delete `src/tests/e2e/vault-index-tasks.test.ts`.
- `src/lib/features/tasks/tasks.service.ts:16-55` `fromV2` + `FileTaskGroup`/`FileTaskGroupV2` imports (`TaskItem` stays).
- `src/lib/features/tasks/tasks.types.ts:19-29` `FileTaskGroup`.
- `src/lib/features/tasks/tasks.store.svelte.ts:19,22,88,114,150`; `src/tests/lib/features/tasks/tasks.store.test.ts:26,36-40,436,449`.
- `src/tests/lib/architecture/ipc-mirrors.test.ts:24-27,63-68,99-106`.
- `docs/agents/indexing-watcher-rules.md:3` rule 1.

## Plan (commits)
1. Red/green parity: drop `commands.ts` entries, run `ipc-parity.test.ts` (red), drop `lib.rs` entry (green); also swap the `ipc.test.ts` case, the e2e mock handler + `getTasksInSection` + its vitest file, so `pnpm check` holds.
2. Rust: remove command, helpers, extractors, their tests, imports; reword docs; regenerate binding.
3. Frontend leftovers: `fromV2`, TS `FileTaskGroup`, store field, store tests, `ipc-mirrors` allowlist rewrite.
4. Docs rule 1.

## Risks / defaults
- `parsing.rs` Phase 7 banner says Rust is "the sole implementation of ... section scoping": reword to drop section scoping too (the rule now lives in TS), since it would be false.
- `generated/Task.ts` says "Mirrors `tasks.types.ts::TaskItem`": `TaskItem` stays, left alone.
- Gate: cargo test, clippy, `pnpm check`, targeted vitest files, `e2e/specs/tasks-view.spec.ts`.
