# 03: The date "is" filter never matches `file.ctime` / `file.mtime`

**What to build:** A filter row "file.mtime is 2026-11-03" (and the same for `file.ctime`) matches the notes modified (created) on that day. Today it matches nothing, in the collection toolbar and in the note list's view toolbar alike.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Write the failing test first: a record whose `mtime` is local 2026-11-03 at 00:30 and one at 23:30 both match `file.mtime == '2026-11-03'`; records on local 2026-11-02 and 2026-11-04 do not; the same for `file.ctime` (logic test, real evaluator, through `evaluateExpression` in `src/tests/lib/features/collection/expression/evaluator.test.ts` or `executeQuery` in `src/tests/lib/features/collection/collection-logic.test.ts`). Build the times with the local constructor (`new Date(2026, 10, 3, 23, 30).getTime()`), not from a UTC string
- [x] The same assertions hold under `withTimeZone('America/Sao_Paulo', ...)` and `withTimeZone('Asia/Tokyo', ...)` from `src/tests/fixtures/timezone.fixture.ts`, in a `describe.runIf(runtimeTimeZoneSwitchWorks())` block, so an implementation that compares the UTC day (`toISOString().slice(0, 10)`) fails
- [x] `file.mtime == ''` and `file.mtime == 'abc'` never match and never throw (logic test)
- [x] The row still round-trips: `parseExpressionToRow("file.mtime == '2026-11-03'")` yields property `file.mtime`, operator `is`, value `2026-11-03`, and `filterRowToExpression` of that row returns the identical string (`src/tests/lib/features/collection/toolbar/filter-logic.test.ts`, real filter logic)
- [x] "is" on a frontmatter date property (stored as a string) keeps working as today: `due == '2026-11-03'` matches a record whose `due` is the string `2026-11-03` (logic test)

## Notes

- **Traced, not reproduced.** The toolbar writes a date "is" row as `prop == 'YYYY-MM-DD'` (`features/collection/toolbar/filter.logic.ts:44-45`). `file.ctime` / `file.mtime` resolve to `Date` objects (`features/collection/expression/evaluator.ts`, `resolveFileProperty`), and the evaluator's `looseEqual(Date, string)` (`evaluator.ts:575-581`) compares `getTime()` with `Number('YYYY-MM-DD')`, which is `NaN`, so it is always false. Even a parsed date would compare exact milliseconds, not the day.
- **Where the fix goes:** in the evaluator's `looseEqual`, not in the toolbar. The toolbar's `is` operator is shared by text, list and date properties (`getOperatorsForType`) and `filterRowToExpression` does not know the property type, so a serialization change would alter text and list equality. `!=` goes through `!looseEqual`, so it follows.
- **Main-session decision (scope of the equality change):** only a `Date` compared with a string that is exactly `YYYY-MM-DD` gets day semantics: it matches when the Date's local calendar day (`getFullYear` / `getMonth` / `getDate`) equals that day. Every other pairing (Date vs Date, Date vs number, Date vs any other string, two non-Dates) keeps today's code path.
- **UTC trap:** do not parse the day string with `new Date('YYYY-MM-DD')`; that is UTC midnight, and west of UTC it lands on the previous local day. Build local midnight with `new Date(y, m - 1, d)`, the way `extractDateFromRecord` does (`features/collection/calendar.logic.ts:83-88`).
- **Shared helper (Issue 05 reuses it):** add one exported pure helper that reads a `YYYY-MM-DD` string as local midnight and returns `null` for anything else (empty, `abc`, out-of-range parts), in a `.logic.ts` next to the evaluator (for example `features/collection/expression/date-value.logic.ts`) with its own tests. `calendar.logic.ts` keeps its inline parse; moving it is not part of this Issue.
- **Main-session decision (`date()` form):** a hand-written `file.mtime == date('2026-11-03')` stays a Date vs Date comparison (exact milliseconds). The toolbar already parses that form as an `is` row (`mapDateBinaryOp`) and writes it back as `file.mtime == '2026-11-03'` when the row is saved; that existing rewrite is accepted, since it moves the row to day semantics. Issue 05 later gives a date-only `date()` literal day precision, so after 05 this form matches the whole day too.
- Frontmatter date values reach records as strings: Rust projects a plain YAML scalar such as `2026-11-03` as a JSON string (`src-tauri/src/vault/parsing.rs`, `parse_scalar` fallback), `project_note_record` copies the frontmatter into `properties` (`src-tauri/src/commands/vault.rs:854`), and `fromV2` copies them as-is (`features/collection/collection.service.ts:37-45`). So there "is" is a plain string equality and works. A frontmatter datetime (`2026-11-03T10:00`) with "is 2026-11-03" stays a string mismatch; that is out of scope.
- Both surfaces share `filter.logic.ts` and the evaluator: the collection view and the inline block run `executeQuery`, and the note list's view toolbar (`features/rail-shell/RailNoteList.svelte`, `FilterPanel`) does too through `lens.logic.ts`. `describeViewFilters` in `lens.logic.ts` only prints the expression, so its text does not change.
- The existing filter-logic test checks only the operator list for dates, not evaluation.
- Found during the review of the former view-create-dialog Issues (2026-11-04, now Issues 17-19 here).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F78 (from the former view-filter-bugs 03).

## Comments

- **Triage (2026-11-04):** ready-for-agent. Code claims re-checked: the toolbar writes `prop == 'YYYY-MM-DD'` for is (filter.logic.ts:44-45) and looseEqual sits at evaluator.ts:575; the timezone fixture exports withTimeZone and runtimeTimeZoneSwitchWorks. Known gap, out of scope as written: "is" on a frontmatter datetime string stays a string mismatch.
- **Delivered (2026-11-04, branch issue/03-date-is-never-matches-file-dates):** `looseEqual` in `features/collection/expression/evaluator.ts` compares local calendar days for a Date against an exact `YYYY-MM-DD` string (either order), through the new `parseLocalDateOnly` helper in `features/collection/expression/date-value.logic.ts`; tests in evaluator.test.ts (incl. Sao_Paulo / Tokyo), date-value.test.ts and a filter-logic round-trip test. Review round 1: APPROVED (one minor finding, the `file.mtime == ''` match on an mtime of 0, left as main's behavior pending an owner decision; one nit, no change). Full suite: 468 files, 10891 passed, 1 skipped, 1 todo; `pnpm build` ok (exit=0).
