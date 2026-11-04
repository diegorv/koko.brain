# Issue 05 discovery: date filters match frontmatter dates

No `spec.md` exists for rail-shell-ux; the Issue's Notes carry the decisions.
Issue 03's helper `parseLocalDateOnly` exists (`expression/date-value.logic.ts:13`),
so this Issue reuses it (work/03 is the prior art).

## Files that change

- `src/lib/features/collection/expression/evaluator.ts`
  - module-level `dayPrecisionDates = new WeakSet<Date>()`.
  - `date` builtin (`:311-314`): a string argument the helper accepts returns
    that local-midnight Date and adds it to the WeakSet; every other argument
    keeps `new Date(String(val))`.
  - `compareValues` (`:600-606`): Date vs string parses the string (helper, else
    `new Date(str)`); Date vs null / undefined / `''` / unparseable string is
    `NaN`. When either side is day precision, the other side's Date is truncated
    to its local day start. Date vs Date and Date vs number with no day-precision
    side keep today's arithmetic.
  - `looseEqual` (`:581-597`): a day-precision side compares local days
    (`isSameLocalDay`) with the other side coerced the same way; a non-date other
    side is not equal. Other pairings unchanged (Issue 03's string branch stays).

## Tests

- `src/tests/lib/features/collection/collection-logic.test.ts`: new describe for
  date filters through `executeQuery`: the first failing test, the four
  operators on `YYYY-MM-DD` strings, datetime strings by day, non-date values,
  and a Sao_Paulo block (`withTimeZone`).
- `src/tests/lib/features/collection/expression/evaluator.test.ts`: `file.mtime`
  by day for the four operators, `==` / `!=` on a day literal, `date()` from a
  datetime keeps instants, Sao_Paulo `date('2026-03-01')` equals local
  `new Date(2026, 2, 1)`. The Issue 03 assertion
  `file.mtime == date('2026-11-03')` is false (`:697`) is superseded by this
  Issue's equality criterion and flips to true.

## Risks / defaults taken

- Day precision also applies to `date(due)` when `due` holds a `YYYY-MM-DD`
  string (the builtin cannot tell a literal from a property; the Notes say
  "a `YYYY-MM-DD` string argument").
- A number paired with a day-precision Date is not truncated (Notes list only
  a Date or a parsed string).
- Date vs a numeric string (`file.mtime > '0'`) now goes through
  `new Date(str)` instead of `Number(str)`; no test or toolbar row writes it.
- Date arithmetic (`date('2026-01-01') + '1d'`) returns a fresh Date, so it is
  instant precision.
