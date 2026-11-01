VERDICT: APPROVED

# Issue 14 re-review, round 2

I reviewed the fix commits `git diff 55c9bbe7..HEAD` (aa765a69, 1099b2e2, 4736b5a5, 0b691c2a).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | NoteRowMenu.svelte:208 wraps Change icon and Favorite in `{#if isMarkdownFile(target.path)}`. `isMarkdownFile` (fs.logic.ts:39) accepts only `.md` / `.markdown`. A grep over `src/lib` shows NoteRowMenu.svelte:215 as the only caller of `toggleFavoriteForPath`, so no frontmatter write can reach a canvas, kanban, view, collection, PDF or image row. NoteRowMenu.test.ts checks that a canvas row gets the full menu minus those two items. RailNoteList.test.ts checks the same for the Board, Tasks, Open, Spec and Shot rows in a real folder lens, and that a markdown row still favorites. The tests mock `toggleFavoriteForPath`, but with the menu item gone, no path reaches it, so asserting at that boundary is enough. |
| 2 | minor | resolved | lens.logic.ts:601 returns null when the tree is empty. The test in lens.logic.test.ts ("leaves everything saved when the tree is empty") passes a non-root pick and an expanded list and expects null. |
| 3 | minor | resolved | RailNoteList.svelte:202: `currentNewNoteRule` returns null when a folder lens does not resolve, and `resolved` is the `$derived` at :92, so the rule tracks the tree. The test in RailNoteList.test.ts removes the folder from `fsStore`, then checks that `[data-note-list-new]` is gone and `createFile` never ran. Updating `railFolder` on a folder rename or delete is left to Issue 15. |

## Acceptance criteria re-checked

- [met] New here creates the note in the picked folder and the list shows it — the fix only hides the button when the folder lens does not resolve (RailNoteList.svelte:202). The existing test "creates the New here note in the picked folder, and the list shows it" still passes, and the new test covers the folder-gone case.
- [met] Expanded folders and the picked folder survive a restart; a folder that no longer exists falls back to the default item — the staleFolderPickFix tests for a gone pick and for pruning still pass. The new empty-tree guard stops a failed tree load from erasing the saved state. See nit 1 for the one edge case.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the new tests use the real `fsStore` and the real `lens.logic.ts`, and they assert on rendered menu labels and buttons. They add an empty-tree case and a gone-folder case. No store getters were added. No test was weakened or deleted: the diff only adds tests.

## Checks I ran

- `pnpm check`: exit 0, 219 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell/ src/tests/lib/features/note-list/ src/tests/lib/core/layout/`: exit 0, 14 files, 348 tests passed. These are the test files of everything the fixes changed or added (lens.logic, RailNoteList, NoteRowMenu, and AppShell, the caller of staleFolderPickFix).
- I did not run the full suite or `pnpm build`: deliver runs them.
- Scope: the fixes touch only what the three findings name. I found no creep and no regressions.

## Findings

1. **nit** — src/lib/features/rail-shell/lens.logic.ts:601. The empty-tree guard also skips the fallback when a vault really is empty and holds a stale non-root pick (every file deleted outside the app). The rail then stays on Files with an unresolved lens: an empty list, no label, and no New here button after finding 3's fix. This does no harm and recovers once the user picks a folder. If Issue 15 tracks folder deletion, it could close this too, for example by gating the fix on a successful tree load instead of on tree length. No change needed for this Issue.

## Resolution

1. nit (lens.logic.ts:601, empty vault with a stale non-root pick): rejected for this Issue. The reviewer marks it harmless and "No change needed for this Issue"; telling an empty vault from a failed tree load needs a load-success signal plumbed from `initializeVault` into `staleFolderPickFix`, which belongs with folder rename/delete tracking in Issue 15. No code change.
