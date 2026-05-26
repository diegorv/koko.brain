# Types, Relationships & Lifecycle

Kokobrain supports structured note types, semantic relationships between notes, and a lifecycle workflow for organizing your knowledge base. These features are inspired by the [Portent](https://portent.md) knowledge base specification.

---

## Note Types

Every note can declare a type via the `type` (or `is_a`) frontmatter field. Types are free-form strings -- you can use any name you want.

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
| `_list_properties_display` | Properties to show in list views | none |

---

## Creating Notes from Types

Right-click a type section header in the sidebar and select **New [TypeName]** to create a note of that type. The new file is named "Untitled [TypeName].md" (auto-deduplicated if it already exists).

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

- **Files** (default) -- standard file explorer tree
- **Types** -- three-panel layout for browsing notes by type
- **Calendar** -- calendar view

### Three-Panel Layout

In type mode, the layout splits into three panels:

1. **Left sidebar** -- navigation with Inbox and Archive at the top, followed by type names with note counts
2. **Middle panel** -- note list for the selected type, with Open/Archived/Favorites tabs and note cards showing title, icon, properties, and dates
3. **Editor** -- the selected note

Click a type in the left sidebar to see its notes in the middle panel. Click a note card to open it in the editor.

Notes without a type appear in an "Untyped" section at the bottom of the left sidebar.

### Note Order

Notes within a type section are sorted alphabetically by title by default. You can override this by adding `_order` (or `order`) to a note's frontmatter:

```yaml
---
type: Project
_order: 1
---
```

Notes with `_order` appear first (lower = higher), sorted among themselves by order value. Notes without `_order` appear after, sorted by `_sort` mode (see below). Both numeric (`_order: 1`) and string (`_order: "1"`) values are accepted.

> [!TIP]
> `_order` also controls sort position in the [file explorer](02-file-explorer.md#custom-ordering-with-_order). A note with `_order: 1` appears first in both the type sidebar and the file tree.

### Sort Mode

The `_sort` field on a type definition controls how notes without `_order` are sorted within that type section:

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

Notes with `_order` always appear first regardless of `_sort`. The sort mode only affects notes without an explicit `_order` value. In the Favorites tab, `_favorite_index` is used instead of `_sort`.

### Filters

The middle panel has three sub-filter tabs (shown for type selections and Inbox/Archive nav):

| Tab | Shows | Sort |
|-----|-------|------|
| Open | Non-archived notes | `_order`, then `_sort` mode |
| Archived | Archived notes only | `_order`, then `_sort` mode |
| Favorites | Favorited notes (excluding archived) | `_order`, then `_sort` mode |

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

---

## Relationships

Notes can declare semantic relationships to other notes using frontmatter fields with wikilink values.

### Built-in relationship fields

```yaml
---
belongs_to: "[[Parent Project]]"
related_to:
  - "[[Topic A]]"
  - "[[Topic B]]"
---
```

- **`belongs_to`** -- hierarchical ownership (this note belongs to another)
- **`related_to`** -- non-hierarchical association

Both fields accept a single wikilink or a list of wikilinks.

### Custom relationship fields

Any frontmatter field whose value contains wikilinks is treated as a relationship. For example:

```yaml
---
manager: "[[Alice Smith]]"
client: "[[Acme Corp]]"
---
```

### Relationship Backlinks

The Backlinks panel (right sidebar) includes a **Relationships** section that shows notes referencing the current note through relationship fields. Each entry displays the source note and the field name (e.g., "belongs_to", "manager").

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

### Lifecycle Actions

The Properties panel shows lifecycle action buttons below the frontmatter fields:

- **Organize** -- marks a note as organized (moves it out of inbox)
- **To Inbox** -- moves an organized note back to inbox
- **Archive** -- hides the note from default views
- **Unarchive** -- restores an archived note
- **Favorite** (star icon) -- toggles the favorite flag

### Explicit Organization Mode

By default, notes are treated as organized. Enable **Explicit Organization** in settings to activate the inbox workflow:

- New notes start as unorganized (inbox)
- The Inbox filter tab appears in the type sidebar with a badge count
- The Quick Switcher excludes archived notes from results

### Archived Note Filtering

Archived notes are automatically excluded from:

- The default "All" view in the type sidebar
- The Quick Switcher results
- The "Favorites" filter

Archived notes remain accessible through the "Archived" filter tab.

---

## Frontmatter Key Aliases

Kokobrain recognizes alternative spellings for system metadata keys:

| Alias | Canonical form | Used in |
|-------|---------------|---------|
| `is_a`, `is a` | `type` | Type sidebar grouping, collection filters, inbox workflow |
| `belongs to` | `belongs_to` | Backlinks panel "Relationships" section |
| `related to` | `related_to` | Backlinks panel "Relationships" section |
| `organized` | `_organized` | Inbox filter tab, lifecycle actions in Properties panel |
| `archived` | `_archived` | Archived filter tab, hidden from All/Favorites/Quick Switcher |
| `favorite` | `_favorite` | Favorites filter tab, star toggle in Properties panel |
| `order` | `_order` | Sort order of type sections and notes within sections |
| `favorite_index` | `_favorite_index` | Sort order of notes in Favorites tab |
| `sort` | `_sort` | Sort mode for notes in type sidebar sections |
| `icon` | `_icon` | Custom icon in type sidebar, file explorer, and editor tabs |
| `sidebar_label`, `sidebar label` | `_sidebar_label` | Section header label in type sidebar |
| `color` | `_color` | Icon color in type sidebar, file explorer, and editor tabs |
| `title_color` | `_title_color` | Title text color in type sidebar, file explorer, and editor tabs |
| `template` | `_template` | Template file for "New [Type]" action in type sidebar |
| `view` | `_view` | Not yet implemented |
| `visible` | `_visible` | Show/hide type section in sidebar |
| `list_properties_display` | `_list_properties_display` | Properties shown on note cards in middle panel |

You can use either form in your frontmatter. The app normalizes them internally.

---

## Collection Filters

The Collection feature supports filtering by Portent fields:

- Filter by `type` to show only notes of a specific type
- Filter by `belongs_to` or `related_to` relationships
- Filter by lifecycle state (`organized`, `archived`, `favorite`)

See [Collection](12-collection.md) for details on building filtered views.

---

## Next Steps

- [Sidebar Panels](07-sidebar-panels.md) -- Backlinks panel with relationship context
- [Collection](12-collection.md) -- Build database views filtered by type and relationships
- [Properties](07-sidebar-panels.md#properties-frontmatter-editor) -- Edit frontmatter fields visually
