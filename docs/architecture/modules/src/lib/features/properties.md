---
summary: "Properties panel and note lifecycle flags (favorite, organized, archived) kept in note frontmatter."
---

## Responsibility

Owns the Properties panel (view, field editing, relationship search, the Info section) for the active note, and the lifecycle flags _favorite, _organized and _archived that the rest of the app reads. Panel edits are rebuilt into the active tab's frontmatter block and written through the editor content, while lifecycle actions write the frontmatter of the active note or a given path through updateNoteFrontmatter. It also keeps the in-memory archived path set and the one-time migration of the removed bookmarks file into Favorites. It does not own the frontmatter parser or write pipeline, the vault index, or the Rust side that indexes these keys.

## Key files

- `src/lib/features/properties/properties.service.ts`: Panel commit path: parse into store, refuse lossy or stale commits, rebuild the frontmatter block into editor content.
- `src/lib/features/properties/properties.store.svelte.ts`: Properties of the active note plus the sourcePath that commits check against the active tab.
- `src/lib/features/properties/lifecycle.service.ts`: Entry points that flip _favorite, _organized, _archived and the type rail pin through updateNoteFrontmatter.
- `src/lib/features/properties/lifecycle.logic.ts`: Pure helpers that derive lifecycle state and set boolean flags on a property list.
- `src/lib/features/properties/lifecycle-filter.service.ts`: Rebuilds the archived path set, fetching vault entries when none are passed.
- `src/lib/features/properties/bookmark-migration.service.ts`: One-time move of legacy .kokobrain/bookmarks.json entries into _favorite flags at vault open.
- `src/lib/features/properties/PropertiesView.svelte`: Main Properties panel component.

## State

- propertiesStore: properties and sourcePath of the active note.
- lifecycleFilterStore: archived path Set and its count.
- Module flag skipNextParseFor in properties.service.ts, cleared by resetProperties.
- Frontmatter flags _favorite, _organized, _archived and _rail inside note files, written through core/frontmatter.
- Legacy .kokobrain/bookmarks.json, read and deleted by the bookmark migration.

## Collaborators

- `IPC:get_all_vault_entries_v2`: lifecycle-filter.service builds the archived path set from it when entries are not passed in.
- `src/lib/core/frontmatter`: Parser, rebuild and lossy detection; updateNoteFrontmatter and FrontmatterWriteError for writes.
- `src/lib/core/editor`: Active tab reads and syncExternalContentToEditor for rebuilt content.
- `src/lib/core/vault`: Vault path, requestPromptIndexRefresh, and getVaultEntries used by NoteInfo.
- `src/lib/core/filesystem`: fs store, file-entries and wikilink resolution for relationship search.
- `src/lib/core/layout`: SidebarSection hosts PropertiesView.
- `src/lib/core/settings`: PropertyField reads settings.
- `src/lib/features/file-history`: note-info.logic imports formatFileSize from file-history.logic.
- `src/lib/features/type-definitions`: PropertiesView reads typeDefinitionsStore for type-driven properties.
- `src/lib/features/file-icons`: Icon resolution and rendering in PropertiesView and RelationshipSearch.
- `src/lib/features/note-action-bar`: Consumes lifecycle.service and lifecycle.logic for action buttons.
- `src/lib/features/note-list`: NoteRowMenu calls toggleFavoriteForPath.
- `src/lib/features/rail-shell`: TypesNavigator calls setTypeRailPin.
- `src/lib/features/quick-switcher`: QuickSwitcher reads lifecycleFilterStore to show archived state.
- `src/lib/app`: AppShell mounts NoteInfo and PropertiesView; commands and global-keybindings call the favorite and organized toggles; tauri-listeners calls refreshArchivedPaths; app-lifecycle runs the bookmark migration and resets.

## Gotchas

- commitChanges returns false with no write in two cases. When propertiesStore.sourcePath differs from the active tab path, it re-parses the active note into the store and drops the commit silently. When detectLossyFrontmatter reports the block as lossy (comments, nested values, duplicate keys, anchors or unparseable), it shows a toast.
- Lifecycle actions mutate the frontmatter parsed from the note at call time (through updateNoteFrontmatter), not propertiesStore, because the store is filled only while the right sidebar is shown and lags behind tab switches.
- updateNoteFrontmatter requires writes to the same path to be serialized, so bookmark-migration awaits each write in a loop.
- The bookmarks file is deleted only when every migration write succeeded, so a failed run is retried on the next vault open. The migration stops silently when the vault changes mid-run.
- isOrganized treats a missing or non-boolean _organized as organized, matching the Rust index rule.
- toggleArchived and toggleOrganized do not affect each other: archiving leaves _organized untouched and organizing never unarchives.
- lifecycle-filter.service is the only place here that calls IPC directly. Other writes go through the frontmatter write service or the editor content, so the Rust index sees flag changes through the normal save and watcher path.
- Rust treats the lifecycle keys as system keys excluded from relationship extraction (src-tauri/src/vault/entry.rs).
- note-info.logic.ts imports from features/file-history, a cross-feature edge.
