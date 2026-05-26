# Type Panel Layout (Three-Panel Types Mode)

Transform types mode from a single sidebar with inline notes into a three-panel layout:
`[Left Sidebar] [Middle Panel] [Editor]`

## Motivation

Inspired by Tolaria's three-panel layout. When in types mode, clicking a type in the left sidebar should populate a middle panel with that type's notes, rather than expanding inline. This provides a cleaner browsing experience, especially with many notes per type.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Panel model | One type at a time in middle panel |
| Left sidebar | Keeps current width. Adds top nav (Inbox, All Notes, Archive, Favorites). Type list = names + counts only, no inline notes. |
| Click type | Selects + highlights, populates middle panel |
| Middle panel | Always visible in types mode. Disappears in files/calendar mode. |
| Note cards | Title + icon + modified date |
| Click note | Opens in new editor tab |
| Panel header | Type/nav name + "+" create button (types only) |
| Bottom tabs | Open/Archived (Tolaria style). Shown for types + "All Notes". Hidden for Inbox/Archive/Favorites. |
| Filters | Moved from left sidebar tabs to middle panel scope |
| Resizing | PaneForge handle, ~20% default, min 15%, max 35%, persisted |
| Mode switch | Middle panel disappears in files/calendar mode |

## Layout

```
+------------------+------------------+--------------------------+
| LEFT SIDEBAR     | MIDDLE PANEL     | EDITOR                   |
|                  | (~20%, resizable)|                          |
| [Daily] [Mode]   |                  |                          |
|                  | Responsibilities |                          |
| Inbox        (2) |              [+] |                          |
| All Notes   (26) | ---------------- |                          |
| Archive      (5) | [icon] Title     |                          |
| Favorites    (3) |    May 25, 2026  |                          |
| ----- TYPES ---- | ---------------- |                          |
| * Resp.      (4) | [icon] Title     |                          |
|   Ops        (2) |    May 24, 2026  |                          |
|   Projects   (3) |                  |                          |
|   Tasks      (5) |                  |                          |
|   Events     (1) |                  |                          |
|   ...            |                  |                          |
| ---------------- |                  |                          |
|   Untyped    (3) | [Open 3][Arch 1] |                          |
+------------------+------------------+--------------------------+
```
