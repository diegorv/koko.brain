# 09: Collection table: readable names, visible sort order, sticky header

**Origin:** design review 2026-11-17, proposals P47 (view side), P48 (part), P142 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/collection-queryjs.html` (P47, P48, P142), research `.scratch/ux-quick-wins/research/verdict-collection.md` (T1) and `breakdown.md` (old ticket 22). The inline block side of P47 is ticket 14.

**What to build:**

1. **Readable column names.** Pure `columnLabel(key, propertyConfigs)` in `src/lib/features/collection/collection.logic.ts`: the config `displayName` if set, else Name, Path, Folder, Extension, Size, Created, Modified for the seven `file.*` keys, else the raw key. Used by `resolveColumns` (`:469-494`, fallback at `:476`), by `PropertiesPanel.svelte` and by `SortPanel.svelte` (their `getDisplayName` bodies only). `file.basename` is not in `getAllAvailableColumns` (`toolbar/properties.logic.ts:12-20`), so the default column stays `file.name`. The header `th` gets `title` = the raw key when it differs. Note properties (`due_date`) and `formula.*` keys stay raw: humanizing them is an owner decision (open-itens 216).
2. **No `.md` in name cells.** Pure `formatColumnCell(key, value)` drops a trailing `.md` for `file.name` only; the value, filters and sorts are unchanged (`getPropertyValue(record, 'file.name')` still returns `Roadmap.md`, `collection.logic.ts:419`). A `file.path` cell keeps its full text.
3. **Visible sort order.** Pure `sortState(sorts, key)` in `toolbar/sort.logic.ts` gives `{ direction, rank } | null`. The header shows the rank only when more than one sort exists; `aria-sort` goes on the primary sorted `th` only (`CollectionTableView.svelte:44-49` shows an arrow only, `:27-31`). Header click behaviour is unchanged: replacing a saved multi-column sort on a plain click is deferred because it would rewrite the `.view` sort.
4. **Sticky header.** The inner `overflow-auto` div (`CollectionTableView.svelte:39`) becomes a plain div (the real scroller is `CollectionView.svelte:686`); `th` gets `sticky top-0 z-10 bg-card` with an inset bottom shadow. Sticky resolves against the nearest scroller, so no element between `th` and the component root may have an `overflow-*` class.
5. **Truncated text cells.** Text cells wrap their text in a span with `max-w-80 truncate` and `title` (max-width on a `td` is undefined in auto table layout and WebKit ignores it; the assertion is on the span).
6. **Help.** `help/documentation/12-views.md` lists the default column names.

Not in this ticket: the inline block (ticket 14), column reorder (writes `order`, open-itens 139 first), plain-click sort semantics, humanized note-property keys.

**Size:** M (5 source files, a new test file). Split point: items 1, 2 and 6 (logic, panels, help) first; items 3 to 5 (`CollectionTableView.svelte`) second.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (none expected: `e2e/specs/collection-block.spec.ts` asserts the inline block, which this ticket does not strip of `.md`).

- [x] Failing test first, `src/tests/lib/features/collection/collection-logic.test.ts`: with no `displayName`, `file.name` is `Name`, `file.mtime` is `Modified`, a note property keeps its key; `properties.file.name.displayName: Note` wins; `order`, filter and sort keys are unchanged. The assertions at `:342` and `:765` change on purpose in the same commit.
- [x] Failing test first, `src/tests/lib/features/collection/CollectionTableView.svelte.test.ts`: a `Roadmap.md` record renders `Roadmap`; the header `title` is `file.name`; a `file.path` cell keeps its text.
- [x] Failing test first, `src/tests/lib/features/collection/toolbar/sort-logic.test.ts` and the component: two sorts render ranks 1 and 2 and only the first `th` has `aria-sort="ascending"`; one sort shows no rank; `src/tests/lib/features/collection/CollectionView.view-writes.test.ts:195` (`'status ↓'`) stays green.
- [x] A 120-character text cell's inner span has `title` and the truncate classes; the `th` is `sticky`; no element between `th` and the component root has an `overflow-*` class.
- [x] New `src/tests/lib/features/collection/toolbar/PropertiesPanel.svelte.test.ts` and a `SortPanel` render check: `file.name` reads `Name`. `src/tests/lib/features/collection/CollectionView.test.ts:422-460` (`renderedNames()` compared to `records.map(r => r.name)`) compares names without `.md`; `RailNoteList.view.test.ts` and `RailNoteList.toolbar.test.ts` pass.
- [ ] Manual: the header stays visible while scrolling a table of 60 or more rows in the app.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P47 (view side).** Collection headers show raw column ids and file names keep `.md`: `displayName` falls back to the key ("file.name") and name cells show ".md". Add built-in display names for `file.*` columns with the raw key as a tooltip and hide ".md" in the cell only. Validation: revise, `file.name` keeps its Bases-style value.
- **P48 (part).** Clicking a collection header silently stacks multi-column sorts, with no rank and no `aria-sort`. This ticket ships the rank number and `aria-sort`; the click semantics (single sort cycling ASC, DESC, off; Shift+click for a secondary) are deferred. Validation: keep.
- **P142.** Collection tables have no sticky header or cell truncation: the header scrolls away and `nowrap` cells grow without limit. Make the thead sticky and cap text cells with `truncate` and a title. Validation: revise, sticky positioning resolves against the nearest scroller.

## Problem

A freshly created table shows a first column headed "file.name" full of `Roadmap.md` values, and a second sort added by an innocent header click is written to the `.view` file with nothing on screen saying the sort has two keys. In a long table the header scrolls away, and one long text cell stretches a column without limit.

## Evidence

Checked at `085b23c5d`.

- `collection.logic.ts:469-494` `resolveColumns`; `:419` `getPropertyValue('file.name')` returns `record.name`. `QueryResult.columns[].displayName` has two readers: `CollectionTableView.svelte:48` and `collection-block-widget.ts:441`, so the inline block header text follows `columnLabel` automatically; its `title`, `.md` stripping and scroll wrapper are ticket 14. Mods read only `records` (`src/lib/plugins/mods/mod-query.service.ts`).
- `CollectionView.svelte:397-409` `handleToggleSort` appends and persists the `.view` sort (`persistKey('viewSort', ...)`, `:408`); `CollectionTableView.svelte:27-31` arrow only; `:39` the inner `overflow-auto` div; `:44-49` no `aria-sort`.
- `toolbar/SortPanel.svelte` and `toolbar/PropertiesPanel.svelte` have their own `getDisplayName`; the `SortPanel` label also shows in the rail note list (`RailNoteList.svelte:818-825`); no rail test asserts a `file.*` label. The `'file.name'` button at `e2e/specs/rail-shell.spec.ts:664` is a FilterRow, untouched here.
- `CollectionTableView` has one importer (`CollectionView.svelte`) and no write path.

## Sequence with

shell-sidebars-ux 16 edits `CollectionTableView.svelte` (empty state at `:34-38`, new `filterCount` and `onEditFilters` props): different region, but run this ticket before 16 starts or after it merges, never in parallel. shell-sidebars-ux 25 moves the `.view` header out of `CollectionView.svelte`; this ticket edits only the table, the panels' `getDisplayName` bodies and tests. Tickets 14 (inline block, uses `columnLabel` and `formatColumnCell`), 15 (FilterPanel conjunction, FilterRow and FormulaRow names), 44 (SortPanel), 44 (keyboard sort order, `SortPanel`) and 47 (calendars) all follow. Open-itens 215 (truncation only) and 216 (sticky header and `file.*` names; note keys still need the owner) are partly covered and stay open; 139 (column set) is not touched.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.
- 2026-11-18, deliver (branch issue/09-collection-table-readable-names-visible-sort): `file.*` columns get readable names in the table header, SortPanel and PropertiesPanel; the table shows sort rank and `aria-sort`, a sticky header and truncated cells with `title`. Review round 1 APPROVED (fix: header sort state computed once), round 2 APPROVED with no findings. Tests: pnpm check 0 errors; full suite at 2431b82e3 exit 0, 656 files, 17440 passed, 56 skipped, 1 todo. Manual sticky-header check in the app still to do.
