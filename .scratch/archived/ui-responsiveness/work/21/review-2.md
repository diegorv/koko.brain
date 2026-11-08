VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands (deferred) | The fix step left the frame-1 `restoreTabScroll()` in place (`MarkdownEditor.svelte:453`), the same write main makes, and gave its reason under "## Resolution". The deferral holds up: deciding to drop the write needs the owner-session comparison of `frame 1` with `after restore` for saved tabs, and no test in this worktree can produce that. Keeping a write that main already makes regresses nothing. The main session still has to file the follow-up Issue. |
| 2 | nit | resolved | `git diff 37614e3a..HEAD` changes only the comment at `MarkdownEditor.svelte:445-448`. "a no-op otherwise" is gone, and the comment now names the clamp and the scroll-anchor correction from CodeMirror's first measure. No code changed. |

## Acceptance criteria re-checked

- [met] Failing first: a switch from a tab scrolled to 192 to a fresh tab never reports scrollTop 192 for the new tab at "after focus" or "frame 1" (through the real `TAB_SWITCH` scroll lines or a scroll spy on `scrollDOM`) — the fix round changed no code or tests (comment-only diff). `pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` passes 15/15, and that includes the fresh-tab test. Round 1 verified that it failed first against main.
- [met] A saved tab still lands on its saved scrollTop, and a fresh tab on 0 — `restoreTabScroll` (`MarkdownEditor.svelte:419-425`) is unchanged. The saved-tab (300) and fresh-tab (0) tests pass in the same run.
- [met] The Issue 15 logging tests stay green — the `tab-switch scroll log` describe passes in that same 15/15 run, and the step names are unchanged.
- [met] Not verified by the agent: the owner's next session shows no "after focus" jump on fresh tabs — the owner checks this in a session, not the agent. The code path is unchanged since round 1, which confirmed it.

## Findings

1. nit — `src/lib/core/markdown-editor/MarkdownEditor.svelte:445`. The new comment says "Re-pin the saved offset", but `restoreTabScroll` writes 0/0 for a fresh tab, which has no saved offset. Fix (optional): change it to "Re-pin the tab's scroll offset (saved, or 0 for a fresh tab)".

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (212 files).
- `pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: 15/15 passed.
- Fix-round scope: `MarkdownEditor.svelte` (a 3-line comment) and `work/21/review.md` (Resolution). The round has no test changes, no deleted or weakened tests, no layer-baseline or composition-root change, and the comment uses tab indentation.
- I did not run the full suite or `pnpm build`; deliver runs them.
