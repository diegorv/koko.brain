# Issue 51 discovery: the note list header keeps its title readable

No `spec.md` in `.scratch/ux-polish/`; source is `review-2026-11-04.md` section 3 row 4 and `work/layout.md` P5 / fix 6.

## Files that change

- `src/lib/features/rail-shell/RailNoteList.svelte`
  - :422 title `truncate text-title` -> add `min-w-16 flex-1` (64px at 15/600 keeps at least 4 characters plus the ellipsis).
  - :423 count `text-file-explorer-muted-fg` (1.33:1 on `bg-tab-bar`) -> `text-tab-text-inactive`.
  - :469-492 "Daily note" (`headerAction`) and "New here" text buttons -> icon-only buttons: drop the text label, add `aria-label` (the label), keep `title` as the tooltip, square `p-1` like Sort and Filter (:428, :449).
- `src/tests/lib/features/rail-shell/RailNoteList.test.ts`: new narrow-header test (fails first), and the existing `textContent === 'Daily note' / 'New here'` assertions (:357, :510, :929) move to the accessible name.

## Plan

1. Failing test: mount the Today lens in a 200px-wide target with a Daily note opener registered; assert the label has `min-w-16` and `flex-1`, the count has `text-tab-text-inactive`, `READABILITY_PAIRS` holds `['ui', 'tabTextInactive', 'ui', 'tabBar', 4.5]`, and both actions are buttons with an svg, no text, and `aria-label` "Daily note" / "New here".
2. Change the markup; update the three label assertions to `aria-label`.

## Contrast criterion

`READABILITY_PAIRS` (`core/settings/theme-builder.logic.ts:119`) already lists `tabTextInactive` on `tabBar` at 4.5, and `theme-builder.logic.test.ts:239` ("holds for every pair in every built-in theme") checks it in both built-in themes. No new pair; the component test pins the count to that token and asserts the pair is listed.

## Prior art

- Sort / Filter triggers in the same header: icon-only, `title`, `text-tab-text-inactive`.
- Rail buttons (`Rail.svelte:121-124`): `title` + `aria-label`.

## Defaults taken

- **Always** icon buttons, no width breakpoint: jsdom has no layout, a container query cannot be tested, and the header is ~280px in practice.
- Tooltip stays the native `title`, matching Sort and Filter beside them. Moving the header buttons to shadcn `Button` + `Tooltip` (`icon-xs`) is Issue 66's scope.
- The `ml-auto` on the count stays (a no-op once the title is `flex-1`).

## Risks

- jsdom cannot measure truncation; the test pins the layout classes that guarantee it, not a rendered width.
- E2E finds the buttons by role name (`rail-shell.spec.ts:194, :821`); the `aria-label` keeps those names, so the specs are unchanged.
