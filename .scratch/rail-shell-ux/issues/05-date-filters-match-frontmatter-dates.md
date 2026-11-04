# 05: Date filters (before, after, on or before, on or after) match frontmatter dates

**What to build:** A filter row "due before 2026-03-01" (and after, on or before, on or after) matches the notes whose frontmatter date falls on the right side of that day, in the collection editor, inline collection blocks and the note list's view toolbar. Today every such row matches nothing. A date-only literal (`date('2026-03-15')`) is read as local midnight, the way the collection calendar reads dates, not as UTC midnight.

**Blocked by:** 03

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Write the failing test first: `executeQuery` with records whose `due` is the string `2026-02-20` / `2026-03-10` and the filter `due < date('2026-03-01')` returns only the first (logic test, real evaluator)
- [ ] All four operators work against a `YYYY-MM-DD` string and against a full ISO datetime string on the property side (logic test)
- [ ] A value that is not a date (empty string, `abc`, null) never matches a date comparison and never throws (logic test)
- [ ] `date('YYYY-MM-DD')` builds local midnight; a test pinned to a negative UTC offset (for example `TZ=America/Sao_Paulo` semantics through a fixed-offset helper) shows the cut-off on the right day
- [ ] Numeric comparisons and string comparisons that do not involve a `Date` behave as today (existing tests stay green)

## Notes

- **Cause (traced):** the toolbar writes `prop < date('v')` (`features/collection/toolbar/filter.logic.ts:70-77`). Frontmatter dates reach records as strings, and `compareValues` (`features/collection/expression/evaluator.ts:584-590`) does `toNumber('2026-03-01') - date.getTime()`, which is `NaN`, so every comparison is false. `date()` is `new Date(String(val))` (`evaluator.ts:311-314`), which parses a date-only string as UTC.
- **Fix direction:** when one side is a `Date` and the other a string, parse the string as a date (date-only as local midnight) before comparing; keep `NaN` as "no match".
- **Out of scope:** the date "is" operator on `file.mtime` / `file.ctime` is Issue 03. It lands first (Blocked by); share its date-only parse helper.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F65, F78.
- **Size:** S.

## Comments
