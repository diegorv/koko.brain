# Deep dive h05-calendar-b

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro (HEAD 0ba80e6a, identical to main).
Claims: /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/file-io-audit/deep/items/h05-calendar-b.md (5 ids).

Method: each claim re-traced from the cited anchor. Guards, callers and existing tests were searched for. Two repro tests were written and run with vitest. No app code was edited and cargo was not run.

## Result

| id | distinct bug | verdict | severity | priority |
|---|---|---|---|---|
| calendar-7 + rename-move-delete-5 | link rewrite overwrites keystrokes typed in the rewritten open note | CONFIRMED_BY_TEST | data-loss | P2 |
| calendar-6 | calendar delete loses keystrokes typed during its pre-delete save | CONFIRMED_BY_TEST | data-loss | P2 |
| calendar-8 | failed frontmatter save leaves the moved frontmatter in a dirty tab that the calendar rolled back | CONFIRMED_BY_TRACE | stale-state | P3 |
| calendar-9 | create reported as failed after create_note succeeded; retry makes "Name 1.md" | CONFIRMED_BY_TRACE | minor | P3 |
| (no claim id) | explorer, note row and note action bar deletes close dirty tabs with no save | CONFIRMED_BY_TEST | data-loss | P1 |

The last row is a duplicate of the existing o04 repro (src/tests/repro/o04-delete-rename/delete-dirty-tab.test.ts). It is recorded here because the 2 s debounce analysis below changes its reachability. It is not a new bug.

## 1. calendar-7 + rename-move-delete-5 (one bug)

Root cause: src/lib/core/filesystem/link-updater.service.ts:33-47.
- :33-35 picks the base text: a dirty tab uses `openTab.content` (a snapshot taken synchronously), a clean tab awaits `readTextFile` (:35).
- :36 rewrites the snapshot. :39 awaits `writeTextFile`.
- :47 `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` overwrites the tab's content and savedContent with the snapshot-based text. src/lib/core/editor/editor.service.ts:70-91 has no guard. editor.store.svelte.ts:130-136 (`updateTabContentByPath`) sets both fields. MarkdownEditor.svelte:323-331 replaces the whole CodeMirror doc with `addToHistory(false)`.

Any keystroke between :34/:35 and :47 is lost from the buffer and from disk. The window is the read IPC (clean tab) or the write IPC (dirty tab). Both are a few ms.

Triggers, checked: `renameItem` (fs.service.ts:201-212) runs `applyPathChange` (path-change.service.ts:117), which calls `updateLinksAfterRename` at :149 after `diskOp` (:127). Calendar title rename goes through event-calendar.service.ts:704 and :728 (`renameItem`), and undo or redo through :1338 (`planTitle: true`). File-explorer and note-list renames reach the same code.

Test: src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts (2 tests, both fail).
Output excerpt: `AssertionError: expected 'link to [[new-name]]' to contain 'typed'` (clean branch) and the same for the dirty branch.

Reachability: narrow. A keystroke must land in that note's own read or write IPC during a rename of a note it links to. Permanent when it happens. Upgrade to P1 if the owner counts "rename a linked note while typing in another linked note" as a common action.

Recoverable: the lost keystrokes are not recoverable from the app. The rewritten bytes are on disk. Whether Cmd+Z restores anything was not checked (CodeMirror history after a non-history full-doc replace was not verified against its source), so that part of rename-move-delete-5 is unverified.

Fix sketch: after the await, rewrite the live buffer (`tab.content` at that moment) instead of the snapshot, or skip the sync when the tab changed since the snapshot and only rewrite the disk copy.

## 2. calendar-6

Root cause: event-calendar.service.ts:1037 saves first, then :1043 deletes. `saveFileByPath` (editor.service.ts:161-170) captures `tab.content` at :165 and awaits `writeTextFile` at :168. `markSavedByPath` (editor.store.svelte.ts:91-96) sets savedContent to the captured text. Control then goes to `deleteItem` with no await in between (the continuation is a microtask chain), so no keystroke can land after the save resolves. The window is exactly the save IPC. `closeTabsForDeletedPath` (editor.service.ts:356-366) runs before `diskOp` (path-change.service.ts:125) with no dirty check. The typed text is then nowhere: not on disk, not in the Trash, not in a tab.

Test: src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts (fails).
Output excerpt: `AssertionError: expected false to be true` at `diskHolds('typed while saving')`.

Reachability: requires a calendar delete of the event while the same note receives a keystroke during one save IPC (ms). Narrow. Permanent when hit. P2 by the owner's "ms race is lower priority" rule.

Recoverable: no. The Trash holds the pre-typing bytes, which the existing "saves a dirty tab first" test expects.

Fix sketch: re-check dirty after the save and loop, or re-save the tab's current content immediately before the trash move, in the same synchronous block as `closeTabsForDeletedPath`.

## 3. calendar-8

Root cause: frontmatter-write.service.ts:128-134.
- :128 sets the tab to `next` (no savedContent change). :129 `saveFileByPath`.
- :131-134 on failure: reverts the tab to `base` only when `findTab(path)?.content === next`. When the user typed during the save, the tab keeps `next` plus the typing and stays dirty.
- The calendar rollback is in event-calendar.service.ts:767-771 (`dropPending` or `putPending(prior)`, no op recorded). The claim's "no revert" is accurate for the typed case, and the code comment says it is deliberate ("Leave edits made while the save was pending alone").
- The retry: editor.service.ts:183-193 (`saveDirtyTabs` re-arms a 5 s retry on failure). Typing re-arms autosave (:224-227).

Net effect: the calendar shows the old position, the editor shows the moved date, and the next autosave or retry writes the moved date. The toast from saveFileByPath reports the failure. No bytes are lost: the typed text and the moved frontmatter are both in the buffer and eventually on disk.

Test: none. The expected behavior is a design choice (keep typed text vs. revert the move), so a repro would assert a guess.

Reachability: needs a failed write (disk full, permission, sync lock) during a calendar drag, with typing in the same note during that save. Rare.

Recoverable: yes. The user can edit the frontmatter back, and the retry writes whatever is in the buffer. The claim's "cannot be undone" is true for the calendar op stack only.

## 4. calendar-9

Root cause: fs.service.ts:129 `create_note` succeeds, then :138 `refreshTree()` (scan_vault) is inside the same try. loadDirectoryTree (fs.service.ts:74-102) rethrows. `createFile` catch (:141-143) rethrows. type-definitions.service.ts:136-139 maps any throw to `Error('create-failed')`. event-calendar.service.ts:946 maps that to `EventCalendarError('create-failed')`, and createNow has no overlay or op yet at that point. EventDialog keeps the form (create() rethrows inline, EventDialog.svelte:145-158).

Retry: `resolveTypedNoteTarget` (type-definitions.service.ts:61-68) reads the folder with readDir, so the first note is a sibling and the retry gets "Standup 1.md".

Reachability: scan_vault must fail once right after a successful create_note. Rare.

Recoverable: the first note is complete on disk. The user has a duplicate to delete. No content loss.

Not tested: a repro would need to pick between "return the path" and "report success with a warning". The owner's intent is not clear from the code.

## 5. Adjacent (not a claim): explorer delete closes dirty tabs without a save

Callers that call `deleteItem` with no save first: NoteRowMenu.svelte:128, FilesNavigator.svelte:174 (folder, includes children), note-action-bar.service.ts:24 (via NoteActionBar.svelte:214). `applyPathChange` closes the tab before the Trash move (path-change.service.ts:125). Only the calendar's `deleteNow` saves first (event-calendar.service.ts:1037), and its own comment says why.

Timing, verified: `debounce` (src/lib/utils/debounce.ts) has no maxWait, so the 2 s body autosave (editor.service.ts:197) never fires during continuous typing with gaps under 2 s. The loss is everything since the last autosave, not just the last 2 s, if the user stops typing and trashes within 2 s of the last keystroke. Frontmatter edits use 500 ms (:200). No keyboard shortcut for trash exists in commands.ts or global-keybindings.ts, so the path is mouse, context menu and confirm.

Covered by o04 (cross-cutting-2, recovery-4, rename-move-delete-1, save-pipeline-5); the existing repro asserts the same expectation. I did not add a second test.

Priority: P1 (type then trash within the debounce window is realistic but not common; permanent; the Trash keeps stale bytes).

## What was not checked

- Exact typing-latency distributions. The P2 ratings for the two race bugs rest on the ms-scale IPC window, not on measured IPC timings.
- CodeMirror undo behavior after the non-history replace (rename-move-delete-5's "Cmd+Z cannot bring them back"). No third-party source was fetched; nothing in the verdicts depends on it.
- Tauri IPC ordering beyond the fact that each `await` yields to the event loop.
- The calendar-6 test stubs a keystroke with `editorStore.updateContent`, the store write that `onContentChange` performs, not a real DOM keystroke.

## Tests written

- src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts: `./node_modules/.bin/vitest run src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts` gives 2 failed, 0 passed.
- src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts: `./node_modules/.bin/vitest run src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts` gives 1 failed, 0 passed.
