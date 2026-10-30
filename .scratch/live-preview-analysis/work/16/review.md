VERDICT: APPROVED

# Review: Issue 16, one malformed construct must not disable inline live preview

Reviewed `git diff main...HEAD` (7a406c79..e131a529) in the worktree.

## What I ran myself

- `vitest run` on the three changed test files (`inline/handlers/markdown-link-handlers.test.ts`, `inline/inline-formatting-plugin.test.ts`, `inline/pipeline-dom.test.ts`): 62/62 pass.
- Red check: I restored `markdown-link-handlers.ts` from `main` and ran the same files. Both empty-label handler tests fail. I then restored `inline-formatting-plugin.ts` from `main` too. All 8 new tests fail: 2 link-handler, 4 isolation, and 2 DOM tests with "plugin crashed". After that I restored both files from HEAD, and the tree is clean.
- `vitest run src/tests/lib/core/markdown-editor/extensions/live-preview` (the tests of the changed code): 91 files / 1298 tests pass.
- `pnpm check`: 0 errors, 0 warnings.
- Temporary probe (deleted, not committed): I ran 62 malformed snippets through `buildInlineDecorations` with a fresh copy of every production handler, bare and inside a paragraph. The snippets covered `[]()`, `![]()`, `[[]]`, `[[|]]`, `====`, `%%%%`, `<>`, `` `` ``, `^`, `[^]`, `#` and others. No handler threw (`appendLog` was never called), so isolation is not hiding another live bug. Mounting `06-links.md` with the full stack: no `console.error` and no `LP-INLINE` log.

My test verdict rests on these test files: `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts`, `.../inline/inline-formatting-plugin.test.ts` and `.../inline/pipeline-dom.test.ts`, plus the rest of the `live-preview` test directory as a regression check.

## Acceptance criteria

- [x] **jsdom mount: a note with `[](https://example.com)` and `# Heading` hides the `#` off the cursor line and does not log "plugin crashed".** Met. `pipeline-dom.test.ts:296-309`. `.cm-lp-h1` is the heading's line decoration (`heading-handler.ts:18`), so `textContent === 'Heading'` shows that the `# ` replace was applied. It fails on `main`: `.cm-lp-h1` is null and the console spy sees "plugin crashed".
- [x] **`linkHandler` emits no zero-length range for `[](url)` and `[][ref]`.** Met. `markdown-link-handlers.test.ts:109-134` calls the handler directly, so the pipeline isolation cannot hide a throw. On `main` it fails with `RangeError: Mark decorations may not be empty`. The fix is at `markdown-link-handlers.ts:50-52`, with the JSDoc updated at :13-14.
- [x] **A handler that throws on one node leaves the decorations of other nodes in place.** Met. `inline-formatting-plugin.test.ts:241-244` also checks that the throwing node's partial push is rolled back. :246-255 covers other handlers on the same node, :257-267 covers line handlers, and :269-281 checks the log is written once. Implemented by `runIsolated` (`inline-formatting-plugin.ts:67-92`).
- [x] **`06-links.md` mounts without a plugin crash.** Met. `pipeline-dom.test.ts:313-322`, which fails on `main`. See finding 1 for how fragile its coverage is.
- [x] **Issue item 2: "drops empty `Decoration.mark` ranges".** Met in substance, and the deviation is justified. I confirmed that `MarkDecoration.range()` throws when `from >= to` (`node_modules/@codemirror/view/dist/index.js:316-318`). An empty mark therefore never reaches the array, and a post-filter would be dead code. The handler isolation catches the throw at its source and rolls back the node's other pushes, so the result is never a half-hidden link.
- [x] **Issue item 2: throwing handler logged once with `appendLog`.** Met. Logs go out under the `LP-INLINE` tag, deduplicated per handler object through a module-level `WeakSet`.

## Rules check

- Layers: `core/` imports `utils/log.service`. Allowed.
- Tests exist for every changed source file. Only `log.service` is mocked, and it is a side-effect service. No store or `.logic.ts` mocks.
- Performance: the build adds one closure and one try/catch per handler call. That is negligible next to the tree walk. The viewport and `checkUpdateAction` gates are unchanged.
- The `scratch` map is not rolled back on a throw. Its only user is `blockquote-handler.ts:30-37`, where a line marked "seen" before a throw is skipped for the rest of the build. That matches "skip that line", so there is no defect.
- No scope creep. Tabs are used. JSDoc is present on the new module-level state and helper.
- Known limit, not in the Issue's scope: isolation covers throws raised inside a handler. An error CodeMirror raises later, at draw time (for example a replace crossing a line break), still disables the plugin. Existing handlers guard against that themselves (`markdown-link-handlers.ts:49`).

## Findings

1. **Low.** `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts:313-322`. The `06-links.md` test reaches the empty link (line 119, offset 2670 of 3022) only because the jsdom viewport (0-802) plus the 2000-char buffer of `expandedVisibleRanges` happens to cover it. If the buffer shrinks, jsdom's height estimate changes or the example file grows, the test passes without decorating that line. Fix: add a guard assertion, for example `expect(expandedVisibleRanges(view).some((r) => r.from <= idx && idx < r.to)).toBe(true)` with `idx = doc.indexOf('[](https://example.com)')`.
2. **Nit.** `src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts:113`. The comment "which used to crash the whole inline plugin" narrates history, which the comment rules forbid. Fix: say what it does now, e.g. "an uncaught throw disables the whole inline plugin".

Neither finding blocks delivery.

## Not verified

The real Tauri app was not run. The user's report on `06-links.md` was checked only in jsdom.

## Resolution

- Finding 1: fixed. `pipeline-dom.test.ts:319-323` asserts that `expandedVisibleRanges(view)` covers the offset of `[](https://example.com)` before checking for the crash, so the test fails loudly if the empty link ever falls outside the decorated range.
- Finding 2: fixed. `markdown-link-handlers.test.ts:112-114` now states the current behavior ("an uncaught throw disables the whole inline plugin").
