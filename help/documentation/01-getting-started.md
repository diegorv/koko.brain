# Getting Started

Learn how to open a vault, create your first note, and understand the app layout.

---

## What is a Vault?

A **vault** is simply any folder on your Mac that you choose to open with Kokobrain. There is no special format or proprietary container -- a vault is just a regular directory full of files.

Kokobrain reads and writes standard `.md` (Markdown) files directly inside that folder. This means you can open the same folder with Finder, VS Code, or any other app at any time. Your files are never locked in.

When you open a folder as a vault, Kokobrain creates a hidden `.kokobrain/` directory inside it to store settings and metadata such as the search index and file history snapshots. This folder is invisible by default and does not interfere with your notes.

> [!TIP]
> Because your notes are plain Markdown files, you can sync them with iCloud, Dropbox, Git, or any tool you already use -- no export step required.

---

## Opening Your First Vault

When you launch Kokobrain for the first time, you are greeted by a **welcome screen** with an **Open Vault** button in the center.

1. Click **Open Vault**.
2. A native macOS folder picker appears. Navigate to any existing folder, or click **New Folder** to create one from scratch.
3. Select the folder and click **Open**.

Kokobrain will scan the folder, build a search index, and display its contents in the file explorer.

![Welcome screen with Open Vault button](screenshots/welcome-screen.png)

> [!NOTE]
> You can open any folder -- even one that already contains `.md` files from another app. Kokobrain will recognize them immediately.

---

## Recent Vaults

After you have opened a vault at least once, it appears in the **Recent Vaults** list on the welcome screen. The next time you launch Kokobrain, you can click any entry in that list to reopen the vault instantly -- no need to navigate through the folder picker again.

![Recent vaults list](screenshots/recent-vaults.png)

---

## Creating Your First Note

Once a vault is open, the left sidebar shows the **file explorer** -- a tree view of all the notes and folders inside the vault.

1. Click the **New File** button (the page icon with a **+**) in the file explorer header.
2. Type a name for your note and press **Enter**.
3. The note opens in the editor area. Start typing!

That is all it takes. Your note is saved automatically as a `.md` file inside the vault folder.

![Creating a new note](screenshots/new-note.png)

> [!TIP]
> You can also create folders to organize your notes. Click the **New Folder** button (the folder icon with a **+**) next to the New File button.

---

## The App Layout

Kokobrain uses a three-column layout that you can customize to your liking.

| Area | Location | What it shows |
|------|----------|---------------|
| **Left sidebar** | Far left | File explorer (your notes and folders) or the Search panel |
| **Editor area** | Center | Your open notes, arranged in tabs |
| **Right sidebar** | Far right (optional) | Calendar, Properties, Backlinks, Tags, and more |

At the bottom of the window you will find the **status bar**, which shows information like word count and encryption status.

### Toggling the sidebars

- **Right sidebar**: Press `Cmd+B` to show or hide it.
- **Left sidebar**: Drag its edge to resize, or collapse it entirely.

![App layout overview](screenshots/app-layout.png)

---

## Where Is My Data Stored?

Everything Kokobrain creates lives inside your vault folder. Here is what each file does:

| File / Folder | Purpose |
|---------------|---------|
| `*.md` files | Your notes -- plain Markdown text files |
| `.kokobrain/settings.json` | Vault-specific settings (theme, editor preferences, etc.) |
| `.kokobrain/kokobrain.db` | File history snapshots and full-text search index (SQLite) |
| `.kokobrain/file-icons.json` | Custom icons you have assigned to files or folders |
| `.kokobrain/bookmarks.json` | Your bookmarked notes |

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
