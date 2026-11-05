# Issue 19 discovery: a filter citing `archived` takes control in a view

No `spec.md` in the feature folder; PRD.md:39 states the rule ("Archived notes are out by default. A filter citing `archived` or `_archived` takes control.").

## Files that change

- `src/lib/features/collection/collection.logic.ts:115` `QueryRowSet` gains a third `definition: CollectionDefinition` arg; `executeQuery` (`:204`) passes its (already overridden) `definition`. New exported pure `filterCitesArchived(filter)` next to `findFilterError` (`:222`).
- `src/lib/features/type-definitions/type-sidebar.logic.ts:115` `getNotesForViewPaths` gains `includeArchived = false`; the `!entry.archived` checks at `:125` and `:129` honour it.
- `src/lib/features/rail-shell/lens.logic.ts:703` `viewRowSet` gains a required `definition` (5th arg) and passes `includeArchived` (global or view filters cite it). `ViewQueryResult` (`:721`) gains `includesArchived: boolean`, set in `queryViewLens` (`:744`); `resolveViewLens` (`:803`) passes it to `describeViewFilters` (`:809`), which gets an `includesArchived = false` param and drops ", not archived" when true.
- `src/lib/features/collection/view-row-set.port.ts:17` `rows` gains `definition`; `CollectionView.svelte:236` closure forwards it; `src/lib/app/boot.ts:61` forwards it to `viewRowSet`.
- Docs: `help/documentation/12-collection.md` (limit paragraph `:161`, archived gotcha `:387`), `25-types-and-relationships.md` (Archived Note Filtering `:310`, `limit` row `:434`, view list `:441`).

## Detector

Parse each string item (`parse`, a throw means not cited: `executeQuery` reports it before any row set runs), recurse objects through `and`/`or`/`not`. Walk every AST node: `identifier.name`, `member.property` (and `member.object`), `call.callee.split('.')` plus `call.args`, `methodCall.receiver`/`method`/`args`, `binary`, `unary`, `array.elements`. A name cites when it is `archived` or `_archived`. `file.hasProperty(...)` cites when its first arg is the string literal `archived`/`_archived`. Other string literals do not cite. Formulas are not followed.

## Tests (test-first)

- `collection-logic.test.ts`: `describe('filterCitesArchived')`, the eight cited and two not-cited cases from the Issue, plus `and`/`or` nesting and an unparsable string. A row-set test that the third arg is the definition.
- `lens.logic.test.ts` `queryViewLens and resolveViewLens` (`:1298`): `archived == true` lists `Work/old.md`, `includesArchived`, rule without "not archived", `_system` and type/`.view` entries still out; `!_archived` same rows as no-citation; `countViewNotes`-equal via `view-lens.service` not needed here (CollectionView test covers it). Existing `viewRowSet` callers (`:1479-1612`) get the definition.
- `type-sidebar.logic.test.ts:626` getNotesForViewPaths: `includeArchived` keeps the archived entry in both sort branches.
- `CollectionView.test.ts:611` pattern with `recent-view.fixture.ts`: a `.view` with `filters: archived == true` renders `old.md`, "1 result(s)" text equal to `countViewNotes`.
- `describeViewFilters` unit: `includesArchived` drops the suffix.

## Risks and defaults

- False positive shows archived rows; false negative hides them. Both directions tested.
- `status == 'archived'` and `file.hasTag('archived')`: string literals outside `hasProperty` are ignored.
- Default taken: `viewRowSet`'s `definition` is required so every caller states it (6 test callers updated).
- Default taken: `hasProperty` is matched only as `file.hasProperty`, as the Issue says.
- An inline `collection` block runs with no row set: untouched.
