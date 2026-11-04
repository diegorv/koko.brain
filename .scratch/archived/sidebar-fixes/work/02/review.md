VERDICT: APPROVED

# Issue 02 review: remove the dead ⌘⌫ hint

## Acceptance criteria

- [met] Neither context menu shows a shortcut next to "Move to Trash" — `git diff main...HEAD` deletes `<ContextMenu.Shortcut>⌘⌫</ContextMenu.Shortcut>` from `src/lib/core/file-explorer/FileExplorer.svelte` (was L383) and `src/lib/features/type-definitions/TypeNoteList.svelte` (was L700). `grep -rn "⌘⌫\|Mod-Backspace" src` finds nothing left. Tests `FileExplorer context menu shortcut hints > shows no shortcut next to Move to Trash` and `TypeNoteList file operation failures > shows no shortcut next to Move to Trash and only the bound F2 hint` assert the item text is exactly "Move to Trash" and it has no `[data-slot="context-menu-shortcut"]` (the slot is set in `src/lib/components/ui/context-menu/context-menu-shortcut.svelte:15`); both pass.
- [met] No other menu item shows a shortcut that is not bound (check both menus while there) — `grep -rn "Shortcut" src/lib/core/file-explorer src/lib/features/type-definitions` now finds only F2 on Rename (`FileExplorer.svelte:378`, `TypeNoteList.svelte:695`). F2 is bound on the row keydown: `FileTreeItem.svelte:281` calls `startRename()` (defined L110) and `TypeNoteList.svelte:586` calls `handleStartRename(note)`. The file tree's empty-area menu (`{:else}` branch, `FileExplorer.svelte:384-405`) has no hints. The keybindings module registers no delete/trash/rename command. Tests assert the hints are exactly `['F2']` in both menus.
- [met] Existing context-menu tests updated; Move to Trash still works from both menus — new click tests assert `moveToTrash('/vault', '/vault/Projects/a.md', false)` (file tree) and `deleteItem('/vault/notes/alpha.md', false)` (Types list) with no toast; the existing failure-toast tests that click "Move to Trash" still pass. Probe: with the click line removed, the TypeNoteList click test fails both in its file and alone (`toHaveBeenCalledWith` not satisfied), so it does not ride on calls from the earlier "toasts when moving a note to trash fails" test. FileExplorer's `beforeEach` runs `vi.clearAllMocks()`, so its click test is isolated too. The e2e spec matches `/Move to Trash/i` and is unaffected by the hint removal; the e2e run is deliver's.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/file-explorer/FileExplorer.test.ts src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts`: exit 0, 2 files, 26 tests passed. These two files are the ones the diff changes and the test files of both changed components; my test verdict rests on them.
- Probe `zz-probe-02.test.ts` (copy of the TypeNoteList test with the click removed): failed as expected; deleted afterwards, worktree clean.
- Full suite and `pnpm build`: not run, deliver's to run.
- No `spec.md` exists for sidebar-fixes; no ADR bears on this change. Scope: two markup lines, tests and the discovery note only. The commit message follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files).

## Findings

1. nit, `src/tests/lib/core/file-explorer/FileExplorer.test.ts:213`: `items.find(...)!` turns a missing "Move to Trash" item into a `TypeError` on `.textContent` rather than a readable failure. Optional fix: `expect(trash).toBeDefined()` before using it. The TypeNoteList test (`TypeNoteList.view.test.ts:562`) has the same pattern, as does the existing `chooseMenuItem` helper there.
2. nit, `src/tests/lib/core/file-explorer/FileExplorer.test.ts:219`: the F2-only hint check opens the menu on a file row only. The folder-row menu shares the same `{#if target}` markup, and the empty-area menu has no `Shortcut` in source, so nothing is missing today. A test is optional.

## Resolution

1. Fixed. Both new tests (`FileExplorer.test.ts` "shows no shortcut next to Move to Trash", `TypeNoteList.view.test.ts` "shows no shortcut next to Move to Trash and only the bound F2 hint") drop the `!` on `find(...)` and assert `expect(trash).toBeDefined()` before reading it. The pre-existing `chooseMenuItem` helper is left as it is (outside this Issue's change).
2. Rejected (optional). The folder-row menu renders the same `{#if target}` markup as the file-row menu, and the empty-area menu has no `Shortcut`, so a folder-row test would duplicate the file-row assertion without covering a different code path.
