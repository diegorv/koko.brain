# Quick Notes & Templates

Learn three powerful tools for creating structured notes: Quick Note for instant capture, 1:1 Notes for meetings, and Templates for reusable structures.

## Quick Note — Instant Capture

**Shortcut:** `Cmd+N`

Quick Note creates a new timestamped note immediately, without any prompt or dialog. Press the shortcut and start typing right away. It is perfect for capturing a thought, idea, or link before you forget.

![Quick note created automatically](screenshots/quick-note.png)

### Configuration (Settings → Quick Note)

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder format** | dayjs format for the subfolder | `YYYY/MM-MMM` |
| **Filename format** | dayjs format for the note name | `capture-note-YYYY-MM-DD_HH-mm-ss-SSS` |
| **Template** | Path to a template file (optional) | — |

### Example

With default settings, pressing `Cmd+N` on Feb 17, 2026 at 2:30pm creates:

```
<vault>/2026/02-Feb/capture-note-2026-02-17_14-30-00-000.md
```

> [!TIP]
> Quick Notes are great for a "capture inbox" workflow: quickly jot things down throughout the day, then review and organize them later.

---

## 1:1 Notes — Meeting Notes with People

**Shortcut:** `Cmd+Shift+N`

1:1 Notes open a person picker dialog showing people from your configured "people folder." Select a person to create a dated meeting note for that individual.

![Person picker for 1:1 notes](screenshots/one-on-one-picker.png)

### How it works

1. Press `Cmd+Shift+N` — the picker dialog opens.
2. Type to search for a person's name.
3. Press Enter to select — a new meeting note is created from your template.

### Setting up people

- Create a folder in your vault for people files (e.g., `_people/`).
- Add a `.md` file for each person: `_people/Alice Smith.md`, `_people/Bob Jones.md`.
- The file content can be anything (contact info, notes about them, etc.).

### Configuration (Settings → 1:1 Notes)

| Setting | Description | Default |
|---------|-------------|---------|
| **People folder** | Folder containing person files | `_people` |
| **Folder format** | dayjs format for meeting note subfolder | — |
| **Filename format** | dayjs format with `{person}` placeholder | `[-1on1-]{person}[-]DD-MM-YYYY` |
| **Template** | Path to a template file (optional) | — |

The `{person}` placeholder is replaced with the selected person's name.

### Example

Selecting "Alice Smith" on Feb 17, 2026 with the default format creates:

```
<vault>/-1on1-Alice Smith-17-02-2026.md
```

---

## Templates — Reusable Note Structures

Templates are `.md` files that serve as starting points for new notes. Instead of starting from a blank page, you choose a template and get pre-filled content.

### Creating a template

1. Create a templates folder in your vault (default: `_templates/`).
2. Add any `.md` file to it — this becomes a template.
3. Write whatever content you want as the starting structure.

### Using a template

1. Open the Command Palette (`Cmd+P`).
2. Type "New File from Template."
3. A picker shows all templates in your templates folder.
4. Select a template, then type a filename for the new note.
5. Press Enter — the new note is created with the template content.

![Template picker dialog](screenshots/template-picker.png)

**Configure the templates folder** in Settings → Templates → Folder (default: `_templates`).

---

## Template Syntax

Templates support a Templater-compatible expression syntax using `<% ... %>` delimiters.

### Available expressions

| Expression | Result | Example output |
|-----------|--------|----------------|
| `<% tp.file.title %>` | The new note's filename (without `.md`) | `Meeting Notes` |
| `<% tp.date.now("YYYY-MM-DD") %>` | Current date in any format | `2026-02-17` |
| `<% tp.date.now("DD/MM/YYYY") %>` | Current date, different format | `17/02/2026` |
| `<% tp.date.now("YYYY-MM-DD", -1) %>` | Yesterday's date (offset by -1 day) | `2026-02-16` |
| `<% tp.date.now("YYYY-MM-DD", 7) %>` | Date 7 days from now | `2026-02-24` |
| `<% tp.date.now("YYYY-MM-DD", 0, tp.file.title, "YYYY-MM-DD") %>` | Parse date from filename, reformat | varies |

### String concatenation

```
<% "Author: " + tp.file.title %>
```

Result: `Author: My Note Title`

### Custom variables

Periodic note templates have additional variables (like `yesterdayPath`, `dailyLinksTable`) — see [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md).

---

## Example Templates

### Meeting note template (`_templates/meeting.md`)

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
type: meeting
attendees: []
tags: [meeting]
---

# <% tp.file.title %>

## Attendees
-

## Agenda
1.

## Discussion Notes


## Action Items
- [ ]

## Follow-up
```

### Project note template (`_templates/project.md`)

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
status: active
type: project
tags: [project]
---

# <% tp.file.title %>

## Overview


## Goals
- [ ]

## Timeline


## Resources


## Notes
```

### Book note template (`_templates/book.md`)

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
type: book
author:
rating:
tags: [book]
---

# <% tp.file.title %>

## Summary


## Key Ideas
1.

## Quotes
>

## My Thoughts
```

> [!TIP]
> Start with 2-3 templates for your most common note types. You can always add more as your workflow evolves.

---

## Next Steps

- [Periodic Notes & Calendar](08-periodic-notes-and-calendar.md) — Daily/weekly/monthly/quarterly/yearly templates with navigation variables
- [Tasks & Todoist](10-tasks-and-todoist.md) — Track tasks across your vault
