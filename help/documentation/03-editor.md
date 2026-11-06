# The Editor

Learn about tabs, editing modes, and the status bar.

## Tabs

Every file you open appears as a tab at the top of the editor area. The active tab has a highlighted bottom border so you always know which note you're working on.

Tabs also show different icons based on file type — markdown, canvas, kanban, tasks, graph, and others each have their own icon for quick identification.

### Dirty Indicator

When you have unsaved changes, a filled dot appears next to the tab name. Press **Cmd+S** to save the current file and the dot disappears.

### Closing and Navigating Tabs

- **Close a tab**: Click the **x** button on the tab, or press **Cmd+W**
- **Next tab**: **Cmd+Shift+]**
- **Previous tab**: **Cmd+Shift+[**

![Editor tabs with dirty indicator](screenshots/editor-tabs.png)

## Pinning Tabs

You can pin important tabs so they stay visible and can't be accidentally closed.

- Right-click a tab to open a context menu with **Pin tab** / **Unpin tab** and **Close tab** (or use the Command Palette and search for "Pin/Unpin Tab")
- Pinned tabs are marked with a pin icon and stay on the left side of the tab bar
- Pinned tabs cannot be closed with **Cmd+W** — you must explicitly unpin them first

> [!TIP]
> Pin your daily note so it's always one click away. You can also enable auto-pin in Settings -> Periodic Notes.

## Note Action Bar

A bar above every Markdown note (not on canvas, kanban, graph, calendar, tasks or collection tabs) shows the note's type (or "Note") and its file name.

Next to the file name, two kinds of notes get a button that creates a related note and opens it:

- **New 1:1** on a Person note (`_type: Person`): creates today's [1:1 note](09-quick-notes-and-templates.md#11-notes--meeting-notes-with-people) for that person, with the same folder, file name and template as the `Cmd+Shift+N` picker.
- **New linked note** on a hub note (its type definition sets `_hub: true`, see [Type Definitions](25-types-and-relationships.md#type-definitions)): creates an `Untitled` note in the hub's folder with `_belongs_to: "[[Hub]]"`.

If the note cannot be created, a message says so and no file is written.

On the right:

| Button | Action |
|--------|--------|
| Star | Toggle Favorite (`_favorite`), `Cmd+D`. Filled when on. |
| Check circle | Toggle Organized (`_organized`), `Cmd+E`. Filled when on. |
| Code | **Raw**: toggle source mode (see [Editor Modes](#editor-modes)), `Cmd+\`. Highlighted while on. |
| More (`...`) | **Copy deeplink** (a `kokobrain://open?vault=...&file=...` link that opens this note, see [Deep Links](23-deep-links.md)), **Archive this note** / **Restore this archived note** (`_archived`; a type's `_archive_to` folder applies, see [Auto Move](22-auto-move.md#type-driven-lifecycle-rules)), and **Delete this note** (moves it to the Trash after a confirmation). |

These actions start in More:

| Action | What it does |
|--------|--------------|
| **Neighbourhood** (rail layout only) | Fill the note list with this note, then its outgoing links, backlinks and relationship groups (Belongs to, Related to, Has many, Other relationships), each with its count. The list follows the vault index as links change. It is not kept across restarts. |
| **Note width** | Switch every note between the content width set in Settings > Editor and the full editor width. One global setting, kept across restarts. While wide, the More item reads **Use the normal note width**; as an inline button it is highlighted. |
| **Table of contents** | Show the right sidebar with the Table of Contents section open. If the section is turned off in Settings > Layout, this turns it back on. |
| **Reveal in Finder** | Show the note's file in Finder. |
| **Copy path** | Copy the note's absolute path (a toast confirms). |

On a wide bar they come out of More as buttons, Neighbourhood (Waypoints) before Raw and the others (Width arrows, List, Folder, Copy) after it: Neighbourhood first, Copy path last. As the bar narrows they go back into More, Copy path first.

To show or hide the right sidebar, use the sidebar button at the top right of the window or `Cmd+B`.

The bar works whether the right sidebar is shown or hidden: it reads and writes the note's own frontmatter, keeps unsaved edits, and saves at once.

## Editor Modes

The markdown editor has two modes, toggled via the **Raw** button in the note action bar or by pressing `Cmd+\`.

### Source Mode

Shows raw Markdown syntax exactly as written. You see `**bold**`, `# Heading`, and `[[link]]` as plain text. This mode is best for precise editing and seeing the exact structure of your note.

### Live Preview Mode

Renders Markdown inline as you type — headings appear styled, bold text looks bold, and links are clickable. Markdown syntax markers are hidden when you're not editing that line. This mode is best for a cleaner writing experience.

![Source mode vs live preview comparison](screenshots/editor-modes.png)

> [!NOTE]
> The Source / Live Preview toggle described here applies to Markdown (`.md`) files. Canvas, Collection, and Kanban files have their own specialized editors with a separate **Source mode** toggle (see "File Types in the Editor" below).

## Scroll and Cursor Position

Kokobrain remembers your scroll position and cursor location in each tab. When you switch between tabs, you return to exactly where you left off. This works even when you have many tabs open.

## File Types in the Editor

Different file types open with different editors:

| File Type | Editor View | Description |
|-----------|-------------|-------------|
| `.md` | Markdown editor | The main editor with source/live preview modes |
| `.canvas` | Canvas editor | Visual infinite canvas (see [Canvas](11-canvas.md)) |
| `.view` | Table/database | Spreadsheet-like view (see [Collection](12-collection.md)) |
| `.kanban` | Kanban board | Drag-and-drop board (see [Kanban](21-kanban.md)) |
| Tasks (virtual) | Tasks view | Aggregated tasks from all notes (see [Tasks](10-tasks-and-todoist.md)) |
| Graph (virtual) | Graph view | Knowledge graph visualization (see [Graph View](14-graph-view.md)) |
| Tags (virtual) | Tags view | All tags across your vault with counts |

"Virtual" tabs don't correspond to a file on disk — they are generated views.

For Canvas, Collection, and Kanban files, a toggle button lets you switch between the visual editor and raw source — JSON for canvas, YAML for collection, Markdown for kanban. The button sits at the top right on a canvas and at the bottom right on a collection or kanban board. The source-mode preference resets when you switch tabs.

## Wikilink Navigation

In both editor modes, you can navigate to linked notes:

- **Source mode**: Click the underlined link text inside a `[[wikilink]]`
- **Live preview**: Just click the rendered link

If the linked note doesn't exist, Kokobrain will create it for you. Learn more in [Wikilinks & References](05-wikilinks.md).

## Wikilink Autocomplete

Type `[[` to trigger the autocomplete popup. Start typing to filter by note name, then press **Enter** to insert the selected link or **Escape** to dismiss. The popup shows all notes in your vault.

## Auto-Save

Kokobrain saves your notes automatically. There are two debounce timers:

- **Body text changes** — saved after 2 seconds of inactivity
- **Frontmatter-only changes** (e.g., property edits via the sidebar) — saved after 500ms

If you close a tab with unsaved changes, a confirmation dialog asks whether to discard them.

## Editor Features

Beyond basic text editing, the markdown editor supports several advanced features:

- **Multiple cursors** — Hold `Cmd` and click to place additional cursors. All cursors edit simultaneously.
- **Rectangular selection** — Hold `Option` and drag to select a rectangular region.
- **Tab indentation** — Press `Tab` to indent, `Shift+Tab` to dedent.
- **Bracket matching** — Matching brackets are highlighted when the cursor is adjacent to one.
- **Paste as table** (Live Preview only) — Pasting TSV or Excel data from the clipboard automatically converts it into a Markdown pipe table.

## Status Bar

At the bottom of the window, the status bar shows contextual information about your current note.

**Left side:**
- **Search index stats** — shows "N notes indexed" after indexing completes, or progress while indexing
- **Semantic index status** — appears only when semantic search is enabled in Settings. It reflects the current note with one of three states: **Loading model...** while the embedding model is still loading, **Indexed (1 chunk)** or **Indexed (N chunks)** once the note has been embedded (showing how many chunks it produced), or **Not indexed** when the model is ready but this note has no chunks yet

**Right side:**
- **Save status** — "Modified" when you have unsaved changes, or "Saved"
- **Word count** — three metrics (YAML frontmatter is excluded from counts, only shown for markdown files):
  - **Word count**: total number of words in the note
  - **Character count**: total number of characters
  - **Reading time**: estimated reading time based on 200 words per minute (minimum 1 minute)

## Zoom

You can scale the entire interface up or down. Zoom affects the whole UI, not just the editor text.

- **Zoom in**: `Cmd+=` (or `Cmd+Shift+=`)
- **Zoom out**: `Cmd+-`
- **Reset to 100%**: `Cmd+0`

Zoom steps through 11 fixed levels from 50% to 200% (the default is 100%). Each press moves one level up or down.

See [Keyboard Shortcuts](20-keyboard-shortcuts.md) for the full shortcut list.

## Right-Click in the Editor

Right-clicking in the editor shows additional options:

- **Copy Block Link** — copies a wikilink pointing to the current paragraph or list item
- **Copy Block Embed** — copies an embed link (`![[note#^id]]`) for the current block

## Next Steps

- [Markdown Guide](04-markdown.md) — Learn all the formatting syntax
- [Wikilinks & References](05-wikilinks.md) — Connect your notes together
