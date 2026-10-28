VERDICT: CHANGES_REQUESTED

# Review: Issue 16, Trash restore indexes the restored note through applyNoteChange

Reviewed `git diff main...HEAD` (f8b37a48, ed698ef0, 4c7d2be2) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (192 files).
- `vitest run src/tests/lib/core/trash/ src/tests/lib/core/filesystem/note-change.service.test.ts`: 4 files, 92/92 tests passed, but **vitest reports `Errors 6 errors` and exits 1** (6 unhandled rejections, see finding 1).
- `vitest run src/tests/lib/core/filesystem/ src/tests/lib/core/app-lifecycle/ src/tests/lib/core/editor/ src/tests/lib/plugins/kanban/kanban.logic.test.ts`: 19 files, 788/788 passed, exit 0.
- Red probe: put main's `trash.service.ts` back in the worktree, ran `trash.service.test.ts`: "indexes a restored .md note through applyNoteChange" and "indexes a suffixed restore under the suffixed path" fail (2 failed, 29 passed), then restored HEAD's file (`git status` clean).
- Static import-cycle probe from `core/editor/editor.hooks.ts`: no static path leads back to `trash.service.ts`, so the new `editor.hooks` import adds no cycle.

The test verdict rests on `src/tests/lib/core/trash/trash.service.test.ts` and `src/tests/lib/core/filesystem/note-change.service.test.ts`, plus the related directories listed above.

## Acceptance criteria

- [x] **Met.** `NoteChangeSource` includes `'restore'`, the docblock has the exact line, and the `SOURCE_POLICY` row matches: `note-change.service.ts:15`, `:17`, `:94`.
- [x] **Met.** `restoreItem` makes the call after the rename (`trash.service.ts:121`) and after the manifest and store update (`:132-138`). It runs only when `!item.isDirectory && isMarkdownPath(restorePath)` (`:142`). The order is `readTextFile`, then `markRecentSave`, then `void applyNoteChange({ kind: 'upsert', source: 'restore', path, content, vaultPath })` (`:213-223`).
- [x] **Met, with one gap.** On a read failure, `error('Trash', ...)` is called, no mark is set, and the path is still returned (`trash.service.ts:215-220`). The test at `trash.service.test.ts:416-431` covers the path, the trash item removal, the absent mark and the absent invokes. It does not assert the log (finding 3).
- [x] **Met.** A directory restore indexes nothing: `trash.service.ts:142`, tested at `trash.service.test.ts:392-404`.
- [x] **Met.** The policy table has `['restore', true, true]` (`note-change.service.test.ts:86`).
- [x] **Met.** The `.md` restore test asserts `update_note_in_index` with the restored bytes, `update_search_index_file` with the vault-relative key `notes/meeting.md`, and a consumer registered through the real `registerNoteChangeConsumer` (`trash.service.test.ts:358-374`). The `@tauri-apps/api/core` mock is at `:3-5`.
- [x] **Met.** The suffixed path, directory and read-failure cases exist (`trash.service.test.ts:376-390`, `:392-404`, `:416-431`).
- [x] **Met** (verified by the reviewer's red probe). The test was written first and fails on the old tree. Two tests fail against main's `trash.service.ts`.
- [ ] **Not met yet.** Gate green. The tests in this diff make `pnpm vitest run` exit 1 (finding 1), so the gate fails as the branch stands. The gate itself is the deliver step's job.

PRD/plan decisions: the change follows D20 (a documented `restore` source, no `notifyAfterSave`, no watcher-only path) and the Task 15 spec. Scope is limited to the 4 files the Issue lists, plus the scratch notes. The layer rules hold: `trash.service` is in `core/` and imports `core/filesystem` and `core/editor`. JSDoc is present on the new helpers.

## Findings

1. **High (gate-breaking).** `src/tests/lib/core/trash/trash.service.test.ts:3-5` and `:220-229`. The new `invoke` mock is a bare `vi.fn()`, which returns `undefined`. The pre-existing `describe('restoreItem')` block (`:220-322`) restores `.md` files without stubbing `invoke` or `readTextFile`, so `restoreItem` now reaches `applyNoteChange`. There, `invoke('update_note_in_index', ...).catch` throws `TypeError: Cannot read properties of undefined (reading 'catch')` (`note-change.service.ts:190`). Because the call is `void`, the error becomes an unhandled rejection. Vitest reports 6 of them, from the tests at `:231`, `:245` and the following cases, and exits 1 even though all 92 tests pass. The full `pnpm vitest run` gate therefore fails. The build report's "92/92 passed" missed the `Errors 6 errors` line.
   - **Fix:** give the mock a resolving default that survives `vi.clearAllMocks()`: `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve(undefined)) }))`. Alternatively, add `vi.mocked(invoke).mockResolvedValue(undefined)` and `mockReadTextFile.mockResolvedValue('')` to the `restoreItem` block's `beforeEach` (`:221-229`).
   - **Verify:** re-run `vitest run src/tests/lib/core/trash/trash.service.test.ts` and confirm exit 0 and no "Unhandled" section.

2. **Medium (behavior regression from the new recent-save mark).** `src/lib/core/trash/trash.service.ts:221`. Before this change, the watcher indexed a restored note. Its incremental path ends with `backlinksStore.markUnlinkedDirty()`, `invalidateQueryjsCache()` and `clearLinkedContentCache()` (`watcher-handler.service.ts:123-125`). `markRecentSave(restorePath)` now makes the watcher skip the event: the rename's other path is under `.kokobrain/`, which is filtered in Rust, so `areAllRecentSaves(filePaths)` is true (`watcher-handler.service.ts:46`). `applyNoteChange` does none of those three things (`note-change.service.ts:148-219`). After a Trash restore, two caches stay stale until something else clears them: a cached queryjs result (for example a `kb.pages()` list, held in `queryjsSessionStore`) and kanban linked-card content. Both previously dropped the note through the delete's watcher pass. Unlinked mentions also stop being flagged dirty. Notes C4 lists the writes the change adds but not the watcher side effects it suppresses. This is the "trace the replacement" trap from CLAUDE.md.
   - **Fix:** keep the mark, as the AC requires. After `applyNoteChange` in `indexRestoredNote`, run the watcher's three post-update calls. Add tests that assert `backlinksStore.unlinkedDirty` is true and the queryjs session results are cleared after a `.md` restore, and are untouched after a read failure.
   - **If** the fixer judges the new `core/trash` to `features/backlinks` / `plugins/kanban` edge unacceptable under ADR-0003, file a follow-up Issue and note it in this Issue's Comments. `editor.hooks.ts:1-3` and `watcher-handler.service.ts:9-11` already carry the same edges. Do not leave the gap silently.

3. **Low (test gap).** `src/tests/lib/core/trash/trash.service.test.ts:416-431`. AC 3 says the read failure "is logged with `error('Trash', ...)`", but no test checks the log.
   - **Fix:** spy on or mock `$lib/utils/debug`'s `error` and assert it was called with `'Trash'` and a message about the read, next to the existing state assertions.
