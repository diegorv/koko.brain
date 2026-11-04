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

Built-in type suggestions with default icons and colors:

| Type | Icon | Color |
|------|------|-------|
| Project | Rocket | Red |
| Person | Users | Blue |
| Event | Calendar | Purple |
| Topic | Tag | Green |
| Task | Check Square | Orange |
| Note | File Text | Gray |

You can use any other type name (e.g. `Recipe`, `Book`, `Meeting`) and it will appear in the Types navigator with default styling.

### Type Definitions

To customize how a type appears in the sidebar, create a **Type Definition note** -- a note whose type is `Type`:

```yaml
---
type: Type
_icon: rocket
_color: red
_order: 1
_sidebar_label: Projects
_sort: title
_view: all
_visible: true
_template: _system/templates/Project.md
_list_properties_display:
  - status
  - priority
---
```

The note's title becomes the type name (e.g., a note titled "Project" with `type: Type` defines the "Project" type).

| Field | Description | Default |
|-------|-------------|---------|
| `_icon` | Lucide icon name | `file-text` |
| `_color` | Display color | `gray` |
| `_order` | Sidebar sort order (lower = higher) | `50` |
| `_sidebar_label` | Override the section label | `{Name}s` |
| `_sort` | No effect in the rail: a type's list sorts by most recently modified (see [Sort Mode](#sort-mode)) | `title` |
| `_view` | Default view mode | `all` |
| `_visible` | Whether to show in sidebar | `true` |
| `_template` | Vault-relative path to template file for new notes | none |
| `_folder` | Vault-relative subfolder where new notes of this type are created (see [Creating Notes from Types](#creating-notes-from-types)) | none (vault root) |
| `_list_properties_display` | Properties to show in list views | none |
| `_archive_to` | Destination template when `_archived` is set to true (e.g. `{folder}/_archive`). See [Auto Move](22-auto-move.md#type-driven-lifecycle-rules) | none |
| `_hub` | `true` makes the type's notes hubs: the [note action bar](03-editor.md#note-action-bar) offers **New linked note**, which creates a note in the hub's folder with `_belongs_to` linking the hub | `false` |

---

## Creating Notes from Types

Pick a type in the Types navigator and click **New here** in the note list header, or right-click the type and select **New [TypeName]**. The new file is named "Untitled [TypeName].md" (auto-deduplicated if it already exists) and opens in the editor.

### Where the note is created

The note's folder is built from two optional parts:

```
<vault> / <base folder> / <type folder> / Untitled [TypeName].md
```

- **Base folder** is the global setting in **Settings → Types & Lifecycle → Base folder** (`typesBaseFolder`). It is prepended to every typed note.
- **Type folder** is the `_folder` field on the type definition.

Each part is optional; missing parts are skipped. With both empty the note is created at the vault root. Missing folders are created automatically.

| Base folder | Type `_folder` | New note path |
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

- **Views**: your `.view` files, each with the number of notes it lists. The **+** button next to the label creates a new view (see [View Files](#view-files-view)).
- **Types**: every type, with its note count. A type comes from its definition note or from the notes that name it.
- **Untyped**: notes without a type, when **Settings → Types & Lifecycle → Show untyped notes** is on.

Click a row to fill the note list with its notes. A type lists its notes that are not archived; the line under the list header says so (`type is Project, not archived`). Click a note to open it in the editor. Kokobrain remembers the row you picked and opens on it after a restart; if the type or view is gone, the rail opens on **Today** instead.

**New type** in the navigator header creates a type definition and picks it.

### The Other Rail Items

The rest of the rail lists notes by their lifecycle, whatever their type:

| Rail item | Lists | New here creates |
|-----------|-------|------------------|
| Inbox | Notes with `_organized: false`, not archived. The badge counts them. | A note with `_organized: false` |
| Today | Your favorite notes (pinned), then the notes dated today | A note with today's `date` |
| Favorites | Favorite notes, not archived | A note with `_favorite: true` |
| Archive (bottom of the rail) | Archived notes | Nothing |

These notes go in the folder `Cmd+N` uses. The [note action bar](03-editor.md#note-action-bar) above every note favorites, organizes, archives and restores it, and the lists follow.

### Types Navigator Context Menu

**A type with a definition note:**

- **New [TypeName]**: creates a note of that type
- **Rename**: renames the type in its definition and in every note of the type
- **Open type definition**: opens the type's definition note in the editor
- **Copy path**: a submenu with **Copy absolute path** and **Copy relative path** (relative to the vault root)
- **Change icon**: opens the icon picker for the type
- **Reveal in Finder**: shows the definition file in the system file explorer

**A type with no definition note yet:**

- **New [TypeName]**: creates a note of that type
- **Create type definition**: creates a definition note titled after the type with the frontmatter `_type: Type` and `_visible: true`, then opens it in the editor

**A view:**

- **Open view**: opens the `.view` file in the editor
- **Copy path**: a submenu with **Copy absolute path** and **Copy relative path**
- **Change icon**: opens the icon picker for the view
- **Reveal in Finder**: shows the `.view` file in the system file explorer

### Note Order

A type's note list (including Untyped) always sorts by most recently modified first -- the note you just edited jumps to the top. You can pin notes above that order by adding `_order` (or `order`) to a note's frontmatter:

```yaml
---
type: Project
_order: 1
---
```

Notes with `_order` appear first (lower = higher), sorted among themselves by order value. Notes without `_order` follow, sorted by most recently modified. Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted.

> [!TIP]
> `_order` also controls sort position in the [file explorer](02-file-explorer.md#custom-ordering-with-_order). A note with `_order: 1` appears first in both a type's list and its folder.

### Sort Mode

A type's list always sorts by most recently modified first (with `_order` pins on top); a type definition's `_sort` does not change it. A `.view` file's `_sort`, which orders a view with no Sort set, takes these values:

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

If a type definition includes `_archive_to`, Kokobrain automatically moves notes to the specified destination when archived, and moves them back when unarchived. No manual auto-move rules needed.

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

By default, notes are treated as organized. Enable **Explicit organization** in **Settings → Types & Lifecycle** to activate the inbox workflow: notes created from then on start with `_organized: false`, so they are unorganized and the rail's **Inbox** item lists them, with a badge count. Existing notes are unchanged.

The switch marks notes created by:

- **Cmd+N** and Quick Capture (the composer, the clipboard shortcut and `kokobrain://capture`)
- **+ New here** in the note list, and **New \<Type\>** in the Types navigator
- Clicking a link to a note that does not exist yet, and a meta-bind `createNote` button
- **New note** in the Files navigator's folder menu, the palette's **New File**, and **Create** in the Quick Switcher
- **New File from Template**, **New 1:1**, **New linked note** and a new event in the Calendar
- `kokobrain://new` when it creates the note (not with `overwrite=true`)

Periodic notes (daily, weekly, monthly, quarterly, yearly) are not marked. A template that already sets `_organized` keeps its value.

The **Inbox** item is always in the rail and lists any note marked `_organized: false`, with or without the switch. Turning the switch off stops marking new notes; notes already marked stay in the Inbox until you organize them.

### Types Navigator Settings

**Settings → Types & Lifecycle** has a **Types navigator** group with one toggle:

- **Show untyped notes** -- shows notes without a type in an "Untyped" row at the bottom of the Types navigator. The row only appears when there is at least one untyped note.

### Archived Note Filtering

Archived notes are automatically excluded from:

- A type's list, a view's list, Inbox and Favorites in the rail

Archived notes remain accessible through the rail's **Archive** item, and a folder's list in the Files navigator still shows them. They still appear in the Quick Switcher, but are shown dimmed with an archive icon rather than excluded.

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
| `sidebar_label`, `sidebar label` | `_sidebar_label` | Row label in the Types navigator |
| `color` | `_color` | Icon color in the Types navigator, Files navigator, and editor tabs |
| `title_color` | `_title_color` | Title text color in the Types navigator, Files navigator, and editor tabs |
| `template` | `_template` | Template file for new notes of the type |
| `view` | `_view` | Default view mode for the type section |
| `visible` | `_visible` | Show/hide type section in sidebar |
| `list_properties_display` | `_list_properties_display` | Properties shown on note list rows |

You can use either form in your frontmatter. The app normalizes them internally. The type-folder field `_folder` and the auto-move destination field `_archive_to` have no short alias -- write them with the leading underscore.

> [!IMPORTANT]
> The `type` alias for the canonical `_type` is recognised both on the frontmatter side AND as an identifier in filter expressions (`.collection` / `.view` / inline `collection` blocks). The remaining aliases (`icon`, `color`, `sort`, `template`, etc.) are recognised only on the frontmatter side -- in filters, use the canonical name. The three lifecycle flags are a separate case: `organized` / `archived` / `favorite` are always-present normalised booleans in filter expressions, not aliases of `_organized` / `_archived` / `_favorite`, and `organized` defaults to `true`. See [Collection > Filter Gotchas](12-collection.md#archived-and-_archived-are-different-fields-not-aliases). The `type` / `_type` identifier also compares case-insensitively for `==` / `!=`, so `type == "person"` and `type == "Person"` both match a note with `type: person`. The legacy `is_a` / `is a` spellings are no longer recognised. See [Collection > Filter Gotchas](12-collection.md#filter-gotchas) for details.

---

## View Files (.view)

View files are saved collection-style query definitions that appear under **Views** in the Types navigator. They let you create custom filtered lists of notes that live alongside your type sections.

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

You can also create the file by hand. A `.view` is a single YAML document: the sidebar metadata keys live at the top level, alongside a `views:` array and a `filters:` expression.

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

These keys sit at the top level of the `.view` YAML document (not inside a `---` frontmatter block).

| Field | Description | Default |
|-------|-------------|---------|
| `_sidebar_label` | Display name in the sidebar | Filename |
| `_order` | Sidebar sort order (lower = higher) | `50` |
| `_sort` | Sort mode for matching notes when the view has no Sort set | `modified` |
| `_icon` | Lucide icon name | none |
| `_color` | Icon color | none |
| `_title_color` | Label text color | none |
| `_list_properties_display` | Properties to show on note cards | none |
| `_open_in_editor` | When `true`, a click on the view opens the `.view` in the editor instead of the note list | `false` |

Click a view in the Types navigator to see its matching notes, not archived, in the note list. A view with `_open_in_editor: true` opens in the editor instead, as the full table or collection, and the note list keeps what it showed; its row stays highlighted while that view is the active tab. Only the boolean `true` turns this on, and you write the key by hand in the YAML. **New here** creates a note of the view's type when its filter picks one type, else a plain note.

### Inline Filter and Sort Toolbar

When a `.view` is picked, the note list header shows two icon buttons:

- **Sort** (⇅) — opens the same multi-column sort panel that the Collection toolbar uses. The list follows this sort exactly. It is saved as the first view's `sort:` in the `.view` file and wins over `_sort`, which only orders a view with no sort set.
- **Filter** (funnel) — opens the same filter panel, split into "All views" (the view's global filters) and "This view" (the active view's filters). Each row picks a property, an operator, and a value. Rows can be combined with **AND**, **OR**, or **NOT** at the group level.

Both panels mirror the [Collection toolbar](12-collection.md#toolbar) — the same property dropdown, operator inference, and conjunction rules. The two icons highlight in the accent color whenever any filter row or sort entry is active.

Every change is written back into the `.view` file immediately, so edits persist across selections, app restarts, and devices. Editing a `.view` in an external editor while it is picked will not refresh the inline panels until you navigate away and back: pick another row, then the view again.

### Multiple Views in a .view File

A `.view` can declare more than one entry under `views:`, but the note list only ever renders the first one. The note list cannot draw calendar or linear-calendar layouts, so additional views (or non-table types) are silently skipped here. To browse every view with the proper renderer per type, open the `.view` file from the file explorer — the collection editor exposes a tab strip and switches between table, calendar, and linear-calendar views (see [Collection — Multiple Views](12-collection.md#multiple-views)).

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

Add `type: Project` (or whatever type fits) to a note's frontmatter. The note shows up under that type section in the sidebar.

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

**Daily capture:** Create notes fast, don't worry about organization. If you have Explicit Organization enabled (Settings > Types & Lifecycle), new notes start in the Inbox automatically. Periodic notes are not marked.

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

Views appear in the sidebar alongside types. See [Collection](12-collection.md) for the full expression language.

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
