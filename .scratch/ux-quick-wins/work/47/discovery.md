# 47 discovery: calendars count undated notes; view tabs show their type

No `spec.md` in `.scratch/ux-quick-wins/`. Rules read: `docs/agents/live-preview-rules.md` rule 2 (cache data, never DOM). Repeats the cache-entry pattern of `work/14` (`viewNames` next to `result`); this Issue adds `undatedCount` the same way.

## Files that change

- `src/lib/features/collection/calendar.logic.ts:68-120`: new exported `countUndated(records, dateProperty)` next to `groupRecordsByDate`, built on `extractDateFromRecord`.
- `src/lib/features/collection/collection-block-widget.ts` (`W`): `W:26-35` `CollectionCacheEntry` gains `undatedCount`; computed on the miss path (`W:124-126`) only for a calendar / linear-calendar view with a `dateProperty`, else 0. `W:135-140` header text `Name (12, 5 without date)`, the views-hint span kept. `W:153-161` calendar branches: records > 0 and all undated renders `div.cm-lp-collection-empty` "No dated entries" instead of the grid (after the `dateProperty` check, so "Configure a date property" stays).
- `src/lib/features/collection/CollectionView.svelte`: `$derived` `undatedCount` over `queryResult.records` (calendar / linear-calendar with `dateProperty`, else 0). `:587` reads `N results, M without <dateProperty>` when M > 0. `:695-720` both calendar branches: all undated shows a muted "No dated entries" line. `:534-541` tab button gets a `Table` / `Calendar` / `CalendarRange` icon, `aria-hidden`. `:576-582` disabled Delete item carries the muted reason "A collection needs at least one view". `:594-602` the calendar config `PopoverTrigger` gets `aria-label` + `title` "Calendar settings" (see Defaults).

## Tests (prior art in the same files)

- `calendar-logic.test.ts`: `countUndated` empty / missing / unparseable / `endDateProperty` ignored / all dated.
- `collection-block-widget.test.ts` query-data-cache describe (`:210`): calendar YAML over 3 records, 1 undated; header on first render and cache hit; cache test in the style of `:356` (mutate the live Map, no version bump, second `toDOM()` keeps the first count); table block has no "without date"; all undated shows "No dated entries" and no table.
- `CollectionView.test.ts`: new describe for the toolbar count (calendar and linear-calendar), table `N results`, all-undated muted line; tab icons; Delete reason with one view and none with two (context menu opened like `:715`). `openConfig` (`:749-760`) finds `button[aria-label="Calendar settings"]`.

## Defaults taken

- **Shell-sidebars-ux 16 is not done** (its ledger row is `todo`), and the Issue names it as the source of the "Calendar settings" name. Without the name the `openConfig` criterion cannot hold, so this Issue adds `aria-label` and `title` "Calendar settings" on the bits-ui `PopoverTrigger` (the element that toggles, which is what 16 asks for). 16's restructure to the `child` snippet will touch the same lines; it rebases over this.
- Block header wording `5 without date` (the block has no room for the property name); the tab says `5 without <dateProperty>` as the Issue states.
- "No dated entries" in the block reuses `cm-lp-collection-empty` (muted, no inline font-size, so the font-scale tests stay as they are).
- Tab icon size `size-3` like the Add view `Plus`; unknown types fall back to the table icon (types are limited to `VIEW_TYPES`).
- Delete reason as a second line under "Delete view" (`text-xs text-muted-foreground`), only when disabled.

## Risks

- The context-menu "one group" test reads item `textContent`; with two views the reason is absent, so it stays `Delete view`.
- E2E `collection-block.spec.ts` asserts table headers only (`Active (1)`); no selector changes, so E2E is not in this step.
