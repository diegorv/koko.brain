# Auto Move

Automatically organize notes into folders when they are saved, based on rules you define.

**Open:** `Cmd+,` → **Auto Move** section in Settings.

---

## Overview

Auto Move watches every file save. When a note is saved, Kokobrain evaluates your rules against that note's content and properties. If a rule matches, the file is moved to the configured destination folder automatically — no manual drag-and-drop needed.

## Enabling Auto Move

1. Open **Settings** (`Cmd+,`).
2. Go to the **Auto Move** section.
3. Toggle **Enabled** on.

When disabled, no files are ever moved, regardless of how many rules you have configured.

## How Rules Work

Rules are evaluated in order, top to bottom. **The first matching rule wins** — subsequent rules are skipped once a match is found.

Each rule consists of:

| Field | Description |
|-------|-------------|
| **Name** | A human-readable label for the rule (e.g. "Archive completed projects") |
| **Expression** | A condition written in the Collection expression language (see below) |
| **Destination** | Target folder path, relative to the vault root (e.g. `Archive/done`) |
| **Enabled** | Individual toggle — you can disable a rule without deleting it |
| **Icon** (optional) | An icon applied to the file after it is moved |

If the note is already in the destination folder, Kokobrain skips the move but still applies the icon if one is configured.

## Writing Expressions

Expressions use the same language as [Collection](12-collection.md) filters. They are evaluated against the note's frontmatter properties and metadata.

### Common examples

```
status = "done"
```
Move notes where the `status` property equals `"done"`.

```
tags contains "archived"
```
Move notes that have the tag `archived`.

```
priority = "high" and project = "work"
```
Move notes matching both conditions.

```
due < today
```
Move notes with a `due` date in the past.

> [!TIP]
> Open [Collection](12-collection.md) to experiment with expressions before adding them as Auto Move rules. The Collection table view uses the same expression engine, so you can validate your filter there first.

## Excluded Folders

You can define folders that are **never** evaluated for Auto Move, even if a rule would match. This is useful for:

- Template folders (`_templates`)
- Daily notes folder (`_notes`)
- Any folder you want to keep static

Files inside excluded folders are skipped entirely — no evaluation, no moves.

## Debounce Delay

Auto Move does not run instantly on every keystroke. It waits a configurable number of milliseconds after the last save before evaluating rules. This prevents unnecessary moves while you are actively editing a note.

The default is `2000 ms` (2 seconds). Increase it if you find moves happening too eagerly; decrease it for a more responsive experience.

## Applying Icons After Move

Each rule can optionally assign an icon to the moved file. This integrates with [File Icons](02-file-explorer.md#file-icons) — you pick an icon pack, icon name, and optional colors. The icon is applied to the file at its new path after the move completes.

## Configuration File

Rules and excluded folders are stored in `.kokobrain/auto-move-rules.json` inside your vault (separate from the main `settings.json`). The enabled/disabled toggle and debounce delay are stored in `settings.json`.

You can inspect or back up the rules file manually:

```json
{
  "rules": [
    {
      "id": "1710000000000",
      "name": "Archive completed",
      "expression": "status = \"done\"",
      "destination": "Archive",
      "enabled": true
    }
  ],
  "excludedFolders": [
    "_templates",
    "_notes"
  ]
}
```

> [!WARNING]
> Auto Move performs real file moves on disk. A note moved by a rule will disappear from its original location. Use the [Trash](18-trash.md) or [File History](15-file-history.md) if you need to recover a mistakenly moved file.

> [!NOTE]
> Auto Move only evaluates `.md` files. Canvas files (`.canvas`), Kanban boards (`.kanban`), and other file types are never moved.

---

## Next Steps

- [Collection](12-collection.md) — Learn the expression language used for rule conditions
- [File Icons](02-file-explorer.md#file-icons) — Assign icons to files and folders
- [File History](15-file-history.md) — Recover previous versions if a move goes wrong
