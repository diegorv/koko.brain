# 45: Recurring events

**What to build:** an event note can repeat (daily, weekly, monthly, with an end), and the Calendar renders its occurrences.

**Blocked by:** None

**Status:** needs-triage

- Not in the prototype either: `CalEvent` in its `types.ts` has no repeat field (plan Notes, "Recurrence stays a follow-up").
- Open: the frontmatter schema (an RRULE string or split keys), how an edit to one occurrence is stored, and how exceptions are represented in a note-per-event model.

- [ ] Schema decision recorded (ADR amendment to ADR-0032 if it changes the event model)
- [ ] If accepted: occurrences render read-only first; editing semantics in a later ticket
