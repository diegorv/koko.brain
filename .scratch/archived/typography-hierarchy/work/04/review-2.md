VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `collection-block-widget.ts:274-276,330-332,360`: bar `font-size: 0.8em`, `height: 1.4em` and `top: calc(lane * (1.4em + 1px) + 1px)`, all in the bar's own em. The day cell uses `calc(lanes * (1.12em + 1px) + 1px)` in the cell's em, and 1.12 = 1.4 x 0.8, so lane pitch and bar height stay consistent at any editor font. The fixed 16px `BAR_HEIGHT` is gone (grep finds no leftover). Tested: the lane-cap cell height and the new "sizes event bars in em" case in `collection-block-widget.test.ts`. |
| 2 | minor | resolved | Day numbers are `0.8em` (:301), below the `0.85em` month label (:316). The comment no longer claims a text-xs ancestor. The test checks that the day number size is less than the month label size. |
| 3 | minor | rejection stands | Owner call, the Issue does not require a hard floor. A `max(11px, …)` floor would need an exception to the no-px test. |
| 4 | minor | rejection stands | An in-app LP-PROFILE run needs the running desktop app. The vitest timing in the Issue Comments covers the same JS. The run is still owed by the owner (noted again below). |
| 5 | nit | resolved | `code-block-field.test.ts:65-67` and `table-field.test.ts:56-58` assert `spec.class` is `cm-lp-codeblock-line` / `cm-lp-table-line`, which ties each decoration to its styles rule. |
| 6 | nit | rejection stands | Rounding-level difference; the Issue asks nothing about the two buttons matching. |
| 7 | nit | resolved | `collection-block-widget.test.ts:502` now reads "The blue first slot needs dark text." |
| 8 | nit | rejection stands | `evaluator.ts` badge/progress are outside the Issue's list. Still a follow-up candidate. |

## Acceptance criteria re-checked

- [met] Collection blocks use `em`: `.cm-lp-collection-block` 13px (`styles.ts:520`), header and table 12px, error/loading/empty 12px and footer 11px (`:558-577`), and the inline styles in `collection-block-widget.ts` (12/11/10/9px at `:180,219,233,241,275,288,293,308,315,350`). — The fix moves the remaining px bar geometry to em. Day numbers are 0.8em and bars are 0.8em/1.4em. Only the 1px gaps and the 2px border radius stay px, and those are not text sizes. `collection-block-widget.test.ts` passes.
- [met] The collection widget and the Svelte collection views agree for the same view: linear-calendar day numbers are 9px in the widget (`collection-block-widget.ts:293`) and `text-[11px] font-medium` in `CollectionLinearCalendarView.svelte:150`; weekday headers have no size in the widget (`:190-196`) and `text-xs font-medium uppercase` in `CollectionCalendarView.svelte:119`. — Day numbers are 0.8em weight 500 under the 0.85em semibold month label, the same order as the Svelte view (11px under 12px). Weekday headers are unchanged since round 1. Tested.
- [met] Timeline event bar titles (`collection-block-widget.ts:350`, 9px white on a property color) meet the readable floor and pick a text color that contrasts with the bar color. — The title stays at 0.8em with the `barTextColor()` contrast color. The bar now grows with its title, so the title is not clipped at large editor fonts. Tested.
- [met] Tests: assert the theme rules and widget styles resolve in `em` (no `px` font sizes left in the touched rules except borders and fixed controls), and that the code block widget and its revealed lines use the same size. — New class-binding assertions in `code-block-field.test.ts` and `table-field.test.ts`, and the new em bar-geometry test. No test was weakened: the lane-cap height assertion changed from the px formula to the em calc, which is the same geometry.

## Findings

1. **minor**: `.scratch/typography-hierarchy/issues/04-editor-blocks-scale-with-the-editor-font.md` (Notes, owner decision). Carried from round 1, finding 4: the in-app LP-PROFILE run on a long note is still owed. Fix: the owner runs it in `pnpm tauri dev` and records the numbers in Comments.
2. **nit**: `src/lib/features/collection/collection-block-widget.ts:330-360`. The em bar geometry has only been checked through jsdom style strings. Nobody has looked at it in the app at 8px and 32px editor fonts. Fix: a visual check when the owner next opens a linear-calendar collection.

## Checks run by this review

- `pnpm check`: exit 0, 213 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `collection-block-widget.test.ts`, `code-block-field.test.ts`, `table-field.test.ts`, `styles.test.ts`, `linear-calendar-logic.test.ts`: exit 0, 5 files, 159 passed.
- Fix diff `969c7d89..HEAD` touches only `collection-block-widget.ts`, three test files and `review.md`. No scope creep, no layer-baseline change, `ledger.md` untouched.
- Full suite and `pnpm build` are left to deliver.
