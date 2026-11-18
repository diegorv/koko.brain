# Issue 11 discovery: kanban lanes, add row, empty and filtered counts, rail

No `spec.md` for ux-quick-wins; the Issue is the spec. Same harness and test file as `work/05` and `work/10`. Line numbers are at 3c183e706 (after 05 and 10), so they differ from the Issue's.

## Files that change

- `src/lib/plugins/kanban/KanbanLane.svelte`
  - `:217-223` root: `width: {collapsed ? 40 : currentWidth}px`.
  - `:225-317` header: row layout when expanded (unchanged); `flex-1 min-h-0 flex-col items-center` when collapsed, order chevron, grip, count, vertical title (`[writing-mode:vertical-rl]`), auto-complete icon. The count is a snippet rendered before the title on the rail and after it when expanded.
  - `:266,273` dblclick and "Rename": `startRename()` calls `onToggleCollapse` first when collapsed, then `onStartEditLane`.
  - `:311-316` icon `role="img" aria-label="Auto-complete on"`; count text `n of m` while `totalCount` is set, else `n` + `/max`; `aria-label` "3 cards" / "1 of 3 cards" / "3 of 5 cards".
  - `:321-388` list unchanged (classes, `ondragover`, `ondrop`); an empty-state `<p>` inside it when `lane.items.length === 0`; the form moves after the list, `shrink-0`, no `opacity-0`, still inside `{#if !collapsed}`.
  - `:392` resize handle also needs `!collapsed`.
  - new prop `totalCount?: number`.
- `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:80`: `placement?: 'below' | 'above'` (default below, `mt-1`); above is `bottom-full mb-1`. The add row passes `above`; `KanbanCard.svelte:228` unchanged.
- `src/lib/plugins/kanban/KanbanView.svelte:610-643` call: `totalCount={kanbanStore.filterQuery.trim() ? board.lanes[laneIndex].items.length : undefined}` (`displayBoard.lanes` maps `board.lanes` 1:1, `:216-219`). The `n` shortcut (`:374-383`) is unchanged: it queries `form input` under `[data-lane-id]`, and the form stays in the lane root.
- `help/documentation/21-kanban.md:48,70,172-178`: rail, add row, "n of m" and "No matching cards".
- Tests: `src/tests/lib/plugins/kanban/KanbanView.test.ts` new describe "lanes: add row, counts, rail"; `KanbanWikilinkSuggestions.test.ts` placement cases.

## Plan (test-first)

1. Red: stored-empty lane text; add input outside `[role=list]`, form without `opacity-0`; typing `[[` in the add input shows suggestions with `bottom-full`, the card editor's without it.
2. Implement add row + placement. 3. Red then implement: filter text, "1 of 3", unchanged `n/max` with no filter, `atLimit` from the stored count, icon and count names. 4. Red then implement the rail: width 40, title shown, no "Resize lane", Rename expands and shows the input, Expand restores 272 px. `n` shortcut test after ArrowDown.

## Prior art

- `mountBoard`, `root()`, `press()`, `settle()`: `KanbanView.test.ts:340-430`; `openMenu`: `:245-254`; `toggleLaneCollapsed` seed: `:449-466`.

## Risks

- `chrome-state-styles.test.ts` scans hover reveals; removing the form's reveal classes only removes a match.
- No drag handler is touched; the empty text sits inside the list so a drop on it still reaches the list's `ondrop`.

## Defaults taken

- The lane grip and auto-complete icon stay on the rail (hiding the grip would stop collapsed lanes from being reordered).
- Double-click on the rail title also expands first, the same as "Rename".
- Count names use "card" for a total of 1 ("1 card", "0 of 1 card").
