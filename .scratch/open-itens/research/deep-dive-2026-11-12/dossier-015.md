# Dossier: Issue 015, closing a dirty tab saves it and closes; prompt only when the save fails

Checked at HEAD `afc0a9df8` (main, 2026-11-12). Issue file: `.scratch/open-itens/issues/015-closing-tab-unsaved-text-saves-closes-prompt.md`. Read-only research; nothing else was written.

## Verdict

- Still present, exactly. No commit since the audit touched `closeTab`: last change to `src/lib/core/editor/editor.service.ts` is `7b71c217f` (retire .collection files), unrelated.
- Size S, risk low, impact medium (frequent trigger, low severity). Owner decision already recorded (2026-11-06), so no ask is needed before building.
- Hard blocker: Issue 004 (same function). Not merged yet: no pre-close hook exists in `closeTab`, and `CanvasInner.svelte` was last changed by `f37acb402` (Issue 01), not by a 004 fix.

## 1. Still present? (facts verified in code)

| Claim in the Issue | At HEAD | Status |
|---|---|---|
| `closeTab` asks "This file has unsaved changes. Discard changes?" for any dirty non-virtual tab | `src/lib/core/editor/editor.service.ts:303-332`; the `ask` is at `:312-319` (Issue says `:303-321`, same code, shifted by the tail of the function) | present |
| Debounce timers are not cancelled during the dialog | `closeTab` never touches `debouncedSave` (`:227`, 2 s, maxWait 10 s) or `debouncedSaveFrontmatter` (`:230`, 500 ms) | present |
| The timer fires `saveDirtyTabs` while the dialog is open and writes the tab | `saveDirtyTabs` `:209-220` -> `saveFileByPath` `:166-174` -> `writeTab` `:187-198` (`writeTextFile`, then `editorStore.markSavedByPath`, then `notifyAfterSave`) | present |
| After the answer, `closeTab` only removes the tab | `:323-331`: re-find by path, `removeTab`, `deleteTabViewState`, `notifyTabClosed`, `perfBaseline` | present |
| Quit / window close / vault switch already save first and ask only on failure | `src/lib/core/vault/exit.service.ts:15-23` (`prepareForExit`), `:33-40` (`confirmDiscardFailedSaves`); `src/lib/core/vault/vault.service.ts:23` uses it with verb `Switch` | present |
| Docs line | `help/documentation/03-editor.md:129`: "If you close a tab with unsaved changes, a confirmation dialog asks whether to discard them." | present |
| Pinned test at `editor.service.test.ts:658` | `:658` 'asks with Discard Changes / Cancel labels and keeps the tab when declined' | present, but see gap A below |

Callers of `closeTab` (all in `src/lib`): `EditorTabs.svelte:89` (tab x button), `EditorTabs.svelte:104` (tab context menu "Close"), `closeActiveTab` (`editor.service.ts:335-339`), which `src/lib/app/global-keybindings.ts:84` (Cmd+W) and `src/lib/app/commands.ts:112` (command palette) call. `registerTabCloseListener` has one consumer, `src/lib/plugins/queryjs/queryjs-ports.ts:16`.

Inference (not run): the prompt text is false in the common case only because the 2 s timer fires during the modal; with the native dialog open, JS timers still run, so by the time the user reads the dialog the file is usually on disk. I did not run the app.

## 2. Impact for this owner

- Trigger: type or edit a property in any note and press Cmd+W or click the tab x within about 2 s (body) or 0.5 s (frontmatter edit) of the last change. For daily editing in core notes this is the normal "finish a thought, close the tab" flow. The e2e helper comment (`e2e/specs/editor-empty-state.spec.ts:5-8`) also records that the auto-opened daily note is dirty on first boot, so even a pure open-and-close can prompt.
- Frequency: high for a daily editor user (every quick close after typing). Meta-bind property edits (500 ms timer) and tables are covered by the same path.
- Severity: annoyance plus a misleading warning. Data loss needs a deliberate "Discard Changes" click, and by then the file is usually already written (so even that does not lose text). The only real loss risk is the reverse: the user learns to click through the prompt, and the day a save actually fails the same prompt appears with no indication that this time it is true. After the fix the prompt means something.
- Class: ux, high frequency, low severity. Fits "bugs and solid app" ranking well because the fix is small and removes a daily friction. Owner does not use external sync, so no external-writer angle applies.

## 3. Complexity and risk

- Files: `src/lib/core/editor/editor.service.ts` (`closeTab` only), `src/tests/lib/core/editor/editor.service.test.ts`, `help/documentation/03-editor.md`. Possibly a stale comment in `e2e/specs/editor-empty-state.spec.ts:5-8` and a stale comment in `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:~290` ("discard dialog is mocked to confirm").
- Centrality: `closeTab` is a core editor path, but the change touches only the dirty-non-virtual branch. Clean-tab and virtual-tab closes stay as they are. No Rust, no CodeMirror, no stores changed, no `.logic.ts`.
- Reads/effects of the new save: it goes through `saveFileByPath` -> `writeTab` -> `editorStore.markSavedByPath` + `notifyAfterSave` (`editor.hooks`), exactly what the auto-save does, so indexing (`applyNoteChange` source `save`, per `docs/agents/indexing-watcher-rules.md` rule 6, 8), FTS/semantic after-save observers and the `.view` tab-aware writer (`waitForTabSave`, `saveTails`) behave as with any save. The save queues behind an in-flight save of the same path (`saveTails`, `:158-186`), so no write race with the still-armed debounce timer. When the timer fires later, `saveDirtyTabs` finds no dirty tab and returns (`:210-212`), so it is harmless that `closeTab` does not cancel it.
- Checked against the Pre-Change Checklist: stores written = `editorStore` (`markSavedByPath`, `removeTab`); computed readers = `isTabDirty` consumers (tab dirty dot in `EditorTabs.svelte`), `activeTab`; the existing tests cover them.
- What could regress:
  1. Import cycle: do NOT import `confirmDiscardFailedSaves` from `core/vault/exit.service.ts` into `editor.service.ts`. `exit.service.ts:2` already imports `saveAllDirtyTabs` from `editor.service.ts`, so it would create a file-level cycle. The cycle guards in `src/tests/lib/architecture/` are feature-level and layer-level, so they would likely not flag it, but `pnpm build` and review should. Inline the `ask` in `closeTab` instead (one use site), or move the helper into a leaf module and re-export from `exit.service.ts` (touches `exit.service.test.ts`; larger than needed).
  2. Double notice on failure: `writeTab` already shows `toast.error('Failed to save file.')` (`:195`) before the dialog. Acceptable.
  3. No retry after Cancel: if the close-time save is the first failure, nothing re-arms a retry (the 5 s retry timer exists only inside `saveDirtyTabs`, `:216-218`). The tab stays dirty until the next keystroke or the next autosave trigger. Rare (disk error plus Cancel). State the limit; do not add logic for it.
  4. Close while a save is slow: closing is now async for dirty tabs (waits for the write). A second Cmd+W during that window calls `closeTab` for the same tab, queues a second no-op save, then the existing re-find by path (`:324-326`) returns without removing anything wrong. Verified by reading; add no code.
- Size: S (about 15 lines of production code, 5-6 tests, 1 docs line).

## 4. Implementation plan (test-first, one context)

Gate: frontend only, `pnpm check` + `pnpm vitest run` (use targeted `pnpm vitest run src/tests/lib/core/editor/editor.service.test.ts` while iterating; owner memory says small direct edits need touched tests plus check only unless asked, but CLAUDE.md rule 6 still requires the full pair before commit). Commit with the full Conventional Commits body (Context, Problem, Solution, Behavior, Files with line ranges) and name the documented-behavior change and the rewritten pinned tests.

Prerequisite: 004 merged, so `closeTab` already has its pre-close flush. Place the new save AFTER that hook (the canvas/kanban flush must land its JSON in `tab.content` before the save reads it) and BEFORE the re-find and `removeTab`.

Step 1, failing tests in `src/tests/lib/core/editor/editor.service.test.ts` (`describe('closeTab')` starts at `:613`; mocks at `:1-46`, `addTab` helper at `:~78`; `ask` and `writeTextFile` are bare `vi.fn()`, the debounce mock runs synchronously):

1. Dirty tab closes without a prompt: `addTab('/vault/note.md','original'); editorStore.updateContent('modified'); writeTextFile.mockResolvedValue(undefined); await closeTab(0);` expect `ask` not called, `writeTextFile` called with `('/vault/note.md','modified')`, `tabs` empty. Fails today (ask is called; ask returns undefined so the tab stays).
2. Failed save asks with the failed-save wording: `writeTextFile.mockRejectedValue(new Error('disk full'))`, `ask` resolves false: expect `ask` called with `'Failed to save note.md. Close anyway and lose unsaved changes?'` and `{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' }`, tab still present, `content` still `'modified'`, still dirty (`isTabDirty`).
3. Failed save, `ask` resolves true: tab closed.
4. Typing during the in-flight close save: use the deferred `writeTextFile` pattern from `:331-343`. Start `const p = closeTab(0)`, `editorStore.updateContent('modified+typed')` while the first write is pending, release it, `await p`. Expect `writeTextFile` calls `[['/vault/note.md','modified'],['/vault/note.md','modified+typed']]`, `ask` not called, tab gone. This proves the keystroke AC (fails today for a different reason; it must also fail against a naive "save once then remove" implementation, which would leave `modified+typed` unsaved).
5. Second save in step 4 fails: `ask` is called (the loop returns false).
6. Keep as is: clean tab and virtual tab close with no write and no prompt (`:~620-634`, `:~745-760` already exist; assert `writeTextFile` not called if missing), pinned tab skipped (`:675`), listener tests (`:696-719`).

Rewrite the three tests that pin the old contract (the Issue names only one): `:636` 'prompts for dirty tab and closes on confirm', `:647` 'does not close dirty tab when user cancels', `:658` 'asks with Discard Changes / Cancel labels...'. Replace them with tests 1-3 above (do not delete coverage; the Cancel-keeps-tab and label assertions move to the failure case).

Step 2, minimal change in `closeTab` (`editor.service.ts:312-320`), replacing the `ask('This file has unsaved changes...')` block. Sketch, not final code:

```ts
if (!isVirtualTab(tab) && isTabDirty(tab)) {
	if (!(await saveUntilClean(tabPath))) {
		const name = tabPath.split('/').pop();
		const closeAnyway = await ask(`Failed to save ${name}. Close anyway and lose unsaved changes?`, {
			title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel',
		});
		if (!closeAnyway) return;
	}
}
```

with a small local helper that loops `saveFileByPath(path)`: return false on a failed save; after a successful save re-find the tab by path and, if it is gone or clean, return true, otherwise save again. This satisfies the keystroke AC without a new abstraction. Keep the `isTabDirty` guard so clean tabs take the same synchronous path as today. Update the JSDoc on `closeTab` (`:297-302`, currently says it prompts before discarding) and drop `getFileName` only if it becomes unused (it is imported at `:5` and used elsewhere; check before touching).

Step 3, docs: replace `help/documentation/03-editor.md:129` with text such as: "Closing a tab saves any unsaved changes first. A confirmation appears only if the save fails, and you can keep the tab open or close it and lose the changes." Fix the stale e2e comment (`e2e/specs/editor-empty-state.spec.ts:5-8`) and the `undo-history-across-notes.test.ts` comment only if the commit wants zero stale comments (CLAUDE.md section 8); the e2e behavior itself is unaffected (`setAskResponse(true)` just goes unused). I could not confirm the e2e fs mock supports writes; the e2e is not part of the Issue's gate, so run `bash scripts/e2e.sh` only if the owner asks.

Step 4, gate, staging check (`git diff --cached --stat`), commit.

### Acceptance criteria review

- AC 1 (failing test first): correct, but add `writeTextFile.mockResolvedValue(undefined)` explicitly; the bare `vi.fn()` also resolves, so it works either way.
- AC 2 (failure asks, Cancel keeps, confirm closes): good. Specify exact wording: the Issue's text omits the colon used by `confirmDiscardFailedSaves` ("Failed to save: X."); either is fine, but choose one and assert it. The Issue also does not name the button labels; use `Close Anyway` / `Cancel` to match the exit prompt (`src/tests/lib/core/vault/exit.service.test.ts:109`).
- AC 3 and 4 (clean, virtual, pinned): fine, already covered by existing tests; just assert no write for clean/virtual.
- AC 5 (keystrokes during the save): testable only with the deferred-write pattern above; the AC offers two implementations ("saved again" or "close not completed"); pick the loop, because aborting leaves the user pressing Cmd+W with nothing happening.
- AC 6: incomplete. Three tests pin the old contract (`:636`, `:647`, `:658`), not one. Also the `closeTab` JSDoc and the e2e comment go stale.
- AC 7: fine.
- Missing: nothing for "pending debounce timer after close". Harmless (see section 3) and needs no test.
- The Issue's "owner confirms the new behavior before it runs" text is superseded by the 2026-11-06 owner decision in the same file; no ask needed.

## 5. Run order

- Blocker: 004 (canvas edit closed inside the debounce window), `Blocked by: 004`, same function. The 004 pre-close flush must run first inside `closeTab`; 015 then saves what the flush wrote into the tab. If 004 slips, 015 can still ship alone (canvas/kanban tabs then behave as today), but then 004 has to be rebased onto it; better to keep the queue order 004 -> 015.
- Series group: `editor.service.ts` (`priority-2026-11-08.md:58`): 004, 015, 016, 017, 018, 019, 076, 089, 094, 095, 028. Run one at a time, 015 right after 004. In the proposed queue, 028 (Duplicate saves the note's unsaved typing first, touches `fs.service.ts`/`path-change.service.ts`, not `closeTab`) comes later; no textual conflict expected.
- Downstream: 016 (File History pre-save snapshot) is `Blocked by 015`; the close-time save now goes through `writeTab`, so whatever 016 hooks into the save path will also cover it.
- Shared files with other queue Issues: `editor.service.ts` (004, 028 if it ends up touching save helpers), `editor.service.test.ts` (004's canvas test lives in `canvas-tab-switch.test.ts`, not here), `help/documentation/03-editor.md` (docs only, low conflict).
- Not verified: the full vitest suite, `pnpm check`, e2e and the real app; no code was run. Risk to know: the dialog behavior on a real disk failure was only reasoned from code, not reproduced.
