VERDICT: APPROVED

Re-review round 2 of the fix commit 7caeaf8a1 (`git diff 83ecc33f7..HEAD`).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `CODE_FENCE_OPEN_RE` is `/^\s*(`{3,}|~{3,})/` (`completion.logic.ts:35`); the closing check uses `line.trim() === run`, so an indented closing fence also closes. Logic test "returns null inside a fenced code block indented in a list item" covers spaces, a tab and the prefix coming back after the indented fence closes. Passing. |
| 2 | nit | resolved | `detectTagContext` sets `TAG_REST_RE.lastIndex = pos` on the sticky `/[\p{L}\d_/-]*/uy` and returns `to: pos + rest` (`completion.logic.ts:86-88`). Logic test (`#project more` at 4 -> `to: 8`, nested `#area/sub-2`, no rest) and a CodeMirror accept test (`see #pro|ject and` -> `see #prose and`) pass. |
| 3 | nit | resolved (frontmatter part); rejection stands (HTML-comment part) | `FRONTMATTER_RE` is the indexer's `FRONTMATTER_REGEX` form (`utils/tag-extraction.ts:1`) without the capture group; test "treats an opening --- with trailing spaces as body" passes, and the existing closed/unclosed frontmatter tests still pass. The HTML-comment rejection holds: the only effect is a dismissable list, no data change, and it would need a second multi-line scanner. |
| 4 | nit | resolved | `inFrontmatterOrFence` runs the frontmatter regex once and splits only `docText.slice(bodyStart, lineStart)` (`completion.logic.ts:56-67`). |

## Acceptance criteria re-checked

- [met] A pure context detector returns the typed prefix only where a tag can start: not after a non-space character (`foo#`), not in inline code, a fenced block or frontmatter, and not for `# ` (a heading) (logic tests) — `completion.logic.ts` still imports only `utils/fuzzy-match`; all prior detector tests unchanged and passing, plus the indented-fence and `---  ` tests.
- [met] Accepting a suggestion replaces the typed prefix with the tag name; a nested tag inserts in full (completion tests) — `completion.test.ts` "replaces the typed prefix with the tag name", "replaces the whole tag when the cursor sits inside it" and "inserts a nested tag in full" pass through real CodeMirror `autocompletion` + `acceptCompletion`.

## Findings

None open or new.

- Regressions: the only changed expectation is the old "reads only up to the cursor" test, whose `to` moved from 4 to 8; that is the intended behavior change of finding 2, and it still asserts `query: 'pro'` and adds the no-rest case (`to: 4`). No test deleted or weakened.
- Scope: the fix touches only `tag/completion.logic.ts`, `tag/completion.ts` (doc comment), their two test files and review.md. No scope creep.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/extensions/tag/ src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`: exit 0, 3 files, 62 tests passed.
- The full suite and `pnpm build` belong to deliver. Not tried in the running app.
