# 06: Small text in note blocks has an 11px floor, and the last px sizes in blocks go

**What to build:** The follow-ups Issue 04's reviews left open. Small text inside note blocks never drops below 11px, even when the editor font is set small. The QueryJS "Run again" button matches the first-run button, and the collection formula badge and progress chips scale with the editor font like the rest of the block. The two in-app checks Issue 04 could not run are listed for the owner.

**Blocked by:** 04

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Small block text has a hard 11px floor that still grows with the editor font: `font-size: max(11px, <current em>)` on the QueryJS heatmap text (`plugins/queryjs/kb-ui.ts:741,784`) and on the collection widget's small text (`features/collection/collection-block-widget.ts:243,319,354`, the "more" labels, linear-calendar day numbers and timeline bar titles). At the default editor font the size is unchanged; at an 8-12px editor font it stays at 11px instead of falling to 5-7.5px.
- [x] The timeline bar geometry still fits its title when the floor applies: bar height and lane pitch are derived from the bar's own font size (`1.4em` and `1.12em`, `collection-block-widget.ts:274-276,330-332,360`), so check they still hold when `max()` picks 11px, and adjust them if the floor breaks the 1.4 x 0.8 relation.
- [x] The em-only tests make a named exception for the floor and stay strict otherwise: `styles.test.ts` ("sizes no text in px outside the fixed controls"), the em-only default scan in `kb-ui.test.ts` and the `/^[\d.]+em$/` check in `collection-block-widget.test.ts` accept exactly `max(11px, <n>em)` on the floored elements and still fail on any other px font size.
- [x] The QueryJS "Run again" button (`queryjs-block-widget.ts:312`) renders at the same size as the first-run button. Today it reuses `.cm-lp-qjs-run` (`0.8em`, `styles.ts:876`) inside `.cm-lp-qjs-error` (`0.95em`, `:901`), so it comes out at about 12.2px against 12.8px.
- [x] The collection formula display helpers size their text in em: the `badge` (`features/collection/expression/evaluator.ts:383`) and `progress` (`:391`) HTML use inline `font-size:12px`, so these chips do not scale with the editor font inside collection cells. Keep their look at the default editor font.
- [x] Tests: the floor at a small and a default editor font (computed `max()` string on the floored elements), the Run-again size equal to the first-run size, and em sizes in the evaluator's badge and progress HTML.

## Notes

- **Created 2026-11-04** from Issue 04's review findings 3, 6 and 8 (`.scratch/typography-hierarchy/work/04/review.md`, `review-2.md`) and its round-2 findings 1 and 2.
- **Owner decision (2026-11-04):** a hard 11px floor via `max(11px, Xem)`, not pure em. The no-px tests get a named exception for it.
- **Owner checks, not for the agent** (they need the running desktop app; record results under Comments):
  - Run LP-PROFILE in `pnpm tauri dev` on a long note with many code blocks, revealing and leaving blocks, and confirm the code-block line decoration from Issue 04 adds no measurable cost. Issue 04 timed `computeCodeBlocks` in vitest only (about 1.38 ms, unchanged).
  - Open a linear-calendar collection and look at the timeline bars and day numbers with the editor font at 8px and at 32px: titles not clipped, bars aligned to their lanes.
- **Coordinate with Issue 05** if it is still open: it changes the default editor size to 19px and removes the `1.05em` multiplier, so "default editor font" above means 19px after it lands.
- **Size:** S.

## Comments

- **2026-11-04, branch `issue/06-block-text-floor-and-leftover-px`:** QueryJS heatmap text and collection small text (more labels, linear-calendar day numbers, timeline bar titles) use `max(11px, <n>em)`; the day cell lane pitch is derived from the floored bar font; the Run again button matches the first-run size; evaluator badge/progress chips size in em. Em-only tests accept the floor only on named elements. Review round 1: APPROVED (3 findings: two test-strictness fixes applied, chip floor left to the owner). Review round 2: APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite (`pnpm vitest run && pnpm build`) at 5d6dc819 exit=0, 467 files, 10874 passed, 1 skipped, 1 todo.
