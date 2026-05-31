# Collection

Learn how to query your vault notes as a table or database using Collection — a powerful spreadsheet-like view over your notes' frontmatter properties.

## What Are Collection?

Collection let you view and query your vault notes as rows in a table. Each note becomes a row, and its frontmatter properties become columns. Collection are saved as `.collection` files in YAML format, so they live right alongside your notes in the vault.

If you have used Notion databases or Obsidian's Dataview plugin, Collection will feel familiar — but with a visual, spreadsheet-like interface that requires no code to get started.

Collection are great for:

- **Project trackers** — monitor status, priority, and deadlines across all your project notes.
- **Reading lists** — keep track of books, articles, ratings, and reading progress.
- **CRM** — manage contacts, companies, and interaction history.
- **Content calendars** — plan and schedule blog posts, videos, or social media content.
- **Any structured collection** — anything where your notes share a common set of properties.

## Creating a Collection

There are three ways to create a collection:

1. **Right-click in the file explorer** — Choose **"New Collection"**. Kokobrain writes an `Untitled.collection` with one empty table view and immediately puts the file in rename mode.
2. **Inside a `.md` file** — Use a ` ```collection ` fenced code block to embed a collection inline (see [Inline Collection](#inline-collection-code-blocks)).
3. **Manually** — Create the file from any file manager or terminal — just make sure the extension is `.collection`.

When you open a `.collection` file for the first time, Kokobrain will present an empty table ready for configuration.

## View Types

Each view inside a `.collection` file has a `type:` field selecting how the results are rendered. Three types ship today:

| Type | What it looks like |
|------|--------------------|
| `table` (default) | Spreadsheet-like grid with one row per matching note and one column per property. |
| `calendar` | Monthly calendar grid. Notes are placed on the day matching their `dateProperty`. Multi-day events span from `dateProperty` to `endDateProperty`. |
| `linear-calendar` | Horizontal timeline — same data as `calendar` but laid out as a Gantt-like bar chart. |

Calendar-style views accept extra view fields:

| Field | Description |
|-------|-------------|
| `dateProperty` | Frontmatter property to use as the event start date. Required for `calendar` and `linear-calendar`. |
| `endDateProperty` | Optional. Property for multi-day event end dates. |
| `weekStartDay` | 0 = Sunday … 6 = Saturday. Default `1` (Monday). |
| `colorProperty` | Property whose value picks the event bar color. |

See `help/examples/collection-features/` for ready-to-run examples of each view type.

## The Table View

When you open a `.collection` file, you see a spreadsheet-like table (the default view type):

- **Rows**: Each row represents a note from your vault that matches the query filters you have defined.
- **Columns**: Each column corresponds to a frontmatter property (e.g., `title`, `status`, `date`, `tags`).

![Collection table view](screenshots/collection-table.png)

You can click on any row to open the corresponding note in the editor.

## Toolbar

The toolbar at the top of the collection editor provides three main panels for controlling what data appears and how it is displayed.

### Filter Panel

Use filters to narrow down which notes appear in the table:

- Add conditions based on any frontmatter property value.
- Combine multiple filters with **AND**, **OR**, or **NOT** logic.
- Example: Show only notes where `status` is `active` **AND** `tags` contains `project`.

Filters update the table in real time, so you can quickly explore different slices of your vault.

### Sort Panel

Control the order in which rows appear:

- Sort by any column in ascending or descending order.
- Add multiple sort levels — for example, sort by `status` first, then by `date` within each status group.

### Properties Panel

Manage which columns are visible and add new ones:

- **Show or hide columns** to focus on the data that matters for a particular view.
- **Add new columns** based on existing frontmatter properties in your vault.
- **Add formula columns** — computed values that derive from expressions (see below).

## Formula Columns

You can add computed columns that derive their values from expressions:

- Access note properties directly by name: `status`, `priority`, `date`.
- Access file metadata: `file.name`, `file.path`, `file.folder`, `file.size`.
- Use `if()` for conditional values.
- Formulas are evaluated per row, so each note gets its own computed value.

### Examples in YAML

```yaml
formulas:
  remaining: "100 - progress"
  statusLabel: "if(status == 'completed', 'Done', if(status == 'active', 'In Progress', 'Other'))"
```

### Custom display names

Rename any column (including formulas) with `displayName`:

```yaml
properties:
  file.name:
    displayName: Note
  formula.remaining:
    displayName: "Remaining %"
```

### Sorting by formula columns

Formula columns can be used in sort rules:

```yaml
sort:
  - column: formula.remaining
    direction: ASC
```

Formula columns are useful for creating derived data without modifying the underlying notes.

## Multiple Views

A single `.collection` or `.view` file can contain multiple named views. Each view has its own independent set of:

- Filters
- Sort order
- Visible columns
- View type (`table`, `calendar`, or `linear-calendar`)

When a file has more than one view, the collection editor renders a tab strip at the top — one tab per view name. Click a tab to switch the visible view. The Filter, Sort, and Properties toolbar panels rebind to the active view, so edits go into the view you are looking at. Files with a single view also show the tab strip with a single tab, alongside the controls described below.

### Managing views

The tab strip exposes three editing affordances:

- **Add a view** — click the **+** button at the end of the tab strip. A fresh `Untitled` table view is appended and selected, with the tab name pre-focused for renaming. Press **Enter** to confirm or **Escape** to keep the default name.
- **Rename a view** — double-click a tab, type the new name, then press **Enter** (or click elsewhere) to confirm. **Escape** discards the change. Empty or whitespace-only names are ignored.
- **Right-click a tab** for the full menu: **Rename**, **Change type** (Table / Calendar / Linear Calendar), or **Delete view**. Delete is disabled when only one view remains — every `.collection` and `.view` must keep at least one view.

When you change a view's type, all calendar-specific keys (`dateProperty`, `endDateProperty`, `weekStartDay`, `colorProperty`) stay in the YAML even after switching to `table`. The table renderer ignores them, but they reappear unchanged when you switch back to a calendar layout, so toggling type does not lose configuration.

This is useful when you want different perspectives on the same data. For example, you might have one view called "Active Projects" that filters for `status: active`, and another called "Completed Projects" that filters for `status: done` — both defined in the same `.collection` file.

> [!NOTE]
> When a `.view` file is selected from the **type sidebar** (instead of opened from the file explorer), only the first view in the `views:` array is rendered, and the rest are ignored. The type sidebar's note list cannot draw calendar or linear-calendar layouts. Open the `.view` from the file explorer to access the full multi-view experience with the tab strip.

## Result Limit

Each view can set a maximum number of results using a `limit` value. This is useful for dashboards where you only want to display a subset of matching notes, such as "Top 10 by priority" or "5 most recent meetings".

## Inline Collection (Code Blocks)

You can also embed a Collection directly inside any `.md` note using a ` ```collection ` fenced code block:

````
```collection
filters: "status == 'active'"
views:
  - type: table
    name: Active Items
    order:
      - file.name
      - status
      - priority
```
````

When the cursor is **outside** the block, it renders as an interactive table. When the cursor is **inside**, you see the raw YAML. This is useful for embedding live queries in daily notes, dashboards, or project pages.

## Source Mode

Click the toggle button in the bottom-right corner of the collection editor to switch between the visual table and the raw YAML source.

### YAML structure for `.collection` files

```yaml
name: Projects
views:
  - name: Active
    query:
      source: ""
      filters:
        - property: status
          operator: eq
          value: active
      sort:
        - property: date
          direction: desc
      properties:
        - title
        - status
        - date
        - tags
      limit: 50
```

### YAML structure for inline code blocks

Inline collection use a slightly different format with expression-based filters:

```yaml
filters: "status == 'active'"
views:
  - type: table
    name: My View
    order:
      - file.name
      - status
      - priority
    sort:
      - column: priority
        direction: DESC
    limit: 10
```

### Filter expressions

Filters can be simple expressions or combined with logical operators:

```yaml
# Simple comparison
filters: "status == 'active'"

# Numeric comparison
filters: "progress > 50"

# Tag filter
filters: "file.hasTag('project')"

# AND — all conditions must match
filters:
  and:
    - "status == 'active'"
    - "priority == 'high'"

# OR — any condition matches
filters:
  or:
    - "file.hasTag('bug')"
    - "file.hasTag('meeting')"

# NOT — exclude matching notes
filters:
  not:
    - "file.hasTag('archived')"
```

### Per-view filters

Each view can have its own filter in addition to the global filter. Both are applied together:

```yaml
filters: "status != 'backlog'"       # Global: remove backlog items
views:
  - type: table
    name: Active Non-Bugs
    filters: "!file.hasTag('bug')"   # View-specific: also remove bugs
    order:
      - file.name
      - status
```

Source mode is helpful when you want to make bulk edits, copy a view configuration, or troubleshoot filter logic.

## Expression Language Reference

The filter and formula expressions used in Collection (and in Auto Move rules) support a rich set of functions, methods, and operators.

### Operators

| Category | Operators |
|----------|-----------|
| Arithmetic | `+`, `-`, `*`, `/`, `%` |
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` |
| Logical | `&&`, `\|\|`, `!` |
| Date arithmetic | `date + "1d"`, `date - date`, duration strings like `"1h 30m"`, `"2 weeks"` |

Literals: `true`, `false`, `[1, 2, 3]` (arrays), quoted strings, numbers.

### Built-in Functions

| Function | Description |
|----------|-------------|
| `now()` | Current date-time |
| `today()` | Current date (midnight) |
| `date(string)` | Parse a date from a string |
| `number(value)` | Convert to number |
| `contains(haystack, needle)` | Check if value contains another |
| `startsWith(str, prefix)` | Check string prefix |
| `endsWith(str, suffix)` | Check string suffix |
| `isEmpty(value)` | Check if value is empty/null |
| `max(a, b)` | Larger of two values |
| `min(a, b)` | Smaller of two values |
| `list(items...)` | Create a list |
| `duration(string)` | Parse a duration (e.g., `"2h 30m"`) |

### Display Helpers

These functions render rich content inside table cells:

| Function | Description |
|----------|-------------|
| `link(href, displayText)` | Clickable link |
| `image(src, alt)` | Inline image |
| `icon(name)` | Lucide icon |
| `html(content)` | Raw HTML |
| `badge(text, color)` | Colored badge |
| `progress(value, max, color)` | Progress bar |
| `color(text, color)` | Colored text |
| `escapeHTML(text)` | Escape HTML entities |

### File Namespace (`file.*`)

| Accessor / Method | Description |
|-------------------|-------------|
| `file.name` | Filename without extension |
| `file.path` | Full vault-relative path |
| `file.folder` | Parent folder path |
| `file.ext` | File extension |
| `file.created` | Creation date |
| `file.modified` | Last modified date |
| `file.size` | File size in bytes |
| `file.tags` | Array of tags |
| `file.properties` | All frontmatter as an object |
| `file.hasTag(tag)` | Check if note has a tag |
| `file.inFolder(path)` | Check if note is in a folder |
| `file.hasProperty(key)` | Check if frontmatter key exists |
| `file.asLink()` | Render as a wikilink |

### Value Methods

**String:** `.lower()`, `.title()`, `.trim()`, `.replace(find, rep)`, `.split(sep)`, `.slice(start, end)`, `.matches(regex)`, `.length`

**Number:** `.abs()`, `.round()`, `.ceil()`, `.floor()`, `.toFixed(digits)`

**Date:** `.format(pattern)`, `.relative()`, `.date()`, `.time()`, `.year`, `.month`, `.day`, `.hour`, `.minute`, `.second`

**List:** `.contains(item)`, `.sort()`, `.unique()`, `.join(sep)`, `.flat()`, `.slice(start, end)`, `.filter(pred)`, `.map(fn)`, `.length`

**Object:** `.keys()`, `.values()`, `.isEmpty()`

**Universal (any value):** `.contains()`, `.startsWith()`, `.endsWith()`, `.isEmpty()`, `.isTruthy()`, `.isType(typeName)`, `.toString()`

### Examples

```yaml
# Filter: active projects with high priority
filters: "type == 'Project' && status == 'active' && priority == 'high'"

# Formula: days until due
formulas:
  daysLeft: "date - today()"
  statusBadge: "badge(status, if(status == 'active', 'green', 'gray'))"
  progress: "progress(completed, total, 'blue')"
```

### Filter Gotchas

A few specifics about how the engine resolves values that are easy to trip over when writing filter expressions:

#### `type` is stored capitalised, but compared case-insensitively

Whatever you write in the `type:` frontmatter is normalised to first-letter-uppercase before it reaches the filter engine. A note with `type: person` is queried as `"Person"`. When you compare against the `type` identifier (or its alias `is_a`) the engine uses case-insensitive equality, so all four forms below match the same notes:

```yaml
filters: 'type == "Person"'   # matches
filters: 'type == "person"'   # matches
filters: 'type == "PERSON"'   # matches
filters: 'is_a == "person"'   # matches (is_a == type)
```

The relaxed comparison is scoped to the `type` / `is_a` identifier only -- equality against other fields stays case-sensitive (`name == "alice"` will NOT match a note with `name: Alice`). It also only applies to `==` and `!=`; ordering operators (`<`, `>`, etc.) are not affected because the `type` field is a string label, not an ordered scalar.

#### Frontmatter aliases in filter identifiers

`is_a` (and the spaced form `is a`) is recognised as an alias for `type` both when parsing the note's frontmatter AND when used as an identifier in a filter expression. `is_a == "Person"` and `type == "Person"` are equivalent.

```yaml
# Note frontmatter accepts either spelling
is_a: Project        # equivalent to: type: Project

# Filter expressions accept either identifier
filters: 'type == "Project"'   # works
filters: 'is_a == "Project"'   # also works
```

Other system-flag aliases (`organized`, `archived`, `favorite`, etc. -- see the full list in [Types & Relationships > Frontmatter Key Aliases](25-types-and-relationships.md#frontmatter-key-aliases)) are recognised only on the frontmatter side. In filter expressions, use the canonical name (`_organized`, `_archived`, `_favorite`).

#### `file.inFolder()` takes the absolute folder path

`file.inFolder("…")` matches by checking that the note's absolute parent folder starts with the argument string. It does NOT accept vault-relative paths.

```yaml
# Folder of a note in vault/work/people on macOS
# /Users/you/vaults/my-vault/vault/work/people

filters: 'file.inFolder("/Users/you/vaults/my-vault/vault/work/people")'  # matches
filters: 'file.inFolder("vault/work/people")'                              # zero matches
```

For vault-relative or path-segment matching, use `contains()` on `file.folder` or `file.path`:

```yaml
filters: 'contains(file.folder, "vault/work/people")'   # works regardless of vault root
filters: 'contains(file.path, "people")'                # any path containing "people"
```

---

## Setting Up Your Notes for Collection

For Collection to work well, your notes need consistent frontmatter. Add a YAML frontmatter block at the top of each note with the properties you want to query:

```yaml
---
title: Project Alpha
status: active
priority: high
date: 2026-02-17
tags: [project, engineering]
---
```

> [!TIP]
> Consistency is key. Use the same property names across notes (e.g., always `status`, not sometimes `state`). The Properties panel in the right sidebar helps you maintain consistency by showing all properties used across your vault.

## Example Use Cases

### Project Tracker

- **Filter:** `tags` contains `project`
- **Columns:** title, status, priority, date
- **Sort:** priority descending, then date descending

### Reading List

- **Filter:** `type` equals `book`
- **Columns:** title, author, rating, date
- **Sort:** rating descending

### Meeting Log

- **Filter:** `type` equals `meeting`
- **Columns:** title, date, attendees
- **Sort:** date descending

## Relationship with QueryJS

Collection uses QueryJS internally for complex queries. If you need programmatic access to your vault data beyond what the visual table provides, you can write custom queries using the QueryJS API. See [QueryJS](13-queryjs.md) for details.

## Next Steps

- [QueryJS](13-queryjs.md) — JavaScript API for advanced vault queries.
- [Sidebar Panels](07-sidebar-panels.md) — Properties panel for editing frontmatter across your notes.
