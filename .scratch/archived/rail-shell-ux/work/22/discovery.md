# Issue 22 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Builds on Issues 10, 13, 17-21 (`work/10`, `work/13`, `work/17`-`work/21`); only the differences are listed.

## Files that change

- `features/collection/collection.types.ts:59-68`: `CollectionDefinition.railView?: string`.
- `features/collection/yaml-parser.ts`: `parseCollectionYaml` (:97-119) sets `railView` from a non-blank string `_rail_view`; new pure `viewIndexByName(views, name)` (-1 when none) and `railViewIndex(definition)` (that index, else 0); `updateViewEditYaml` (:259-290) edits `views[railViewIndex]` and, when `_rail_view` named that view, rewrites `_rail_view` to the new label.
- `features/rail-shell/lens.logic.ts`: `queryViewLens` (:705-725) runs `views[railViewIndex]`; `ViewQueryResult` gains `viewIndex` and `railViewName` (the name when `_rail_view` resolved, else null); `resolveViewLens` (:749-762) ends the rule with `view "<name>"` for a resolved `_rail_view`, else Issue 13's `first view`. `countViewNotes` follows through `queryViewLens`.
- `features/type-definitions/type-note-list.logic.ts:125-137`: `buildViewYamlUpdates(..., viewIndex)` sets `viewIndex`.
- `features/rail-shell/RailNoteList.svelte:210,242`: seed from `views[railViewIndex]`; `persistViewState` passes the index the last query ran (`result.viewIndex`).
- `features/type-definitions/type-sidebar.logic.ts:402-417`: `ReservedKeyRule.check(value, frontmatter)`, optional `note(value)` override; `_rail_view` row (non-string: "expected the name of one of its views"; a string no `views[].name` carries: `Ignored key _rail_view: "Bord" names no view; the first view runs`).
- `features/type-definitions/ViewDialog.svelte:93`: prefill from `views[railViewIndex]`; new optional `folder` prop passed to `createView`.
- `features/type-definitions/type-definitions.service.ts:262-270`: `createView(name, filters?, folder = vault root)`.
- `features/note-list/NoteRowMenu.svelte`: "Convert to view" (`isCollectionFile`), `runOrToast('convert {name} to a view', ...)` -> `renameItem(path, '<stem>.view')`, then `vaultStore.requestPromptIndexRefresh()` on success.
- `features/rail-shell/FilesNavigator.svelte`: New Collection icon `Database`; "New view" (`Table`) after the file creators, before New folder; a mounted `ViewDialog` with `folder` and `existingLabels={viewLabels(...)}`; new `onPickView(lens)` prop called on create.
- `app/AppShell.svelte:213`: `onPickView` -> `updateLayout({ railItem: TYPES_RAIL_ITEM, railTypesLens: { ...lens } })`.
- Docs: help 12 (intro + note at :155-156), help 25 (View Metadata Fields, Creating a View), ADR 0027 and ADR 0004 amendments.

## Tests (prior art)

- `collection/yaml-parser.test.ts` (parse, `updateCollectionYaml`, `updateViewEditYaml`); `rail-shell/lens.logic.test.ts` (`queryViewLens`, `resolveViewLens`, `viewNavigatorRows`); `type-sidebar.logic.test.ts` `ignoredKeyNotes`; `type-note-list.logic.test.ts`.
- `RailNoteList.view.test.ts`: seed and write for a two-view `.view`.
- New `note-list/NoteRowMenu.convert-to-view.test.ts`: real `renameItem` + path-change owner (as `collection/collection-view-index-path-change.test.ts`), real fs and editor stores.
- New `type-definitions/create-view-folder.service.test.ts`: real `createFile`, plugin-fs `readDir` + `invoke` mocked.
- `FilesNavigator.test.ts` (menu labels, icon, New view -> `onPickView`, `createView` mocked); `ViewDialog.svelte.test.ts` (folder arg, edit prefill of the `_rail_view` view).

## Risks / defaults

- `railView` keeps the string as written (no trim); matching is exact. A blank string is undefined at parse and reported as naming no view.
- Edit view with a stale `_rail_view` edits `views[0]` and leaves the key (main-session decision).
- The `_rail_view` note also applies to a type definition's frontmatter (it has no `views`), as Issue 21's rows do for view keys.
- `createView` keeps `setSelection({ kind: 'view' })`; the rail switch is the caller's (`onPickView`).
