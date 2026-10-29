# 05: Blocks and embeds follow the same reveal rule

**What to build:** Block decorators (tables, fenced code, callouts, block math, mermaid, queryjs, collection, meta-bind button, block comments, media) and the four inline ViewPlugins (image, footnote, wikilink-embed, meta-bind-input) use the shared predicate from 04 instead of their own cursor checks.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 04 (shared-reveal-predicate-inline)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/` (modify; every block field and the four inline ViewPlugins)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] No block or ViewPlugin computes cursor overlap on its own; all call the shared predicate
- [ ] Existing block decorator tests pass; new tests cover entering and leaving a table, code block, callout and embed with the keyboard
- [ ] Widget caches (queryjs live DOM, mermaid/math markup, collection data) are untouched

## Comments

- 2026-10-29 17:47 — discovery — plan in work/05/discovery.md: swap 16 shouldShowSource calls to revealPredicate, delete shouldShowSource, keyboard enter/leave tests — 9921d7b7
- 2026-10-29 17:58 — implement — blocks + 4 inline ViewPlugins on revealPredicate, shouldShowSource deleted; pnpm check 0 errors, vitest markdown-editor 99 files 1367 passed — 9e98c81f
- 2026-10-29 18:03 — review — CHANGES_REQUESTED: 1 medium (forced rebuild mid-drag collapses a revealed block; reorder drag check in checkUpdateAction), 1 low (ADR 0008 per-element goal line); see work/05/review.md — 18c04d02
- 2026-10-29 18:04 — fix — review findings 1 (drag check before forceDecorationRebuild, 2 tests red first) and 2 (ADR 0008 goal line) fixed; vitest markdown-editor 99 files 1381 passed, pnpm check 0 errors — (this commit)
