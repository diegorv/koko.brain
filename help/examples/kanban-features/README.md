# Kanban examples

Three `.kanban` files, one per view mode, demonstrating the full feature
surface documented in [21-kanban.md](../../documentation/21-kanban.md).

| File | `viewMode` | What to look for |
|------|-----------|-------------------|
| `release-checklist.kanban` | `board` | Four lanes, archive section, WIP limits on "In Progress" and "Blocked", auto-complete on "Done", date metadata, color tints, tags, and wikilink-bearing cards. |
| `personal-week.kanban` | `list` | Compact stacked list view. Demonstrates `sortMode: "unchecked"` (unfinished cards float up). |
| `sprint-table-view.kanban` | `table` | Spreadsheet-style table with one row per card. Demonstrates `sortMode: "date-asc"` and per-tag color mapping in the Tags column. |

Toggle between the three view modes from the board toolbar — the layout
button group on the top-left switches Board → List → Table.

## Inside a large vault

A board reads only its own file, so these boards show the same cards in any
vault. Card wikilinks are the exception: Kokobrain resolves them by note
name across the whole vault, and a linked card previews that note. Every
card link here points to a note in `notes/` with a `kanban-example-` name
(`[[kanban-example-okrs|OKRs]]`), so a card never previews one of your own
notes called "OKRs" or "Weekly Review". Keep `notes/` next to the boards
when you copy them; without it the links show as unresolved.

## Feature coverage cheat sheet

| Feature | Where to see it |
|---------|-----------------|
| Lane (`## Heading`) | All three files |
| Card (`- [ ]` / `- [x]`) | All three files |
| Archive (after `---`) | `release-checklist.kanban` only |
| Date metadata (`{YYYY-MM-DD}`) | All three files |
| Card color (`{color:NAME}`) | `release-checklist.kanban`, `personal-week.kanban` |
| Inline tag (`#tag`) | All three files |
| Wikilink (`[[note\|Display]]`) | `release-checklist.kanban`, `personal-week.kanban` (targets in `notes/`) |
| Settings block (`%% kanban:settings %%`) | All three files |
| `laneSettings.<lane>.maxItems` | `release-checklist.kanban` |
| `laneSettings.<lane>.autoComplete` | `release-checklist.kanban` |
| `tagColors` | All three files |
| `viewMode` | One per file (see table above) |

## Interactions not shown in file format

These features are UI-only and cannot be demonstrated in static files:

| Feature | How to use |
|---------|-----------|
| **Keyboard navigation** | Arrow keys navigate lanes/cards, Enter edits, Space toggles checkbox, Delete removes, N adds card |
| **Card context menu** | Right-click a card for Edit, Archive, Card Color (color picker submenu), Delete |
| **Wikilink autocomplete** | Type `[[` while editing a card to get file suggestions |
| **Linked file preview** | Cards with `[[wikilink]]` show the linked file's content below the card |
| **Drag and drop** | Drag cards between lanes or reorder within a lane (Board view) |
| **Lane context menu** | Click lane menu (three dots) for rename, max items, auto-complete, archive completed, delete |
| **Date picker** | Click a date badge on a card to open an interactive date picker |

Copy any of these into your vault as starting points — the file extension
(`.kanban`) is what tells Kokobrain to render the board UI.
