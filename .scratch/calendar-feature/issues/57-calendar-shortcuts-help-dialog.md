# 57: Calendar keyboard shortcuts help

**What to build:** a help dialog (for example on `?`) listing the Calendar's view-scoped shortcuts.

**Blocked by:** None

**Status:** ready-for-agent

- Shortcuts come from ticket 31 (`src/lib/features/event-calendar/event-calendar-keys.logic.ts`); the dialog should read the same table so it cannot drift.

- [ ] Dialog opens from a key and from a header button, closes on Escape, restores focus
- [ ] Content generated from the key table; a test fails if a shortcut is missing
