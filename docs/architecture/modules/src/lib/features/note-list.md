---
summary: "Note row component and shared right-click menu with inline rename, used by the rail note list."
---

## Responsibility

Renders one note row (icon, title, optional subtitle, type chip, frontmatter property pills, archived and italic styling, inline rename field) and the context menu that wraps a note list. NoteRowMenu owns the context target and the inline rename state and dispatches note actions (open, open in new tab, duplicate, rename, move to Trash, reveal, copy path and relative path, change icon, favorite, show in Views, plugin-registered actions) to services in core and other features. It does not own list data, selection, virtualization or icon resolution; the consuming list passes those in.

## Key files

- `src/lib/features/note-list/NoteRowMenu.svelte`: Wrapper around a note list: context menu, action handlers, inline rename commit and cancel, icon picker host.
- `src/lib/features/note-list/NoteRow.svelte`: Single row: open on click, rename input swap, type and property pills, optional drag payload.
- `src/lib/features/note-list/note-row-menu.context.ts`: Svelte context contract between NoteRowMenu and NoteRow, and the rename shortcut constant.
- `src/lib/features/note-list/note-row.types.ts`: NoteRowNote shape (path, title, favorite, modifiedAt, frontmatter) every list item must satisfy.
- `src/lib/features/rail-shell/RailNoteList.svelte`: Only production consumer: wraps its list in NoteRowMenu and renders NoteRow per item.

## State

- No stores or files owned.
- Reads and writes fsStore.renamingPath; reads vaultStore.path, typeDefinitionsStore.getEntryByPath and fileIconsStore.getFrontmatterIcon.
- Rename input value and element live in NoteRowMenu component state.

## Collaborators

- `src/lib/features/rail-shell`: Sole consumer. RailNoteList mounts the menu and rows; LensNote in rail-shell.types.ts extends NoteRowNote; railRegistryStore.menuItems is passed as extraItems.
- `src/lib/core/editor`: openFileInEditor for row click, open in new tab and wikilink pills.
- `src/lib/core/filesystem`: renameItem, deleteItem, duplicateItem, revealInSystemExplorer, fs.logic helpers, resolveWikilink, and fsStore.renamingPath.
- `src/lib/core/vault`: Vault root path for relative-path copy and icon writes.
- `src/lib/features/file-icons`: Icon write functions, getFrontmatterIcon, iconColorStyle, IconPicker and IconRenderer.
- `src/lib/features/properties`: toggleFavoriteForPath for the Favorite action.
- `src/lib/features/type-definitions`: showViewInViews, getEntryByPath, getViewVisible, splitPropertyIntoPills and buildRenameFileName.
- `src/lib/utils`: MenuActionItem type and formatShortcut.
- `src/lib/components/ui`: shadcn-svelte ContextMenu primitives.

## Gotchas

- No IPC is called from this folder. Actions reach disk through core/filesystem fs.service (rename, duplicate, delete, reveal), the file-icons and properties services, and showViewInViews in type-definitions. Move to Trash asks for confirmation through @tauri-apps/plugin-dialog, and the copy actions use navigator.clipboard.
- Rename state lives in NoteRowMenu, not NoteRow, so a rename in progress survives row remounts while a virtualized list scrolls.
- Rename mode is driven by global fsStore.renamingPath. A NoteRowMenu only prefills and focuses the input when the path is in its own notes array, so another list showing the same path does not start a second input.
- Escape sets renameCancelled before clearing renamingPath so the following blur does not commit.
- An empty or unchanged title cancels silently. An illegal name toasts and leaves the note untouched. A failed rename toasts through runOrToast, which returns silently on PreDeleteSaveError because the editor already toasted.
- The context menu treats any target outside an element with data-note-row as blank space and suppresses the menu. NoteRow must keep that attribute.
- Icon and Favorite items appear only for markdown files, since they write frontmatter. Show in Views appears only for .view rows that Views hides.
- Plugin items (extraItems) appear only when they register the 'note' location, and for non-markdown rows only when files is 'all'.
- NoteRow reads its context with getContext and has no fallback, so rendering it outside a NoteRowMenu fails on first use of the menu.
- Drag is opt-in per row: a draggable row writes its path as text/plain with effectAllowed 'move'. The drop target is the Files navigator.
- Wikilink pills open only when the link resolves; unresolved links render with a not-found title.
- src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts fails if a file in this folder imports from plugins.
