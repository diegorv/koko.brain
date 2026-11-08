# Issue 22 discovery: New table, and Show in Views

No `spec.md` for this feature; `PRD.md` § Owner decisions covers it.

## Files that change

- `src/lib/features/collection/collection.service.ts:11-25`: template gains `_visible: false` and `_open_in_editor: true`; `createCollectionFile` asks `vaultStore.requestPromptIndexRefresh()` and writes `Untitled.view` (as `createView`, `type-definitions.service.ts:272-276`).
- `src/lib/features/rail-shell/FilesNavigator.svelte:87`: `New Collection` -> `New table`, `fileName: 'Untitled.view'`. Icon stays `Database` (New view keeps `Table`).
- `src/lib/features/type-definitions/type-sidebar.logic.ts` (next to `updateViewRailYaml`, :577): `showViewInViewsYaml(yaml)` deletes `_visible`, its alias `visible` (Rust folds it onto `_visible`) and `_open_in_editor`; throws on YAML that does not parse.
- `src/lib/features/type-definitions/type-definitions.service.ts` (next to `setViewRailPin`, :465): `showViewInViews(path)` through `rewriteViewFile` with `promptIndexRefresh: true`.
- `src/lib/features/note-list/NoteRowMenu.svelte:212-217`: a **Show in Views** item after Duplicate on a `.view` row whose entry is hidden (`!getViewVisible(typeDefinitionsStore.getEntryByPath(path))`). Failure toasts except `ViewWriteError` `save-failed` (as `TypesNavigator.svelte:197`).
- `e2e/mocks/vault-index.ts`: the mock indexes no `.view` at all today (`rebuildAll` and `update` keep `.md`/`.markdown` only), so a raw-YAML branch alone changes nothing. Plan: `rebuildAll`/`update` admit `.view`; `buildEntry` builds a view entry like `NoteEntry::from_view_frontmatter` (whole file parsed as YAML, same scalar projection, no links/tags/tasks/isA); the two unlinked-mention lookups skip views, as Rust's `is_link_target` does (`index.rs:922,999`).
- `e2e/specs/rail-shell.spec.ts`: New table test in the Files navigator block (~:746).
- Help: `02-file-explorer.md:19,73`, `12-collection.md:28`, `25-types-and-relationships.md` (hidden views / New table / Show in Views).

## Tests (written first)

- `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts:183,197,227,250` and `FilesNavigator.new-view.test.ts:111-117`: labels; New table writes `Untitled.view` with both keys through `create_note` (real `createFile`); prompt refresh asked.
- `src/tests/lib/features/collection/collection.service.test.ts:581-608`: template + file name + prompt refresh.
- `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`: `showViewInViewsYaml`.
- `src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts` (copy of `NoteRowMenu.convert-to-view.test.ts`): item only on a hidden `.view`; after the click the written file has neither key, and `viewNavigatorRows` lists it once the entry carries the written YAML.
- Rust `src-tauri/tests/commands/vault_test.rs` (~:600): `update_note_in_index_inner` on the New table body. Characterization: Rust already parses `.view` as raw YAML (`entry.rs:241`), so it passes from the start.

## Risks

- Indexing `.view` in the E2E mock changes what other specs see: property records and `get_all_vault_entries_v2` now include views (as Rust does). Views' label/sort keys now come from entries in the mock, matching the app.
- Hidden tables keep their names taken (`viewLabels`), documented in the Issue Notes.

## Defaults taken

- Show in Views sits after Duplicate (where Convert to view sits), icon `Eye`.
- Show in Views also drops the `visible` alias, else Rust would keep the view hidden.
