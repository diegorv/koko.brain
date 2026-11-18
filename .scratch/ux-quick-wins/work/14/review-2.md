VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | Commit 410ab9238 changes `DATE_TEXT` at `src/lib/features/collection/collection-block-widget.ts:445` to `/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z\|[+-]\d{2}:?\d{2})?)?$/`. Anchored at both ends, so `2026-11-18 Weekly review ...` fails the match (after the date the next char is a space followed by `W`, not `\d{2}:`), and `isNowrapValue` (`:448-449`) returns false, sending it to the titled span. `2026-06-10`, `2026-06-10T09:30:00Z`, `2026-06-10 09:30`, fractional seconds and `+hh:mm` offsets still match. The new test "keeps a datetime string on one line but treats a date-prefixed title as text" asserts `[true, false]` nowrap and a `span.cm-lp-collection-text` with `title`; against the old regex the second cell would be nowrap, so the test fails without the fix. The existing "keeps date and number cells on one line" test (plain `'2026-06-10'` string, `Date`, number) is unchanged and passes. `DATE_TEXT`/`isNowrapValue` have no other users in `src/`. |
| 2 | nit | rejection stands | The strict pin in `styles.test.ts` guards exactly what the Issue forbids (a new rule keyed on `.cm-lp-collection-table`); no current rule needs a wrapper-scoped selector, and the Resolution records how a later Issue should loosen it. No change needed. |

## Acceptance criteria re-checked

- [met] Failing test first (`src/tests/lib/features/collection/collection-block-widget.test.ts`): the table sits inside `.cm-lp-table-scroll`; the month-grid and linear-calendar tables do not; a date-string cell and a `Date` cell carry the nowrap class; a long text cell's span has `title`. — The fix touches the date-string branch only; "keeps date and number cells on one line" still asserts `'2026-06-10'` string and `Date` cells carry `cm-lp-qjs-nowrap`, and the new test adds a datetime string (nowrap) and a date-prefixed title (titled span). The regex is narrower than the Issue's literal `^\d{4}-\d{2}-\d{2}`, which is the round-1 reviewer's suggested fix and keeps every whole-date string a date cell. `collection-block-widget.test.ts`: 50 passed, exit 0.

## Checks run by the re-reviewer

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/features/collection/collection-block-widget.test.ts`: exit 0, 50 passed.
- Fix diff (`1de4bf018..HEAD`): only `collection-block-widget.ts` (regex + JSDoc), its test file (one added test, no test removed or weakened) and the review's Resolution. No scope creep, no `layer-baseline.json`, `BASELINE_SIZE`, composition-root or `src-tauri/` change.
- E2E not re-run: the fix changes only which string values take the nowrap branch in the cell builder, which the jsdom tests cover; the E2E specs assert `file.name` and status text, which do not hit the changed branch.

## Findings

None open or new.
