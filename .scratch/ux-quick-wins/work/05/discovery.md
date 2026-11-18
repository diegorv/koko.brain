# Issue 05 discovery: kanban filter clears, resets per board, tag click filters

No `spec.md` exists for ux-quick-wins; the Issue is the spec. Same harness and test file as `work/01` and `work/02`.

## Files that change

- `src/lib/plugins/kanban/KanbanView.svelte`
  - `:536-544` filter input: wrap in `relative` div; X button `aria-label="Clear filter"` only while `kanbanStore.filterQuery !== ''` (RailListSearch recipe: `onmousedown` preventDefault, click clears + refocuses input); `onkeydown` Escape clears. Board handler already ignores input targets (`OWN_KEYS_SELECTOR`, `:249`).
  - New `let activePath = $derived(editorStore.activeTab?.path ?? null)` and an `$effect` reading it whose teardown clears filter + focus: the teardown runs before each re-run (path change) and on destroy. The derived keeps tab content writes (`editor.store.svelte.ts:86`) from firing it. `editingItemId` / `editingLaneId` untouched.
  - Pass `onTagClick={(tag) => kanbanStore.setFilterQuery('#' + tag)}` to `KanbanLane` (`:561`).
- `src/lib/plugins/kanban/KanbanLane.svelte` `:28-88,334-337`: add `onTagClick` prop, pass through.
- `src/lib/plugins/kanban/KanbanCard.svelte`: add `onTagClick` prop, pass to `KanbanCardText` (drop the colour callbacks there, `:204`); "Tag color" `ContextMenu.Sub` after "Card color" (`:234-258`), only when `extractCardTags(displayText)` is non-empty: per tag a `ContextMenu.Label` `#tag`, swatch buttons (same markup as Card color), and `ContextMenu.Item` "Reset to default" when the tag has a non-gray colour; calls `onSetTagColor` / `onRemoveTagColor`.
- `src/lib/plugins/kanban/KanbanCardText.svelte` `:32-72`: Popover removed; chip is a plain `<button type="button">` calling `onTagClick(seg.value)`; no callback (list view, `KanbanListView.svelte:45`) keeps the `<span>`.
- `help/documentation/21-kanban.md:154`: a click filters; colour is in the card menu; note the substring limit (`#design` also matches `#design-system`), plus the clear button and Escape.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts`: new describes; card menu pin `:251-254` keeps the untagged case and adds a tagged card `['Edit', 'Archive', 'Card color', 'Tag color', 'Delete']`.

## Plan (test-first)

1. Red: Clear filter appears/clears/all cards back; Escape clears; two kanban tabs in real `editorStore` (addTab + setActiveIndex), switch clears filter and ring, open edit survives; unmount clears filter; chip click sets `#design` and hides an untagged card; Tag color writes `settings.tagColors`, Reset removes it; menu pins.
2. Implement view (clear, Escape, reset effect). 3. Chip + pass-through. 4. Tag color submenu. 5. Help.

## Prior art

- Harness/api, `openMenu`, sub-menu open via ArrowRight on the sub trigger: `KanbanView.test.ts:240-290`.
- `editorStore.addTab/setActiveIndex/reset`: `editor.store.svelte.ts:52-66`; used in `CalendarNavigator.test.ts:68`.

## Risks

- The reset effect's teardown writes store state; Svelte runs teardowns untracked, so no loop. The existing filter effect (`:254-259`) then clears focus again, harmless.
- Toggling source mode unmounts the view, which clears the filter (destroy case, as asked).
- Gate scans: `menu-item-anatomy` (no `text-xs`/margins on items), `chrome-state-styles` (no `transition-all`), `chrome-type-scale`, `pane-toolbar` (toolbar class untouched).

## Defaults taken

- With several tags, each gets its own labelled group (separator between groups); "Reset to default" shows per tag only when it has a non-gray colour (today's popover rule).
- Swatches keep `title={color}` (shared radiogroup deferred by the Issue).
- No E2E change: no E2E spec touches the kanban filter or tag chips (to verify with grep before the last commit).
