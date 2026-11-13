VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts: htmlLinksToMarkdown('<p>Fact<sup><a href="https://w.org/#c1">[1]</a></sup> and <a href="https://x.dev">more</a></p>', 'Fact[1] and more') returns text that does not contain '[[' and contains the label as escaped brackets linking to https://w.org/#c1. It fails today. — The test "escapes brackets in an anchor label so [1] does not become a wikilink" (paste-html-link.logic.test.ts:123-128) asserts `not.toContain('[[')` and the exact output `Fact[\[1\]](https://w.org/#c1) and [more](https://x.dev)`. I put main's paste-html-link.logic.ts into the worktree temporarily and ran the file: this test failed, along with the other two new tests (3 failed, 19 passed), then I restored HEAD. On the branch it passes. The fix is escapeLinkLabel at paste-html-link.logic.ts:65-67, called at :105. A Lezer GFM parse of the output shows one `Link` node with `Escape` children for `\[` and `\]`, so live preview's linkHandler (inline/handlers/markdown-link-handlers.ts) styles it as a link, and the Escape handler (mark-handlers.ts:40-48) hides the backslashes. WIKILINK_DECORATION_RE no longer matches, because `[\[` is not `[[`.
- [met] A fragment that contains a <table> returns null from htmlLinksToMarkdown, so pasteTsvHandler builds the table (a test in the same file). The test's table holds a cell link whose URL is not in the plain text, so it fails today. Existing Slack, multi-line and null-fallthrough cases in that file still pass. — paste-html-link.logic.ts:86 returns null when `doc.querySelector('table')` finds a table, so the handler returns false (paste-html-link-handler.ts:29) and pasteTsvHandler runs next (live-preview.ts:104). The test at paste-html-link.logic.test.ts:135-142 uses `https://j.io/1`, a URL that is not in the plain text `Name\tLink\nTask\tJIRA-1`. It asserts null, and that the real clipboardToMarkdownTable returns the two-column table. Against main's logic it failed; on the branch it passes. The 19 earlier cases, including Slack, multi-line and null-fallthrough, pass on the branch.
- [met] Gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (0 errors, 0 warnings). Targeted tests pass: paste-html-link.logic.test.ts and paste-tsv.logic.test.ts, 41 of 41, exit 0. The full `pnpm vitest run` is for deliver to run.

## Checks run

- `pnpm check`: exit 0, 232 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.test.ts src/tests/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.test.ts`: exit 0, 2 files, 41 tests. My test verdict rests on these two files. paste-html-link.logic.test.ts is the only test file for the changed code. No test imports paste-html-link-handler.ts, which changed only in a comment.
- Red check: the same paste-html-link test file against main's `paste-html-link.logic.ts` failed exactly the 3 new tests. I restored the file from HEAD after the run, and the worktree is clean.
- Lezer probe (`@lezer/markdown` with GFM) of both escaped outputs: each label is one `Link` node, and `\\`, `\[` and `\]` parse as `Escape` nodes.
- No added line is indented with spaces. Both fix commits follow docs/COMMITS.md (Context, Problem, Solution, Behavior, Files).

## Findings

1. nit, src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:26: `TABLE` and `TR` in BLOCK_TAGS are now unreachable. The new early return at :86 rejects any fragment with a table, and the HTML parser drops a `<tr>` that is outside a table. The build report kept them on purpose for Issue 167, which will rework table extraction. Fix: no change needed now. Issue 167 should either use them or remove them.
2. nit, src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts:86: any `<table>` anywhere in the fragment now turns off link conversion. HTML email clients often lay out messages with tables, so a paragraph copied from such an email with a link whose URL appears only in the HTML now pastes as plain text without the URL. Before this change, the URL was kept but the cells were fused. This is the scope the owner set ("leave any fragment that contains a <table> to the TSV paste handler"), so there is nothing to change in this Issue. Fix: add this case to Issue 167 when it converts table links.

## Resolution

Both findings are correct and both ask for no change in this Issue, so the deliver step changed no source or test file.

1. Accepted, deferred: `TABLE` and `TR` in `BLOCK_TAGS` stay; a note in Issue 167's Notes asks it to use or remove them.
2. Accepted, deferred: the layout-table (HTML email) case is recorded in Issue 167's Notes, per the owner's scope for this Issue.
