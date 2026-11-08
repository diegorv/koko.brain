# Issue 03 discovery: date "is" never matches file.ctime / file.mtime

No `spec.md` exists for rail-shell-ux; the Issue's Notes carry the decisions.

## Files that change

- `src/lib/features/collection/expression/date-value.logic.ts` (new): one exported
  pure helper `parseLocalDateOnly(value: string): Date | null`. Exact
  `^\d{4}-\d{2}-\d{2}$` only (no trim), built with `new Date(y, m - 1, d)`, and
  `null` when the built date does not read back the same y/m/d (month 13, Feb 30).
- `src/lib/features/collection/expression/evaluator.ts:575-581` (`looseEqual`):
  before the existing `Date` vs `toNumber` branches, a `Date` paired with a string
  the helper accepts compares local calendar days (`getFullYear` / `getMonth` /
  `getDate`). Both operand orders. All other pairings keep today's path. `!=` and
  the `type` case-insensitive branch (`evaluator.ts:269`) call `looseEqual`, so
  they follow.

## Tests

- `src/tests/lib/features/collection/expression/date-value.test.ts` (new): valid
  day -> local midnight; `''`, `abc`, `2026-13-01`, `2026-02-30`, a datetime -> null;
  under Sao_Paulo / Tokyo the result is local midnight.
- `src/tests/lib/features/collection/expression/evaluator.test.ts`: new describe
  for date "is": 00:30 and 23:30 on local 2026-11-03 match, 11-02 / 11-04 do not,
  for `file.mtime` and `file.ctime`; `!=` follows; `''` / `abc` never match and
  never throw; frontmatter string `due == '2026-11-03'` still matches. Repeated in
  `describe.runIf(runtimeTimeZoneSwitchWorks())` with `withTimeZone` for
  America/Sao_Paulo and Asia/Tokyo (record times built inside the zone callback).
- `src/tests/lib/features/collection/toolbar/filter-logic.test.ts`: round trip of
  `file.mtime == '2026-11-03'` through `parseExpressionToRow` / `filterRowToExpression`
  (expected to pass already; it pins the serialization the fix relies on).

Prior art: `withTimeZone` users under `src/tests/` (event-calendar tests);
`extractDateFromRecord` in `features/collection/calendar.logic.ts:83-88`.

## Risks / defaults taken

- A Date that is Invalid (NaN) never matches a day string (getFullYear is NaN).
- `file.mtime == ''` keeps today's path (`getTime() === 0`): it matches only a
  record with mtime 0, which no real file has. Main-session decision says every
  non-day-string pairing keeps today's code path, so this is left alone.
- `calendar.logic.ts` keeps its inline parse (Issue says so).
