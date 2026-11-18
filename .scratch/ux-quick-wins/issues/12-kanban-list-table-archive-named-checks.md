# 12: Kanban list, table and archive: named checks, clean cells, restore feedback

**Origin:** design review 2026-11-17, proposal P144 (part), prototype `.scratch/design-review/prototypes/kanban-board.html`, research `.scratch/ux-quick-wins/research/verdict-kanban.md` and `breakdown.md` (old ticket 15).

**What to build:**

1. **Named check buttons.** The unnamed check buttons in the table (`src/lib/plugins/kanban/KanbanTableView.svelte:43-51`) and the list (`KanbanListView.svelte:35-43`) get `aria-label` "Mark done" while open and "Mark open" while checked (the visible state flips with the stored `item.checked`).
2. **Clean table cells.** The table card cell (`KanbanTableView.svelte:54`, plain `displayText` today) renders through `KanbanCardText` with a new `hideTags` prop that skips the `tag` segments of the same `parseCardSegments` parse the board uses (`kanban.logic.ts:813`), so a cell never diverges from the board on `[[Note#Heading]]` text. Wikilinks become clickable buttons: `KanbanTableView` gets an `onWikilinkClick` prop and `KanbanView.svelte:512` passes `handleWikilinkClick`, as the list already does (`:510`). Tags stay in the Tags column.
3. **Empty table.** When no lane has cards, the table shows one "No cards" row (the list already has one per lane, `KanbanListView.svelte:54-56`).
4. **Archive rows.** Archive rows show `stripCardMetadata(item.text)` (`KanbanView.svelte:598`, raw `item.text` today), so `{2026-11-20}` and `{color:red}` tokens are not shown. The stored text is not changed.
5. **Restore feedback.** `handleRestoreItem` (`KanbanView.svelte:332-336`) calls `toast.success('Restored to <first lane title>')` (`svelte-sonner`) after the existing `restoreItem(board, itemId, firstLane.id)`. The target stays the first lane.
6. **Help.** `help/documentation/21-kanban.md:25,27,109` are rewritten: they document plain-text table cells ("copy-pasting card text", "in Table view card text is shown as plain text") and the restore icon; the design review overrides the plain-text rule.

Not in this ticket: a lane picker on Restore (archived items store no lane), the table's Lane or Date columns, any change to list or table layout beyond the cell.

**Size:** S

**Blocked by:** 05, 11

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run (no E2E surface changes).

- [ ] Failing test first (`src/tests/lib/plugins/kanban/KanbanView.test.ts`, real store and logic, `kanban.service.js` and `svelte-sonner` mocked as side-effect services): in table view the check button is found by name "Mark done" and flips to "Mark open" after a click.
- [ ] The table cell of `Ship #design [[Spec]]` shows "Ship" and a "Spec" button and no `#design` text; clicking "Spec" calls the view's `onOpenWikilink('Spec')` (through `handleWikilinkClick`, `KanbanView.svelte:230-232`); the Tags column still shows `design`.
- [ ] An empty board in table view shows "No cards".
- [ ] The list view's check buttons are named the same way.
- [ ] An archived `Pay rent {2026-11-20} {color:red}` shows "Pay rent"; Restore fires the toast with "Restored to To Do", and the card is in the first lane in the persisted markdown.
- [ ] `KanbanCardText` still renders tags as before when `hideTags` is unset (board and list unchanged).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P144.** "The table renders cards through KanbanCardText with tags stripped and adds an empty row. Check buttons get 'Mark done' / 'Mark open' labels. Archive rows show stripped text. Restore keeps 'first lane', or offers a lane picker, and toasts 'Restored to <lane>'." Validation: revise, no origin-lane tracking. Part taken: all but the lane picker.

## Problem

The table shows raw `#tags` and `[[links]]` as plain text, so card text there is a different thing from the board. The check buttons have no accessible name. Archive rows show raw `{date}` and `{color}` tokens. Restore moves the card to the first lane with no message, so the card seems to vanish.

## Evidence

Checked at 085b23c5d.

- `KanbanTableView.svelte:43-51` unnamed check, `:54` `{displayText}` from `stripCardMetadata`, no empty row; the component has no wikilink prop.
- `KanbanListView.svelte:35-43` unnamed check, `:45` already uses `KanbanCardText`, `:54-56` per-lane "No cards".
- `KanbanCardText.svelte:6-14` props (no `hideTags`), `:21` the segment loop.
- `KanbanView.svelte:598` archive row `item.text`, `:332-336` silent restore. `KanbanView.svelte` does not import `svelte-sonner` today.
- `help/documentation/21-kanban.md:25,27` plain-text table, `:109` Archive paragraph.

## Why blocked

- 05: it makes tag chips in `KanbanCardText.svelte` a plain filter button; this ticket adds `hideTags` to the same component, and the table's tag handling must build on the chip that 05 settles.
- 11: it edits `KanbanView.svelte` (the `<KanbanLane>` call and lane props) where this ticket edits the archive rows, the restore handler and the table call site.

## Sequence with

- 10 (cards: date row, preview clamp, growing editor), 02 (keyboard shortcuts) and 42 (card "Move to"): all edit `KanbanView.svelte` on other lines; one at a time.
- 39 (readable text on coloured fills) edits the tag chip colours in `KanbanCardText.svelte` and `KanbanTableView.svelte`; it is blocked by this ticket and runs after it.
- shell-sidebars-ux 25 (view title row) wraps the kanban toolbar (`KanbanView.svelte:462-507`); this ticket does not touch the toolbar, so rebase only.
- open-itens 040 and 006: not touched.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
