# 41: Multi-day spans and cross-midnight events

**What to build:** an event with `end_date` spans every day from `date` to `end_date`, and an event whose `end` is earlier than `start` crosses midnight, instead of rendering read-only on its start day.

**Blocked by:** None

**Status:** ready-for-agent

- Today `end_date` is reserved: `eventsFromEntries` renders the event on its start day with `readOnly: true` and a `multi-day` issue ("multi-day spans are not supported yet"), `features/event-calendar/event-calendar-event.logic.ts:166-180`. Plan D2: "no cross-midnight or multi-day events in v1".
- Needs: the projection splits a span into per-day segments; the all-day lane and the month grid draw spans; drag and resize keep `end_date` in sync (or stay disabled on spans with a clear reason).

- [ ] `end_date` events render on every day of the span in all three views; the `multi-day` issue is gone
- [ ] Cross-midnight timed events render on both days
- [ ] Writes never desync `date` and `end_date`
- [ ] Logic tests for span splitting and an E2E for a two-day event
