# 015 discovery: closeTab saves first, asks only when the save fails

No `spec.md` in `.scratch/open-itens/`; the Issue is the spec. No earlier work folder repeats this pattern.

## Files that change

- `src/lib/core/editor/editor.service.ts:298-332` closeTab: replace the `ask('... Discard changes?')` at :313-318 with save-first. JSDoc :298-302 rewritten.
- `src/tests/lib/core/editor/editor.service.test.ts:626-790` describe('closeTab'): new save-on-close tests, rewrite :636/:647/:658 to the failed-save contract, add no-write assertions to :626 (clean) and :755 (virtual).
- `help/documentation/03-editor.md:129` new behavior.
- Comments only: `e2e/specs/editor-empty-state.spec.ts:4-7`, `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:292-293`.

## Plan

In closeTab, for a dirty non-virtual tab, in one place (Issue 004 later puts a flush before it):
1. `saved = await saveFileByPath(tabPath)`.
2. If saved and the tab (re-found by path) is still dirty, `saved = await saveFileByPath(tabPath)` once more (keystrokes typed during the first write).
3. If `!saved` or the tab is still dirty: `ask(\`Failed to save ${getFileName(tabPath)}. Close anyway and lose unsaved changes?\`, { title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' })`; false returns and keeps the tab.
4. Existing re-find by path + removeTab path unchanged. A tab gone during the save counts as not dirty; the re-find then returns.

No debounce cancel (Issue Note), no import of exit.service.ts (cycle), ask inlined.

## Prior-art tests

- Deferred `writeTextFile` via `mockImplementationOnce(() => new Promise(res => release = res))`: editor.service.test.ts:331-343.
- Failing write with console.error spy: saveAllDirtyTabs 'returns paths of tabs that failed to save' (:571-590).
- Every new/rewritten test sets `writeTextFile` and `ask` explicitly (clearAllMocks keeps implementations).

## Risks

- e2e specs auto-confirm the old prompt; the dirty close now writes through the e2e fs mock. Not run here (relay runs no e2e); deliver should run the targeted specs listed in the Issue.
- undo-history-across-notes closes a dirty tab; its `writeTextFile` mock resolves, so it saves and closes: only its comment changes.

## Defaults taken

- Prompt text exactly as the Issue writes it (`Failed to save X.`, no colon), which differs slightly from exit.service's multi-file wording; kept as specified.
