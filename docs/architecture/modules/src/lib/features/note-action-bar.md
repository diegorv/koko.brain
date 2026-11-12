---
summary: "Per-note toolbar above the editor: type and file name, lifecycle toggles, width, reveal, copy, and a registry for note-creating actions."
---

## Responsibility

Owns the bar shown above the active markdown note: the component, the pure logic that derives its state from note frontmatter and folds actions into a More menu by width, the service functions for the bar's own actions (reveal, copy path, copy deeplink, width toggle, New linked note), and a registry store where plugins register note-creating buttons by note type. It does not own the lifecycle toggles (features/properties), delete, raw-mode toggle, neighbourhood or table of contents; it calls into the modules that do.

## Key files

- `src/lib/features/note-action-bar/NoteActionBar.svelte`: The bar: derives state from the active tab content, picks the hub button, folds actions into a More dropdown by measured width.
- `src/lib/features/note-action-bar/note-action-bar.logic.ts`: getActionBarState (reads _type, _favorite, _organized, _archived through the properties lifecycle logic), resolveHubAction, foldActions and width constants.
- `src/lib/features/note-action-bar/note-action-bar.service.ts`: toggleWideNotes, revealNote, copyNotePath, copyNoteDeepLink, createLinkedNote, with toasts on failure.
- `src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts`: Registry of NoteHubAction entries; register returns an unregister function.
- `src/lib/plugins/one-on-one/one-on-one.service.ts`: Registrant: registerOneOnOneActionBarAction adds New 1:1 for Person notes.
- `src/lib/app/EditorView.svelte`: Mounts NoteActionBar for the active note and passes the table-of-contents opener as a prop.

## State

- noteActionBarActionsStore: module-level $state.raw array of registered actions, memory only.
- Writes settingsStore.editor.wideNotes through toggleWideNotes.
- Reads editorStore.activeTab and isLivePreview, vaultStore path and name, and typeDefinitionsStore.typeMetadataMap.
- No file or database state of its own; createFile writes new notes.

## Collaborators

- `src/lib/app`: EditorView renders the bar and injects the table-of-contents opener; app-lifecycle registers the one-on-one action and runs the unregister on teardown.
- `src/lib/plugins/one-on-one`: Registers New 1:1 into the actions store.
- `src/lib/plugins/table-of-contents`: showTableOfContents is passed in by EditorView; the bar does not import it.
- `src/lib/core/editor`: Active tab content, path and live-preview state; openFileInEditor for the new note; toggleSourceMode for Raw.
- `src/lib/core/filesystem`: createFile for New linked note; deleteNoteWithConfirm for Delete; getParentPath.
- `IPC:create_note`: Reached indirectly through createFile; this folder never calls invoke.
- `src/lib/features/properties`: toggleActiveNoteFavorite, toggleActiveNoteOrganized, toggleActiveNoteArchived and the lifecycle logic that derives bar state.
- `src/lib/core/frontmatter`: parseFrontmatterProperties and normalizeTypeCasing for _type; ensureFrontmatterLink adds _belongs_to.
- `src/lib/core/note-creator`: applyExplicitOrganization on new linked note content.
- `src/lib/features/type-definitions`: Hub flag per type decides whether New linked note is offered.
- `src/lib/features/deep-link`: buildOpenNoteDeepLink for Copy deeplink.
- `src/lib/features/rail-shell`: openNeighbourhood runs from the Neighbourhood action.
- `src/lib/core/settings`: editor.wideNotes and explicitOrganization.
- `src/lib/core/vault`: Vault path and name for deeplinks.

## Gotchas

- The folder imports only core, features and utils. The one-on-one plugin reaches the bar through the actions store, and the table-of-contents opener is injected as a prop, to respect the rule that features may not import plugins.
- Bar state is read from the tab's own content, not the Properties store, because that store is empty while the right sidebar is hidden.
- Hub button: a registered action for the note's type wins over New linked note, and New linked note appears only when the type definition sets the hub flag.
- When a hub button is shown, HUB_ACTION_WIDTH is subtracted from the measured width before folding. A width of 0 (not yet measured) folds every foldable action into More.
- A comment in note-action-bar.logic.ts calls Neighbourhood rail shell only. The code has no other shell mode, and NoteActionBar.svelte treats Neighbourhood as an ordinary foldable action.
- Registration is by reference identity: unregister removes the exact entry. reset() empties the whole list and has no production caller.
- createLinkedNote shows one generic toast on createFile failure; the cause is logged by createFile.
- The bar's run() wrapper logs escaping errors under NOTE-ACTION-BAR. Expected failures are toasted inside the service functions.
