VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: in `TypesNavigator.test.ts`, New type with `book` calls `createTypeDefinition('Book', { select: true })` and `onPick({ kind: 'type', target: 'Book' })` (service mocked as the file already does) — `src/tests/lib/features/rail-shell/TypesNavigator.test.ts:268-276` asserts both calls. The red state follows from the code: before the diff, `TypeNameDialog.confirm` passed `value.trim()` (`book`) through `handleNewType` unchanged. The fix is `normalize={normalizeTypeCasing}` at `TypesNavigator.svelte:359`, and `savedName` feeds `confirm()` at `TypeNameDialog.svelte:32,42`. The test passes.
- [met] Rename type from `Project` to `book` calls `renameType('Project', 'Book', '/vault/Project.md')` (same test file) — `TypesNavigator.test.ts:278-284`, wired through `normalize` at `TypesNavigator.svelte:372`. The test passes.
- [met] While the field holds `book`, the dialog shows the line `Saved as "Book"`; with `Book` it shows no such line (same test file, asserting rendered text) — `TypesNavigator.test.ts:286-299` checks `document.body.textContent`. `Book` is not an existing fixture type, so the absence comes from the `savedName !== value.trim()` branch (`TypeNameDialog.svelte:67-68`) and not from an error hiding the line.
- [met] `extractTypeMetadata` / `buildTypeMetadataMap` on a definition entry titled `book` (path `/vault/book.md`) give `name` `Book`, map key `Book`, `sidebarLabel` `Books` and `path` `/vault/book.md` (logic test) — `type-definitions.logic.test.ts:123-128` (extract) and `:136-140` (map keys `['Book']`, matching name/label/path). The fix is `name = normalizeTypeCasing(entry.title)` at `type-definitions.logic.ts:102`. One more test, `:130-132`, checks the lowercase-builtin icon fallback.
- [met] `typeDefinitionsStore.setEntries` with that definition makes `getTypeDefinitionPath('Book')` return `/vault/book.md`; `patchEntries` keeps the same key (store test, real store) — `type-definitions.store.test.ts:240-248` uses the real store for both setEntries and patchEntries. The patch touches the Type entry, so `buildTypeDefinitionPaths` (`type-definitions.store.svelte.ts:113-121`, now keyed by `normalizeTypeCasing(e.title)`) is rebuilt.
- [met] `typeNavigatorRows` over a definition entry (`isA` `Type`, title `book`, path `/vault/book.md`) and two notes with `isA` `Book` returns one type row with `typeName` `Book`, label `Books`, count 2 and `definitionPath` `/vault/book.md` (logic test in `lens.logic.test.ts`, map built with the real `buildTypeMetadataMap`). The note fixtures use `isA: 'Book'` because that is what Rust sends for both `_type: book` and `_type: Book` (`src-tauri/src/vault/entry.rs:362-369`); today this returns two rows — `lens.logic.test.ts:399-409` uses `toEqual` on the exact single-row array. Before the diff the metadata key was `book` and the notes grouped as `Book`, so `buildTypeSections` (`type-sidebar.logic.ts:184-195`) emitted a fallback `Book` row plus an empty `book` row.
- [met] Settings > Calendar > Event type name: `EventCalendarSection.svelte:80-100` normalizes the typed name with `normalizeTypeCasing` before the file-name check (`:86-87`), `createTypeDefinition` and the post-create file-name comparison (`:97`), so `event` creates `Event.md` with no false "already exists" toast (component test, Tauri boundary mocked, real stores) — `EventCalendarSection.svelte:82` sets `name = normalizeTypeCasing(calendar.eventTypeName)`, and `fileName`, the root check, `createTypeDefinition(name)` and the post-create comparison all read it. The test is `EventCalendarSection.test.ts:224-233`: `createTypeDefinition('Event')`, no `toast.error`, panel closed.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings (213 files).
- `pnpm vitest run src/tests/lib/features/type-definitions src/tests/lib/features/rail-shell src/tests/lib/features/event-calendar src/tests/lib/features/note-action-bar src/tests/lib/architecture`: exit 0, 65 files and 1988 tests passed.
- `pnpm vitest run src/tests/lib/features/file-icons` (the `icon-resolver` path index consumer): exit 0, 6 files and 143 tests passed.
- My test verdict rests on these files: `TypesNavigator.test.ts`, `lens.logic.test.ts`, `type-definitions.logic.test.ts`, `type-definitions.store.test.ts`, `EventCalendarSection.test.ts`, plus the rest of the directories listed above. The full suite and `pnpm build` were not run; they belong to deliver.
- Scope: Rust is unchanged and `validateTypeName`, `rewriteTypeInFrontmatter`, `createTypeDefinition` and `renameType` are untouched, as the Issue asks. The layer baseline and BASELINE_SIZE are unchanged. The new `features/ -> core/` import is allowed.

## Traced consumers (no defect found)

- `renameType('Book', ...)`: the TS open-tab rewrite already normalizes the old value (`type-definitions.logic.ts:188,208`), and the Rust `propagate_type_rename` matches the normalized `is_a`.
- `existingTypeNames` (`TypesNavigator.svelte:108-113`) reads the now-normalized map keys, so the rename filter `n !== target.name` removes the right entry.
- `note-action-bar.logic.ts:31` already normalizes `_type`, so `NoteActionBar.svelte:70` now finds a `book.md` definition's metadata.
- The event calendar lookup `resolveEventTypeName` is case-insensitive, so a setting left as `event` resolves to the `Event` key after creation.

## Findings

1. minor — `src/lib/features/type-definitions/type-definitions.store.svelte.ts:117-119` and `type-definitions.logic.ts:134-140`. Two definitions whose titles differ only in case (`book.md` and `Book.md` in different folders) now share the key `Book`. The path index keeps the first and the metadata map keeps the last, so `getTypeDefinitionPath('Book')` and `typeMetadataMap.get('Book').path` can point at different files. Two definitions with identical titles already behaved this way, and the build report and discovery both disclose it. Fix: none needed for this Issue. If it matters, record it as a follow-up that makes both indexes agree on first-wins.
2. nit — `src/tests/lib/features/rail-shell/TypesNavigator.test.ts:286-299`. No test checks that the `Saved as` line stays hidden while a validation error shows (for example `project` against the existing `Project`), which is the `{:else if error === null ...}` branch at `TypeNameDialog.svelte:67`. Fix: optionally add an assertion that typing `project` shows the duplicate error and no `Saved as` line.

## Resolution

1. Not fixed in this Issue, as the finding itself says. Two definitions with identical titles already split the path index and the metadata map the same way before this change; making both indexes agree on first-wins is a separate change for a follow-up Issue if the owner wants it.
2. Fixed: the `Saved as` test in `TypesNavigator.test.ts` now types `project` against the existing `Project` type and asserts the duplicate error shows and no `Saved as` line does.
