# Issue 03 discovery: Types view lists notes in the Sort control's order

## Re-verified on main (F7)

- `TypeNoteList.svelte:264-276` runs `executeQuery` with `localSort` (via
  `buildOverriddenQuery`, `type-note-list.logic.ts:76-92`), collapses
  `result.records` to a `Set` of paths and re-sorts with
  `getNotesForViewPaths(..., getViewSort(viewEntry), sf)`
  (`type-sidebar.logic.ts:204-214`, `getViewSort` at `:446-449`, default
  `modified`). The query order only decides which notes survive `limit`.
- `executeQuery` sorts by `view.sort` (`collection.logic.ts:136-147`) and keeps
  index order when the view has no sort.

## Plan

1. `type-sidebar.logic.ts::getNotesForViewPaths`: `sort: string | null`. `null`
   keeps the iteration order of `matchingPaths` (a `Set` keeps insertion = query
   order); sub-filter still applies. A string keeps today's `sortNotes` path.
2. `type-note-list.logic.ts`: `resolveViewListSort(view, frontmatterSort)`
   returns `null` when the effective view has a sort (popover / YAML `sort:`),
   else the `_sort` value.
3. `TypeNoteList.svelte:276`: pass `resolveViewListSort(overridden.view, getViewSort(viewEntry))`.
4. Help doc `25-types-and-relationships.md:407,419`: say the Sort panel wins and
   `_sort` only applies to a view with no sort.

Source of truth: the view's `sort` (Sort popover, persisted to the `.view`
YAML `views[0].sort`) wins. `_sort` is the fallback for a view with no sort, so
the two cannot disagree on screen.

## Tests (test-first)

- `type-note-list.logic.test.ts`: real `executeQuery` + `getNotesForViewPaths`
  with a sort different from `_sort` -> notes in the sort's order; no sort ->
  `_sort` order. Copy `makeRecord` there.
- `type-sidebar.logic.test.ts` `getNotesForViewPaths`: `null` keeps path order.
- `TypeNoteList.view.test.ts`: a parsed view with `sort: title DESC` and
  `_sort` default renders Gamma, Beta, Alpha (covers "after reopening": the
  seed comes from the YAML). Copy the existing view pipeline tests.

## Risks / defaults

- With a sort set, `_order` pins no longer float to the top of a view list:
  the visible order is exactly the sort's. Default taken; types/nav lists are
  unchanged.
- No Sort set -> exactly today's behavior (`_sort`, default `modified`).
