# Issue 20 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Builds on Issues 13, 17 and 19 (`work/13`, `work/17`, `work/19`); only the differences are listed.

## Files that change

- Prefactor: `features/note-action-bar/note-action-bar.service.ts:14-30` `deleteNoteWithConfirm` moves to new `core/filesystem/delete-note.service.ts`; `NoteActionBar.svelte:40-47` imports it from there. Its 4 tests move from `note-action-bar.service.test.ts:59-101` to `src/tests/lib/core/filesystem/delete-note.service.test.ts`.
- `features/type-definitions/type-sidebar.logic.ts`: `collectViewFiles` (:312) sorts with `naturalCompare`; new `getViewGroup` / `getViewVisible` next to `getViewOpensInEditor` (:353); `RESERVED_KEY_RULES` (:383) gains `_visible` (boolean) and `_group` (text); `sortViewFiles` (:433) orders by `_order`, then `getViewLabel` with `naturalCompare`, then path.
- `features/rail-shell/rail-shell.types.ts:81-97`: `TypeNavigatorRow.group: string | null`.
- `features/rail-shell/lens.logic.ts`: `viewNavigatorRows` (:524) drops `_visible: false`, puts ungrouped rows first, then groups by `naturalCompare` of name, each part in `sortViewFiles` order; type/Untyped rows (:379-389) get `group: null`. `staleTypesPickFix` (:430) takes `viewPaths`: a `view` pick is stale only when its target is not among them. `otherViewLabels` (:543) is replaced by `viewLabels(tree, entriesByPath, exceptPath?)` (every `.view` in the tree, hidden ones included). New pure `followTypesPickPathChange(saved, from, to)` next to `followFolderPathChange` (:861).
- `app/AppShell.svelte:159`: passes `collectViewFiles(fsStore.fileTree).map((v) => v.path)`.
- `features/rail-shell/TypesNavigator.svelte`: view rows rendered per section, a `data-types-navigator-group` subheading (div, `text-label`) before each group; New view / Edit view `existingLabels` from `viewLabels(fsStore.fileTree, entriesByPath[, path])`; "Move to Trash" (destructive, last, after a separator) calls `deleteNoteWithConfirm(path)`.
- New `features/rail-shell/types-navigator.service.ts`: `registerTypesNavigatorPathChangeConsumer`, wired in `app/lifecycle/app-lifecycle.service.ts:251` next to the Files one.
- `help/documentation/25-types-and-relationships.md` (:68/:386 tables, :130, :167-172, :330) and ADR 0027 amendment.

## Tests (prior art)

- `type-sidebar.logic.test.ts`: `collectViewFiles` natural order, readers, `ignoredKeyNotes` rows, `sortViewFiles` by label.
- `lens.logic.test.ts` `viewNavigatorRows` (:964), `otherViewLabels` (:1028) -> `viewLabels`, view pick (:1313) with `viewPaths`, `followTypesPickPathChange` like `followFolderPathChange` (:1519).
- `TypesNavigator.test.ts`: groups, Move to Trash (`ask` mocked, fs.service mock widened with `deleteItem`), the label tests get `fsStore.setFileTree(TREE)` and a hidden view case.
- `types-navigator.service.test.ts` copied from `files-navigator.service.test.ts`; `app-lifecycle.service.test.ts` registration like the Files one (:855).

## Risks / defaults

- `_group` blank or whitespace is ungrouped with no note (a string is the shape the reader uses); `_group: null` gets a note, like `_order: null`.
- The subheading is plain text (not a button); views with the same group stay contiguous because the builder emits them that way.
- The path-change consumer only clears on `to === null`; a rename or move of a picked view is not followed (Issue Notes).
