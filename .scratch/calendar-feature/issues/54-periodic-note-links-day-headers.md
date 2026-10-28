# 54: Day headers open the periodic daily note

**What to build:** clicking a day header (or a link beside it) in the Calendar opens or creates that day's periodic daily note, through a plugin-side bridge so the feature does not import the plugin.

**Blocked by:** None

**Status:** ready-for-agent

- `features/` must not import `plugins/` (CLAUDE.md layer rules); so `plugins/periodic-notes` registers a handler that the Calendar calls when one is registered (the reverse direction, plugin to feature, is a plain import today: `plugins/calendar/CalendarPanel.svelte`).
- Headers: `src/lib/features/event-calendar/EventDayHeaders.svelte`; the month grid day number too.

- [ ] With periodic notes enabled, a header action opens the daily note for that date
- [ ] Without the plugin the header has no such action
- [ ] Tests for the bridge registration and an E2E click

## Comments

- 2026-10-28 17:50 — discovery — bridge store in event-calendar, plugin registers opener via initializeVault, icon button beside header and month day number; work/54/discovery.md — cdad575f
