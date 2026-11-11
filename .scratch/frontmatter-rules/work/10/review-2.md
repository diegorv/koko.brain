VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `help/documentation/mods/14-cookbook.md` recipe 21: `run` now calls `editNote(ctx, toAbsolute(ctx, path), summarize)`, a single change. On the active tab that change goes through `view.dispatch`. The append and `summarized: true` come from one pure `summarize(text)`, which returns `text` unchanged when the marker is already set, so `editNote` writes nothing. The helpers match 04's `editNote` contract. The "Why" bullets now cover the single change and the caret. The `Uses:` line is updated. |
| 2 | minor | resolved | `auto-organize.service.test.ts` "ends the run while the action it started is still pending" captures the `setTimeout` callback (service line 225), clears the real timer, calls the callback by hand, and checks that it settles while the action never does. My probe: I made `runRuleAction` async and awaited both it and `action.run` in `evaluateAndMove`, and the test failed (exit 1). I restored the file, and `git status` is clean. |
| 3 | minor | resolved | `16-pitfalls-checklist.md:29` adds a `ruleActions` Manifest item covering non-empty ids, ids this mod owns, no dialog, and a marker or no-change check. It links to recipe 21. |
| 4 | nit | resolved | `AutoOrganizeRuleRow.svelte:72`: `NO_ACTION = ' none'`. `sanitizeRunAction` (`auto-organize.logic.ts:607-611`) trims every id, so no id the Select sees can start with a space. `setRunAction` (line 257) still maps the sentinel to `undefined`. The new test "shows a saved action whose id is "none" as that action, not as None" passes. The fix step's reason for not requiring the `mod:` prefix holds: with the prefix required, a mistyped id would disappear silently instead of showing as "(not loaded)" and being logged. |

## Acceptance criteria re-checked

- [met] A rule-invoked action that opens a dialog through `run.ui` does not hang the run: document that rule actions must not prompt, and test that a run whose action awaits nothing completes. — `runRuleAction` is not awaited (`auto-organize.service.ts:371,401`). The new test detects a run that waits on its action (probe above). The no-prompt rule is documented in recipe 21 ("No dialog") and now in the pitfalls checklist.
- [met] Settings lists only rule-enabled actions. — The options are None, `ruleActionsStore.list` and a saved missing id (`AutoOrganizeRuleRow.svelte:126-130`). The sentinel change leaves that list as it was. `AutoOrganizeRuleRow.test.ts` passes, including the new "none" id test.
- [met] The mods docs and the help pages are updated. Frontend gate passes. — Recipe 21 and the pitfalls checklist are updated. `pnpm check` exits 0. The targeted tests pass (see Checks). The full `pnpm vitest run` is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 230 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize src/tests/help`: exit 0, 19 files, 867 tests passed.
- Regression probe on finding 2: the awaited variant fails the new test. I reverted it, and the worktree is clean.
- Scope: the fix commit 2eb40be3d touches only recipe 21, one checklist line, the sentinel and its comment, two tests and the review's Resolution. It weakens or deletes no test, and it does not change `layer-baseline.json`.

## Findings

None open or new.
