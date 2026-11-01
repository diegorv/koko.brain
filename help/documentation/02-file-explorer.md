# File Explorer

Kokobrain's left side is an icon rail. Its **Files** item (the folder icon) opens the Files navigator: your vault's folders, next to the note list that shows the files of the folder you pick. This is the default **Rail** layout. The older file tree is still available as the **Classic** layout, described at the end of this page.

## The Files Navigator

Click **Files** in the rail. Two columns open between the rail and the editor:

- **The navigator** lists the vault root, then its folders. It shows folders only, never files; hidden folders (names starting with `.`, such as `.kokobrain`) are left out. Click a folder's arrow to expand or collapse it. Kokobrain remembers which folders you expanded.
- **The note list** shows the picked folder's own files, of every kind: notes, canvases, collections, views, PDFs and images. Files in subfolders are not listed; pick the subfolder to see them. Archived notes stay listed. The header names the folder, and the line under it reads `in <folder>/` (or `in the vault root`).

Click a row to open the file in the editor. Kokobrain remembers the folder you picked, and opens on it after a restart. If that folder no longer exists, the rail opens on **Today** instead.

`Cmd+1` hides the navigator and the note list, `Cmd+2` shows them again, and `Cmd+Shift+B` toggles them. The rail itself never hides.

## Creating Files and Folders

- **New here** in the note list header creates `Untitled.md` in the picked folder and opens it.
- **Right-click a folder** in the navigator, or the empty space below the folders (the vault root), and choose **New note**, **New Canvas**, **New Collection**, **New Kanban Board** or **New folder**. The item is created inside that folder. If the name is taken, Kokobrain adds a number (for example `Untitled 1.md`).
- **Command Palette**: press `Cmd+P`, then type "New File", "New Folder", "New Canvas", or "New Kanban Board". From the Command Palette, new items are always created at the vault root.

## Renaming Files and Folders

- **A note or file**: right-click its row in the note list and choose **Rename**, or press **F2** while the row has focus. An inline field opens in the row.
- **A folder**: right-click it in the navigator and choose **Rename**. If the folder was picked, it stays picked under its new name, and stays expanded.

Press **Enter** to confirm or **Escape** to cancel.

### Automatic wikilink updates on rename

When you rename a Markdown file, Kokobrain automatically rewrites every wikilink across your vault that pointed to it, so your links never break. This happens silently, with no prompt and no confirmation. Every `[[old name]]` reference becomes `[[new name]]`.

The rewrite preserves the rest of each link:

- Embeds keep their leading `!`, so `![[old name]]` becomes `![[new name]]`.
- Heading links keep the heading, so `[[old name#Section]]` becomes `[[new name#Section]]`.
- Block links keep the block reference, so `[[old name#^block-id]]` becomes `[[new name#^block-id]]`.
- Aliases keep the display text, so `[[old name|click here]]` becomes `[[new name|click here]]`.

Matching is case-insensitive, so `[[old note]]` is updated even when the file is named `Old Note`.

> [!TIP]
> The update runs only when the note name actually changes. Moving a file to another folder (without renaming it) does not rewrite wikilinks, because basename-style links keep resolving to the same note.

## Moving Files and Folders (Drag and Drop)

Drag a row from the note list, or a folder from the navigator, and drop it onto a folder in the navigator to move it there. Drop it on the vault root row to move it to the root.

## Deleting Files and Folders

Right-click a note list row or a folder and choose **Move to Trash**. A confirmation dialog appears before anything is removed. Deleted items are moved to Kokobrain's internal trash, **not** the system trash. You can review, restore, or permanently delete trashed items from **Settings → Trash**. See [Trash](18-trash.md) for details.

## Context Menus (Right-Click)

**A note list row** (the same menu in every list the rail fills, whichever item filled it):

| Action | Description |
|--------|-------------|
| **Open in new tab** | Opens the file in a new editor tab |
| **Duplicate** | Creates a copy with a " copy" suffix (e.g. `note copy.md`) |
| **Copy path** | Submenu: copy the absolute path or the path relative to the vault |
| **Change icon** | Opens the icon picker (Markdown notes only) |
| **Favorite / Unfavorite** | Sets or clears `_favorite` (Markdown notes only) |
| **Reveal in Finder** | Opens the file's location in macOS Finder |
| **Rename** | Starts inline rename (`F2`) |
| **Move to Trash** | Moves the file to the trash, after a confirmation |

**A folder in the navigator:**

| Action | Description |
|--------|-------------|
| **New note**, **New Canvas**, **New Collection**, **New Kanban Board** | Creates the file in this folder |
| **New folder** | Creates a subfolder |
| **Change icon** | Opens the icon picker for the folder |
| **Copy path** | Submenu: copy the absolute or the relative path |
| **Reveal in Finder** | Opens the folder in macOS Finder |
| **Rename** | Starts inline rename |
| **Move to Trash** | Moves the folder and everything in it to the trash, after a confirmation |

The vault root's menu has only the **New** items.

## Sorting

The navigator's folders, the note list of a folder and the classic file tree all use the same order: by name (A-Z), ignoring case. Numbers inside names sort by their value, so `Note 2` comes before `Note 10`. In the classic file tree, folders always appear above files.

You can override the default order per note with the `_order` frontmatter field (described below).

### Custom ordering with `_order`

You can override the sort position of any note by adding `_order` to its frontmatter:

```yaml
---
_order: 1
---
```

Notes with `_order` appear before notes without it, sorted by value (lower = higher). Notes without `_order` keep the default sort. Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted.

For folders, add `_order` to the folder note's frontmatter. For example, `Projects/Projects.md` with `_order: 1` moves the `Projects` folder to the top of its level.

The `folder-order.json` file (inside `.kokobrain/`) takes priority over `_order` for folders that are explicitly listed there.

## Folder Notes

When folder notes are on, picking a folder also opens its "folder note": a Markdown file inside the folder with the folder's name. For example, picking `Projects/` opens `Projects/Projects.md`. This is useful for keeping a summary or index for each folder.

Folder icons are stored in the folder note's frontmatter, in the `_icon` field. When you assign an icon to a folder with the icon picker, Kokobrain writes it to the folder note (creating one if needed).

> [!TIP]
> You can toggle folder notes on or off in **Settings → Sidebar → Folder Notes**.

## Custom File Icons

Right-click a note list row (Markdown notes) or a folder and choose **Change icon** to open the icon picker.

### Available icon packs

Kokobrain includes icons from 11 packs plus emoji:

Lucide, Feather, Font Awesome (Solid, Regular, Brands), Octicons, Boxicons, Coolicons, Simple Icons, Tabler, Remix, and Emoji.

### Features

- **Search**: Filter icons by name to quickly find the one you want.
- **Icon color**: Tint any SVG icon with one of 8 preset colors or a custom hex/HSL color.
- **Tab text color**: Independently tint the tab title shown in the editor when the file is open. Useful for visually grouping notes by topic without changing the icon color.
- **Recently used**: Your recently picked icons appear at the top for quick access.
- **Remove icon**: Reset to the default file or folder icon.

### Frontmatter icons

You can also set icons and colors via frontmatter in the note itself:

```yaml
---
_icon: lucide:star
_color: "#e67e22"
_title_color: "#3498db"
---
```

| Field | Description |
|-------|-------------|
| `_icon` | Icon in `pack:name` format (e.g. `lucide:star`). A bare name like `star` defaults to the Lucide pack. |
| `_color` | Icon color. A palette name (`red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`, `gray`) uses the active theme's shade of that color; any other value (a hex or HSL color) is used as it is. |
| `_title_color` | Tab title text color in the editor. |

These fields are also written automatically when you use the icon picker UI. The legacy `icon` field (without underscore) is accepted as an alias for `_icon`.

Icons set via frontmatter appear in the note list, the navigator, the file tree and editor tabs.

## The Classic Layout

Pick **Settings → Sidebar → Layout → Classic** to replace the rail with the older left sidebar. Your choice is kept. The Classic layout will be removed in a later version.

In the Classic layout the file explorer is a left sidebar with the whole file tree: every file and folder in your vault.

![File explorer overview](screenshots/file-explorer.png)

### Overview

The file explorer header contains three elements:

- **Open Calendar**: opens the [Calendar tab](27-calendar.md) on today.
- **Daily Note**: opens today's daily note, creating it if it doesn't exist yet.
- **Sidebar Mode Toggle**: three icons that switch the left sidebar between **Type View**, **File Explorer**, and **Calendar**.

Below the header, the file tree displays all files and folders in the vault. At the bottom of the sidebar, the name of the currently open vault is displayed.

### Creating Files and Folders

There are two ways to create new items:

1. **Right-click menu** — Right-click any file, folder, or empty area in the explorer and choose "New File", "New Folder", "New Canvas", "New Kanban Board", or "New Collection".
2. **Command Palette** — Press `Cmd+P`, then type "New File", "New Folder", "New Canvas", or "New Kanban Board".

From the right-click menu, new items are created inside the folder you right-clicked, or next to the file you right-clicked. Right-clicking the empty area creates them at the vault root. From the Command Palette, new items are always created at the vault root, whatever is selected in the tree.

After creating an item, an inline text field appears. Type a name and press **Enter** to confirm.

### Renaming Files and Folders

There are three ways to start a rename:

1. **Double-click** the file name (files only — folders must be renamed via the context menu or F2).
2. Press **F2** while the item is selected.
3. **Right-click** the item and choose "Rename".

An inline input field appears with the current name pre-selected. For files, the `.md` extension is excluded from the selection so you can quickly type a new name without accidentally removing the extension.

Press **Enter** to confirm or **Escape** to cancel.

### Moving Files and Folders (Drag and Drop)

Drag any file or folder and drop it onto a target folder to move it.

When you drag an item over a collapsed folder, it automatically expands after a short delay (600 ms) so you can drop into subfolders without having to expand them first.

You can also drop items onto the root area below all files to move them to the vault root.

### Deleting Files and Folders

To delete an item:

- **Right-click** it and choose **"Move to Trash"**.

A confirmation dialog appears before anything is removed. Deleted items are moved to Kokobrain's internal trash — **not** the system trash. You can review, restore, or permanently delete trashed items from **Settings → Trash**. See [Trash](18-trash.md) for details.

### Context Menu (Right-Click)

Right-clicking a file or folder opens a context menu with the following options:

| Action | Description |
|--------|-------------|
| **Open in New Tab** | Opens the file in a new editor tab (files only) |
| **New File** | Creates a new `.md` file in this location |
| **New Folder** | Creates a new folder in this location |
| **New Canvas** | Creates a new `.canvas` file in this location |
| **New Kanban Board** | Creates a new `.kanban` file in this location |
| **New Collection** | Creates a new `.collection` file in this location with a minimal table view (see [Collection](12-collection.md)) |
| **Duplicate** | Creates a copy with a " copy" suffix (e.g. `note copy.md`) |
| **Change Icon** | Opens the icon picker to assign a custom icon (see [Custom File Icons](#custom-file-icons)) |
| **Copy Path** | Submenu with two options: Copy absolute path or Copy relative path to clipboard |
| **Reveal in Finder** | Opens the item's location in macOS Finder |
| **Rename** | Starts inline rename mode (same as F2) |
| **Move to Trash** | Moves to trash with confirmation dialog |

![Context menu on a file](screenshots/context-menu.png)

### Folder Notes

When enabled, clicking a folder also opens its "folder note" — a Markdown file inside the folder that shares the same name as the folder.

For example, clicking the folder `Projects/` opens `Projects/Projects.md`.

Folders that have a folder note are shown with an underlined name in the tree, making them easy to spot. This feature is useful for keeping a summary or index for each folder.

Folder icons are stored in the folder note's frontmatter using the `_icon` field. When you assign an icon to a folder via the icon picker, Kokobrain writes it to the folder note (creating one if needed).

> [!TIP]
> You can toggle folder notes on or off in **Settings → Sidebar → Folder Notes**.

### Expanding and Collapsing

Click anywhere on a folder's row to expand or collapse it. When folder notes are enabled, the same click also opens the folder's folder note, if it has one.

### File Count Badges

Each folder displays a small badge showing how many files it contains, visible at a glance next to the folder name.

### Indent Guide Lines

The file tree draws vertical guide lines at each nesting depth, helping you visually track which items belong to which folder — especially useful in deeply nested vaults.

### Sidebar Modes

In the Classic layout the left sidebar has three modes, toggled via the sidebar mode switcher at the top of the panel:

- **File Explorer** — The folder tree view described in this guide.
- **Type View** — Groups notes by their type and lifecycle stage instead of folder structure. See [Types & Relationships](25-types-and-relationships.md).
- **Calendar** — A month grid for navigating notes by their note date and opening periodic notes. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md).

### Bookmarks became Favorites

Kokobrain no longer has bookmarks. The first time you open a vault that still has `.kokobrain/bookmarks.json`, every bookmarked note gets `_favorite: true` and shows up in the rail's **Favorites**.

- Folders and files that are not notes cannot be favorites. One message lists them, and those bookmarks are dropped.
- The bookmarks file is deleted once every note is updated. If a note cannot be updated (for example, its frontmatter has comments), a message names it, the bookmarks file is kept, and the move runs again the next time you open the vault.

### Custom File Icons

Right-click any file or folder in the tree and select **"Change Icon"** to open the same icon picker as the rail layout (see [Custom File Icons](#custom-file-icons)).

![Icon picker](screenshots/icon-picker.png)

## Next Steps

- [The Editor](03-editor.md) — Learn about tabs and editing modes.
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — See all available shortcuts.
