# 13: Files header gets a "+" menu, and every creator says "New <kind>"

**Origin:** design review 2026-11-17, proposal P38 (the Files half; the note-list "+" title is in 17), prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-header-creation.md` (T3) and `breakdown.md` (old ticket 21). No open-itens Issue is replaced; `.scratch/open-itens/issues/154-inline-title.md` (inline title for a new note) edits the same creator lines (sequence only).

**What to build:**

1. **A "+" in the Files header.** At the right of the header (`src/lib/features/rail-shell/FilesNavigator.svelte:303-311`, today a title only) add an icon button, `aria-label="New in folder"`, `title` "New in <folder>/" or "New in the vault root". It opens a `DropdownMenu` headed "Create in <folder>" with the same items in the same order as the folder context menu: New note, New canvas, New table, New kanban board (and any other registered folder creator), New view, New folder. It acts on the picked folder (`picked.target`; the vault root when `rootPicked`) through the existing `handleNewFile`, `handleNewView` and `handleNewFolder`. Mod folder actions (`railRegistryStore.menuItems`) stay in the context menu only. Both menus loop over one list (`fileCreators`, `:79-91`; context menu `:346-370`) so they cannot drift.
2. **Sentence case everywhere.** "New note", "New folder", "New canvas", "New table", "New view", "New kanban board" in the Files menus (`FilesNavigator.svelte:84` "New Canvas"), the kanban registration (`src/lib/plugins/kanban/kanban.service.ts:30` "New Kanban Board") and the palette (`src/lib/app/commands.ts:149-193`: "New File" becomes "New note", "New Folder" "New folder", "New Canvas" "New canvas", "New Kanban Board" "New kanban board"). Command ids do not change (palette recents are keyed by id, `command-palette.logic.ts:7-21`). "New File from Template" and "Create 1:1 Note" are other flows and keep their labels.
3. **Palette creators keep writing to the vault root**, as `02-file-explorer.md:20` says; "New note here" (lens-following note creation) is 20's.
4. **Help.** `02-file-explorer.md:19-20,73`, `11-canvas.md:22-23`, `20-keyboard-shortcuts.md:107-110`, `06-search-and-navigation.md:54-57`, `21-kanban.md:5,15` (line 15 wrongly says the palette's board lands "in your current folder"; it is the vault root, the Files menus create it in a folder), `25-types-and-relationships.md:296` (names the palette's "New File"), `28-mods.md:206`, `mods/07-events-and-reactivity.md:441`, `mods/13-api-reference.md:110`.

Not in this ticket: a "+" menu in the note-list header (the prototype keeps that "+" a single action; only its `title` changes, in 17); a palette "New table" command; palette creators that follow the lens or the Files pick; the prototype's "New board" label.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts`: the header has a "+" named "New in folder"; its menu lists exactly the folder context menu's labels minus mod items, in the same order, with New kanban board registered through the real `railRegistryStore`.
- [x] With `Projects` picked, New note from the header creates `Projects/Untitled.md` (`fs.service` and Tauri mocked, nothing else), opens it and keeps `Projects` picked; with the root picked it creates at the root; New folder starts the inline rename of the created folder.
- [x] After the pick moves from `Projects` to `Areas`, the header `title`, the menu heading and the target follow.
- [x] A picked folder deleted outside the app: New note from the header toasts the create failure and does not re-create the folder (`createFile` reads the parent first, `fs.service.ts:198-223`).
- [x] Label pins updated on purpose: `FilesNavigator.menu.test.ts:202,218,274,326`, `FilesNavigator.new-view.test.ts:111`, `kanban.service.test.ts:41`, `app-lifecycle.service.test.ts:895` (`['New Kanban Board']`), `commands.test.ts`; `commands.new-commands.test.ts` still creates at `${VAULT}/Untitled.*` for every id.
- [x] `menu-item-anatomy`, `chrome-state-styles` and `rail-shell.boundary` tests pass; E2E `rail-shell.spec.ts:836-880` and `file-operations.spec.ts:5-9` pass untouched (no e2e looks up the renamed labels; the Files-menu lookups are "New note" and "New table").
- [x] The help pages above use the new labels.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P38.** Creation has many entry points with different destinations and names, and Files has no visible "+". Add a "+" menu in the Files and note-list headers that targets the selected folder; Cmd+N stays capture; other creation commands follow the active lens and say where they create; use one pattern, "New <kind>". Validation: keep. (The review's "folder and canvas exist only on right-click" is wrong: `file-explorer:new-folder` and `canvas:new` exist in the palette.)

## Problem

The Files header has no visible way to create anything; folder, canvas, table and kanban creation need a right-click. Names drift between surfaces: "New Canvas" and "New Kanban Board" next to "New note" and "New table", and the palette's "New File" and "New Folder".

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/FilesNavigator.svelte:79-91` `fileCreators`; `:303-311` header (title only); `:346-370` context menu; handlers `handleNewFile`, `handleNewView`, `handleNewFolder`.
- `src/lib/app/commands.ts:149-193`: all four creators use `vaultStore.path`. `src/lib/plugins/kanban/kanban.service.ts:26-34` registers "New Kanban Board".
- `help/documentation/21-kanban.md:15` contradicts `02-file-explorer.md:20`.
- ADR 0004's amendment: the Files folder menu offers New table next to New view, so both stay.

## Sequence with

- 14 (system folders last, counts): edits the folder rows and `topFolders` in `FilesNavigator.svelte` and its tests; blocked by this ticket.
- 34 (pane-band) rewrites the band class at `FilesNavigator.svelte:305`.
- `commands.ts` and the count pin `commands.test.ts:151`: 01, 15, 20, 24, 28, 29, 32 and 08 each add or change commands; this ticket only changes labels, so the count stays.
- 20: its "New note here" palette command must follow this ticket's label rule.
- open-itens 154 (inline title) edits `FilesNavigator.svelte:84` and the palette's new-file command; its hook covers the header menu.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: granularity of 34 consolidated tickets (this is old ticket 21 unchanged). Defaults (not individually answered): 13.1 (old 21.1) palette creators keep the vault root (finders-ux 02 precedent); 13.2 (old 21.2) "New kanban board", not "New board" (the palette matches labels only).
- 2026-11-18, deliver (branch issue/13-files-plus-menu-new-kind): Files header "+" menu ("New in folder") mirrors the folder context menu and targets the picked folder; creator labels unified to "New <kind>"; help pages updated. Full suite: 649 files, 17179 passed, 54 skipped, exit 0. Reviews: round 1 CHANGES_REQUESTED, fix round ran, round 2 APPROVED (no findings).
