# 50: The Kanban card menu opens from the keyboard

**Origin:** review of Issue 42 (`.scratch/ux-quick-wins/work/42/review.md`, finding 1), 2026-11-18.

**What to build:** Issue 42 added "Move to" to the card context menu as the way to change lanes while the board is sorted or filtered, but that menu opens only on a right-click: `handleBoardKeydown` in `src/lib/plugins/kanban/KanbanView.svelte` has no `ContextMenu` key or `Shift+F10` case, and the card trigger in `KanbanCard.svelte` is a plain `div` that bits-ui opens on the `contextmenu` event. Add a key on the focused card (the ContextMenu key and `Shift+F10`) that opens that card's menu, so Move to and the other card actions are reachable without a mouse.

Not in this ticket: a direct "move to lane" key in the board's focus ring; keeping drag on while sorted or filtered.

**Size:** S.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/plugins/kanban/KanbanView.test.ts`: with a card focused, `Shift+F10` (and the ContextMenu key) opens that card's menu, and "Move to" > "Done" moves it.
- [ ] Focus returns to the card (or its new position) when the menu closes; existing card-menu tests stay green.
- [ ] `help/documentation/21-kanban.md` names the key.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Evidence

- Review 42 finding 1 (minor): Issue 42's "What to build" item 3 calls Move to "the keyboard-reachable way to change lanes", but no key opens the card menu.
