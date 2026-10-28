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
- 2026-10-28 17:40 — implement — CALENDAR_SHORTCUTS table + `?` help action, help state in view store, EventShortcutsDialog + header button; pnpm check 0 errors, event-calendar tests 703/703 — 2a5145b3
- 2026-10-28 17:43 — review — CHANGES_REQUESTED: AC2 partly met (resolver keys missing from the table pass every test), 1 major + 1 low + 1 nit in work/57/review.md — aaf833d1
- 2026-10-28 17:44 — fix — reverse drift test (resolver press -> table row) and unique-kind test; M1/M2 mutations now fail; docs say "while a dialog is open" — 16946821
