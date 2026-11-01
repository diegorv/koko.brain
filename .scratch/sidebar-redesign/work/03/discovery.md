# Issue 03 discovery: action bar, type, file name and lifecycle actions

## Files that change

- `src/lib/features/properties/lifecycle.service.ts:13-43` - `setOrganized/setArchived/setFavorite` read
  `propertiesStore` (filled only while the right sidebar shows). Replace with
  `toggleActiveNoteFavorite / toggleActiveNoteOrganized / toggleActiveNoteArchived`, each one
  `updateNoteFrontmatter(activePath, mutate)` (`frontmatter-write.service.ts:94`) where `mutate`
  reads the flag from the props parsed from the tab's current content. Failure:
  `toastFrontmatterWriteError` (prior art `type-definitions.service.ts:282 toggleFavoriteForPath`).
- `src/lib/features/properties/LifecycleActions.svelte` - deleted; `PropertiesView.svelte:37,167-170` drops it.
- New `src/lib/features/note-action-bar/`: `note-action-bar.logic.ts` (`isMarkdownNoteTab`,
  `getActionBarState(path, content)`: type label or "Note", file name, favorite, organized, archived),
  `note-action-bar.service.ts` (`deleteNoteWithConfirm`: `ask` + `deleteItem`, toast on failure, as
  `TypeNoteList.svelte:419`), `NoteActionBar.svelte`.
- `src/lib/core/markdown-editor/EditorView.svelte:49-50` - mounts the bar between tabs and editor
  when `isMarkdownNoteTab(activeTab)`. EditorView is shell-independent (AppShell mounts it), so the
  rail shell (Issue 07) inherits it.
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:127` - `searchKeymap` without `Mod-d`.
- `src/lib/core/keybindings/global-keybindings.ts` - Cmd+D, Cmd+E; `keybindings.logic.ts:97`
  `RESERVED_KEYBINDINGS` gains both.
- `src/lib/features/command-palette/command-palette.service.ts` - "Toggle Favorite", "Toggle Organized".
- `help/documentation/20-keyboard-shortcuts.md`, `07-sidebar-panels.md:53-55` (lifecycle row text).
- New `e2e/specs/note-action-bar.spec.ts`.

## Plan

Bar state comes from `parseFrontmatterProperties(activeTab.content)` (LRU cached), never the
Properties store, so it is right with the sidebar hidden and right after a tab switch. Toggles go
through `updateNoteFrontmatter`, which reads `tab.content` at call time (updated per keystroke by
`onContentChange`), so a just-typed frontmatter edit is kept, and saves at once, which runs the
after-save hooks: auto-move applies a type's `_archive_to` exactly as today. Right-sidebar button
calls `toggleRightSidebar` (Cmd+B). No new store, so no new getter.

## Prior-art tests

`frontmatter-write.service.test.ts` (Tauri fs mocked, real editor service and stores),
`EventCalendarSection.test.ts` (component mount), `global-keybindings.test.ts` (`findHandler`),
`editor-extensions.test.ts`, `e2e/specs/properties-cross-note.spec.ts` (`__e2e.fs.readFile`).

## Risks and defaults

- `properties-cross-note.test.ts:140-142` covers the old propertiesStore commits; those cases go,
  the new tab-switch test replaces them.
- Type label: canonical `_type` value with first letter uppercased (Rust `is_a` casing).
- Markdown tab: `fileType` undefined or `markdown`, not virtual, path ends `.md`.
- Organized button reflects raw `_organized === true`; turning it on still removes `_archived`
  (`toggleOrganized`, unchanged). Delete confirmation text matches TypeNoteList.
- Colors: `tab-text-*`, `editor-*`, `border`, `muted`, `type-yellow` (favorite), `type-green`
  (organized), `destructive` (Delete).
