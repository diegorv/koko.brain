# Issue 01 discovery: live-preview tests vs parse timing

## Cause, reproduced
A vitest config that adds a setup file stepping `Date.now` by 25 ms per read (the
`stepDateNow(25)` condition from `test-helpers.ts`) reproduces every logged failure
deterministically, with the logged messages. Over `src/tests/lib/core/markdown-editor`
it fails 12 tests in 10 files, all truncated parse:
- `keyboard-reveal.test.ts` table / fenced code / callout ArrowRight: `mount()` runs
  `ensureSyntaxTree` but the ViewPlugin is built in `new EditorView` from the truncated
  snapshot; the following `dispatch({})` re-snapshots but `checkUpdateAction` says `'none'`.
- `editor-extensions.test.ts` "mode toggle keeps one heading size owner" (live-preview
  mode): `forceParsing` after mount has the same `'none'` problem for `cm-lp-hN`. The
  logged source-mode failure (91044ddf) predates 84c38460 and no longer reproduces.
- `queryjs-block-field.test.ts` "rebuilds on document changes": the doc-change dispatch
  parses under `LanguageState.apply`'s 20 ms budget.
- "updates when document changes" in block-math, mermaid, callout, code-block,
  collection-block, meta-bind-button and table field tests: same 20 ms apply budget on
  `state.update({ changes })`.

## Plan
1. `test-helpers.ts`: add `mountMarkdownView(doc, { extensions, cursor })` (createMarkdownState
   + EditorView in a div under body) and `withFullParse(fn)` (freezes `Date.now` while `fn`
   runs, so the parse CodeMirror runs inside a transaction cannot hit its 20 ms budget).
   Tests for both under `stepDateNow(25)` in a new `test-helpers.test.ts`.
2. The 7 field tests: wrap the doc-change `state.update` in `withFullParse`.
3. keyboard-reveal and editor-extensions (both heading mounts) mount through
   `mountMarkdownView`; queryjs `createView` too, and its doc-change dispatch goes through
   `withFullParse`.

## Defaults taken
- Doc-change tests freeze the clock during the transaction instead of finishing the parse
  afterwards: finishing afterwards needs a `forceDecorationRebuild` for view tests, and then
  "rebuilds on document changes" would pass even if a doc change never rebuilt.
- Live-preview tests that already mount on `createMarkdownState` (arrow-reveal,
  inline-formatting-plugin, pipeline-dom, math-widget) pass under the shim and stay as is.
  View mounts with no markdown language (block-decorator, mouse-selecting, meta-bind-input-
  widgets, table-widget, code-block-widget) have no parse to finish.
- The repro config and setup file stay untracked; the 10-run proof uses them.

## Risks
- A frozen clock also freezes any other `Date.now` reader inside `fn`; only transactions and
  mounts are wrapped, nothing time-based is asserted there.
