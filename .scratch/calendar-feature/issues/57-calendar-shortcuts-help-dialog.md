# 57: Calendar keyboard shortcuts help

**What to build:** a help dialog (for example on `?`) listing the Calendar's view-scoped shortcuts.

**Blocked by:** None

**Status:** ready-for-agent

- Shortcuts come from ticket 31 (`src/lib/features/event-calendar/event-calendar-keys.logic.ts`); the dialog should read the same table so it cannot drift.
- The plan's parity table deferred the `?` dialog as "covered by help page 20" (`git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`, line 1141). Ticket 34 since added the same shortcuts as tables in `help/documentation/20-keyboard-shortcuts.md` (## Calendar, :60-73) and `help/documentation/27-calendar.md` (## Calendar Keyboard Shortcuts, :171-185). Do not add a third hand-written copy.

- [ ] Dialog opens from a key and from a header button, closes on Escape, restores focus
- [ ] Content generated from the key table; a test fails if a shortcut is missing from the dialog or from either help table

## Comments

- 2026-10-28 17:33 — discovery — key table added to keys.logic, help state in the view store, dialog + header button; plan in work/57/discovery.md — b41e9b0c
