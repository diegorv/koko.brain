# Settings

A complete reference for all application settings. Open Settings with `Cmd+,` or via the Command Palette.

## How Settings Work

Settings are stored per vault in `.kokobrain/settings.json` inside the vault folder. Each vault can have different settings, so you can tailor the experience to each project or area of your life.

The Settings dialog has a sidebar organized into groups: **General** (Appearance, Editor, Sidebar), **Notes** (Periodic Notes, Quick Capture, 1:1 Notes, Templates, Types), **Tools** (Search, File History, Auto Move, Trash, QueryJS), **Integrations** (Todoist), and **Advanced** (Troubleshooting, Update).

![Settings dialog](screenshots/settings.png)

## Appearance

| Setting | Description | Default |
|---------|-------------|---------|
| **Active theme** | Select the active color theme. Click a theme to preview its colors. | KokoBrain Default |

> [!TIP]
> Themes define all colors used in the app (background, text, borders, accents). The selection shows color swatches for each theme.

### Theme Editor

Below the theme picker, the **Theme Editor** lets you build or tweak a custom theme. Every color token in the UI (background, foreground, card, popover, primary, secondary, accent, destructive, border, ring, tab bar, divider, status-bar segments, syntax highlighting, etc.) is editable as a hex value with a live preview against your current notes. Built-in themes can be cloned into editable copies; user-created themes are saved into `appearance.themes` in `settings.json` and selected via `appearance.activeTheme`.

## Sidebar

| Setting | Description | Default |
|---------|-------------|---------|
| **Right sidebar** | Show or hide the entire right sidebar | Hidden |
| **Properties** | Show the Properties panel | Enabled |
| **Backlinks** | Show the Backlinks panel | Enabled |
| **Outgoing links** | Show the Outgoing Links panel | Enabled |
| **Table of Contents** | Show the Table of Contents panel | Enabled |
| **Folder notes** | Clicking a folder also opens its matching folder note | Enabled |

## Editor

| Setting | Description | Default |
|---------|-------------|---------|
| **Font family** | CSS font-family string for the editor | `iA Writer Duo S` |
| **Font size** | Font size in pixels (8--32) | `18` |
| **Line height** | Line spacing multiplier (1.0--3.0) | `1.6` |
| **Content width** | Maximum width of the editor content in pixels. `0` removes the cap so the editor fills the pane. | `0` |
| **Paragraph spacing** | Extra vertical space after each paragraph, in `em`. `0` keeps the default Markdown spacing. | `0.05` |

### Heading Typography

Each heading level (`h1`–`h6`) has its own typography block under `editor.headingTypography.<level>`:

| Field | Description | Range |
|-------|-------------|-------|
| `fontSize` | Size relative to the base font, in `em` | 0.5 – 5.0 |
| `lineHeight` | Line height multiplier | 1.0 – 3.0 |
| `fontWeight` | One of `bold`, `semibold`, `normal` | — |
| `letterSpacing` | Tracking in `em` | -0.1 – 0.1 |

Use the **Heading Typography** editor in the Editor section to adjust each level visually with a live preview against a sample note.

## Periodic Notes

Configuration for daily, weekly, monthly, and quarterly notes. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder** | Base folder for all periodic notes | `_notes` |

**Daily:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string for filename/path | `YYYY/MM-MMM/_[journal]-[day]-DD-MM-YYYY` |
| Template | Path to template file | `_system/templates/periodic-note/Daily-Note.md` |
| Auto-open | Open today's daily note on vault load | `true` |
| Auto-pin | Pin the daily note tab (requires Auto-open) | `true` |

**Weekly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/MM-MMM/[__journal-week-]WW[-]YYYY` |
| Template | Path to template file | `_system/templates/periodic-note/Weekly-Note.md` |

**Monthly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/MM-MMM/MM-MMM` |
| Template | Path to template file | `_system/templates/periodic-note/Monthly-Note.md` |

**Quarterly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/[_journal-quarter-]YYYY[-Q]Q` |
| Template | Path to template file | `_system/templates/periodic-note/Quarterly-Note.md` |

**Yearly:**

| Setting | Description | Default |
|---------|-------------|---------|
| Format | dayjs format string | `YYYY/YYYY` |
| Template | Path to template file | `_system/templates/periodic-note/Yearly-Note.md` |

## Quick Capture

Shared by all three capture surfaces: the in-editor note composer (`Cmd+N`), the global composer popover (`Ctrl+Alt+Cmd+Space`), and the silent clipboard capture (`Ctrl+Alt+Cmd+C`).

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder format** | dayjs format for the subfolder path | `YYYY/MM-MMM` |
| **Filename format** | dayjs format for the note filename | `[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS` |
| **Note template** | Template for free-form notes (composer + Cmd+N) | `_system/templates/quick-capture/Composer-Note.md` |
| **Clip template** | Template for clipboard text captures | `_system/templates/quick-capture/Clip-Note.md` |
| **Link template** | Template for auto-detected URLs from the clipboard | `_system/templates/quick-capture/Link-Note.md` |
| **Shot template** | Template for clipboard images (PNG written to OS temp) | `_system/templates/quick-capture/Shot-Note.md` |
| **File template** | Template for non-image file paths in the clipboard | `_system/templates/quick-capture/File-Note.md` |
| **Show inbox count on dock** (`dockBadgeInboxCount`) | Red badge on the macOS dock icon showing the number of inbox notes (unorganized, not archived). | Enabled |

An empty template path means "no template — just write the rendered body." See [Quick Capture & Templates](09-quick-notes-and-templates.md) for details.

## 1:1 Notes

| Setting | Description | Default |
|---------|-------------|---------|
| **Personal people folder** (`peopleFolder`) | Folder containing personal person files | `Personal/_people` |
| **Work people folder** (`workPeopleFolder`) | Folder containing work person files | `Work/_people` |
| **Folder format** | dayjs format for meeting note subfolder | `YYYY/MM-MMM` |
| **Filename format** | dayjs format with `{person}` placeholder | `[-1on1-]{person}[-]DD-MM-YYYY` |
| **Template** | Path to a template file | `_system/templates/periodic-note/One-On-One.md` |

See [Quick Capture & Templates](09-quick-notes-and-templates.md) for details.

## Templates

| Setting | Description | Default |
|---------|-------------|---------|
| **Templates folder** | Folder name for template files (relative to vault root) | `_system/templates` |
| **System folder** | Vault-relative folder whose files are hidden from the type sidebar (note list, nav counts, inbox dock badge). Leave empty to disable. | `_system` |

## Types

| Setting | Description | Default |
|---------|-------------|---------|
| **Explicit Organization** | New notes start unorganized and appear in the Inbox | Disabled |
| **Show Untyped Notes** | Show notes without a type in an "Untyped" section at the bottom of the type sidebar | Disabled |
| **Base folder** (`typesBaseFolder`) | Vault-relative folder prepended to each type's own `_folder` when creating typed notes. New notes go to `base folder / type folder / note`. Empty = vault root. | Empty (vault root) |

See [Types & Relationships](25-types-and-relationships.md) for details.

## Search

| Setting | Description | Default |
|---------|-------------|---------|
| **Semantic search** | Enable AI-powered semantic search | Disabled |

When enabled for the first time, Kokobrain downloads the BGE-M3 ONNX model (~542 MB). The dialog shows download progress, then index build progress. Once complete, it displays stats (total chunks / total files indexed).

When semantic search is enabled, an optional **Reranker** download button appears. Downloading the BGE-reranker-v2-m3 cross-encoder model (~571 MB) improves search precision by re-scoring results with a deeper model. The reranker is optional — semantic search works without it.

Both models are automatically unloaded after 120 seconds of inactivity to free memory, then lazy-reloaded on next use.

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
| **Debounce delay** | Milliseconds to wait after saving before evaluating rules | `3000` |

Rules and excluded folders are managed in the Auto Move settings section and stored in `.kokobrain/auto-move-rules.json` inside the vault. This file is separate from `settings.json`.

## Todoist

| Setting | Description | Default |
|---------|-------------|---------|
| **API Token** | Your personal Todoist API token | -- |

Get your token from: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) > Developer > API token.

See [Tasks & Todoist](10-tasks-and-todoist.md) for details on the integration.

## QueryJS

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto-run policy** (`queryjs.autoRunQueries`) | When `` ```queryjs `` blocks should execute. `manual` shows a ▶ Run button; `first-open` runs once per session and caches; `always` re-runs on every render. | `first-open` |
| **Clear cache** | Button to drop all cached query results and auto-run markers | — |

See [QueryJS → Execution policy](13-queryjs.md#execution-policy) for the full behavior matrix and notes on the per-session result cache.

## Tag Colors

The per-tag color assignments shown in the Tags sidebar (and inline `#tags` in notes) are stored under `tagColors.colors` as a map of `lowercase/tag/path → #hex`:

```json
{
  "tagColors": {
    "colors": {
      "work": "#fb464c",
      "personal/health": "#44cf6e"
    }
  }
}
```

You set colors interactively from the Tags panel by clicking the dot next to a tag (see [Sidebar Panels → Tag colors](07-sidebar-panels.md#tag-colors)). There is no dedicated section in the Settings dialog for these assignments — they live in `settings.json` only.

## Troubleshooting

| Setting | Description | Default |
|---------|-------------|---------|
| **Debug Mode (Frontend)** | Logs verbose frontend info to browser DevTools console | Disabled |
| **Save Debug Log to File** | Writes frontend logs to the system log directory | Disabled |
| **Open Log Folder** | Opens the log directory in the system file manager | -- |
| **Debug Mode (Tauri)** | Forwards Rust backend logs to browser DevTools | Disabled |
| **Save Tauri Log to File** | Writes backend logs to the system log directory | Disabled |
| **Live preview profiling** (`livePreviewProfiling`) | Emit `LP-PROFILE` timing entries to the log so you can measure per-plugin decoration cost | Disabled |
| **Debug heartbeat** | Emits "[HB] alive" ticks every 250ms for diagnosing UI freezes | Disabled |
| **Build info** | Shows release channel, version, commit hash, and build time | — |
| **Disabled decorators** (`disabledDecorators`) | Per-feature toggle to disable individual live-preview decorations. Available decorators: `table`, `metaBindInput`, `queryjs`, `codeBlock`, `frontmatter`, `callout`, `link`, `inlineMarks`, `simpleWidget`, `heading`, `blockquote`, `markdownStyle`. | `{}` |

> [!NOTE]
> These settings are only useful when diagnosing bugs. Enable them before reproducing an issue, then share the log files when reporting a bug.
>
> Log files are stored in the system log directory (`~/Library/Logs/` on macOS), not inside the vault.

## Update

| Setting | Description | Default |
|---------|-------------|---------|
| **Release channel** | Choose between `Stable` and `Nightly` builds. **Stable** installs official tagged releases (recommended for everyday use). **Nightly** is built from the latest commit on `main` and may be unstable. | `Stable` |
| **Auto-check on launch** | Silently check for an update when the app opens. Throttled to once per 24h. | Disabled |
| **Last checked** | When the app most recently asked GitHub for a newer version. Shows `Never`, `Just now`, or a coarse "X min/h/d ago". | — |
| **Check for updates** | Button to manually check the selected channel for a newer version | — |

When an update is available, the **Check for updates** row shows download progress (version and size) and then a **Restart to update** button. Changing the release channel resets any pending download, since it pointed at a build from the other channel.

### Nightly to Stable downgrade

The auto-updater never moves to a lower version, so switching the channel back from **Nightly** to **Stable** does not automatically downgrade. Nightly versions use the format `X.Y.Z-nightly.<count>.<sha>` and sort semver-greater than the same-base stable release.

When you are running a Nightly build but have selected the **Stable** channel, an extra **Install Stable** row appears with an **Install Stable (downgrade)** button. Clicking it shows a confirmation dialog (you will lose any changes that landed on `main` since the last Stable tag, until the next Stable release ships; your vault and settings are unaffected), then installs the latest Stable build in-app. A **Releases page** button next to it opens the GitHub Releases page as a manual fallback if the in-app install fails.

## Settings File Location

Settings are saved to `.kokobrain/settings.json` inside your vault. You can:

- Back up this file to preserve your settings
- Copy it to another vault to replicate settings
- Edit it manually (be careful with JSON syntax)

## Next Steps

- [Keyboard Shortcuts](20-keyboard-shortcuts.md) -- Full shortcut reference
