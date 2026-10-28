# 10: Event form rules: drafts, validation, patches and title-to-filename planning

**What to build:** the event dialog's form rules exist as pure logic in `event-calendar-form.logic.ts`, a port of `calender-app-design/src/components/dialogs/event-dialog.tsx:56-94`. A draft can be built from an existing event (with timing locked for read-only events) or from a create payload, capped the same way as a pointer create. Start, end and all-day changes keep the draft consistent. `validateDraft` returns visible messages instead of the prototype's native `required` and silent return. `draftToPatch` yields only what changed. `planTitleChange` turns any typed title, including `1:1 with manager` or a second `Standup`, into a safe rename target plus an `event_title` value, so no title fails on the filename. The write service (Task 23) turns a title change into a rename through this plan, and the edit dialog (Task 26) shows the validation messages inline.

**Plan reference:** Task 9 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 238-256). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 06, 07

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-form.logic.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] `event-calendar-form.logic.ts` has no framework imports. It uses `eventFileBase` from `event-calendar-event.logic.ts` (ticket 07), `MIN_EVENT_MINUTES` from `event-calendar-layout.logic.ts` (ticket 06) and `generateUniqueName` from `src/lib/core/filesystem/fs.logic.ts:188-216` (a core `.logic.ts` import). The create cap is restated with `MIN_EVENT_MINUTES`, not imported from the drag logic of ticket 09.
- [ ] `draftFromEvent` sets `timingLocked` for `readOnly` events, and a test covers it.
- [ ] `draftForCreate(payload, settings)` applies the same cap as Task 8, restated here: `start = min(anchor, 1440 - MIN_EVENT_MINUTES)` and the end capped at 1440. Tests cover anchors 1425 and 1440.
- [ ] `applyStartChange` keeps the duration and caps the end at 1440; `applyEndChange` turns an empty value into 1440, as in the prototype; `toggleAllDay` is exported.
- [ ] `validateDraft(draft): { title?; date?; time? }` returns visible messages for an empty title (after trim), an empty or invalid date, and end <= start. A title containing `:` or `/` is valid; the filename is sanitized instead (D6).
- [ ] `draftToPatch(draft, original)` returns only the changed fields, plus `title` when it changed.
- [ ] `planTitleChange(currentFileBase, newTitle, siblingNames): { renameTo: string | null; eventTitle: string | null }` computes `base = eventFileBase(newTitle)`. The same base, or a case-only difference, gives `renameTo: null`, because `renameItem` checks `exists(newPath)` (`src/lib/core/filesystem/fs.service.ts:194-198`), which is true for a case-only change on a case-insensitive macOS volume. Otherwise `renameTo = generateUniqueName(base + '.md', false, siblings without the note itself)`, so a repeated title gets a numbered file instead of failing. `eventTitle` is `newTitle` when it differs from the final file base, else `null` (the key is removed).
- [ ] `planTitleChange` tests pass for: `1:1 with manager` (rename to `1-1 with manager.md`, `eventTitle` kept); a second `Standup` beside an existing `Standup.md` (rename to `Standup 1.md`, `eventTitle: 'Standup'`, so both display "Standup"); `standup` to `Standup` (no rename, `eventTitle: 'Standup'`); an unchanged title (no rename, `eventTitle: null`).
- [ ] JSDoc on every export; tabs for indentation; the test lives under `src/tests/lib/features/event-calendar/`.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
