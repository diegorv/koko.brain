Status: ready-for-agent

# Middle panel with type note list

## Parent

`.scratch/type-panel-layout/PRD.md`

## What to build

Add a new resizable PaneForge pane in AppShell between the left sidebar and the editor. This pane is only visible when `sidebarMode === 'types'`.

Add `middlePanelSize` to `LayoutSettings` (default 20, min 15, max 35). Persist size changes with the same debounced save pattern as other pane sizes.

Create a new `TypeNoteList.svelte` component that reads `selectedTypeOrNav` from the store and displays matching notes:

- **Header**: selected type's `sidebarLabel` + "+" button that calls `createNoteOfType`
- **Note cards** (scrollable list): each card shows the note's icon (resolved via `resolveIconForPath`, falling back to the type's icon), title, and formatted modified date
- **Click** a note card -> `openFileInEditor(note.path)` (opens in new tab)
- **Active highlight**: card whose path matches `editorStore.activeTabPath` gets highlighted

Move the note-level context menu from the old TypeSidebar into this component (open, duplicate, copy path, change icon, favorite, rename, delete).

For this slice, only handle type selections (not top nav items -- that's slice 03). When a top nav item is selected, show an empty state or placeholder.

## Acceptance criteria

- [ ] New PaneForge pane appears between sidebar and editor in types mode only
- [ ] Pane disappears when switching to files or calendar mode
- [ ] `middlePanelSize` added to LayoutSettings with default 20
- [ ] Resize handle works, size persists across reloads
- [ ] Header shows selected type name + "+" button
- [ ] "+" button creates a new note of the selected type
- [ ] Note cards show icon + title + formatted modified date
- [ ] Clicking a note opens it in a new editor tab
- [ ] Active tab's note is visually highlighted in the list
- [ ] Note context menu works (open, duplicate, copy path, change icon, favorite, rename, delete)
- [ ] Notes are sorted according to the type's `sort` metadata (title/modified/created)
- [ ] Tests cover: note list filtering by type, layout settings defaults, card rendering
- [ ] `pnpm check` passes
- [ ] `pnpm vitest run` passes

## Blocked by

- `.scratch/type-panel-layout/issues/01-left-sidebar-refactor.md`
