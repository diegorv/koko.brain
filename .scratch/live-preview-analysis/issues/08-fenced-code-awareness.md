# 08: Fenced code is respected

**What to build:** Content inside fenced code is never interpreted as live-preview syntax. Two `%%` lines inside a code block (e.g. MATLAB cells) no longer hide the code between them (the block comment field scans raw lines without the syntax tree). A ```` ```queryjs ```` block nested in a larger fence is neither rendered nor executed; mermaid and collection detection get the same fix by using Lezer `FencedCode` nodes instead of regex scanners. Pin the current behavior of the regex scanners with tests before switching.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 05 (block-decorators-shared-reveal)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts` (modify; :11-36)
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts`, `src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts`, `src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts` and their fields (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts` (read)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [x] Characterization tests for the current scanners land first
- [x] Test: `%%` lines inside a fenced code block are shown as code
- [x] Test: a queryjs fence nested in a ````md fence is not rendered and its script never runs
- [x] Mermaid and collection use FencedCode nodes; their existing tests pass

## Comments

- 2026-10-29 18:09 — discovery — plan: shared findFencedBlocks over Lezer FencedCode for queryjs/mermaid/collection, code-line skip for %% fences — a5e16246
- 2026-10-29 18:14 — implement — %% in fences stays code; queryjs/mermaid/collection detect via findSpecialFenceBlocks over FencedCode; nested fences neither render nor run; pnpm check 0 errors, markdown-editor vitest 100 files/1428 pass — c2e5c681
