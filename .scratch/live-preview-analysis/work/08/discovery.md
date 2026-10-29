# Issue 08 discovery: fenced code is respected

Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/`. Tests mirror them under `src/tests/lib/core/markdown-editor/extensions/live-preview/`.

## Files that change
- `plugins/block-comment-field.ts:11-36` + `parsers/comment.ts:47-70` (`findBlockComment`): a `%%` line inside a `FencedCode` node is never a comment fence (opening or closing). The field builds a `Set` of line starts covered by `findAllFencedCodeBlocks(state)` (open fence through close fence, unclosed blocks included) and passes `isCode(line)` to `findBlockComment`.
- `parsers/queryjs-block.ts:20-53`, `parsers/mermaid.ts:20-52`, `parsers/collection-block.ts:20-53`: the line scanners `findXBlock(lines, idx)` become `findAllXBlocks(state)`, built on a new shared `findFencedBlocks(state, openRe)` in `parsers/fenced-code-block.ts` (closed `FencedCode` nodes whose opening line matches the parser's existing opening regex; content = the lines between the fences joined by `\n`).
- `plugins/queryjs-block-field.ts:13-46`, `plugins/mermaid-field.ts:12-45`, `plugins/collection-block-field.ts:12-45`: iterate the block list instead of the line index; hiding loop runs over the doc lines after the opening fence.

## Plan (one commit each)
1. Characterization tests on the three field `compute*` functions (markdown state): tilde fence (mermaid only), longer fences, shorter fence does not close, unclosed = nothing, info string with extra words = nothing, indented / blockquoted opening = nothing, widget content string, empty block, two blocks. They pass on main.
2. Block comment: failing test (`%%` lines inside ```` ```matlab ```` are shown), then the fix.
3. queryjs on FencedCode: failing test in a jsdom `EditorView` (outer ```` ````md ```` fence, also with a preloaded `md` code language) asserting no `QueryjsBlockWidget` decoration and no widget DOM, so the script never runs. Parser tests move to `findAllQueryjsBlocks(state)`.
4. Mermaid + collection on FencedCode; their parser tests and `combined-block-structures.test.ts` move to the state API.

## Prior-art tests
`plugins/code-block-field.test.ts` (`createMarkdownState`), `plugins/queryjs-block-field.test.ts` (jsdom view), `parsers/fenced-code-block.test.ts`.

## Risks
- The three field tests and `block-comment-field.test.ts` build plain `EditorState`s with no markdown language; they need `createMarkdownState` once detection reads the tree (production always has the markdown language). Setup change only, assertions unchanged.
- Lezer accepts a closing fence indented up to 3 spaces; the regex only closed at column 0. Matches the code-block decorator now.
- Detection depends on how far Lezer has parsed. Same constraint `code-block-field.ts` already has; the scroll-debounce forced rebuild covers blocks parsed later.
- A `tree.iterate` does not enter mounted code-language trees (checked with a preloaded `md` language: only the outer `FencedCode` is visited), so a nested fence never surfaces as its own node.
- A comment wrapping an unclosed fence no longer closes (the fence runs to EOF per CommonMark).

## Defaults taken
- Opening-line regexes stay (top-level only, backtick-only for queryjs/collection, tilde allowed for mermaid): no new detection of indented or blockquoted blocks.
- `CodeBlock` (indented) is not considered for `%%`: `%%` must start at column 0, so an indented code line can never match.
