# Kanban Board

Visualize and manage tasks as a drag-and-drop board with swimlane columns.

**Create a board:** Command Palette (`Cmd+P`) → **"New Kanban Board"**

---

## Overview

A Kanban board is a special file with the `.kanban` extension. When you open it, Kokobrain renders it as an interactive board instead of a text editor. The underlying file is plain Markdown — every change you make in the UI is immediately saved back to the file.

## Creating a Board

Open the Command Palette (`Cmd+P`) and run **"New Kanban Board"**. Kokobrain creates a `.kanban` file in your current folder with three default lanes: **To Do**, **In Progress**, and **Done**.

## Board Anatomy

### Lanes (Columns)

Each column on the board is a **lane**. Lanes map to `## Heading` lines in the file:

```markdown
## To Do

## In Progress

## Done
```

You can:
- **Add a lane** — click the **+** button at the end of the lane row.
- **Rename a lane** — click the lane title to edit it inline.
- **Reorder lanes** — drag a lane header to a new position.
- **Delete a lane** — open the lane menu (⋯) and choose Delete.
- **Collapse a lane** — click the collapse icon in the lane header. Collapsed state is saved per board.

### Cards

Each card is a Markdown task item inside a lane:

```markdown
## To Do

- [ ] Write project proposal
- [ ] Schedule kickoff meeting

## Done

- [x] Define requirements
```

- `- [ ]` = unchecked card
- `- [x]` = checked (completed) card

You can:
- **Add a card** — click **+ Add card** at the bottom of a lane.
- **Edit a card** — click the card text to edit inline.
- **Check/uncheck a card** — click the checkbox on the card.
- **Move a card** — drag it to a different lane or position within the same lane.
- **Delete a card** — hover the card and click the delete icon.
- **Archive a card** — hover the card and click the archive icon. The card moves to the Archive section.

### Archive

Below the active board (separated by a `---` line in the file) lives the **Archive**. Completed or archived cards are stored here and hidden from the main board view. You can restore archived cards back to any lane.

## Card Metadata

Cards support inline metadata tokens appended to the card text. These are stored directly in the file and rendered visually on the card.

### Due Dates

Append a date in `{YYYY-MM-DD}` format:

```
- [ ] Submit report {2024-03-15}
```

The card shows a color-coded date badge:

| Color | Meaning |
|-------|---------|
| Red | Overdue |
| Orange | Due today |
| Yellow | Due tomorrow |
| Blue | Due within 3 days |
| Gray | Future date |

Click the date badge to change or remove the date via a date picker.

### Card Colors

Append `{color:name}` to highlight a card:

```
- [ ] Critical bug fix {color:red}
- [ ] Nice to have {color:gray}
```

Available colors: `blue`, `green`, `red`, `orange`, `purple`, `yellow`, `gray`.

### Inline Tags

Add `#tags` anywhere in the card text:

```
- [ ] Refactor auth module #backend #tech-debt
```

Tags are displayed as colored chips on the card. You can assign a color to each tag in the board settings.

### Wikilinks

Cards support `[[Note Name]]` wikilinks. Clicking a wikilink opens the linked note in the editor.

## Lane Settings

Each lane has additional configuration accessible via the lane menu (⋯):

| Setting | Description |
|---------|-------------|
| **Max items (WIP limit)** | Maximum number of cards allowed in the lane. When the limit is reached, adding more cards is blocked. `0` = unlimited. |
| **Auto-complete** | When a card is dragged into this lane, it is automatically marked as checked. Useful for "Done" lanes. |

## Filtering Cards

Use the **filter bar** at the top of the board to search across all cards. The filter is case-insensitive and matches card text, tags, and wikilinks.

## Sorting Cards

Via the board toolbar, choose a sort mode per lane:

| Mode | Description |
|------|-------------|
| **Manual** (default) | Drag-and-drop order |
| **Text A→Z / Z→A** | Alphabetical by card text |
| **Date (oldest first / newest first)** | Sorts by the `{YYYY-MM-DD}` token |
| **Unchecked first** | Incomplete cards float to the top |

## Board Settings Block

Board-level settings (lane widths, collapsed state, sort mode, tag colors, etc.) are stored in a special comment block at the bottom of the `.kanban` file:

```
%% kanban:settings
{
  "sortMode": "manual",
  "laneSettings": {
    "Done": { "autoComplete": true },
    "In Progress": { "maxItems": 3 }
  },
  "tagColors": {
    "backend": "blue",
    "urgent": "red"
  }
}
%%
```

This block is invisible in the board UI and is managed automatically. You can edit it manually if needed, but be careful with JSON syntax.

## File Format Reference

A complete `.kanban` file looks like this:

```markdown
## Backlog

- [ ] Research competitors
- [ ] Define MVP scope

## In Progress

- [ ] Build login screen {2024-03-10} #frontend
- [ ] Set up CI pipeline {color:orange}

## Done

- [x] Kickoff meeting
- [x] Project setup

---

## Archive

- [x] Initial brainstorm

%% kanban:settings
{
  "laneSettings": {
    "Done": { "autoComplete": true }
  }
}
%%
```

> [!TIP]
> Because `.kanban` files are plain Markdown, you can open them in any text editor, commit them to Git, and diff them like any other file.

> [!NOTE]
> The `.kanban` extension is what triggers the Kanban view. Files with `.md` extension will not be opened as boards even if they use the same syntax.

---

## Next Steps

- [Tasks & Todoist](10-tasks-and-todoist.md) — Aggregate tasks from all notes into a filtered list
- [Collection](12-collection.md) — Query and filter notes as a table view
