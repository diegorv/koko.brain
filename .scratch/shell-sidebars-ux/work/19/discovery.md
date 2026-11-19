# Issue 19 discovery: rail note list roving focus

No `spec.md` in the feature folder; the Issue is the source. Line numbers at `a6cfea1bb` (the Issue's are from `ab143a411`). Repeats Issue 18's Search model (`work/18`, `SearchPanel.svelte:42-120`); what differs is below.

## Files that change

- `src/lib/features/rail-shell/RailNoteList.svelte`
  - `rovingRows` derived: the note items in display order with their index in the shown `VList`'s `data` (grouped: `item.kind === 'note'` from `groupedItems` `:683-699`, key `item.key`; flat: `notes`, key `note.path`). `currentKey` state, `tabStopKey = tabStopRow(keys, keys, currentKey)`, `keepMounted = [index of tab stop]` on both `VList`s (`:894`, `:960`), one `bind:this` handle for `scrollToIndex`.
  - `noteRow` snippet (`:972-987`) takes the key: wraps the row in `<div data-note-list-key>` and passes `tabindex`.
  - `onfocusin` / `onkeydown` on both `VList`s (virtua spreads rest props on its viewport div): focusin sets `currentKey`; keydown acts only when the target is `[data-note-row]`: bare Enter = preventDefault + one `click()` (as Search), ArrowUp on row 0 with the search open focuses its input, else `resolveRovingFocus`. A move to an unmounted row calls `scrollToIndex`, `flushSync`, then focuses (the tab stop is in `keepMounted`).
  - Removal: a `$effect.pre` on the keys (runs before the DOM drops the row) moves `currentKey` with `nextCurrentRow`; when `document.activeElement` is inside the `NoteRowMenu` wrapper, it focuses the new current row after `tick()`. A rename recorded by `onRename` re-points to the same key with the new path instead of the neighbour. `currentKey` resets with the lens (`:519-527`).
  - `RailListSearch` (`:882`) gets `onArrowDown`: focuses the first row.
- `src/lib/features/rail-shell/RailListSearch.svelte:79-81`: `onArrowDown?: (event) => void` on a bare ArrowDown; the parent prevents the default when it moves.
- `src/lib/features/note-list/NoteRow.svelte`: optional `tabindex` on the row `<button>` (`:92`); the Inbox check (`:78`) is `0` only when the row's is `0`. Rename input Enter/Escape: after the menu's handler, focus returns to the row after `tick()` (`bind:this` on the row button).
- `src/lib/features/note-list/NoteRowMenu.svelte`: `ref` bindable on the trigger wrapper (`:218`, the Issue's `:203`; its `tabindex=-1` stays), `onRename?: (from, to)` called with `renamedPath(old, name)` before `renameItem` (`:149`). `note-row-menu.context.ts` needs no change.
- `help/documentation/02-file-explorer.md:12` (keyboard sentence), `:25-27` (focus after rename).

## Tests

- New `src/tests/lib/features/rail-shell/RailNoteList.keyboard.test.ts`, setup copied from `RailNoteList.inbox-check.test.ts` (virtua shim, real stores, `renameItem` mocked as in `RailNoteList.test.ts:46-53`).
- `src/tests/lib/features/rail-shell/RailListSearch.test.ts`: `onArrowDown` cases; `:141-146` untouched.
- `src/tests/lib/features/note-list/NoteRow.test.ts`: `tabindex` and the focus return, through `NoteRowMenuHarness`.
- E2E: `e2e/specs/rail-shell.spec.ts` new Tab/arrow test; `focus-ring.spec.ts:121-125` unchanged (its `tabUntil` still lands on the tab-stop row).

## Risks

- jsdom: `keepMounted` + `flushSync` must mount the 40th row for End; if not, End moves to E2E (the Issue allows it).
- A rename whose index update arrives as two snapshots (remove, then add) falls back to the neighbour row.
- `keepMounted` keeps the tab-stop row mounted at its estimated offset while scrolled away; virtua's documented use.

## Defaults taken

- Enter is handled in the list handler (preventDefault + one click), as in Search, so jsdom and the browser open once and a held Enter does not repeat.
- ArrowUp on the first row with the search closed stays on the row.
- The removed row's follow focus lands on the next row, else the previous one (`nextCurrentRow`); an emptied list drops focus.
