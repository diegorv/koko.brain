# Quick Capture & Templates

Learn three powerful tools for creating structured notes: Quick Capture for instant capture across three surfaces, 1:1 Notes for meetings, and Templates for reusable structures.

## Quick Capture — Instant Capture (3 surfaces, 1 settings block)

Quick Capture writes a new timestamped note into your vault without any prompt or dialog. Three triggers feed into the same folder / filename / per-kind template settings:

| Surface | Shortcut | What fires |
|---------|----------|------------|
| **Note composer** (in-editor) | `Cmd+N` | Creates a timestamped note and opens it in the main editor. Best when you are already inside Kokobrain. |
| **Composer popover** (global) | `Ctrl+Alt+Cmd+Space` | Floating 600×240 popover that summons over any frontmost app. Type, press `Cmd+Enter` to save, `Esc` to cancel. Focus returns to the previous app on dismiss. The popover closes only once the note is written; if the save fails or is not confirmed within about 3 seconds, it stays open with your text. Text you close without saving comes back the next time you open it. As in the editor, `#` suggests your tags and `[[` suggests your notes (by name or alias); `Enter` picks a suggestion, and `Esc` closes the list first, then the popover. Links offer Markdown notes only: canvas, kanban and other files, and headings of other notes, are not suggested here. |
| **Clipboard capture** (global, silent) | `Ctrl+Alt+Cmd+C` | No window. Reads the system clipboard, detects whether it is text, a URL, an image, or a file list, and writes the matching note immediately. |

The clipboard shortcut auto-classifies the payload into one of four **kinds** — `clip` (plain text), `link` (auto-detected URL), `shot` (image), `file` (anything else). The fifth kind, `note`, is what the composer surfaces (Cmd+N and the popover) write. Each kind picks its own template (see Settings).

![Quick capture popover summoned from another app](screenshots/quick-note.png)

### Configuration (Settings → Quick Capture)

| Setting | Description | Default |
|---------|-------------|---------|
| **Folder format** | dayjs format for the subfolder | `YYYY/MM-MMM` |
| **Filename format** | dayjs format for the note name | `[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS` |
| **Note template** (composer + Cmd+N) | Template file for free-form notes | `_system/templates/quick-capture/Composer-Note.md` |
| **Clip template** (clipboard text) | Template for non-URL text captures | `_system/templates/quick-capture/Clip-Note.md` |
| **Link template** (clipboard URL) | Template for auto-detected URLs | `_system/templates/quick-capture/Link-Note.md` |
| **Shot template** (clipboard image) | Template for clipboard images (saved to OS temp, embedded via `file://`) | `_system/templates/quick-capture/Shot-Note.md` |
| **File template** (clipboard files) | Template for non-image file paths in clipboard | `_system/templates/quick-capture/File-Note.md` |

Captures land under the **Notes folder of Periodic Notes** (configured in Settings → Periodic Notes → Notes folder), with the subfolder determined by the folder format. An empty template path means "no template — just write the rendered body."

### Source provenance (browser captures)

When the active app is Chrome or Safari at capture time, the browser tab's title and URL plus the app bundle id are captured and exposed to your template as the `sourceApp`, `sourceTitle`, and `sourceUrl` variables (see Template Variables below). A template that references them produces frontmatter like:

```yaml
source_app: com.google.Chrome
source_title: Example Page
source: https://example.com
```

Page titles often hold characters that YAML reads as syntax: `: ` (`How to X: a guide`), ` #` (`Release notes #12`), or a leading `[`, `*`, `&`, `!`, `>`, `@` or quote. When `<% title %>`, `<% sourceTitle %>`, `<% sourceApp %>`, `<% sourceUrl %>` or `<% url %>` is the whole value of a frontmatter key or list item, Quick Capture quotes it only when it needs to, so the property reads back exactly as captured:

```yaml
source_title: "How to X: a guide"
source_app: com.google.Chrome
```

Write the placeholder unquoted, as above. A placeholder you wrap in quotes yourself, or mix with other text on the line (`source_title: Read <% sourceTitle %>`), is pasted as-is, and you own its YAML. A trailing comment (`title: <% title %> # page title`) is fine. A captured empty value is written as `""`. In the note body (after the closing `---`) every variable is pasted as-is, without quotes.

For `note` / `clip` / `link` captures with a source URL, the rendered body also carries the source as a `> Source: [title](url)` footer. This footer is part of the rendered body, so it appears whether or not a per-kind template is configured (with a template, the body is appended after the processed template).

macOS will prompt for Apple Events permission the first time the AppleScript runs. Other apps still fill `sourceApp` from NSWorkspace; only `sourceTitle` + `sourceUrl` need the AppleScript.

### Template Variables

Quick Capture templates can use these additional variables:

| Variable | Value |
|---|---|
| `<% created %>` | ISO date-time when the note was created |
| `<% title %>` | Note title (link captures use the page title; otherwise the generated filename) |
| `<% year %>` | 4-digit year |
| `<% month %>` | Zero-padded month |
| `<% monthName %>` | Full month name |
| `<% kind %>` | Capture kind (`note` / `clip` / `link` / `shot` / `file`) |
| `<% sourceApp %>` | Bundle id of the foreground app at capture time |
| `<% sourceTitle %>` | Browser tab title (Chrome / Safari only) |
| `<% sourceUrl %>` | Browser tab URL (Chrome / Safari only) |
| `<% capturedAt %>` | ISO 8601 timestamp of the capture |
| `<% url %>` | Canonical URL (link captures only) |
| `<% content %>` | Rendered capture body (appended after the template as well) |
| `<% dailyNotePath %>` | Wikilink path to today's daily note |
| `<% dailyNoteDisplay %>` | Display name for today's daily note |

### Example

With default settings, pressing `Cmd+N` on Feb 17, 2026 at 2:30pm creates:

```
<vault>/_notes/2026/02-Feb/capture-note-2026-02-17_14-30-00-000.md
```

The `_notes/` prefix is the default Notes folder of Periodic Notes; change it under Settings -> Periodic Notes -> Notes folder.

> [!TIP]
> Quick Capture is great for a "capture inbox" workflow: jot or paste things throughout the day from any app, then review and organize them later. The popover and clipboard shortcuts work even when Kokobrain is in the background — your previous app keeps focus.

---

## 1:1 Notes — Meeting Notes with People

**Shortcut:** `Cmd+Shift+N`

1:1 Notes open a person picker dialog that lists people from two configured folders — a **personal** people folder and a **work** people folder — so you can keep contexts separate while sharing one shortcut. Select a person to create a dated meeting note for that individual.

![Person picker for 1:1 notes](screenshots/one-on-one-picker.png)

### How it works

1. Press `Cmd+Shift+N` — the picker dialog opens.
2. Type to search for a person's name. Personal and work people are listed together, each badged with its origin.
3. Press Enter to select — a new meeting note is created from your template.

The **New 1:1** button in the [note action bar](03-editor.md#note-action-bar) of a Person note creates the same note for that person without the picker.

Every new 1:1 note gets `_related_to: "[[Person]]"` in its frontmatter, even when the template does not write it; a template that already writes that link is kept as is. That link is what ties the note to the person. If the template's frontmatter is not valid YAML (for example `title: 1:1: Alice`, which needs quotes), the note is not created and "Failed to create 1:1 note." is shown: fix the template's frontmatter and try again.

### My people on Today

The Today list in the rail shows **My people** above the day's notes: every `.md` file directly in the work people folder, with the days since the last 1:1 (`5d`, or `never`). A note counts as a 1:1 with a person when its `_related_to` links that person, wherever the note lives; its day is its note date (`date`, else `created`, else the file's creation time). A person only mentioned in a note's body (a daily note, say) does not count, and neither does a note dated after today. People with no 1:1, or none for more than **1:1 due after (days)**, are shown in the warning color, most overdue first. Click a name to open the person; **New 1:1** on the row creates today's 1:1 for them.

### Setting up people

- Create one or two folders in your vault for people files. The defaults are `Personal/_people` and `Work/_people`, but any path works.
- Add a `.md` file for each person: `Personal/_people/Alice Smith.md`, `Work/_people/Bob Jones.md`.
- The file content can be anything (contact info, notes about them, etc.).
- Leave one of the folder settings blank if you only want a single people list.

### Configuration (Settings → 1:1 Notes)

| Setting | Description | Default |
|---------|-------------|---------|
| **Personal people folder** (`peopleFolder`) | Folder containing personal person files | `Personal/_people` |
| **Work people folder** (`workPeopleFolder`) | Folder containing work person files | `Work/_people` |
| **Folder format** | dayjs format for meeting note subfolder | `YYYY/MM-MMM` |
| **Filename format** | dayjs format with `{person}` placeholder | `[-1on1-]{person}[-]DD-MM-YYYY` |
| **Template** | Path to a template file | `_system/templates/periodic-note/One-On-One.md` |
| **1:1 due after (days)** (`dueAfterDays`) | Today's My people flags a work person with no 1:1 for more than this many days | `14` |

The `{person}` placeholder is replaced with the selected person's name.

1:1 notes are placed under the **Notes folder of Periodic Notes** (configured in Settings → Periodic Notes → Notes folder).

### Template Variables

1:1 note templates can use these additional variables:

| Variable | Value |
|---|---|
| `<% created %>` | ISO date-time when the note was created |
| `<% year %>` | 4-digit year |
| `<% month %>` | Zero-padded month |
| `<% monthName %>` | Full month name |
| `<% person %>` | Name of the selected person |
| `<% dailyNotePath %>` | Wikilink path to today's daily note |
| `<% dailyNoteDisplay %>` | Display name for today's daily note |

### Example

Selecting "Alice Smith" on Feb 17, 2026 with the default settings creates:

```
<vault>/_notes/2026/02-Feb/-1on1-Alice Smith-17-02-2026.md
```

---

## Templates — Reusable Note Structures

Templates are `.md` files that serve as starting points for new notes. Instead of starting from a blank page, you choose a template and get pre-filled content.

### Creating a template

1. Create a templates folder in your vault (default: `_system/templates`).
2. Add any `.md` file to it — this becomes a template.
3. Write whatever content you want as the starting structure.

### Using a template

1. Open the Command Palette (`Cmd+P`).
2. Type "New File from Template."
3. A picker shows all templates in your templates folder.
4. Select a template, then type a filename for the new note.
5. Press Enter — the new note is created with the template content.

![Template picker dialog](screenshots/template-picker.png)

**Configure the templates folder** in Settings → Files & Folders → Templates folder (default: `_system/templates`).

New notes from templates are created at the **vault root**.

> [!NOTE]
> On vault initialization, Kokobrain auto-creates the templates folder and placeholder files for all configured periodic note, Quick Capture per-kind, and 1:1 note templates if they don't exist yet.

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

### Meeting note template (`_system/templates/meeting.md`)

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

### Project note template (`_system/templates/project.md`)

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

### Book note template (`_system/templates/book.md`)

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
