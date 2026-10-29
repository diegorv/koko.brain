# 13: meta-bind-button fences use FencedCode detection

**What to build:** A ```` ```meta-bind-button ```` fence nested inside a larger fence (e.g. a ````` ````md ````` example) is shown as code, not rendered as a button. Move `computeMetaBindButtons` off the raw line regex scanner (`findMetaBindButtonBlock` over `getAllLines`) onto `findSpecialFenceBlocks` over Lezer `FencedCode` nodes, the same switch Issue 08 made for queryjs, mermaid and collection. Pin the current scanner behavior with characterization tests before switching.

**Context:** Raised by the Issue 08 review (`.scratch/live-preview-analysis/work/08/review.md`, finding 2). Issue 08 only named queryjs, mermaid and collection, so meta-bind-button was left on the regex scanner and still renders inside a nested fence.

**Blocked by:** 08 (fenced-code-awareness)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts` (read; `findSpecialFenceBlocks`)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Characterization tests for the current meta-bind-button scanner land first
- [x] Test: a meta-bind-button fence nested in a ````md fence is not rendered
- [x] A top-level meta-bind-button fence still renders; existing tests pass

## Comments
- 2026-10-29 18:24 — discovery — plan in work/13/discovery.md: findAllMetaBindButtonBlocks over findSpecialFenceBlocks, field iterates blocks like mermaid-field, characterization tests first — 958d8491
- 2026-10-29 18:26 — implement — characterization tests (a981040a), switch to findAllMetaBindButtonBlocks over FencedCode with nested-fence tests (d0521615); pnpm check 0 errors, markdown-editor tests 1470/1470 — d0521615
- 2026-10-29 18:28 — review — APPROVED (work/13/review.md): criteria met, nested-fence tests red on pre-switch source and green after, live-preview tests 1257/1257, pnpm check 0 errors; 1 optional low finding (stale JSDoc list in fenced-code-block.ts:105) — 6728125b
