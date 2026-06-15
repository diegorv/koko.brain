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

You can use any other type name (e.g. `Recipe`, `Book`, `Meeting`) and it will appear in the type sidebar with default styling.

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
| `_sort` | Sort mode for notes within section | `title` |
| `_view` | Default view mode | `all` |
| `_visible` | Whether to show in sidebar | `true` |
| `_template` | Vault-relative path to template file for new notes | none |
| `_folder` | Vault-relative subfolder where new notes of this type are created (see [Creating Notes from Types](#creating-notes-from-types)) | none (vault root) |
| `_list_properties_display` | Properties to show in list views | none |
| `_archive_to` | Destination template when `_archived` is set to true (e.g. `{folder}/_archive`). See [Auto Move](22-auto-move.md#type-driven-lifecycle-rules) | none |

---

## Creating Notes from Types

Right-click a type section header in the sidebar and select **New [TypeName]** to create a note of that type. The new file is named "Untitled [TypeName].md" (auto-deduplicated if it already exists).

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

## Type Sidebar

The left sidebar has three modes, toggled by buttons in the header:

- **Files** -- standard file explorer tree
- **Types** (default) -- three-panel layout for browsing notes by type
- **Calendar** -- calendar view

### Three-Panel Layout

In type mode, the layout splits into three panels:

1. **Left sidebar** -- navigation with Inbox and Archive at the top, followed by type names with note counts
2. **Middle panel** -- note list for the selected type, with Open/Archived/Favorites tabs and note cards showing title, icon, properties, and dates
3. **Editor** -- the selected note

Click a type in the left sidebar to see its notes in the middle panel. Click a note card to open it in the editor.

Notes without a type appear in an "Untyped" section at the bottom of the left sidebar (when enabled in Settings → Types → Show Untyped Notes).

### Note Order

The type note list (the Open and Archived tabs in the middle panel, including the Untyped section) always sorts by most recently modified first -- the note you just edited jumps to the top. You can pin notes above that order by adding `_order` (or `order`) to a note's frontmatter:

```yaml
---
type: Project
_order: 1
---
```

Notes with `_order` appear first (lower = higher), sorted among themselves by order value. Notes without `_order` follow, sorted by most recently modified. Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted.

> [!TIP]
> `_order` also controls sort position in the [file explorer](02-file-explorer.md#custom-ordering-with-_order). A note with `_order: 1` appears first in both the type sidebar and the file tree.

### Sort Mode

The Open and Archived tabs of the type note list always sort by most recently modified first (with `_order` pins on top), so the `_sort` field does not change that list. `_sort` still controls how the **Favorites** tab is ordered within a type:

| Value | Behavior |
|-------|----------|
| `title` | Alphabetical by title (default) |
| `modified` | Newest modified first |
| `created` | Newest created first |
| `modified-asc` | Oldest modified first |
| `created-asc` | Oldest created first |

```yaml
---
type: Type
_sort: modified
---
```

Notes with `_order` always appear first regardless of the tab. `.view` files keep their own sort (configured via the inline Sort toolbar), independent of this behavior.

### Filters

The middle panel has three sub-filter tabs, shown whenever the active selection is a type, the Untyped section, or a `.view` file:

| Tab | Shows | Sort |
|-----|-------|------|
| Open | Non-archived notes | `_order`, then most recently modified |
| Archived | Archived notes only | `_order`, then most recently modified |
| Favorites | Favorited notes (excluding archived) | `_order`, then `_sort` mode |

The tabs are hidden for the Inbox and Archive nav items, since those selections already imply a specific lifecycle filter. For `.view` selections, the counts next to each tab reflect the view's matching set, not the whole vault.

The left sidebar also has two navigation items:

| Nav Item | Shows |
|----------|-------|
| Inbox | Notes with `_organized: false` (not yet triaged) |
| Archive | All archived notes across types |

### Favorite Order

In the Favorites tab, notes are sorted by `_favorite_index` (or `favorite_index`) instead of `_order`:

```yaml
---
type: Project
_favorite: true
_favorite_index: 1
---
```

Notes with `_favorite_index` appear first (lower = higher). Notes without it fall to the end, sorted alphabetically.

### Sidebar context menu

Right-click an item in the left sidebar to open a context menu. The available actions depend on what you click.

**Type section header (with an on-disk type definition):**

- **New [TypeName]** -- creates a note of that type
- **Open type definition** -- opens the type's definition note in the editor
- **Copy path** -- a submenu with **Copy absolute path** and **Copy relative path** (relative to the vault root)
- **Change icon** -- opens the icon picker to set or remove the section icon
- **Reveal in Finder** -- shows the definition file in the system file explorer

**Type section header (no on-disk type definition yet):**

- **New [TypeName]** -- creates a note of that type
- **Create type definition** -- creates a definition note titled after the type with the frontmatter `_type: Type` and `_visible: true`, then opens it in the editor

> [!TIP]
> "Create type definition" only appears for types that are inferred from notes but have no definition file. Once you create the definition, right-clicking the section shows the full menu (Open type definition, Copy path, Change icon, Reveal in Finder).

**View item:**

- **Open view** -- opens the `.view` file in the editor
- **Copy path** -- a submenu with **Copy absolute path** and **Copy relative path**
- **Change icon** -- opens the icon picker for the view
- **Reveal in Finder** -- shows the `.view` file in the system file explorer

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
> Notes without `_organized` in their frontmatter are treated as organized by default. Only notes explicitly created with `_organized: false` (via the Explicit Organization workflow) appear in the Inbox.

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

The Properties panel shows lifecycle action buttons below the frontmatter fields:

- **Organize** -- marks a note as organized (moves it out of inbox)
- **To Inbox** -- moves an organized note back to inbox
- **Archive** -- hides the note from default views
- **Unarchive** -- restores an archived note
- **Favorite** (star icon) -- toggles the favorite flag

### Explicit Organization Mode

By default, notes are treated as organized. Enable **Explicit organization** in **Settings → Types & Lifecycle** to activate the inbox workflow:

- New notes start as unorganized (inbox)
- The Inbox filter tab appears in the type sidebar with a badge count

Disable it to treat all notes as organized by default.

### Type Sidebar Settings

**Settings → Types & Lifecycle** has a **Type sidebar** group with one toggle:

- **Show untyped notes** -- shows notes without a type in an "Untyped" section at the bottom of the type sidebar. The section only appears when there is at least one untyped note.

### Archived Note Filtering

Archived notes are automatically excluded from:

- The default "All" view in the type sidebar
- The "Favorites" filter

Archived notes remain accessible through the "Archived" filter tab. They still appear in the Quick Switcher, but are shown dimmed with an archive icon rather than excluded.

---

## Frontmatter Key Aliases

Kokobrain recognizes alternative spellings for system metadata keys:

| Alias | Canonical form | Used in |
|-------|---------------|---------|
| `type` | `_type` | Type sidebar grouping, collection filters, inbox workflow |
| `organized` | `_organized` | Inbox filter tab, lifecycle actions in Properties panel |
| `archived` | `_archived` | Archived filter tab, hidden from All/Favorites, dimmed in Quick Switcher |
| `favorite` | `_favorite` | Favorites filter tab, star toggle in Properties panel |
| `order` | `_order` | Sort order of type sections and notes within sections |
| `favorite_index` | `_favorite_index` | Sort order of notes in Favorites tab |
| `sort` | `_sort` | Sort mode for notes in type sidebar sections |
| `icon` | `_icon` | Custom icon in type sidebar, file explorer, and editor tabs |
| `sidebar_label`, `sidebar label` | `_sidebar_label` | Section header label in type sidebar |
| `color` | `_color` | Icon color in type sidebar, file explorer, and editor tabs |
| `title_color` | `_title_color` | Title text color in type sidebar, file explorer, and editor tabs |
| `template` | `_template` | Template file for "New [Type]" action in type sidebar |
| `view` | `_view` | Default view mode for the type section |
| `visible` | `_visible` | Show/hide type section in sidebar |
| `list_properties_display` | `_list_properties_display` | Properties shown on note cards in middle panel |

You can use either form in your frontmatter. The app normalizes them internally. The type-folder field `_folder` and the auto-move destination field `_archive_to` have no short alias -- write them with the leading underscore.

> [!IMPORTANT]
> The `type` alias for the canonical `_type` is recognised both on the frontmatter side AND as an identifier in filter expressions (`.collection` / `.view` / inline `collection` blocks). The other system-flag aliases (`organized`, `archived`, `favorite`, etc.) are recognised only on the frontmatter side -- in filters, use the canonical name (`_organized`, `_archived`, `_favorite`). The `type` / `_type` identifier also compares case-insensitively for `==` / `!=`, so `type == "person"` and `type == "Person"` both match a note with `type: person`. The legacy `is_a` / `is a` spellings are no longer recognised. See [Collection > Filter Gotchas](12-collection.md#filter-gotchas) for details.

---

## View Files (.view)

View files are saved collection-style query definitions that appear as navigation items in the type sidebar. They let you create custom filtered lists of notes that live alongside your type sections.

### Creating a View

The fastest way is to click the **+** button next to the **VIEWS** label in the type sidebar. Kokobrain creates an `Untitled.view` (auto-deduplicated) at the vault root, selects it in the sidebar, and lets you start configuring filters via the inline toolbar without ever touching YAML.

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
| `_sort` | Sort mode for matching notes | `modified` |
| `_icon` | Lucide icon name | none |
| `_color` | Icon color | none |
| `_title_color` | Label text color | none |
| `_list_properties_display` | Properties to show on note cards | none |

Views appear in the type sidebar alongside type sections. Click a view to see its matching notes in the middle panel.

### Inline Filter and Sort Toolbar

When a `.view` is selected in the sidebar, the middle panel header shows two icon buttons on the right:

- **Sort** (⇅) — opens the same multi-column sort panel that the Collection toolbar uses. Sorts apply on top of the view's results.
- **Filter** (funnel) — opens the same filter panel, split into "All views" (the view's global filters) and "This view" (the active view's filters). Each row picks a property, an operator, and a value. Rows can be combined with **AND**, **OR**, or **NOT** at the group level.

Both panels mirror the [Collection toolbar](12-collection.md#toolbar) — the same property dropdown, operator inference, and conjunction rules. The two icons highlight in the accent color whenever any filter row or sort entry is active.

Every change is written back into the `.view` file immediately, so edits persist across selections, app restarts, and devices. Editing a `.view` in an external editor while it is the active sidebar selection will not refresh the inline panels until you navigate away and back — switch to another sidebar item, then back to the view.

### Multiple Views in a .view File

A `.view` can declare more than one entry under `views:`, but the type sidebar only ever renders the first one. The note list cannot draw calendar or linear-calendar layouts, so additional views (or non-table types) are silently skipped here. To browse every view with the proper renderer per type, open the `.view` file from the file explorer — the collection editor exposes a tab strip and switches between table, calendar, and linear-calendar views (see [Collection — Multiple Views](12-collection.md#multiple-views)).

### Open / Archived / Favorites for Views

Underneath the header, the same three sub-filter tabs that appear for type sections also appear for `.view` selections:

| Tab | Shows |
|-----|-------|
| Open | View results that are not archived |
| Archived | View results that are archived |
| Favorites | View results that are favorited and not archived |

The counts next to each tab reflect the view's matching set after the inline filters above are applied. Switching to a different sidebar item resets the active tab to **Open**.

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

In Kokobrain, this maps to the `_organized` and `_archived` frontmatter flags, plus the Inbox/Archive navigation in the type sidebar.

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
> Switch to the **Types** sidebar mode (click the grid icon in the sidebar header) to see your types appear as sections.

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

**When to use which:**

| Relationship | Use for | Example |
|-------------|---------|---------|
| `_belongs_to` | Strong ownership, composition, hierarchy | Meeting belongs to Project, Task belongs to Responsibility |
| `_related_to` | Loose association, cross-references | Note related to Topic, Event related to Person |
| Custom fields | Domain-specific connections | `manager: "[[alice]]"`, `client: "[[acme]]"` |

#### Step 4: Use the lifecycle

**Daily capture:** Create notes fast, don't worry about organization. If you have Explicit Organization enabled (Settings > Types), new notes start in the Inbox automatically.

**Weekly organize:** Open the Inbox in the type sidebar. For each note, ask:

1. *What is this?* -- assign a type
2. *What is it connected to?* -- add `_belongs_to` or `_related_to`
3. Click **Organize** in the Properties panel to move it out of the inbox

**Archive when done:** Finished a project? Click **Archive**. The note hides from default views but stays searchable through the "Archived" tab.

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
filters: 'type == "Meeting" && file.created > today() - duration("7d")'
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
- [Properties](07-sidebar-panels.md#properties-frontmatter-editor) -- Edit frontmatter fields visually
