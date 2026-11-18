# 11: Kanban lanes: visible add row, empty and filtered counts, collapsed rail

**Origin:** design review 2026-11-17, proposals P05 (part), P06 (part), P143 (lane half), prototype `.scratch/design-review/prototypes/kanban-board.html`, research `.scratch/ux-quick-wins/research/verdict-kanban.md` and `breakdown.md` (old ticket 13).

**What to build:**

1. **Always-visible add row.** The add-card form (`src/lib/plugins/kanban/KanbanLane.svelte:354-382`, `opacity-0 ... group-hover/lane:opacity-100`) leaves the scroll list (`role="list"`, `:318-323`) and becomes a `shrink-0` row below it, inside the lane root, with no `opacity-0`. The list keeps `flex-1`, `ondragover` and `ondrop` unchanged (drop handlers are not touched, open-itens 040). A collapsed lane still renders no form. The `n` shortcut (`KanbanView.svelte:314-321`, `form input` under `[data-lane-id]`) keeps working because the form stays in the lane root.
2. **Suggestions open upward.** `KanbanWikilinkSuggestions.svelte:79` opens `absolute ... mt-1` below the input; pinned to the bottom of a full-height lane it would overflow the board region (`KanbanView.svelte:516`, `overflow-x-auto`). Add a `placement` prop (default below, so the card editor at `KanbanCard.svelte:190` keeps today's); the add row passes above.
3. **Empty and filtered text.** `KanbanView` passes `totalCount` (the stored lane's item count) to `KanbanLane` only while `kanbanStore.filterQuery.trim()` is non-empty. A stored-empty lane says "No cards. Drag one here or add a card."; a lane that the filter empties (shown 0, `totalCount` above 0) says "No matching cards". While filtering, the count reads "n of m" (the `/max` suffix is not shown while filtering; the `atLimit` styling still comes from the stored count). Without a filter the count, including `n/max`, is unchanged.
4. **Named indicators.** The auto-complete icon (`:308-310`) gets `role="img"` and an "Auto-complete on" name; the count (`:311-313`) gets an `aria-label` built from the same numbers ("3 cards", "1 of 3 cards", "3 of 5 cards" with a limit).
5. **Collapsed lane is a 40 px rail.** For a collapsed lane the root width is 40 px instead of `currentWidth` (`:216`), showing the chevron button (same "Expand lane" name), the count and a vertical title (`writing-mode`); no resize handle (`:386-399`). "Rename" in the title menu expands the lane first (`onToggleCollapse`, then `onStartEditLane`), since a 40 px input is unusable. Expanding restores `currentWidth`. `collapsed` already persists through `toggleLaneCollapsed` (`KanbanView.svelte:135-139`); no new write path.

Not in this ticket: the "..." lane menu (M), edge fades, a visible scrollbar, Add lane and Archive in the toolbar (toolbar belongs to shell-sidebars-ux 25), drops onto the rail, "scroll a new lane into view" (premise false: `handleAddLane` already focuses the title input, `KanbanLane.svelte:157-163`), the lane drag grip and insertion bar (open-itens 040 and 214 part 2). No change to drag handlers.

**Size:** M. Split point if one agent run is too much: items 1 and 2 (add row and upward suggestions) first, items 3 and 4 (text and names) second, item 5 (rail) last; each leaves the board working.

**Blocked by:** 05, 10

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus `src/tests/lib/chrome-state-styles.test.ts` and `menu-item-anatomy.test.ts` (markup changes); no E2E needed (`e2e/specs/kanban-view.spec.ts:32-60` only checks the board renders).

- [ ] Failing test first (`src/tests/lib/plugins/kanban/KanbanView.test.ts`, harness `src/tests/fixtures/KanbanViewHarness.svelte`, real store and logic, only `kanban.service.js` mocked): a stored-empty lane renders "No cards. Drag one here or add a card."
- [ ] The add input is outside the `role="list"` element; its form has no `opacity-0` class; its suggestions use the upward placement while the card editor's keep the default.
- [ ] `setFilterQuery` that empties a lane shows "No matching cards"; the count reads "1 of 3" while filtering and is unchanged (including `n/max`) with no filter; the icon and the count have accessible names.
- [ ] The `n` shortcut still focuses the focused lane's add input.
- [ ] A collapsed lane is 40 px wide, shows its title, has no "Resize lane" separator; "Rename" on it expands the lane and shows the title input; expanding restores the board width.
- [ ] No drag handler is edited (`handleItemDragOver`, `handleItemDrop`, `KanbanLane.svelte` `handleDrop`); existing drag tests unchanged.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P05.** "Pin a '+ Add card' ghost row below each lane's scroll area. Empty lanes say 'No cards. Drag one here or add a card.' Add a '...' lane menu ... and tooltips on the indicators." Part taken: the pinned row, the empty text, the indicator names. The "..." menu is deferred (M).
- **P06.** "A collapsed lane becomes a 40 px vertical rail that still accepts drops." Part taken: the rail without drops. Edge fades, scrollbar, toolbar buttons and "scroll a new lane into view" are not taken.
- **P143.** "While filtering, lane counts read 'n of m' and emptied lanes say 'No matching cards'." Lane half only; the filter clear button, Escape and per-board reset are ticket 05.

## Problem

The add-card form is invisible until the pointer is over the lane and it sits inside the scroll list, so in a long lane it scrolls out of view. An empty lane shows nothing, so a lane emptied by the filter looks the same as an empty one, and the filtered count (`lane.items.length`) hides how many cards the filter removed. A collapsed lane keeps its full width, so collapsing frees no space.

## Evidence

Checked at 085b23c5d.

- `KanbanLane.svelte:354-356` form `opacity-0`; `:318-323` list; `:308-313` unnamed icon and count; `:216` `style="width: {currentWidth}px"`; `:386-399` resize separator.
- `KanbanView.svelte:523-575` the `<KanbanLane lane={displayLane(lane)} ...>` call (filtered lane in, stored lane not passed); `:180-185` `displayLane`; `:314-321` the `n` shortcut.
- `KanbanWikilinkSuggestions.svelte:79` below-the-input placement.
- Test seams: `KanbanView.test.ts` (pins the card menu `['Edit', 'Archive', 'Card color', 'Delete']` at `:246-254`; this ticket does not change the menu).

## Why blocked

- 05: it edits `KanbanView.svelte` and `KanbanLane.svelte` (filter clear, tag click pass-through) and owns the filter state that `totalCount` and "n of m" read.
- 10: it edits `KanbanCard.svelte` and `KanbanView.svelte` (board root focus after an edit), and a card's height changes what a full lane looks like.

## Sequence with

- 02 (keyboard shortcuts act on the visible card): same `KanbanView.svelte`, the `n` shortcut and ring ids at `:237-321,:527`; 02 runs first.
- 42 (card "Move to" menu), blocked by this ticket: it extends the card menu and the `KanbanLane.svelte` prop list.
- 12 (list, table, archive): `KanbanView.svelte` archive and table call sites, other lines; after this.
- shell-sidebars-ux 25 (view title row) wraps the toolbar at `KanbanView.svelte:462-507` and edits `EditorView.svelte`; this ticket edits the lane markup and the `<KanbanLane>` call only, so rebase, never run in parallel.
- open-itens 040 and 006 (drop index, wrong-tab write): not touched; 214 part 2 (lane grip) waits for 040.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
