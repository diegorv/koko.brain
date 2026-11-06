# 13: Closing a tab with unsaved text saves it and closes; a prompt appears only when that save fails

**What to build:** closeTab (src/lib/core/editor/editor.service.ts:303-321) asks 'This file has unsaved changes. Discard changes?' for any dirty tab, which in an autosave app means every close inside the 2 s debounce window. The debounce timers are not cancelled during the native dialog, so saveDirtyTabs (:209-220) usually writes the tab while the dialog is open: 'Discard Changes' then closes a tab whose text is already on disk, and the prompt's promise is false in its most common case. Quit and window close already do the right thing through prepareForExit (src/lib/core/vault/exit.service.ts:15-23): save first, ask via confirmDiscardFailedSaves only for saves that failed. Make closeTab do the same for a dirty non-virtual tab: await saveFileByPath(tab.path); on success close without a prompt; on failure ask with the failed-save wording ('Failed to save X. Close anyway and lose unsaved changes?'), and on Cancel keep the tab. This changes documented behavior (help/documentation/03-editor.md:129) and the pinned test at src/tests/lib/core/editor/editor.service.test.ts:658; the owner confirms the new behavior before it runs, and both are updated with it.

**Blocked by:** none

**Status:** needs-info

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

**Owner decision needed:** Closing a dirty tab: (a) save it and close, and prompt only when the save fails. This changes help/documentation/03-editor.md:129 and the test at editor.service.test.ts:658. (b) Keep the Save/Discard prompt, but cancel the pending debounced save while it is open, so Discard really discards.

- [ ] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts: add a tab with content !== savedContent, writeTextFile resolving, call await closeTab(index); ask is not called, writeTextFile was called with the tab's content, and the tab is gone. It fails today (ask is called).
- [ ] When writeTextFile rejects, closeTab asks with the failed-save wording; Cancel keeps the tab open and dirty, the confirm answer closes it.
- [ ] A clean tab and a virtual tab close with no write and no prompt, as today.
- [ ] A pinned tab is still skipped.
- [ ] Keystrokes typed while the close-time save is in flight are not silently dropped: if the tab is dirty again after the save, it is saved again (or the close is not completed) before removal.
- [ ] help/documentation/03-editor.md:129 describes the new behavior; the test at editor.service.test.ts:658 is updated to the new contract and the change is named in the commit message.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. Cmd+W within 2 s of typing always prompts, and the debounced save can fire while the dialog is open. The fix changes documented behavior and a pinned test.
- **Trigger:** Type in a note and press Cmd+W (or click the tab's x) within about 2 s of the last keystroke, the normal close-right-after-editing flow.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/editor/editor.service.ts:227 debouncedSave (2 s, maxWait 10 s) -> a tab is dirty at close only inside that window when saves work -> :312-319 ask(...) awaited with no debouncedSave.cancel() -> the timer fires saveDirtyTabs :209-220 -> writeTab :187-198 writes and markSavedByPath -> after the answer :325-330 only removes the tab. Contrast src/lib/core/vault/exit.service.ts:15-23 and :33-40 (save first, ask only on failure). Docs help/documentation/03-editor.md:129. Pinned labels: src/tests/lib/core/editor/editor.service.test.ts:658-670.
- **Second opinion:** upheld (ux, high). Confirmed at editor.service.ts:303-321. closeTab calls ask() for any dirty non-virtual tab and never cancels debouncedSave, so the 2 s timer can save the tab while the dialog is open. Exit goes through prepareForExit (save first, then ask only about saves that failed); closeTab does not. Nothing is lost unless the user explicitly picks Discard within the window, so this is ux. Corrections to apply while implementing: The pinned test begins at editor.service.test.ts:658 ('asks with Discard Changes / Cancel labels ...'). The reference is accurate.
- **Source:** audit 2026-11-05, domain `editor`, finding `N-editor-02` (from editor-ux-3, editor-spec-3). Size S.

## Comments
