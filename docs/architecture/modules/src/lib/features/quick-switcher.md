---
summary: "Quick switcher dialog: fuzzy note search, recent-files list and create-from-query; owns open state and recents."
---

## Responsibility

Owns the dialog's open state and the persisted list of recently opened note paths. The component searches the flattened file tree, opens the chosen note through the editor service, and offers to create a note named after the query when nothing matches. It does not own the file tree, file creation, editor opening or the ranking, which lives in src/lib/core/filesystem/file-entries.logic.ts (filterAndRank, flattenFileTree). It has no Rust side.

## Key files

- `src/lib/features/quick-switcher/quick-switcher.store.svelte.ts`: isOpen, recentPaths, open, close, toggle, addRecentPath, removeRecentPath (drops a path and its children), reset; recents persisted to localStorage.
- `src/lib/features/quick-switcher/QuickSwitcher.svelte`: Command dialog: query input, ranked results, select-to-open, create-note fallback, archived dimming.
- `src/lib/features/quick-switcher/quick-switcher.service.ts`: resetQuickSwitcher, called from app lifecycle teardown.
- `src/lib/core/filesystem/file-entries.logic.ts`: flattenFileTree and filterAndRank: recents first then alphabetical for an empty query, fuzzy match with recency boost otherwise, capped results.
- `src/lib/app/boot.ts`: Registers the path-change consumer that calls removeRecentPath on rename or delete.

## State

- localStorage key kokobrain:recent-files: JSON array of recent note paths, most recent first and capped. Read once at module load, written on every add or remove, removed on reset. Storage errors are swallowed.
- In-memory isOpen and recentPaths.
- Component state searchQuery in QuickSwitcher.svelte.

## Collaborators

- `src/lib/core/filesystem`: fsStore.fileTree, flattenFileTree and filterAndRank build the results; createFile creates the note.
- `src/lib/core/editor`: openFileInEditor on select and after create; notifyNoteCreated from the hooks.
- `src/lib/core/note-creator`: applyExplicitOrganization builds initial content for a created note.
- `src/lib/core/settings`: Reads settings.explicitOrganization.
- `src/lib/core/vault`: vaultStore.path for relative display and the create target.
- `src/lib/features/properties`: lifecycleFilterStore.isArchived dims archived results.
- `src/lib/utils`: relativePath for the displayed path; fuzzy matching is reached through file-entries.logic.
- `src/lib/components/ui`: shadcn-svelte Command primitives.
- `src/lib/app`: AppOverlays mounts it; commands and global-keybindings call toggle; boot registers the path-change consumer; app-lifecycle calls resetQuickSwitcher.
- `IPC:create_note`: Reached indirectly through createFile; the folder invokes no command itself.

## Gotchas

- Recents are per viewer in localStorage, not per vault. They survive restarts and are cleared by reset() at vault teardown or by path-change removal (rename or delete drops the path and any path under it).
- The store reads localStorage once at module load.
- The dialog uses shouldFilter={false}. Ranking changes belong in file-entries.logic.ts.
- An empty query lists recents that are present in the current file tree, then the rest alphabetically, with the same result cap as a query.
- Create-from-query appends .md when missing, creates the file with applyExplicitOrganization output, toasts only on failure, and calls notifyNoteCreated on success.
- Two entry points (command registry and global keybinding) both call toggle(). Close is driven by the dialog's onOpenChange, which also clears the query.
