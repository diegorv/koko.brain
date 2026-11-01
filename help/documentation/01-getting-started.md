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

Kokobrain will scan the folder, build a search index, and display its contents in the file explorer.

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
2. Click **New here** in the note list header. Kokobrain creates `Untitled.md` and opens it in the editor.
3. To rename it, right-click its row in the note list and choose **Rename**, type a name and press **Enter**. Then start typing in the editor.

That is all it takes. Your note is saved automatically as a `.md` file inside the vault folder.

> [!TIP]
> To create a folder, right-click a folder in the Files navigator (or the empty space below them) and choose **New folder**.

---

## The App Layout

Kokobrain uses a three-column layout that you can customize to your liking.

| Area | Location | What it shows |
|------|----------|---------------|
| **Rail and note list** | Far left | The icon rail: Search, Inbox, Today, Favorites, then Types, Calendar and Files, with Archive at the bottom. Each item fills the note list beside it; Types, Calendar and Files also open a navigator between the rail and the list. |
| **Editor area** | Center | Your open notes, arranged in tabs |
| **Right sidebar** | Far right (optional) | Properties, Table of Contents, Backlinks, and Outgoing Links |

At the bottom of the window you will find the **status bar**, which shows information like word count and save status.

### Toggling the sidebars

- **Right sidebar**: Press `Cmd+B` to show or hide it.
- **Rail panels**: the icon rail on the far left never hides. `Cmd+1` hides the panels between the rail and the editor (navigator and note list), `Cmd+2` shows them, and `Cmd+Shift+B` toggles them. The choice is kept across restarts. Drag a panel's edge to resize it.

![App layout overview](screenshots/app-layout.png)

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

The name of the current vault is displayed at the bottom of the file explorer. To switch to a different vault:

1. Close the current vault to return to the welcome screen.
2. Open another vault from the **Recent Vaults** list, or click **Open Vault** to pick a new folder.

Each vault has its own independent settings, search index, and history.

---

## Next Steps

Now that you know the basics, explore these guides to get the most out of Kokobrain:

- [File Explorer](02-file-explorer.md) -- Learn how to create, rename, move, and organize files and folders.
- [The Editor](03-editor.md) -- Discover the editing experience, tabs, and keyboard shortcuts.
- [Markdown Guide](04-markdown.md) -- Master the formatting syntax to write rich, structured notes.
