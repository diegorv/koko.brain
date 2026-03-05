# Trash

Kokobrain has a built-in recycle bin. Deleted files are not permanently removed — they are moved to an internal trash where you can review, restore, or permanently delete them.

---

## How Deletion Works

When you delete a file or folder from the file explorer (right-click → **Delete** or `Cmd+Delete`), a confirmation dialog appears. On confirm, the item is moved to Kokobrain's internal trash — **not** the system trash (Finder's Trash).

The file disappears from the file explorer but remains safely stored inside `.kokobrain/trash/` until you choose to restore or permanently delete it.

## Viewing the Trash

Open **Settings** (`Cmd+,`) and navigate to the **Trash** section in the sidebar. You'll see a list of all trashed items, each showing:

- **File/folder icon** — indicates whether the trashed item is a file or directory
- **File name** — the original name of the deleted item
- **Original path** — the vault-relative path where the item originally lived (e.g., `notes/meeting.md`)
- **Time** — a relative timestamp ("Just now", "5 min ago", "2h ago", "3d ago", or a specific date for older items)
- **Restore button** (undo icon) — moves the item back to its original location
- **Delete button** (trash icon, red) — permanently deletes the item

If the trash is empty, a placeholder message is displayed.

## Restoring Items

Click the **restore button** (undo icon) next to any item to move it back to its original location.

- **Parent directories are recreated** if they no longer exist. For example, if you deleted `projects/meeting.md` and then deleted the `projects/` folder, restoring the file will recreate the `projects/` folder.
- **Conflict resolution**: If the original path is already occupied (a new file with the same name was created), Kokobrain appends a suffix: `file (restored).md`. If that's also taken, it increments: `file (restored 2).md`, `file (restored 3).md`, and so on.
- The file explorer updates immediately after restoring.

## Permanent Deletion

There are two ways to permanently delete trashed items:

### Delete a Single Item

Click the **red trash icon** next to an item. A confirmation dialog asks: *"Permanently delete [filename]? This cannot be undone."*

### Empty All Trash

Click the **"Empty Trash"** button at the top-right of the Trash section. A confirmation dialog shows the count: *"Permanently delete all N items in trash? This cannot be undone."*

> [!WARNING]
> Permanently deleted items **cannot be recovered** by any means. Make sure you don't need the files before confirming.

## Storage

Trashed items are stored under `.kokobrain/trash/` inside your vault:

```
.kokobrain/trash/
  trash-manifest.json          # metadata about all trashed items
  items/
    1708185600000/             # timestamped container (one per deleted item)
      meeting.md               # the actual deleted file
    1708185700000/
      old-project/             # deleted folders keep their structure
        README.md
        notes.md
```

The `trash-manifest.json` file records each item's original path, filename, type (file or directory), and deletion timestamp. This manifest is automatically maintained — you don't need to edit it.

> [!NOTE]
> The `.kokobrain/` folder (including trash) is hidden from the file explorer. Trashed files do not appear in search results or the graph view.

---

## Next Steps

- [Settings](19-settings.md) — Full settings reference
- [Keyboard Shortcuts](20-keyboard-shortcuts.md) — All shortcuts in one place
