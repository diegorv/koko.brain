VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `evaluator.ts:609` adds `ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}([T ]|$)/`, and `dateOperandTime` (`evaluator.ts:619-629`) returns NaN for a string that does not match it, before `parseLocalDateOnly` / `new Date`. `'Week 3'`, `'Phase 2'`, `'1/2'` and `'5'` were added to the "matches no operator for a value that is not a date" loops in `evaluator.test.ts:745` and `collection-logic.test.ts:410`. Red probe: with the `ISO_DATE_PREFIX` guard line removed, both loops fail (3 tests failed in total), and they pass again once the line is restored. |
| 2 | minor | resolved | Fixed by the same guard: `'0'` and `'2026'` against `file.mtime` now give NaN in `<`/`>`/`<=`/`>=`. The new test "reads a non-ISO string paired with a Date as no date" (`evaluator.test.ts:770-775`) checks this and confirms that `'2026-02-28 23:00'` still parses (`['>', '>=']`). This test also fails in the red probe. `looseEqual` (`evaluator.ts:632-649`) is unchanged and keeps `toNumber` for a Date vs non-ISO string with no day-precision side, as on main. Behaviour change compared with main: a hand-written `file.mtime > '1700000000000'` used to compare milliseconds and now matches nothing. The toolbar never writes a quoted number (`quoteUnlessNumber`), and the review offered this as one of its two fixes, so I accept it. |
| 3 | nit | resolved | The `date(string)` row in `help/documentation/12-collection.md:281` now describes the local-midnight and by-day rule, with the `> date('2024-01-01')` and `==` examples. The row matches the code (`dayPrecisionDates` and `localDayStart`). |

## Acceptance criteria re-checked

- [met] A value that is not a date (empty string, `abc`, null, a missing property) matches none of the four operators and never throws; in particular a record without `due` no longer matches before / on or before (logic test) — the loops in `collection-logic.test.ts:409-415` and `evaluator.test.ts:744-750` now also cover `Week 3`, `Phase 2`, `1/2` and `5`. Both assert `[]` and no throw, and both pass.
- [met] Numeric comparisons, string comparisons and Date vs Date or Date vs number comparisons with no day-precision `date()` literal on either side behave as today (existing tests stay green) — the guard applies only to a *string* operand paired with a Date. Date vs number still goes through `toNumber` (`evaluator.ts:627-628`), and string vs string and number vs number in `compareValues` are untouched. All 986 tests in `src/tests/lib/features/collection/` and `src/tests/lib/features/auto-move/` pass. The full suite is deliver's to run.
- [met] A datetime value is compared by its local calendar day when the other side is a date-only literal (see Notes): `due: 2026-03-01T10:00` matches on or before and on or after `2026-03-01`, not before or after; `due: 2026-02-28T23:00` matches before and on or before; `due: 2026-03-02T00:30` matches after and on or after (logic test, also for `file.mtime` with a fixed `mtime`) — these ISO datetimes match `ISO_DATE_PREFIX` (the `T` branch), so they still reach `new Date`. The datetime tests in both files pass unchanged.

## Findings

None open. No test was weakened or deleted: the fix commit only adds loop entries and one test. The diff since the review (`abfe380c1..HEAD`) touches `evaluator.ts`, the two test files, the help doc and `work/05/review.md`, with no layer-baseline change and no `src-tauri/` change.

## Checks run

- `pnpm check`: exit 0, 213 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/collection/ src/tests/lib/features/auto-move/`: exit 0, 27 files, 986 tests passed.
- Red probe: removing the guard line in `dateOperandTime` makes 3 tests fail in `evaluator.test.ts` and `collection-logic.test.ts`. I restored the line with `git checkout`, and the worktree was clean afterwards.
- I did not run the full suite or `pnpm build`; deliver runs them.
