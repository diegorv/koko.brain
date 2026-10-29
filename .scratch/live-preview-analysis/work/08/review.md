VERDICT: APPROVED

# Issue 08 review: fenced code is respected

Reviewed `git diff main...HEAD` (a8f94f26..eba94112). Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/`, tests under `src/tests/lib/core/markdown-editor/extensions/live-preview/`.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (211 files).
- Changed and related test files, run directly: `parsers/{collection-block,combined-block-structures,comment,fenced-code-block,mermaid,queryjs-block}.test.ts`, `plugins/{block-comment-field,collection-block-field,mermaid-field,queryjs-block-field,special-fence-detection,code-block-field}.test.ts`: 12 files, 182 tests passed.
- Whole `src/tests/lib/core/markdown-editor`: 100 files, 1428 tests passed.
- Characterization tests against pre-switch source (`git checkout f7e620e2 -- live-preview/`, then restored): `special-fence-detection.test.ts` 34/34 passed.
- New tests against main's code (restored afterwards): the three `%%` tests in `block-comment-field.test.ts` fail with main's `block-comment-field.ts`. Both nested-fence tests in `queryjs-block-field.test.ts` fail with main's `queryjs-block-field.ts` + `parsers/queryjs-block.ts`.
- A throwaway probe test, deleted and never committed, covered these cases:
  - With an `md` code language, `resolveInner` on the nested fence returns `FencedCode<Document<FencedCode<Document`, so the overlay mount exists. `findAllFencedCodeBlocks` still returns one block, and `findAllQueryjsBlocks` returns none. Source check: in `@lezer/common` 1.5.4, `TreeNode.nextChild` only follows non-overlay mounts (`index.js:763`). In `@lezer/markdown` 1.8.1, `parseCode` mounts code languages as overlays (`index.js:2053`).
  - Behavior on a partial parse (finding 1).
  - Edge cases: a table followed by a fence, an indented close fence, a close fence with trailing spaces, and a fence after a list item all render. A close fence indented with a tab stays unclosed, as before. An HTML block is covered in finding 3. A `%%` comment wrapping a closed fence still hides it.
  - Timings (finding 4).

My test verdict rests on these files: `plugins/special-fence-detection.test.ts`, `plugins/block-comment-field.test.ts`, `plugins/queryjs-block-field.test.ts`, `parsers/{fenced-code-block,comment,queryjs-block,mermaid,collection-block,combined-block-structures}.test.ts`, `plugins/{mermaid-field,collection-block-field,code-block-field}.test.ts`.

## Acceptance criteria

- [x] **Characterization tests for the current scanners land first: met.** f7e620e2 adds only `plugins/special-fence-detection.test.ts` (34 tests through the `compute*` functions). It comes before the fix commits 828cb93a, 228b0334 and c2e5c681, and it passes against that commit's unchanged source (run above).
- [x] **Test: `%%` lines inside a fenced code block are shown as code: met.** The `shows %% lines inside a fenced code block as code` test (```` ```matlab ```` with two `%%` lines, 0 decorations) is in `plugins/block-comment-field.test.ts`. The same file covers the opening and closing cases, and `parsers/comment.test.ts` covers `isCode`. The fix is in `parsers/comment.ts:49-58` and `plugins/block-comment-field.ts:17-29`. All three field tests fail on main.
- [x] **Test: a queryjs fence nested in a ````md fence is not rendered and its script never runs: met.** In `plugins/queryjs-block-field.test.ts` (`fenced code awareness`), a real jsdom `EditorView` with a preloaded `md` code language holds no `QueryjsBlockWidget` and no `.cm-lp-qjs-block` DOM. `toDOM` is what runs the script, so no widget means no run. A top-level block next to the nested one still renders. Both tests fail on main.
- [x] **Mermaid and collection use FencedCode nodes; their existing tests pass: met.** `parsers/mermaid.ts:21-30` and `parsers/collection-block.ts:21-30` go through `findSpecialFenceBlocks` (`parsers/fenced-code-block.ts:127-147`). The opening regexes are unchanged (mermaid accepts tildes, collection is backtick-only). The parser tests moved to the state API with equal or stronger assertions, plus a nested-fence test each. The field and combined-structure tests pass.

## Rules

- Layer rules: all changes stay in `core/markdown-editor`, with no imports from `features/` or `plugins/`.
- Tests: every changed source file has updated tests. No store or `.logic.ts` mocks were added.
- JSDoc covers the new exports and interface fields. Indentation is tabs.
- Nothing became orphaned: `getAllLines` is still used by `block-comment-field.ts` and others. `grep -r` finds no remaining reference to `findQueryjsBlock`, `findMermaidBlock` or `findCollectionBlock` in `src/`, `docs/` or `e2e/`.
- No scope creep. The `docs/LIVE-PREVIEW.md` template update matches the new pattern.

## Findings

1. **Low: detection now depends on how far the parse has progressed.** Location: `parsers/fenced-code-block.ts:127` (through `findAllFencedCodeBlocks`) and `core/block-decorator.ts:79`.
   - Probe: a 173 KB note has a 3013-char tree right after `EditorState.create`. After a tab-switch-style full replace from a complete tree it reaches 149 689 chars. In both cases a queryjs block at the end is not found, while main's regex scanners found blocks anywhere at once.
   - Block decorators do not rebuild on a parse-only transaction: `checkUpdateAction` returns `'none'`, and the queryjs `gate` drops it. A special block past the parsed range therefore shows as source until something triggers a rebuild:
     - a cursor-line change,
     - an edit,
     - the tab-switch rAF `forceDecorationRebuild` (`MarkdownEditor.svelte:340`),
     - the scroll debounce.
   - `code-block-field.ts` already works this way, the build report says so, and the effect only shows on notes larger than about 3 KB at open or about 20 ms of parsing at a switch. No change needed for this Issue.
   - Optional follow-up: rebuild block decorators when `syntaxTree(update.startState) !== syntaxTree(update.state)`. This would fix code blocks too.
2. **Low (follow-up, outside the Issue's listed scope): meta-bind-button still uses the line regex scanner.** Location: `plugins/meta-bind-button-field.ts:20` with `parsers/meta-bind-button.ts:19`. A ```` ```meta-bind-button ```` nested in a ````md fence still renders. That does not match the Issue's headline ("never interpreted as live-preview syntax"), but the Issue only names queryjs, mermaid and collection, and no other Issue tracks it.
   - Fix: a new Issue that moves it to `findSpecialFenceBlocks`.
3. **Info: behavior change for a special fence inside an HTML block.** Location: `parsers/fenced-code-block.ts:127`. Probe: `<div>\n```queryjs\n…\n```\n</div>` is no longer rendered, where main's regex rendered it. Per CommonMark the fence is HTML-block content, and `code-block-field` already treats it that way.
   - No fix. Mention it in the delivery commit's Behavior section next to the indented-close-fence change.
4. **Info: per-rebuild cost.** Location: `plugins/block-comment-field.ts:17-25`. Probe on a 4400-line note: `computeBlockComments` went from 0.46 ms to 1.29 ms and `computeQueryjsBlocks` from 0.36 ms to 0.44 ms. `findAllFencedCodeBlocks` now runs five times per rebuild (code-block, block-comment, mermaid, queryjs, collection), each iterating every inline node.
   - This is within budget, so no change is needed. If profiling ever flags it, memoize `findAllFencedCodeBlocks` in a `WeakMap` keyed on the `Tree`, or skip the tree walk when the document has no `%%` line.
