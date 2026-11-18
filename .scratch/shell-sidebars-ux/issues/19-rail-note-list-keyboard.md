# 19: Rail note list: one Tab stop, arrow keys, focus follows removals and rename

**Origin:** design review 2026-11-17, proposal P24 (note-list half; counted here), prototype `.scratch/design-review/prototypes/note-list-rail.html` (section `p24`), research `.scratch/shell-sidebars-ux/research/verdict-nl-actions-keyboard.md` (ticket F) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 28).

**What to build:**

1. **Roving focus.** Tab enters the note list on one row and the next Tab leaves it. ArrowUp/ArrowDown, Home and End move between note rows. Enter, Space and F2 keep their row behaviour (Enter is the native button click, F2 starts rename). Group headers, empty rows and the Today section components stay in normal Tab order and are skipped by the arrows.
2. **Removal.** When the focused row leaves the list (archived, organized, moved), focus moves to the neighbour row. It follows only when focus was on the removed row or inside the list wrapper, never when focus is in the search input.
3. **Rename.** Arrows typed in the rename input move the caret, not row focus. Committing a rename re-points the current row to the new path and leaves focus on it; Enter or Escape in the rename input returns focus to the row.
4. **Search hand-off.** ArrowDown in the open list search input moves to the first row; ArrowUp on the first row returns to the input.
5. **Inbox check.** On the Inbox lens only the tab-stop row's check button (added by ticket 15) has `tabindex="0"`; the others keep `-1`.

Code:

- `RailNoteList.svelte`: a current-row key and one keydown handler on the list that uses 18's resolver (`#lib/utils/roving-list.js`) for the focus keys only.
- The roving order is the shown note items, keyed by `item.key` in the grouped list (`:816-841`) and by `note.path` in the flat list (`:881-888`). The neighbourhood lens lists one note in several groups, keyed `${group.id}:${note.path}` (`:678`), so a path key would give two rows the tab stop.
- Both lists are `VList`s. `keepMounted` takes indices into that list's `data` (grouped indices include headers, empties and sections, not just notes) and holds the current row's index. A move to an unmounted row calls `scrollToIndex` on a `bind:this` handle (virtua 0.54.2 exports it) and focuses after mount.
- `NoteRowMenu.svelte:203` spreads the bits-ui context-menu trigger props, which put `tabindex: -1` on the list wrapper. "Focus inside the list" must count that wrapper (a click on blank area focuses it), and the wrapper must not become a Tab stop.
- `RailListSearch.svelte` gets an `onArrowDown` prop. `NoteRow.svelte:67-81` takes the row `tabindex`. Files: `RailNoteList.svelte`, `RailListSearch.svelte`, `NoteRow.svelte`, `NoteRowMenu.svelte`, `note-row-menu.context.ts`; help `02-file-explorer.md`.

Not in this ticket: Cmd+Enter (it would do what Enter does; ticket 31 sets whether a click replaces or adds a tab), a key-hint bar, `listbox`/`option` roles, and the Files and Types trees.

**Blocked by:** 12, 15, 18

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the touched specs (`e2e/specs/rail-shell.spec.ts`, `e2e/specs/focus-ring.spec.ts`)

- [ ] Failing test first, new `src/tests/lib/features/rail-shell/RailNoteList.keyboard.test.ts` (real stores, the virtua shim from `RailNoteList.test.ts`): with 12 notes exactly one `[data-note-row]` has `tabindex="0"`; ArrowDown and ArrowUp move focus and the tab stop; Home and End go to the ends. If jsdom cannot mount a row after `scrollToIndex`, the 40-note End case moves to E2E and the commit says so.
- [ ] Failing test first: neighbourhood lens with one note under both Outgoing links and Backlinks: one tab stop, ArrowDown walks each item once in display order, headers skipped. In Today, the section components are not in the roving order.
- [ ] Failing test first: arrows in the rename input move the caret; a committed rename leaves focus on the renamed row (new path); Escape returns focus to the row; Enter on a focused row opens the note once.
- [ ] Failing test first: ArrowDown in the open search input focuses the first row; ArrowUp on the first returns to the input; `src/tests/lib/features/rail-shell/RailListSearch.test.ts:141-146` stays unchanged.
- [ ] Failing test first: when the focused row leaves (the test feeds an entries snapshot without it through `typeDefinitionsStore.setEntries`), focus moves to the next row; with focus in the search input it stays there.
- [ ] On the Inbox lens only the tab-stop row's check has `tabindex="0"`.
- [ ] E2E: Tab into the list lands on one row, arrows move, Tab leaves the list; `focus-ring.spec.ts:121-125` and `rail-shell.spec.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P24.** Lists have no keyboard model except Tasks, and every row is its own Tab stop. Apply a roving-list action to the note list and search results first: one Tab stop, Up/Down/Home/End, Enter, Cmd+Enter for a new tab, F2 to rename. (Review validation: revise.) This ticket builds the note list; ticket 18 builds the util and Search.

## Problem

Every note row is a native button, so a lens with 200 notes is 200 Tab stops and the arrow keys do nothing. After a row is archived or organized from the keyboard, focus falls to the document body because the focused element was removed. A rename commit drops focus the same way.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/note-list/NoteRow.svelte:67-81`: the row `<button data-note-row>` has no `tabindex`; `:73` handles F2 only. `src/lib/features/note-list/NoteRow.svelte:116`: pill links inside the row use `tabindex="-1"`.
- `src/lib/features/rail-shell/RailNoteList.svelte:816-841` (grouped `VList`, keys `item.key`), `:881-888` (flat `VList`, keys `note.path`), `:678` (the group-qualified key), `:511-514` (`closeSearch`), `:805` (`RailListSearch` mount). Neither `VList` has `bind:this` or `keepMounted`.
- `src/lib/features/note-list/NoteRowMenu.svelte:203` (trigger props spread on the wrapper), `:205-209` (blank-area context-menu rule). `src/lib/features/note-list/note-row-menu.context.ts` (rename state and handlers).
- `src/lib/features/rail-shell/RailListSearch.svelte:79-81`: Escape closes the search; no arrow handling.
- `node_modules/virtua/lib/svelte/Virtualizer.type.d.ts:69,134` (`keepMounted`, `scrollToIndex`).
- `e2e/specs/focus-ring.spec.ts:121-125`: tabs to a note-list row and expects the ring.

## Why blocked

- 12: The rail note list says why it is empty and what to do next (the list-body `{#if}` chain at `RailNoteList.svelte:815-888`)
- 15: One note-actions group in the row menu, the More menu and the palette, with a one-click Mark organized on Inbox rows (the Inbox check, and the `NoteRowMenu.svelte` entries)
- 18: Shared roving-list util and arrow keys in Search results (`utils/roving-list.ts`)

## Sequence with

- `RailNoteList.svelte` (other lines): 12, 16 (filter trigger), 17 (header Display popover), 20 (focus request and `canCreate`), 24 (`bind:this` on the flat `VList` for Reveal: whichever lands second reuses the ref), 34 (band class `:699`).
- `NoteRow.svelte`: 15 (the Inbox check), 24 (the `flash` prop), 31 (the row click).
- `NoteRowMenu.svelte` and its test: 15 rewrites the entries and the order pin; this ticket edits only `:203`. 15 is a blocker, so it lands first.
- 20 builds on this ticket's current row and focus target.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket split. Defaults (not individually answered): none specific to this ticket beyond 18.1 (the first Escape in Search clears, which lives in ticket 18).
- 2026-11-18, from Issue 18's review (finding 3): in Search results the Show in Calendar button beside an event-note card (`SearchResult.svelte:179-182`) is still its own Tab stop, so the "one Tab stop" line in `help/documentation/06-search-and-navigation.md:94` holds only for lists without event notes. Not this ticket's list; take it up when a secondary row action gets a keyboard model here (or in the later roving-list wave) and apply the same choice to Search.
