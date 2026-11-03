# 07: a plain code block inside a callout, blockquote or list item shows only its last line

**Status:** resolved

**Blocked by:** 03

Priority: P2 (visible content loss in a common layout: code in a callout)

**What to build:** `findAllFencedCodeBlocks` (src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts) keeps only the last `CodeText` child as `contentFrom` / `contentTo`. At the top level a fence has one `CodeText` spanning every line, but inside a container Lezer emits one `CodeText` per line (after each line's `>` or list indent). So `CodeBlockWidget` shows only the last line of a plain fenced block in a callout, blockquote or list item: `> ```js\n> a = 1\n> b = 2\n> ```` renders `b = 2`. Issue 03 built the per-line join for the special fences in `findSpecialFenceBlocks`; reuse it for the generic code-block path (code-block-field and its copy / language-switcher consumers), keeping the content positions those consumers need.

Confirmed at triage (2026-11-03, main 67575e8e) with the real `livePreviewExtensions`: a two-line ```` ```js ```` block renders `a = 1\nb = 2` at the top level and only `b = 2` in a blockquote, a callout and a list item. The note text is intact; only the rendered widget loses lines. `code-block-field.ts:32-40` slices `contentFrom..contentTo` into the `CodeBlockWidget` code, which the copy button also copies, so copy inside a container copies only the last line too. The language switcher edits the fence's `CodeInfo` range (`languageRange`), not the content.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:39-160 (`findAllFencedCodeBlocks`, the per-line join in `findSpecialFenceBlocks`), src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:20-81, src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts, footnote.ts (another `contentFrom` user: check it is unaffected), .scratch/live-preview-audit/work/03/review.md (finding 3), .scratch/live-preview-audit/work/03/discovery.md (Risks)

## Acceptance criteria

- [x] Failing test first: a plain ```` ```js ```` block with two or more lines in a blockquote, a callout and a list item renders every line without the container prefix
- [x] Top-level code blocks render as today, and the existing code-block field and parser tests pass
- [x] Copy-to-clipboard and the language switcher still act on the right text and range inside a container

- 2026-11-03, branch issue/07-plain-code-block-in-container-shows-last-line: `findAllFencedCodeBlocks` joins the per-line `CodeText` children of a fence inside a blockquote, callout or list item (reusing Issue 03's per-line join), so `CodeBlockWidget` and its copy button get every line without the container prefix; a follow-up builds the joined content only when read. Tests: pnpm check exit 0; live-preview targeted tests 55 files / 913 passed; full suite exit=0 (450 files, 10304 passed, 1 skipped, 1 todo), log test-logs/live-preview-audit/07-deliver.log. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
