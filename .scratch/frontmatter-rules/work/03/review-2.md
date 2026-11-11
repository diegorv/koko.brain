VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `AutoMoveRuleRow.svelte:107-111` `addExpression` appends `createEmptyExpressionRow()` (`filter.logic.ts:296-298`, `raw: ''`) to the first group or a new `and` group; button at `AutoMoveRuleRow.svelte:202-210`, outside the shared `FilterPanel`, so views are unchanged. A blank raw row is not a blank value (`hasBlankValue` returns false for `raw !== undefined`) and `filterGroupsToFilter` drops it, so nothing saves until typed. Tests `AutoMoveRuleRow.test.ts:394-416` click the button, type `file.hasTag('x')`, fire `change` and assert the saved string / the `or` list with the new item appended; they cannot pass without the button. Help page `22-auto-move.md` says how to add the row. |
| 2 | minor | resolved | Follow-up Issue `.scratch/frontmatter-rules/issues/13-object-filter-reports-runtime-leaf-errors.md` (needs-triage, blocked by 03) describes the swallowed runtime error inside `not`. The help page states the limit in a callout. Shared engine untouched, as asked. |
| 3 | nit | resolved | Help page sentence under the table states the single-row shortcut applies only when the filter's only group holds one condition; this matches `filterGroupsToFilter` (`filter.logic.ts:158`). More accurate than the suggested wording. |
| 4 | nit | resolved | `isFilterObject` exported from `filter.logic.ts:328`, the private copy in `auto-move.logic.ts` removed; `filterProblem` keeps the `Array.isArray` guard (`auto-move.logic.ts:44`), which the shared helper lacks, so view behavior is unchanged. Tests: `filter-logic.test.ts` `isFilterObject`, and the array case in `auto-move.logic.test.ts` `filterProblem`. |
| 5 | nit | resolved | `hasBlankValue(row)` (`auto-move.logic.ts:59-61`) is the single predicate, used by `filterProblem` (`:40`) and the row's `blankValue` (`AutoMoveRuleRow.svelte:62`). Its own tests in `auto-move.logic.test.ts`. The unused `isUnaryOperator` import was removed from the component. |

## Acceptance criteria re-checked

- [met] `AutoMoveRuleRow.test.ts`: adding two rows in an "any" group saves `{ or: [..] }`; a stored string shows as one row; a complex string shows as a raw row and saves back unchanged. — the three original tests are unchanged and pass; the two new "Add expression" tests pass alongside them (`AutoMoveRuleRow.test.ts`, run by this review).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (230 files, 0 errors, 0 warnings, run by this review); targeted vitest runs exit 0 (see Checks). The full `pnpm vitest run` is deliver's to run.

## Findings

None open or new.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-move/ src/tests/lib/features/collection/toolbar/ src/tests/lib/architecture/ src/tests/help/`: exit 0, 34 files, 880 tests passed.
- `pnpm vitest run src/tests/lib/core/settings/settings-copy.test.ts src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 2 files, 18 tests passed.
- No test weakened or deleted in the fix commits (`git diff a834b8d51..HEAD` only adds tests). Layer baseline and `BASELINE_SIZE` untouched. Changes stay in auto-move, its help page, and two small exports in `filter.logic.ts` that views do not call differently.
- Full suite not run (deliver's job).
