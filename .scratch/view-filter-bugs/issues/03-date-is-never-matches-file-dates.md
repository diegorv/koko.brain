# 03: The date "is" filter never matches `file.ctime` / `file.mtime`

**What to build:** A filter row "file.mtime is 2026-11-03" (and the same for `file.ctime`) matches the notes modified (created) on that day. Today it matches nothing, in the collection toolbar and in the note list's view toolbar alike.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] "is <day>" on `file.mtime` / `file.ctime` matches notes whose date falls on that local day, whatever the time (logic test, real evaluator)
- [ ] The row still round-trips between the toolbar and the saved expression
- [ ] "is" on a frontmatter date property (stored as a string) keeps working as today

## Notes

- **Traced, not reproduced.** The toolbar writes a date "is" row as `prop == 'YYYY-MM-DD'`. `file.ctime` / `file.mtime` resolve to `Date` objects, and the evaluator's `looseEqual(Date, string)` compares `getTime()` with `Number('YYYY-MM-DD')`, which is `NaN`, so it is always false. Even a parsed date would compare exact milliseconds, not the day.
- Frontmatter date values reach records as strings, so there "is" is a plain string equality and works (inferred from the type inference sampling ISO strings; not traced through the Rust record projection).
- The existing filter-logic test checks only the operator list for dates, not evaluation.
- Found during the review of `.scratch/view-create-dialog` (2026-11-04).

## Comments
