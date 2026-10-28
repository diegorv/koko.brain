# 56: Open an event on the Calendar from search and backlinks

**What to build:** from a search result or a backlink that points at an event note, the user can open the Calendar on that event's date with the event focused and briefly highlighted (pulse).

**Blocked by:** None

**Status:** ready-for-agent

- Prototype parity row "Focus event from search, with pulse highlight": deferred because Kokobrain search opens the note itself.
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- Needs an entry point (context menu or a secondary action) plus a store call that sets the view date and a focus target; the pulse is CSS.

- [ ] Action available on search results and backlinks for event notes
- [ ] The Calendar opens on the right date and view with the block focused and pulsing once
- [ ] E2E covering the flow

## Comments

- 2026-10-28 17:46 — discovery — plan in work/56/discovery.md: focus request in the view store, Show in Calendar button on event search results and backlinks, pulse in EventCalendarView — b41e9b0c
- 2026-10-28 17:53 — implement — focus request + findCalendarEvent/openEventInCalendar, view focus and pulse, Show in Calendar button on search results and backlinks, E2E spec e2e/specs/event-calendar-focus.spec.ts (not run here); pnpm check clean, 1391 targeted vitest pass — 03054c5a
