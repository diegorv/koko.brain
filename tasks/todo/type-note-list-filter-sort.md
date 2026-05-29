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

- [ ] Task 3: Modify `TypeNoteList.svelte`:
  - When `selection.kind === 'view'` AND cached parse succeeded, render `[ArrowUpDown] [ListFilter]` icon buttons on the right of the header row, replacing nothing existing (the `+` button only renders for `canCreate`/type selections, so no conflict).
  - Add local state `localGlobalFilters`, `localViewFilters`, `localSort`, seeded from cached definition on view switch. Reset on selection change.
  - In `loadViewNotes`, apply local overrides on top of `parsed.definition` / `view` before calling `executeQuery` — mirror CollectionView's `defWithFilters` + `viewWithOverrides`.
  - Persist via `updateViewQuery` (Task 2). Use a `selfUpdate` flag to skip the next reseed when our own write bubbles back via `entriesVersion`.
  - Active-state color: `text-primary` when filters/sorts non-empty, `text-muted-foreground` otherwise.

- [ ] Task 4: Update tests. Existing files:
  - `view-parse-cache.test.ts` — cover new yaml cache field + getter.
  - `type-definitions.service.test.ts` — cover `updateViewQuery` writes + cache invalidation.
  - No component test for TypeNoteList exists. Decision: skip a new component test (DOM heavy, would need full Svelte 5 mount harness). Cover the new helpers + the existing logic suites instead. Note this gap in commit body.

## Notes

- `FilterPanel` and `SortPanel` are already exported from `collection/toolbar/`.
- `filterGroupsToFilter` returns `string | CollectionFilter | undefined` — feed straight into `updateCollectionYaml` and the override path.
- The TypeSidebar count effect already debounces 1s and runs on `entriesVersion` bump. Our write triggers a filesystem watcher event, which bumps `entriesVersion`, which re-runs the counts query. We just need to make sure `refreshViewDefinition` runs before the next read, so counts use the new YAML.
- `loadViewNotes` uses `executeQuery(parsed.definition, view, propertyIndex)` — must change to use the overridden definition + view, OR seed local state only on initial load and let local state drive subsequent runs.
- `viewLoadGeneration` already exists for race-condition guard — reuse it.
