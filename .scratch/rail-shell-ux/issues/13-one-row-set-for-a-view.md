# 13: A `.view` lists the same rows, in the same order, in the editor and in the rail

**What to build:** One function owns the row set of a `.view` view: it drops archived notes and notes under the system folder, applies the view's own `sort`, else the top-level `_sort`, else the default (modified, newest first), pins notes with `_order`, and applies `limit` after ordering and exclusions. The collection editor (table and calendars, for the active tab), inline collection blocks of a `.view`, the rail's view lens and the navigator count all call it, so "N results" in the editor equals the count badge in the navigator for the first view. The Sort popover in the rail shows the effective sort (for example "Sorted by `_sort: modified`") instead of "No sorts applied" when only `_sort` orders the list; an unknown `_sort` value is reported (same tooltip mechanism as Issue 10) instead of silently meaning title. The rule line under the label says "first view" when the `.view` has more than one view.

**Blocked by:** 01, 10, 12

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: one fixture vault (an archived note, a `_system` note, five dated notes, a `.view` with `limit: 3` and no sort) gives the same paths, in the same order, through the editor's query path and through `resolveViewLens` (logic test, real parser and evaluator)
- [ ] `limit` applies after exclusions and ordering: the fixture yields 3 non-archived notes, newest first (logic test)
- [ ] The editor's "N results" for the first view equals the navigator's count for that `.view` (logic test on both count paths)
- [ ] `.collection` files keep today's rows (they are editor-only and out of this rule), proven by an existing or new test
- [ ] The Sort popover shows the effective `_sort` when the view has no sort of its own (component test)
- [ ] An unknown `_sort` value surfaces as an ignored-key note (logic test)
- [ ] The rule line says "first view" for a multi-view `.view` (logic test)

## Notes

- **Owner decision (2026-11-04):** the rail's rule wins in both surfaces (no archived, no system folder, `_sort` applied, one function).
- **Today (traced):** the editor keeps archived and system notes and index order (`features/collection/CollectionView.svelte:207-221,467`; `collection.logic.ts:114-194`); the rail drops them and orders by `_sort` with `_order` pins (`features/rail-shell/lens.logic.ts:570-595`; `features/type-definitions/type-sidebar.logic.ts:93-116,338-341`). `limit` slices before order and exclusions (`collection.logic.ts:171,186-188`). The rail runs only `views[0]` (`lens.logic.ts:550-556`).
- **Out of scope:** picking which view the rail runs (`_rail_view`) is Issue 22.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F10, F74, F33, F02.
- **Size:** M.

## Comments
