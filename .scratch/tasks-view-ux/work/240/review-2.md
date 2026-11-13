VERDICT: APPROVED

Re-review round 2 of the fixes after review.md (first committed in 55cb811b8): `git diff 55cb811b8..HEAD` is commit 45e39572a. It changes TasksView.svelte:409 (one line) and adds one test to TasksView.collapse.test.ts, plus the "## Resolution" in review.md.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | TasksView.svelte:409 is `rowElement(current)?.focus();` again, the same as main (`git show main:src/lib/features/tasks/TasksView.svelte`, line 380). With the build's `rowElement(tabStopRow(rendered, next, current))` put back temporarily, the new test "a refetch with the same rows after a mouse collapse moves no focus and keeps the current row" fails (1 failed, 11 passed). With the fix it passes. The worktree was restored afterwards. The test exercises the real path: focus b1, blur, click `Collapse B`, `buildTaskIndex()` through `mockTaskFetch`, then it asserts `<body>` and current row b1. |
| 2 | nit | rejection stands | No change was needed, as review.md says. Cases (a) to (c) pin the `tabStopRow` fallback. Round 1's probe 1 showed they fail without it. |

## Acceptance criteria re-checked

- [met] `TasksView.collapse.test.ts`, a collapse is not a removal: notes A (a1), B (b1, b2), C (c1). Focus b1, then `focus()` the `Collapse B` chevron and click it: `document.activeElement` is still the chevron, the store's current row is still b1, and c1 holds `tabindex="0"`. Click `Expand B`: b1 holds `tabindex="0"` again and focus has not moved. — Unchanged by the fix. The test still passes. A keyboard collapse leaves focus on the chevron, not `<body>`, so the changed branch at :409 does not fire.
- [met] `TasksView.collapse.test.ts`, Open filter: notes A (a1), B (b1, collapsed), C (c1). Focus a1 and press Space; the refetch drops a1: focus is on c1, not on `<body>`. — This case goes through the `chosen !== current` branch, TasksView.svelte:415, which still focuses `tabStopRow(rendered, next, chosen)`. The test passes.
- [met] `TasksView.collapse.test.ts`, each case with unmount and mount: (a) notes A (a1), B (b1, b2), C (c1); current row b1; B collapsed: c1 holds `tabindex="0"` and focus, every other row `-1`. (b) Notes A (a1), C (c1), B (b1, b2), with B last in path order; current b1, B collapsed: the last rendered row (c1) holds them. (c) Note A with 60 tasks followed by note B (b1): click `Show 10 more`, focus row 55, remount: b1 holds them; with no note B, row 50 holds them. (d) Only note A, current row in it, A collapsed: focus is on the `Expand A` chevron and no row has `tabindex="0"`. — These cases use the focus on open and the roving tab stop (`tabStopKey`, :323), which the fix does not touch. All cases pass.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 14 files, 548 tests. This includes TasksView.collapse.test.ts (12 tests), TasksView.grouping.test.ts and TasksView.keyboard.test.ts.
- Probe A: put the pre-fix line :409 back. The new test fails. Restored.
- Probe B: added a temporary test to TasksView.grouping.test.ts, then deleted it. It backs finding 1 below. The worktree is clean.
- Full suite not run: that is deliver's job.
- No test was weakened or deleted. The fix diff adds one test and one import, and nothing else changed scope.

## Findings

1. minor, src/lib/features/tasks/TasksView.svelte:409: the fix moves the lost-focus case onto keyboard users when a row is recreated inside a collapsed group.
   - Scenario: Display > Status, Status > All, Done collapsed. Focus the todo row "Plan trip" and press Space. The row moves to the collapsed Done group, so its element is recreated off-DOM and focus falls to `<body>`.
   - Probe B result: `document.activeElement === document.body` with the current row still Alpha:2 (hidden). With the build's line, focus went to the next rendered row (File taxes).
   - Before the fix, the same branch handled both a mouse collapse and a row recreated in another group. Each version breaks one of the two cases.
   - The Issue says Issue 113's focus-follow reads the `tabStopRow` result. No checklist criterion covers this case, and main has no collapse, so this is not a regression against main.
   - Fix (a follow-up is fine): tell the two cases apart. One way is to use `tabStopRow(rendered, next, current)` only when `lastFocusedRowEl?.dataset.taskKey === current` and `current` was in the previous run's `rendered`, which means it was recreated rather than collapsed away. Otherwise use `rowElement(current)`. Add the Status-grouping test above.
