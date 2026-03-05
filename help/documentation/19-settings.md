# Settings

A complete reference for all application settings. Open Settings with `Cmd+,` or via the Command Palette.

## How Settings Work

Settings are stored per vault in `.kokobrain/settings.json` inside the vault folder. Each vault can have different settings, so you can tailor the experience to each project or area of your life.

The Settings dialog has a sidebar for navigation on the left and a content area on the right where you can adjust each section.

![Settings dialog](screenshots/settings.png)

## Appearance

| Setting | Description | Default |
|---------|-------------|---------|
| **Theme** | Select the active color theme. Click a theme to preview its colors. | Dark |

> [!TIP]
> Themes define all colors used in the app (background, text, borders, accents). The selection shows color swatches for each theme.

## Sidebar

| Setting | Description | Default |
|---------|-------------|---------|
| **Right Sidebar** | Show or hide the entire right sidebar | Visible |
| **Calendar** | Show the Calendar panel | Enabled |
| **Properties** | Show the Properties panel (frontmatter editor) | Enabled |
| **Backlinks** | Show the Backlinks panel | Enabled |
| **Outgoing Links** | Show the Outgoing Links panel | Enabled |
| **Tags** | Show the Tags panel | Enabled |
| **Folder Notes** | Clicking a folder also opens its matching .md file | Disabled |
| **Terminal** | Show the terminal panel | Enabled |

## Editor

| Setting | Description | Default |
|---------|-------------|---------|
| **Font family** | CSS font-family string for the editor | `MonoLisa, monospace` |
| **Font size** | Font size in pixels (8--32) | `14` |
| **Line height** | Line spacing multiplier (1.0--3.0) | `1.6` |

## Periodic Notes

Configuration for daily, weekly, monthly, and quarterly notes. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder** | Base folder for all periodic notes | `_notes` |

**Daily:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string for filename/path | `YYYY/MM-MMM/_journal-day-DD-MM-YYYY` |
| Template | Path to template file | -- |
| Auto-open | Open today's daily note on vault load | `false` |
| Auto-pin | Pin the daily note tab | `false` |

**Weekly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/MM-MMM/_review-week-WW` |
| Template | Path to template file | -- |

**Monthly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/MM-MMM/_review-month-MM` |
| Template | Path to template file | -- |

**Quarterly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/_review-quarter-Q` |
| Template | Path to template file | -- |

## Quick Note

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder format** | dayjs format for the subfolder path | `YYYY/MM-MMM` |
| **Filename format** | dayjs format for the note filename | `capture-note-YYYY-MM-DD_HH-mm-ss-SSS` |
| **Template** | Path to a template file | -- |

See [Quick Notes & Templates](09-quick-notes-and-templates.md) for details.

## 1:1 Notes

| Setting | Description | Default |
|---------|-------------|---------|
| **People folder** | Folder containing person files | `_people` |
| **Folder format** | dayjs format for meeting note subfolder | -- |
| **Filename format** | dayjs format with `{person}` placeholder | `[-1on1-]{person}[-]DD-MM-YYYY` |
| **Template** | Path to a template file | -- |

See [Quick Notes & Templates](09-quick-notes-and-templates.md) for details.

## Templates

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder** | Folder name for template files (relative to vault root) | `_templates` |

## Terminal

| Setting | Description | Default |
|---------|-------------|---------|
| **Font family** | CSS font-family for the terminal | System monospace |
| **Font size** | Terminal font size in pixels (8--24) | `13` |
| **Line height** | Terminal line spacing (1.0--2.0) | `1.2` |
| **Shell** | Shell executable path (empty = system $SHELL) | -- |

## Search

| Setting | Description | Default |
|---------|-------------|---------|
| **Semantic search** | Enable AI-powered semantic search | Disabled |

When enabled for the first time, Kokobrain downloads the BGE-M3 ONNX model (~118 MB). The dialog shows download progress, then index build progress. Once complete, it displays stats (total chunks / total files indexed).

> [!NOTE]
> The semantic model runs entirely on your machine. No data is sent to any server. You need an internet connection only for the initial download.

## File History

Configuration for automatic snapshots and retention. See [File History](15-file-history.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Automatic snapshots** | Save a snapshot every time a file is saved | Enabled |
| **Retention days** | Days to keep all snapshots before thinning begins (1–365) | `7` |
| **Snapshot backup** | Also save snapshots as `.md` files in `.kokobrain/snapshots-backup/` | Disabled |

## Trash

View and manage deleted files. See [Trash](18-trash.md) for a detailed explanation.

The Trash section shows all items that have been deleted from the file explorer. For each item you can:

- **Restore** — move the item back to its original location
- **Delete permanently** — remove the item from disk (cannot be undone)
- **Empty Trash** — permanently delete all trashed items at once

## Auto Move

Configuration for automatic file organization. See [Auto Move](22-auto-move.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Globally enable or disable the auto-move feature | Disabled |
| **Debounce delay** | Milliseconds to wait after saving before evaluating rules | `2000` |

Rules and excluded folders are managed in the Auto Move settings section and stored in `.kokobrain/auto-move-rules.json` inside the vault. This file is separate from `settings.json`.

## Todoist

| Setting | Description | Default |
|---------|-------------|---------|
| **API Token** | Your personal Todoist API token | -- |

Get your token from: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) > Developer > API token.

See [Tasks & Todoist](10-tasks-and-todoist.md) for details on the integration.

## Troubleshooting

| Setting | Description | Default |
|---------|-------------|---------|
| **Debug Mode (Frontend)** | Logs verbose frontend info to browser DevTools console | Disabled |
| **Save Debug Log to File** | Writes frontend logs to the system log directory | Disabled |
| **Open Log Folder** | Opens the log directory in the system file manager | -- |
| **Debug Mode (Tauri)** | Forwards Rust backend logs to browser DevTools | Disabled |
| **Save Tauri Log to File** | Writes backend logs to the system log directory | Disabled |

> [!NOTE]
> These settings are only useful when diagnosing bugs. Enable them before reproducing an issue, then share the log files when reporting a bug.
>
> Log files are stored in the system log directory (`~/Library/Logs/` on macOS), not inside the vault.

## Settings File Location

Settings are saved to `.kokobrain/settings.json` inside your vault. You can:

- Back up this file to preserve your settings
- Copy it to another vault to replicate settings
- Edit it manually (be careful with JSON syntax)

## Next Steps

- [Keyboard Shortcuts](20-keyboard-shortcuts.md) -- Full shortcut reference
