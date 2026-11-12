---
summary: "Left rail and note list: lens resolution, navigators, list sorting and properties, and new-note creation."
---

## Responsibility

Owns the left rail shell: the item strip (Rail.svelte), the Files and Types navigators, and the note list (RailNoteList.svelte) for the selected lens. Pure logic in lens.logic.ts, rail-items.logic.ts and list-*.logic.ts turns a Lens and a vault entries snapshot into resolved rows, sort order and filters. Services handle side effects: path-change consumers that keep saved rail picks valid after renames or moves, per-type list prefs written to definition notes, full-text list search, view note counts, and New here creation. rail-registry.store.svelte.ts is the extension point where plugins register navigators, lens providers, Today sections, folder creators, actions and note menu items. It does not own vault indexing, the editor, settings persistence (settingsStore holds the rail layout), the .view parser, or the calendar, kanban and mod features that register into it.

## Key files

- `src/lib/features/rail-shell/lens.logic.ts`: Lens kinds, resolveLens, listEntries, view and folder lens resolution, restoreRailItem, the row rules installed in the collection port, and path-change follow helpers.
- `src/lib/features/rail-shell/rail-shell.types.ts`: Lens, LensContext, ResolvedLens, RailNavigator, RailLensProvider, RailAction, NewNoteRule and related plugin contracts.
- `src/lib/features/rail-shell/rail-registry.store.svelte.ts`: Registration point for plugin-owned rail parts. Each register function returns an unregister function.
- `src/lib/features/rail-shell/Rail.svelte`: Rail strip: item icons, ordering, width, collapse, style and pinned items.
- `src/lib/features/rail-shell/RailNoteList.svelte`: Note list for the selected lens: search, sort, property pills, row menus, header actions and new-note button.
- `src/lib/features/rail-shell/TypesNavigator.svelte`: Types navigator with type rows and per-view note counts.
- `src/lib/features/rail-shell/list-prefs.service.ts`: Writes list sort and pill keys to type definition notes, serialized per path through serializeListWrite.
- `src/lib/features/rail-shell/new-note.service.ts`: Creates a plain or typed note for the current lens, opens it and notifies note-created observers.

## State

- Rail layout settings (railItem, railOrder, railHidden, railWidth, railCollapsed, railStyle, railFolder, railExpandedFolders, railInboxBadge) are read and written through settingsStore.updateLayout; owned by core/settings.
- neighbourhoodStore: session-only $state with the note path the Neighbourhood lens shows, cleared at vault teardown.
- railRegistryStore: in-memory $state.raw lists of navigators, lens providers, Today sections, folder creators, actions and menu items.
- Per-type list prefs persisted in the type definition note frontmatter as _list_properties_display and _list_sort, through updateNoteFrontmatter.
- Saved rail picks and expanded folders live in settings and are rewritten by path-change consumers when a folder or note moves.

## Collaborators

- `IPC:search_fts`: list-fulltext.service uses it for the list search.
- `IPC:create_folder`: new-note.service creates the target folder before creating a plain note.
- `src/lib/core/settings`: Rail layout through settingsStore.layout and updateLayout; rail-pin logic.
- `src/lib/core/filesystem`: registerPathChangeConsumer for the files, types and neighbourhood services; createFile; fs store and services for FilesNavigator.
- `src/lib/core/frontmatter`: updateNoteFrontmatter writes list prefs.
- `src/lib/core/vault`: Vault path and entries; requestPromptIndexRefresh.
- `src/lib/core/editor`: openFileInEditor and notifyNoteCreated for new notes.
- `src/lib/core/note-creator`: applyExplicitOrganization for new note content in new-note.service and FilesNavigator.
- `src/lib/features/type-definitions`: createTypedNote, type metadata for TypesNavigator and lenses, and refreshViewDefinition from view-parse-cache for per-view counts (view-lens.service).
- `src/lib/features/collection`: PropertyIndexRecord, executeQuery and the view row-set rule shared with lens.logic.ts.
- `src/lib/features/file-icons`: Icon resolution for items, folders and types; IconPicker.
- `src/lib/features/note-list`: NoteRow and NoteRowMenu render the list rows and their menu.
- `src/lib/features/event-calendar`: Calendar clock, view store and daily-note store used by RailNoteList.
- `src/lib/features/properties`: TypesNavigator calls setTypeRailPin.
- `src/lib/features/canvas`: FilesNavigator uses createCanvasFile.
- `src/lib/app`: AppShell mounts the shell; app-lifecycle registers path-change consumers and clears neighbourhoodStore; boot installs the lens row rules into the collection port; rail-navigation, commands and SettingsPanel use rail constants and LayoutSection.
- `src/lib/plugins/calendar`: Registers the Calendar navigator and Day lens provider.
- `src/lib/plugins/kanban`: Registers a folder creator.
- `src/lib/plugins/one-on-one`: Registers a Today section.
- `src/lib/plugins/mods`: Registers rail actions and note menu items.
- `src/lib/features/search`: open-search.service uses SEARCH_RAIL_ITEM from lens.logic; this folder does not import search.
- `src/lib/features/note-action-bar`: Calls openNeighbourhood.

## Gotchas

- railRegistryStore.reset() has no caller outside tests, so production teardown does not clear registrations. Each plugin relies on its own unregister function.
- Registration is by identity: unregister filters by object identity, which works only because the lists are $state.raw.
- features may not import plugins, so plugins register into the registry instead. src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts enforces this for this folder and note-list.
- Per-type list writes go through serializeListWrite, a per-path promise queue, because overlapping read-modify-write saves on one file would lose a field.
- Full-text list search asks the backend for a limited number of hits, so a body match past that rank is lost to the list filter. Title and property matches still apply.
- createNoteHere can reject after the file is written (createFile's tree refresh rethrows), leaving a note on disk that is not opened.
- Neighbourhood state is session-only. After a restart the neighbourhood rail item falls back to Today through restoreRailItem.
- FilesNavigator imports the Tauri dialog plugin (ask) directly for confirmations.
