# Issue 08 discovery: help pages match behavior

Docs-only change. No code, no tests read these three pages (`src/tests/help/*`
covers other pages; grep for `02-file-explorer`, `08-periodic`, `25-types` finds none).

## Claims re-verified on main

`help/documentation/02-file-explorer.md`:
- `:9-12` header "two elements". Code: `FileExplorerHeader.svelte:9-14` renders
  OpenCalendarButton, DailyNoteButton, SidebarModeToggle (three).
  OpenCalendarButton opens on today outside calendar mode (`OpenCalendarButton.svelte:17-19`).
- `:23` "created inside the currently selected folder". Code: palette New File /
  Folder / Canvas / Kanban all pass `vaultStore.path` (`command-palette.service.ts:75-113`);
  context menu uses `getCreationDir` (`FileExplorer.svelte:87-90`): clicked folder,
  parent of a clicked file, vault root for the empty area.
- `:95` "sorted alphabetically". Code: `sort_nodes` -> `natural_cmp`
  (`src-tauri/src/commands/vault.rs:1355-1380`, Issue 06): case-insensitive, digit runs numeric.
- `:130` "chevron or the folder name". Code: the whole row button has
  `onclick={handleClick}` (`FileTreeItem.svelte:267`), `handleClick` toggles and opens the
  folder note (`:91-99`); the chevron is only an icon (`:285-289`).
- `:148-153` bookmarks "for quick access". Code: the only consumer outside the feature is
  `bookmarksStore.isBookmarked` for the menu label (`FileExplorer.svelte:68`); nothing lists them.

`help/documentation/08-periodic-notes-and-calendar.md`:
- `:22` "see which days already have a daily note". Code: dots/day list are Markdown files
  keyed by frontmatter `created`, else filesystem createdAt (`calendar.service.ts:54-75`).
  `:24` already says this; `:22` contradicts it.

`help/documentation/25-types-and-relationships.md`:
- `:407`, `:419` already updated by Issue 03 (`work/03`), match `resolveViewListSort`
  (`type-note-list.logic.ts:94-96`, used at `TypeNoteList.svelte:280`). No change.

## Plan

One commit per page touched: rewrite the five 02 sentences and the 08 sentence to state
current behavior only. No "planned"/"coming" wording.

## Risks / defaults

- Bookmarks section kept (the menu action exists and data persists); only the
  "quick access" promise is removed and it says bookmarks are not listed in the app.
- Out of scope, noted only: `02:144` calls File Explorer "the default" sidebar mode.
