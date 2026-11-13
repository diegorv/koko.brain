# Refute 028: Duplicate saves the note's unsaved typing before copying it

Adversarial validation at HEAD `318b6e9b5` (2026-11-12). Read-only: nothing was run (no vitest, check, cargo, app). "Fact" means read in code at HEAD; "Inference" means derived from that code, not executed.

## Verdict

- **Bug still present: yes (fact).** `duplicateItem` (`src/lib/core/filesystem/fs.service.ts:345-365`) reads the parent dir, builds the copy name and calls `copyFile(itemPath, newPath)` (`:357`) or `copyDirectoryRecursive` (`:355`, defined `:330-342`). It never touches the editor: `fs.service.ts` imports no editor service or editor store (`:1-11`). A tab dirty at click time therefore gets copied from its last saved bytes (inference from the code path, not reproduced).
- **Contrast with delete still holds (fact), line refs drifted:** `saveDirtyTabsUnder` is now at `src/lib/core/filesystem/path-change.service.ts:65-72` (module-private, not exported) and is called at `:168` only on `to === null`. The Issue cites `:55-62` and `:156`. `NoteRowMenu.svelte` `runOrToast` is at `:67-75` (PreDeleteSaveError check `:72`) and `handleDuplicate` at `:77-79`; the Issue cites `:74-76`. `fs.service.ts:345-365`, `:357` and `editor.service.ts:227` are still exact.
- **Only caller (fact):** `src/lib/features/note-list/NoteRowMenu.svelte:78` passes `isDirectory = false`. No other `duplicateItem` caller in `src/lib`; the Duplicate menu entry is `NoteRowMenu.svelte:223`, rendered by `RailNoteList.svelte:56`. The calendar's "Duplicate event" (`event-calendar.service.ts:989-1024`) is a separate code path, not covered or claimed here. The folder branch has no production caller.
- **Impact for this owner: low (agree with Issue and dossier).** The owner uses the rail note list daily, so the menu is reachable, but the trigger needs Duplicate chosen less than 2 s after the last keystroke (the `debounce(saveDirtyTabs, 2000, { maxWait: 10_000 })` at `editor.service.ts:227`; 500 ms for frontmatter edits, so meta-bind edits are even less exposed), or autosave failing. Only the new copy is stale; the original keeps its text and still autosaves. Canvas persists into its editor tab after a 300 ms timer (`CanvasInner.svelte:236-239`, `onJsonChange` prop `:52-53`), so the fix covers it once that timer fired (Kanban persistence was not checked); a canvas edit within 300 ms of Duplicate would still be missed (inference, negligible).
- **Complexity: S. Risk: low (agree).** Exporting the existing helper and awaiting it first in `duplicateItem` changes no delete behavior. The import cycle `fs.service.ts:8` <-> `path-change.service.ts:3` already exists and is call-time only. No test mocks `path-change.service` (grep of `src/tests`), so no mock factory misses the new export. `fs.service.test.ts:32-37` mocks `editor.service.js` with `saveFileByPath: vi.fn(async () => true)`, so the existing duplicate tests (`:1506-1604`) keep passing; they never add tabs. The save goes through `saveFileByPath` -> `writeTab` -> `notifyAfterSave` (`editor.service.ts:171-201`), the normal path required by `docs/agents/indexing-watcher-rules.md` rule 6; no new index owner, no Live Preview code touched. The `saveTails` queue (`editor.service.ts:163-179`) already serializes a click that lands during an in-flight autosave.
- **Hot-code series:** `priority-2026-11-08.md:58` lists 028 in the `editor.service.ts` group. The fix does not edit `editor.service.ts`; it only calls `saveFileByPath`, so it does not need to wait behind 004 or 015 at file level. Agree with the dossier here.
- **Implementable by a fresh agent from the text alone: not quite.** Criterion 1 asks for something its named test file cannot observe (see Must-fix 1), and criterion 2 names the error type only indirectly. Both are wording fixes, not owner decisions. Recommendation: **run-after-edits**.

## Must-fix edits to the Issue text

### 1. Criterion 1 cannot be written as stated in `fs.service.test.ts`

Evidence: `src/tests/lib/core/filesystem/fs.service.test.ts:32-37` mocks `#lib/core/editor/editor.service.js` for the whole file (`saveFileByPath: vi.fn(async () => true)`, `closeTabsForDeletedPath: vi.fn(() => [])`), and `copyFile` is a bare `vi.fn()` (`:17`). `saveFileByPath(path)` takes only a path (`editor.service.ts:171`), so "the save of /vault/a.md with 'new'" is not observable there. The only thing an agent can assert in that file is mock call order, which `CLAUDE.md` ("never `.toHaveBeenCalled()` as the sole assertion") and `docs/TESTING.md` reject, and which proves nothing about the copied bytes. Unmocking `editor.service` in that file would break the delete tests that rely on the `closeTabsForDeletedPath` mock. An agent would have to guess. The repo already has the right pattern: `src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts` (real stores and real editor, fs and path-change services, Tauri fs mocked over an in-memory `disk` map). Its `copyFile` mock (`:42`) has no body, so a copy test needs one.

Replace the first criterion with:

> - [ ] Failing test first, in a new file `src/tests/lib/core/filesystem/duplicate-dirty-tab.test.ts` modeled on `f165-delete-dirty-tab.test.ts`: real stores and real editor, fs and path-change services; mock only the Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-opener`, `svelte-sonner`) over an in-memory `disk` map, with `copyFile(from, to)` doing `disk.set(to, disk.get(from))` and `readDir` returning the entries of the parent from `disk`. With `disk['/vault/a.md'] = 'old'` and `editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: 'new', savedContent: 'old' })`, `await duplicateItem('/vault/a.md', false)` returns `'/vault/a copy.md'`, `disk.get('/vault/a copy.md')` is `'new'`, `disk.get('/vault/a.md')` is `'new'` and the tab is clean. It fails today: the copy holds `'old'`.

### 2. Name the error type and its stale docs

Evidence: the only error type the row menu skips is `PreDeleteSaveError` (`NoteRowMenu.svelte:72`; also `FilesNavigator.svelte:118`, `delete-note.service.ts:25`). Its doc comment says it is "Thrown by `applyPathChange` on a delete" (`fs.logic.ts:155-158`) and `saveDirtyTabsUnder`'s doc does not mention duplicate (`path-change.service.ts:61-64`). The `CLAUDE.md` rule "update or delete the comments it made wrong" applies once duplicate throws it. "the save error type the row menu does not toast twice" leaves an agent free to invent a new type, which then needs edits in `runOrToast`.

Replace the second criterion with:

> - [ ] With `writeTextFile` failing, `duplicateItem('/vault/a.md', false)` rejects with `PreDeleteSaveError` (reused, not a new type), `copyFile` is not called, no `/vault/a copy.md` exists in `disk`, the tab is still dirty, and `toast.error` was called exactly once, with `'Failed to save file.'`. Export `saveDirtyTabsUnder` from `path-change.service.ts`, call it as the first statement in `duplicateItem`'s `try`, and update the doc comments of `saveDirtyTabsUnder` (`path-change.service.ts:61-64`) and `PreDeleteSaveError` (`fs.logic.ts:155-158`) to say duplicate throws it too. Leave the message text (`fs.logic.ts:165`, asserted at `fs.logic.test.ts:436`) unchanged: it reaches only the log and Sentry.

## Should-fix edits

1. **Refresh drifted line refs** in "What to build" and Evidence: `path-change.service.ts:55-62` -> `:65-72`, `:156` -> `:168`; `NoteRowMenu.svelte:74-76` -> `:77-79` (`runOrToast` `:67-75`). Change "verified by reading code at `5f8003d67`" to add "re-checked at `318b6e9b5`".
2. **Criterion 3 passes today.** "A clean tab or a note that is not open is copied without any save" is a regression guard, not a failing test. Make it concrete in the same new file: "a clean tab and a note with no tab: `writeTextFile` is not called and the copy equals the disk bytes".
3. **Criterion 4 (folder branch)** has no production caller (`NoteRowMenu.svelte:78` hard-codes `false`). Keep it, since the helper covers it for free, but say so: "The folder branch (no UI caller today) saves a dirty tab at `/vault/dir/x.md` before copying: the copied `x.md` holds the new text."
4. **Optional row-menu test:** add to the criteria, or to Notes as optional, a case in `src/tests/lib/features/note-list/NoteRowMenu.test.ts` beside `:366-377`: `duplicateItem` rejects with `PreDeleteSaveError` and `toast.error` is not called. The delete equivalent exists at `:459`. Today the duplicate tests only cover the generic failure toast (`:373-377`).
5. **Gate line** is right for the owner's main session, but a relay-lite run replaces it with the role's targeted checks (CLAUDE.md "Inside a relay-lite run"). No change needed; noting it so nobody reads it as a full-suite requirement during build.
6. **Trigger wording:** "or while autosave is failing" is right. "(maxWait 10 s)" in Evidence is irrelevant to the trigger, because the user must stop typing to open the menu; the window is 2 s after the last body keystroke, 500 ms after a frontmatter edit.

## Dossier errors

The dossier is mostly accurate. Errors and weak points:

1. **HEAD:** it says checked at `afc0a9df8`; HEAD is now `318b6e9b5` (two later commits touch Issue 198 status colors only, none of the files above). Its line refs still match.
2. **Section 4 test A wording:** "assert `disk['/vault/a.md copy'...]` (generated name `a copy.md`)" is garbled. The generated path is `/vault/a copy.md` (`generateCopyName`, see `fs.service.test.ts:1524`: `note.md` -> `note copy.md`).
3. **Pre-change checklist:** it says `duplicateItem` writes `fsStore.fileTree` via `addScannedToTree` "(`fs.service.ts:179-189`)". The function is at `:179-189` but the doc starts at `:173`; minor. It also omits that `saveFileByPath` -> `notifyAfterSave` reaches `applyNoteChange` for the original, the one index side effect the fix adds (same as any autosave, so harmless, but it belongs in the checklist answer).
4. **"`editorStore` is not reset in that describe's `beforeEach`, add `editorStore.reset()`":** true but beside the point. `fs.service.test.ts` does not import `editorStore` at all, and with `saveFileByPath` mocked a tab-based test there cannot prove the bug. The dossier reaches the right conclusion (use a new real-service file) in its acceptance review; the plan step should not suggest touching `fs.service.test.ts` for this.
5. **Section 3 regression list:** "`duplicateItem` logs ... which also reaches Sentry ... minor noise" is right (`error()` in `fs.service.ts:362`). Not an error, but the same double report already happens on delete, so it is not new behavior.
6. **Not mentioned:** canvas persists into its tab only after a 300 ms timer (`CanvasInner.svelte:236-239`), so a canvas edit made within 300 ms of Duplicate is still missed. Negligible; no Issue change needed.

## Not checked

- Nothing was executed; "fails today" for the replacement criterion 1 is inferred from the code (`copyFile` runs with no prior save, so the disk-backed copy gets `'old'`).
- Tauri `copyFile` semantics on real disk (overwrite, metadata) were not re-verified in the plugin source; they do not affect this fix.
