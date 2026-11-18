VERDICT: APPROVED

Re-review, round 2, of the fixes in `git diff 0e58c9da9..HEAD` (commit 1eaabc7fb) on `issue/12-note-list-empty-states-cause`.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `help/documentation/01-getting-started.md:120` still said **Loading...** | resolved | The line now reads **Loading notes**, matching the UI title. `grep -rn "Loading\.\.\." help/documentation` finds nothing else. |
| 2 | nit | Clear search dropped focus to `body` | resolved | `runEmptyAction('clear-search')` (`RailNoteList.svelte:755-761`) clears `query` and focuses `[data-note-list-search] input` under the new `bind:this={listRoot}` root (`:772`). The selector matches `RailListSearch.svelte:84`, the same one the test helper `searchInput()` uses. The search row stays mounted on Clear search (the input value is asserted `''`), so the input exists when `focus()` runs synchronously. The test (`RailNoteList.search.test.ts:401-408`) focuses the button, clicks it and asserts `document.activeElement` is the input. Without the fix, jsdom moves focus to `body` when the focused button is removed, so the assertion would fail. No existing assertion was removed or loosened. |

## Acceptance criteria re-checked

- [met] Failing test first, `RailNoteList.search.test.ts`: on `TODAY_LENS` with one dated note, a no-match query shows `[data-note-list-no-matches]` with `No notes match "zzzz"` and no `[data-note-list-group-empty]` (red today); Clear search empties the input and restores rows on a flat list; with the full-text `invoke` pending (pattern `RailNoteList.toolbar.test.ts:430-445`) `[data-note-list-searching]` shows and no-match does not, then no-match shows once it resolves empty. The neighbourhood case at `:326` changes on purpose only when every group is 0. — The fix only adds a focus step and one assertion to the Clear search case; it still asserts the empty input, rows alpha/beta/gamma and no no-match. The file passes with the other three RailNoteList files (165/165).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0, 0 errors, 0 warnings. The targeted files `RailNoteList.search.test.ts`, `RailNoteList.test.ts`, `RailNoteList.view.test.ts` and `RailNoteList.toolbar.test.ts` pass (exit 0, 4 files, 165/165). The full suite is deliver's to run.

## Findings

None open, none new.

## Checks run (worktree root, each read from its own exit status)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on the four `RailNoteList*.test.ts` files above: exit 0, 165/165.
- Scope: the fix touches only the two finding sites, the one test case and review.md's Resolution. No regression or scope creep found. Not checked: focus in the real app, E2E.
