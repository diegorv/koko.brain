VERDICT: APPROVED

# Issue 08 re-review (round 2): New here on the note list

Reviewed the fixes `git diff 83d704ef..HEAD` (d64fdaab, f8022de6, bc0a46c8, 88fdbdf7) in the worktree.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `RailNoteList.svelte:107` now uses `text-tab-text-inactive hover:text-tab-text-active` on the `bg-tab-bar` header (`RailNoteList.svelte:98`). Both tokens are pinned at 4.5:1 against `tabBar` in `READABILITY_PAIRS` (`theme-builder.logic.ts:110-111`), so the readability test guards the resting state in every built-in theme. `RailNoteList.test.ts:258` asserts the class. The hover pair (`tabTextActive` on `fileExplorerAccent`) is not pinned, same as the pre-fix `fileExplorerFg` on accent; the fix report's probe numbers are not reproduced here. |
| 2 | minor | resolved | `handleNewHere` returns early while `creating` is true and clears it in `finally` (`RailNoteList.svelte:59-76`). The test "ignores a second click while the first creation is pending" (`RailNoteList.test.ts:306-326`) holds `createFile` pending, clicks twice, and asserts one call; without the guard the second click reaches `createFile` again, so the test would fail. It also checks that the button works again after settling. A plain `let` is enough: the flag is not rendered. |
| 3 | minor | resolved | JSDoc on `createNoteHere` (`new-note.service.ts:13-15`) now states the post-write rejection and that `openFileInEditor` does not reject. No code change, as the finding allowed. |
| 4 | minor | rejection stands | The finding asked for no change; it is a note for the Type-lens Issue. |
| 5 | nit | rejection stands | The only real rule producer is the Inbox's `_organized: false` (`lens.logic.ts`); no string value needing YAML quoting exists yet. The finding itself deferred it to the first lens that needs it. |
| 6 | nit | resolved | Button now uses `cursor-default` (`RailNoteList.svelte:107`). |

## Acceptance criteria re-checked

- [met] A failed creation shows a toast and creates nothing — the guard wraps the same try/catch/toast; "toasts a failed creation and opens nothing" still passes, and the double-click test asserts no error toast on the success path.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the added test mocks only `fs.service::createFile` (already mocked in this file), asserts on the rendered button and the open call; no store getter added; no test weakened or deleted.
- [met] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme — tab-bar tokens on the tab-bar surface, both pinned against `tabBar` in `READABILITY_PAIRS` (`theme-builder.logic.ts:110-111`); no hard-coded colours. No visual pass was run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 217 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell`: exit 0, 6 files, 71 tests passed.
- Not run: the full suite and `pnpm build` (deliver's), the e2e spec, any screenshot. No `src-tauri/` changes. Worktree clean before writing this file.
- Scope: the fix diff touches only `RailNoteList.svelte`, its test, the `new-note.service.ts` JSDoc and the review file. No scope creep.

## Findings

1. **nit** `src/lib/features/rail-shell/RailNoteList.svelte:107`: the hover pair `tabTextActive` on `fileExplorerAccent` is not in `READABILITY_PAIRS`, so a future theme edit can make the hover state unreadable without a failing test. It was equally unpinned before the fix and the measured values pass. Fix (optional, later): use a hover background from the tab-bar region, or add an accent pair.

## Resolution

1. **nit, rejected (deferred).** The finding is accurate but marked optional and later, and neither fix fits this Issue. Adding `['ui', 'tabTextActive', 'ui', 'fileExplorerAccent', 4.5]` to `READABILITY_PAIRS` is not a test-only change: `ensureReadability` moves every failing foreground in that list, so in a theme that misses the pair it would recolour `tabTextActive` across the whole tab bar (editor tabs included). Dropping the hover background would remove the button's hover affordance. The tab-bar region also has no hover-background token yet; the other header buttons on `bg-tab-bar` (`OpenCalendarButton`, `DailyNoteButton`, ghost `Button`) use an unpinned `hover:bg-accent` too. Pinning header hover states belongs in a theme-token Issue that covers all of them. No code change.
