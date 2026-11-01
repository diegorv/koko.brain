# Issue 01 discovery: a note's day has one rule

## Files that change
- NEW `src/lib/utils/note-date.ts`: `parseDateKey(value)` and `noteDateKey({ date, created, diskCreatedAt })`.
  Pure, no framework imports, so `plugins/calendar` and the later `features/` lenses can import it (ADR 0003).
- `src/lib/plugins/calendar/calendar.logic.ts:113-131`: `timestampToDateKey` and `parseDateToKey` move into the
  rule (their only caller is the calendar service); tests move to `src/tests/lib/utils/note-date.test.ts`.
- `src/lib/plugins/calendar/calendar.service.ts:14-136`: drop the `fileFrontmatterKeys` / `fileFilesystemKeys`
  bookkeeping. Keep `fileDateKeys` (effective day) plus `fileDiskTimes` (raw `createdAt` from the scan). Both
  `scanFilesForCalendar` (propertyIndex `date` / `created` + `node.createdAt`) and `updateCalendarForFile`
  (parsed frontmatter `date` / `created` + remembered disk time) call `noteDateKey`; update acts only when the
  effective day changed.
- Help: `help/documentation/07-sidebar-panels.md:23-24`, `08-periodic-notes-and-calendar.md:22-53`,
  `27-calendar.md:222-223` say "note date" instead of "files created on that day".

## Plan
1. Logic test first (`src/tests/lib/utils/note-date.test.ts`): precedence date > created > disk, unparseable
   falls through and never throws (booleans, arrays, objects, garbage strings), no source -> null.
2. Service tests (`src/tests/lib/plugins/calendar/calendar.service.test.ts`): scan with date 27 / created 30;
   incremental `date` edit moves the note; regression: only `created` + later disk time stays on `created`.
3. Panel test (`CalendarPanel.test.ts`): after a scan, the 27th cell has a dot and picking it lists the note.
4. Help text.

## Prior art
- `calendar.service.test.ts` scan/update tests (real fsStore + collectionStore, no mocks of stores).
- `CalendarPanel.test.ts` mount + flushSync pattern; grid cells are `button[data-date=...]`.

## Risks
- Behavior change by design: notes with `date` move from their `created` / disk day to `date`.
- `type-sidebar.logic.ts:331-335` sorts by disk `createdAt`: that is a sort, not a note's day; left alone.

## Defaults taken
- Only `string`, finite `number` (ms timestamp, as `parseDateToKey` accepted before) and valid `Date` values
  parse; anything else (boolean, array, object) falls through. A falsy disk time counts as no source, as before.
- No new store getter and no new UI, so the theme-token criterion is vacuous.
