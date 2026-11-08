VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a switch from a tab scrolled to 192 to a fresh tab never reports scrollTop 192 for the new tab at "after focus" or "frame 1" (through the real `TAB_SWITCH` scroll lines or a scroll spy on `scrollDOM`) — `MarkdownEditor.test.ts` "opens a fresh tab at the top, never at the previous tab scroll" reads the real `scroll after focus` / `scroll frame 1` / `scroll after restore` log lines and expects 0. I put main's `MarkdownEditor.svelte` into the worktree and ran the file again: this test failed with `expected 192 to be +0`, and the saved-tab test failed with `expected 192 to be 300`. With the branch's component, both pass.
- [met] A saved tab still lands on its saved scrollTop, and a fresh tab on 0 — the saved-tab test (300, switching back from a tab at 192) checks `after focus`, `frame 1` and the final `scrollDOM.scrollTop` = 300. The fresh-tab test checks that the final `scrollTop` is 0. `restoreTabScroll` (`MarkdownEditor.svelte:419-425`) writes `saved.scrollLeft/scrollTop`, or 0/0 for a fresh tab, right after `view.focus()` and again in frame 1.
- [met] The Issue 15 logging tests stay green — the step names are unchanged (`after focus`, `frame 1`, `after restore`, `frame 2`, `frame 3`, `event`). `pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: 15/15 passed, and that includes the whole existing `tab-switch scroll log` describe.
- [met] Not verified by the agent: the owner's next session shows no "after focus" jump on fresh tabs — this one is for the owner's session to confirm, not something the agent can check. The code path behind it is confirmed: the `@codemirror/view` focus observer (`dist/index.js:5297-5304`) writes `inputState.lastScrollTop` synchronously during `contentDOM.focus()`, and the new write right after it overrides that value in the same task, before any scroll event or measure (`updateForFocusChange` is a 10 ms timeout; measure runs from the scroll event or rAF).

## Findings

1. minor — `src/lib/core/markdown-editor/MarkdownEditor.svelte:445-452`. The Issue says "Keep the rAF restore only if the logs show a later write still needs it". The discovery note turns that around ("the Issue allows dropping it only with log evidence") and keeps the frame-1 write without any log evidence. No test covers the reason given for keeping it (a saved offset clamped by the pre-measure height estimate), so removing the write would break no test. This does not regress anything, because main already made that frame-1 write. Fix: when the owner's next session is analysed, compare `frame 1` with `after restore` for saved tabs. If they never differ, drop the frame-1 write in a follow-up. If they do differ, add a test that reproduces the clamp.
2. nit — `src/lib/core/markdown-editor/MarkdownEditor.svelte:445-447`. The comment says the second write is "a no-op otherwise", but that is not guaranteed. CodeMirror's first measure after `setState` can apply scroll-anchor correction (`dist/index.js:8218-8310`), which moves `scrollTop` off the saved offset. The frame-1 write then moves it back, which costs one more scroll and measure. main has the same behavior. Fix: change the comment to say the write re-pins the saved offset after CodeMirror's first measure, and drop "a no-op otherwise".

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (212 files).
- `pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: 15/15 passed with the fix. Run against main's component, the 2 new tests fail and the other 13 pass, so the tests do fail first.
- These files also render `MarkdownEditor.svelte`, or are where the build report saw a flake: `wikilink-click-capture.test.ts`, `undo-history-across-notes.test.ts`, `extensions/live-preview/widgets/image-widget.test.ts`, `features/search/SearchResult.test.ts` and `editor-host.test.ts`. Run together: 5 files, 93/93 passed. The `editor-host.test.ts` failure in the build report did not reproduce here.
- My test verdict rests on these files: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`, `wikilink-click-capture.test.ts`, `undo-history-across-notes.test.ts`, `extensions/live-preview/widgets/image-widget.test.ts`, `editor-host.test.ts` (all under `src/tests/lib/core/markdown-editor/`) and `src/tests/lib/features/search/SearchResult.test.ts`.
- I did not run the full suite or `pnpm build`; deliver runs them.
- Scope: the diff touches only the tab-switch effect, its test file and the Issue's `work/21/discovery.md`. It adds no layer-baseline entry and no composition root. All added lines use tab indentation.
- The test file's `HTMLElement.prototype.focus` wrapper is not restored after the tests. It is file-scoped, because vitest isolates each test file, and it only reads `preventScroll` so that CodeMirror's `focusPreventScroll` detects the option as WebKit supports it. That is acceptable for a jsdom boundary shim.

## Resolution

1. Deferred, not rejected. The finding is correct, but its fix needs data from the owner's next session (`frame 1` vs `after restore` for saved tabs), which this run cannot produce. The frame-1 write stays as on main until then; the main session should carry the comparison into a follow-up Issue.
2. Fixed. The comment above the frame-1 `requestAnimationFrame` in `MarkdownEditor.svelte` now says the write re-pins the saved offset after CodeMirror's first measure (clamp or scroll-anchor correction) and no longer calls it a no-op.
