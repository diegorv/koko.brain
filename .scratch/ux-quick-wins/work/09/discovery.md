# 09 discovery: collection table readable names, visible sort order, sticky header

No `spec.md` in `.scratch/ux-quick-wins/`. No save, index, decoration or QueryJS path changes; the inline block header text follows `displayName` (ticket 14 owns the rest).

## Files that change (`C = src/lib/features/collection`)

- `C/collection.logic.ts:470-474` `resolveColumns.toColumn`: `displayName: columnLabel(key, definition.properties)`. New exports next to `getPropertyValue` (`:417`): `columnLabel(key, propertyConfigs?)` (config `displayName`, else the seven `file.*` labels, else the key) and `formatColumnCell(key, value)` (`formatCellValue`, minus a trailing `.md` for `file.name` only).
- `C/toolbar/sort.logic.ts`: `sortState(sorts, key): { direction, rank } | null`, rank 1-based.
- `C/toolbar/PropertiesPanel.svelte:55-57`, `C/toolbar/SortPanel.svelte:45-47`: `getDisplayName` body returns `columnLabel(column, propertyConfigs)`.
- `C/CollectionTableView.svelte`: `:27-31` `getSortIndicator` uses `sortState`; `:39` `overflow-auto` div becomes a plain div; `:44-49` `th` gets `title` (raw key when it differs), `aria-sort` on rank 1 only, a `data-sort-rank` span when `currentSort.length > 1`, `sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]`; `:77-78` text branch renders `<span class="block max-w-80 truncate" title=...>{formatColumnCell(...)}</span>`.
- `help/documentation/12-views.md` Table View section: default column names list.

## Tests

- `collection-logic.test.ts`: `columnLabel` / `formatColumnCell` units; `:342` becomes `['Name', 'status', 'priority']`, `:765` `displayName: 'Name'`; `displayName: Note` wins; `order`/sort/filter keys unchanged; `getPropertyValue(file.name)` still `test.md` (`:615`).
- `toolbar/sort-logic.test.ts`: `sortState` (absent, rank 1, rank 2, empty).
- `CollectionTableView.svelte.test.ts` (copy its `render` helper, add `currentSort` prop): `Roadmap.md` renders `Roadmap`, header `title` `file.name`, `file.path` cell full text; two sorts give ranks 1 and 2, `aria-sort="ascending"` only on the first `th`; one sort no rank; 120-char text cell span has `title`, `max-w-80`, `truncate`; `th` has `sticky`; no ancestor of `th` inside the root has an `overflow-*` class.
- New `toolbar/PropertiesPanel.svelte.test.ts` and `toolbar/SortPanel.svelte.test.ts` (prior art `toolbar/FilterPanel.svelte.test.ts`): `file.name` reads `Name`; a configured `displayName` wins.
- `CollectionView.test.ts:422-460` `renderedNames()` compared to names without `.md`. `CollectionView.view-writes.test.ts:195` stays `'status ↓'` (one sort, no rank). Run `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts`, `collection-block-widget.test.ts`.

## Defaults taken

- Rank renders after the arrow in a small span (`Name ↑1`); header click behaviour unchanged.
- `.md` stripping is exact-case `.md`, display only.
- Truncate span is `block` because `max-width` does nothing on an inline span.
- Manual 60-row sticky check in the app cannot run in this build step; left for the owner.

## Risks

- jsdom has no layout: sticky and truncation are asserted by class, not geometry.
- Rail SortPanel (`RailNoteList.svelte:818`) passes `propertyConfigs={{}}`, so its `file.*` labels change too; no rail test or E2E asserts them (`rail-shell.spec.ts:664` is a FilterRow).
