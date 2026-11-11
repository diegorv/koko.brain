# File Explorer

Kokobrain's left side is the rail (see [Getting Started > The Rail](01-getting-started.md#the-rail)). Its **Files** item (the folder icon) opens the Files navigator: your vault's folders, next to the note list that shows the files of the folder you pick.

## The Files Navigator

Click **Files** in the rail. Two columns open between the rail and the editor:

- **The navigator** lists the vault root, then its folders. It shows folders only, never files; hidden folders (names starting with `.`, such as `.kokobrain`) are left out. Click a folder's arrow to expand or collapse it. Kokobrain remembers which folders you expanded.
- **The note list** shows the picked folder's own files, of every kind: notes, canvases, views, PDFs and images. Files in subfolders are not listed; pick the subfolder to see them. Archived notes stay listed, and so do the files of the system folder (Settings > Files & Folders > System folder), which the rail's other lists leave out. The header names the folder, and the line under it reads `in <folder>/` (or `in the vault root`).

Click a row to open the file in the editor. Kokobrain remembers the folder you picked, and opens on it after a restart. If that folder no longer exists, the rail opens on **Today** instead.

`Cmd+1` hides the navigator and the note list, `Cmd+2` shows them again, and `Cmd+Shift+B` toggles them. Clicking a rail item also shows them again. The rail itself never hides.

## Creating Files and Folders

- The **+** (New here) button in the note list header creates `Untitled.md` in the picked folder and opens it.
- **Right-click a folder** in the navigator, or the empty space below the folders (the vault root), and choose **New note**, **New Canvas**, **New table**, **New Kanban Board**, **New view** or **New folder**. The item is created inside that folder. If the name is taken, Kokobrain adds a number (for example `Untitled 1.md`). **New table** creates `Untitled.view`, a table that opens in the editor and is not listed in Views until you choose **Show in Views** on its row (see [View Files](25-types-and-relationships.md#creating-a-view)). **New view** first asks for the view's name and filters (see [View Files](25-types-and-relationships.md#creating-a-view)); the rail then switches to the Types navigator with the new view picked. A new folder starts in rename mode.
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
| **Show in Views** | Removes `_visible` and `_open_in_editor` from a hidden `.view` (one with `_visible: false`, such as a **New table**), so it is listed under Views in the Types navigator (see [View Files](25-types-and-relationships.md#creating-a-view)) |
| **Copy path** | Submenu: copy the absolute path or the path relative to the vault |
| **Change icon** | Opens the icon picker (Markdown notes only) |
| **Favorite / Unfavorite** | Sets or clears `_favorite` (Markdown notes only) |
| **Reveal in Finder** | Opens the file's location in macOS Finder |
| **Rename** | Starts inline rename (`F2`) |
| **Move to Trash** | Moves the file to the trash, after a confirmation |

**A folder in the navigator:**

| Action | Description |
|--------|-------------|
| **New note**, **New Canvas**, **New table**, **New Kanban Board** | Creates the file in this folder; **New table** creates a `.view` hidden from Views that opens in the editor |
| **New view** | Opens the New view dialog and creates the `.view` in this folder |
| **New folder** | Creates a subfolder |
| **Change icon** | Opens the icon picker for the folder |
| **Copy path** | Submenu: copy the absolute or the relative path |
| **Reveal in Finder** | Opens the folder in macOS Finder |
| **Rename** | Starts inline rename |
| **Move to Trash** | Moves the folder and everything in it to the trash, after a confirmation |

The vault root's menu has only the **New** items (New folder included).

## Sorting

The navigator's folders and the note list of a folder use the same order: by name (A-Z), ignoring case. Numbers inside names sort by their value, so `Note 2` comes before `Note 10`. A Sort picked in a note list's header (see [Getting Started > The Rail](01-getting-started.md#the-rail)) orders that list only; the navigator keeps this order.

You can override the default order per note with the `_order` frontmatter field (described below).

### Custom ordering with `_order`

You can override the sort position of any note by adding `_order` to its frontmatter:

```yaml
---
_order: 1
---
```

Notes with `_order` appear before notes without it, sorted by value (lower = higher). Notes without `_order` keep the default sort. Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted; a blank `_order:`, an empty string or `true` / `false` sets no position.

For folders, add `_order` to the folder note's frontmatter. For example, `Projects/Projects.md` with `_order: 1` moves the `Projects` folder to the top of its level.

The `folder-order.json` file (inside `.kokobrain/`) takes priority over `_order` for folders that are explicitly listed there.

## Folder Notes

When folder notes are on, picking a folder also opens its "folder note": a Markdown file inside the folder with the folder's name. For example, picking `Projects/` opens `Projects/Projects.md`. This is useful for keeping a summary or index for each folder.

Folder icons are stored in the folder note's frontmatter, in the `_icon` field. When you assign an icon to a folder with the icon picker, Kokobrain writes it to the folder note (creating one if needed).

> [!TIP]
> You can toggle folder notes on or off in **Settings → Files & Folders → Folder notes**.

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
| `_color` | Icon color. A palette name (`red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`, `gray`) uses the active theme's shade of that color; any other value (a hex or HSL color) is used as it is. Without `_icon`, it colors the default icon (the note, folder or type icon) instead. |
| `_title_color` | Tab title text color in the editor. |

These fields are also written automatically when you use the icon picker UI. The legacy `icon` field (without underscore) is accepted as an alias for `_icon`.

Icons set via frontmatter appear in the note list, the navigator and editor tabs.

## Bookmarks became Favorites

Kokobrain no longer has bookmarks. The first time you open a vault that still has `.kokobrain/bookmarks.json`, every bookmarked note gets `_favorite: true` and shows up in the rail's **Favorites**.

- Folders and files that are not notes cannot be favorites. One message lists them, and those bookmarks are dropped.
- The bookmarks file is deleted once every note is updated. If a note cannot be updated (for example, its frontmatter has comments), a message names it, the bookmarks file is kept, and the move runs again the next time you open the vault.

## Next Steps

- [The Editor](03-editor.md) — Learn about tabs and editing modes.
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — See all available shortcuts.
