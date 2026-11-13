# Refute: Issue 015, closing a dirty tab saves it and closes; prompt only when the save fails

Checked at HEAD `318b6e9b5` (main, 2026-11-12). Read-only. Inputs: `.scratch/open-itens/issues/015-closing-tab-unsaved-text-saves-closes-prompt.md`, `dossier-015.md` (sonnet scout, written at `afc0a9df8`; the two later commits touch only Issue 198 status colors and its docs, not the editor).

## Verdict

- **Bug still present: yes.** Verified in code: `closeTab` (`src/lib/core/editor/editor.service.ts:303-332`) calls `ask('This file has unsaved changes. Discard changes?', ...)` at `:313-318` for every dirty non-virtual tab, writes nothing, and never touches `debouncedSave` (`:227`) or `debouncedSaveFrontmatter` (`:230`). After the answer it only re-finds and removes the tab (`:325-330`). The last commits to the file (`7b71c217f`, `3df680423`, `53e123dbb`, all 2026-11-05) did not change this behavior; `53e123dbb` (Issue 38) only added the named button labels.
- **Inference, not verified:** that the 2 s timer usually fires and writes the tab *while* the native dialog is open. It depends on JS timers and the fs IPC running while the Tauri `ask` modal is up. I did not read the dialog plugin's Rust side or run the app. The Issue's core claim (a prompt on every close inside the debounce window) does not depend on it.
- **Impact for this owner: medium.** Daily core editing; Cmd+W or tab x within 2 s of typing (0.5 s after a property edit, which covers meta-bind and the Properties panel, `src/lib/features/properties/properties.service.ts:106`) always prompts. Severity is low: nothing is lost unless the user picks "Discard Changes", and then only the last edit before the timer fires. The real cost is a misleading prompt the owner learns to click through. The Issue's "ux/high" is fair for frequency, not for harm.
- **Complexity: S. Risk: low.** One branch of one function, plus tests and one docs line. No store or `.logic.ts` changes, no Rust, no CodeMirror, no indexing path beyond what every autosave already does (`writeTab` `:187-204` -> `markSavedByPath` -> `notifyAfterSave`). Callers verified: `EditorTabs.svelte:89` (x button), `EditorTabs.svelte:104` (context menu Close), `closeActiveTab` (`editor.service.ts:335-339`) from `global-keybindings.ts:84` (Cmd+W) and `commands.ts:112`. Store content is current at close time for markdown tabs: CodeMirror's update listener calls `onDocChanged` synchronously (`src/lib/core/markdown-editor/setup/editor-extensions.ts:191`, wired at `MarkdownEditor.svelte:128`). Canvas is the exception, which is what 004 fixes.
- **Acceptance criteria: testable; four of seven fail today (1, 2, 5, 6), as they should.** AC 3 and 4 are regression guards that pass today. But AC 5 leaves two implementations open, AC 6 names one of three tests that pin the old contract, and the "What to build" text still says the owner must confirm before it runs. Each of these can make a relay-lite agent guess or stop (see Must-fix).
- **Recommendation: run after edits, after 004 is merged** (same function; series group `editor.service.ts` in `priority-2026-11-08.md:58`).

## Must-fix edits to the Issue text

### M1. Drop the stale "owner confirms" sentence from What to build

Evidence: What to build ends with "the owner confirms the new behavior before it runs, and both are updated with it." The Owner decision block below supersedes it, but a relay agent that reads What to build first can treat it as an open owner gate. Owner memory "Owner-decision Issues block" says such Issues come back blocked.

Replace:

> This changes documented behavior (help/documentation/03-editor.md:129) and the pinned test at src/tests/lib/core/editor/editor.service.test.ts:658; the owner confirms the new behavior before it runs, and both are updated with it.

with:

> This changes documented behavior (help/documentation/03-editor.md:129) and three tests that pin the old prompt (src/tests/lib/core/editor/editor.service.test.ts:636, :647, :658). The owner approved the new behavior on 2026-11-06 (see Owner decision); rewrite those tests to the new contract as part of this Issue.

### M2. AC 6 must name all three tests that pin the old contract, and authorize rewriting them

Evidence: three tests assert the prompt on a dirty close, not one:
- `editor.service.test.ts:636-645` 'prompts for dirty tab and closes on confirm' (`expect(ask).toHaveBeenCalled()` at `:643`)
- `:647-656` 'does not close dirty tab when user cancels' (`ask` resolves false, tab stays, `:654-655`)
- `:658-673` 'asks with Discard Changes / Cancel labels and keeps the tab when declined'

With the fix, `:636` and `:647` fail too. The user's global rules forbid weakening or deleting tests without approval, so an agent told about only `:658` may stop at the other two.

Replace AC 6:

> - [ ] help/documentation/03-editor.md:129 describes the new behavior; the test at editor.service.test.ts:658 is updated to the new contract and the change is named in the commit message.

with:

> - [ ] help/documentation/03-editor.md:129 describes the new behavior. The three tests that pin the old prompt, editor.service.test.ts:636 ('prompts for dirty tab and closes on confirm'), :647 ('does not close dirty tab when user cancels') and :658 ('asks with Discard Changes / Cancel labels ...'), are rewritten to the new contract: their Cancel-keeps-the-tab and exact-labels assertions move to the failed-save case (AC 2), so no coverage is dropped. The commit message names the behavior change and the three rewritten tests.

### M3. AC 5 must pick one behavior

Evidence: AC 5 says "it is saved again (or the close is not completed)". The two choices need different tests and different code. `writeTab` captures `tab.content` before the write (`editor.service.ts:191`) and `markSavedByPath` sets `savedContent` to that captured text (`editor.store.svelte.ts:91-96`), so a keystroke that lands during the write leaves the tab dirty afterwards. Removing it then drops the keystroke silently. Data is at risk, so the case is worth one small loop. A "do not close" choice would make Cmd+W silently do nothing.

Replace AC 5:

> - [ ] Keystrokes typed while the close-time save is in flight are not silently dropped: if the tab is dirty again after the save, it is saved again (or the close is not completed) before removal.

with:

> - [ ] Keystrokes typed while the close-time save is in flight are not dropped: closeTab calls saveFileByPath(path) again until the tab (re-found by path) is clean or gone, and only then removes it. If any of those saves fails, it asks with the failed-save prompt (AC 2). Test with a deferred writeTextFile (the pattern at editor.service.test.ts:331-343): start closeTab, call editorStore.updateContent with new text while the first write is pending, release it, await closeTab; writeTextFile was called with the first text and then the new text, ask was not called, and the tab is gone.

## Should-fix edits

### S1. Exact prompt text and button labels

Evidence: the Issue gives "Failed to save X. Close anyway and lose unsaved changes?" but no labels. The exit prompt uses "Failed to save: X." (with a colon) and `okLabel: 'Close Anyway'`, `cancelLabel: 'Cancel'` (`src/lib/core/vault/exit.service.ts:35-38`). Issue 38 (`53e123dbb`) made named action labels the convention for native confirms. Add to AC 2:

> The prompt is `ask(\`Failed to save ${fileName}. Close anyway and lose unsaved changes?\`, { title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' })`, with fileName from getFileName(path) (already imported at editor.service.ts:5).

### S2. Do not import `confirmDiscardFailedSaves` into editor.service.ts

Evidence: `exit.service.ts:2` imports `saveAllDirtyTabs` from `editor.service.ts`, so the reverse import makes a file-level cycle. The architecture tests check feature cycles (`src/tests/lib/architecture/feature-cycle.test.ts`) and layer rules, not cycles between two `core/` files, so nothing would flag it. Add to Notes: "Inline the single `ask` call in closeTab; do not import from core/vault/exit.service.ts (it already imports editor.service.ts)."

### S3. Do not cancel the debounce timers in closeTab

Evidence: `saveAllDirtyTabs` cancels both timers (`editor.service.ts:276-277`). Copying that into closeTab would cancel the pending autosave of *other* dirty tabs. The guard test `:720-737` cannot catch it, because the debounce mock in that file runs `fn` synchronously (`editor.service.test.ts:28-45`), so the other tab's save has already run when closeTab is called. Leaving the timer armed is harmless: `saveDirtyTabs` finds no dirty tab and returns (`:210-213`), and `saveFileByPath` queues behind any in-flight save of the same path (`:171-179`). Add to Notes: "Leave debouncedSave and debouncedSaveFrontmatter alone in closeTab."

### S4. Set mocks explicitly in every new or rewritten test

Evidence: every `beforeEach` in the file calls `vi.clearAllMocks()` (e.g. `:615`). In vitest 5.1.0 (installed) that clears calls only and keeps implementations (`node_modules/vitest/dist/index.d.ts:776-778`). At the start of `describe('closeTab')`, `writeTextFile` still has the implementation set at `:566` (it throws for `/vault/a.md`) and `ask` keeps whatever the previous test set (`:661` sets false). A new test that relies on the bare mock passes or fails depending on path name and test order. Add to the AC 1 and AC 2 text: "set writeTextFile (mockResolvedValue / mockRejectedValueOnce) and ask explicitly in each test."

### S5. Place the save after 004's pre-close flush

Evidence: Issue 004 leaves its mechanism open ("flush the canvas before removeTab (a pre-close hook ...), or have the path-scoped writer save a path with no open tab straight to disk", 004 What to build). If 004 adds a pre-close flush to closeTab, the 015 save must run after it, or a canvas edit still goes unsaved. Add to Notes: "If 004 added a pre-close flush to closeTab, run the dirty check and save after it, so what the flush writes into the tab is saved."

### S6. Stale comments and JSDoc the change makes wrong

Evidence (CLAUDE.md section 8 of the global rules: update comments the change makes wrong):
- `closeTab` JSDoc `editor.service.ts:298-302` ("prompts the user for confirmation before discarding").
- `e2e/specs/editor-empty-state.spec.ts:4-7` ("`closeTab` prompts via `ask('Discard changes?')` for dirty tabs"). The loop still works after the fix because `setAskResponse(true)` only goes unused.
- `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:292-293` ("dirty: the discard dialog is mocked to confirm"). The test still passes because `writeTextFile` resolves there (`:8`).

Add a bullet to AC 6 or Notes listing these.

### S7. AC 3 should assert no write

Evidence: `closes a clean tab directly` (`:626-634`) and `closes virtual tab without dirty check` (`:755-768`) assert `ask` not called but not `writeTextFile`. Change AC 3 to: "A clean tab and a virtual tab close with writeTextFile and ask both not called (extend the tests at :626 and :755)."

### S8. Line-reference touch-ups

- What to build "closeTab (src/lib/core/editor/editor.service.ts:303-321)" -> `:303-332`; the `ask` is at `:313-318`.
- Evidence "exit.service.ts:15-23 and :33-40" -> `:15-23` and `:32-39`.
- Evidence "writeTab :187-198" -> `:187-204`.

### S9. State the limits once

Add to Notes: "After a failed close-time save and Cancel, no retry is armed (the 5 s retry exists only inside saveDirtyTabs, :217-219). The tab stays dirty until the next edit arms the autosave. writeTab also shows its 'Failed to save file.' toast (:201) before the prompt. Both are acceptable; add no code for them."

## Dossier errors

1. **Wrong claim about mocks.** The dossier's AC review says "add `writeTextFile.mockResolvedValue(undefined)` explicitly; the bare `vi.fn()` also resolves, so it works either way." The second half is wrong. `vi.clearAllMocks()` keeps implementations in vitest 5.1.0 (`node_modules/vitest/dist/index.d.ts:776-778`), so in `describe('closeTab')` `writeTextFile` still runs the `:566` implementation, which throws for `/vault/a.md`. The test passes with `/vault/note.md` only because of the path name. The explicit mock is required, not optional (S4).
2. **HEAD.** Checked at `afc0a9df8`; HEAD is now `318b6e9b5`. The two newer commits do not touch the editor, so no finding changes.
3. **Line numbers.** `confirmDiscardFailedSaves` is at `exit.service.ts:32-39`, not `:33-40`. The undo-history comment is at `:292-293` (dossier "~290"). The e2e comment is at `:4-7`, not `:5-8`.
4. **Missing risk: debounce cancel.** The dossier says correctly that not cancelling the timer is harmless. It does not warn that *cancelling* it, as `saveAllDirtyTabs` does, would drop other tabs' pending saves, and that the existing guard `:720` cannot catch that under the synchronous debounce mock (S3).
5. **Unverified loop termination.** The dossier's "loop until clean" helper is right, and I adopt it in M3. It did not check whether an after-save observer re-dirties the tab synchronously, which would make the loop write again. I found no synchronous one: auto-organize defers to a timer (`src/lib/features/auto-organize/auto-organize.service.ts:224-235`) and mods defer `onNoteSaved` with `setTimeout(0)` (`src/lib/plugins/mods/mods-host.service.ts:636-640`). I did not trace every observer, e.g. `todoist-sync/sync-scheduler.service.ts:90`, which can write tab content through `note-writer.service.ts:83`, and the owner does not use that sync. Inference: low risk. The existing suite is the check.
6. **Impact rating.** "Impact medium (frequent trigger, low severity)" is consistent with this review. The Issue's "ux/high" overstates the harm.
7. Everything else in the dossier checked out: the callers, the import-cycle warning, the three pinned tests, the double toast, the no-retry-after-Cancel limit, and the 004 ordering.

## Not verified

No tests, check, build, e2e or app run. I did not reproduce the dialog-time autosave or the behavior of the Tauri `ask` modal on macOS; those are inferences. I did not read the e2e fs mock to see whether `writeTextFile` succeeds there.
