# 03: meta-bind-button, mermaid, queryjs and collection blocks inside a callout, blockquote or list item render as raw source

**Status:** resolved

**Blocked by:** none

Priority: P2 (a meta-bind button or a mermaid diagram inside a callout is a common Obsidian-style layout)

**What to build:** Detect the four special fences (meta-bind-button, mermaid, queryjs, collection) from the parsed fence's info string instead of a column-0 regex over the raw opening line, so they are found inside callouts, blockquotes and list items: `findSpecialFenceBlocks` (src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:127) already iterates `findAllFencedCodeBlocks`, whose `block.language` comes from the `CodeInfo` node. Strip the container prefix (each `> ` level, or the list item's indent) from every content line before it becomes `SpecialFenceBlock.content`, so the YAML / JS / mermaid consumer parses the same text it would at top level. Keep the existing open-fence rules (backtick or tilde fences where each parser accepts them today) and `SPECIAL_LANGUAGES` in code-block-field.ts:12,27.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:100-160, parsers/meta-bind-button.ts:19-30, parsers/mermaid.ts:19-30, parsers/queryjs-block.ts:19-30, parsers/collection-block.ts:19-30, plugins/code-block-field.ts:12,27, the four block fields, .scratch/live-preview-audit/repro/block-vs-block/block-vs-block-redraw.test.ts

**Details.** Each special decorator tests a column-0 regex against the whole opening line: `META_BIND_BUTTON_OPEN_RE` `/^(`{3,})\s*meta-bind-button\s*$/` (src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:19), and the same shape in parsers/queryjs-block.ts:19, parsers/collection-block.ts:19 and parsers/mermaid.ts:19. `findSpecialFenceBlocks` (parsers/fenced-code-block.ts) runs it on `openLine.text`. Inside a container the line starts with `> ` or indentation, so nothing matches; code-block-field.ts:12,27 skips these languages through `SPECIAL_LANGUAGES`, and the inline pipeline skips `FencedCode`, so no source decorates the block. A plain ```` ```js ```` block in the same containers renders (CodeBlockWidget), so only the special fences are affected.

**How a user hits it.** A ```` ```meta-bind-button ```` block (or mermaid, queryjs, collection) inside `> [!note]` or under a list item shows the raw fence and YAML/JS; the button cannot be clicked.

**Evidence.** `.scratch/live-preview-audit/repro/block-vs-block/block-vs-block-redraw.test.ts`, 'special fences nested in a container render': the top-level control passes; the callout and list-item cases fail with "button drawn: expected null not to be null" (and the same for queryjs, collection and mermaid in a callout).

**Fix sketch.** Match on the parsed info string (the `CodeInfo` node, `block.language` from `findAllFencedCodeBlocks`) instead of a column-0 regex, and strip the container prefix (`> ` repeats or the list indent) from each content line before handing it to the YAML/JS consumer, since `SpecialFenceBlock.content` is sliced raw.

## Acceptance criteria

- [x] Failing test first: move the 'special fences nested in a container render' cases of `.scratch/live-preview-audit/repro/block-vs-block/block-vs-block-redraw.test.ts` under `src/tests/` and see them fail
- [x] A meta-bind-button, mermaid, queryjs and collection block render inside a callout, a blockquote and a list item
- [x] Their content reaches the consumer without the container prefix: a meta-bind-button inside a callout shows its label and runs its actions; a parser-level test checks the stripped content for `> ` and for a list indent
- [x] A fence whose language only starts with a special name (```` ```mermaid-js ````) is still a normal code block; top-level special blocks render as today, and the existing parser and field tests pass

## Comments

- 2026-11-02, branch issue/03-special-fences-in-containers: special fences (meta-bind-button, mermaid, queryjs, collection) are detected from the parsed fence info string and their content has the container prefix (`> ` levels or list indent) stripped, so they render inside callouts, blockquotes and list items. Round-2 fixes: over-indented container fences are rejected and blank-only bodies are kept. Full suite at e72e59ee: exit=0, 445 files, 10226 passed, 1 skipped, 1 todo, build ok (test-logs/live-preview-audit/03-deliver.log). Reviews: round 1 APPROVED (review.md), round 2 APPROVED (review-2.md, one nit on tab-after-marker column counting left as is).
