# 08: The space below a table is closer to the space above it

**Status:** ready-for-agent

Priority: P3 (visual; reported by the owner in the macOS app)

**What to build:** Below a rendered table there is visibly more blank space than above it. The table wrapper (`.cm-lp-table-wrapper`, `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:335-340`) has `paddingBottom: 24px` to make room for the hover-only `+` row button (`.cm-lp-table-add-row`, `height: 20px`, `styles.ts:372-378`), and that padding adds to the widget-buffer band every block widget has above and below (about 20 px). Owner decision (2026-11-03): reduce the bottom padding to about 8 px with a shorter `+` row button, so the space below is only a little larger than the space above. Keep the `+` column button and its right padding as they are.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** owner report 2026-11-03, src/lib/core/markdown-editor/extensions/live-preview/styles.ts:335-378, `e2e/specs/live-preview/click-reveal/{table,table-add-buttons}.spec.ts`

- [ ] The wrapper's bottom padding is about 8 px and the `+` row button fits in it; the row button still shows on hover and adds a row (`table-add-buttons.spec.ts` stays green)
- [ ] Failing first: an E2E check that the gap between the table's bottom edge and the next line's top is at most the gap above plus 12 px
- [ ] The band and corner tests in `table.spec.ts` stay green (their offsets may need to follow the new padding; keep what they assert)
- [ ] Not verified by the agent: the owner looks at the table in the macOS app

## Notes

- Owner decision (2026-11-03): smaller padding, not a button overlaid on the band.
- Owner decision (2026-11-03): a line right after a table with no blank line between keeps the GFM rule (it becomes a table row, GFM spec example 201); no change.
