# 07: a plain code block inside a callout, blockquote or list item shows only its last line

**Status:** needs-triage

**Blocked by:** 03

Priority: P2 (visible content loss in a common layout: code in a callout)

**What to build:** `findAllFencedCodeBlocks` (src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts) keeps only the last `CodeText` child as `contentFrom` / `contentTo`. At the top level a fence has one `CodeText` spanning every line, but inside a container Lezer emits one `CodeText` per line (after each line's `>` or list indent). So `CodeBlockWidget` shows only the last line of a plain fenced block in a callout, blockquote or list item: `> ```js\n> a = 1\n> b = 2\n> ```` renders `b = 2`. Issue 03 built the per-line join for the special fences in `findSpecialFenceBlocks`; reuse it for the generic code-block path (code-block-field and its copy / language-switcher consumers), keeping the content positions those consumers need.

**Source:** .scratch/live-preview-audit/work/03/review.md (finding 3), .scratch/live-preview-audit/work/03/discovery.md (Risks)

## Acceptance criteria

- [ ] Failing test first: a plain ```` ```js ```` block with two or more lines in a blockquote, a callout and a list item renders every line without the container prefix
- [ ] Top-level code blocks render as today, and the existing code-block field and parser tests pass
- [ ] Copy-to-clipboard and the language switcher still act on the right text and range inside a container
