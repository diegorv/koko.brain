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
| `_sort` | Sort field for notes | `title` |
| `_view` | Default view mode | `all` |
| `_visible` | Whether to show in sidebar | `true` |
| `_template` | Template for new notes of this type | none |
| `_list_properties_display` | Properties to show in list views | none |

---

## Type Sidebar

The left sidebar has two modes, toggled by the button in the file explorer header:

- **Files** (default) -- standard file explorer tree
- **Types** -- notes grouped by their `type` field

In type mode, notes are organized into collapsible sections by type. Each section shows the type icon, label, and note count. Notes without a type appear in an "Untyped" section at the bottom.

### Filters

The type sidebar has four filter tabs:

| Filter | Shows |
|--------|-------|
| All | All notes except archived |
| Inbox | Notes not yet organized (requires Explicit Organization) |
| Archived | Archived notes only |
| Favorites | Favorited notes (excluding archived) |

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
| Inbox | `_organized: false` (or absent) | Newly created, not yet triaged |
| Organized | `_organized: true` | Deliberately placed in your system |
| Archived | `_archived: true` | No longer active, hidden from default views |

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

| Alias | Canonical form |
|-------|---------------|
| `is_a`, `is a` | `type` |
| `belongs to` | `belongs_to` |
| `related to` | `related_to` |
| `organized` | `_organized` |
| `archived` | `_archived` |
| `favorite` | `_favorite` |

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
