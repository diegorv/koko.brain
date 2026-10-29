# 10: Cleanup: shared hidden-line helper and dead code

**What to build:** Behavior-neutral cleanup once the block plugins have settled. Extract a `hideLines(builder, from, to)` helper for the hidden-line loop copied across the block plugins (block comment, block math, code block, collection, mermaid, meta-bind button, queryjs, table, video). Remove the verified dead code listed in `report-markdown-editor.md` section 3.7, tracing every caller first (CLAUDE.md, Removing or Refactoring Code). Use `Decoration.set(ranges, true)` instead of `RangeSetBuilder` plus a manual sort where the report lists it.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 05 (block-decorators-shared-reveal), 07 (robust-callouts), 08 (fenced-code-awareness)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/` (modify)
- Files listed in `report-markdown-editor.md` sections 3.4, 3.6-3.8 (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] One hidden-line helper used by every block plugin that hides lines
- [ ] Each dead-code removal names its traced callers in the commit message
- [ ] No behavior change: full test suite passes with no test edits other than removals of tests for deleted code
