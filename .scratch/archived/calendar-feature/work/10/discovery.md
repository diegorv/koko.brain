# 10 discovery: event form rules

## Files that change (both new)

- `src/lib/features/event-calendar/event-calendar-form.logic.ts`: port of `calender-app-design/src/components/dialogs/event-dialog.tsx:61-94, 126-140`. Imports: `eventFileBase` (`event-calendar-event.logic.ts:221`), `MIN_EVENT_MINUTES` (`event-calendar-layout.logic.ts:17`), `isValidDayKey` / `parseTimeStrict` (`event-calendar-dates.logic.ts:77, 326`), `generateUniqueName` (`$lib/core/filesystem/fs.logic.ts:188-216`), types from `./event-calendar.types` and `EventCalendarSettings` (`settings.types.ts:307`).
- `src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts`.

## Plan

Same template as ticket 09 (`event-calendar-drag.logic.ts` + its test): one pure module, one test file, one feat commit, test-first. No store, service or component touched, so no reactive chain to trace.

## Defaults taken for open questions

- Draft type `EventFormDraft = EventDraft & { timingLocked: boolean }` (declared in the logic file). `draftFromEvent(event: EventNote)` sets `notes: ''` (the body is not an edit field, D21).
- `draftForCreate(payload: { date; start?; end?; allDay? }, settings: Pick<EventCalendarSettings, 'defaultDurationMinutes' | 'defaultColor'>)`: anchor defaults to 540 as in the prototype; `start = min(anchor, 1440 - MIN_EVENT_MINUTES)`; `end = min(max(payload.end ?? start + duration, start + MIN_EVENT_MINUTES), 1440)`, so the draft is never born invalid. Color from settings, title/location/notes empty.
- `applyStartChange(draft, value)` / `applyEndChange(draft, value)` take the `<input type=time>` string. An unreadable start becomes 0 (prototype `parseTime('') = 0`). An unreadable end becomes 1440; unlike the prototype's `|| 1440`, `00:00` stays 0 and `validateDraft` reports it.
- `toggleAllDay(draft, allDay = !draft.allDay)`; start/end are kept so toggling back restores them.
- Messages: `Enter a title.`, `Enter a valid date.`, `End time must be after the start time.` (prototype text). The time check is skipped for all-day drafts.
- `draftToPatch(draft, original: EventState)`: an all-day draft compares as start 0 / end 1440 (the prototype's submit normalization); `title` is the trimmed title and is included only when it differs. `eventTitle` is never set here; the write service gets it from `planTitleChange`.
- `planTitleChange` compares names case-insensitively (the case-only rule, and siblings, since `Standup.md` and `standup.md` collide on macOS). It lowercases the siblings and the candidate for `generateUniqueName`, then re-applies the typed base's casing to the numbered result.

## Risks

- A sibling created between `readDir` and `renameItem` still fails the rename; the write service (ticket 24) turns that into an error, as the plan says.
