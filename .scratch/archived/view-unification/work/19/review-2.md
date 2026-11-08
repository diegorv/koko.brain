VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: `formula.archived` counted as a citation | resolved | `astCitesArchived` (collection.logic.ts:287-294) returns false for a `member` whose object is the identifier `formula`, and a dotted call callee starting with `formula.` checks only `segments.slice(2)`. Deeper paths still cite: `formula.x.archived` is a member whose object is a member, so `archived` is still matched, and `formula.x.archived.lower()` keeps `archived` after the slice. Call args are still walked. `formula.archived == true` and `formula.archived.contains('x')` are in the not-cited cases (collection-logic.test.ts:843-844). The existing cited cases are unchanged. |
| 2 | nit: `includeArchived` sort test never seen failing | rejection stands | No change was asked for. The lens and CollectionView tests cover the same path end to end. |

## Acceptance criteria re-checked

- [met] Failing tests first: — The fix round adds two not-cited cases to `describe('filterCitesArchived')` in collection-logic.test.ts and removes or weakens no test. The fix report says both were seen failing first. I did not replay that, but it is consistent: before the fix the `member` case matched `property === 'archived'` whatever the object was.
- [met] `help/documentation/12-collection.md` and `25-types-and-relationships.md` (Archived Note Filtering, `limit`, the view keys table) state the rule. — 12-collection.md:405 now says a formula named `archived` (`formula.archived`) does not count, which matches the code. 25-types-and-relationships.md is not changed by the fix round and still states the rule.

## Checks run

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/collection/collection-logic.test.ts`: exit 0, 120/120 passed.
- Full suite and `pnpm build`: not run, deliver runs them.
- Scope: the fix commit touches only collection.logic.ts, its test, 12-collection.md and the review file. Layer baseline not touched.

## Findings

None.
