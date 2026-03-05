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

A monthly calendar grid sits at the top of the right sidebar. It acts as a visual navigator for your periodic notes.

![Calendar panel with dot indicators](screenshots/calendar.png)

- **Dot indicators** appear below each day that already has a daily note, so you can see at a glance which days have entries.
- **Click a day** to open the daily note for that date. If the note does not exist yet, Kokobrain creates it for you.
- **Click a week number** (the left column) to open or create the weekly note for that week.
- **Click the month name** to open or create the monthly note.
- **Click the quarter badge** (Q1, Q2, Q3, or Q4) to open or create the quarterly note.
- Use the arrow buttons (< >) to navigate between months.

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

### Adding a property

1. Click the **"+"** button at the top of the Properties panel.
2. Type the property name and press Enter.
3. Enter the value.

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

The panel is divided into two sections:

- **Linked mentions** — Notes that contain an explicit `[[wikilink]]` pointing to this note.
- **Unlinked mentions** — Notes that mention the current note's name as plain text, without wrapping it in a wikilink.

Click any backlink to open that source note.

### Why backlinks matter

Backlinks let you discover connections you might not remember. If you link to "Project X" from multiple meeting notes, the backlinks panel on "Project X" shows all those meetings — creating a reverse index of your knowledge. You never have to manually maintain a list of related notes; the backlinks panel builds one for you automatically.

---

## Outgoing Links

The Outgoing Links panel shows all `[[wikilinks]]` found in the currently open note. It is the complement of Backlinks: instead of showing what points here, it shows what this note points to.

The panel is divided into two sections:

- **Links** — Resolved wikilinks where the target note exists. These are shown as clickable links.
- **Unlinked mentions** — Notes whose names appear as plain text in your note but are not linked with `[[]]`.

Unresolved links (where the target note does not exist yet) are highlighted with a warning icon. This is useful for seeing at a glance what your note references and whether any links are broken.

---

## Tags

The Tags panel shows all `#tags` used across your entire vault, organized in a hierarchical tree. Nested tags create a tree structure: `#work/meetings` shows as **work** > **meetings**.

![Tags panel with hierarchical tree](screenshots/tags.png)

### Controls at the top

- **Sort** — Toggle between A-Z (alphabetical) and by count (most used first).
- **Filter** — A text input to narrow the tag list by name.
- **Hide rare tags** — Toggle to hide tags used only once or twice.

### Clicking a tag

Clicking a tag opens the Search panel filtered to that tag. It sets the search query to `tag:tagname`, showing all notes that contain that tag.

> [!TIP]
> Use nested tags for organization: `#project/alpha`, `#project/beta`. The Tags panel groups them into a collapsible tree, keeping your tag list tidy even as it grows.

---

## Customizing the Sidebar

Go to **Settings > Sidebar** to:

- Toggle each panel on or off individually: Calendar, Properties, Backlinks, Outgoing Links, Tags.
- Enable or disable Folder Notes.

You can keep only the panels you use most, reducing visual clutter in the sidebar.

---

## Next Steps

- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) — Set up daily, weekly, monthly, and quarterly notes.
- [Wikilinks & References](05-wikilinks.md) — Learn how links work in Kokobrain.
