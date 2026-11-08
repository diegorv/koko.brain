# Issue 11 discovery

No `spec.md` in `.scratch/rail-shell-ux/`; the Issue alone drives this.

## Files that change

- `src/lib/features/type-definitions/type-definitions.logic.ts:96-99` `extractTypeMetadata`: `name = normalizeTypeCasing(entry.title)` (already imported at `:3`). Drives the map key in `buildTypeMetadataMap` (`:135`), `sidebarLabel` default and the `BUILTIN_TYPES` lookup.
- `src/lib/features/type-definitions/type-definitions.store.svelte.ts:108-113` `buildTypeDefinitionPaths`: key by `normalizeTypeCasing(e.title)`; import it from `#lib/core/frontmatter/properties.logic.js` (features -> core, allowed).
- `src/lib/features/type-definitions/TypeNameDialog.svelte`: optional prop `normalize?: (name: string) => string`. `normalized = normalize ? normalize(value.trim()) : value.trim()`; `confirm()` hands `onConfirm` the normalized name; a `Saved as "<normalized>"` line under the field when it differs from the trimmed input and there is no error shown/present.
- `src/lib/features/rail-shell/TypesNavigator.svelte:114-118,353-371`: pass `normalize={normalizeTypeCasing}` to both dialogs; `handleNewType` gets the normalized name, so `onPick` targets it too.
- `src/lib/features/event-calendar/EventCalendarSection.svelte:80`: `const name = normalizeTypeCasing(calendar.eventTypeName)`; the file-name check (`:86-87`), `createTypeDefinition` and the post-create comparison (`:97`) all read `name`.

## Tests (red first)

- `src/tests/lib/features/rail-shell/TypesNavigator.test.ts`: New type `book` -> `createTypeDefinition('Book', { select: true })` + `onPick({ kind: 'type', target: 'Book' })` (copy "creates a type with New type and picks it", `:248`); rename `Project` -> `book` -> `renameType('Project', 'Book', '/vault/Project.md')` (copy `:239`); `Saved as "Book"` line shown for `book`, absent for `Book` (type into the input without Enter).
- `src/tests/lib/features/type-definitions/type-definitions.logic.test.ts`: `extractTypeMetadata` / `buildTypeMetadataMap` over `entryV2('/vault/book.md', { isA: 'Type' })`.
- `src/tests/lib/features/type-definitions/type-definitions.store.test.ts`: `setEntries` + `patchEntries` give `getTypeDefinitionPath('Book') === '/vault/book.md'`.
- `src/tests/lib/features/rail-shell/lens.logic.test.ts` `describe('typeNavigatorRows')` (`:360`): one `Book` row, count 2, label `Books`, definitionPath `/vault/book.md`.
- `src/tests/lib/features/event-calendar/EventCalendarSection.test.ts`: the service mock already returns `/vault/${name}.md`, so with `eventTypeName: 'event'` the create must be called with `Event`, no toast, panel closes (copy `:212`).

## Risks

- The Rust rename (`propagate_type_rename_inner`) compares `is_a == old_type` literally; the row's `typeName` is now the normalized `metadata.name`, so `oldType` is normalized. Rust is not touched (Issue decision).
- Two definitions `book.md` and `Book.md` now share key `Book`: the map keeps the last, the path index the first (pre-existing asymmetry for same-title collisions; a case-insensitive disk cannot hold both in one folder anyway).
- `EventCalendarSection` keeps the setting value as typed; only the create path normalizes. `eventType` lookup is case-insensitive already (`resolveEventTypeName`).

## Defaults taken

- The `Saved as` line hides while the error line shows (the Issue: "when it differs ... and there is no error"); with an empty field there is nothing to show.
- The menu item "Create type definition" (`TypesNavigator.svelte:343`) passes `typeName`, which is now always a normalized row name: unchanged.
