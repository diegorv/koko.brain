VERDICT: APPROVED

Re-review of fix commit 58dda3e48 (`git diff 114058ca9..HEAD`).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `help/documentation/10-tasks-and-todoist.md:118-119` now says "lists only the tasks of that folder and its subfolders" and "which hides that folder and its subfolders", matching the subfolder-inclusive `inFolder` match the round 1 review traced. `sync-wiki-docs.test.ts` passes. |
| 2 | nit | resolved | `src/lib/features/tasks/TasksView.svelte:321-333` adds `target` (relPath for a note group, group key for a folder group) to each action, and the button at line 691 sets `aria-label={`${item.label} ${item.target}`}`, so the accessible name starts with the visible text. Covered by "names the group each action targets, keeping the visible text in the name" in `src/tests/lib/features/tasks/TasksView.sources.test.ts:501-512` for both folder actions and the note action. The test helper `action()` finds buttons by `textContent`, so the other action tests are unaffected by the new label. |
| 3 | nit | rejection stands | The hover and focus-within reveal needs a look in the running app; jsdom cannot check opacity from Tailwind group variants. Left to the owner, as Resolution 3 says. |

## Acceptance criteria re-checked

- [met] Failing test first, `task-query.logic.test.ts`: each property op on a scalar string, a number, a list, a missing key, an empty value and an object value. Fails today (no property clause). — The fix commit does not touch `task-query.logic.ts` or its test; the "property clause" suite still passes (754 tests in `src/tests/lib/features/tasks/` plus `sync-wiki-docs.test.ts`, exit 0). The full suite is deliver's to run.
- [met] A pure `onlyThisFolder(query, folder)` and `hideFolder` / `hideNote` in `task-query.logic.ts` return the new query: tested with no cards, with one card, and with the folder already excluded. — Unchanged by the fix; the "group header actions" logic suite passes.
- [met] `TasksView.test.ts` with real stores: a property card `status is active` lists only tasks from notes with that frontmatter; "Hide this folder" on a folder group removes its tasks and the sentence names the exclude; "Only this folder" leaves only that folder's tasks. — The fix only adds a test to `TasksView.sources.test.ts` (no test removed or weakened) and an `aria-label`; the existing property card, "Hide this folder" and "Only this folder" tests still pass with real stores.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 19 files, 754 tests passed.
- `git diff 114058ca9..HEAD --check`: clean.
- No other test or E2E spec asserts the action labels (searched `src/tests` and `e2e`).
- Scope: the fix touches only the help doc, `TasksView.svelte`, its sources test and the review file.

## Findings

None open or new.
