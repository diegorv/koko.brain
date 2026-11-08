# 15 discovery: a view is never a link target

No `spec.md` for this feature (only `PRD.md`).

## Files that change

- `src-tauri/src/vault/index.rs`: private `is_link_target(path)` = `!is_view_filename(path)` (`utils/fs.rs:146`, suffix check, so a path works). Gate the cache inserts in `rebuild` (`:413-416`) and `update_entry` (`:509-513`), and the `surviving` find in `remove_entry` (`:1174-1180`). Skip views in `lookup_outgoing_unlinked_mentions` (`:908`) and in `unlinked_mentions_candidates` (`:982-987`).
- `src/lib/core/filesystem/wikilink-resolution.logic.ts`: export `isLinkTargetFile(path)` (lowercase `.view` suffix, mirrors Rust; no `fs.logic` import, which pulls CodeMirror). `buildResolutionCache` skips views in its loop; `resolveWikilink` skips them in both name loops and in `findExactFile`'s predicates.
- `src/lib/app/editor-host.ts:69-98,150`: `treeLinkIndex` keeps only link-target `files`; `listLinkCandidates` drops view entries from `notes`. `openView` (Issue 16) checked existence through `treeLinkIndex().files`, which no longer holds views: it walks `fsStore.fileTree` with `findNodeByPath` and requires a file node instead.
- `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:27`, `src/lib/features/properties/RelationshipSearch.svelte:22`: filter `isLinkTargetFile` on the flattened tree.
- `help/documentation/05-wikilinks.md`, `24-meta-bind.md`: state the rule.

## Tests (failing first)

- Rust, `src-tauri/tests/vault_index_test.rs` (prior art: `a_view_is_no_source_of_tags_tasks_backlinks_or_relationships`, `build_index_with_fixtures`): build view-then-note; same via `update_entry`; `remove_entry` of the note leaves `resolve` None; `resolve("Projects.view")` None; `.View` casing; outgoing mentions empty with a view only; incoming mentions of `Projects.md` empty with a real `.view` file holding `_sidebar_label: Projects`.
- `src/tests/lib/core/filesystem/wikilink-resolution.logic.test.ts`: `isLinkTargetFile`, both resolvers with a view only / view + note / `Projects.view` target / `.View`.
- `src/tests/lib/app/editor-host.test.ts:94`: `resolveLink` null with a view only, the note with both; `listLinkCandidates` omits view files and view entries (aliases); existing `openView` tests keep passing.
- `src/tests/lib/app/meta-bind-open-view.test.ts` (only Tauri mocked, a view-only `Projects`): `followWikilink(appEditorHost, 'Projects')` invokes `create_note` for `/vault/Projects.md`; a meta-bind `open` button `[[Projects]]` (through `followWikilinkInfo`) does the same.
- New component tests for the two Svelte candidate lists: a view is not suggested.

## Risks

- `openView` change: same semantics (file in the tree, folder named `.view` refused), covered by Issue 16's tests.
- `link-updater.logic.ts` also builds caches; views drop out of them, which matches the `path-change.service.ts:189` gate.

## Defaults taken

- A `.view` stays in `entries` (it is still a link source, Issue 14) but enters neither resolution cache.
- Notes check (`kb.fileLink`, markdown links, deep-link open-by-name) is reported in the build report, not changed.
