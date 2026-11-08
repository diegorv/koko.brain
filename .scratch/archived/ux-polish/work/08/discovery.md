# Issue 08 discovery

No `spec.md` for ux-polish; the Issue is self-contained. Four commits, A to D.

## A. Calendar grid
- `src/lib/features/collection/CollectionCalendarView.svelte:120` (2 solid), `:137` (2 dashed).
- `src/lib/features/collection/CollectionLinearCalendarView.svelte:147` (2 solid), `:152` (2 solid), `:167` (1 solid, 1 dashed), `:180` (2 dashed).
- That is 12 reads, not the "ten" the criterion counts (147 and 152 hold two each); all are replaced.
- Test: new `src/tests/lib/features/collection/collection-calendar-colors.test.ts`, source scan via `readFileSync` (prior art `settings-headings.test.ts`).

## B. Meta-bind (`live-preview/styles.ts`)
- `:674` chevron data URI -> two `linear-gradient` layers in `var(--lp-meta-bind-select-arrow)`; positions `calc(100% - 12px)` / `calc(100% - 8px)` at 50%, size 4px x 4px each (an 8px wide, 4px tall chevron centred where the 12px SVG's 6-to-18 polyline sat).
- `:683-684`, `:766-767` focus -> `var(--primary)` + `color-mix(... 30%, transparent)`; `:788` accent -> `var(--primary)`.
- New `.cm-lp-meta-bind-btn:focus-visible` after `.cm-lp-meta-bind-btn` (`:690`).
- Test: extend `styles.test.ts` with its `themeRules()` helper.

## C. Lavender H1
- `src/lib/core/settings/theme.logic.ts:211` `heading: '#6848A8'`.
- Test: `theme.logic.test.ts` after "has valid heading colors" (`:258`); snapshot regenerates only Lavender `--syntax-heading1`.

## D. Success token
- `theme.types.ts:120` `success` after `warning`; `theme-builder.logic.ts:254` `success: p.green`, `READABILITY_PAIRS` two entries after `:125`.
- `src/app.css:64` `--color-success`; `:153` (`:root`, Lavender built value) and `:218` (`.dark`, Default built value) static `--success`.
- `theme-editor.logic.ts:88` `'success'` after `'warning'`; update `theme-editor.logic.test.ts:269` expected keys.
- Tests: `theme-builder.logic.test.ts` (copy the warning case at `:205`), `theme.logic.test.ts` merge case (copy `:102`), `theme-css-contract.test.ts:69` names.

## Risks
- B: the gradient chevron is not pixel-identical to the SVG; only the manual check can confirm placement (not run here: no browser in the build step).
- D: the "every pair in every built-in theme" test lists oklch skips; `success` pairs are on hex backgrounds in both themes, so the skip list should not change.
- Manual browser checks in A and B are left to the owner.
