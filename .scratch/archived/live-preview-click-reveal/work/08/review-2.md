VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | c04815bd: wrapper `paddingBottom` 10px, `.cm-lp-table-add-row` `height`/`fontSize` 6px (`styles.ts:341`, `styles.ts:378-379`). Measured in a temporary geometry probe (deleted, not committed): table bottom 221.36, `+row` top 221.36 / bottom 227.36 (= wrapper bottom), height 6. `elementFromPoint` 1, 2, 3 and 4px above the table bottom in the last-row cell all return `TD`; 1px below returns the `+row` button. The button no longer covers any cell. |
| 2 | major | resolved | 0b2a4477 (committed before the CSS fix) adds `+row button sits below the table, so a last-row cell bottom edge hits the cell` (`table-add-buttons.spec.ts:31-42`). It asserts button top >= table bottom and a `TD` hit 2px above the table bottom. On the old CSS the button top was 217.36 against a table bottom of 221.36 (the round-1 probe), so the first assertion fails there. It passes now. |
| 3 | nit | rejection stands | `+col` `bottom` 10px (`styles.ts:370`). Probe: col bottom 217.36, which is 4px above the table bottom, the same relation as on main (24 - 20). Width and `paddingRight` are unchanged. |

## Acceptance criteria re-checked

- [met] The wrapper's bottom padding is about 8 px and the `+` row button fits in it; the row button still shows on hover and adds a row (`table-add-buttons.spec.ts` stays green) — padding is 10px, and the table's -4px bottom margin leaves 6px below the table, which the 6px button fills exactly (probe: row top = table bottom, row bottom = wrapper bottom). `table-add-buttons.spec.ts` passed in my run (hover/add-row test included). 10px instead of 8 is the minimum that keeps the button off the table; see finding 1.
- [met] Failing first: an E2E check that the gap between the table's bottom edge and the next line's top is at most the gap above plus 12 px — the test landed in 292c83ef before the CSS change (round 1 verified the failure). After the fixes, probe: above 19.52, below 30.25, so the limit is 31.52 and it passes with 1.27px of headroom.
- [met] The band and corner tests in `table.spec.ts` stay green (their offsets may need to follow the new padding; keep what they assert) — `table.spec.ts` is unchanged by the fixes and passed in my run. The corner click (`dy: -4`, 12px from the right edge) lands below the `+col` bottom (wrapper bottom - 10) and right of the `+row` button (`right: 24px`), so it still misses both buttons.
- [not met] Not verified by the agent: the owner looks at the table in the macOS app — this is the owner's check and it is still pending. It does not block this review.

## Findings

1. **nit** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:341` — the padding is 10px, not "about 8 px", and the hover target is only 6px tall. The space the button adds below the table is 6px, and the 12px gap criterion leaves about 1.3px of headroom, so this is the right tradeoff. Fix: none in code. The owner should judge whether the 6px `+row` button is easy enough to hit during the macOS check.

## Checks run (this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on the five test files that name `cm-lp-table-add` or `cm-lp-table-wrapper` (`wikilink-click-capture`, `table-empty-cells`, `table-widget`, `meta-bind-input-redraw`, `core/block-band-click`): 5 files, 111 tests, exit 0.
- `bash scripts/e2e.sh` on `table.spec.ts`, `table-add-buttons.spec.ts`, `table-cell-controls.spec.ts` and a temporary geometry probe spec (deleted after the run): exit 0, 16 passed.
- Scope: the fixes touch only `styles.ts`, `table-add-buttons.spec.ts` and the workflow's `work/08/review.md`. No test was weakened or deleted, and `layer-baseline.json` is unchanged.
- Not run: the full suite (`pnpm vitest run && pnpm build`), which is deliver's job; the owner's macOS check is still pending.

## Resolution

1. nit (`styles.ts:341`, 10px padding / 6px `+row` target): no code change, as the finding itself says. 10px is the minimum that keeps the `+row` button off the table (the table's -4px bottom margin takes 4px of the padding), and the gap criterion leaves about 1.3px of headroom, so a taller target would break it. Left to the owner's macOS check: judge whether the 6px button is easy enough to hit.
