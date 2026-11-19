# 15: One note-actions group in the row menu, the More menu and the palette, with a one-click Mark organized on Inbox rows

**Origin:** design review 2026-11-17, proposal P39 (the shared list and the Inbox half; the tab-menu half is in 23), prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-actions-keyboard.md` (tickets A and B) and `breakdown.md` (old tickets 03, 19). `.scratch/open-itens/issues/023-file-history-restore-writes-snapshot-into-note.md` (File History Restore writes into the active tab, P1) is not replaced and stays open; this ticket opens History only after activating the note, so it adds no exposure.

**What to build:**

1. **By-path writers.** In `src/lib/features/properties/lifecycle.service.ts`: `setOrganizedForPath(path, organized)` and `setArchivedForPath(path, archived)`, the shape of `toggleFavoriteForPath` (`:48-58`: `vaultStore.requestPromptIndexRefresh()`, `updateNoteFrontmatter(path, ...)` with `toggleOrganized` / `toggleArchived` from `lifecycle.logic.ts:49,57`, frontmatter toast on a refused write). Archiving leaves `_organized` alone; the after-save hooks apply a type's `_archive_to`.
2. **Inbox check.** In the Inbox lens each markdown row shows a check button at the top right (hover, focus-within or the active row). Clicking it marks that note organized without opening it, even when another note is the active tab; the row leaves the Inbox and the count drops. No success toast, no shortcut in its tooltip (Cmd+E acts on the active tab, `global-keybindings.ts:197-202`). `NoteRow.svelte` gets an optional `onOrganize`; the check is a sibling of `[data-note-row]` in a `relative` wrapper, `tabindex="-1"` (19 later gives the tab-stop row's check `tabindex="0"`). `RailNoteList.svelte`'s `noteRow` snippet passes it only for the Inbox lens and markdown rows.
3. **One group, same order and labels.** The note-list row menu (`src/lib/features/note-list/NoteRowMenu.svelte:221-287`) and the note's More menu (`src/lib/features/note-action-bar/NoteActionBar.svelte:187-219`) end with: Archive / Restore, Mark organized / Mark not organized, History, Move to Trash (red, last, no separator before it, so the pinned rule "no group holds a single item" at `NoteRowMenu.test.ts:314-322` holds). The row menu's last group is Rename then this group. Canvas, view, PDF, image and other files get Move to Trash only. In the More menu "Archive this note", "Restore this archived note" and "Delete this note" go away; the inline Organized button keeps its own labels. A new pure `src/lib/features/properties/note-actions.logic.ts` `noteActions(kind, { organized, archived })` returns ids, labels and `danger` (no icons: `pure-logic.test.ts` forbids svelte imports in `.logic.ts`; each menu maps id to icon).
4. **Row actions act on the row.** Archive and Mark organized on a row write that row's note, not the active tab. History first activates the note (`await openFileInEditor(path)`, which focuses or opens its tab) and then opens the History dialog, so Restore cannot write into another tab (`file-history.service.ts:82-105` writes to the active tab). History stays markdown-only. Shortcut hints (`formatShortcut`) only in the More menu, which acts on the active note; none in the row menu or on the check.
5. **One Trash prompt, with the file name.** `deleteNoteWithConfirm` (`src/lib/core/filesystem/delete-note.service.ts:12-29`, text `Move "alpha.md" to trash?`) requests the prompt index refresh itself, and the row's delete (`NoteRowMenu.svelte:158-168`, which asks with the note title) calls it. `TypesNavigator.svelte:343` gains the refresh harmlessly and its text does not change.
6. **Palette.** `src/lib/app/commands.ts` gets "Toggle Archived" and "Move Note to Trash" (category Note, stable labels beside "Toggle Favorite" and "Toggle Organized", `:340-347`), both on the active tab. Move Note to Trash on a virtual tab (`isVirtualTab`) toasts "No file is open." and asks nothing, as View File History does (`:419`).
7. **Types.** `NoteRowNote` (`note-row.types.ts`) gains required `organized` and `archived` (`archived` moves down from `LensNote`, `rail-shell.types.ts:36`); `toLensNote` (`lens.logic.ts:281-295`) copies `entry.organized`, and the `fileToLensNote` literal (`:960-976`) sets `organized: true, archived: false`.
8. **12's hints.** Update the Archive and Inbox hint entries in `list-empty.logic.ts` now that the row menu has those actions.
9. **Help.** `02-file-explorer.md:53-67` (row menu table, plus one line on the Inbox check), `03-editor.md:50-52`, `25-types-and-relationships.md:182,284,659`, `20-keyboard-shortcuts.md:101-`, and `e2e/specs/rail-shell.spec.ts:312` (clicks "Archive this note"). Leave `28-mods.md:657` (a mod example title).

Not in this ticket: "Move to..." with a folder picker (none exists; own ticket only on owner request, after 23); Cmd+Enter in lists; the tab menu (23); the Inbox check on lenses other than Inbox. A rare lost update (Mark organized then Archive on one closed note within one write, `frontmatter-write.service.ts:96-98`) is stated, not handled.

**Blocked by:** 12, 14

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `e2e/specs/file-operations.spec.ts`, `e2e/specs/note-action-bar.spec.ts`, `e2e/specs/rail-shell.spec.ts` and `e2e/specs/rail-list-toolbar.spec.ts`.

- [x] Failing test first, new `src/tests/lib/features/properties/lifecycle.service.organized-path.test.ts` (modelled on `lifecycle.service.favorite-path.test.ts`; Tauri fs and `invoke` mocked, real writer and stores): a closed note with `_organized: false` gets `_organized: true` with `_archived` and the body unchanged; an open tab with unsaved body edits keeps them; a second call writes nothing; `vaultStore.takePromptIndexRefresh()` is true; lossy frontmatter toasts and writes nothing. Same cases for `setArchivedForPath`.
- [x] Failing test first, new `src/tests/lib/features/note-list/NoteRow.test.ts`: with `onOrganize` the check exists, is not inside `[data-note-row]`, has `tabindex="-1"`, an accessible name and a `title` with no shortcut; clicking it calls `onOrganize` and does not open the note; without `onOrganize` no check renders.
- [x] Failing test first, new `src/tests/lib/features/rail-shell/RailNoteList.inbox-check.test.ts` (no `lifecycle.service` mock; virtua shim from `RailNoteList.test.ts:9-30`): Inbox rows have the check; Favorites, Archive, type and folder lens rows do not; clicking it on Alpha writes `_organized: true` to Alpha's file while another note is active; after the updated entry is fed through `typeDefinitionsStore.setEntries`, Alpha's row is gone and the count drops. Right-click on the check opens no menu (`NoteRowMenu.svelte:209` blank-area rule).
- [x] Failing test first, new `src/tests/lib/features/properties/note-actions.logic.test.ts`: markdown unorganized and active gives Archive, Mark organized, History, Move to Trash; organized and archived give Restore and Mark not organized; canvas, view and PDF give Move to Trash only; only Trash is `danger`.
- [x] Failing test first, `NoteRowMenu.test.ts` (keeps its `lifecycle.service` mock and asserts entries only): markdown order `['Open in new tab', 'Duplicate', '---', 'Copy path', 'Change icon', 'Favorite', 'Reveal in Finder', '---', 'Rename', 'Archive', 'Mark organized', 'History', 'Move to Trash']`; canvas ends `'Rename', 'Move to Trash'`; the single-item-group test stays as written; labels follow the row's `organized` and `archived`.
- [x] Failing test first, new `NoteRowMenu.lifecycle.test.ts` (real writer, fs mocked, as `NoteRowMenu.favorite.test.ts`): with B the active tab, Mark organized and Archive on row A write A's file and leave B's content unchanged; History on row A leaves A active and `fileHistoryStore.filePath === A` (real `editorStore` and `fileHistoryStore`, `get_file_history` via mocked `invoke`).
- [x] Failing test first, `NoteActionBar.test.ts`: More lists the same group for the same state (`:524`, `:532` updated); "Delete this note" and "Archive this note" appear nowhere under `src/lib`; More > Move to Trash confirmed trashes and closes the tab (`:324-350` renamed, same disk assertions).
- [x] Failing test first, `delete-note.service.test.ts`: `deleteNoteWithConfirm` requests a prompt refresh before the delete; the row's prompt matches the bar's (`NoteRowMenu.test.ts:430-438` now expects the file name); a `PreDeleteSaveError` adds no toast.
- [x] Failing test first, `commands.test.ts`: the two commands exist in category Note and act on the active note; with a virtual tab Move Note to Trash calls no `ask` and toasts "No file is open.". The count pin (`:151`) changes on purpose.
- [x] `lens.logic.test.ts`: `toLensNote` carries `organized` and `archived`; the folder-lens non-markdown row has `organized: true, archived: false`. `list-empty.logic.test.ts` pins the updated hints.
- [x] `pure-logic`, `menu-item-anatomy`, `feature-cycle` (no new pair; `note-list -> properties` and `note-action-bar -> properties` already exist) and `layer-rules` tests pass.
- [x] E2E: in Inbox, clicking the first row's check removes the row and the file has `_organized: true`; `file-operations.spec.ts` (still `/Move to Trash/i`), `note-action-bar.spec.ts` and `rail-shell.spec.ts:312` updated and green; `rail-list-toolbar.spec.ts` stays green.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P39.** Note actions are split across five surfaces, and Inbox triage means opening every note. Build one note-actions list with the same labels and order in the row menu, the More menu, the tab menu and the palette; the tab menu adds Close others and Close to the right; Inbox rows get an inline organized check. Validation: keep. (This ticket ships everything except the tab menu, which is 23.)

## Problem

Mark organized and Archive exist only for the active note. The row menu has no Archive, Organized, Move or History. The same action is "Delete this note" in the More menu and "Move to Trash" in the row menu, with two different prompts (title versus file name). Triaging Quick Capture notes costs one open-and-click per row.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/properties/lifecycle.service.ts:30-41` (active-tab writer), `:48-58` (`toggleFavoriteForPath`), `:83-93` (`toggleActiveNoteOrganized`, `toggleActiveNoteArchived`).
- `src/lib/features/note-list/NoteRowMenu.svelte:158-168` (delete asks with the title), `:203-213` (menu wrapper, blank-area rule), `:221-287` (items).
- `src/lib/features/note-action-bar/NoteActionBar.svelte:207-219` (Archive and Delete in More; no History there).
- `src/lib/core/filesystem/delete-note.service.ts:12-29`; `src/lib/features/rail-shell/TypesNavigator.svelte:343`.
- `src/lib/app/commands.ts:338-351` (Toggle Favorite, Toggle Organized), `:412-422` (View File History, refuses with "No file is open.").
- `src/lib/features/note-list/NoteRowMenu.test.ts:38` and `RailNoteList.test.ts:33` mock `lifecycle.service`, so by-path write assertions go in the new files above, not in those.
- bits-ui spreads `tabindex: -1` onto the list wrapper (`node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1599`; `NoteRowMenu.svelte:203`).

## Why blocked

- 12: (the hint table in `list-empty.logic.ts`)
- 14: (`toLensNote` / `fileToLensNote` lines)

## Sequence with

- `RailNoteList.svelte`: 12, 16, 17, 19, 20, 24, 34. 19 is blocked by this ticket (the check's `tabindex` and the row menu wrapper).
- `NoteRowMenu.svelte` and `NoteRowMenu.test.ts`: 19 (edits the `tabindex: -1` wrapper `:203` and `note-row-menu.context.ts`), 31 (the "Open in new tab" item and row click), open-itens 132 (Edit view item), 028 and 029 (Duplicate).
- `NoteRow.svelte`: 19, 24 (flash prop), 31 (click).
- `NoteActionBar.svelte`: 24 (breadcrumb `:128-132`, Reveal item above Copy deeplink), 32 (Back and Forward at the start of the bar).
- `commands.ts` and the count pin `commands.test.ts:151`: 01, 08, 13, 20, 24, 28, 29, 32.
- `lens.logic.ts` and `rail-shell.types.ts`: 14 (blocker), 24, 20.
- 23 consumes this ticket's list in the tab menu (blocked by it). It fills a new `noteActions` snippet in `EditorView.svelte`, which 25 and 26 also edit, and adds `closeOtherTabs` to `editor.service.ts`, which 25 and 31 also edit.
- open-itens 096 (root unarchive path): a row Archive or Restore reaches the same code as the bar's; no change in exposure.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: granularity of 34 consolidated tickets (old tickets 03 and 19 merged here; the old edge 03 -> 19 is gone). Defaults (not individually answered): 15.1 (old 03.1) the Inbox check on the Inbox lens only, no toast, no shortcut in its tooltip; 15.2 (old 19.1) stable palette labels ("Toggle Archived", "Move Note to Trash"), state-aware only in menus; 15.3 (old 19.2) Move to Trash last and red with no separator of its own, the single-item-group rule kept; 15.4 (old 19.3) one Trash prompt with the file name; 15.5 (old 19.4) History on a non-active note activates it first, until open-itens 023 lands; and ticket 23's default 23.1 (old 30.1): no Trash or History on canvas and kanban tab menus.
- 2026-11-19, delivered from `issue/15-note-actions-group-inbox-organized`: one note-actions list (Archive, Mark organized, History, Move to Trash) shared by the row menu and the More menu, `setOrganizedForPath` / `setArchivedForPath`, one Trash prompt naming the file, a one-click Mark organized check on Inbox rows, Toggle Archived and Move Note to Trash palette commands, updated empty hints and help. Review round 1 APPROVED (1 minor, 2 nits; fixed: More hints test compares with the global keybindings, help wording); round 2 APPROVED with no findings. Full vitest suite at 5e8fe1aa0: exit 0, 671 files, 17929 passed, 56 skipped, 1 todo; `pnpm check` 0 errors.
