# File History

Browse, compare, and restore previous versions of your notes.

**Shortcut:** `Cmd+Shift+H` (while a note is open)

---

## Overview

Every time you save a note (`Cmd+S`), Kokobrain silently stores a snapshot in the local SQLite database (`.kokobrain/kokobrain.db`). You can open the history dialog at any time to browse all saved versions and restore a previous one if needed.

![File history dialog](screenshots/file-history.png)

## The History Dialog

The dialog has two panes:

- **Left pane — Snapshot list**: All saved versions of the note, grouped by day (Today, Yesterday, and specific dates). Each entry shows a relative timestamp such as "5 min ago" or "2 hours ago", so you can quickly find the version you are looking for.
- **Right pane — Diff viewer**: A side-by-side comparison between the selected snapshot and the current content. Green lines indicate text that was added; red lines indicate text that was removed.

## Restoring a Version

1. Click a snapshot in the left pane to preview the diff against the current content.
2. Click **"Restore This Version"** to replace the current content with the selected snapshot.
3. A confirmation dialog appears before the restore is applied — nothing happens until you confirm.
4. The current content is **not lost**. Kokobrain automatically creates a new snapshot of the current state before performing the restore, so you can always undo it.

> [!TIP]
> Since restoring creates a safety snapshot first, you can always "undo" a restore by opening the history dialog again and choosing the snapshot that was auto-saved right before the restore.

## Deduplication

Snapshots are deduplicated using SHA-256 hashing. If you save a file without making any changes, no new snapshot is created — the save is silently skipped because the content hash matches the latest snapshot. This keeps the database lean even if you habitually press `Cmd+S`.

## Settings

Configure file history behavior in **Settings → File History**:

| Setting | Description | Default |
|---------|-------------|---------|
| **Automatic snapshots** | Save a snapshot every time a file is saved | Enabled |
| **Retention days** | Days to keep all snapshots before thinning begins (1–365) | 7 |
| **Snapshot backup** | Also save snapshots as `.md` files in `.kokobrain/snapshots-backup/` | Disabled |

### Retention Policy

Kokobrain uses a three-tier retention policy to manage snapshot storage:

1. **Recent** (within retention days): All snapshots are kept — nothing is deleted.
2. **Medium** (retention days to retention days + 30): Thinned to 1 snapshot per day per file. The most recent snapshot of each day is kept.
3. **Old** (beyond retention days + 30): All snapshots are permanently deleted.

For example, with the default of 7 retention days:
- Days 1–7: every snapshot is preserved
- Days 8–37: only 1 per day per file
- Day 38+: deleted automatically

> [!NOTE]
> Snapshot cleanup runs automatically. You don't need to manage it manually.

### Snapshot Backup

When **Snapshot backup** is enabled, Kokobrain also saves snapshots as plain `.md` files in `.kokobrain/snapshots-backup/`. This provides a human-readable backup that doesn't depend on the SQLite database. Useful if you want to version-control your vault's `.kokobrain/` folder or simply have an extra safety net.

---

## Next Steps

- [Encryption & Security](16-encryption-and-security.md) — Protect sensitive notes with encryption
- [Settings](19-settings.md) — Full settings reference
