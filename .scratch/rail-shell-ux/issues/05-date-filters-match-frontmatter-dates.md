# 05: Date filters (before, after, on or before, on or after) match frontmatter dates

**What to build:** A filter row "due before 2026-03-01" (and after, on or before, on or after) matches the notes whose frontmatter date falls on the right side of that day, in the collection editor, inline collection blocks and the note list's view toolbar. Today a note with a date in `due` matches none of these rows, while a note with no `due` (or an empty one) matches "before" and "on or before" by accident. A date-only literal (`date('2026-03-15')`) is read as local midnight, the way the collection calendar reads dates, not as UTC midnight.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Write the failing test first: `executeQuery` with records whose `due` is the string `2026-02-20` / `2026-03-10` and the filter `due < date('2026-03-01')` returns only the first (logic test, real evaluator, `src/tests/lib/features/collection/collection-logic.test.ts`)
- [ ] All four operators work against a `YYYY-MM-DD` string on the property side: with the cut-off `2026-03-01`, `due: 2026-03-01` matches on or before and on or after, not before or after; `2026-02-28` matches before and on or before only; `2026-03-02` matches after and on or after only (logic test)
- [ ] A full ISO datetime string on the property side is compared as an instant (see Notes): `due: 2026-03-01T10:00` matches after and on or after `2026-03-01`, not before or on or before; `due: 2026-02-28T23:00` matches before and on or before (logic test)
- [ ] A value that is not a date (empty string, `abc`, null, a missing property) matches none of the four operators and never throws; in particular a record without `due` no longer matches before / on or before (logic test)
- [ ] `date('YYYY-MM-DD')` builds local midnight: inside `describe.runIf(runtimeTimeZoneSwitchWorks())` with `withTimeZone('America/Sao_Paulo', ...)` (`src/tests/fixtures/timezone.fixture.ts`), `date('2026-03-01')` has the same `getTime()` as `new Date(2026, 2, 1)` built in that zone, and a record with `due: 2026-03-01` matches on or before `2026-03-01` and not before (tests in `src/tests/lib/features/collection/expression/evaluator.test.ts` and `collection-logic.test.ts`)
- [ ] Numeric comparisons, string comparisons and Date vs Date or Date vs number comparisons behave as today (existing tests stay green)

## Notes

- **Cause (traced):** the toolbar writes `prop < date('v')` (`features/collection/toolbar/filter.logic.ts:70-77`). Frontmatter dates reach records as strings (see Issue 03's Notes for the Rust projection), and `compareValues` (`features/collection/expression/evaluator.ts:584-590`) does `toNumber(value) - date.getTime()`. For a date string `toNumber` is `NaN`, so every comparison is false. For null, a missing property (`resolvePropertyPath` returns `?? null`) or `''`, `toNumber` is `0`, so the result is negative and `<` / `<=` are true: notes with no date match before and on or before. `date()` is `new Date(String(val))` (`evaluator.ts:311-314`), which parses a date-only string as UTC.
- **Fix direction:** in `compareValues`, when one side is a `Date` and the other a string, parse the string as a date: a `YYYY-MM-DD` string through Issue 03's date-only helper (local midnight), any other string with `new Date(str)`. When one side is a `Date` and the other is null, undefined, `''` or a string that does not parse, return `NaN` so every operator is false. In the `date` builtin, a `YYYY-MM-DD` string argument goes through the same helper; every other argument keeps `new Date(String(val))`.
- **Main-session decision (datetime values):** a datetime property is compared as an instant against the cut-off's local midnight, the same way `file.mtime` / `file.ctime` already compare with `date()`. "On or before 2026-03-01" therefore excludes a note dated `2026-03-01T10:00`. This keeps the evaluator a plain comparison and needs no toolbar change.
- **Blast radius:** `date()` is shared with formulas (`formula.*`) and hand-written filters, so a date-only literal there moves to local midnight too, for example `file.mtime > date('2024-01-01')`. The existing `date()` tests in `evaluator.test.ts` check only the year, the hours after `.date()` and a positive `number()`, so they stay green. A `not:` group around one of these rows changes with it: notes without the date are now inside `not: [due < date(...)]`.
- **Shared helper:** Issue 03 creates the exported date-only parse helper (local midnight, `null` for anything else) next to the evaluator. Blocked by 03 because this Issue reuses that helper and edits the same comparison code in `evaluator.ts`. If the helper is missing when this Issue starts, stop and report it rather than adding a second one.
- **Out of scope:** the date "is" operator on `file.mtime` / `file.ctime` is Issue 03. QueryJS `kb.date()` is separate code and does not change.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F65, F78.
- **Size:** S.

## Comments
