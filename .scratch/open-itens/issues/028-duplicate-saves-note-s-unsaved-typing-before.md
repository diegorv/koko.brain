# 028: Duplicate saves the note's unsaved typing before copying it

**Origin:** `audit-2026-11-05` Issue 112, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** duplicateItem (src/lib/core/filesystem/fs.service.ts:345-365) copies the on-disk file with copyFile (:357) and never saves a dirty tab at that path, so the copy holds the last saved bytes and lacks the latest typing. deleteItem, by contrast, goes through applyPathChange, which saves dirty tabs under the path first (saveDirtyTabsUnder, src/lib/core/filesystem/path-change.service.ts:65-72, called at :168 on a delete). Fix: export saveDirtyTabsUnder and await it as the first statement in duplicateItem's `try`. When that save fails, copy nothing and let the PreDeleteSaveError it throws propagate: the editor already toasted the failed save, and NoteRowMenu.runOrToast (src/lib/features/note-list/NoteRowMenu.svelte:67-75) already skips that error type.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** no owner question; the 2026-11-12 deep dive changed only the tests and pointers.

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`, plus the targeted e2e check `bash scripts/e2e.sh e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts` (core/filesystem change per docs/TESTING.md; rail-shell.spec.ts:232 runs Duplicate from the row menu). Relay-lite runs no e2e, so the build step runs it and reports the result.

- [ ] Failing test first, in a new file src/tests/lib/core/filesystem/duplicate-dirty-tab.test.ts modeled on f165-delete-dirty-tab.test.ts: real stores and real editor, fs and path-change services; mock only the Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`, `svelte-sonner`) over an in-memory `disk` map, with `copyFile(from, to)` doing `disk.set(to, disk.get(from))` and `readDir` returning the parent's entries from `disk`. With `disk['/vault/a.md'] = 'old'` and `editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: 'new', savedContent: 'old' })`, `await duplicateItem('/vault/a.md', false)` returns `'/vault/a copy.md'`, `disk.get('/vault/a copy.md')` is `'new'`, `disk.get('/vault/a.md')` is `'new'` and the tab is clean. It fails today: the copy holds `'old'`.
- [ ] With `writeTextFile` failing, `duplicateItem('/vault/a.md', false)` rejects with `PreDeleteSaveError` (reused, not a new type), `copyFile` is not called, no `/vault/a copy.md` exists in `disk`, the tab is still dirty, and `toast.error` was called exactly once, with `'Failed to save file.'`. Update the doc comments of saveDirtyTabsUnder (path-change.service.ts:61-64) and PreDeleteSaveError (src/lib/core/filesystem/fs.logic.ts:155-158) to say duplicate throws it too. Leave the message text (fs.logic.ts:165, asserted at fs.logic.test.ts:436) unchanged: it reaches only the log and Sentry.
- [ ] Guard (passes today), in the same new file: a clean tab and a note with no tab are copied with no `writeTextFile` call, and the copy equals the disk bytes.
- [ ] The folder branch (no UI caller today: NoteRowMenu.svelte:78 passes `false`) saves a dirty tab at `/vault/dir/x.md` before copying: the copied `x.md` holds the new text.
- [ ] Guard (passes today), in src/tests/lib/features/note-list/NoteRowMenu.test.ts beside the duplicate cases at :366-377: duplicateItem rejecting with PreDeleteSaveError shows no toast, as the delete case at :459 does.
- [ ] Frontend gate: pnpm check and pnpm vitest run.

## Notes

- **Priority:** corner case (bucket 4-corner). Upheld ux/low. Only the copy is stale, and only within the autosave debounce.
- **Trigger:** Type in an open note, then within the autosave debounce (2 s after the last body keystroke, 500 ms after a frontmatter edit; editor.service.ts:227 and :230), or while autosave is failing, right-click its row in the note list and choose Duplicate.
- **Evidence (verified by reading code at `5f8003d67`, re-checked at `3ab6de999`):** src/lib/features/note-list/NoteRowMenu.svelte:77-79 handleDuplicate -> duplicateItem(note.path, false) (the only caller, rg) -> src/lib/core/filesystem/fs.service.ts:354-358 copyDirectoryRecursive / copyFile with no save -> src/lib/core/editor/editor.service.ts:227 debouncedSave holds unsaved text only in editorStore -> contrast src/lib/core/filesystem/path-change.service.ts:65-72 saveDirtyTabsUnder and :168 on delete.
- **Why a new test file:** src/tests/lib/core/filesystem/fs.service.test.ts:32-37 mocks editor.service for the whole file (`saveFileByPath: vi.fn(async () => true)`), so the saved text cannot be observed there, and unmocking it would break the delete tests that rely on the `closeTabsForDeletedPath` mock. The f165 test's `copyFile` mock (:42) has no body, so the new file needs one that copies.
- **Side effects:** the save goes through saveFileByPath -> writeTab -> notifyAfterSave (editor.service.ts:171-201), the normal save path, so the original note is indexed as on any autosave (docs/agents/indexing-watcher-rules.md rule 6). The import between fs.service.ts and path-change.service.ts already exists in both directions and is call-time only. No test mocks path-change.service, so no mock factory misses the new export.
- **Known limit:** a canvas edit made within 300 ms of Duplicate is still missed, because CanvasInner persists into its tab only after its timer (CanvasInner.svelte:236-239). Negligible.
- **Series:** edits fs.service.ts and path-change.service.ts, not editor.service.ts, so it may run beside 004 or 015. 043 is blocked by 028 and 029 shares duplicateItem: keep those after it, one at a time.
- **Related Issues before the audit:** `.scratch/archived/file-io-audit/issues/19-duplicate-case-insensitive-overwrite.md`
- **Second opinion:** upheld (ux, low). duplicateItem (fs.service.ts:345-365) copies the file on disk with copyFile and never saves a dirty tab first. The copy therefore lacks the last <2 s of typing. The original note is still saved by autosave, so no written text is lost; the copy is just stale. That makes it ux rather than content. Corrections to apply while implementing: Category content -> ux: the original is not lost or overwritten, and only the new copy is stale.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-07` (from file-io-content-2, file-io-ux-5). Size S.

## Comments

- 2026-11-12: deep dive (refute-028, cross-tests-relay M2). Criterion 1 moved to a new disk-backed test file, because fs.service.test.ts mocks the editor and cannot see the saved text. Criterion 2 now names PreDeleteSaveError, the exported saveDirtyTabsUnder and the two doc comments to update. Criteria 3 and 4 are concrete, the clean-tab case is marked as a guard, and a row-menu guard was added. Line references refreshed, the targeted e2e specs named in the Gate, and 028 is noted as the first of the 028 -> 043 series.
