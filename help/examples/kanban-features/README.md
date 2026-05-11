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

## Feature coverage cheat sheet

| Feature | Where to see it |
|---------|-----------------|
| Lane (`## Heading`) | All three files |
| Card (`- [ ]` / `- [x]`) | All three files |
| Archive (after `---`) | `release-checklist.kanban` only |
| Date metadata (`{YYYY-MM-DD}`) | All three files |
| Card color (`{color:NAME}`) | `release-checklist.kanban`, `personal-week.kanban` |
| Inline tag (`#tag`) | All three files |
| Wikilink (`[[Note]]`) | `release-checklist.kanban`, `personal-week.kanban` |
| Settings block (`%% kanban:settings %%`) | All three files |
| `laneSettings.<lane>.maxItems` | `release-checklist.kanban` |
| `laneSettings.<lane>.autoComplete` | `release-checklist.kanban` |
| `tagColors` | All three files |
| `viewMode` | One per file (see table above) |

Copy any of these into your vault as starting points — the file extension
(`.kanban`) is what tells Kokobrain to render the board UI.
