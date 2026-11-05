# Getting Started

Learn how to open a vault, create your first note, and understand the app layout.

---

## What is a Vault?

A **vault** is a folder inside one of two designated locations on your Mac:

- `~/Documents/kokobrain-vaults/`
- `~/kokobrain-vaults/`

Each subfolder you create there becomes its own vault. There is no special format or proprietary container -- a vault is just a regular directory full of files.

Kokobrain reads and writes standard `.md` (Markdown) files directly inside that folder. This means you can open the same folder with Finder, VS Code, or any other app at any time. Your files are never locked in.

When you open a folder as a vault, Kokobrain creates a hidden `.kokobrain/` directory inside it to store settings and metadata such as the search index and file history snapshots. This folder is invisible by default and does not interfere with your notes.

> [!TIP]
> Because your notes are plain Markdown files, you can sync them with iCloud, Dropbox, Git, or any tool you already use -- no export step required.

---

## Opening Your First Vault

When you launch Kokobrain for the first time, you are greeted by a **welcome screen** with an **Open Vault** button in the center.

1. Click **Open Vault**.
2. A native macOS folder picker appears. Navigate to `~/Documents/kokobrain-vaults/` or `~/kokobrain-vaults/`, then select or create a subfolder.
3. Select the folder and click **Open**.

Kokobrain will scan the folder, build a search index, and show the rail with its notes.

![Welcome screen with Open Vault button](screenshots/welcome-screen.png)

> [!NOTE]
> You can open any folder inside the designated vault locations -- even one that already contains `.md` files from another app. Kokobrain will recognize them immediately.

---

## Recent Vaults

After you have opened a vault at least once, it appears in the **Recent Vaults** list on the welcome screen. The next time you launch Kokobrain, you can click any entry in that list to reopen the vault instantly -- no need to navigate through the folder picker again.

To clean up the list, hover over an entry and click the **X** button to remove it from Recent Vaults. This only forgets the entry -- it does not delete the vault folder or any notes on disk.

![Recent vaults list](screenshots/recent-vaults.png)

---

## Creating Your First Note

Once a vault is open, the icon rail runs down the left edge of the window. Its **Files** item (the folder icon) shows your folders, next to a note list with the files of the folder you pick. See [File Explorer](02-file-explorer.md).

1. Click **Files** in the rail. The vault root is picked.
2. Click the **+** (New here) button in the note list header. Kokobrain creates `Untitled.md` and opens it in the editor.
3. To rename it, right-click its row in the note list and choose **Rename**, type a name and press **Enter**. Then start typing in the editor.

That is all it takes. Your note is saved automatically as a `.md` file inside the vault folder.

> [!TIP]
> To create a folder, right-click a folder in the Files navigator (or the empty space below them) and choose **New folder**.

---

## The App Layout

Kokobrain uses a three-column layout that you can customize to your liking.

| Area | Location | What it shows |
|------|----------|---------------|
| **Rail and note list** | Far left | The icon rail (see [The Rail](#the-rail)). Each item fills the note list beside it; Types, Calendar and Files also open a navigator between the rail and the list. |
| **Editor area** | Center | Your open notes, arranged in tabs |
| **Right sidebar** | Far right (optional) | Properties, Table of Contents, Backlinks, and Outgoing Links |

At the bottom of the window you will find the **status bar**, which shows information like word count and save status.

### Showing and hiding panels

- **Right sidebar**: Press `Cmd+B` to show or hide it.
- **Rail panels**: the icon rail on the far left never hides. `Cmd+1` hides the panels between the rail and the editor (navigator and note list), `Cmd+2` shows them, and `Cmd+Shift+B` toggles them; the Command Palette has the same three as **Hide Rail Panels**, **Show Rail Panels** and **Toggle Rail Panels**. Clicking a rail item also shows them again. The choice is kept across restarts. Drag a panel's edge to resize it.

![App layout overview](screenshots/app-layout.png)

---

## The Rail

The rail is the column of icons on the left edge of the window. From top to bottom:

1. **Search**, **Inbox** (with a badge counting the notes to organize), **Today** and **Favorites**.
2. A divider, then **Types**, **Calendar** and **Files**. These three also open a navigator: the Types navigator, the month calendar with its periodic notes, and the folder tree.
3. Your **pinned items**, after another divider: views and types you pinned (see [Pinned Rail Items](25-types-and-relationships.md#pinned-rail-items)). With many pins, this group scrolls and the rest of the rail stays in place.
4. **Archive**, at the bottom.

Hover an icon for its name. Click it to fill the note list: Inbox lists the notes with `_organized: false`, Today the notes dated today, Favorites your favorite notes, Archive the archived notes (see [The Other Rail Items](25-types-and-relationships.md#the-other-rail-items)). Kokobrain remembers the item you picked and opens on it after a restart. Search fills the note list with search results, with the query in its header ([Search & Navigation](06-search-and-navigation.md)).

Each note list has a header with these tools. **Sort** (the dropdown next to the count) lists Modified, Created, Title, Status and one row per property the list's notes use. Each row has up and down arrows for its direction. Clicking another row takes its default direction: newest first for Modified and Created, A to Z for the rest. Clicking the active row changes nothing. Once a sort is set the menu offers **Reset to default**, which removes it. On a view the menu also has **Multiple sort...**, which opens the multi-column sort panel. **Search** (the magnifying glass) opens a row under the header that filters the list by title, by the property pills on each row, and by the note's full text. **Show in note list** (the sliders icon) picks the properties shown as pills on the rows. Drag a checked property by its grip handle to reorder the pills, or focus its checkbox and press Alt+Up or Alt+Down. Reordering is off while the picker's own search field has text. A view that is loading, missing or cannot be shown has none of these tools.

The choices are saved where the list comes from. A view saves its sort as `sort:` and its pills as `_list_properties_display` in its `.view` file. A type saves its sort as `_list_sort` and its pills as `_list_properties_display` in its Type Definition note (see [Type Definition Fields](25-types-and-relationships.md#type-definition-fields)). Every other list saves in `.kokobrain/settings.json`, and all folder lists share one saved choice. Without a saved sort, a list keeps its own order.

**Settings > Layout** hides the items you do not use, moves an item up or down within its group, and turns the Inbox badge off. Search and Today cannot be hidden, and Search stays first (see [Settings > Layout](19-settings.md#layout)).

From the keyboard, the Command Palette (`Cmd+P`) has a **Go to** command for every item the rail shows (**Go to Inbox**, **Go to Types**, one per pin) and an **Open view:** command for every `.view` file except a hidden one (see [Keyboard Shortcuts](20-keyboard-shortcuts.md#commands-without-shortcuts)).

The **Types** navigator lists your views first, then your types. Views are your `.view` files: saved filters that fill the note list. They can be grouped under subheadings (`_group`), hidden from the list (`_visible: false`) and pinned to the rail. The **+** next to **Views** opens the **New view** dialog, which asks for a name and optional filters; a view's right-click menu has **Edit view** (the same dialog), **Pin to rail**, **Move to Trash** and more. A view that cannot run says so in the note list (**Loading...**, **This view no longer exists**, or **This view cannot be shown** with the reason and an **Open view** button). See [The Types Navigator](25-types-and-relationships.md#the-types-navigator) and [View Files](25-types-and-relationships.md#view-files-view).

---

## Where Is My Data Stored?

Everything Kokobrain creates lives inside your vault folder. Here is what each file does:

| File / Folder | Purpose |
|---------------|---------|
| `*.md` files | Your notes -- plain Markdown text files |
| `.kokobrain/settings.json` | Vault-specific settings (theme, editor preferences, etc.) |
| `.kokobrain/kokobrain.db` | File history snapshots and full-text search index (SQLite) |
| `.kokobrain/recent-icons.json` | Recently used icons in the icon picker |
| `.kokobrain/trash/` | Trash manifest and deleted files |
| `.kokobrain/folder-order.json` | Custom folder ordering |
| `.kokobrain/auto-move-rules.json` | Auto-move rule configuration |
| `.kokobrain/todoist-sent.json` | Tracks which tasks were sent to Todoist |

The `.kokobrain/` folder is hidden by default in Finder. You can safely back it up alongside your notes. If you ever delete it, the only things you lose are settings and history -- your notes remain untouched.

> [!TIP]
> To see hidden files in Finder, press `Cmd+Shift+.` (period).

---

## Switching Vaults

The name of the current vault is the first row of the Files navigator. To switch to a different vault:

1. Close the current vault to return to the welcome screen.
2. Open another vault from the **Recent Vaults** list, or click **Open Vault** to pick a new folder.

Each vault has its own independent settings, search index, and history.

---

## Next Steps

Now that you know the basics, explore these guides to get the most out of Kokobrain:

- [File Explorer](02-file-explorer.md) -- Learn how to create, rename, move, and organize files and folders.
- [The Editor](03-editor.md) -- Discover the editing experience, tabs, and keyboard shortcuts.
- [Markdown Guide](04-markdown.md) -- Master the formatting syntax to write rich, structured notes.
