# 03: Headings have a single size owner

**What to build:** A heading's font size is defined in exactly one place. Today the token span gets `fontSize var(--heading-h1-font-size, 1.6em)` from the editor HighlightStyle while the line gets `.cm-lp-h1` (~2.058em); because em is relative to the parent the sizes may compound. Confirm the computed size in DevTools first, then keep one owner (the line class, so line height never depends on token styling).

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** 02 (instant-syntax-swaps)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/highlight-styles.ts` (modify; :15-17)
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (modify; `.cm-lp-hN`)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Computed H1-H6 sizes recorded before and after in the commit message
- [ ] Only one rule sets heading font size; a test or style assertion pins it
- [ ] Heading line height is the same with and without the cursor on the line

## Comments

- 2026-10-29 17:35 — discovery — H1 text measured at 4.235x base (token em x line em); plan: drop HighlightStyle fontSize, line class owns size — c89a634c
