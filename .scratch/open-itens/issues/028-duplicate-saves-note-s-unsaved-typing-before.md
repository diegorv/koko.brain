# 028: Duplicate saves the note's unsaved typing before copying it

**Origin:** `audit-2026-11-05` Issue 112, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** duplicateItem (src/lib/core/filesystem/fs.service.ts:345-365) copies the on-disk file with copyFile (:357) and never saves a dirty tab at that path, so the copy holds the last saved bytes and lacks the latest typing. deleteItem, by contrast, goes through applyPathChange, which saves dirty tabs under the path first (src/lib/core/filesystem/path-change.service.ts:55-62, :156). Fix direction: save dirty tabs at or under itemPath before the copy, reusing the same helper; when that save fails, copy nothing (the editor already toasted the failed save, as with PreDeleteSaveError, which NoteRowMenu.runOrToast already ignores).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/filesystem/fs.service.test.ts: with a real editorStore tab at /vault/a.md whose content 'new' differs from savedContent 'old', await duplicateItem('/vault/a.md', false); assert the save of /vault/a.md with 'new' happened before copyFile was called. It fails today.
- [ ] A failed save leaves no copy on disk and duplicateItem rejects with the save error type the row menu does not toast twice.
- [ ] A clean tab or a note that is not open is copied without any save.
- [ ] The folder branch saves dirty tabs under the folder before copying.
- [ ] Frontend gate: pnpm check and pnpm vitest run.

## Notes

- **Priority:** corner case (bucket 4-corner). Upheld ux/low. Only the copy is stale, and only within the 2 s debounce.
- **Trigger:** Type in an open note, then within the 2 s autosave debounce (or while autosave is failing) right-click its row in the note list and choose Duplicate.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/note-list/NoteRowMenu.svelte:74-76 handleDuplicate -> duplicateItem(note.path, false) (the only caller, rg) -> src/lib/core/filesystem/fs.service.ts:354-358 copyDirectoryRecursive / copyFile with no save -> src/lib/core/editor/editor.service.ts:227 debouncedSave 2000 ms (maxWait 10 s) holds unsaved text only in editorStore -> contrast src/lib/core/filesystem/path-change.service.ts:55-62 saveDirtyTabsUnder and :156 on delete.
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/19-duplicate-case-insensitive-overwrite.md`
- **Second opinion:** upheld (ux, low). duplicateItem (fs.service.ts:345-365) copies the file on disk with copyFile and never saves a dirty tab first. The copy therefore lacks the last <2 s of typing. The original note is still saved by autosave, so no written text is lost; the copy is just stale. That makes it ux rather than content. Corrections to apply while implementing: Category content -> ux: the original is not lost or overwritten, and only the new copy is stale.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-07` (from file-io-content-2, file-io-ux-5). Size S.

## Comments
