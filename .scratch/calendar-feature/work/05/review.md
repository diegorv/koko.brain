VERDICT: APPROVED

# Review: issue 05, event-calendar types and native date helpers

Reviewed `git diff main...HEAD` (21ec51ac, 567a76c6, 232303b8) in the worktree, against the Issue's acceptance criteria, plan Task 4 (`plan-2026-10-28.md:97-126`) and CLAUDE.md.

## What I ran

- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar src/tests/lib/plugins/calendar src/tests/lib/core/settings` (18 files, 395/395 passed). The DST block ran and was not skipped: both its tests are listed as passed in the verbose output.
- The dates test again with `TZ=Pacific/Kiritimati` and `TZ=America/Sao_Paulo` as the host zone: 24/24 both times.
- `pnpm check`: 0 errors, 0 warnings, 192 files.
- Throwaway probes, deleted afterwards (`git status` clean):
  - `runtimeTimeZoneSwitchWorks()` leaves the offset unchanged after it restores TZ, including when TZ was unset. `withTimeZone` restores TZ after `fn` throws.
  - A brute-force check of `addDays` (+1 and -1), `diffDays`, `isValidDayKey`, `dayOfWeek`, `daysInMonth` and `addMonths` for every day of 2010-2034, in 10 zones with midnight DST shifts or odd offsets (Havana, Santiago, Asuncion, Beirut, Lord_Howe, Apia, Sao_Paulo, London, Tehran, Scoresbysund). The only mismatch is Pacific/Apia 2011-12-30, a day that never existed there (see finding 4).
  - Mutant reasoning on the DST assertions: an implementation that adds milliseconds fails `addDays('2026-11-01', 1)`, `addDays('2026-10-25', 14)` and `addDays('2026-03-09', -1)`, and one that floors `diffDays` fails `diffDays('2026-03-09', '2026-03-08')`. So the block really guards D13.
  - Edge inputs: `formatTime(90.5)` gives `01:30.5`, `formatTime(-15)` gives `-1:-15`, `timeInputValue(NaN)` gives `NaN:NaN`, `toKey(new Date(999, 0, 1))` gives `999-01-01` where dayjs gives `0999-01-01`, and `isValidDayKey('0999-01-01')` is false.
- The prototype at `/home/user/calender-app-design` is absent on this machine (`test -d` says so).

My test verdict rests on `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts` (the new file), on `src/tests/lib/plugins/calendar/*` (the `toDateKey` parity target) and on `src/tests/lib/core/settings/*` (the source of the re-exported types).

## Acceptance criteria

- [x] **Types only, with type re-exports.** Met. `event-calendar.types.ts:11` is a lone `import type`, and `:14` / `:17` alias `EventCalendarColor` / `EventCalendarViewMode`. The file has no runtime statement, and nothing in the diff re-declares the runtime lists.
- [x] **`EventNote`.** Met. `:23-44` has all ten fields. `start` / `end` are minutes, with 0 / 1440 documented for all-day events. The title is documented as `event_title`, else the filename base. The name avoids `CalendarEvent`.
- [x] **`EventFields`, `EventState`, `EventPatch`, `EventDraft`, `EventIssueReason`, `EventIssue`, `EventProjection`.** Met at `:47-107`. `EventPatch` is `Partial<EventFields> & { eventTitle?: string | null }`, and the five reasons match the spec.
- [x] **`PendingWrite`, `HistoryOp`, `DragState`, `PositionedEvent`, `PopoverTarget`, `DialogState`, with JSDoc on every field.** Met at `:113-243`. The variants, labels and optional `settledAtVersion` / `trashId` match the plan at `:108-109`, and every field has JSDoc. `DragState`, `PositionedEvent` and `DialogState` have minimal shapes the plan does not specify; later tickets may refine them.
- [~] **Native, dependency-free port of `dates.ts:24-163`, with the export list and no `relativeTime`.** The export list is met: all 25 names exist, `relativeTime` is not ported, there are no imports, and every export has JSDoc. The port itself cannot be checked because the prototype is not on this machine. The signatures are the builder's defaults, recorded in `work/05/discovery.md` (finding 1).
- [x] **Day arithmetic through `setDate`; `diffDays` rounds; `isValidDayKey` round-trips and rejects `2026-02-30`.** Met. See `event-calendar-dates.logic.ts` `addDays` / `diffDays` / `isValidDayKey`, test lines 124-136, and the brute-force probe.
- [x] **`parseTimeStrict` and `timeInputValue` clamping.** Met. `parseTimeStrict` accepts `H:mm` / `HH:mm` from 0:00 to 23:59 plus `24:00`, and returns null for `1:30 PM`, `25:00`, `''` and more (test lines 99-103, 227-243). `timeInputValue` clamps at 0 and 1439 (test lines 245-253), with the NaN caveat in finding 2.
- [x] **`withTimeZone` and `runtimeTimeZoneSwitchWorks` fixture.** Met. `timezone.fixture.ts:18-30` restores TZ in a `finally` and deletes it when it was unset, and `:39-44` is the probe. Both were verified by probe.
- [~] **Test ports the 6 prototype cases plus the listed extra cases.** The extra cases are met: every listed export has a case, plus the Monday-start `monthGrid` for October 2026 (the 1st is a Thursday), `formatTime(1440)`, reversed `rangeKeys` and the `toDateKey` parity check. The "6 prototype cases" (test lines 33-105) are equivalents written without the prototype, so their parity with `dates.test.ts:15-59` is unverified (finding 1).
- [x] **DST block under `describe.runIf` across 2026-03-08 and 2026-11-01.** Met at test lines 256-296. It covers `addDays`, `diffDays`, `isoWeek` and `rangeKeys`, each test first asserts that the offset really changes, and the block ran here.
- [x] **Import specifiers.** Met. `$lib/...` is correct: `.scratch/sveltekit-3-migration/issues/05-expand-lib-subpath-import.md` is still present (open) on `main`.
- [ ] **Gate green; one commit in the full format.** Pending. The commit is met: 567a76c6 is the one feat commit, with Context, Problem, Solution, Behavior and Files with line ranges, and it ends with the Co-Authored-By line. The full gate has not run yet; deliver runs it.

CLAUDE.md checks:
- Layer rules hold: a feature importing a core type is allowed, and the `.logic.ts` file has no framework import.
- Tabs are used throughout.
- JSDoc is present on every export and field.
- No source file is left without a test. The types file is types-only and is covered by `pnpm check`, as the plan intends.
- No scope creep: only the four files in the ticket's Touches list, plus scratch notes.

## Findings

1. **Medium (unverifiable, no code change): the prototype parity is unproven.** At `src/lib/features/event-calendar/event-calendar-dates.logic.ts:1-334` and test lines 33-105, the builder could not read `calender-app-design/src/lib/dates.ts` or `dates.test.ts`. These are defaults that later port tickets will call with prototype-shaped arguments:
   - the argument order of `diffDays(a, b)`, which is `a - b`;
   - the fixed 42-key `monthGrid`;
   - the `formatRange` / `formatTime(1440, '12h')` strings;
   - `addMonths` clamping;
   - `rangeKeys` returning `[]` when reversed.
   **Fix:** none in this ticket. When the prototype becomes reachable, diff these against `dates.ts:24-163` before Tasks 7-10 port prototype call sites. Until then, those tickets should treat `work/05/discovery.md` as the contract.
2. **Low: `timeInputValue` and `formatTime` produce garbage for non-integer or non-finite input.** This is at `event-calendar-dates.logic.ts` `timeInputValue` / `formatTime`. `timeInputValue(NaN)` is `NaN:NaN`, `formatTime(90.5)` is `01:30.5` and `formatTime(-15)` is `-1:-15`. The ticket says "clamps on both sides", and NaN slips through the clamp.
   **Fix (optional):** in `timeInputValue`, map a non-finite value to 0 before clamping, and add a test for `timeInputValue(NaN)`. In `formatTime`, either `Math.round` the minutes or document "integer minutes 0..1440" as a precondition.
3. **Nit: `toKey` does not pad the year to 4 digits.** At `event-calendar-dates.logic.ts` `toKey`, a year below 1000 gives `999-01-01`, while `toDateKey` (dayjs) gives `0999-01-01`, so the parity claim does not hold there. `isValidDayKey` consistently rejects such years, and `fromKey` maps years 0-99 to 19xx, so a typo like `0026-11-10` becomes `unscheduled`, which is acceptable.
   **Fix (optional):** use `String(date.getFullYear()).padStart(4, '0')`, or note the supported range (1000-9999) in the JSDoc.
4. **Nit: a zone's skipped calendar day breaks the floating-key claim.** This is at `event-calendar-dates.logic.ts` `fromKey` / `addDays`. In `Pacific/Apia`, where 2011-12-30 never existed, `addDays('2011-12-29', 1)` returns `2011-12-31` and `isValidDayKey('2011-12-30')` is false. Local-component arithmetic cannot represent a skipped day, and the plan mandates local components (`setDate`).
   **Fix:** none required. Doing the arithmetic in UTC (`Date.UTC` plus `getUTC*`) would make keys truly zone-independent; if wanted, take that up as a plan change, not in this ticket.
5. **Nit: `withTimeZone` restores TZ before an async `fn` finishes.** At `src/tests/fixtures/timezone.fixture.ts:18-30`, an `async` callback returns its Promise at once and the `finally` restores TZ while the awaited code is still pending. The current callers are all sync.
   **Fix (optional):** say "`fn` must be synchronous" in the JSDoc.
6. **Nit: `TimeFormat` and `WeekStart` re-declare settings literals.** At `event-calendar-dates.logic.ts:12, 15`, they copy `EventCalendarSettings.timeFormat` / `weekStartsOn` (`settings.types.ts:309, 311`), so the two copies can drift.
   **Fix (optional):** derive them with a type-only import (`EventCalendarSettings['timeFormat']`). Otherwise leave them as they are, since the `.logic.ts` import rule favors the local copy.
