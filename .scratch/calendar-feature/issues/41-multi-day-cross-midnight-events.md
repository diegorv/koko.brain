# 41: Multi-day spans and cross-midnight events

**What to build:** an event with `end_date` spans every day from `date` to `end_date`, and an event whose `end` is earlier than `start` crosses midnight, instead of rendering read-only on its start day.

**Blocked by:** None

**Status:** ready-for-agent

- Today `end_date` is reserved: `eventsFromEntries` renders the event on its start day with `readOnly: true` and a `multi-day` issue ("multi-day spans are not supported yet"), `features/event-calendar/event-calendar-event.logic.ts:166-180`. Plan D2: "no cross-midnight or multi-day events in v1".
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.
- Needs: the projection splits a span into per-day segments; the all-day lane and the month grid draw spans; drag and resize keep `end_date` in sync (or stay disabled on spans with a clear reason).

- [ ] `end_date` events render on every day of the span in all three views; the `multi-day` issue is gone
- [ ] Cross-midnight timed events render on both days
- [ ] Writes never desync `date` and `end_date`
- [ ] Logic tests for span splitting and an E2E for a two-day event

## Comments

- 2026-10-28 17:26 — discovery — spans read-only, per-day segments in the view logic, `end-before-start` replaces `crosses-midnight`, service refuses timing writes on spans; see work/41/discovery.md — pending
- 2026-10-28 17:34 — implement — spans and cross-midnight events render on every day (time grid, all-day lane, month), read-only with a service-side timing guard; event-calendar vitest 722/722, pnpm check 0 errors, event-calendar.spec.ts 32/32 on an isolated port 1431 — 249f9ee4
