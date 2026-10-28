# 49: Calendar undo history follows renames and moves made elsewhere

**What to build:** the Calendar's undo/redo history keeps working on an event note that was renamed or moved outside the calendar (file explorer, wikilink rename, drag in the tree).

**Blocked by:** None

**Status:** ready-for-agent

- `remapPath` exists (`src/lib/features/event-calendar/event-calendar-history.logic.ts:79`) and is called only for the calendar's own renames (`event-calendar.service.ts:424-425`); external path changes (`path-change.service.ts::applyPathChange`) do not reach it, so an undo after an outside rename targets the old path.
- Register a path-change consumer (core must not import the feature, ADR-0003) that calls the history remap.

- [ ] Undo after an external rename or move applies to the note at its new path
- [ ] Tests for rename, folder move (children remapped) and delete (ops dropped)

## Comments

- 2026-10-28 19:03 — discovery — path-change consumer registry in applyPathChange + calendar consumer (remap overlay/history on rename and move, drop ops on delete, skip own changes); see work/49/discovery.md — 76e1a7ee
