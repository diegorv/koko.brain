# 03: meta-bind-button, mermaid, queryjs and collection blocks inside a callout, blockquote or list item render as raw source

**Status:** needs-triage

**Blocked by:** none

Priority: P2 (a meta-bind button or a mermaid diagram inside a callout is a common Obsidian-style layout)

**Details.** Each special decorator tests a column-0 regex against the whole opening line: `META_BIND_BUTTON_OPEN_RE` `/^(`{3,})\s*meta-bind-button\s*$/` (src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:19), and the same shape in parsers/queryjs-block.ts:19, parsers/collection-block.ts:19 and parsers/mermaid.ts:19. `findSpecialFenceBlocks` (parsers/fenced-code-block.ts) runs it on `openLine.text`. Inside a container the line starts with `> ` or indentation, so nothing matches; code-block-field.ts:12,27 skips these languages through `SPECIAL_LANGUAGES`, and the inline pipeline skips `FencedCode`, so no source decorates the block. A plain ```` ```js ```` block in the same containers renders (CodeBlockWidget), so only the special fences are affected.

**How a user hits it.** A ```` ```meta-bind-button ```` block (or mermaid, queryjs, collection) inside `> [!note]` or under a list item shows the raw fence and YAML/JS; the button cannot be clicked.

**Evidence.** `.scratch/live-preview-audit/repro/block-vs-block/block-vs-block-redraw.test.ts`, 'special fences nested in a container render': the top-level control passes; the callout and list-item cases fail with "button drawn: expected null not to be null" (and the same for queryjs, collection and mermaid in a callout).

**Fix sketch.** Match on the parsed info string (the `CodeInfo` node, `block.language` from `findAllFencedCodeBlocks`) instead of a column-0 regex, and strip the container prefix (`> ` repeats or the list indent) from each content line before handing it to the YAML/JS consumer, since `SpecialFenceBlock.content` is sliced raw.

## Acceptance criteria

- [ ] Failing test first: the container cases moved under `src/tests/`
- [ ] A meta-bind-button, mermaid, queryjs and collection block render inside a callout, a blockquote and a list item, with their content parsed without the container prefix
- [ ] Top-level blocks render as today
