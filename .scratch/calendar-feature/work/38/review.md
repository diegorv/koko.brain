VERDICT: APPROVED

# Issue 38 review: date helpers match the prototype

Reviewed `git diff main...HEAD` (merge-base 96a8c3cd, HEAD 36e13111) against
the Issue, plan Task 3 (plan lines 112-125), CLAUDE.md and the prototype at
`/Users/diegorv/Dev/pet-projects/koko/calender-app-design/src/lib/dates.ts`.

## Checks run by the reviewer

- `vitest run src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts`
  (after `svelte-kit sync`): 1 file, 35 passed, 0 skipped. The verbose run shows
  both DST cases (`describe.runIf(runtimeTimeZoneSwitchWorks())`, America/New_York)
  executed, not skipped.
- `pnpm check`: 192 files, 0 errors, 0 warnings.
- Parity probe (scratchpad, not committed): the prototype `dates.ts` and the port
  run side by side under Node type stripping, every day from 2020-01-01 to
  2030-12-31 (4018 keys), with `TZ` set to UTC, America/New_York,
  America/Sao_Paulo, Australia/Lord_Howe and Pacific/Apia. Compared
  `formatLong`, `formatWeekday`, `formatShort`, `monthName`, `isoWeek`,
  `dayOfWeek`, `isWeekend` per key, `diffDays` and `formatRange` for offsets
  0, 1, 6, 13, 34, 400 and -3, `rangeKeys` for offsets 0..34, and the four
  constants. 0 mismatches in all five zones.
- grep over `src/` and `e2e/`: no caller of `event-calendar-dates.logic` outside
  its own test, so no other test or component asserts the changed strings.

Test verdict rests on:
`src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts`
(the only test of the changed file) plus the parity probe above.

## Acceptance criteria

- [x] `diffDays('2026-11-08', '2026-11-14') === 6`, DST cases count whole days.
  Met. `event-calendar-dates.logic.ts:195-197` computes `b - a` with the same
  `Math.round`, identical to `dates.ts:90-92`. Test file :63-67 (prototype case)
  and :203-208; DST block :341-342 and :361-362 assert 1 and 14 across
  2026-03-08 and 2026-11-01 and ran. `rangeKeys` (:205-209) now calls
  `diffDays(from, to)` like `dates.ts:95`, so its output is unchanged (probe).
- [x] `formatLong('2026-11-10') === 'November 10, 2026'`. Met. Logic :235-238;
  test :249-258.
- [x] `formatWeekday('2026-11-10') === 'Tuesday'`. Met. Logic :255-257; test :249-258.
- [x] `formatRange` gives `Nov 8 – 14` and `Nov 29 – Dec 5` verbatim from
  `dates.test.ts:36-38`. Met. Logic :268-275 is the prototype's two branches
  (`dates.ts:123-130`); test :57-61 is the prototype case verbatim, including
  `Oct 25 – 31`.
- [x] `MONTHS`, `MONTHS_SHORT`, `WEEKDAYS`, `WEEKDAYS_SHORT` exported with the
  prototype's values, each with JSDoc and a test. Met. Logic :17-41 (JSDoc on
  each); tests in "name constants" :83-113; probe confirms deep equality with
  the prototype arrays.
- [x] Every prototype case in `dates.test.ts:15-59` ported verbatim and passes.
  Met. Test :37-80: same six `it` titles and assertions, only `parseTime` renamed
  to `parseTimeStrict` (plan line 121). `parseTimeStrict('09:45')` is 585, the
  same as the prototype's lenient parse for that input.
- [x] No other export's output changes. Met. The diff touches only the four
  constants, `diffDays`, `rangeKeys` (call order, same output), `monthName` and
  `formatShort` (constant rename, same output), `formatLong`, `formatWeekday`
  and `formatRange`. Probe: 0 mismatches for the unchanged exports it covers.
  None of ticket 05's extra assertions were dropped; they moved to the
  per-area blocks (test :192-232, :265-272, :308-314).
- [ ] Gate green; one commit in the full CLAUDE.md format. Not checkable here:
  the gate is the deliver step's. The source commit a85ed624 has Context,
  Problem, Solution, Behavior, Files with line ranges and the Co-Authored-By
  trailer.

## Layer, rules and scope

- `.logic.ts` stays pure: no new imports, no framework code. Tabs throughout.
- JSDoc updated on every changed export (`diffDays` param roles flipped,
  `formatLong`, `formatWeekday`, `formatRange` examples rewritten).
- Scope: only the two files the Issue lists, plus the scratch notes. The
  out-of-scope `formatTime` wrap is untouched. `readonly string[]` on the
  constants is a typing-only tightening; no prototype call site mutates them
  (checked every `MONTHS`/`WEEKDAYS*` use under `calender-app-design/src`), so
  the literal ports of tickets 22/23/26 still type-check.
- `formatRange` follows the prototype in its unlisted branches too
  (`Nov 10 – 10`, `Dec 28 – Jan 3`). That matches the Issue's intent (literal
  call-site ports) and is pinned by test :260-263.

## Findings

1. Low, `.scratch/calendar-feature/issues/38-dates-prototype-parity.md:38`:
   the discovery comment cites `96a8c3cd`, which is the merge-base
   (`docs(scratch): close issue 14 ...`), not the discovery commit `f90fc628`.
   Fix: change the sha on that line to `f90fc628` when the deliver step next
   touches the Issue file (it deletes the file on close, so this is cosmetic).
2. Info, branch base: `main` has moved from the merge-base 96a8c3cd to 44bcee52
   (issue 16 commits). No conflict expected (they touch `core/trash`), but the
   branch is not fast-forwardable as is. Fix: deliver rebases onto `main`
   before the gate and the ff-only merge.
