# 06: No cross-update state: remove the lastCursorLine gate

**What to build:** Decorations rebuild on every selection change, with no `lastCursorLine` memory. First measure with LP-PROFILE the rebuild cost of the inline plugin plus the block decorators on every selection change on a large note (record the numbers in `.scratch/live-preview-analysis/findings-2026-10-29.md`). If the cost is not small (order of a few ms), stop, set `ready-for-human` and report the numbers. Otherwise drop `lastCursorLine` from `checkUpdateAction` and every caller (one rebuild gate), update CLAUDE.md live-preview rules 4-5, and add the end-to-end regression test for the reported bug.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 01 (navigation-always-updates-reveal), 05 (block-decorators-shared-reveal)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` (modify)
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts`, `src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts`, `src/lib/core/markdown-editor/extensions/live-preview/plugins/` (modify; callers)
- `CLAUDE.md` (modify; Live Preview rules 4-5)
- `e2e/` or unit tests (new; regression)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] LP-PROFILE numbers recorded before the gate is removed
- [ ] No `lastCursorLine` remains in live-preview
- [ ] Regression test: ArrowUp/ArrowDown between a bullet line and an H1 line reveals exactly the new line and hides the old one, with and without the move scrolling the viewport
- [ ] Pure scroll still skips rebuilds
