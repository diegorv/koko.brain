# Filter + Sort buttons in TypeNoteList for .view selections

Add the same Filter (ListFilter) and Sort (ArrowUpDown) popover buttons that exist
in `CollectionView.svelte` to `TypeNoteList.svelte`, but only when the active
selection is a `.view` file. Changes persist back into the `.view` YAML using the
existing `updateCollectionYaml` round-trip (same as CollectionView).

Scope (confirmed with user):
- Selection: only `selection.kind === 'view'`. Type/nav/untyped do not render the buttons.
- Persistence: writes to the `.view` file (full round-trip, mirroring CollectionView).
- Panels: Filter + Sort only. Properties / Calendar config out of scope.

## Tasks

- [x] Task 1: Extend `view-parse-cache.ts` to also cache raw YAML text alongside the parsed definition. Expose `getCachedViewYaml(path)` (sync, returns `string | undefined`). `refreshViewDefinition` already reads from disk — store its content into the new field. Add tests.

- [x] Task 2: Add `updateViewQuery(path, updates)` to `type-definitions.service.ts`. Wraps `updateCollectionYaml(content, updates)` + `writeTextFile` + `refreshViewDefinition(path)` to bust the parse cache. Mirrors `updateViewIcon` shape. Updates type signature is the same `CollectionYamlUpdates` accepted by `updateCollectionYaml`. Add tests (mock writeTextFile + readTextFile).

- [x] Task 3a: Extract pure helpers to a new `type-note-list.logic.ts`:
  - `seedToolbarStateFromDefinition(parsedDefinition, activeView)` → `{ globalFilters, viewFilters, sort, formulas }`.
  - `buildOverriddenQuery(definition, view, localGlobalFilters, localViewFilters, localSort)` → `{ def, view }` ready for `executeQuery`.
  - `combineAvailableProperties(propertyIndex, viewFormulas)` → `string[]` (base props from index + `formula.*`).
  - `countActiveFilters(global, view)` → `number`.
  - No framework imports. Pure transformations. Add tests in `src/tests/lib/features/type-definitions/type-note-list.logic.test.ts`.

- [x] Task 3b: Modify `TypeNoteList.svelte` to use those helpers + render the toolbar:
  - When `selection.kind === 'view'` AND the local state was seeded for that view, render `[ArrowUpDown] [ListFilter]` icon buttons on the right of the header row (no conflict with the `+` button — that one only renders for type selections).
  - Local state `localGlobalFilters`, `localViewFilters`, `localSort`, `viewFormulas`, seeded via `seedToolbarStateFromDefinition` on view switch. Reset on non-view selections.
  - In `loadViewNotes`, apply `buildOverriddenQuery` on top of the parsed definition before calling `executeQuery`.
  - Persist via `updateViewQuery` (Task 2). Use a `selfUpdate` flag to skip the next re-seed when our own write bubbles back via `entriesVersion`.
  - Active-state color: `text-primary` when filters/sorts non-empty, `text-muted-foreground` otherwise.

- [x] Task 4: Cover the new code paths in tests. Existing files:
  - `view-parse-cache.test.ts` — already covered in Task 1.
  - `type-definitions.service.test.ts` — already covered in Task 2.
  - `type-note-list.logic.test.ts` — created in Task 3a.
  - No component test for TypeNoteList exists. Decision: skip a new component test (DOM heavy, would need full Svelte 5 mount harness). Cover the new helpers + the existing logic suites instead. Note this gap in commit body.

## Notes

- `FilterPanel` and `SortPanel` are already exported from `collection/toolbar/`.
- `filterGroupsToFilter` returns `string | CollectionFilter | undefined` — feed straight into `updateCollectionYaml` and the override path.
- The TypeSidebar count effect already debounces 1s and runs on `entriesVersion` bump. Our write triggers a filesystem watcher event, which bumps `entriesVersion`, which re-runs the counts query. We just need to make sure `refreshViewDefinition` runs before the next read, so counts use the new YAML.
- `loadViewNotes` uses `executeQuery(parsed.definition, view, propertyIndex)` — must change to use the overridden definition + view, OR seed local state only on initial load and let local state drive subsequent runs.
- `viewLoadGeneration` already exists for race-condition guard — reuse it.
