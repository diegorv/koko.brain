# Sidebar Panels

Learn about the right sidebar panels: Backlinks, Outgoing Links, Tags, Properties, and Calendar.

The right sidebar provides contextual information about the note you are currently editing. Each panel surfaces a different perspective on your content — from metadata and tags to links pointing in and out of the note.

---

## Opening and Closing the Sidebar

- Press **Cmd+B** to toggle the entire right sidebar on or off.
- Each individual panel can be shown or hidden in **Settings > Sidebar**.
- The sidebar updates automatically as you switch between notes, always reflecting the note you are currently editing.

---

## Calendar

The calendar is a left sidebar mode (alongside File Explorer and Type View). Click the calendar icon in the sidebar header to switch to it. It acts as a visual navigator for your periodic notes.

![Calendar panel with dot indicators](screenshots/calendar.png)

- **Dot indicators** appear below each day that has files created on that date (based on frontmatter `created` property or filesystem creation date), so you can see at a glance which days have activity.
- **Click a day** to select it and view a list of files created on that date below the calendar. To open or create a daily note, click the **Daily Note** button in the calendar header.
- **Click a week number** (the left column) to open or create the weekly note for that week.
- **Click the month name** to open or create the monthly note.
- **Click the quarter badge** (Q1, Q2, Q3, or Q4) to open or create the quarterly note.
- Use the arrow buttons (< >) to navigate between months.
- **Double-click the month name** to jump back to today.
- **ISO week numbers** are shown on the left column. Weeks start on Monday.

> [!TIP]
> The calendar is the quickest way to navigate your periodic notes. See [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) for full details.

---

## Properties (Frontmatter Editor)

The Properties panel shows the YAML frontmatter of the current note as editable fields. Instead of editing raw YAML, you can visually add, edit, and remove properties.

![Properties panel with editable fields](screenshots/properties.png)

### Supported field types

| Type | How it looks | Example value |
|------|-------------|---------------|
| Text | Free text input | `"Meeting notes"` |
| Number | Numeric field | `42` |
| Date | Date picker (YYYY-MM-DD) | `2026-02-17` |
| Checkbox | Toggle switch | `true` / `false` |
| List | Multi-value text list | `["tag1", "tag2"]` |

### Lifecycle Actions

If the current note has a type defined, lifecycle action buttons appear at the top of the Properties panel: **Organize**, **To Inbox**, **Archive**, **Unarchive**, and **Favorite**. These change the note's `_lifecycle` property. See [Types & Relationships](25-types-and-relationships.md) for details.

### Adding a property

1. Click the **"+"** button at the top of the Properties panel.
2. Type the property name and press Enter.
3. Enter the value.

For relationship properties (fields that hold wikilinks), a **"+"** search button appears next to the field, letting you search your vault and pick a note to add as a relationship link.

### Editing a property

- Click the value field to edit it.
- Click the property name to rename it.
- The type is auto-detected from the value (number, date, boolean, or text).

### Removing a property

- Hover over a property and click the delete (x) button.

> [!NOTE]
> Changes in the Properties panel are immediately written back to the YAML frontmatter in the file. You can see the raw YAML by scrolling to the top of the note in source mode.

---

## Backlinks

The Backlinks panel shows which other notes link **to** the currently open note. This creates a reverse index of your knowledge, letting you discover connections you might not remember.

![Backlinks panel showing linked and unlinked mentions](screenshots/backlinks.png)

The panel shows **linked mentions** — notes that contain an explicit `[[wikilink]]` pointing to this note. Click any backlink to open that source note.

### Relationship Backlinks

Below the linked mentions, a **Relationships** section shows notes that reference the current note through frontmatter relationship fields (`_belongs_to`, `_related_to`, `_has_many`, or custom wikilink-bearing fields). Each entry shows the source note and the relationship label (e.g. `belongs to`, `has many`, or a custom field name). See [Types & Relationships](25-types-and-relationships.md) for details.

### Why backlinks matter

Backlinks let you discover connections you might not remember. If you link to "Project X" from multiple meeting notes, the backlinks panel on "Project X" shows all those meetings — creating a reverse index of your knowledge. You never have to manually maintain a list of related notes; the backlinks panel builds one for you automatically.

---

## Outgoing Links

The Outgoing Links panel shows all `[[wikilinks]]` found in the currently open note. It is the complement of Backlinks: instead of showing what points here, it shows what this note points to.

The panel shows all outgoing links — resolved wikilinks (clickable) and unresolved links (highlighted with a warning icon, where the target note does not exist yet). This is useful for seeing at a glance what your note references and whether any links are broken.

---

## Tags

The Tags panel shows all `#tags` used across your entire vault, organized in a hierarchical tree. Nested tags create a tree structure: `#work/meetings` shows as **work** > **meetings**.

![Tags panel with hierarchical tree](screenshots/tags.png)

### Controls at the top

- **Sort** — Toggle between A-Z (alphabetical) and by count (most used first).
- **Filter** — A text input to narrow the tag list by name.
- **Hide rare tags** — Toggle to hide tags with fewer than 10 uses.

### Clicking a tag

Clicking a tag name opens the Search panel filtered to that tag. It sets the search query to `tag:tagname`, showing all notes that contain that tag.

You can also open Tags as a **dedicated virtual tab** via the Command Palette: `Cmd+P` → "Toggle Tags View".

### Tag colors

A small colored dot sits to the left of each tag name. Click the dot to open the **Tag Color Picker** popover.

- Pick one of the preset colors to tint the tag.
- Pick the **custom color** swatch to open a native color picker for any hex value.
- Pick the **No color** option (the `×` swatch) to clear the assignment.

Tag colors are stored under `tagColors.colors` in your settings and apply everywhere the tag is rendered: the Tags panel, inline `#tags` in notes, and editor decorations.

> [!TIP]
> Use nested tags for organization: `#project/alpha`, `#project/beta`. The Tags panel groups them into a collapsible tree, keeping your tag list tidy even as it grows.

---

## Customizing the Sidebar

Go to **Settings > Sidebar** to:

- Toggle each panel on or off individually: Properties, Backlinks, Outgoing Links, Table of Contents.
- Enable or disable Folder Notes.

You can keep only the panels you use most, reducing visual clutter in the sidebar.

---

## Next Steps

- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) — Set up daily, weekly, monthly, and quarterly notes.
- [Wikilinks & References](05-wikilinks.md) — Learn how links work in Kokobrain.
