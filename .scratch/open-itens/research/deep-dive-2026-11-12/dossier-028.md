# Dossier 028: Duplicate saves the note's unsaved typing before copying it

Checked at HEAD `afc0a9df8` (2026-11-12). Read-only research; nothing was run (no vitest, check, cargo).

## Verdict in one paragraph

The bug still exists exactly as written. The fix is small (S): export the existing `saveDirtyTabsUnder` helper and call it at the top of `duplicateItem`. It is low impact for this owner (stale copy only inside the 2 s autosave window, original never loses text), the risk is low, and it does not need to touch `editor.service.ts`. Recommend doing it as a cheap, safe item after the higher-impact queue entries, or batching it with 029 (same function, blocked by 028).

## 1. Still present?

Status: **still present, exactly.** No commit since the audit changed the logic. `git log` on `fs.service.ts` shows only `f618f44ce` (tree update, Issue 09), `f5f5836ab`, `7468176d2`, none touching `duplicateItem`'s save behavior. `git log -S"saveDirtyTabsUnder"` finds only `f1b3cde9d` (the delete fix, Issue 05), so nobody added the save for duplicate.

Verified in code (facts):

- `src/lib/core/filesystem/fs.service.ts:344-365` `duplicateItem`: reads siblings (`readDir`), builds the name (`generateCopyName`), then `copyFile(itemPath, newPath)` at `:357` (file) or `copyDirectoryRecursive` at `:355` (folder, defined `:330-342`, uses `copyFile` at `:339`). There is no call to any editor or save function, and `fs.service.ts` does not import `editor.service` or `editorStore` at all (imports `:1-11`).
- `src/lib/core/filesystem/path-change.service.ts:65-72` `saveDirtyTabsUnder(path)`: filters `editorStore.tabs` for `t.path === path || startsWith(path + '/')`, not virtual, `isTabDirty`; awaits `saveFileByPath(tabPath)` per tab; throws `PreDeleteSaveError(tabPath)` on the first failure. It is module-private (not exported). Called only at `:168` inside `applyPathChange` when `to === null` (delete). Line refs in the Issue (:55-62, :156) have drifted to :65 and :168.
- `src/lib/core/editor/editor.service.ts:171-179` `saveFileByPath(path): Promise<boolean>` queues behind a pending save of the same path (`saveTails`), `writeTab` at `:187` no-ops for a missing, virtual or clean tab, and on write failure logs, toasts "Failed to save file." and returns false. Autosave: `debouncedSave = debounce(saveDirtyTabs, 2000, { maxWait: 10_000 })` at `:227`.
- Only caller of `duplicateItem` in app code: `src/lib/features/note-list/NoteRowMenu.svelte:77-79` (`handleDuplicate` hard-codes `isDirectory = false`). `runOrToast` at `:67-75` swallows `PreDeleteSaveError` (`:72`). `FilesNavigator` has no Duplicate. The calendar's Duplicate (`duplicateEventFromUi`, `event-calendar.service.ts:1492`) goes through a different function (`duplicateEvent`), not examined here and out of scope.
- Consequence: the `isDirectory === true` branch of `duplicateItem` has no production caller today (only tests at `fs.service.test.ts:1541`, `:1574`).

Inference: a tab dirty at click time holds text not yet on disk, so `copyFile` copies the previous saved bytes. This follows directly from the code path; it was not reproduced by a test (read-only task).

Issue text corrections: the Second opinion says Category should be ux not content (already applied in the Notes; keep it). `PreDeleteSaveError` naming and message ("before moving it to the Trash", `fs.logic.ts:159-169`) no longer fit when thrown from duplicate; see section 4.

## 2. Impact for this owner

- **Trigger:** type in an open note, then within 2 s of the last keystroke (or up to 10 s of continuous typing, the maxWait) right-click that note's row in the note list and choose Duplicate; or autosave is failing (5 s retry loop, `editor.service.ts` `SAVE_RETRY_DELAY_MS`).
- **Frequency:** low. Reaching the row, opening the menu and picking Duplicate normally takes more than 2 s after the last keystroke, so autosave has fired. Duplicate is usually used on a note the user is not typing in (template-like reuse). The realistic hit is: edit a note, immediately duplicate it as a base for a variant, quickly. Not a daily-workflow path for tables, Quick Capture or core saving.
- **Severity:** wrong data, but small and recoverable. Only the new copy lacks the last seconds of typing. The original tab is intact and still autosaves, so no typed text is lost. The user sees the copy missing the tail and can re-copy.
- Rank: below every proposed queue item. It touches no external-writer scenario, so that discount does not apply.

## 3. Complexity and risk

Size: **S**. About 6 changed source lines plus tests.

Files:

- `src/lib/core/filesystem/path-change.service.ts:65`: add `export` to `saveDirtyTabsUnder` (and adjust its doc: it is no longer delete-only).
- `src/lib/core/filesystem/fs.service.ts:345`: import it next to `applyPathChange` (`:8`) and `await saveDirtyTabsUnder(itemPath)` first in the `try`, before `readDir`.
- `src/lib/core/filesystem/fs.logic.ts:159` `PreDeleteSaveError`: optional message wording (see below).
- Tests: `src/tests/lib/core/filesystem/fs.service.test.ts` (`describe('duplicateItem'` at `:1506`), a new real-service test (section 4), optionally `src/tests/lib/features/note-list/NoteRowMenu.test.ts` (`:366-377`).

Centrality: `fs.service.ts` is core but `duplicateItem` is a leaf with one caller. `saveDirtyTabsUnder` is private today and used once (delete). Exporting it does not change delete behavior. `fs.service.ts` already imports from `path-change.service.ts` (`:8`) and `path-change.service.ts` imports `fs.service` (`:3`): the cycle exists and a function-level use is safe. No test mocks `path-change.service` (grep of `src/tests`), so no factory mock will miss the new export. `fs.service.test.ts` mocks `editor.service.js` (`saveFileByPath` returns true, `:34-39`), so existing duplicate tests keep passing; `editorStore` is not reset in that describe's `beforeEach`, add `editorStore.reset()` if a test adds tabs.

What could regress:

- A failed save now aborts the duplicate (by design). If the disk is failing, copyFile would likely fail too. The user gets one "Failed to save file." toast from `writeTab` and no second toast (`runOrToast:72`).
- `duplicateItem` logs `error('FS', 'Failed to duplicate item:', err)` in its catch (`:362`), which also reaches Sentry per project conventions. A `PreDeleteSaveError` would be reported on top of `writeTab`'s own error log. Minor noise; leave unless the owner cares.
- Saving the original has the usual save side effects (`notifyAfterSave` index update, file-history snapshot). Same as any autosave, so nothing new.
- Does not touch CodeMirror, Rust, the watcher or index rules. The `indexing-watcher-rules.md` invariants (note-change owner, dedupe, watcher self-save guard) are unaffected: the save goes through `writeTab` -> `notifyAfterSave` like every other save, and the copy is picked up as today.

Alternative considered (not recommended): write the tab's in-memory content to the copy instead of saving the original. It avoids a side effect on the original but needs a new write path plus index/tree registration for the new file, and diverges from `deleteItem`. The save-first approach reuses proven code.

## 4. Implementation plan (one context, test-first)

Pre-change checklist answers: `duplicateItem` writes `fsStore.fileTree` via `addScannedToTree` (`fs.service.ts:179-189`, `addToTree`); it will additionally trigger `editorStore.markSavedByPath` through `saveFileByPath`. Readers of the tree: file explorer and note list. Existing tests verify tree insertion (`fs.service.test.ts:1558`, `:1574`).

1. **Failing test first** (new file `src/tests/lib/core/filesystem/duplicate-dirty-tab.test.ts`, modeled on `f165-delete-dirty-tab.test.ts`): real stores and real editor, fs and path-change services; mock only Tauri APIs backed by an in-memory `disk` map. Make `copyFile` copy `disk.get(from)` to `to` (the f165 mock has `copyFile: vi.fn()` with no body, so it needs an implementation here) and `readDir` return the parent's entries from the map.
   - Test A: `disk['/vault/a.md']='old'`, `editorStore.addTab({ path, name, content: 'new', savedContent: 'old' })`, `await duplicateItem('/vault/a.md', false)`; assert `disk['/vault/a.md copy'...]` (generated name `a copy.md`) equals `'new'` and the tab is clean. Fails today (copy holds `'old'`).
   - Test B (failed save): `writeShouldFail = true`; expect `rejects.toBeInstanceOf(PreDeleteSaveError)`, no entry for the copy path in `disk`, `copyFile` not called, tab still dirty, `toast.error` called once with `'Failed to save file.'`.
   - Test C (clean tab and closed note): no `writeTextFile` call, copy equals disk bytes.
   - Test D (folder): `duplicateItem('/vault/dir', true)` with a dirty tab at `/vault/dir/x.md`: copied `x.md` holds the new text. Low value because no caller passes `true`; keep only because the same helper covers it and the Issue lists it.
   - Run the new file and confirm A fails for the right reason.
2. **Minimal fix**: export `saveDirtyTabsUnder`; in `duplicateItem` add `await saveDirtyTabsUnder(itemPath);` as the first statement of the `try`. Save before `readDir` so name generation sees the current disk. Run the new tests (green) and `fs.service.test.ts`.
3. **Optional wording**: `PreDeleteSaveError.message` says "before moving it to the Trash". Either leave it (message is only logged, `runOrToast` ignores the error) or generalize to "Could not save ... first". If changed, update `fs.logic.test.ts:431` and grep other assertions on the message. Recommend leaving it and adding a doc line to the class noting duplicate also throws it; the Issue explicitly asks to reuse the type.
4. **NoteRowMenu test (optional, small)**: add a case beside `NoteRowMenu.test.ts:366-377`: `duplicateItem` rejects with `PreDeleteSaveError`, no `toast.error`. The delete equivalent already exists (`:459`).
5. **Gate**: frontend only: `pnpm check` and `pnpm vitest run`. Per memory "gate matches what changed", small direct edit: touched tests plus `pnpm check` are enough; no build, no cargo.
6. **Commit** per CLAUDE.md: `fix:` commit with tests, full detailed message, no `Test-Exempt` needed.

### Acceptance criteria review

- "Failing test first in fs.service.test.ts ... assert the save of /vault/a.md with 'new' happened before copyFile": **partly untestable as written.** In that file `editor.service.js` is mocked and `saveFileByPath(path)` takes only a path, so "with 'new'" cannot be asserted; it can only assert call order (`mock.invocationCallOrder`) which proves ordering but not that the copy contains the typing. The repo's rule against asserting on mocks alone applies. Replace with test A above (real editor, disk-backed, assert copied bytes).
- "A failed save leaves no copy on disk and duplicateItem rejects with the save error type the row menu does not toast twice": fine; clarify the type is `PreDeleteSaveError` (name is a misnomer but the only type `runOrToast` ignores, `NoteRowMenu.svelte:72`).
- "A clean tab or a note that is not open is copied without any save": fine; assert on `writeTextFile` not called with real helper, since `saveFileByPath` is a no-op for clean tabs anyway.
- "The folder branch saves dirty tabs under the folder": fine but no production caller; low value.
- Missing: save must happen before `readDir`/name generation (ordering), and a note that Duplicate on a dirty tab with a pending in-flight save is handled by the `saveTails` queue (no extra work needed).
- Frontend gate line is correct.

## 5. Run order

- **Blocked by:** none. Issue 029 (case-insensitive overwrite in `generateCopyName`/`duplicateItem`) is blocked by 028 and shares `duplicateItem`; do 029 right after 028 if the owner wants it (it is deferred, not in the queue).
- **Hot-code series group:** `priority-2026-11-08.md:58` lists 028 last in the `editor.service.ts` group (004, 015, 016, 017, 018, 019, 076, 089, 094, 095, 028). In practice 028 **does not edit `editor.service.ts`**; it only calls `saveFileByPath`, whose signature and boolean result stay stable (Issues 017/019/153 add a disk precondition inside `writeTab` and 076 makes writes atomic; none changes the return contract per their text). So it does not need to wait behind 004 or 015, and it conflicts with none of them at file level. The series placement is only a soft concern: if 019 or 153 later make `saveFileByPath` return a conflict result, `saveDirtyTabsUnder` (delete path too) would need the same adaptation, which is another reason to reuse the one helper.
- **Shared files with other queue Issues:** none of 004, 015, 062, 009, 070, 067, 068, 003, 010, 012, 002 mentions `fs.service.ts`, `path-change.service.ts`, `NoteRowMenu` or `duplicateItem` (grep of the issue files). 009/010/012/068/070 touch `RailNoteList`/`lens.logic.ts`, which render `NoteRowMenu` but not its duplicate handler.
- **Suggested slot:** after the proposed queue (or as a quick fill-in between larger items); it can run in parallel with any queue Issue except one that edits `fs.service.ts` or `path-change.service.ts`.

## Not checked

- No test or app run; the failing behavior was derived from code, not executed. The real Tauri `copyFile` semantics (overwrite, byte copy) were taken from the Issue and existing tests, not re-verified in the plugin source.
- Did not inspect `duplicateEvent` (calendar) for the same stale-copy problem.
