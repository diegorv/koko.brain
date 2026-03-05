# The Editor

Learn about tabs, editing modes, and the status bar.

## Tabs

Every file you open appears as a tab at the top of the editor area. The active tab has a highlighted bottom border so you always know which note you're working on.

Tabs also show different icons based on file type — markdown, canvas, tasks, graph, and others each have their own icon for quick identification.

### Dirty Indicator

When you have unsaved changes, a filled dot appears next to the tab name. Press **Cmd+S** to save the current file and the dot disappears.

### Closing and Navigating Tabs

- **Close a tab**: Click the **x** button on the tab, or press **Cmd+W**
- **Next tab**: **Cmd+Shift+]**
- **Previous tab**: **Cmd+Shift+[**

![Editor tabs with dirty indicator](screenshots/editor-tabs.png)

## Pinning Tabs

You can pin important tabs so they stay visible and can't be accidentally closed.

- Right-click a tab and select **Pin Tab** (or use the Command Palette and search for "Pin/Unpin Tab")
- Pinned tabs are marked with a pin icon and stay on the left side of the tab bar
- Pinned tabs cannot be closed with **Cmd+W** — you must explicitly unpin them first

> [!TIP]
> Pin your daily note so it's always one click away. You can also enable auto-pin in Settings -> Periodic Notes.

## Editor Modes

The markdown editor has two modes, toggled via the button in the bottom-right corner of the editor.

### Source Mode

Shows raw Markdown syntax exactly as written. You see `**bold**`, `# Heading`, and `[[link]]` as plain text. This mode is best for precise editing and seeing the exact structure of your note.

### Live Preview Mode

Renders Markdown inline as you type — headings appear styled, bold text looks bold, and links are clickable. Markdown syntax markers are hidden when you're not editing that line. This mode is best for a cleaner writing experience.

![Source mode vs live preview comparison](screenshots/editor-modes.png)

> [!NOTE]
> The mode toggle only appears for Markdown (`.md`) files. Canvas and Collection files have their own specialized editors.

## Scroll and Cursor Position

Kokobrain remembers your scroll position and cursor location in each tab. When you switch between tabs, you return to exactly where you left off. This works even when you have many tabs open.

## File Types in the Editor

Different file types open with different editors:

| File Type | Editor View | Description |
|-----------|-------------|-------------|
| `.md` | Markdown editor | The main editor with source/live preview modes |
| `.canvas` | Canvas editor | Visual infinite canvas (see [Canvas](11-canvas.md)) |
| `.collection` | Table/database | Spreadsheet-like view (see [Collection](12-collection.md)) |
| Tasks (virtual) | Tasks view | Aggregated tasks from all notes (see [Tasks](10-tasks-and-todoist.md)) |
| Graph (virtual) | Graph view | Knowledge graph visualization (see [Graph View](14-graph-view.md)) |

"Virtual" tabs don't correspond to a file on disk — they are generated views.

For Canvas and Collection files, a toggle button in the bottom-right lets you switch between the visual editor and raw source (JSON for canvas, YAML for collection).

## Wikilink Navigation

In both editor modes, you can navigate to linked notes:

- **Source mode**: Hold **Cmd** and click a `[[wikilink]]`
- **Live preview**: Just click the rendered link

If the linked note doesn't exist, Kokobrain will create it for you. Learn more in [Wikilinks & References](05-wikilinks.md).

## Wikilink Autocomplete

Type `[[` to trigger the autocomplete popup. Start typing to filter by note name, then press **Enter** to insert the selected link or **Escape** to dismiss. The popup shows all notes in your vault.

## Status Bar

At the bottom of the window, the status bar shows contextual information about your current note.

**Left side:**
- Search indexing progress (while indexing is running)

**Right side:**
- **Encryption toggle** (lock icon) — click to encrypt or decrypt the current note (see [Encryption & Security](16-encryption-and-security.md))
- **Word count** — three metrics that update live as you type:
  - **Word count**: total number of words in the note
  - **Character count**: total number of characters
  - **Reading time**: estimated reading time based on 200 words per minute

## Right-Click in the Editor

Right-clicking in the editor shows additional options:

- **Copy Link to Block** — copies a wikilink pointing to the current paragraph or list item
- **Copy Block Embed** — copies an embed link (`![[note#^id]]`) for the current block

## Next Steps

- [Markdown Guide](04-markdown.md) — Learn all the formatting syntax
- [Wikilinks & References](05-wikilinks.md) — Connect your notes together
