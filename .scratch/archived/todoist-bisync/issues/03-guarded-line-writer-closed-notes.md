# 03: Guarded writer for task lines in notes that are not open

**What to build:** A Rust write path, plus its TS wrapper, that replaces, inserts or removes task lines in a note that has no open tab, located by `🆔 td-…` anchor plus the expected current line, never by line number. A stale expectation writes nothing. Verifiable by Rust and TS tests. Design: `.scratch/todoist-bisync/research/design.md` rule 12.

**Blocked by:** 02

**Waits on:** `.scratch/open-itens` ticket 114 (Task writes reach search and the QueryJS cache), itself blocked by open-itens 021. Both are merged on main (021 `fc8741157`, 114 `108a60047`); this ticket reuses 114's after-task-write steps.

**Status:** resolved

- [x] Failing tests first: Rust unit tests for the pure content functions; TS tests with real stores, mocking only `invoke` and plugin-fs.
- [x] Rust command, all-or-nothing per file: a batch of `{anchor, expected_line, new_line}` replacements, `{after_heading | end, lines}` inserts and `{anchor, expected_line}` removals. Returns `stale` and writes nothing when an anchor is missing, appears twice, or its line differs; refuses an insert whose anchor already exists in the file. A move within one file is one call.
- [x] Takes a vault-relative path and the vault root the caller believes is open; refuses when the root differs from the open vault; joins and confines the path in Rust. Writes atomically, updates the index, emits `vault-index-updated` like the existing toggle command, returns the new content.
- [x] Missing note: created through `create_note` + `applyNoteChange({ source: 'create' })` so the explorer shows it, then inserted into.
- [x] Prefactor: the after-task-write steps that 114 put in `features/tasks/tasks.service.ts` move to a core module both features can call; the Tasks view keeps its refresh (through a note-change consumer or by calling the moved function). `features/todoist-sync` never imports `features/tasks`. Existing Tasks tests stay green.
- [x] TS wrapper: for a note with no open tab, call the command, then `markRecentSave` and the moved after-task-write steps (indexing rules R4-R6, R9); return the new content. A note with an open tab is rejected with a typed result (ticket 04 handles it).
- [x] Edit `.scratch/open-itens/issues/122-*.md`: its Rust command half is delivered here; 122 keeps the row menu and undo.
- [x] Gate: Both (`cargo test`, `pnpm check`, `pnpm vitest run`); commit regenerated bindings.

## Notes

- Size: M.

## Comments

- 2026-11-09, branch `issue/03-guarded-line-writer-closed-notes`: added the `write_task_lines` Rust command (all-or-nothing anchored replace/insert/remove, vault-root guard, atomic write, index update), the closed-note writer wrapper in `features/todoist-sync`, and moved the after-task-write steps to core. Review round 1 APPROVED with findings, fixed: shared-line anchor collision now stale, CRLF notes refuse edits, blank batch on a missing note no longer creates it, rule 2 lists `write_task_lines`. Round 2 APPROVED, no findings. Tests: full vitest exit 0 (587 files, 14307 passed, 54 skipped, 1 todo); cargo test exit 0 (1394 passed); pnpm check 0 errors.
