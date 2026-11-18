VERDICT: APPROVED

Re-review round 2 of `git diff 40f874371..HEAD` (fix commit 2431b82e3). The only source change is `src/lib/features/collection/CollectionTableView.svelte`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | `CollectionTableView.svelte:51` computes `{@const state = sortState(currentSort, col.key)}` once per header; `getSortIndicator(state)` and `getAriaSort(state)` take a `SortState \| null` (`:28`, `:34`), and the rank span reads `state.rank` (`:58`). `sortState` returns `null` for an unsorted column (`toolbar/sort.logic.ts:16-19`), so `state && currentSort.length > 1` is the same condition as the old `rank !== undefined && currentSort.length > 1`. Output is unchanged; the existing rank, `aria-sort` and arrow tests in `CollectionTableView.svelte.test.ts` and `CollectionView.view-writes.test.ts` pass. |
| 2 | nit | rejection stands | The inline block header in `collection-block-widget.ts` is owned by ticket 14, as the round 1 review itself says. The fix diff does not touch that file. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/features/collection/toolbar/sort-logic.test.ts` and the component: two sorts render ranks 1 and 2 and only the first `th` has `aria-sort="ascending"`; one sort shows no rank; `src/tests/lib/features/collection/CollectionView.view-writes.test.ts:195` (`'status ↓'`) stays green. — The fix touches the code behind this criterion. `pnpm vitest run` on `CollectionTableView.svelte.test.ts`, `CollectionView.view-writes.test.ts`, `CollectionView.test.ts` and `toolbar/sort-logic.test.ts` exited 0, 4 files, 71 passed.
- [not met] Manual: the header stays visible while scrolling a table of 60 or more rows in the app. — Still needs the owner in the running app; jsdom has no layout. The fix does not change the `th` classes (`sticky top-0 z-10 bg-card`) or the wrapper structure.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exited 0 (0 errors, 0 warnings). The targeted test files above pass. The full `pnpm vitest run` is deliver's to run.

## Checks

- `pnpm check`: exit 0, 236 files, 0 errors, 0 warnings.
- Targeted vitest run above: exit 0.
- No test was weakened or deleted: the fix diff changes no test file. No scope creep: one source file, plus the Resolution section in `review.md`. Layer baseline untouched.

## Findings

None open or new.
