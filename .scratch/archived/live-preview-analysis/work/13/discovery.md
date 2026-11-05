# Issue 13 discovery: meta-bind-button fences use FencedCode detection

Template: Issue 08 (`work/08/discovery.md`), the mermaid switch. Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/`; tests mirror them under `src/tests/lib/core/markdown-editor/extensions/live-preview/`.

## Files that change
- `parsers/meta-bind-button.ts:15-51`: `findMetaBindButtonBlock(lines, idx)` becomes `findAllMetaBindButtonBlocks(state)` over `findSpecialFenceBlocks` (`parsers/fenced-code-block.ts:127`), keeping the opening regex `^(`{3,})\s*meta-bind-button\s*$` (backtick only, column 0). `MetaBindButtonBlock` keeps its fields.
- `plugins/meta-bind-button-field.ts:13-48`: iterate the block list instead of the line index (same shape as `plugins/mermaid-field.ts:11-39`); drop the `getAllLines` import.
- Tests: `plugins/meta-bind-button-field.test.ts` (characterization + nested fence), `parsers/meta-bind-button.test.ts` (move to the state API), `parsers/combined-block-structures.test.ts:458-466` (state API).

## Plan (one commit each)
1. Characterization tests on `computeMetaBindButtons` with `createMarkdownState`: closed block (range, label, decoration count), empty block (error widget), spaces + longer fence, shorter fence does not close, fence with info string does not close, unclosed / extra words / indented / blockquote / tilde render nothing, two blocks, invalid YAML error widget. They pass on main.
2. Failing test: a meta-bind-button fence nested in a ````md fence (with and without an `md` code language) renders nothing, a top-level one next to it still renders. Then switch parser + field; parser and combined tests move to `findAllMetaBindButtonBlocks(state)`.

## Prior-art tests
`plugins/special-fence-detection.test.ts` (case list), `parsers/mermaid.test.ts` (state API), `plugins/queryjs-block-field.test.ts` (md code language for nesting).

## Risks
- `plugins/meta-bind-button-field.test.ts` builds plain `EditorState`s (no markdown language); they move to `createMarkdownState`, assertions unchanged.
- Same behavior shifts as Issue 08: closing fence indented up to 3 spaces now closes; a fence inside an HTML block no longer renders; detection waits on the Lezer parse (rebuilds via forced rebuild / scroll debounce).
- `block-reveal.test.ts` already uses `createMarkdownState`, so it is unaffected.

## Defaults taken
- Opening regex unchanged: no tilde, indented or blockquoted buttons.
- The widget only needs a jsdom view for DOM; `compute*` decoration assertions are enough to show "not rendered" (no widget, no `toDOM`).
