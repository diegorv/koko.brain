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

There are two ways to create a collection:

1. **From the file explorer:** Create a new file and give it a `.collection` extension (e.g., `projects.collection`).
2. **Manually:** You can also create the file from any file manager or terminal — just make sure the extension is `.collection`.

When you open a `.collection` file for the first time, Kokobrain will present an empty table ready for configuration.

## The Table View

When you open a `.collection` file, you see a spreadsheet-like table:

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

A single `.collection` file can contain multiple named views. Each view has its own independent set of:

- Filters
- Sort order
- Visible columns

Switch between views using the tabs at the top of the collection editor.

This is useful when you want different perspectives on the same data. For example, you might have one view called "Active Projects" that filters for `status: active`, and another called "Completed Projects" that filters for `status: done` — both defined in the same `.collection` file.

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
