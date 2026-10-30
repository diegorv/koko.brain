VERDICT: CHANGES_REQUESTED

# Review: Issue 10, cleanup (shared hidden-line helper and dead code)

Branch `issue/live-preview-analysis-10-cleanup`, `git diff main...HEAD`, commits 612eba99..d8bd64fa.

## What I ran (not taken from the build report)

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run src/tests/lib/core/markdown-editor`: 104 files, 1541 passed, **1 failed**:
  `setup/editor-extensions.test.ts > heading font size has one owner per mode > source mode sizes each heading through exactly one rule` (`H5: expected [] to have a length of 1`). The same file run alone: 13/13 passed, three times. This is the "flaky" failure the build report could not identify. Cause in finding 1.
- `bash scripts/e2e.sh e2e/specs/live-preview/arrow-reveal.spec.ts`: 6 passed.
- Probe 1 (temporary, reverted, worktree clean): removed `syntaxHighlighting(sourceHeadingSize)` from `sourceModeExtensions()`. The new toggle test and the source-mode test both fail, so the toggle test does catch a regression of the 42e7188b fix.
- Probe 2 (temporary test file, deleted): mounted the source-mode editor with `Date.now` advancing 7 ms per call, so Lezer's 20 ms initial parse budget (`LanguageState.init`, `@codemirror/language` dist line 545) runs out. Result: tree length 18 of 45, heading owners per level `[1,1,1,0,0,0]`. With `forceParsing(view, doc.length, 5000)` after mount: tree length 45, `[1,1,1,1,1,1]`.

The test verdict rests on these files: `core/hide-lines.test.ts`, `core/reveal.test.ts`, `plugins/*-field.test.ts` and the plugin tests under `extensions/live-preview/` (all inside the markdown-editor run), `plugins/code-block-field.test.ts`, `plugins/callout-field.test.ts`, `parsers/frontmatter.test.ts`, `parsers/combined-block-structures.test.ts`, `code-highlight.logic.test.ts`, `date-shortcut/completion.logic.test.ts`, `composition-aware-bracket-matching.test.ts`, `wikilink/decoration.test.ts`, `setup/editor-extensions.test.ts`, plus `e2e/specs/live-preview/arrow-reveal.spec.ts`.

## Acceptance criteria

- [x] **One hidden-line helper used by every block plugin that hides lines.** Met, with one documented exception. `core/hide-lines.ts` is used by audio, video, block-comment, block-math, code-block (fenced and indented), collection, mermaid, meta-bind-button, queryjs, table and frontmatter. `grep hiddenLineDeco|Decoration.replace({})` over `src/lib` finds no other hidden-line loop. `callout-field.ts:240` still pushes `hiddenLineDeco` directly. That is justified: a collapsed callout hides lines with the line class only and adds no text replace, so `hideLines` would change cursor motion. The index conversions are equivalent: `getAllLines` returns `doc.line(i + 1)`, so `lines[i].number` is the same line, and `table.startLine` is already a doc line number. The JSDoc claim that `Decoration.range()` rejects an empty replace is correct: `PointDecoration.range` throws for `from == to` when `startSide > 0 && endSide <= 0`, which holds for a non-inclusive `Decoration.replace({})`.
- [x] **Each dead-code removal names its traced callers in the commit message.** Met. e13051c9 lists a caller trace for every item. I re-traced them:
  - `openWikilinkTarget` has no importer through `widgets.ts`.
  - `createMetaBindSelect` is used only inside `widgets.ts`.
  - `FrontmatterBlock.properties` and the local `parseFrontmatterProperties` are read only by tests. `frontmatter-slice.test.ts` imports the `features/properties` one.
  - No `Frontmatter` node exists in the grammar, and there is no `yamlFrontmatter`/`lang-yaml` in `src/lib`.
  - The footnote skip is unreachable: the label grammar ends at the first unescaped `]`, and `(?!:)` and `]:` exclude each other.
  - `TaskMarker` is a child of `Task`, never of `ListItem`.
  - `DateShortcutMatch.to` is not read in `completion.ts:21`.
  - Only `{ html }` of `HighlightResult` is read, at `code-block-widget.ts:111`.
  - `highlightSelectionMatches` never decorates: `@codemirror/search` dist lines 420-436 return `Decoration.none` for both branches, and its `defaultTheme` only styles `.cm-selectionMatch`.
  - The report's `fenceChar` and `CommentBlock` corrections are right.
- [~] **No behavior change: full test suite passes with no test edits other than removals of tests for deleted code.** Partly verified. Rendering is unchanged as far as I can tell. The test edits follow the rule, with one exception: `callout-field.test.ts:147-189` changes three expected counts (9→7, 7→6, 7→6), and those are edits, not removals. They follow from removing the duplicate same-class line decoration, which renders the same DOM, so I accept them. The full suite was not run here, because the deliver step runs the only full gate. The markdown-editor subset has a real intermittent failure (finding 1), so "full test suite passes" is not reliable yet.
- [x] **`reveal.test.ts` gaps.** Met (`reveal.test.ts:99-141`): selection ending at the end of the doc, empty doc, Shift+Down from column 0 (line N+1 stays rendered), setext heading with the cursor on its underline.
- [x] **Source-mode heading size through the real toggle.** Met. `MarkdownEditor.svelte:416` now dispatches `editorModeEffects(enabled, sourceModeCompartment)`. The new test (`editor-extensions.test.ts:166`) drives that same function LP -> source -> LP. Probe 1 confirms it fails without the 42e7188b fix. It has the parse-budget flake from finding 1.
- [x] **E2E arrow reveal.** Met. `e2e/specs/live-preview/arrow-reveal.spec.ts` covers table, fenced code and callout with ArrowDown and ArrowUp, asserting the widget and the raw first line both when entering and when leaving. 6 passed.

Other checks:
- `Decoration.set(ranges, true)` swaps (report 3.8): bracket matching and the wikilink decoration are correct. In the wikilink `[[#heading]]` case only the target can be empty: heading, block id and display need `+` in the regex. The new bracket test does exercise the sort, because a backward match pushes the closing bracket first.
- `code-block-field` `RangeSet.join` of two builders is correct: fenced and indented code never overlap in Lezer, and both are built in document order. The new mixed-order test covers it.
- Layer rules: no `core/` -> `features/`/`plugins/` imports were added. There is no cycle: `extensions/` never imports `setup/`. Tabs are used and JSDoc is present on the new exports.

## Findings

1. **Medium: `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:137-150` (`mount` in "heading font size has one owner per mode").** The new toggle test (`:166`) and the existing source-mode test (`:152`) check heading styling right after `new EditorView(...)`. CodeMirror gives the initial Lezer parse a 20 ms budget. Under full-suite load the budget runs out, the tree stops partway, and H4-H6 get no heading highlight, so the test fails with `H5: expected [] to have a length of 1`. I hit this in my run, and it is the build report's unexplained failure. Probe 2 reproduces it deterministically. The branch adds a second test with the same dependency at three assertion points, and the deliver step's full `pnpm vitest run` can trip on it.
   **Fix:** in `mount`, after creating the view, call `forceParsing(view, view.state.doc.length, 5000)` (import from `@codemirror/language`). Probe 2 shows this yields a full tree and one owner per level even with the budget exhausted. Mode switches reconfigure compartments only, so the tree survives the toggle and the one call in `mount` covers both tests.
2. **Low: `src/lib/core/markdown-editor/setup/index.ts:2`.** `sourceModeExtensions` is still re-exported from the barrel, but its only app importer (`MarkdownEditor.svelte`) now uses `editorModeEffects`. The test imports `editor-extensions.js` directly. This change orphaned the re-export. **Fix:** drop `sourceModeExtensions` from the barrel export list. The function stays, because `editorModeEffects` and `createExtensions` use it.
3. **Nit: `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:273-274`.** Removing the re-export left two consecutive blank lines. **Fix:** delete one.
4. **Nit: `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.test.ts:83`.** Removing the last test left a blank line before the closing `});` of the describe. **Fix:** delete it.

## Not verified

I did not run the full gate (`pnpm vitest run` over the whole repo, `pnpm build`) or the other E2E specs. I did not check rendering in the app: the callout duplicate-class removal and the `RangeSet.join` layering are reasoned from the CodeMirror source and the decoration-level tests.

## Resolution

All four findings accepted and fixed; none rejected.

1. `mount` in `editor-extensions.test.ts` now calls `forceParsing(view, view.state.doc.length, 5000)` after creating the view.
2. `sourceModeExtensions` dropped from the `setup/index.ts` barrel; the function stays in `editor-extensions.ts`.
3. Double blank line in `widgets.ts` removed.
4. Trailing blank line in `frontmatter.test.ts` removed.
