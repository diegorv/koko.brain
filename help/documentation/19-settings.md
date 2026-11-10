# Settings

A complete reference for all application settings. Open Settings with `Cmd+,` or via the Command Palette.

## How Settings Work

Settings are stored per vault in `.kokobrain/settings.json` inside the vault folder. Each vault can have different settings, so you can tailor the experience to each project or area of your life.

The Settings dialog has a navigation list organized into groups: **General** (Appearance, Editor, Layout), **Notes** (Types, Periodic Notes, Quick Capture, 1:1 Notes, Calendar), **Vault** (Files & Folders, File History, Auto Move, Trash), **Tools** (Search, QueryJS), **Integrations** (Todoist), **Advanced** (Sentry, Troubleshooting, Update), and **Labs** (experimental features).

The Labs settings are the exception: they are stored on this machine, keyed by the vault's path, not in `settings.json`. See [Labs](#labs).

![Settings dialog](screenshots/settings.png)

## Appearance

| Setting | Description | Default |
|---------|-------------|---------|
| **Active theme** | Select the active color theme. Click a theme to preview its colors. | KokoBrain Default |

> [!TIP]
> Themes define all colors used in the app (background, text, borders, accents). The selection shows color swatches for each theme.

### Theme Editor

Below the theme picker, the **Theme Editor** lets you build or tweak a custom theme. Every color token in the UI (background, foreground, card, popover, primary, secondary, accent, destructive, border, ring, tab bar, divider, status-bar segments, syntax highlighting, etc.) is editable as a hex value with a live preview against your current notes. Built-in themes can be cloned into editable copies; user-created themes are saved into `appearance.themes` in `settings.json` and selected via `appearance.activeTheme`.

## Layout

The rail on the left, the inbox badges and the right sidebar.

### Rail

Pick the rail's style, collapse it, hide the buttons you do not use and change their order. The page lists the rail's items in its three groups: **Rail top** (Search, Inbox, Today, Favorites), **Rail navigators** (Types, plugin navigators such as Calendar, Files) and **Rail bottom** (Archive). Pinned views and types are not listed; they follow their own `_order`.

| Setting | Description | Default |
|---------|-------------|---------|
| **Rail style** (`layout.railStyle`) | **Labeled** shows titles, sections and counts, and its right edge drags to resize it. **Captioned** is 84 px wide, with a caption under each icon. See [The Rail](01-getting-started.md#the-rail). | Labeled (`labeled`) |
| **Collapse rail** (`layout.railCollapsed`) | Narrows the rail to 48 px of icons. Your style comes back when you turn it off. The button next to the window controls does the same. `Cmd+Shift+B` is something else: it hides the panels between the rail and the editor. | Disabled (`false`) |
| **Show** *item* (`layout.railHidden`) | Show or hide that item's rail button. A hidden item also has no "Go to" command in the Command Palette. Search and Today are always shown. | All shown |
| **Move up / Move down** (`layout.railOrder`) | Move the item one place within its group. Search always stays first. | Rail order |

`layout.railWidth` (default `140`) is the width in pixels of the labeled rail. It has no control other than dragging the rail's right edge, between 140 and 320; double-clicking the edge returns it to 140.

If you hide the item the rail is showing, the rail switches to Today. Showing the item again brings it back. Hiding Calendar hides its rail button only; the Calendar plugin keeps working.

### Inbox badges

| Setting | Description | Default |
|---------|-------------|---------|
| **Show Inbox count on the rail** (`layout.railInboxBadge`) | The inbox count on the rail's Inbox button. | Enabled |
| **Show inbox count on dock** (`dockBadgeInboxCount`) | Red badge on the macOS dock icon showing the number of inbox notes (unorganized, not archived). | Enabled |

### Right sidebar

| Setting | Description | Default |
|---------|-------------|---------|
| **Show right sidebar** | Show or hide the entire right sidebar | Hidden |
| **Properties** | Show the Properties panel | Enabled |
| **Backlinks** | Show the Backlinks panel | Enabled |
| **Outgoing links** | Show the Outgoing Links panel | Enabled |
| **Table of contents** | Show the Table of contents panel | Enabled |

## Editor

| Setting | Description | Default |
|---------|-------------|---------|
| **Font family** | Fonts for the editor, comma-separated; the first one installed is used | `iA Writer Duo S` |
| **Font size** | Body text size in pixels (8--32), the size notes render at | `19` |
| **Line height** | Line spacing multiplier (1.0--3.0) | `1.6` |
| **Content width** | Maximum width of the editor content in pixels. `0` removes the cap so the editor fills the pane. | `0` |
| **Paragraph spacing** | Extra vertical space after each paragraph, in `em`. `0` keeps the default Markdown spacing. | `0.05` |

### Heading typography

Each heading level (`h1`–`h6`) has its own typography block under `editor.headingTypography.<level>`:

| Field | Description | Range |
|-------|-------------|-------|
| `fontSize` | Size relative to the base font, in `em` | 0.5 – 5.0 |
| `lineHeight` | Line height multiplier | 1.0 – 3.0 |
| `fontWeight` | One of `bold`, `semibold`, `normal` | — |
| `letterSpacing` | Tracking in `em` | -0.1 – 0.1 |

Defaults: H1 `2.058em`, H2 `1.618em`, H3 `1.272em`, H4 `1.125em`, H5 `1em` (all bold), H6 `0.9em` semibold. Themes also give each level its own color.

Use the **Heading typography** editor in the Editor section to adjust each level visually with a live preview against a sample note.

## Periodic Notes

Configuration for daily, weekly, monthly, and quarterly notes. Date patterns use dayjs tokens. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Notes folder** | Folder where periodic notes are created. Quick Capture notes (Cmd+N included) and a plain + New here note go in it too. | `_notes` |

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

An empty template path means "no template — just write the rendered body." See [Quick Capture & Templates](09-quick-notes-and-templates.md) for details.

## 1:1 Notes

| Setting | Description | Default |
|---------|-------------|---------|
| **Personal people folder** (`peopleFolder`) | Folder containing personal person files | `Personal/_people` |
| **Work people folder** (`workPeopleFolder`) | Folder containing work person files | `Work/_people` |
| **Folder format** | dayjs format for meeting note subfolder | `YYYY/MM-MMM` |
| **Filename format** | dayjs format with `{person}` placeholder | `[-1on1-]{person}[-]DD-MM-YYYY` |
| **Template** | Path to a template file | `_system/templates/periodic-note/One-On-One.md` |
| **1:1 due after (days)** (`dueAfterDays`) | Today's My people flags a work person with no 1:1 for more than this many days | `14` |

See [Quick Capture & Templates](09-quick-notes-and-templates.md) for details.

## Files & Folders

| Setting | Description | Default |
|---------|-------------|---------|
| **Templates folder** | Folder name for template files (relative to vault root) | `_system/templates` |
| **System folder** | Vault-relative folder left out of the rail's note lists, the Types navigator counts, the calendars, the inbox badges and QueryJS kb.pages(). The Files navigator still shows it. Leave empty to disable. | `_system` |
| **Folder notes** | Clicking a folder in the Files navigator also opens its matching folder note | Enabled |

## Types

The page is titled **Types & Lifecycle**.

| Setting | Description | Default |
|---------|-------------|---------|
| **Explicit organization** | New notes start unorganized and appear in the Inbox until you organize them. Periodic notes are not marked. See [Explicit Organization Mode](25-types-and-relationships.md#explicit-organization-mode) for the creation paths it covers. | Enabled |
| **Show untyped notes** | Show notes without a type in an "Untyped" row at the bottom of the Types navigator | Disabled |
| **Typed notes folder** (`typesBaseFolder`) | Vault-relative folder prepended to each type's own `_folder` when creating typed notes. New notes go to `typed notes folder / type folder / note`. Empty = vault root. | Empty (vault root) |

See [Types & Relationships](25-types-and-relationships.md) for details.

## Calendar

| Setting | Description | Default |
|---------|-------------|---------|
| **Week starts on** | First day of the week in the week and month views (Monday or Sunday) | Monday |
| **Time format** | Clock used for the time axis and event times (24-hour or 12-hour) | 24-hour |
| **Day starts at** | Hour the time grid scrolls to when it opens (0-12) | 7 |
| **Show weekends** | Show Saturday and Sunday in the week and month views | Enabled |
| **Show dated tasks** | Show tasks with a due date (📅) on their day in every view | Enabled |
| **Default view** | View the Calendar tab opens in when the app starts (Day, Week or Month) | Week |
| **Default duration** | Length of a new event in minutes (15-480, in steps of 15) | 60 |
| **Default color** | Color of a new event | Blue |
| **Type name** | Notes of this type appear on the calendar. If you rename the type in the Types navigator, enter its new name here. | `Event` |
| **New events go to** | Read-only: the folder new events are created in, from the event type's `_folder` and the typed notes folder | |
| **Folder and template** | **Open Event type** opens the event type definition, where you set its `_folder` and `_template` | |

See [Calendar](27-calendar.md) for details.

## Search

| Setting | Description | Default |
|---------|-------------|---------|
| **Semantic search** | Find notes by meaning as well as by words. Downloads a 542 MB model once. | Disabled |

When enabled for the first time, Kokobrain downloads the BGE-M3 ONNX model (~542 MB). The dialog shows download progress, then index build progress. Once complete, it displays stats (total chunks / total files indexed).

When semantic search is enabled, an optional **Reranker** download button appears. Downloading the jina-reranker-v2-base-multilingual cross-encoder model (~280 MB) improves search precision by re-scoring results with a deeper model. The reranker is optional — semantic search works without it.

Both models are automatically unloaded after 120 seconds of inactivity to free memory, then lazy-reloaded on next use.

> [!NOTE]
> The semantic model runs entirely on your machine. No data is sent to any server. You need an internet connection only for the initial download.

## File History

Configuration for automatic snapshots and retention. See [File History](15-file-history.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Automatic snapshots** | Save a snapshot every time a file is saved | Enabled |
| **Retention days** | Days to keep every snapshot. For 30 more days one per day is kept per file, then they are deleted (1–365) | `7` |
| **Snapshot backup** | Also save snapshots as `.md` files in `.kokobrain/snapshots-backup/` | Disabled |

## Trash

View and manage deleted files. See [Trash](18-trash.md) for a detailed explanation.

The Trash section shows all items that have been moved to the Trash. For each item you can:

- **Restore** — move the item back to its original location
- **Delete permanently** — remove the item from disk (cannot be undone)
- **Empty Trash** — permanently delete all trashed items at once

## Auto Move

Configuration for automatic file organization. See [Auto Move](22-auto-move.md) for a detailed explanation.

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Auto Move** | Globally enable or disable the auto-move feature. Type definitions' `_archive_to` rules need it on too. | Disabled |
| **Debounce delay** | Seconds to wait after save before evaluating rules (0.5–30); stored in milliseconds as `autoMove.debounceMs` | `3` (`3000` ms) |

Rules and excluded folders are managed in the Auto Move settings section and stored in `.kokobrain/auto-move-rules.json` inside the vault. This file is separate from `settings.json`.

## Todoist

| Setting | Description | Default |
|---------|-------------|---------|
| **API token** (`todoist.apiToken`) | Your personal Todoist API token. Stored in plain text in this vault's `.kokobrain/settings.json`, so exclude `.kokobrain` from any sync tool you use on the vault. | -- |
| **Default label** (`todoist.defaultLabel`) | A Todoist label the sync never writes as a tag and never removes from a task. | Empty |
| **Sync with Todoist** (`todoist.syncEnabled`) | Keeps the root project's tasks and this vault's notes in sync both ways. | Disabled (`false`) |
| **Root project** (`todoist.syncRootProjectId`) | The Todoist project this vault syncs, with every project nested under it. **Load projects** fetches the list. With none chosen, the sync stays off. | None |
| **Include Inbox** (`todoist.syncIncludeInbox`) | Also syncs the Todoist Inbox, into `Inbox.md` in the sync folder. Turn it on in one vault only. | Disabled (`false`) |
| **Vault context** (`todoist.syncContext`) | **Work** sends new tasks with no context label; **Personal** sends them with the label `personal`. | Work (`work`) |
| **Sync folder** (`todoist.syncFolder`) | Vault folder for the project notes, one note per Todoist project. | `Todoist` |
| **Sync interval** (`todoist.syncIntervalMinutes`) | Minutes between automatic syncs, at least 1. | `5` |

Get your token from: [todoist.com/prefs/integrations](https://todoist.com/prefs/integrations) > Developer > API token.

See [Tasks & Todoist](10-tasks-and-todoist.md#todoist-sync) for how the sync works.

## QueryJS

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto-run policy** (`queryjs.autoRunQueries`) | When `` ```queryjs `` blocks run. **First open**: run on the first time the file opens this session, then cache. **Always**: run every block that has no cached result, each time it is drawn; a result stays cached until a note is saved or changes on disk. **Manual**: never auto-execute; use ▶ Run on each block. | `first-open` |
| **Clear cache** | Clear cached query results for this session. Each block runs again on its next render, following the policy above. | — |

See [QueryJS → Execution policy](13-queryjs.md#execution-policy) for the full behavior matrix and notes on the per-session result cache.

## Sentry

Optional error monitoring, off by default. See [PRIVACY.md](../../PRIVACY.md).

| Setting | Description | Default |
|---------|-------------|---------|
| **Error monitoring** (`sentry.enabled`) | Off by default. When on, unhandled errors are sent to the Sentry project of the DSN you enter. | Disabled |
| **Sentry DSN** (`sentry.dsn`) | The project DSN from Sentry Settings → Projects → Client Keys (DSN). Shown while error monitoring is on | Empty |
| **Send test event** | Sends a synthetic error with no vault data, to confirm the DSN reaches your project | — |

Only error events and stack traces are sent; session replay, performance tracing, breadcrumbs, user identity and request data are off.

## Tag Colors

The per-tag color assignments shown in the Tags tab (and on the tag icon of a `tags` list property in the Properties panel) are stored under `tagColors.colors` as a map of `lowercase/tag/path → #hex`:

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

You set colors interactively from the Tags tab by clicking the dot next to a tag (see [Sidebar Panels → Tag colors](07-sidebar-panels.md#tag-colors)). There is no dedicated section in the Settings dialog for these assignments — they live in `settings.json` only.

## Troubleshooting

| Setting | Description | Default |
|---------|-------------|---------|
| **Debug Mode (Frontend)** | Logs verbose frontend info to browser DevTools console | Disabled |
| **Save Debug Log to File** | Writes frontend logs to the system log directory | Disabled |
| **Save mod run messages to file** (`debugModRunMessages`) | Explicitly permits saving raw `run.log` text locally. Also requires **Save debug log to file** and an active log session | Disabled |
| **Show in Finder** | Opens the log directory in the system file manager | -- |
| **Debug Mode (Tauri)** | Forwards Rust backend logs to browser DevTools | Disabled |
| **Save Tauri Log to File** | Writes backend logs to the system log directory | Disabled |
| **Live preview profiling** (`livePreviewProfiling`) | Emit `LP-PROFILE` timing entries to the log so you can measure per-plugin decoration cost | Disabled |
| **Heartbeat** | Logs a tick every 250 ms (`[HB]`), UI thread stalls (`[HB]`), click-to-paint time (`[NAV]`) and main-thread stalls (`[MAIN-HB]`, which needs Tauri debug mode and the Tauri log file). Needs a log file. | Disabled |
| **Live preview decorators** (`disabledDecorators`) | Turn one off to isolate a rendering problem. A change applies the next time a note opens. Saved by key. Properties block (`frontmatter`), Code blocks (`codeBlock`), Comment blocks (`blockComment`), Tables (`table`), Callouts (`callout`), Collection blocks (`collectionBlock`), QueryJS blocks (`queryjs`), Meta Bind buttons (`metaBindButton`), Mermaid diagrams (`mermaid`), Math blocks (`blockMath`), Audio embeds (`audio`), Video embeds (`video`), Images (`image`), Footnotes (`footnote`), Embedded notes (`wikilinkEmbed`), Meta Bind inputs (`metaBindInput`), Headings (`heading`), Blockquotes (`blockquote`), Checkboxes, list markers, rules, line breaks and inline math (`simpleWidget`), Links and wikilinks (`link`), Hidden formatting marks (`inlineMarks`), Bold, italic, strikethrough, code and highlight styling (`markdownStyle`). | All on |

> [!NOTE]
> These settings are only useful when diagnosing bugs. Enable them before reproducing an issue and inspect log files before sharing them.
>
> Log files are stored outside the vault in the system app log directory (`~/Library/Logs/com.diegorv.kokobrain/` on macOS), as `YYYY-MM-DD_HH-mm-ss.log` session files. **Show in Finder** opens that folder. There is no automatic retention cleanup for these session files; remove unwanted files yourself.

**Raw mod messages are sensitive.** They may contain note text, paths, prompts, API responses or secrets. **Save debug log to file** alone does not authorize saving `run.log` text: separately enable **Save mod run messages to file**. Messages are saved as emitted, without automatic redaction. Turning the option off stops future message persistence but does not delete content already saved. Enabling it never copies earlier run-view messages. Existing `ctx.log`, caught-error diagnostics and other app logs are unaffected and may contain sensitive content even with this option off.

Messages use the existing best-effort buffered writer, normally flushing every 250 ms or 50 lines. Persistence is not crash-proof: crashes or file-write failures can lose buffered messages. Closing or replacing a run view does not erase saved messages. See [Mods: saving run messages](28-mods.md#saving-run-messages) for correlation and limits.

## Update

| Setting | Description | Default |
|---------|-------------|---------|
| **Current version** | Release channel, version, commit and build time | — |
| **Check for updates** | Button to manually check the selected channel for a newer version. The row also shows when the app last asked GitHub: `never`, `just now`, or a coarse "X min/h/d ago". | — |
| **Release channel** | Choose between `Stable` and `Nightly` builds. **Stable** installs official tagged releases (recommended for everyday use). **Nightly** is built from the latest commit on `main` and may be unstable. | `Stable` |
| **Auto-check on launch** | Silently check for an update when the app opens. Fires once per vault open, with no throttle. | Disabled |

The section ends with **Changes in this build**, the commits since the last release tag.

When an update is available, the **Check for updates** row shows download progress (version and size) and then a **Restart to update** button. Changing the release channel resets any pending download, since it pointed at a build from the other channel.

### Nightly to Stable downgrade

The auto-updater never moves to a lower version, so switching the channel back from **Nightly** to **Stable** does not automatically downgrade. Nightly versions use the format `X.Y.Z-nightly.<count>.<sha>` (or `X.Y.Z-beta.N.nightly.<count>.<sha>` while a pre-release is out) and sort semver-greater than the same-base stable release.

When you are running a Nightly build but have selected the **Stable** channel, an extra **Install Stable** row appears with an **Install Stable (downgrade)** button. Clicking it shows a confirmation dialog (you will lose any changes that landed on `main` since the last Stable tag, until the next Stable release ships; your vault and settings are unaffected), then installs the latest Stable build in-app. A **Releases page** button next to it opens the GitHub Releases page as a manual fallback if the in-app install fails.

## Labs

Experimental features. Unlike every other section, these settings are stored on this machine (the app's local storage), keyed by the vault's absolute path, and not in `.kokobrain/settings.json`: a vault copied from elsewhere, or opened at a new path, starts with them off.

| Setting | Description | Default |
|---------|-------------|---------|
| **Vault mods** | Loads the JavaScript mods in `_system/mods/` of this vault. Takes effect at once, no restart. Mods run with the app's full access; only enable mods you wrote | Off |
| **Per-mod switch** | Shown for each mod in the list under **Vault mods**, with its state (**Loaded**, **Error** with message and stack trace, or **Disabled**). Turning one off unloads only that mod and its `main.js` is no longer run | On for a new mod |

See [Vault Mods](28-mods.md) for writing mods.

## Settings File Location

Settings are saved to `.kokobrain/settings.json` inside your vault. You can:

- Back up this file to preserve your settings
- Copy it to another vault to replicate settings
- Edit it manually (be careful with JSON syntax)

### Editing settings.json safely

Quit Kokobrain before you edit `settings.json` by hand. The app keeps your settings in memory and rewrites the whole file from memory on the next settings change, so edits made while it is running are overwritten, and keys it does not know are dropped.

If the file is not valid JSON (or is not a JSON object) when the vault opens, Kokobrain copies it unchanged to `.kokobrain/settings.broken-<timestamp>.json` (the timestamp is local time, as `YYYYMMDD-HHmmss`), starts with the default settings and shows a notice naming the backup. To recover, quit the app, fix the backup and copy it back over `settings.json`. If the backup cannot be written, `settings.json` is left as it is and the app runs on the defaults for that session. If `settings.json` cannot be read at all, the app also runs on the defaults without changing the file. In both cases, any change to settings or to the panel layout (including resizing or toggling a panel) writes the defaults plus that change over the file.

## Next Steps

- [Keyboard Shortcuts](20-keyboard-shortcuts.md) -- Full shortcut reference
