# Types, Relationships & Lifecycle

Kokobrain supports structured note types, semantic relationships between notes, and a lifecycle workflow for organizing your knowledge base.

These features are inspired by [Portent](https://portent.md), an open specification for knowledge bases created by [Luca Rossi](https://refactoring.fm) (the creator of [Tolaria](https://tolaria.app)). Portent provides conventions for organizing information around three ideas: **types** (what is this?), **relationships** (what is it connected to?), and **lifecycle** (is it captured, organized, or archived?).

Kokobrain implements the Portent model with some adaptations -- types are free-form (you can use any name, not only the eight Portent defaults), and the lifecycle is managed via frontmatter flags (`_organized`, `_archived`, `_favorite`) rather than a single status property.

> [!TIP]
> See [About Portent](#about-portent) at the end of this page for a full overview of the specification, the default type taxonomy, and links to the reference material.

---

## Note Types

Every note can declare a type via the `type` frontmatter field (stored canonically as `_type`). Types are free-form strings -- you can use any name you want.

```yaml
---
type: Project
---
```

You can use any type name (e.g. `Recipe`, `Book`, `Meeting`) and it appears in the Types navigator with the default styling. A type name is written with its first letter uppercased: `type: person` and `type: Person` are the same type, `Person`.

### Type Definitions

To customize how a type appears in the Types navigator, create a **Type Definition note** -- a note whose type is `Type`:

```yaml
---
type: Type
_icon: rocket
_color: red
_order: 1
_sidebar_label: Projects
_visible: true
_template: _system/templates/Project.md
_list_properties_display:
  - status
  - priority
---
```

The note's title becomes the type name (e.g., a note titled "Project" with `type: Type` defines the "Project" type).

### Type Definition Fields

This table is the reference for every key a type definition reads. A value of the wrong kind (for example `_order: "1"` or `_visible: "false"`) is ignored and the default applies; for `_order`, `_sort`, `_open_in_editor`, `_group`, `_visible` and `_rail` the type's row in the Types navigator also shows a mark whose tooltip names the key (`_sort` is checked against the `.view` sort values even though it has no effect here). `_color` and `_title_color` apply only together with `_icon`.

| Field | Value | Default | Effect |
|-------|-------|---------|--------|
| `_icon` | Lucide icon name (`rocket`) or `pack:name` | none (the default icon) | Icon of the type's row, of its pin, and of every note of the type that has no icon of its own (note list, editor tabs) |
| `_color` | Palette name (`red`, `blue`, ...) or a CSS color | none | Color of that icon |
| `_title_color` | CSS color | none | Text color of the type's row and of the titles of its notes |
| `_order` | Number | `50`; with no definition or no `_order`, `Project` is 1, `Person` 2, `Event` 3, `Topic` 4, `Task` 5 and `Note` 99 | Position of the type's row in the Types navigator (lower first), and of its pin among the pins |
| `_sidebar_label` | Text | the name plus `s` (`Projects`) | Label of the type's row, of its pin and of its note list header |
| `_visible` | `true` or `false` | `true` | `false` hides the type's row. Its notes are then listed under no row, Untyped included |
| `_template` | Vault-relative path of a template file | none | Content of new notes of the type (see [Creating Notes from Types](#creating-notes-from-types)) |
| `_folder` | Vault-relative folder | none (vault root) | Folder new notes of the type are created in (see [Creating Notes from Types](#creating-notes-from-types)) |
| `_list_properties_display` | List of property names | none | Properties shown as pills on the rows of the type's notes, in every note list but a view's, unless the list saved its own selection |
| `_list_sort` | `<option>:<direction>`: `modified:desc`, `title:asc`, `property:budget:asc` | none | Order of the type's note list, saved by its Sort dropdown. Options: `modified`, `created`, `title`, `status`, `property:<key>`; directions `asc` and `desc`. A value that does not read back is ignored and the list keeps its own order, with no mark in the Types navigator |
| `_archive_to` | Destination template (e.g. `{folder}/_archive`) | none | Where an archived note of the type is moved. Needs **Auto Move** on (see [Auto Move](22-auto-move.md#type-driven-lifecycle-rules)) |
| `_hub` | `true` or `false` | `false` | `true` makes the type's notes hubs: the [note action bar](03-editor.md#note-action-bar) offers **New linked note**, which creates a note in the hub's folder with `_belongs_to` linking the hub |
| `_rail` | `true` | none | Pins the type to the rail (see [Pinned Rail Items](#pinned-rail-items)) |
| `_sort` | -- | -- | Not applied: a type's list sorts by its `_list_sort` when one is saved, else by most recently modified (see [Sort Mode](#sort-mode)) |
| `_view` | -- | -- | Not applied: no part of the app reads it |

Built-in names (`Project`, `Person`, `Event`, `Topic`, `Task`, `Note`) only get the default `_order` above; their icon and color come from a definition note like any other type.

---

## Creating Notes from Types

Pick a type in the Types navigator and click the **+** (New here) button in the note list header, or right-click the type and select **New [TypeName]**. The new file is named "Untitled [TypeName].md" (auto-deduplicated if it already exists) and opens in the editor.

### Where the note is created

The note's folder is built from two optional parts:

```
<vault> / <typed notes folder> / <type folder> / Untitled [TypeName].md
```

- **Typed notes folder** is the global setting in **Settings → Types → Typed notes folder** (`typesBaseFolder`). It is prepended to every typed note.
- **Type folder** is the `_folder` field on the type definition.

Each part is optional; missing parts are skipped. With both empty the note is created at the vault root. Missing folders are created automatically.

| Typed notes folder | Type `_folder` | New note path |
|-------------|----------------|---------------|
| (empty) | (empty) | `<vault>/Untitled Project.md` |
| (empty) | `Projects` | `<vault>/Projects/Untitled Project.md` |
| `Notes` | (empty) | `<vault>/Notes/Untitled Project.md` |
| `Notes` | `Projects` | `<vault>/Notes/Projects/Untitled Project.md` |

If the type definition has a `_template` field, the template file is read and its content (including `<% %>` expressions) is used as the initial content. If no template is set, the note starts with minimal frontmatter:

```yaml
---
type: Project
---
```

### Template example

In the type definition:

```yaml
---
type: Type
_template: _system/templates/ProjectTemplate.md
---
```

The template file (`_system/templates/ProjectTemplate.md`) is a regular markdown file that can use template expressions like `<% tp.file.title %>`, `<% created %>`, etc.

---

## The Types Navigator

Click **Types** in the rail (the layers icon). The Types navigator opens beside the note list.

The navigator lists:

- **Views**: your `.view` files, each with the number of notes it lists (a mark replaces the count of a view that cannot be shown, see [When a View Cannot Be Shown](#when-a-view-cannot-be-shown)). Views with a `_group` are listed under a subheading with that group name, after the views without one; a view with `_visible: false` is left out (see [View Metadata Fields](#view-metadata-fields)). The **+** button next to the label creates a new view (see [View Files](#view-files-view)).
- **Types**: every type, with its note count. A type comes from its definition note or from the notes that name it.
- **Untyped**: notes without a type, when **Settings → Types → Show untyped notes** is on.

Click a row to fill the note list with its notes. A type lists its notes that are not archived; the line under the list header says so (`type is Project, not archived`). Click a note to open it in the editor. Kokobrain remembers the row you picked and opens on it after a restart; if the type or view is gone, the rail opens on **Today** instead. A picked view that you hide with `_visible: false` stays picked. Renaming or moving the picked view keeps it picked. Moving it to the Trash clears the pick, and the navigator shows its first row.

**New type** in the navigator header creates a type definition and picks it.

### The Other Rail Items

The rest of the rail lists notes by their lifecycle, whatever their type:

| Rail item | Lists | New here creates |
|-----------|-------|------------------|
| Inbox | Notes with `_organized: false`, not archived. The badge counts them (Settings > Layout can turn the rail badge off). | A note with `_organized: false` |
| Today | The notes dated today (archived ones included) | A note with today's `date` |
| Favorites | Favorite notes, not archived | A note with `_favorite: true` |
| Archive (bottom of the rail) | Archived notes | Nothing |

A note's date is its frontmatter `date`, else `created`, else the day the file was created. None of these lists shows type definitions, `.view` files or the notes in the system folder (Settings > Files & Folders > System folder), except that a favorited type definition stays in Favorites. Each list puts the most recently modified note first.

New here creates these notes in the folder `Cmd+N` uses: **Settings > Periodic Notes > Notes folder**, then the **Settings > Quick Capture > Folder format** subfolder. The [note action bar](03-editor.md#note-action-bar) above every note favorites, organizes, archives and restores it, and the lists follow.

### Pinned Rail Items

A view or a type you use often can sit on the rail itself. Right-click it in the Types navigator and choose **Pin to rail**, or write `_rail: true` in the `.view` file or the type definition yourself. Pinned items are listed in their own group under Types, Calendar and Files, after a divider, above Archive. They go by `_order` (a view's default is 50, a type's is its definition's `_order`), then by name. Each one shows the icon and name of its row in the Types navigator; hover it for the name.

Click a pinned view or type to fill the note list with it, as its row in the navigator does; no navigator opens. A pinned view with `_open_in_editor: true` opens in the editor instead. Kokobrain remembers the pinned item you picked and opens on it after a restart; if it is gone or no longer pinned, the rail opens on **Today**. Renaming or moving the pinned view you are on keeps you on it; moving it to the Trash sends the rail to **Today** at once.

Only the boolean `true` pins: `_rail: "true"` does nothing and is marked on the row. A pin does not depend on `_visible`: a view or type hidden from the navigator stays on the rail, and you unpin it by removing `_rail` from the file. With many pins, the pinned group scrolls and the rest of the rail stays in place. Pinning or unpinning a `.view` rewrites its file, so comments in it are not kept.

### Types Navigator Context Menu

**A type with a definition note:**

- **New [TypeName]**: creates a note of that type
- **Rename**: renames the type in its definition and in every note of the type
- **Open type definition**: opens the type's definition note in the editor
- **Copy path**: a submenu with **Copy absolute path** and **Copy relative path** (relative to the vault root)
- **Change icon**: opens the icon picker for the type
- **Pin to rail** / **Unpin from rail**: adds or removes `_rail: true` in the type definition (see [Pinned Rail Items](#pinned-rail-items))
- **Reveal in Finder**: shows the definition file in the system file explorer

**A type with no definition note yet:**

- **New [TypeName]**: creates a note of that type
- **Create type definition**: creates a definition note titled after the type with the frontmatter `_type: Type` and `_visible: true`, then opens it in the editor

**A view:**

- **Open view**: opens the `.view` file in the editor
- **Edit view**: opens the view dialog titled **Edit view**, filled with the view's label and filters (the own filters of the view the note list runs, the first one or the one `_rail_view` names, under "This view", and its top-level filters under "All views" when it has any). **Save** writes the new name as `_sidebar_label`, as that view's name and, when `_rail_view` named it, as `_rail_view`, and the filters in their two places; the `.view` file name and every other key stay as they are, so open tabs and a picked view keep working. Comments in the file are not kept. When `_rail_view` names the view, a name another view in the same file already carries is refused (`Another view in this file is named "..."`), so a save never moves the note list to a different view. If the file cannot be read or parsed, the dialog shows the reason and **Save** stays disabled; if the save fails, the dialog stays open with the reason
- **Copy path**: a submenu with **Copy absolute path** and **Copy relative path**
- **Change icon**: opens the icon picker for the view
- **Pin to rail** / **Unpin from rail**: adds or removes `_rail: true` in the `.view` file (see [Pinned Rail Items](#pinned-rail-items)). Comments in the file are not kept
- **Reveal in Finder**: shows the `.view` file in the system file explorer
- **Move to Trash**: asks `Move "<name>.view" to trash?`, then moves the `.view` file to the Trash, like **Delete this note** in the note action bar. Its open tabs close. If the move fails, a message says why

### Note Order

A type's note list (including Untyped) sorts by most recently modified first, so the note you just edited jumps to the top, unless its Sort dropdown has a saved sort (see [Getting Started > The Rail](01-getting-started.md#the-rail)). You can pin notes above that order by adding `_order` (or `order`) to a note's frontmatter:

```yaml
---
type: Project
_order: 1
---
```

Notes with `_order` appear first (lower = higher), sorted among themselves by order value. Notes without `_order` follow, sorted by most recently modified. A saved sort replaces this order, pins included. Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted.

> [!TIP]
> `_order` also controls sort position in the [file explorer](02-file-explorer.md#custom-ordering-with-_order). A note with `_order: 1` appears first in both a type's list and its folder.

### Sort Mode

A type's list sorts by most recently modified first (with `_order` pins on top) unless its Sort dropdown saved a `_list_sort`, which replaces that order; a type definition's `_sort` does not change it. A `.view` file's `_sort`, which orders a view with no Sort set, takes these values:

| Value | Behavior |
|-------|----------|
| `title` | Alphabetical by title |
| `modified` | Newest modified first |
| `created` | Newest created first |
| `modified-asc` | Oldest modified first |
| `created-asc` | Oldest created first |

---

## Relationships

Notes can declare semantic relationships to other notes using frontmatter fields with wikilink values.

### Built-in relationship fields

```yaml
---
_belongs_to: "[[Parent Project]]"
_related_to:
  - "[[Topic A]]"
  - "[[Topic B]]"
---
```

- **`_belongs_to`** -- hierarchical ownership (this note belongs to another)
- **`_related_to`** -- non-hierarchical association
- **`_has_many`** -- inverse ownership (this note owns/contains others)

All three fields accept a single wikilink or a list of wikilinks.

### Custom relationship fields

Any frontmatter field whose value contains wikilinks is treated as a relationship. For example:

```yaml
---
manager: "[[Alice Smith]]"
client: "[[Acme Corp]]"
---
```

### Relationship Backlinks

The Backlinks panel (right sidebar) includes a **Relationships** section that shows notes referencing the current note through relationship fields. Each entry displays the source note and the relationship label, with the leading underscore rendered as a space (e.g., "belongs to", "has many", or a custom field name like "manager").

---

## Lifecycle

Notes have three lifecycle states controlled by frontmatter flags:

| State | Flags | Meaning |
|-------|-------|---------|
| Organized | absent or `_organized: true` | Default state for all notes |
| Inbox | `_organized: false` | Explicitly marked as not yet triaged |
| Archived | `_archived: true` | No longer active, hidden from default views |

> [!NOTE]
> Notes without `_organized` in their frontmatter are treated as organized by default. The Inbox holds the notes with `_organized: false`, which new notes get while [Explicit Organization](#explicit-organization-mode) is on.

### Auto-Archive via Type Definitions

If a type definition includes `_archive_to`, Kokobrain automatically moves notes to the specified destination when archived, and moves them back when unarchived. No manual auto-move rules needed, but **Auto Move must be on** (Settings > Auto Move > Enable Auto Move, off by default): with it off, `_archive_to` moves nothing.

```yaml
---
type: Type
_archive_to: "{folder}/_archive"
---
```

With this configuration, archiving a Project in `work/squad-payments/` moves it to `work/squad-payments/_archive/`. Unarchiving moves it back. See [Auto Move — Type-Driven Lifecycle Rules](22-auto-move.md#type-driven-lifecycle-rules) for details.

### Lifecycle Actions

The [note action bar](03-editor.md#note-action-bar) above every Markdown note holds the lifecycle actions:

- **Favorite** (star, `Cmd+D`) -- toggles the favorite flag
- **Organized** (check circle, `Cmd+E`) -- marks the note organized, or sends it back to the inbox (an archived note stays archived)
- **More > Archive this note** -- hides the note from default views
- **More > Restore this archived note** -- restores an archived note

### Explicit Organization Mode

**Explicit organization** in **Settings → Types** is on by default. It runs the inbox workflow: new notes start with `_organized: false`, so they are unorganized and the rail's **Inbox** item lists them, with a badge count. Existing notes are unchanged: a note with no `_organized` key still reads as organized. A vault that saved the switch as off keeps it off.

The switch marks notes created by:

- **Cmd+N** and Quick Capture (the composer, the clipboard shortcut and `kokobrain://capture`)
- **+ New here** in the note list, and **New \<Type\>** in the Types navigator
- Clicking a link to a note that does not exist yet, and a meta-bind `createNote` button
- **New note** in the Files navigator's folder menu, the palette's **New File**, and **Create** in the Quick Switcher
- **New File from Template**, **New 1:1**, **New linked note** and a new event in the Calendar
- `kokobrain://new` when it creates the note (not with `overwrite=true`)

Periodic notes (daily, weekly, monthly, quarterly, yearly) are not marked. A template that already sets `_organized` keeps its value.

The **Inbox** item in the rail lists any note marked `_organized: false`, with or without the switch, unless you hide it in **Settings → Layout**. Turning the switch off stops marking new notes; notes already marked stay in the Inbox until you organize them.

### Types Navigator Settings

**Settings → Types** (the page is titled Types & Lifecycle) has a **Types navigator** group with one toggle:

- **Show untyped notes** -- shows notes without a type in an "Untyped" row at the bottom of the Types navigator. The row is there while the switch is on, with a count of 0 when every note has a type.

### Archived Note Filtering

Archived notes are automatically excluded from:

- A type's list, a view's list, Inbox and Favorites in the rail
- A view's count in the Types navigator and its "N results" in the collection editor

Archived notes remain accessible through the rail's **Archive** item. Today (notes dated today), the Calendar's Day list and a folder's list in the Files navigator still show them. They still appear in the Quick Switcher, but are shown dimmed with an archive icon rather than excluded.

---

## Frontmatter Key Aliases

Kokobrain recognizes alternative spellings for system metadata keys:

| Alias | Canonical form | Used in |
|-------|---------------|---------|
| `type` | `_type` | Types navigator grouping, collection filters, inbox workflow |
| `organized` | `_organized` | The rail's Inbox item, Organized button in the note action bar |
| `archived` | `_archived` | The rail's Archive item, hidden from a type's list, Inbox and Favorites, dimmed in Quick Switcher |
| `favorite` | `_favorite` | The rail's Favorites item, star button in the note action bar |
| `order` | `_order` | Sort order of types in the Types navigator, and pins on top of a type's list |
| `favorite_index` | `_favorite_index` | No effect in the rail: Favorites lists the most recently modified first |
| `sort` | `_sort` | Order of a `.view` with no Sort set; no effect in a type definition (see [Sort Mode](#sort-mode)) |
| `icon` | `_icon` | Custom icon in the Types navigator, Files navigator, and editor tabs |
| `sidebar_label`, `sidebar label` | `_sidebar_label` | Row label in the Types navigator and on a pin |
| `color` | `_color` | Icon color in the Types navigator, Files navigator, and editor tabs |
| `title_color` | `_title_color` | Title text color in the Types navigator, Files navigator, and editor tabs |
| `template` | `_template` | Template file for new notes of the type |
| `view` | `_view` | No effect: a type definition's `_view` is not applied |
| `visible` | `_visible` | `false` hides a type's row in the Types navigator; in a `.view`, `false` hides the view from Views |
| `list_properties_display` | `_list_properties_display` | Properties shown on note list rows |

You can use either form in your frontmatter. The app normalizes them internally. The type-folder field `_folder` and the auto-move destination field `_archive_to` have no short alias -- write them with the leading underscore.

> [!IMPORTANT]
> The `type` alias for the canonical `_type` is recognised both on the frontmatter side AND as an identifier in filter expressions (`.collection` / `.view` / inline `collection` blocks). The remaining aliases (`icon`, `color`, `sort`, `template`, etc.) are recognised only on the frontmatter side -- in filters, use the canonical name. The three lifecycle flags are a separate case: `organized` / `archived` / `favorite` are always-present normalised booleans in filter expressions, not aliases of `_organized` / `_archived` / `_favorite`, and `organized` defaults to `true`. See [Collection > Filter Gotchas](12-collection.md#archived-and-_archived-are-different-fields-not-aliases). The `type` / `_type` identifier also compares case-insensitively for `==` / `!=`, so `type == "person"` and `type == "Person"` both match a note with `type: person`. The legacy `is_a` / `is a` spellings are no longer recognised. See [Collection > Filter Gotchas](12-collection.md#filter-gotchas) for details.

---

## View Files (.view)

View files are saved collection-style query definitions that appear under **Views** in the Types navigator. They let you create custom filtered lists of notes that live alongside your type sections.

Use a `.view` for an entry in the menu: Views lists every `.view`, and only `.view` files. A `.collection` shares the format but is an editor-only file, for tables and calendars you open in the editor or embed in a note (see [Collection](12-collection.md)); Views never lists it.

### Creating a View

The fastest way is to click the **+** button next to the **Views** label in the Types navigator. A **New view** dialog asks for a name: type it and press **Create** or Enter. Kokobrain creates `<name>.view` at the vault root, with that name as its sidebar label and as its table view's name, and picks it. A name another view already shows is refused. If the file name is taken, the file becomes `<name> 1.view` and keeps the label you typed. **Cancel** or Escape closes the dialog without writing anything. If the file cannot be created, the dialog stays open with the reason.

Under the name, the dialog has a filter section with the same rows as the note list's Filter panel: **Add filter** adds a row, each row picks a field (the `file.*` fields and every note property), an operator and a value, and the group menu combines the rows with "All the following are true", "Any of the following are true" or "None of the following are true". It starts with no rows; a view with no filters lists every note. **Create** stays disabled while a row whose operator takes a value has none (operators such as **is empty** or **is true** need no value). The dialog stores its filters under the first view (`views[0].filters`), so the note list's Filter panel shows them under "This view"; the hand-written examples on this page use a top-level `filters:` instead, which the panel shows under "All views". You can change the filters later from the note list's Filter panel (see [Inline Filter and Sort Toolbar](#inline-filter-and-sort-toolbar)).

```yaml
_sidebar_label: Projects
_sort: title
views:
  - type: table
    name: Projects
    filters: _type == 'Project'
```

You can also create a view from a folder: right-click a folder in the **Files** navigator (or the vault row at the top) and choose **New view**. The same dialog opens, with the same name check, and creates `<name>.view` in that folder (`<name> 1.view` when the folder already holds the name). The rail then switches to the Types navigator with the new view picked.

To turn a `.collection` into a menu entry, right-click its row in the note list of the Files navigator and choose **Convert to view**. The file is renamed to `.view` with the same content, and an open tab follows it. If a `.view` of that name already exists in the folder, nothing is renamed and a message says so. A wikilink that names the `.collection` file keeps the old name.

You can also create the file by hand. A `.view` is a single YAML document: the menu keys live at the top level, alongside a `views:` array and a `filters:` expression.

```yaml
_sidebar_label: Active Projects
_order: 5
_sort: modified
_icon: rocket
_color: blue
_title_color: "#3498db"
_list_properties_display:
  - status
  - priority
views:
  - type: table
    name: Active Projects
filters: 'type == "Project" && status == "active"'
```

The `filters` value is a filter expression using the same [Collection expression language](12-collection.md). A `.view` shares the `.collection` file format, so any view configuration valid in a `.collection` file works here too.

### View Metadata Fields

This is the reference for every key a `.view` file reads. The keys sit at the top level of the `.view` YAML document (not inside a `---` frontmatter block). A `.collection` file reads the same `filters`, `formulas`, `properties`, `views` and per-view keys, and none of the underscore keys.

**Menu keys (top level).** A value of the wrong kind is ignored and the default applies; for `_order`, `_sort`, `_open_in_editor`, `_group`, `_visible`, `_rail` and `_rail_view` the view's row in Views also shows a mark whose tooltip names the key. `_color` and `_title_color` apply only together with `_icon`. Writing a key from the app (Pin to rail, Change icon, Edit view, the Sort and Filter panels) rewrites the file, so comments in it are not kept.

| Field | Value | Default | Effect |
|-------|-------|---------|--------|
| `_sidebar_label` | Text | the file name without `.view` | Label of the view's row in Views, of its pin, of the note list header and of its **Open view** command |
| `_order` | Number | `50` | Position in Views inside the view's group (lower first; the same `_order` goes by label, in natural order), and among the pins |
| `_sort` | `modified`, `created`, `modified-asc`, `created-asc` or `title` (see [Sort Mode](#sort-mode)) | `modified` | Order of the list when the view it runs has no `sort` |
| `_open_in_editor` | `true` or `false` | `false` | `true`: a click on the view (its row, its pin, its **Open view** command) opens the `.view` in the editor instead of the note list |
| `_list_properties_display` | List of property names | none | Properties shown as pills on the rows of the view's list |
| `_icon` | Lucide icon name or `pack:name` | none (a table icon) | Icon of the view's row and of its pin |
| `_color` | Palette name or a CSS color | none | Color of that icon |
| `_title_color` | CSS color | none | Text color of the view's row |
| `_group` | Text | none | Subheading the view is listed under in Views. Views without one come first; groups follow in name order (`Week 2` before `Week 10`), and names are case-sensitive |
| `_visible` | `true` or `false` | `true` | `false`: Views does not list the view. The palette has no **Open view** command for it either. It stays a file: the Files navigator lists it, the Quick Switcher finds it by file name, a pin keeps it on the rail, and its name stays taken in the **New view** and **Edit view** dialogs |
| `_rail` | `true` | none | Pins the view to the rail (see [Pinned Rail Items](#pinned-rail-items)) |
| `_rail_view` | The `name` of one of its views | the first view | The view the note list runs, counts, edits with Sort and Filter and that **Edit view** edits (see [Multiple Views in a .view File](#multiple-views-in-a-view-file)). The name must match exactly, case included; with two views of that name the first one runs. A name no view carries runs the first view |

**Query keys (top level).**

| Field | Value | Default | Effect |
|-------|-------|---------|--------|
| `filters` | A filter expression, or an `and` / `or` / `not` object of them ([Collection](12-collection.md#filter-expressions)) | none (every note) | Applies to every view of the file, together with each view's own `filters` |
| `formulas` | Map of name to expression | none | Computed columns (`formula.<name>`) of the collection editor |
| `properties` | Map of column to `displayName` | none | Column headers of the collection editor |
| `views` | List of views (below) | required, at least one | The views of the file: the editor shows one tab per view, the note list runs one |

**Per-view keys (each entry of `views`).** A wrong value here makes the file fail to parse, and the note list shows why (see [When a View Cannot Be Shown](#when-a-view-cannot-be-shown)).

| Field | Value | Default | Effect |
|-------|-------|---------|--------|
| `type` | `table`, `calendar` or `linear-calendar` | required | Layout in the collection editor. The note list shows a list whatever the type |
| `name` | Text | required | Tab label in the editor; what `_rail_view` names |
| `filters` | Like the top-level `filters` | none | Applies to this view only, together with the top-level `filters` |
| `order` | List of columns (`file.name`, a property, `formula.<name>`) | the columns the matching notes have | Columns of the editor's table, in order. The note list does not read it |
| `sort` | List of `column` + `direction` (`ASC` or `DESC`); `property` is accepted for `column` | none | Order of the rows. In a `.view` it wins over `_sort`, and `_order` pins do not apply |
| `limit` | Positive number | none | Maximum number of rows. In a `.view`, taken last: after archived, system-folder, type-definition and `.view` entries are left out and the rows are ordered. In a `.collection` or an inline block, taken after `sort` (in index order with no `sort`) |
| `dateProperty` | Property name | none (required by the calendar types) | Start date of each note in `calendar` and `linear-calendar` views |
| `endDateProperty` | Property name | none | End date of multi-day notes in calendar views |
| `weekStartDay` | `0` (Sunday) to `6` (Saturday) | `1` (Monday) | First day of the week in `calendar` views |
| `colorProperty` | Property name | none | Property whose value picks the bar color in `linear-calendar` views; `calendar` views do not read it |
| `columnSize`, `groupBy`, `summaries` | -- | -- | Accepted (`columnSize` must be a map) and not used |

Click a view in the Types navigator to see its matching notes in the note list. The list leaves out archived notes, notes in the system folder, type definitions and `.view` files; with no Sort set it orders them by `_sort` (or the default), with `_order` pins on top; `limit` applies last. The collection editor lists a `.view` the same way, so its "N results" equals the view's count in the navigator. A view with `_open_in_editor: true` opens in the editor instead, as the full table or collection, and the note list keeps what it showed; its row stays highlighted while that view is the active tab. Only the boolean `true` turns this on, and you write the key by hand in the YAML. **New here** creates a note of the view's type when its filter picks one type, else a plain note.

### When a View Cannot Be Shown

When a picked view has no list to show, the note list says why instead of an empty list:

- **Loading...** while the vault index is still being built, or while the `.view` file is being read for the first time.
- **This view no longer exists** when the `.view` file is no longer in the vault (for example, moved or deleted outside Kokobrain).
- **This view cannot be shown**, with the reason, when the file cannot be read, its YAML does not parse, a view entry is wrong (no `name`, a missing or unknown `type`, a `sort` without `direction`) or a filter does not parse (a typo such as `status = 'active'`). The **Open view** button under it opens the `.view` in the editor so you can fix it.

Sort, Filter and **New here** are hidden in these three states. **No notes here** means the view ran and no note matches.

In Views, the count of a view whose YAML or filter does not parse is replaced by a red mark; hover it for the reason. A grey mark next to the count lists the keys set to a value that is ignored (see [View Metadata Fields](#view-metadata-fields)). Counts appear once each view has run, so they can show up a moment after the rows.

### Inline Filter and Sort Toolbar

When a `.view` is picked, the note list header shows a Sort dropdown and a Filter button, next to the Search and **Show in note list** buttons described in [The Rail](01-getting-started.md#the-rail):

- **Sort**: the dropdown lists the single-column orders from the rail menu. Picking another row, or an arrow on any row, replaces a multi-column sort with that column; clicking the active row changes nothing. **Multiple sort...** in the menu opens the same multi-column sort panel that the Collection toolbar uses. The list follows this sort exactly. It is saved as the `sort:` of the view the list runs (the first view, or the one `_rail_view` names) in the `.view` file and wins over `_sort`, which only orders a view with no sort set. With no sort set, the panel names the sort that orders the list, for example "Sorted by _sort: title", here and in the collection editor's Sort panel for a `.view`.
- **Filter** (funnel) opens the same filter panel, split into "All views" (the view's global filters) and "This view" (the active view's filters). Each row picks a property, an operator, and a value. Rows can be combined with **AND**, **OR**, or **NOT** at the group level.

Both panels mirror the [Collection toolbar](12-collection.md#toolbar) — the same property dropdown, operator inference, and conjunction rules. The Filter button and the Sort dropdown highlight in the accent color whenever a filter row or a sort is active.

Every change is written back into the `.view` file immediately, so edits persist across selections, app restarts, and devices. Editing a `.view` in an editor tab or an external editor while it is picked shows in the list and the panels when the vault index next updates, usually within a few seconds.

### Multiple Views in a .view File

A `.view` can declare more than one entry under `views:`, but the note list renders one of them: the first one, and its rule line then ends with "first view". To pick another, set `_rail_view` to that view's `name`:

```yaml
_sidebar_label: Projects
_rail_view: Board
views:
  - type: table
    name: All
  - type: table
    name: Board
    filters: status == 'active'
```

The note list, the view's count in the navigator, the Sort and Filter panels and **Edit view** then use `Board`, and the rule line ends with `view "Board"`. When **Edit view** renames that view, it rewrites `_rail_view` to the new name. Only the rail reads `_rail_view`: the collection editor still opens on its own tab, so its "N results" can differ from the navigator count when `_rail_view` names another view, and renaming a view tab in the editor does not update `_rail_view` (the row's mark then reports the stale name). The note list cannot draw calendar or linear-calendar layouts: the view it runs is shown as a list of its notes whatever its `type`, and the other views are not shown there. To browse every view with the proper renderer per type, open the `.view` file from the file explorer — the collection editor exposes a tab strip and switches between table, calendar, and linear-calendar views (see [Collection — Multiple Views](12-collection.md#multiple-views)).

---

## Collection Filters

The Collection feature supports filtering by Portent fields:

- Filter by `type` to show only notes of a specific type
- Filter by `_belongs_to`, `_related_to`, or `_has_many` relationships
- Filter by lifecycle state (`organized`, `archived`, `favorite`)

See [Collection](12-collection.md) for details on building filtered views.

---

## About Portent

[Portent](https://portent.md) is an open specification for work and personal knowledge bases, created by [Luca Rossi](https://refactoring.fm) alongside [Tolaria](https://tolaria.app). It favors convention over configuration: instead of asking "where should this go?", it asks *what is this?*, *what is it useful for?*, and *is it captured, organized, or archived?*

### The Eight Default Types

Portent defines eight types organized into two groups:

**PORT** (actionable -- things to do):

| Type | Description |
|------|-------------|
| **Project** | Time-bound effort with a beginning, end, and success criteria |
| **Operation** | Recurring work completable in one sitting (procedures, reviews, checklists) |
| **Responsibility** | Long-running area of accountability with metrics or KPIs |
| **Task** | One-off work completable in one sitting |

**ENTP** (non-actionable -- knowledge records):

| Type | Description |
|------|-------------|
| **Event** | Things that happened (meetings, decisions, incidents) |
| **Note** | Durable knowledge artifacts (documents, references, research) |
| **Topic** | Areas of interest or conceptual categories |
| **Person** | People, collaborators, contacts, or AI agents as actors |

The name "Portent" is an acronym of the first seven types (PORT + ENT), plus People.

Kokobrain suggests Project, Person, Event, Topic, Task, and Note as built-in type hints with default icons and colors, but you can use any type name freely -- including the full Portent set or your own custom types.

### Relationships as a Graph

Portent models knowledge as a graph with two default relationships:

- **`_belongs_to`** -- strong ownership/composition (e.g., an Operation belongs to a Responsibility, a meeting belongs to a Project)
- **`_related_to`** -- loose many-to-many association (e.g., a Note is related to a Topic, an Event is related to a Person)

The mental model: use `_belongs_to` for relationships towards or between PORT items, and `_related_to` for connections between ENTP items. This is simpler than relational schemas (where every table pair needs explicit joins) and more expressive than folders (where each item can only live in one place).

Kokobrain adds a third built-in relationship, **`_has_many`**, for the inverse-ownership direction (a note that owns or contains others). It is also a first-class relationship field with its own "Has Many" row in the Properties panel and its own backlink type.

### Capture, Organize, Archive

Portent separates capture from organization through a three-step lifecycle:

1. **Capture** -- save information quickly so it is not lost. Captured notes are messy and that is fine.
2. **Organize** -- assign a type and relationships. Ask: *what is this?* and *what should I do with it?*
3. **Archive** -- hide from active views when the information has served its purpose but should be retained.

In Kokobrain, this maps to the `_organized` and `_archived` frontmatter flags, plus the Inbox and Archive items in the rail.

### Using Portent in Kokobrain

#### Step 1: Create your type definitions

Create a `_types` folder in your vault (or any folder you prefer). For each type you want, create a note with `type: Type` in the frontmatter. The note title becomes the type name.

**Minimal setup** -- start with just 3-4 types and expand later:

```yaml
# _types/Project.md
---
type: Type
_icon: rocket
_color: red
_sidebar_label: Projects
_order: 1
---
Projects are time-bound efforts with clear goals and deliverables.
```

```yaml
# _types/Topic.md
---
type: Type
_icon: tag
_color: green
_sidebar_label: Topics
_order: 3
---
Topics are areas of interest or knowledge domains.
```

```yaml
# _types/Person.md
---
type: Type
_icon: users
_color: blue
_sidebar_label: People
_order: 2
---
People you work with or reference in your notes.
```

You can also use the full Portent set of eight types (Project, Operation, Responsibility, Task, Event, Note, Topic, Person) or invent your own (Recipe, Book, Place -- anything).

> [!TIP]
> Click **Types** in the rail to see your types listed in the Types navigator.

#### Step 2: Assign types to your notes

Add `type: Project` (or whatever type fits) to a note's frontmatter. The note shows up under that type's row in the Types navigator.

```yaml
---
type: Project
status: active
manager: "[[alice]]"
---
# Website Redesign
```

Don't overthink this. If a note doesn't fit any type, leave it untyped -- it still works like a regular note.

#### Step 3: Connect notes with relationships

Use `_belongs_to` for ownership (this note *belongs to* that project) and `_related_to` for loose associations:

```yaml
---
type: Event
_belongs_to: "[[Website Redesign]]"
_related_to:
  - "[[design-systems]]"
  - "[[accessibility]]"
attendees:
  - "[[alice]]"
  - "[[bob]]"
---
# Kickoff Meeting
```

Any frontmatter field with wikilink values creates a relationship automatically. Open the Backlinks panel on "Website Redesign" and you will see this meeting listed under Relationships.

> [!TIP]
> Add `date: 2026-03-02` (plus `start: "14:00"` and `end: "15:00"` for a timed meeting) and this Event note shows on the [Calendar tab](27-calendar.md). Without a `date`, it is listed there under **Unscheduled**. See [Using existing Event notes](27-calendar.md#using-existing-event-notes).

**When to use which:**

| Relationship | Use for | Example |
|-------------|---------|---------|
| `_belongs_to` | Strong ownership, composition, hierarchy | Meeting belongs to Project, Task belongs to Responsibility |
| `_related_to` | Loose association, cross-references | Note related to Topic, Event related to Person |
| Custom fields | Domain-specific connections | `manager: "[[alice]]"`, `client: "[[acme]]"` |

#### Step 4: Use the lifecycle

**Daily capture:** Create notes fast, don't worry about organization. While Explicit organization is on (Settings > Types, on by default), new notes start in the Inbox automatically. Periodic notes are not marked.

**Weekly organize:** Click **Inbox** in the rail. For each note, ask:

1. *What is this?* -- assign a type
2. *What is it connected to?* -- add `_belongs_to` or `_related_to`
3. Click **Organized** in the note action bar (or press `Cmd+E`) to move it out of the inbox

**Archive when done:** Finished a project? Choose **More > Archive this note** in the note action bar. The note hides from default views but stays searchable, and the rail's **Archive** item lists it.

```
Capture (fast, messy)  -->  Organize (type + relationships)  -->  Archive (done, hidden)
```

#### Step 5: Create views for filtered lists

For recurring queries, create `.view` files instead of searching every time:

```yaml
# active-projects.view
_sidebar_label: Active Projects
_icon: rocket
_color: green
_order: 10
views:
  - type: table
    name: Active Projects
filters: 'type == "Project" && status == "active"'
```

```yaml
# this-week-meetings.view
_sidebar_label: This Week
_icon: calendar
_order: 11
views:
  - type: table
    name: This Week
filters: 'type == "Meeting" && file.ctime > today() - duration("7d")'
```

Views appear in the Types navigator, above the types. See [Collection](12-collection.md) for the full expression language.

### Reference Material

- Portent website: [portent.md](https://portent.md)
- Vault template: [github.com/refactoringhq/portent-vault-template](https://github.com/refactoringhq/portent-vault-template)
- Specification repository: [github.com/refactoringhq/portent](https://github.com/refactoringhq/portent)
- "Introducing Portent" essay by Luca Rossi: available in the template vault

---

## Next Steps

- [Sidebar Panels](07-sidebar-panels.md) -- Backlinks panel with relationship context
- [Collection](12-collection.md) -- Build database views filtered by type and relationships
- [Calendar](27-calendar.md) -- Event notes with a `date` show on a day, week or month grid
- [Properties](07-sidebar-panels.md#properties-frontmatter-editor) -- Edit frontmatter fields visually
