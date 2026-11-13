VERDICT: APPROVED

## Acceptance criteria

- [met] Each statement listed above matches the current code; the commit names the line each claim was checked against — Re-verified on the branch: header has three elements (`FileExplorerHeader.svelte:9-14`; OpenCalendarButton without `useSelectedDate` opens today, `OpenCalendarButton.svelte:17-19`) -> `02-file-explorer.md:9-13`; palette New File / Folder / Canvas / Kanban all pass `vaultStore.path` (`command-palette.service.ts:71-113`), context menu uses `getCreationDir` (`FileExplorer.svelte:87-90`, empty-area items at :385-405 pass `null`) -> `:24`; `sort_nodes` dirs first then `natural_cmp` case-insensitive with numeric digit runs (`src-tauri/src/commands/vault.rs:1355-1405`), TS `applyFolderOrder` only stable-reorders by `_order` (`fs.logic.ts:379-458`) -> `:96`; whole row `onclick={handleClick}` (`FileTreeItem.svelte:267`), handler toggles and opens folder note (`:91-99`), chevron is icon only (`:285-289`) -> `:131`; bookmarks only consumed outside the feature by the menu label (`FileExplorer.svelte:68`, :338-346) plus path-change / lifecycle plumbing, nothing lists them -> `:151-155`; calendar dots keyed on Markdown files by frontmatter `created` else filesystem `createdAt` (`calendar.service.ts:51-75`) -> `08-periodic-notes-and-calendar.md:22-24`; Types page `25-types-and-relationships.md:407,:419` match `resolveViewListSort` (`type-note-list.logic.ts:94-96`, used at `TypeNoteList.svelte:280`) and `getViewSort` default `modified` (`type-sidebar.logic.ts:459-462`), unchanged. Commits 29d9e44b and ce432410 name the code line for every claim, including the unchanged Types page claim.
- [met] No new promises about planned redesign work — The diff (`git diff main...HEAD -- help`) adds only present-tense statements of current behavior; no "planned", "coming", "soon" or future wording.
- [met] Any test that reads the help pages still passes — Only `src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts` reads `help/documentation` (:159); `src/tests/help/*` read `help/examples`. Ran `pnpm vitest run src/tests/help src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts`: exit 0, 5 files, 110 tests passed. Full suite is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Test verdict rests on: `src/tests/help/examples-scoping.test.ts`, `src/tests/help/queryjs-features-scoping.test.ts`, `src/tests/help/templates-script-paths.test.ts`, `src/tests/help/type-definitions-views.test.ts`, `src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts` (all pass). The diff touches no source code, so there are no source test files to run.
- Worktree clean before writing this file; no source code changes in the branch.

## Findings

1. minor — `help/documentation/02-file-explorer.md:145` — The same page still says File Explorer is "The default folder tree view", but the default `layout.sidebarMode` is `'types'` (`src/lib/core/settings/settings.store.svelte.ts:53`). Outside this Issue's list (the build report flags it), so not a blocker; fix: open a follow-up Issue to say Type View is the default mode, or drop "default".
2. nit — `help/documentation/02-file-explorer.md:131` — "When folder notes are enabled, the same click also opens the folder note" reads as if every folder has one; `handleClick` opens it only when `findFolderNote` finds one (`FileTreeItem.svelte:84-87,94-96`). Fix: "also opens the folder's folder note, if it has one".

## Resolution

1. Fixed: dropped "default" from the File Explorer bullet (`02-file-explorer.md:145`), so the page no longer names a default mode; the default `layout.sidebarMode` is `'types'` (`settings.store.svelte.ts:53`).
2. Fixed: `02-file-explorer.md:131` now reads "also opens the folder's folder note, if it has one", matching `folderNotePath` being null when `findFolderNote` finds none (`FileTreeItem.svelte:84-87,94-96`).
