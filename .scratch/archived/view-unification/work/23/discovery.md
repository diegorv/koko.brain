# Issue 23 discovery: Retire `.collection` files

No `spec.md`; `PRD.md` § Owner decisions covers it. Lines from this worktree at `679846a07`.

## Files that change (app)

- `core/editor/editor.service.ts:6,137`: only `isViewFile` maps to `fileType: 'collection'`. A `.collection` gets no `fileType`, a text tab like `.txt`.
- `core/filesystem/fs.logic.ts:70-73` (`isCollectionFile` deleted), `:75` comment, `:123,127`: `.view` only maps to YAML. A `.collection` falls to `matchFilename(languages, name)`, which has no match, so `getLanguageEffectsSync` gives markdown (as `Makefile`/`.txt`). No error path.
- `core/layout/layout.logic.ts:10,28`: a `.collection` tab no longer hides the right sidebar (a text file, like `.txt`).
- `features/rail-shell/lens.logic.ts:10,906,919` + `rail-shell.types.ts:34`: `FileKind` loses `collection`; a `.collection` row is `other` ("File"). `RailNoteList.svelte:9,663` drops `collection: Database` (`Database` import goes with it).
- `features/note-list/NoteRowMenu.svelte:13,19,79-93,232-237`: Convert to view removed (`Table` icon import goes; `renameItem`, `vaultStore`, `getFileName` stay in use).
- `features/collection/CollectionView.svelte:15,64-69,262,285,328`: no `isView`; always `getViewRowSetPort()`, and writes through `rewriteView` whenever given. Only a `.view` tab reaches it now (EditorView `:86`), so production behaviour is the same.
- Stale comments: `yaml-parser.ts:4,146,171,357`, `collection.types.ts:30,60`, `collection.store.svelte.ts:21`, `filter.logic.ts:542`, `EditorView.svelte:29`, `CollectionView.svelte:41,50,66`, `collection.service.ts:175`.

## Tests

- Failing first: `editor.service.test.ts:119` (`Foo.collection` -> `fileType` undefined) and a new `EditorView.test.ts` case (open `Foo.collection` through `openFileInEditor`, EditorView renders CodeMirror with the text, no collection toolbar). Plugin-fs mocked with `importOriginal` so other exports stay.
- `EditorView.test.ts:351-470` (collection tabs, ports registered): paths become `.view`; entries + `vaultStore.open` so the port's rows list the 200 notes.
- `CollectionView.test.ts:649,682` and `CollectionView.restored-view.test.ts:208`: the `.collection` plain-query cases pin the removed branch; deleted. `:308` PATH and `CollectionViewHarness.svelte:19` default -> `.view` (no port in those suites, so the plain query still runs).
- `NoteRowMenu.test.ts:283`: replaced by "a `.collection` row gets the menu of any non-markdown file". `NoteRowMenu.convert-to-view.test.ts` deleted.
- `fs.logic.test.ts:205-217,367`, `highlight-styles.test.ts:283-310,357`, `layout.logic.test.ts:31`, `lens.logic.test.ts:1884`, `editor.logic.test.ts:150`, `collection.store.test.ts:156-177`, `collection.service.test.ts:574`, `collection-view-index-path-change.test.ts`, `lib-specifier-convention.test.ts:71`, comments in `view-relationship-filters.test.ts:8,43`, `suggestions-skip-views.test.ts:129`.
- `FilesNavigator.new-view.test.ts:111-117`: already New table (Issue 22); nothing left.
- Kept as generic names: `wikilink-resolution.logic.test.ts:185`, `type-sidebar.logic.test.ts:594`, `collection.service.test.ts:440`, `fs.logic.test.ts:227,297`.

## Help and docs

- 9 `help/examples/collection-features/*.collection` -> `.view` via `git mv`, each with `_visible: false` and `_open_in_editor: true` first (they are tables, as New table writes). `collection-features.test.ts` runs a `.view` through `viewRowSet` (entries built with `entryV2`), as the editor's port does. `examples-scoping.test.ts:228,303-336` and `SCOPING.md:53,123`.
- Docs listed in the Issue, a hand-migration line in `12-collection.md`, ADR 0004 amendment dated 2026-11-05.

## Risks / defaults

- A `.collection` tab renamed to `.view` while open stays a text tab until reopened (rename never recomputes `fileType`, for any kind). Accepted: hand migration.
- `sprint-board` Backlog stays meant-to-be-empty; checked by the test.
- Rust untouched (`fs.rs:326`, `vault_file_ops_test.rs:48` kept).
