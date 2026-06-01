# Kanban Board

Visualize and manage tasks as a drag-and-drop board with swimlane columns.

**Create a board:** Command Palette (`Cmd+P`) → **"New Kanban Board"**

---

## Overview

A Kanban board is a special file with the `.kanban` extension. When you open it, Kokobrain renders it as an interactive board instead of a text editor. The underlying file is plain Markdown — every change you make in the UI is immediately saved back to the file.

## Creating a Board

Open the Command Palette (`Cmd+P`) and run **"New Kanban Board"**. Kokobrain creates a `.kanban` file in your current folder with three default lanes: **To Do**, **In Progress**, and **Done**.

## View Modes

The board toolbar exposes three views of the same `.kanban` file. The selected view is stored in the board settings block and persists per file.

| View | Icon | What it shows |
|------|------|---------------|
| **Board** (default) | Grid | The classic swimlane board: one column per lane, drag-and-drop between lanes, lane settings, archive separator. |
| **List** | List | A stacked-list view: each lane becomes a section with a card count and a vertical list of cards. Useful for narrow windows or screen readers. |
| **Table** | Table | A flat table with columns for *Lane*, *Card*, *Tags*, *Date*, and *Status*. Best for scanning many cards at once or copy-pasting card text. |

List and Table are read-only with respect to layout (no drag-and-drop, no lane settings, no archive section), but you can still check / uncheck cards. Wikilinks remain clickable in List view; in Table view card text is shown as plain text. Switch back to **Board** to edit the structure.

## Board Anatomy

### Lanes (Columns)

Each column on the board is a **lane**. Lanes map to `## Heading` lines in the file:

```markdown
## To Do

## In Progress

## Done
```

You can:
- **Add a lane** — click the **Add Lane** button at the end of the lane row.
- **Rename a lane** — double-click the lane title to edit it inline, or right-click the title and choose Rename.
- **Reorder lanes** — drag a lane header (via the grip handle) to a new position.
- **Delete a lane** — right-click the lane title and choose Delete Lane.
- **Collapse a lane** — click the collapse icon in the lane header. Collapsed state is saved per board.
- **Resize a lane** — drag the resize handle on a lane's right edge (200-500 px). The width applies to all lanes and is saved per board.

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
- **Add a card** — type in the **Add a card...** input at the bottom of a lane and press `Enter` (or click the **+** button).
- **Edit a card** — double-click the card text to edit inline.
- **Check/uncheck a card** — click the checkbox on the card.
- **Move a card** — drag it to a different lane or position within the same lane.
- **Delete a card** — right-click the card and choose Delete.
- **Archive a card** — right-click the card and choose Archive. The card moves to the Archive section.
- **Right-click a card** — opens a context menu with Edit, Archive, Card Color (submenu with color swatches), and Delete.

### Wikilink Autocomplete

Type `[[` to trigger wikilink autocomplete, just like in the markdown editor. Autocomplete works both when editing a card inline (double-click the card text) and in the **Add a card...** input at the bottom of each lane, so you can link to a note while creating a card.

A dropdown of matching files appears below the input. Use these keys to choose one:

| Key | Action |
|-----|--------|
| `ArrowDown` / `ArrowUp` | Move the selection through the list (wraps at the ends) |
| `Enter` or `Tab` | Insert the selected file as `[[Note Name]]` |
| `Escape` | Cancel autocomplete navigation while keeping your text and staying in the input |

You can also click a suggestion to insert it. While the dropdown is open, `Enter` confirms the suggestion instead of adding the card or saving the edit, and `Escape` is captured by the dropdown so it does not cancel the card edit.

### Linked File Preview

When a card contains a `[[wikilink]]`, the linked file's content (without frontmatter) is loaded and displayed as a preview below the card text.

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Navigate between lanes and cards |
| `Enter` | Edit the focused card |
| `Space` | Toggle the focused card's checkbox |
| `Delete` / `Backspace` | Remove the focused card |
| `N` | Focus the add-card input in the current lane |
| `Escape` | Clear the keyboard focus |

### Archive

Below the active board (separated by a `---` line in the file) lives the **Archive**. Completed or archived cards are stored here and hidden from the main board view. Expand the Archive column, then use the restore icon to send a card back to the first lane, or the trash icon to delete it permanently.

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
| Yellow | Due today |
| Orange | Due tomorrow |
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

Tags are displayed as colored chips on the card. Click a tag chip to open a color popover and pick a color for that tag; the choice is stored in `settings.tagColors` and applied to every card using the tag.

### Wikilinks

Cards support `[[Note Name]]` wikilinks. Clicking a wikilink opens the linked note in the editor.

## Lane Settings

Each lane has additional configuration accessible by right-clicking the lane title:

| Setting | Description |
|---------|-------------|
| **Set Card Limit (WIP limit)** | Caps the number of cards in the lane. Choose from the preset limits (3, 5, 10, or 15 cards) or **No limit**. When the limit is reached, the lane border and count badge turn red as a warning, but you can still add more cards. |
| **Auto-Complete** | When a card is dragged into this lane, it is automatically marked as checked. Useful for "Done" lanes. |
| **Archive Completed** | Archives all checked items in the lane at once. Only shown when the lane has at least one checked card. |

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
  "viewMode": "board",
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

`viewMode` accepts `"board"` (default), `"list"`, or `"table"`.

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
