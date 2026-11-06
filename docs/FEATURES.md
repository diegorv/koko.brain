# ✨ Features

Kokobrain's features, grouped by area. Each item links to the matching page of the [User Guide](../help/documentation/README.md) where one exists.

[← Back to the README](../README.md)

## ✏️ Editor

- **Markdown editor** with source mode and live preview, built on CodeMirror ([guide](../help/documentation/03-editor.md))
- **Wikilinks** (`[[note]]`) with autocomplete, block references and embeds ([guide](../help/documentation/05-wikilinks.md))
- **Meta-bind**: interactive inline inputs and action buttons that read and write frontmatter ([guide](../help/documentation/24-meta-bind.md))
- **Table of contents**: an outline panel generated from the document headings ([guide](../help/documentation/16-table-of-contents.md))
- **Templates**, **Quick Capture** (in-editor `Cmd+N`, a global composer popover, a clipboard shortcut) and **1:1 meeting notes** ([guide](../help/documentation/09-quick-notes-and-templates.md))

## 🔍 Search and discovery

- **Full-text search** powered by SQLite FTS5, with BM25 ranking and accent-insensitive matching ([guide](../help/documentation/06-search-and-navigation.md))
- **Semantic search** using a local BGE-M3 embedder, plus a hybrid mode that fuses the text and semantic rankings. Every model runs offline on your machine; nothing leaves it ([guide](../help/documentation/06-search-and-navigation.md))
- **Graph view**: an interactive force-directed map of note connections ([guide](../help/documentation/14-graph-view.md))
- **Backlinks**, **outgoing links** and **properties** panels in the right sidebar, plus a **Tags** view that opens as a tab ([guide](../help/documentation/07-sidebar-panels.md))

## 🧭 Rail

- **Icon rail and note list**: Search, Inbox (with a count badge), Today, Favorites, then the Types, Calendar and Files navigators, with Archive at the bottom; every item fills one note list ([guide](../help/documentation/01-getting-started.md#the-rail))
- **Note list tools**: every list has a Sort dropdown, an inline Search and a **Show in note list** picker for the property pills on each row; a view that is loading, missing or cannot be shown has none of them. Choices are saved in the view or type file, or in settings for the other lists ([guide](../help/documentation/01-getting-started.md#the-rail))
- **Views**: `.view` files are saved filters listed in the Types navigator, with groups, hidden views, a New / Edit view dialog with filters, and Move to Trash; a view that cannot run says why ([guide](../help/documentation/25-types-and-relationships.md#view-files-view))
- **Pins**: `_rail: true` (or **Pin to rail**) puts a view or a type on the rail ([guide](../help/documentation/25-types-and-relationships.md#pinned-rail-items))
- **Settings > Layout**: hide and reorder the rail items, turn the Inbox badge off ([guide](../help/documentation/19-settings.md#layout))
- **Keyboard**: `Cmd+1` / `Cmd+2` hide and show the panels, and the Command Palette has a **Go to** command per rail item and an **Open view** command per view ([guide](../help/documentation/20-keyboard-shortcuts.md))

## 📁 Organization

- **Note types**: declare `type: Project` in frontmatter and browse by type in the Types navigator ([guide](../help/documentation/25-types-and-relationships.md))
- **Relationships**: semantic `_belongs_to` / `_related_to` / `_has_many` fields with relationship backlinks ([guide](../help/documentation/25-types-and-relationships.md))
- **Lifecycle**: organize, archive and favorite notes from the note action bar, with an Inbox (optionally filled by every new note), an Archive and a macOS dock badge showing the inbox count ([guide](../help/documentation/25-types-and-relationships.md))
- **Auto-move**: route notes to folders automatically based on expression rules ([guide](../help/documentation/22-auto-move.md))
- **Custom file icons**: 11 icon packs plus emoji, with a color picker ([guide](../help/documentation/02-file-explorer.md))
- **Folder notes** ([guide](../help/documentation/02-file-explorer.md))
- **Trash** with restore ([guide](../help/documentation/18-trash.md))

## 📊 Views and tools

- **Canvas**: an infinite visual board with text, file, link and image nodes (JSON Canvas 1.0) ([guide](../help/documentation/11-canvas.md))
- **Collection**: table and calendar views of notes, queried by frontmatter properties, as `.view` files or inline blocks ([guide](../help/documentation/12-collection.md))
- **QueryJS**: a JavaScript API for programmatic vault queries ([guide](../help/documentation/13-queryjs.md))
- **Tasks**: an aggregated view with custom statuses and Todoist sync ([guide](../help/documentation/10-tasks-and-todoist.md))
- **Kanban**: drag-and-drop boards with lanes, cards, dates, colors and tags ([guide](../help/documentation/21-kanban.md))
- **Calendar**: day, week and month views of your Event notes; create, drag and resize events, each one a plain Markdown note ([guide](../help/documentation/27-calendar.md))
- **Periodic notes**: daily, weekly, monthly and quarterly notes with templates and a calendar ([guide](../help/documentation/08-periodic-notes-and-calendar.md))

## ⚙️ Power user

- **File history**: automatic snapshots with a diff viewer and restore ([guide](../help/documentation/15-file-history.md))
- **Deep links**: open notes and trigger actions from outside the app with `kokobrain://` URLs ([guide](../help/documentation/23-deep-links.md))
- **Themes**: two built-in themes plus a catalog you install and update from Settings > Appearance, published in [koko.brain-themes](https://github.com/diegorv/koko.brain-themes) ([guide](../help/documentation/26-theming.md))
- **Keyboard shortcuts**: the full shortcut reference ([guide](../help/documentation/20-keyboard-shortcuts.md))
- **Vault mods** (Labs, off by default): JavaScript mods in `_system/mods/` add rail buttons whose actions read and write notes, with a run view (progress, log, Stop) and reload on save ([guide](../help/documentation/28-mods.md))
