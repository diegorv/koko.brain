# Issue 16 discovery: live-preview invariants harness

No `spec.md` exists for architecture-stability; vocabulary from ADR 0008 and CLAUDE.md live-preview rules.

## Files that change (test-only, no app code)
- NEW `src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts` (jsdom).
- NEW `src/tests/lib/core/markdown-editor/extensions/live-preview/fixtures/edge-corpus.md` (edge documents, split on a separator line).

## Plan
- Mount like `inline/pipeline-dom.test.ts:37`: `createMarkdownState` + `markdownLanguage()` + `syntaxHighlighting(markdownHighlight)` + `livePreviewExtensions()`.
- Mocks: `@tauri-apps/api/core` (invoke resolves empty), `mermaid` (stub), `#lib/utils/log.service.js` (appendLog no-op). `settingsStore.updateQueryjs({ autoRunQueries: 'manual' })`.
- Corpus: 15 files from `help/examples/markdown-editor-vault/` (one per block kind) + the edge fixture.
- Boundary lines: first/last line of each top-level syntax node, capped per doc for runtime.
- Steps per boundary: type a char (then delete it), select a range ending at a line start, triple-click range (whole line incl. break), mousedown + mid-drag selection + mouseup outside, native drag (mousedown, dragstart, drop, dragend), forceDecorationRebuild, scrollIntoView + `StateEffect.appendConfig.of([])`. Doc changes wrapped in `withFullParse`.
- Invariants, per source in `view.state.facet(EditorView.decorations)` (functions evaluated with the view):
  1. no throw, no `plugin crashed` console.error;
  2. no duplicate (from, to, class) mark within one source;
  3. no widgetless replace on a touched line (skipped while the drag flag is set); a range ending at a line start decorates that line exactly like the selection ending one char earlier;
  4. after mouseup-outside / native drag: flag false and decorations equal a fresh view on the same state, inside the intersection of both views' visible ranges;
  5. no widget other than `CodeBlockWidget` starts strictly inside a `FencedCode` node;
  6. mount + destroy with callout, table, meta-bind widgets: net `document.addEventListener` minus `removeEventListener` is zero.

## Prior art
- `inline/pipeline-dom.test.ts` (mount, plugin-crashed spy), `core/mouse-selecting.test.ts` (mouse/drag event shapes), `widgets/queryjs-block-widget.test.ts` + `widgets/mermaid-widget.test.ts` (mocks).

## Mutation check
`git show <sha> -- src/lib | git apply -R` for 121db924, e5be43d7, 8d01b605, 92815cde (all reverse-apply cleanly on main d471c6b1). 8d01b605 needs a handler that throws. No corpus construct throws any more (df32aee9 fixed the empty-label link), so the test wraps the highlight handler module to throw on the sentinel `==handler-fault==`.

## Defaults taken
- "dragend" step: mouse-selecting releases on `dragstart` (e5be43d7), so the step fires the full native sequence `dragstart, drop, dragend`.
- Hidden-syntax replace = any `Decoration.replace` without a widget (covers `hiddenSyntaxDeco` and hide-lines); the frontmatter field is exempt (hidden whatever the selection, by design).
- jsdom reports one visible range, so a generated doc with a long line (CodeMirror line gap) makes the expanded ranges overlap for the duplicate-mark check.
- Risk: jsdom viewport; comparisons stay inside visible ranges. Runtime budget 10 s: cap boundaries per doc.
