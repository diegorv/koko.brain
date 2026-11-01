# Issue 13 discovery: View lens

No `spec.md`; the source is `PRD.md` (Lenses table: View, Navigators: Types, Persistence, Q16). Builds on
`work/12` (Types navigator, `railTypesLens`, once-per-open stale check) and `sidebar-fixes/work/03` (view sort
order: `resolveViewListSort` + `getNotesForViewPaths`). Only the differences are listed.

## Files that change
- `rail-shell/lens.logic.ts`: `VIEW_LENS_KIND = 'view'` (target = absolute `.view` path); `viewNavigatorRows`
  (`collectViewFiles` + `sortViewFiles` + `getViewLabel`, count null: filled async); `parseTypesPick` accepts a view
  pick, so `pickedTypesLens` / `staleTypesPickFix` cover views once AppShell passes view rows + type rows;
  `resolveViewLens` (label from `_sidebar_label`, rule = the filters in words, notes = query paths over the
  system-folder-excluded entries in the order `resolveViewListSort` gives); `viewNoteType(groups, knownTypes)`;
  `newNoteRule` for `view` reads `NewNoteContext.viewTypeName` (typed rule when set, else a plain note).
- `rail-shell.types.ts`: `TypeNavigatorRow.count: number | null`, `viewPath`; `NewNoteContext.viewTypeName?`.
- NEW `rail-shell/view-lens.service.ts`: `runViewQuery(path, overrides, propertyIndex)` (cached parse,
  `buildOverriddenQuery`, `executeQuery`) and `countViewNotes` (refreshes the parse, as the classic counts do).
- `RailNoteList.svelte`: a view lens loads async (pattern of `TypeNoteList.svelte:153-270`: generation counter,
  seed per path + content hash, self-write latch), shows Sort / Filter popovers in the header, persists through
  `updateViewQuery`.
- `TypesNavigator.svelte`: Views section (header + New view) above Types, async counts, the view context menu
  from `TypeSidebar.svelte:378-415` (open view, copy path, change icon via `updateViewIcon`, reveal).
- `type-definitions.service.ts::createView`: returns the created path (the navigator picks it).
- `AppShell.svelte:104-122`: rows = view rows + type rows.

## Plan (test-first)
1. `lens.logic.test.ts`: `viewNoteType` (one `_type`/`type` equality in an AND group -> that type, canonical
   casing from known types; none, two, OR or NOT group, `!=` -> null); view rows; pick parse; stale fix with a
   deleted view; `resolveViewLens` order (view sort keeps query order; no sort uses `_sort`); New here rules.
2. `view-lens.service.test.ts`: query with overrides, counts, parse failure.
3. `RailNoteList.test.ts`: view lens rows in sort order, Sort change persists + reorders, Filter change, New here.
4. `TypesNavigator.test.ts`: Views above Types, counts, New view picks, view menu.
5. E2E `rail-shell.spec.ts`: pick a view, restart keeps it, deleted view falls back.

## Defaults taken
- The list is the query result minus archived notes and the system folder (`getNotesForViewPaths`' default,
  the classic Open tab; archived notes live in Archive); the count is the same list's length.
- Sort / Filter active state uses `text-tab-text-active` (the pinned tab-bar pair), not the primary hue.
- Rule text: the view's filters as expressions joined with "and" / "or" / "not", or "every note".
- `type` and `_type` both count as the type key (the engine aliases them); value matched case-insensitively
  to a known type, else used as written.
- New view picks the new view. A renamed or moved view is not followed (falls back on the next open).

## Risks
- RailNoteList duplicates part of TypeNoteList's view state machine until the classic shell is removed.
