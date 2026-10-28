# 49: Calendar undo history follows renames and moves made elsewhere

**What to build:** the Calendar's undo/redo history keeps working on an event note that was renamed or moved outside the calendar (file explorer, wikilink rename, drag in the tree).

**Blocked by:** None

**Status:** ready-for-agent

- `remapPath` exists (`src/lib/features/event-calendar/event-calendar-history.logic.ts:79`) and is called only for the calendar's own renames (`event-calendar.service.ts:424-425`); external path changes (`path-change.service.ts::applyPathChange`) do not reach it, so an undo after an outside rename targets the old path.
- Register a path-change consumer (core must not import the feature, ADR-0003) that calls the history remap.

- [x] Undo after an external rename or move applies to the note at its new path
- [x] Tests for rename, folder move (children remapped) and delete (ops dropped)

## Comments

- 2026-10-28 19:03 — discovery — path-change consumer registry in applyPathChange + calendar consumer (remap overlay/history on rename and move, drop ops on delete, skip own changes); see work/49/discovery.md — 76e1a7ee
- 2026-10-28 19:08 — implement — path-change registry (6e83ee31) + calendar consumer, title follow, own-change skip, lifecycle wiring; pnpm check 0 errors, touched suites 36 files / 1383 passed — a1693747
- 2026-10-28 19:13 — review — CHANGES_REQUESTED: outside-change overlay never expires for unindexed targets (ghost event), delete branch keeps the overlay, in-flight write race, CLAUDE.md registry note; see work/49/review.md — 0a438c62
- 2026-10-28 19:15 — fix — review findings 1-4: version clock on the outside-change overlay, delete tombstone, in-flight race documented, CLAUDE.md registry clause; touched suites 35 files / 1344 passed — 7c641c3a
