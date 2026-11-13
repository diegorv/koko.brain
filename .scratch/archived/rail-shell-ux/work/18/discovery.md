# Issue 18 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Extends Issue 17 (`work/17/discovery.md`); only the differences are listed.

## Files that change

- `src/lib/features/collection/toolbar/FilterPanel.svelte:23-45,92-151` (prefactor commit): prop `showGlobal?: boolean` (default `true`); `{#if showGlobal}` around the "All views" `Collapsible` and its `Separator`. `CollectionView.svelte:533` and `RailNoteList.svelte:410` untouched.
- `src/lib/features/type-definitions/type-sidebar.logic.ts:333-341`: `buildNewViewYaml(name, filters?)` spreads `filters` onto `views[0]` only when defined. Type import of `CollectionFilter` from `collection.types`.
- `src/lib/features/type-definitions/type-definitions.service.ts:244-260`: `createView(name, filters?)` passes `filters` to the builder.
- `src/lib/features/type-definitions/ViewDialog.svelte`: `groups = $state<FilterGroup[]>([])`, reset in `setOpen(false)`; `<FilterPanel showGlobal={false} globalFilters={[]} viewFilters={groups} availableProperties={getAllKnownProperties(collectionStore.propertyIndex)} propertyIndex={collectionStore.propertyIndex} onGlobalFiltersChange={() => {}} onViewFiltersChange={(g) => (groups = g)} />` under the name; `blankValue` derived (non-raw row, non-unary operator, `value.trim() === ''`) disables Create and blocks `submit()` (so Enter too) with an inline message; submit calls `createView(trimmed, filterGroupsToFilter(groups))`.
- `help/documentation/25-types-and-relationships.md:337` "Creating a View".
- `e2e/specs/rail-shell.spec.ts`: new test after the Issue 17 happy path (`:531`).

## Tests

- New `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts` (jsdom; mount pattern from `FilterRow.svelte.test.ts`): default renders both sections; `showGlobal={false}` renders no "All views" and no `[data-slot="separator"]`; add, edit value, remove, conjunction change report via `onViewFiltersChange`.
- `ViewDialog.svelte.test.ts`: existing `toHaveBeenCalledWith('Reading')` become `('Reading', undefined)`; new cases for start/cancel/reopen, field list vs `getAllKnownProperties` with `collectionStore.setPropertyIndex`, operators per inferred type, triggers not creating/unmounting, blank-value block (message, Enter), and the submitted filter shapes.
- `TypesNavigator.test.ts:424,433,443`: same `undefined` second argument.
- `type-sidebar.logic.test.ts` `describe('buildNewViewYaml')`: filters round-trip through `parseCollectionYaml` + `seedToolbarStateFromDefinition`; no `filters` key anywhere when undefined.
- `type-definitions.service.test.ts` `describe('createView')`: filters read back with `yaml.parse` + `parseFilterToGroups`.

## Risks

- bits-ui dropdown menus portaled out of the dialog's focus trap / dismissable layer: an item click could count as an outside click and close the dialog, or Escape could close both. jsdom cannot show it; the E2E drives it.
- `FilterPanel` wraps its sections in `max-h-[400px] overflow-y-auto`; acceptable in the dialog.

## Defaults taken

- Blank-value message: "Every filter needs a value". Shown while a blocking row exists (no "typed" gate: a row was added on purpose).
- `availableProperties` is `getAllKnownProperties(index)` (no formulas: a new view has none), as the Issue states.
- The dialog widens to `sm:max-w-lg` so a filter row fits.
