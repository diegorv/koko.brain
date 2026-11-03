VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | No test covers `resetArmed` | resolved | `CollectionView.test.ts` "runs the query once on mount" counts `properties.get` calls on a filtered-out probe record. My probe: with the `if (!resetArmed) { ... }` block deleted from `CollectionView.svelte:132-135`, the test fails with "expected 2 to be 1". Source restored, and the test passes on HEAD. |
| 2 | minor | `visibleCount` never resets | resolved | `CollectionView.svelte:571-579` wraps `CollectionTableView` in `{#key activeViewIndex}`. My probe: with the key block removed, "starts a newly selected table tab at the row cap" fails (the row count is still 400 after the tab switch). `visibleCount` is the component's only local `$state` (`CollectionTableView.svelte:23`), so the remount loses nothing else. Keeping the expanded count across filter edits in one tab is a stated choice, and finding 2 allowed it ("record this as accepted behavior"). |
| 3 | nit | Cap and wording await owner sign-off | rejection stands | No code change. The values are the Issue's own (200, "Showing N of M", "Show more"). The owner confirms them at delivery. |

## Acceptance criteria re-checked

- [met] Failing first: a table with more rows than the cap renders the cap, shows "Showing N of M", and "Show more" adds rows — `CollectionTableView.svelte.test.ts` is unchanged by the fix commit and passes. The new tab test also checks 200 rows, then 400 after "Show more", then 200 and "Showing 200 of 450" after a tab switch.
- [met] The 3 `selfUpdate` latch tests and `CollectionView.test.ts:119` (external YAML re-seed) stay green — `pnpm vitest run src/tests/lib/features/collection/` exits 0: 20 files, 786 tests passed. The fix commit modifies no existing test and removes none. It only adds tests (diff e56461c5..HEAD: +85 lines in the test file, 0 deletions).
- [not met] Not verified by the agent: on device, opening `bug-triage.collection` from a Markdown tab logs no `[HB] stall` over 400 ms — this needs the owner on a device. Neither this review nor the fix step ran it, and it does not block the verdict.

## Findings

1. nit — src/lib/features/collection/CollectionView.svelte:572. `{#key activeViewIndex}` also remounts the table on every switch between table tabs, and Issue 14 plans a `{#key activeTab.path}` near the same code. Fix: none needed now. Whoever lands second should merge the two keys.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/collection/`: exit 0, 786/786 passed.
- Two red probes, one for each fix, as described in the table. After each probe I restored the source with `git checkout HEAD --`, and the worktree was clean afterwards.
- Scope: the fix commit touches only `CollectionView.svelte`, its test and the review file. The layer baseline, the composition roots and `src-tauri/` are unchanged.
- The full suite and `pnpm build` were not run; deliver runs them.
