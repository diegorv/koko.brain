VERDICT: APPROVED

Re-review, round 2, of the fixes after `review.md` (230de2475..HEAD): commit 20f32e242, which changes `help/documentation/10-tasks-and-todoist.md:129` and adds `## Resolution` to `review.md`. No source or test file changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | rejection stands | The Issue says the handler calls `preventDefault()` on a non-null action, and a repeated Space maps to `null` by the criterion's own test list. Changing that is a behavior change outside the Issue; the round 1 finding itself proposed a follow-up Issue. |
| 2 | nit | resolved | Line 129 now reads "Only one task row is in the Tab order at a time." This matches the markup (only the tab-stop row reads `tabindex="0"`) and no longer claims the whole list is one stop, since the row's controls and the note title buttons are also tab stops. No test reads that sentence (grep of `src/tests` and `scripts`). |
| 3 | nit | rejection stands | Commit 32c330e00 is a branch commit; rewriting it is out of scope for fix. `grep -n` confirms the "Commands Without Shortcuts" row is at `help/documentation/20-keyboard-shortcuts.md:116`, as the Resolution states, so deliver has the correct number if it edits the squash body. |

## Acceptance criteria re-checked

- [met] `help/documentation/10-tasks-and-todoist.md` and `help/documentation/20-keyboard-shortcuts.md` list the Tasks view keys (they work while a task row has focus, not while typing in a field) and the palette command, and say that `/` opens the vault search, not the Tasks search box (PRD A12). In doc 20 the new `## Tasks` section goes after the `## Calendar` section's table, not inside it (`event-calendar-keys.logic.test.ts` reads that section), and the command joins "Commands Without Shortcuts". — The fix changes only the first sentence of doc 10's `### Keyboard` section; the keys table, the focus-scope sentence ("not while you type in the search box or the section tag box"), the palette command and the `/` sentence are unchanged. Doc 20 is untouched by the fix, its command row is at line 116.

## Findings

None open or new.

## Checks run by the re-reviewer

- `pnpm check` (worktree root): exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/help/ src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 13 files, 386 tests passed (the tests that read the help docs).
- Regressions: the fix diff touches no test, no source file and no baseline. No scope creep.
- The full suite was not run; deliver runs it.
