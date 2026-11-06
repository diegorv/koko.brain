# Collection

Learn how to query your vault notes as a table or database using Collection — a powerful spreadsheet-like view over your notes' frontmatter properties.

## What Are Collection?

Collection let you view and query your vault notes as rows in a table. Each note becomes a row, and its frontmatter properties become columns. Collection are saved as `.view` files in YAML format, so they live right alongside your notes in the vault.

If you have used Notion databases or Obsidian's Dataview plugin, Collection will feel familiar — but with a visual, spreadsheet-like interface that requires no code to get started.

> [!NOTE]
> A `.view` with `_visible: false` and `_open_in_editor: true` (what **New table** writes) is a table or calendar you open in the editor. Without those keys it is also an entry in the menu: the **Views** section of the Types navigator lists it, and it can be pinned to the rail or reached with the palette's **Open view** (see [View Files](25-types-and-relationships.md#view-files-view)). An inline ` ```collection ` block embeds the same format in a note.
>
> A `.collection` file, the format's old extension, opens as plain text. To migrate one by hand, rename it to `.view` and add `_visible: false` and `_open_in_editor: true` at the top.
>
> Every key of the format, with its value, default and effect, is listed once in [Types & Relationships > View Metadata Fields](25-types-and-relationships.md#view-metadata-fields). The underscore keys there (`_sidebar_label`, `_rail`, ...) are read only in a `.view`.

Collection are great for:

- **Project trackers** — monitor status, priority, and deadlines across all your project notes.
- **Reading lists** — keep track of books, articles, ratings, and reading progress.
- **CRM** — manage contacts, companies, and interaction history.
- **Content calendars** — plan and schedule blog posts, videos, or social media content.
- **Any structured collection** — anything where your notes share a common set of properties.

## Creating a Collection

There are three ways to create a collection:

1. **Right-click a folder in the Files navigator** (or the empty space below the folders, for the vault root) — Choose **New table**. Kokobrain writes `Untitled.view` in that folder (`Untitled 1.view` when the name is taken), with one table view named `All` and no filters, picks the folder and opens the file in the editor. The file carries `_visible: false` and `_open_in_editor: true`, so Views in the Types navigator does not list it and a click on it opens the table; to list it in Views, choose **Show in Views** on its row in the note list (see [View Files](25-types-and-relationships.md#creating-a-view)). To give it a name, rename its row in the note list.
2. **Inside a `.md` file** — Use a ` ```collection ` fenced code block to embed a collection inline (see [Inline Collection](#inline-collection-code-blocks)).
3. **Manually** — Create the file from any file manager or terminal — just make sure the extension is `.view`. Add `_visible: false` and `_open_in_editor: true` at the top to keep it out of Views.

When you open a `.view` file for the first time, Kokobrain will present an empty table ready for configuration.

## View Types

Each view inside a `.view` file needs a `type:` field selecting how the results are rendered. It has no default: a view without a `type`, or with a type not in this table, makes the file fail to parse, and the editor shows the parse error. Three types ship today:

| Type | What it looks like |
|------|--------------------|
| `table` | Spreadsheet-like grid with one row per matching note and one column per property. |
| `calendar` | Monthly calendar grid. Notes are placed on the day matching their `dateProperty`. Multi-day events span from `dateProperty` to `endDateProperty`. |
| `linear-calendar` | Horizontal timeline — same data as `calendar` but laid out as a Gantt-like bar chart. |

Calendar-style views read extra view fields: `dateProperty` (the start date, required), `endDateProperty`, `weekStartDay` and `colorProperty` (read by `linear-calendar` only). Their values and defaults are in the [per-view keys table](25-types-and-relationships.md#view-metadata-fields).

See `help/examples/collection-features/` for ready-to-run examples of each view type.

## The Table View

When you open a `.view` file in the editor, you see a spreadsheet-like table (the default view type):

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

A filter that does not parse (a typo such as `status = 'active'`, an unclosed quote, an unknown function, a malformed `and` / `or` / `not`) does not run at all: instead of the table, a **Filter error** box names the problem, with the toolbar still above it so you can fix the filter. This holds inside a NOT group too. An inline ` ```collection ` block shows the same message, and a `.view` picked in the rail shows it in the note list (see [When a View Cannot Be Shown](25-types-and-relationships.md#when-a-view-cannot-be-shown)).

The date operators **before**, **after**, **on or before** and **on or after** compare by calendar day, in local time, both on `file.ctime` / `file.mtime` and on a frontmatter date written as `YYYY-MM-DD` (`due: 2026-03-15`). **is** on `file.ctime` or `file.mtime` matches the whole day.

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

A single `.view` file can contain multiple named views. Each view has its own independent set of:

- Filters
- Sort order
- Visible columns
- View type (`table`, `calendar`, or `linear-calendar`)

When a file has more than one view, the collection editor renders a tab strip at the top — one tab per view name. Click a tab to switch the visible view. The Filter, Sort, and Properties toolbar panels rebind to the active view, so edits go into the view you are looking at. Files with a single view also show the tab strip with a single tab, alongside the controls described below.

### Managing views

The tab strip exposes three editing affordances:

- **Add a view** — click the **+** button at the end of the tab strip. A fresh `Untitled` table view is appended and selected, with the tab name pre-focused for renaming. Press **Enter** to confirm or **Escape** to keep the default name.
- **Rename a view** — double-click a tab, type the new name, then press **Enter** (or click elsewhere) to confirm. **Escape** discards the change. Empty or whitespace-only names are ignored.
- **Right-click a tab** for the full menu: **Rename**, **Change type** (Table / Calendar / Linear calendar), or **Delete view**. Delete is disabled when only one view remains — every `.view` must keep at least one view.

When you change a view's type, all calendar-specific keys (`dateProperty`, `endDateProperty`, `weekStartDay`, `colorProperty`) stay in the YAML even after switching to `table`. The table renderer ignores them, but they reappear unchanged when you switch back to a calendar layout, so toggling type does not lose configuration.

This is useful when you want different perspectives on the same data. For example, you might have one view called "Active Projects" that filters for `status: active`, and another called "Completed Projects" that filters for `status: done` — both defined in the same `.view` file.

> [!NOTE]
> When a `.view` file is picked in the **Types navigator** (instead of opened in the editor), only one view in the `views:` array is rendered, and the rest are ignored: the first one, or the one whose `name` the top-level `_rail_view` key gives (see [View Metadata Fields](25-types-and-relationships.md#view-metadata-fields)). The collection editor does not read `_rail_view`. The note list cannot draw calendar or linear-calendar layouts. Open the `.view` file in the editor to access the full multi-view experience with the tab strip.

## Result Limit

Each view can set a maximum number of results using a `limit` value. This is useful for dashboards where you only want to display a subset of matching notes, such as "Top 10 by priority" or "5 most recent meetings". The limit is taken after the view's `sort`, so set a `sort` to choose which notes are kept; with no `sort`, the first notes of the vault index are kept, in no meaningful order. In a `.view` the limit is taken last, after the list leaves out archived notes (unless a filter cites `archived` or `_archived`) and orders the rest (see [View Metadata Fields](25-types-and-relationships.md#view-metadata-fields)). In an inline block it is taken after the block leaves out the notes it never lists (see [Inline Collection](#inline-collection-code-blocks)).

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

An inline block lists notes by the same rule as a `.view`. It never lists notes in the system folder (Settings > Files & Folders > System folder), type definitions (`_type: Type`) or `.view` files, and no filter brings them back. It leaves out archived notes unless a filter, top-level or the view's own, cites `archived` or `_archived` (see [Filter Gotchas](#archived-and-_archived-are-different-fields-not-aliases) for what counts), so `archived == true` lists the archived notes. `limit` is taken after these notes are left out. The rows keep the order of the view's `sort` (index order with none): unlike a `.view`, a block has no `_sort` and no `_order` pins. A note you just saved is listed at once.

## Source Mode

Click the toggle button in the bottom-right corner of the collection editor to switch between the visual table and the raw YAML source.

### YAML structure

`.view` files and inline ` ```collection ` code blocks use the same format. The root accepts `filters` (a global filter applied to every view), `formulas`, `properties` (display-name config), and `views` (at least one required). Each view sets its own `type`, `name`, `filters`, `order` (the visible columns, in order), `sort`, and `limit`:

```yaml
filters: "file.hasTag('project')"   # Optional global filter
views:
  - type: table
    name: Active
    filters: "status == 'active'"    # Optional view-specific filter
    order:
      - file.name
      - status
      - date
      - tags
    sort:
      - column: date
        direction: DESC
    limit: 50
```

Notes on the format:

- Filters are string expressions (or `and` / `or` / `not` objects), not `{property, operator, value}` entries.
- `order` lists the columns to show; there is no `properties` array for column selection (`properties` only holds per-column `displayName` config).
- `sort` entries use `column` and an uppercase `direction` (`ASC` or `DESC`). The key `property` is accepted as an alias for `column`.

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
| `date(string)` | Parse a date from a string. A `YYYY-MM-DD` argument is local midnight and compares by day: `file.mtime > date('2024-01-01')` starts on 2024-01-02, and `==` matches the whole day |
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
| `file.name` | Filename with extension |
| `file.basename` | Filename without extension |
| `file.path` | Full absolute path |
| `file.folder` | Parent folder path |
| `file.ext` | File extension |
| `file.ctime` | Creation date |
| `file.mtime` | Last modified date |
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

Whatever you write in the `type:` frontmatter is normalised to first-letter-uppercase before it reaches the filter engine. A note with `type: person` is queried as `"Person"`. When you compare against the `type` identifier (or its canonical form `_type`) the engine uses case-insensitive equality, so all four forms below match the same notes:

```yaml
filters: 'type == "Person"'    # matches
filters: 'type == "person"'    # matches
filters: 'type == "PERSON"'    # matches
filters: '_type == "person"'   # matches (type == _type)
```

The relaxed comparison is scoped to the `type` / `_type` identifier only -- equality against other fields stays case-sensitive (`name == "alice"` will NOT match a note with `name: Alice`). It also only applies to `==` and `!=`; ordering operators (`<`, `>`, etc.) are not affected because the `type` field is a string label, not an ordered scalar.

#### Frontmatter aliases in filter identifiers

`type` is an alias for the canonical `_type` key both when parsing the note's frontmatter AND when used as an identifier in a filter expression. `type == "Person"` and `_type == "Person"` are equivalent. (The legacy `is_a` / `is a` spellings are no longer recognised.)

```yaml
# Note frontmatter accepts either spelling
type: Project         # stored canonically as: _type: Project

# Filter expressions accept either identifier
filters: 'type == "Project"'    # works
filters: '_type == "Project"'   # also works
```

The remaining aliases (`icon`, `color`, `sort`, `template`, etc. -- see the full list in [Types & Relationships > Frontmatter Key Aliases](25-types-and-relationships.md#frontmatter-key-aliases)) are recognised only on the frontmatter side. In filter expressions, use the canonical name (`_icon`, `_color`, ...).

#### `archived` and `_archived` are different fields, not aliases

The three lifecycle flags are the exception. Both spellings work in a filter, but they read different things:

| Written | Reads | When the note has no such frontmatter key |
|---------|-------|-------------------------------------------|
| `_archived` / `_organized` / `_favorite` | the raw frontmatter value | absent, so the expression sees `null` |
| `archived` / `organized` / `favorite` | the normalised lifecycle flag, always present | `archived` and `favorite` are `false`; **`organized` is `true`** |

`organized` defaults to `true` because a note without the flag counts as already organized (only the inbox marks notes `_organized: false`). That makes the two spellings genuinely disagree:

```yaml
filters: '!organized'    # matches only notes explicitly marked _organized: false
filters: '!_organized'   # matches every note that never wrote the key -- almost all of them
```

Prefer the flag spelling (`archived`, `organized`, `favorite`) when you mean lifecycle state, and the underscored spelling only when you specifically care whether the note wrote the key.

In a `.view` or an inline block, a filter that cites either spelling of `archived` decides on archived notes itself: the list no longer leaves them out, so `archived == true` lists the archived notes, and in a `.view` the rule line under the list header drops "not archived" (see [Archived Note Filtering](25-types-and-relationships.md#archived-note-filtering)). The name counts wherever it appears in the expression (`!_archived`, `note.archived`, `isEmpty(archived)`, `_archived.isEmpty()`), and so does `file.hasProperty('archived')` or `file.hasProperty('_archived')`. A string is not a citation, so `status == 'archived'` and `file.hasTag('archived')` keep the default, and neither is a formula the filter uses: a formula that reads `archived` does not count, and neither does a formula named `archived` (`formula.archived`).

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

Collection and QueryJS are separate: a collection runs its filters and formulas with its own expression language (above), and it does not run JavaScript. If you need programmatic access to your vault data beyond what the visual table provides, write a ` ```queryjs ` block with the QueryJS API. See [QueryJS](13-queryjs.md) for details.

## Next Steps

- [QueryJS](13-queryjs.md) — JavaScript API for advanced vault queries.
- [Sidebar Panels](07-sidebar-panels.md) — Properties panel for editing frontmatter across your notes.
