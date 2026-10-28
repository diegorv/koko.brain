# 16: Trash restore indexes the restored note through applyNoteChange

**What to build:** restoring a Markdown note from the Trash re-indexes it right away through the single note-change owner instead of waiting for the watcher. `applyNoteChange` gains a documented `restore` source whose policy row fires the Rust `update_note_in_index` IPC (the delete already removed the note from Rust through `forgetNote`, and no `create_note` runs on restore, unlike `create` / `fs`) and the registered per-file consumers. `restoreItem` calls it after the rename back with the restored bytes and the vault path, so the FTS5 and semantic legs run too. The Trash panel (`TrashSection.svelte:26`) and, later, the calendar's Undo (which calls `restoreItem` and nothing else) both see the restored note in every `vaultIndexVersion` panel without lag. Directory restores keep relying on the watcher.

**Plan reference:** Task 15 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 359-378). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. Checklist answers are in Notes C4 (lines 988-997) and the decision in D20 (lines 900-902); the "five sources" wording in CLAUDE.md, ADR-0009 and the architecture map is updated by tickets 34 and 35, not here.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/filesystem/note-change.service.ts` (modify)
- `src/lib/core/trash/trash.service.ts` (modify)
- `src/tests/lib/core/filesystem/note-change.service.test.ts` (modify)
- `src/tests/lib/core/trash/trash.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, then `bash scripts/e2e.sh e2e/specs/file-operations.spec.ts e2e/specs/settings.spec.ts`

- [x] `NoteChangeSource` includes `'restore'`, its docblock list carries "`restore` - Trash restore, after the rename back", and `SOURCE_POLICY` has the row `restore: { consumers: 'always', rust: 'always', mark: true, yieldBeforeConsumers: false }`
- [x] `restoreItem`, after the rename and manifest update and only for a non-directory Markdown item, runs `readTextFile(restorePath)`, `markRecentSave(restorePath)`, then `void applyNoteChange({ kind: 'upsert', source: 'restore', path: restorePath, content, vaultPath })`
- [x] A read failure is logged with `error('Trash', ...)`, sets no recent-save mark (so the watcher indexes the file as it does today), and the restore still returns its path
- [x] A directory restore indexes nothing and keeps the watcher path
- [x] `note-change.service.test.ts`: the per-source policy table gains the `restore` row
- [x] `trash.service.test.ts` (with the `@tauri-apps/api/core` mock added): a `.md` restore invokes `update_note_in_index` and `update_search_index_file` (vault-relative key) with the restored bytes, and a consumer registered through the real `registerNoteChangeConsumer` receives the upsert
- [x] `trash.service.test.ts`: a suffixed restore path is indexed under the suffixed path; a directory restore indexes nothing; a read failure still returns the path and removes the trash item
- [x] The "restore indexes the note" test is written first and fails on the current tree (Notes C4 Q5); the unit test is the proof, since the E2E mock syncs its index through virtualFS hooks and no spec can observe the gap
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:15 — discovery — plan in work/16/discovery.md: restore policy row + restoreItem read/mark/applyNoteChange for non-directory Markdown items — 2f7f46b6
- 2026-10-28 12:17 — implement — restore source + restoreItem indexing, tests written first (2 red, then green); pnpm check 0 errors, trash + filesystem + app-lifecycle + kanban tests 619 passed; gate and E2E left to deliver — ed698ef0
