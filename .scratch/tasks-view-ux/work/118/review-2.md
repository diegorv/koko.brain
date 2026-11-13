VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `headingGroups` (`task-query.logic.ts:870-905`) walks each bucket backwards and keeps a dimmed row only when a kept row names it as `parentLine`, so a dimmed chain above a match stays and a dimmed parent whose child is under another heading is dropped. A kept row whose `parentLine` is not kept in its group gets `taskDisplayText(parent)` as `breadcrumb` when the parent is among `rows`, matching the flat path (`groupTaskRows`, line ~1004). `count` counts non-dimmed kept rows, and a group with none is left out. Tests: the existing "only a dimmed parent" case now asserts the child's breadcrumb `'outside parent'`; new cases cover the orphan in a group with another match (`Misc, p` holds only `sibling`, `List, p` holds `child` with breadcrumb) and the dimmed grandparent chain (`count` 1, no breadcrumbs). `TasksView.svelte:788` renders `breadcrumb` for non-flat rows too, so heading rows show it. |
| 2 | nit | resolved | `collapseKey` returns `property:` + `JSON.stringify([name, key])` (`task-query.logic.ts:738-740`). Only `TasksView.svelte:316` builds keys with it, and `collapsedGroups` lives in memory (`tasks.store.svelte.ts:50-54`), so no saved key changes format. Test: `{property:'a:b'},'c'` differs from `{property:'a'},'b:c'`; the existing exact-key assertion was updated to the new form, not dropped. |
| 3 | nit | resolved | `labelOrder` uses `compareTaskPaths` (`Intl.Collator` numeric, `sensitivity: 'base'`, raw tie-break), so type labels stay case-insensitive as the Issue asks and numbers sort numerically. Test: `10`, `2`, `'1'` give `['1', '2', '10']`. The swapped expectation in the object/mixed-list test follows from the collator placing `{` before letters; both groups and `(empty)` last are still asserted. |

## Acceptance criteria re-checked

- [met] Failing test first, `task-query.logic.test.ts`: type groups with a "No type" bucket last; property groups on a scalar, a number, a list (`[b, a]` lands in "a, b"), and missing and empty values; heading groups including tasks before the first heading, and a failing parent kept dimmed above a matching child. Fails today (no such groupings). — The fixes keep every case review.md cited; the dimmed-parent-above-child case still asserts `dimmed: true` above the children, plus the new orphan and chain cases. `pnpm vitest run src/tests/lib/features/tasks/` exit 0, 18 files, 777 tests.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 18 files, 777 passed (covers `task-query.logic.test.ts`, changed by the fix, and the `TasksView*.test.ts` files that render the grouping). The full suite is deliver's to run.
- Fix diff touches only `task-query.logic.ts`, its test file and review.md. No test weakened or deleted, no `layer-baseline.json`, `BASELINE_SIZE` or composition-root change, no `src-tauri/` change.

## Findings

None open or new.
