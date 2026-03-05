# File Explorer

The file explorer is the left sidebar that displays every file and folder in your vault, giving you a quick way to navigate, organize, and manage your notes.

![File explorer overview](screenshots/file-explorer.png)

## Overview

The file explorer header contains four buttons:

- **Daily Note** — Opens today's daily note, creating it if it doesn't exist yet.
- **New File** — Creates a new Markdown file.
- **New Folder** — Creates a new folder.
- **Collapse All** — Collapses every expanded folder in the tree.

A **sort dropdown** lets you switch between sorting by Name or Date Modified. At the bottom of the sidebar, the name of the currently open vault is displayed.

## Creating Files and Folders

There are three ways to create new items:

1. **Header buttons** — Click the New File (page+) or New Folder (folder+) icon in the file explorer header.
2. **Right-click menu** — Right-click any file, folder, or empty area in the explorer and choose "New File", "New Folder", or "New Canvas".
3. **Command Palette** — Press `Cmd+P`, then type "New File", "New Folder", or "New Canvas".

New items are created inside the currently selected folder. If nothing is selected, they are placed at the vault root.

After creating an item, an inline text field appears. Type a name and press **Enter** to confirm.

## Renaming Files and Folders

There are three ways to start a rename:

1. **Double-click** the file or folder name.
2. Press **F2** while the item is selected.
3. **Right-click** the item and choose "Rename".

An inline input field appears with the current name pre-selected. For files, the `.md` extension is excluded from the selection so you can quickly type a new name without accidentally removing the extension.

Press **Enter** to confirm or **Escape** to cancel.

> [!TIP]
> When you rename a file, Kokobrain automatically updates all wikilinks across your vault. Every `[[old name]]` reference becomes `[[new name]]`, so your links never break.

## Moving Files and Folders (Drag and Drop)

Drag any file or folder and drop it onto a target folder to move it.

When you drag an item over a collapsed folder, it automatically expands after a short delay (600 ms) so you can drop into subfolders without having to expand them first.

You can also drop items onto the root area below all files to move them to the vault root.

## Deleting Files and Folders

To delete an item:

- **Right-click** it and choose "Delete", or
- **Select** it and press `Cmd+Delete`.

A confirmation dialog appears before anything is removed. Deleted items are moved to Kokobrain's internal trash — **not** the system trash. You can review, restore, or permanently delete trashed items from **Settings → Trash**. See [Trash](18-trash.md) for details.

## Context Menu (Right-Click)

Right-clicking a file or folder opens a context menu with the following options:

| Action | Description |
|--------|-------------|
| **Open in New Tab** | Opens the file in a new editor tab (files only) |
| **New File** | Creates a new `.md` file in this location |
| **New Folder** | Creates a new folder in this location |
| **New Canvas** | Creates a new `.canvas` file in this location |
| **Duplicate** | Creates a copy with a "-copy" suffix |
| **Bookmark / Remove Bookmark** | Adds or removes the item from your bookmarks |
| **Change Icon** | Opens the icon picker to assign a custom icon (see [Custom File Icons](#custom-file-icons) below) |
| **Copy Path** | Submenu with two options: Copy absolute path or Copy relative path to clipboard |
| **Reveal in Finder** | Opens the item's location in macOS Finder |
| **Rename** | Starts inline rename mode (same as F2) |
| **Delete** | Moves to trash with confirmation dialog |

![Context menu on a file](screenshots/context-menu.png)

## Sorting

Click the sort button in the file explorer header to switch between two modes:

- **Sort by Name** — Alphabetical order (A–Z).
- **Sort by Date Modified** — Most recently changed files appear first.

Folders always appear above files regardless of which sort mode is active.

## Folder Notes

When enabled, clicking a folder also opens its "folder note" — a Markdown file inside the folder that shares the same name as the folder.

For example, clicking the folder `Projects/` opens `Projects/Projects.md`.

Folders that have a folder note are shown with an underlined name in the tree, making them easy to spot. This feature is useful for keeping a summary or index for each folder.

> [!TIP]
> You can toggle folder notes on or off in **Settings → Sidebar → Folder Notes**.

## Expanding and Collapsing

Click the chevron (▶) or the folder name to expand or collapse a folder.

Use the **Collapse All** button in the header to collapse every folder at once. This is especially helpful when the tree gets deeply nested and you want a clean starting view.

## Bookmarks

Bookmark files and folders for quick access. Right-click any file or folder and select **"Bookmark"** to pin it. To remove a bookmark, right-click and select **"Remove Bookmark"**.

- Bookmarks are stored in `.kokobrain/bookmarks.json` inside your vault.
- When you rename or move a bookmarked file, the bookmark automatically updates to the new path — no manual fix needed.

## Custom File Icons

You can assign custom icons to any file or folder in the file explorer. Right-click any file or folder and select **"Change Icon"** to open the icon picker.

![Icon picker](screenshots/icon-picker.png)

### Available icon packs

Kokobrain includes icons from 11 packs plus emoji:

Lucide, Feather, Font Awesome (Solid, Regular, Brands), Octicons, Boxicons, Coolicons, Simple Icons, Tabler, Remix, and Emoji.

### Features

- **Search**: Filter icons by name to quickly find the one you want.
- **Color picker**: Tint any SVG icon with 8 preset colors or a custom color of your choice.
- **Recently used**: Your recently picked icons appear at the top for quick access.
- **Remove icon**: Reset to the default file or folder icon.

### Frontmatter icons

You can also set an icon via frontmatter in the note itself:

```yaml
---
icon: lucide/star
---
```

This icon will appear in the file explorer and in editor tabs.

## Next Steps

- [The Editor](03-editor.md) — Learn about tabs and editing modes.
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — See all available shortcuts.
