VERDICT: CHANGES_REQUESTED

# Issue 01 review: live-preview DOM tests do not depend on parse timing

Reviewed `git diff main...HEAD` at cd51c8e3 (commits 75e54cda, 3ec499f5, 7cc3f1a9, e2de12d2, cd51c8e3). Test-only diff: `test-helpers.ts` gains `mountMarkdownView` and `withFullParse`, the new `test-helpers.test.ts` covers them, and 10 test files move onto them. No production source changes.

## What I ran myself

- Changed files, normal clock: `test-helpers.test.ts`, the 7 field tests (block-math, callout, code-block, collection-block, mermaid, meta-bind-button, table), `keyboard-reveal`, `queryjs-block-field`, `setup/editor-extensions`: 11 files, 120/120 pass.
- Live-preview folder + `test-helpers.test.ts` + `editor-extensions.test.ts`, normal clock: 94 files, 1327/1327 pass.
- Before the fix: main's versions of the four named files (`git show main:...` copied next to the originals as `*.mainprobe.test.ts`, removed afterwards), run under the 25 ms `Date.now` step shim (`parse-load.vitest.config.ts` + `parse-load.setup.ts` from the build report): 6 failed / 36 passed. The failures are the logged ones: keyboard-reveal table, fenced code and callout; mermaid and block-math "updates when document changes"; editor-extensions mode toggle.
- After the fix, same shim: the four named files 10 runs in a row, 42/42 each run.
- After the fix, same shim: all of `src/tests/lib/core/markdown-editor`, 105 files, 1546/1546 pass.
- `pnpm check`: 0 errors, 0 warnings (211 files).
- Probe: `mountMarkdownView` + `view.destroy()` leaves `view.dom.parentElement === null` and one leftover div in `document.body` (finding 1).
- Source check: in `node_modules/@codemirror/language/dist/index.js`, `ParseContext.work` (lines 345-380) reads only `Date.now` for its budget, and `LanguageState.apply` / `init` (lines 528-548) use `Work.Apply` = 20. A frozen clock therefore gives an unbounded budget. A 25 ms step leaves exactly one `advance()` per `work` call, the minimum `work` can do, so the shim is at least as hard as real CPU load on the parse budget.

The test verdict rests on these files: `src/tests/lib/core/markdown-editor/test-helpers.test.ts`, `extensions/live-preview/plugins/{keyboard-reveal,mermaid-field,block-math-field,callout-field,code-block-field,collection-block-field,meta-bind-button-field,table-field,queryjs-block-field}.test.ts`, `setup/editor-extensions.test.ts`, plus the whole `src/tests/lib/core/markdown-editor` folder under the shim.

## Acceptance criteria

- [x] **Cause confirmed per test, recorded in the commit.** Met. 7cc3f1a9 records the field-test cause: the `LanguageState.apply` 20 ms budget on the doc-change transaction. e2de12d2 records three: keyboard-reveal's ViewPlugin is built from the truncated snapshot and the empty re-snapshot dispatch gets `'none'`; editor-extensions' `forceParsing` has the same `'none'` problem; queryjs's doc-change dispatch hits the apply budget. I confirmed that 91044ddf (the commit of the logged source-mode failure) has no `forceParsing` in `editor-extensions.test.ts`, so the "no longer reproduces" note holds. Main's versions fail under the shim with the logged messages.
- [x] **Every live-preview test that mounts a view gets a finished parse through one shared helper.** Met. keyboard-reveal, queryjs-block-field and editor-extensions (heading and legacy mounts) now go through `mountMarkdownView`, which delegates to `createMarkdownState`. Four files already mounted on `createMarkdownState` and were left alone: arrow-reveal, inline-formatting-plugin, pipeline-dom and math-widget. The view mounts in block-decorator, mouse-selecting, meta-bind-input-widgets, table-widget and code-block-widget load no markdown language, so they have no parse to finish. The issue suggested finishing the parse after the dispatch for doc-change tests. The implementer froze the clock during the transaction instead, and the reason holds: `checkUpdateAction` ignores tree-only updates, so finishing afterwards would need a forced rebuild and would hide whether the doc change itself rebuilt.
- [x] **Under the same artificial load that made them fail, the four tests pass 10 runs in a row.** Met. I reproduced it myself (see above). Real parallel CPU load was not used. The shim is a stricter parse-budget condition and the Issue's gate allows a parse-budget shim.

## Findings

1. **Low - `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts:144` and `:209`.** Each `dispose()` calls `view.dom.parentElement?.remove()` after `view.destroy()`. That line never does anything, because `EditorView.destroy()` already calls `this.dom.remove()` (`@codemirror/view` dist/index.js:8733), so `parentElement` is null by then. The wrapper div that `mountMarkdownView` appended to `document.body` leaks on every mount. My probe confirmed one leftover child per mount. On main, `root.remove()` removed it, so this diff introduces the leak, and the line suggests a cleanup that does not run. No current assertion reads `document.body` (queries are scoped to `view.contentDOM` / `view.dom`), so nothing fails today. Fix: take the wrapper before destroying, `const root = view.dom.parentElement; view.destroy(); root?.remove();`, or clear the body in an `afterEach` (`document.body.replaceChildren()`), as keyboard-reveal and queryjs do.
2. **Nit - `src/tests/lib/core/markdown-editor/test-helpers.ts:59`.** The JSDoc says "Every live-preview decorator builds its decorations in its ViewPlugin constructor". `frontmatterField` is a `StateField` (`src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:31`), so the sentence is already false and will go stale further. Fix: narrow the claim, e.g. "The live-preview ViewPlugin decorators build their decorations in the constructor, so ...".

Informational, no action required: arrow-reveal.test.ts:58/119, inline-formatting-plugin.test.ts:314, pipeline-dom.test.ts:47 and math-widget.test.ts:192 still write their own `new EditorView({ state: createMarkdownState(...) })`. They get the same finished parse, so leaving them alone keeps the diff surgical.

## Scope and rules

- No production code touched. No stores or `.logic.ts` files mocked. Tabs are used throughout. Every exported helper has JSDoc. `test-helpers.test.ts` covers the happy path for both helpers plus an error case (`withFullParse` restores `Date.now` when the callback throws), and its truncation precondition fails without the helper, so the test is not vacuous.
- The untracked repro config and setup file are not committed (the discovery records this default). Nothing outside the Issue's Touches list changed except `setup/editor-extensions.test.ts`, which is one of the four named tests.
- Not verified here: the full gate (left to deliver) and a run under real parallel CPU load.
