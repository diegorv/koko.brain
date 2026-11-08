VERDICT: APPROVED

Review of `git diff main...HEAD` (c70aded64, b2dbe0b0f) in the Issue 05 worktree.

## Acceptance criteria

- [met] Failing first, in `MarkdownEditor.test.ts` with the `clickMenuItem` helper (and the `posAtCoords` stub from Issue 04): with "First paragraph" selected 0..5, Copy calls `writeText` with "First" and leaves the doc unchanged; Cut calls it and removes "First" — the tests "Copy writes the selected text and leaves the doc unchanged" and "Cut writes the selected text and removes it" use `clickMenuItem` and `selectAndAim` (the `posAtCoords` stub). A probe that swapped in main's `MarkdownEditor.svelte` made all 11 new tests fail (11 failed, 18 passed). The file was restored with `git checkout` afterwards. On the branch they pass (29/29).
- [met] Cut with `writeText` rejecting leaves the doc unchanged and shows the copy toast — `handleCut` (MarkdownEditor.svelte:323-330) dispatches only when `writeSelection` returns true. `writeSelection` (305-314) logs with `error('EDITOR-MENU', ...)` and calls `toast.error('Could not copy to the clipboard.')`. The test "Cut leaves the doc unchanged and shows the copy toast when the write fails" passes.
- [met] Paste with `readText` mocked (`vi.mock('@tauri-apps/plugin-clipboard-manager')`, a Tauri boundary) to "abc" replaces the selection with "abc"; with a cursor and no selection it inserts at the cursor; a rejected `readText` shows the paste toast and leaves the doc unchanged — `handlePaste` (336-353) uses `replaceSelection(text)` with `userEvent: 'input.paste'` and `scrollIntoView: true`, and an empty string inserts nothing. Four passing tests cover these cases: over a selection ("abc paragraph"), at cursor 5 ("Firstabc paragraph"), a rejected read (doc unchanged, paste toast), and an empty clipboard (doc unchanged).
- [met] Select all selects 0..doc length — `handleSelectAll` calls `selectAll` from `@codemirror/commands`. The test "Select all selects the whole doc" asserts `main.from === 0` and `main.to === DOC.length`.
- [met] With an empty selection, Cut and Copy render disabled (`data-disabled`) and clicking them changes nothing — `menuHasSelection` is set on every path of `handleContextMenu` (286-294) and drives `disabled`. The handlers also return early on an empty selection, because bits-ui still runs a merged `onclick`. The `it.each(['Cut', 'Copy'])` test asserts `data-disabled`, that `writeText` was not called and that the doc is unchanged.
- [met] The block-link items still work and sit after the separator (existing tests green) — the order test asserts `['Cut', 'Copy', 'Paste', 'Select all', '---', 'Copy link to block', 'Copy block embed']`. The existing block-link unit tests pass, and both existing E2E block-link tests pass.
- [met] E2E in `e2e/specs/copy-block-link.spec.ts`: double-click a word on the Inbox line, right-click it, pick `Copy` (use `getByRole('menuitem', { name: 'Copy', exact: true })`, since "Copy link to block" also matches), and the clipboard holds that word. This proves end to end that the right-click kept the selection — the "Editor context menu" test does exactly this and polls the clipboard for `/^unlinked$/`. I ran `bash scripts/e2e.sh e2e/specs/copy-block-link.spec.ts` myself: 3 passed, exit 0.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: exit 0, 29/29.
- `undo-history-across-notes.test.ts`, `wikilink-click-capture.test.ts` (both mount `MarkdownEditor.svelte`) and `src/tests/lib/architecture/`: exit 0, 11 files, 136/136. The layer rules accept the new `@tauri-apps/plugin-clipboard-manager` import in `core/`.
- Red probe: main's component with the branch's tests gave 11 failed, 18 passed (see criterion 1).
- E2E `copy-block-link.spec.ts`: 3/3 passed.
- The test verdict rests on the files above. The full suite and `pnpm build` are deliver's to run.
- No layer-baseline entry and no composition root were added. No `src-tauri/` change.

## Findings

1. nit, src/lib/core/markdown-editor/MarkdownEditor.svelte:327 — `handleCut` builds `replaceSelection('')` from `editorView.state` after the `await` on the clipboard write. If the selection or the active note changed during that await (a tab switch within the few ms the write takes), Cut would delete text other than what it copied. Fix (optional): keep `const before = editorView.state` before the await and dispatch only when `editorView.state === before`. The window is tiny, so leaving it as is is acceptable.
2. nit, src/lib/core/markdown-editor/MarkdownEditor.svelte:317,324 — the early-return guard on an empty selection skips `view.focus()`, while the Issue says every item ends with it. This path is only reachable by clicking a disabled item, so nothing visible changes. No change needed unless the guard is touched for another reason.
3. Not verified (also listed in the Issue's Notes): `navigator.clipboard.writeText` and the plugin's `readText` from a menu click inside the Tauri WebKit window. The E2E runs the browser build. I also did not check what the plugin's `readText` does when the clipboard holds no text, such as an image: if it rejects, the user sees the paste error toast rather than nothing happening, which still meets "inserts nothing".

## Resolution

1. Fixed. `handleCut` keeps the state from before the clipboard write and deletes only when `editorView.state` is still that state, dispatching `before.replaceSelection('')`. The test "Cut deletes nothing when the selection moves while the clipboard write is pending" holds the write open, moves the selection, then resolves it: before the fix it deleted "paragraph", which it never copied, after it the doc is unchanged.
2. No change, as the review says: only a click on a disabled item reaches that path.
3. Not addressed here: needs a manual check in the Tauri window, which this run cannot do.
