# 40: Dated tasks shown on the Calendar

**What to build:** the Calendar tab can show dated tasks (`- [ ] ... 📅 YYYY-MM-DD` and the other due-date forms the Tasks view reads) as an overlay on their day, read from `get_all_tasks_v2`.

**Blocked by:** None

**Status:** ready-for-agent

- Deferred in the event-calendar plan (Open questions, item 10: "Show dated tasks on the calendar in v1? Decided: no (follow-up)").
- Source: the Rust task index, the same IPC the Tasks view uses (`features/tasks/tasks.service.ts:51`). Refresh on `vaultStore.vaultIndexVersion` like the other panels; no TS mirror.
- Tasks are not events: they render distinctly (no drag, no time block), and clicking one opens the note at the task line.

- [ ] Dated tasks appear on their due day in month, week and day views, visually distinct from events
- [ ] A setting or view toggle turns the overlay off
- [ ] Logic tests for the task-to-day projection; an E2E that a dated task in a note renders on its day

## Comments

- 2026-10-28 18:06 — discovery — plan in work/40/discovery.md: task projection logic, store + loadCalendarTasks, showTasks setting, month chips and a week/day task lane, E2E in a new spec — 8063e54b
- 2026-10-28 18:13 — implement — task projection, store, loadCalendarTasks, showTasks setting, month chips and week/day Tasks lane, E2E spec event-calendar-tasks.spec.ts (not run here); pnpm check clean, event-calendar + settings + tasks vitest green — cb716518
