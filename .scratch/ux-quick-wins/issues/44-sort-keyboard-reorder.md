# 44: Sort order can be changed from the keyboard

**Origin:** design review 2026-11-17, proposal P140 (the keyboard sort order and its indicator), prototype `.scratch/design-review/prototypes/collection-queryjs.html`, research `.scratch/ux-quick-wins/research/verdict-collection.md` (P140 and T5) and `breakdown.md` (old ticket 24, split by the owner on 2026-11-18: the conjunction and the FilterRow and FormulaRow names are ticket 15, this is the rest).

**What to build:**

1. **A list with a keyboard.** The sort rows (`src/lib/features/collection/toolbar/SortPanel.svelte:80-92`, today `role="listitem"` with no list parent) sit in one `role="list"`; each row has `tabindex="0"`. Alt+ArrowUp and Alt+ArrowDown on a focused row call `onSortsChange(reorderSorts(sorts, i, i - 1 or i + 1))` (`toolbar/sort.logic.ts:27-36`, the same call a drop makes at `SortPanel.svelte:65-70`). Alt+ArrowUp on the first row, Alt+ArrowDown on the last and a plain arrow key call nothing. Focus stays on the moved row (refocus it after the keyed `{#each}` moves the node), and a polite live region says "Moved <label> to position N of M".
2. **A drop indicator.** While dragging, an insertion line shows above the target row when `dragIndex > target` and below it when `dragIndex < target` (what `reorderSorts` does), from index comparison only, with no pointer geometry (jsdom has none). It clears on drop and on dragend.
3. **Named remove buttons.** Each sort row's remove button (`SortPanel.svelte:126-133`, an unnamed X) gets `aria-label` and `title` "Remove sort by <label>". Ticket 15 names the filter and formula removes only; the sort row belongs to this ticket because it restructures the same row.
4. **The write, stated.** The panel has two consumers, `CollectionView.svelte` (`handleSortsChange`, `persistKey('viewSort', ...)`, `:377-380`) and `RailNoteList.svelte` (`handleSortsChange`, `persistViewState('sort')`, `:376-379`, serialized through `serializeListWrite` at `:334`; the panel only renders for a `.view` lens, `viewToolbarReady`). Each Alt+Arrow press writes the `.view` sort key once, exactly as one drop does. No new write path. Re-serializing the `.view` YAML drops every comment in the file (`docs/agents/view-files.md:26,155`, open-itens 071), so each press can drop the comments of a hand-written or agent-written view, as the drag path already does. This ticket does not fix that.

Not in this ticket: the conjunction trigger and the FilterRow and FormulaRow names (ticket 15); the plain-click sort semantics of P48 (a click replacing a saved multi-column sort, an owner decision); column reorder (P141, deferred, writes `order`).

**Size:** S.

**Blocked by:** 15

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (none expected; `rail-list-toolbar.spec.ts` and `rail-shell.spec.ts` exercise the toolbar, so run them if the panel markup changes beyond the list role).

- [ ] Failing test first, new `src/tests/lib/features/collection/toolbar/SortPanel.svelte.test.ts` (real logic and props, no mocks): the rows are `listitem`s inside one `list`, and each remove button is found by `getByRole('button', { name: 'Remove sort by <label>' })`.
- [ ] Alt+ArrowDown on row 1 of 3 calls `onSortsChange` once with exactly `reorderSorts(sorts, 0, 1)`, focus is on the moved row afterwards and the live region reads "Moved <label> to position 2 of 3". Alt+ArrowUp on row 1, Alt+ArrowDown on row 3 and a plain ArrowDown call nothing.
- [ ] Dragging row 3 over row 2 shows the insertion line above row 2; dragging row 1 over row 2 shows it below; the line is gone after a drop and after a dragend.
- [ ] A real-write check in `CollectionView.view-writes.test.ts` style: one Alt+Arrow press on a two-sort `.view` writes the reordered `sort` once and leaves the rest of the YAML as a drop would (assert the written YAML).
- [ ] `RailNoteList.view.test.ts` and `RailNoteList.toolbar.test.ts` (they open the sort panel by text) and `CollectionView.test.ts` pass unchanged.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass. Not checked: the screen-reader announcement in WKWebView.

## Original proposal

- **P140.** Sort rows drag with no indicator and no keyboard path: no drop line, no key path, the `listitem` role has no list parent and the remove icons are unnamed. Proposal: an insertion line, Alt+Up and Alt+Down to reorder, a list wrapper and named remove buttons. Validation: keep. Here only the keyboard reorder, the indicator, the list and the sort-row names; the filter and formula halves are ticket 15.

## Problem

Reordering a multi-column sort is mouse-only and gives no sign where the row will land. A keyboard or screen-reader user cannot change which column sorts first, and the remove buttons read as unlabelled icons.

## Evidence

Checked at `085b23c5d`.

- `SortPanel.svelte:58-63` (the drag state has no indicator), `:80-92` (`role="listitem"`, no list, no `tabindex`), `:126-133` (unnamed X), `:65-70` `handleDrop`.
- `toolbar/sort.logic.ts:27-36` `reorderSorts` returns the same array for out-of-range indices, but calling `onSortsChange` with it still persists the sort (`CollectionView.svelte:377-380`, `RailNoteList.svelte:376-379`) and rewrites the `.view` file. The handler must skip `onSortsChange` when `i-1` or `i+1` is out of range.
- Consumers: `CollectionView.svelte:27` (import), `:346` `persistKey`, `:377-380` `handleSortsChange`; `RailNoteList.svelte:30` (import), `:320-345` `persistViewState`, `:376-379`, `:818` (the panel). Both write only the `.view` sort key.
- No `SortPanel` test file exists; `RailNoteList.view.test.ts:207` and `CollectionView.test.ts:626` open the panel by text.
- `docs/agents/view-files.md:155`: the rail's Sort and Filter and every other app write re-serialize the file and drop comments.

## Why blocked

- 15: it edits `FilterPanel.svelte`, `FilterRow.svelte` and `FormulaRow.svelte` (the conjunction triggers and the remove names) and their tests in the same `toolbar/` folder, and sets the "Remove ..." naming pattern this ticket follows for sort rows. It is itself blocked by 09 (the SortPanel label line, `file.*` display names).

## Risk

The keyboard reorder writes the `.view` file's sort key through the existing writers (`CollectionView` `persistKey`, the rail's `persistViewState`). What could be lost: the YAML comments of a hand-written or agent-written view, because the writers parse and re-serialize the whole document; one key press is one write, and a held Alt+Arrow repeats it. The drag path already does the same, so the exposure is new only in how easy it is to trigger. This ticket does not change the writers and does not fix open-itens 071. It runs only when the owner names it (launch by number, never `--all`).

## Sequence with

Shell-sidebars-ux 16 (`issues/16-filters-count-clear-view-triggers.md`, ready-for-agent) adds `onClear` to `FilterPanel.svelte` and names the `.view` toolbar triggers in `CollectionView.svelte`, the same folder and test files on other lines; it should be merged before this ticket starts. Shell-sidebars-ux 25 moves the `.view` header into a `ViewHeader`. Ticket 09 changes the label this ticket's live region and remove names read (`getDisplayName`, `SortPanel.svelte:47`). Open-itens 133 (`133-sort-and-limit-section.md`) and shell-sidebars-ux 17 (the note-list Display popover) both mention the sort panel: read them for overlap before running.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, the split of old ticket 24, and for this ticket "tickets at the end, run only when named". Defaults (not individually answered): 44.1 (written here): the sort row remove names are built here, not in ticket 15. Default: yes, same row markup.
