# Issue 13 discovery: Files header "+" menu, "New <kind>" labels

No `spec.md` in the feature folder; the Issue and `research/verdict-nl-header-creation.md` (T3) are the source.

## Files that change

- `src/lib/features/rail-shell/FilesNavigator.svelte`
  - `:79-91` `fileCreators`: "New Canvas" -> "New canvas". Add one derived `createItems` list (file creators, then New view, New folder), each `{ id, label, icon, run(dir) }`, so both menus loop over it.
  - `:303-311` header: add a `DropdownMenu` trigger ("+", `aria-label="New in folder"`, `title` "New in <rel>/" or "New in the vault root", `ml-auto`), content headed by a `DropdownMenu.Label` "Create in <rel>/" or "Create in the vault root", items over `createItems` acting on `pickedDir` (`picked.target`, the vault root when `rootPicked`).
  - `:349-362` context menu: loop `createItems` instead of `fileCreators` + two literal items; mod items stay after them.
- `src/lib/plugins/kanban/kanban.service.ts:23,30`: "New kanban board".
- `src/lib/app/commands.ts:151,163,174,185`: "New note", "New folder", "New canvas", "New kanban board". Ids unchanged; actions unchanged (vault root).
- Comments naming the old labels: `rail-registry.store.svelte.ts:6`, `rail-shell.types.ts:222`, `app-lifecycle.service.ts:274`, `editor.hooks.ts:34`.
- Help: `02-file-explorer.md:17-20,73` (also document the header "+"), `11-canvas.md:22-23`, `20-keyboard-shortcuts.md:107-110`, `06-search-and-navigation.md:54-57`, `21-kanban.md:5,15` (palette board lands in the vault root), `25-types-and-relationships.md:296`, `28-mods.md:206`, `mods/07-events-and-reactivity.md:441`, `mods/13-api-reference.md:110`.

## Tests

- `FilesNavigator.menu.test.ts`: new `describe('FilesNavigator header "+" menu')` copying the file's `render`/`openMenu` harness; open the dropdown by focusing the trigger and sending Enter (prior art `NoteActionBar.test.ts:285-295`), read `[data-slot="dropdown-menu-item"]` labels and `[data-slot="dropdown-menu-label"]`. Cases: labels equal the root context menu's minus a registered mod item; New note with `Projects` picked -> `Projects/Untitled.md`, opened, still picked; root picked -> vault root; New folder -> rename input; pick change `Projects` -> `Areas` moves title, heading and target; picked folder missing on disk (`readDir` rejects) -> toast, no `create_folder`/`create_note`.
- Label pins: `FilesNavigator.menu.test.ts:202,204,218,274,276,326,328`, `FilesNavigator.new-view.test.ts:111`, `kanban.service.test.ts:41`, `app-lifecycle.service.test.ts:889,895`, `rail-registry.store.test.ts:90-91` (fixture label only), `commands.test.ts` (add a pin for the four creator labels by id).

## Risks

- Header carries `data-tauri-drag-region`; a button inside it still clicks (note-list header has the same shape).
- bits-ui dropdown in jsdom: Enter on the focused trigger opens it (used by NoteActionBar tests).
- Menu-item anatomy scan covers the new `DropdownMenu.Item`s: no margins, no `text-xs`.

## Defaults taken

- `<folder>` in title and heading is the vault-relative path with a trailing slash, as the note list's `in <folder>/` rule (`lens.logic.ts:995-1001`).
- Menu aligns to the trigger's end (`align="end"`), as the note list's header menus.
