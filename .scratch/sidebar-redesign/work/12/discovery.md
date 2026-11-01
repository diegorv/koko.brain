# Issue 12 discovery: Types navigator and type lens

No `spec.md`; the source is `PRD.md` (Navigators: Types, Lenses table, Persistence, Q25). Builds on `work/07`
(lens model), `work/08` (New here, `NewNoteRule`), `work/10` (`railPanelsVisible`) and `work/11` (`railItem`);
only the differences are listed. Views stay out (Issue 13).

## Files that change
- `features/rail-shell/lens.logic.ts`: `TYPES_RAIL_ITEM` + `TYPES_LENS` (`{ kind: 'type' }`, no target) in
  `RAIL_ITEM_LENSES`; `type` / `untyped` kinds in `resolveLens` (label `sidebarLabel`, rule "type is X, not
  archived" / "no type, not archived", notes = `type-sidebar.logic.ts::getNotesForSelection` over the system-folder
  -excluded entries, so order and set are the classic list's Open tab); `typeNavigatorRows` (from
  `buildTypeSections(..., 'all')`, then Untyped when `showUntypedNotes`); `parseTypesPick` / `pickedTypesLens`
  (saved pick, else first row, else `TYPES_LENS`); `staleTypesPickFix` (restart fallback); `newNoteRule`
  for `type` (`{ typeName }`) and `untyped` (plain note in the Cmd+N folder, no frontmatter).
- `rail-shell.types.ts`: `LensContext.typeMetadataMap`; `NewNoteRule` = plain `{ folder, frontmatter }` |
  typed `{ typeName }` (review 08 finding 4: extend the one rule, no second path).
- `new-note.service.ts`: a typed rule goes through `type-definitions.service.ts::createTypedNote` (type folder,
  dedupe, template), then `openFileInEditor`.
- NEW `features/rail-shell/TypesNavigator.svelte`: rows (icon, label, count), New type (`TypeNameDialog` +
  `createTypeDefinition`), the context menu copied from `TypeSidebar.svelte:282-375` (types part only).
- `Rail.svelte:35-41`: divider + Types (Layers icon) after Favorites.
- `core/settings/settings.types.ts:53-84`, `settings.store.svelte.ts:52-66`: `layout.railTypesLens`
  (`{ kind, target? } | null`, default null) and `layout.navigatorSize` (default 15).
- `core/layout/AppShell.svelte:88-91,131-145`: navigator pane (order 1) before the note list (order 2) when the
  item is Types, inside the `railPanelsVisible` block (so Cmd+1/2 hide both); one-shot restart check effect.
- `type-definitions.service.ts::renameType`: a rail pick on the old name moves to the new name.

## Plan (test-first)
1. `lens.logic.test.ts`: type lens label/rule/notes equal `getNotesForSelection`; untyped; rows + counts equal
   the list lengths; pick parsing; stale fix; New here rules. Then implement.
2. `new-note.service.test.ts`: typed rule creates in the type folder from its template and opens it; failure.
3. `settings.service.test.ts`: defaults for old files, round trip of `railTypesLens` and `navigatorSize`.
4. `type-definitions.service.test.ts`: rename moves the rail pick.
5. `TypesNavigator.test.ts` (new), `Rail.test.ts`, `RailNoteList.test.ts` updates.
6. E2E `rail-shell.spec.ts`: pick a type, New here, restart keeps it, stale type falls back, pane size saved.

## Prior art
`lens.logic.test.ts`, `RailNoteList.test.ts`, `Rail.test.ts`, `type-definitions.service.test.ts`
(`createTypedNote`, `renameType`), `settings.service.test.ts` rail item tests, `rail-shell.spec.ts`.

## Defaults taken
- Fallback runs once per vault open, when the first entries snapshot lands: a pure derived fallback would bounce
  to Inbox for up to 10 s after New type or a rename (the entries refresh is throttled). Stale pick: rail item
  becomes Inbox (if it was Types) and the pick is cleared. At runtime a missing pick shows an empty list.
- No pick yet: the first row. No rows: an empty list, New here hidden.
- Untyped row shows whenever `showUntypedNotes` is on (the Issue's words), even at 0.
- New here title `Untitled <Type>` (as `createNoteOfType`); New type also sets the rail pick.
- Navigator default size 15 %, min 8, max 30.

## Risks
- AppShell grows rail logic; the restart effect is covered only by E2E.
