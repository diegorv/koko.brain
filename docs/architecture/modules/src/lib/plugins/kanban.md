---
summary: "Kanban board for .kanban files: markdown parsing, board mutations, serialization and the card UI."
---

## Responsibility

Owns the Kanban board for .kanban files. kanban.logic.ts parses the markdown into a board model (lanes, cards, archive, settings block), applies board mutations as pure functions and serializes back while keeping lines the board does not model. The components render the board, list and table views and the card editing, date, color and wikilink UI. The service owns the linked-file preview cache, the New Kanban Board folder-menu entry and createKanbanFile. It does not own the file: KanbanView receives raw markdown as a prop and reports each new serialization through onContentChange. Persistence, watching, tabs and the .kanban file type routing belong to core/.

## Key files

- `src/lib/plugins/kanban/kanban.logic.ts`: Pure parse, serialize and every board mutation, plus date, color, tag, wikilink, sort and filter helpers.
- `src/lib/plugins/kanban/kanban.types.ts`: Board data model: KanbanBoard, KanbanLane, KanbanItem (with extraLines), settings and archive layout.
- `src/lib/plugins/kanban/KanbanView.svelte`: Root component: parses the markdown prop, owns local board state, applies mutations through applyChange and reports serialized markdown upward.
- `src/lib/plugins/kanban/kanban.service.ts`: createKanbanFile, registerKanbanFolderCreator, resetKanban and the cached linked-file loader for card previews.
- `src/lib/plugins/kanban/kanban.store.svelte.ts`: Reactive UI state: editing ids, filter query and keyboard focus.
- `src/lib/plugins/kanban/KanbanLane.svelte`: One lane: cards, drag and drop, lane menu, collapse state and limits.

## State

- The .kanban markdown file on disk. The plugin holds no copy beyond the editor tab content passed in as a prop.
- Local board $state and a selfUpdate flag in KanbanView.svelte, used to skip re-parsing after its own writes.
- kanbanStore: editingItemId, editingLaneId, filterQuery, focusedLaneIndex, focusedItemIndex (plus board getters, see gotchas).
- linkedContentCache in kanban.service.ts: a module-level Map from card text to the body of the first wikilinked file, or an empty string.

## Collaborators

- `src/lib/app`: EditorView.svelte mounts KanbanView for 'kanban' tabs and passes openWikilinkTarget from editor-host.ts. app-lifecycle.service.ts registers the folder creator and calls resetKanban. commands.ts runs kanban:new through createKanbanFile. boot.ts registers clearLinkedContentCache as the 'kanban-linked-content' invalidation listener.
- `src/lib/core/editor`: Routing, not an import: editor.service.ts assigns fileType 'kanban' to opened .kanban files (via isKanbanFile from core/filesystem), which EditorView uses to mount this view.
- `src/lib/core/filesystem`: createFile in fs.service.ts creates new boards. fsStore.fileTree, flattenFileTree and the wikilink resolution helpers resolve card links and power link suggestions.
- `src/lib/core/vault`: vaultStore.path resolves wikilinks in card previews.
- `src/lib/core/markdown-editor`: Wikilink completion helpers power KanbanWikilinkSuggestions and stripFrontmatter (live-preview embed-resolver.logic.ts) cleans linked file bodies.
- `src/lib/features/rail-shell`: registerFolderCreator adds New Kanban Board to the folder menu.
- `src/lib/components/ui`: The context-menu component used by KanbanCard and KanbanLane.
- `IPC:create_note`: Reached indirectly: createKanbanFile calls core createFile, which invokes create_note. The plugin calls no Tauri command itself.
- `src/lib/utils`: clamp, formatNow from date.ts, color presets and debug error() logging.

## Gotchas

- Round-trip preservation: parseKanbanBoard keeps frontmatter, prose, ### subsections, indented notes, other list markers and blank runs as raw lines (preamble, lane headLines, item extraLines), and serializeKanbanBoard writes them back in place. Any new mutation must preserve these fields.
- Settings block: parseSettings returns {} for malformed JSON, and serializeKanbanBoard writes the original raw block back unchanged while the parsed settings still equal its snapshot, so a malformed block survives unrelated edits.
- KanbanView.applyChange must return before setting the selfUpdate latch when a mutation serializes to the current markdown. Otherwise the next external reload is skipped (comment in applyChange).
- The board getters, lanes, archive, settings and setBoard in kanbanStore are not used by production code. KanbanView keeps the board in its own $state.
- canReorderItems is true only in manual sort mode with no filter, because moveItem splices the full stored lane list.
- loadLinkedFileContent resolves only the first wikilink, caches by card text, and caches an empty string on failure after logging with error(). The cache is cleared by clearLinkedContentCache or resetKanban.
- serializeKanbanBoard writes the --- separator and ## Archive heading only when the archive has items or the stored layout has non-blank head lines.
- The board file never goes through this folder's I/O: it arrives as the tab content prop. The only direct disk read is loadLinkedFileContent, which reads a linked note for a card preview with readTextFile from @tauri-apps/plugin-fs.
