# Design review: Kanban (src/lib/plugins/kanban)

Evidence: screens/kanban-board-light.png, kanban-board-dark.png, and the code. Nothing was run; behaviors marked "code-read" come from reading the handlers.

## Clear improvements

### 1. Cards cannot move between lanes while a sort or filter is active
- KanbanView.svelte:173 `canReorder = canReorderItems(sortMode, filterQuery)` feeds `disableDrag` (line 534). KanbanCard.svelte:160-162 turns `draggable` off for the whole card, and the grip is hidden (line 217).
- The guard exists because a drop index among filtered cards would misplace the card inside a lane. A cross-lane move to the end of the target lane needs no index.
- Result: with "Date (oldest)" or a filter such as "#design", the main kanban action is dead. There is no tooltip, no banner, and no "Move to lane" menu entry or key.
- Proposal: keep drag enabled. When `!canReorder`, drops append to the end of the target lane and the lane shows no insertion line. Show a small "Manual order paused" chip next to the sort control. Add "Move to lane" as a submenu on the card context menu, and `[` / `]` keys on the focused card. Lanes also need an insertion indicator, because lane drags show none (KanbanView.svelte:434-456), and drags should cancel on Escape.

### 2. Destructive actions have no confirmation and no undo
- Backspace or Delete on the focused card (KanbanView.svelte:301-313), card "Delete" (KanbanCard.svelte:259), "Delete lane" (KanbanLane.svelte:300, `removeLane` at kanban.logic.ts:484 drops the lane and all its cards), "Archive completed" (:295), and archive "Delete permanently" (KanbanView.svelte:338).
- "Delete lane" is the last item in a context menu on the title text only, next to "Set card limit".
- Precedent in the app: tasks.service.ts:265 has an Undo toast.
- Proposal: every delete shows a toast with Undo for about 6 s, restoring the previous serialized board. Deleting a lane with cards asks first ("Delete lane In progress and its 4 cards?"). "Archive completed" toasts "Archived 3 cards" with Undo.

### 3. The board key handler acts on the wrong or invisible cards and steals native keys
- `handleBoardKeydown` (KanbanView.svelte:236-326) is attached for board, list and table modes. It reads `board.lanes`, not the filtered/sorted `displayLane`, and it only skips INPUT, TEXTAREA and SELECT (line 240).
- After any arrow key, focus is a pair of indexes in the store. Tabbing to a button (check box, date, wikilink) and pressing Enter, Space or Backspace runs the store-focused card's action and prevents the native one. In list and table views no card ring is drawn, so Delete removes an invisible card. With a filter active, `focusedItemId` (line 527) indexes the unfiltered `lane.items`, so the ring and Delete can hit a hidden card.
- Cards are not focusable (`div role="listitem"`, KanbanCard.svelte:157-165), and there is no hint that arrow keys work.
- Proposal: roving tabindex on cards (focusable `listitem`s). The handler runs only for the focused card's own element, and only in board mode. Indexes are computed from the displayed lanes. Add a visible `focus-visible` ring on cards. Show a `?` hint or tooltip listing keys. Cmd+Arrow moves the card between lanes.

### 4. Tag chip text fails contrast
- color-presets.ts:2-10 uses the raw palette for chip text on a 15% tint of the same color (KanbanCardText.svelte:38, :55, :76; table :60). Computed ratios on a near-white background are yellow 1.7, green 2.1, orange 2.2, gray 2.2, blue 2.5, red 3.0, purple 3.1, all at `text-xs`. In kanban-board-light.png the yellow "#docs" and gray "#research" are hard to read.
- The same palette is shared with QueryJS cards (comment at color-presets.ts:22).
- Proposal: derive text from theme tokens, for example `color-mix(in oklab, <hue> 55%, var(--foreground))` in light mode and the existing bright value in dark mode. Keep the 15% fill. Target at least 4.5:1.

### 5. Renaming a lane silently drops its settings; duplicate lane names share settings
- Lane settings (auto-complete, card limit, collapsed) are keyed by lane title (kanban.logic.ts:595, 616, 647). `renameLane` (:492-498) changes only `title`.
- Rename "Done" and its auto-complete check, limit and collapse silently reset, and a stale entry stays in the settings block. `handleAddLane` always creates "New Lane" (KanbanView.svelte:129), so two new lanes share one settings entry.
- Proposal: move the settings key on rename. Make new lane titles unique ("New lane 2"). Reject or suffix a rename to an existing title. Longer term, key settings by lane id.

### 6. Add-card and lane actions are hover- or right-click-only
- The add-card form is `opacity-0` until the lane is hovered or focused (KanbanLane.svelte:356). An empty lane shows nothing (no placeholder), and a long lane scrolls the form away because it sits at the end of the scroll list.
- Lane actions (rename, auto-complete, limit, archive completed, delete) live only on a context menu attached to the title `h3` (:257-268). Card color, archive and delete live only on the card context menu.
- Proposal: a persistent "+ Add card" ghost row pinned below the scroll area of each lane that turns into the input on click, so it is always visible (the `N` key still works). An empty lane shows "No cards. Drag one here or add a card". Add a "..." button in the lane header, visible on hover and keyboard focus, that opens the same menu through the shadcn DropdownMenu. Give the two header indicators (auto-complete check, `n/max`) a tooltip: "Cards moved here are checked", "Limit 5, 6 cards".

### 7. Wide boards hide lanes, "Add Lane" and the Archive, and collapsing saves no space
- kanban-board-light.png shows three lanes at 1440 px; the fourth ("Done") is off-screen. The row is a plain `overflow-x-auto` container (KanbanView.svelte:516) with no fade or visible scrollbar. "Add Lane" (:567) and the Archive column (:577) sit after the last lane, so they are the hardest things to reach.
- A collapsed lane stays at full width and full height (KanbanLane.svelte:215, 316), so collapsing frees no horizontal space.
- Proposal: edge fades and a visible horizontal scrollbar when content overflows. Add "Add lane" and an "Archive (n)" button to the toolbar. Collapse to a 40 px vertical rail with a rotated title and count that still accepts card drops. Optionally pin lane titles in a minimap.

## Moderate

### 8. Two color systems on one card collide
- A user-chosen card color tints the whole background (KanbanCard.svelte:159, COLOR_PRESET_BG), while date proximity draws a 4 px left bar (`PROXIMITY_CLASSES` border, kanban.logic.ts:712-719) in theme colors that overlap the same hues. In kanban-board-light.png "Calendar week view" has a blue tint with no bar and "Onboarding tour" has a yellow tint with a blue bar. Blue means "chosen color" on one card and "due in 3 days" on another.
- The date badge already carries the proximity color.
- Proposal: draw the left bar only for overdue and today (urgent states). Tomorrow and upcoming rely on the badge. Keep card color as the tint only. Add an alarm glyph to the overdue badge so the state is not color-only.

### 9. Toolbar controls are native or unlabeled and off-pattern
- KanbanView.svelte:488 uses a native `select` (macOS chrome visible in the screenshot) with no label ("Manual" alone; the `ArrowUpDown` icon is the only cue). View toggles use `title` only (:464-484). Other toolbars use shadcn controls (collection/toolbar/FilterRow.svelte:2-10, tasks/TasksView.svelte:17-20), and the `tooltip`, `select` and `dropdown-menu` primitives exist in components/ui.
- The board/source toggle is a floating icon at the bottom right (app/EditorView.svelte:96-109) that overlaps the right-most lane and sits far from the view toggles.
- Proposal: view switch as a labeled segmented control with Tooltip. Sort as a DropdownMenu button reading "Sort: Manual". Move the Board/Source toggle into the toolbar. Rename "Unchecked first" to "Open first".

### 10. Filter gives no feedback and its state is shared across boards
- The filter input (KanbanView.svelte:500-505) has no clear button, and Escape does nothing because the key handler returns early on INPUT (:240). Zero matches renders empty lanes. Lane counts show the filtered number ("In progress 0" while holding 2 cards, KanbanLane.svelte:312).
- `filterQuery` lives in a module store (kanban.store.svelte.ts:11) reset only on vault teardown (kanban.service.ts:39). It follows the user to other boards and hides cards with no visible reason.
- `filterItems` (kanban.logic.ts:917-921) matches raw text, so "blue" also matches `{color:blue}`.
- Proposal: clear button (like rail-shell/RailListSearch.svelte:106-112), Escape clears, per-board state, a "3 of 11 cards" status, a "No cards match" lane placeholder, and `n of m` in lane counts. Match on displayed text only.

### 11. List, table and archive show raw or dead-end content
- Table: the Card column prints `displayText` (KanbanTableView.svelte:62), which still contains `#tags` and `[[links]]`, then repeats the tags in the next column; wikilinks are not clickable (documented in help/documentation/21-kanban.md). Zero cards render only the header. Check buttons have no label (:43-51, same in KanbanListView.svelte:35-43).
- Archive rows print raw `item.text` including `{2026-11-14}` and `{color:...}` (KanbanView.svelte:598). "Restore" always goes to the first lane with no feedback and no choice (:332-336). Delete is permanent with no undo.
- Proposal: strip tags from the card column, render wikilinks, add `aria-label="Check"/"Uncheck"`, add an empty-state row. Archive rows use `stripCardMetadata` and show the date and origin lane. Restore returns to the origin lane, or a "Restore to..." menu, with a toast.

### 12. Tag-color popover is mouse-only and swatches have no names
- Swatches and Reset use `onmousedown` only (KanbanCardText.svelte:56, :65); focus is not moved into the popover (:49). Keyboard users cannot set a tag color. Swatch buttons expose only `title="blue"` (:57; KanbanCard.svelte:246) with no `aria-label` or `aria-pressed`.
- Clicking a tag opens a palette, which blocks the more common expectation of filtering by that tag.
- Proposal: `onclick` plus focus management into the popover, `aria-label="Blue"` and `aria-pressed`. Make a plain click on a tag filter the board, and move color setting to the tag's context menu or Shift+click.

### 13. Inline card editing is a one-row textarea showing raw tokens
- KanbanCard.svelte:180-189 is `rows="1"` with no auto-grow, so a card wrapped over three lines collapses to one visible row while editing (code-read, not run). `editText = item.text` (:105) also shows raw `{2026-11-14}` and `{color:blue}` tokens that the card view hides, and a stray edit can corrupt them. Focus is not returned to the card after commit (:92-101).
- Proposal: auto-grow textarea (`field-sizing: content`). Edit only the display text and keep date and color tokens attached. Return focus to the card after Enter or Escape.

## Polish (perfumaria)

### 14. Card anatomy and density
- An empty "Set date" calendar icon is drawn on every undated card (KanbanDatePicker.svelte:76-85) in its own row, and the date badge is a separate row from the tags, so cards are taller than they need to be (kanban-board-light.png, "Types navigator polish").
- The lane grip reserves invisible space in the header (KanbanLane.svelte:234-246), leaving a gap between chevron and title in the screenshot. The card grip reserves space on the right (KanbanCard.svelte:217).
- Linked-file preview dumps raw markdown into a nested scroll area (:209-213) with no loading state.
- Proposal: show the date icon on hover or focus only and put it inline with the tags. Reserve no grip space (use an overlay or drag the whole card). Clamp the preview to 3 lines with a "..." expander, rendered as plain text without markdown syntax.

### 15. Copy and small consistency
- "Add Lane" versus "Add a card..." versus "Filter cards..." (KanbanView.svelte:573; KanbanLane.svelte:365; KanbanView.svelte:502). Removal verbs differ: "Remove color", "Reset to default", "Remove date".
- Raw token names ("blue") appear as swatch titles. The date badge radius differs between card (`rounded-sm`) and list/table (`rounded-xs`). Check-box markup is duplicated in four places. The calendar chevrons are inline SVG (KanbanDatePicker.svelte:106, :110) while lucide is used elsewhere.
- Proposal: sentence case for all labels ("Add lane"), one removal verb ("Remove"), capitalized color names, one shared `KanbanCheck` and date-badge component.
