# Verdict: kanban slice (P02 P03 P04 P05 P06 P88 P143 P145 P144 P186)

Refutation of `scout-kanban.md`, checked by reading code at HEAD 085b23c5d. No code was run.

Verified context:
- `git diff --stat origin/main...origin/mvp-claude` touches no file under `src/lib/plugins/kanban/`, no `src/lib/app/EditorView.svelte` and no `help/documentation/21-kanban.md` (it touches help 07, 19, 20 only). The scout is right here.
- Live folder conflict the scout missed: `.scratch/shell-sidebars-ux/issues/25-view-title-row-per-tab-source.md` (status todo, blocked by 16) wraps the KanbanView toolbar (`KanbanView.svelte:462-507`) in a new `ViewHeader`, edits `EditorView.svelte:30-53,96-108`, and states "No new props on the three views" and "`KanbanView` receives no `path` prop ... which is why the header reads the store" (lines 7, 51). The scout's P143 plan adds a `path` prop through EditorView: that contradicts 25 and edits the same lines.
- Source-scan gates any ticket here must keep green: `src/tests/lib/chrome-state-styles.test.ts:48-54` (every `group-hover:opacity-100` also needs `group-focus-within` or own `focus-within:opacity-100`), `src/tests/lib/menu-item-anatomy.test.ts` (menu items), and `KanbanView.test.ts:246-254` pins the card menu as exactly `['Edit', 'Archive', 'Card color', 'Delete']`, so "Move to" and "Tag color" change that pin on purpose.
- E2E `e2e/specs/kanban-view.spec.ts` only checks the board renders and the source toggle (`:32-60`); none of the tickets needs more than it already has.

## Per proposal

### P02: QUICK-PART (changed: drag part moved to DEFER)
Premise holds: `canReorder` at `KanbanView.svelte:173` feeds `disableDrag={!canReorder}` at `:534`, which drops `draggable` on cards (`KanbanCard.svelte:160-162`) and the lane grip (`KanbanLane.svelte:234`). The card menu (`KanbanCard.svelte:225-263`) has no move action.

Refuted part: "keep card drag on in every state" edits `handleItemDragOver` / `handleItemDrop` (`KanbanView.svelte:365-410`), the exact handlers open-itens 040 must fix for its off-by-one index bug (unfixed, verified: `:371-399` count the dragged card, `moveItem` removes before splicing, `kanban.logic.ts:440-449`). It is a drop-index path that places cards in the file, it needs DragEvent and `getBoundingClientRect` stubs, and two tickets on the same handlers would conflict. DEFER it with 040.

Ship: the "Manual order paused" chip (toolbar, visible when `!canReorder`) and a "Move to" `ContextMenu.Sub` in the card menu. "Move to" reuses `moveItem` with `toIndex = stored target lane length` and `isLaneAutoComplete(board, target.title)`; `moveItem` already refuses a missing target lane (`kanban.logic.ts:437-438`), so it cannot drop a card. Works in every sort/filter state and is the keyboard path the review wants.

### P03: QUICK-PART (call kept, scout's guard is wrong and replaced)
Premise holds: `handleBoardKeydown` reads unfiltered `board.lanes` (`KanbanView.svelte:242`) while the ring id at `:527` is also taken from stored `lane.items`, so with a filter on the ring and Delete/Backspace (`:301-312`) hit a stored card that may be hidden. The handler runs in list and table mode (root `:460` wraps all three).

Refuted: the scout's guard `e.target === e.currentTarget` breaks keyboard navigation in the common case. Every card and every lane title sits inside a bits-ui ContextMenu trigger `<div>` with `tabindex: -1` (`node_modules/bits-ui/dist/bits/menu/menu.svelte.js:1593-1599`; `mergeProps` keeps it because the shadcn wrapper passes `tabindex` undefined, svelte-toolbelt `result[key] = b !== undefined ? b : a`). Clicking a card focuses that trigger div, not the board root, so arrows after clicking a card would stop working. Second missed case: `KanbanDatePicker.svelte:89-96` renders the calendar popover inline (no Portal) inside the card, so Space/Enter/arrows on a calendar day bubble to the root handler today and toggle or start editing the ring card.

Ship (all in `KanbanView.svelte`): board mode only; return when `e.target.closest('input, textarea, select, button, a, [role="button"], [role="gridcell"], [role="menuitem"], [contenteditable]')` is set (this keeps the card trigger div working); index, ring and action all from `board.lanes.map(displayLane)`; clear focus when filter, sort or view mode changes. Defer roving tabindex, focus-visible ring and the shortcut hint (M).

### P04: QUICK (kept, one data case added)
Premise holds: `renameLane` (`kanban.logic.ts:492-499`) changes the title only; getters read `laneSettings[title]` (`:594-659`); `handleAddLane` always adds "New Lane" (`KanbanView.svelte:128-133`); rename tests check only the title (`kanban.logic.test.ts:552-561`). Pure `.logic.ts` change. It does change what a rename writes to the `.kanban` settings block (`%% kanban:settings`), which is why I checked for a way it could lose settings:
- Renaming lane A to a title lane B already has, with no suffix rule, would move A's entry over B's and overwrite B's limit and auto-complete. The prototype's suffix rule (`prototypes/kanban-board.html:418,1174`, " 2", " 3") prevents that; it must ship together with the key move, never alone.
- Two lanes already sharing a title on disk: the scout leaves the key and the renamed lane loses its (shared) settings. Copy the entry to the new title in that case instead, so neither lane loses behavior.
No other reader of `laneSettings` exists outside `kanban.logic.ts` (grep of `src`). Stale keys from past renames stay as they are. Open-itens 048 (rename to "Archive" after a raw `---`) is not fixed by this and stays open.

### P05: QUICK-PART (kept, one gotcha added)
Premise holds: form at `opacity-0 ... group-hover/lane:opacity-100` inside the scroll list (`KanbanLane.svelte:354-356`), empty lanes render nothing, the auto-complete icon (`:308-310`) and count (`:311-313`) have no names.
Missed gotcha: the add input's `KanbanWikilinkSuggestions` dropdown is `absolute ... mt-1` below the input (`KanbanWikilinkSuggestions.svelte:79`). Pinned to the bottom of a full-height lane it overflows the board region (`overflow-x-auto`, `KanbanView.svelte:516`, which makes the y axis scroll too), so suggestions open off screen. The add row needs the dropdown to open upward (a placement prop; the card editor keeps the current placement). The `n` shortcut (`KanbanView.svelte:319-321`, `form input` inside `[data-lane-id]`) keeps working if the form stays inside the lane root. Defer the "..." lane menu (M).

### P06: QUICK-PART (changed: "scroll new lane into view" dropped)
Premise for the rail holds: a collapsed lane keeps `style="width: {currentWidth}px"` (`KanbanLane.svelte:216`).
Refuted part: `handleAddLane` already sets the new lane editing (`KanbanView.svelte:132`) and `KanbanLane.svelte:157-163` calls `laneTitleInput.focus()`, which scrolls the input into view (HTML `focus()` without `preventScroll`). The scout's test (stub `scrollIntoView`, assert called) would pass without changing anything the user sees. DROP that part unless the running app shows otherwise (not verified in WKWebView).
Ship: collapsed lane as a 40 px rail (chevron, count, vertical title), resize handle hidden while collapsed, rename from the rail expands the lane first (a 40 px rename input is unusable). No write change: `collapsed` already persists through `toggleLaneCollapsed`. Defer edge fades, toolbar Add lane / Archive, drops onto the rail.

### P88: QUICK-PART (kept)
Premise holds: tag chip is a Popover trigger (`KanbanCardText.svelte:32-72`), swatches use `onmousedown` and `title` only (`:52-59`), `onOpenAutoFocus` prevented (`:49`). Tag colour keeps the same write (`setTagColor` / `removeTagColor`, `KanbanView.svelte:154-160`), only the trigger moves to a "Tag color" card-menu submenu. The proposal offers "card menu or Shift+click"; take the card menu only (keyboard reachable). Known limit to state in the ticket, not to fix: the filter is raw substring (`kanban.logic.ts:913-917`), so clicking `#design` also shows `#design-system` cards; a test seeded only with `#design` and untagged cards would not show this. Help `21-kanban.md:154` changes. Defer the shared swatch radiogroup (cross-feature primitive).

### P143: QUICK (kept, reset mechanism changed)
Premise holds: `filterQuery` is module state (`kanban.store.svelte.ts:9,29`), the view is mounted unkeyed (`EditorView.svelte:81`), the input (`KanbanView.svelte:500-505`) has no clear, the lane count is the filtered length (`KanbanLane.svelte:312`).
Changed: no `path` prop and no EditorView edit (conflicts with shell-sidebars-ux 25). KanbanView reads `editorStore.activeTab?.path` itself (plugins already read `editorStore`, e.g. `TableOfContentsPanel.svelte`) and clears filter and keyboard focus when it changes and on destroy. Do not clear `editingItemId` / `editingLaneId` there: that unmounts an open textarea during a tab switch, which is the unfixed wrong-tab write of open-itens 006. Lane half ("n of m", "No matching cards") goes with P05 in the lanes ticket.

### P145: QUICK-PART (kept, one acceptance added)
Premise holds: `rows="1"` textarea (`KanbanCard.svelte:180-189`), seeded from raw `item.text` (`:105`), focus falls to body after the edit unmounts.
Added risk: moving focus to the board root synchronously in the Enter handler blurs the still-mounted textarea, and `onblur={commitEdit}` (`:186`) runs a second commit against the old `item` prop. Move focus only after the edit state unmounts (`tick()`), and assert one persist per Enter (`getPersistCount`, harness). Defer editing without the `{date}`/`{color}` tokens (rewrites stored card text on commit).

### P144: QUICK-PART (kept, implementation changed, doc added)
Premise holds: unnamed check buttons (`KanbanTableView.svelte:43-51`, `KanbanListView.svelte:35-43`), raw `displayText` in the table (`KanbanTableView.svelte:54`), no table empty row (list view already has one per lane, `KanbanListView.svelte:54-56`), archive rows show raw `item.text` (`KanbanView.svelte:598`), Restore is silent (`:332-336`).
Changed: instead of a new regex `stripCardTags`, give `KanbanCardText` a `hideTags` prop that skips tag segments, so the table uses the same `parseCardSegments` parse as the board and cannot diverge on `[[Note#Heading]]`-style text. The help page documents the current table on purpose ("card text is shown as plain text", "copy-pasting card text", `21-kanban.md:25,27`); the design review overrides it, so the ticket must rewrite those lines. Defer the lane picker on Restore.

### P186: QUICK (kept, two gotchas added)
Premise holds: the date row always renders (`KanbanCard.svelte:206-208`), the undated trigger is a 50% icon (`KanbanDatePicker.svelte:76-87`), preview is `max-h-32 overflow-y-auto` (`KanbanCard.svelte:210`).
Gotchas: (1) the date popover content is inline, a DOM child of the picker (`KanbanDatePicker.svelte:89`), so an `opacity-0` wrapper around the picker also hides an open calendar when the pointer leaves the card; the wrapper must stay opaque while the popover is open (for example `has-[[data-state=open]]:opacity-100`). WebKit does not focus a clicked button, so `focus-within` alone does not hold it. (2) Keep the picker outside the title `<span ondblclick={onStartEdit}>` (`:200-205`), or a double-click on the icon starts editing. The reveal must pass `chrome-state-styles.test.ts`. Add `rounded-md` on the card so open-itens 197 is fully covered (its only other ask).

## Final quick tickets

Order (impact vs size, quick wins first). Tickets 1 to 7 all touch `src/lib/plugins/kanban/` and most touch `KanbanView.svelte`: run them one after another. Tickets 3 and 4 edit the toolbar that shell-sidebars-ux 25 wraps: land them before 25 starts, or after it with the controls inside `ViewHeader`'s children, never in parallel.

Test seam for all: `src/tests/lib/plugins/kanban/KanbanView.test.ts` with `src/tests/fixtures/KanbanViewHarness.svelte` (real store and logic, only `kanban.service.js` mocked) and `kanban.logic.test.ts`. Gate: `pnpm check` + targeted vitest, plus `chrome-state-styles`, `menu-item-anatomy` and `chrome-type-scale` tests when markup changes.

### 1. Kanban keyboard shortcuts act only on the card you see (P03 slice)
- Files: `src/lib/plugins/kanban/KanbanView.svelte`, `src/tests/lib/plugins/kanban/KanbanView.test.ts`.
- What to build: the board key handler runs only in board mode, ignores keys whose target is inside an interactive control (input, textarea, select, button, link, `role=button|gridcell|menuitem`, contenteditable) but still runs when the focused element is a card's menu-trigger div, computes lane and card indexes from the visible (filtered and sorted) lanes, derives the ring from the same list, and clears focus when filter, sort or view mode changes.
- Acceptance:
  - [ ] Failing test first: lanes with `#x` and untagged cards, `setFilterQuery('#x')`, ArrowDown then Backspace on the board root: the deleted card is the ringed visible one and every hidden card is still in the persisted markdown. Fails today.
  - [ ] Click (focus) a card's trigger div, ArrowDown moves the ring: keyboard navigation still works from a card.
  - [ ] In list and table mode, Delete, Backspace and Space on the root change nothing.
  - [ ] Space or Enter dispatched on a button inside a card (check button, a calendar day) does not toggle or edit the ringed card.
  - [ ] Changing the sort, view mode or filter clears the ring.

### 2. Renaming a kanban lane keeps its settings; new lanes get unique names (P04)
- Files: `src/lib/plugins/kanban/kanban.logic.ts`, `src/lib/plugins/kanban/KanbanView.svelte` (`handleAddLane`), `kanban.logic.test.ts`, `KanbanView.test.ts`.
- What to build: `renameLane` moves `laneSettings[old]` to the new title (copies it when another lane still has the old title, adds nothing when there is no entry) and suffixes a title another lane uses (" 2", " 3"). Exported `uniqueLaneTitle` is used by rename and by Add lane.
- Acceptance:
  - [ ] Failing test first: lane "Done" with `{ autoComplete: true, maxItems: 5, collapsed: true }` renamed to "Complete": the three getters return true, 5, true for "Complete" and no "Done" key remains. Fails today.
  - [ ] A lane with no settings renames without gaining an entry.
  - [ ] Renaming to a title another lane has gives "<title> 2" and leaves that lane's settings unchanged.
  - [ ] Two lanes titled "Done" sharing one entry: renaming one keeps the "Done" entry and gives the renamed lane a copy.
  - [ ] Serialize then `parseKanbanBoard` keeps the settings under the new title; a card dropped into the renamed auto-complete lane (via `moveItem` with `isLaneAutoComplete`) is checked.
  - [ ] Clicking Add lane twice gives "New Lane" and "New Lane 2".

### 3. Kanban filter clears, resets per board, and a tag click filters (P143 toolbar half, P88 slice)
- Files: `src/lib/plugins/kanban/KanbanView.svelte`, `KanbanCardText.svelte`, `KanbanCard.svelte`, `KanbanLane.svelte` (prop pass-through), `help/documentation/21-kanban.md`, `KanbanView.test.ts`.
- What to build: an X button named "Clear filter" shown only with a query, Escape in the input clears it; KanbanView clears filter and focus when `editorStore.activeTab?.path` changes and on destroy (no new prop, no EditorView change, editing ids untouched). A tag chip is a plain button that sets the filter to `#tag`; tag colour moves to a "Tag color" card-menu submenu (one row per tag, swatches, "Reset to default") using the existing `onSetTagColor` / `onRemoveTagColor`. Help line 154 rewritten.
- Acceptance:
  - [ ] Failing test first: typing a query shows "Clear filter"; clicking it empties `kanbanStore.filterQuery` and all cards render again. Fails today.
  - [ ] Escape in the filter input clears it.
  - [ ] With two kanban tabs in the real `editorStore`, switching the active tab path clears the filter; unmounting clears it.
  - [ ] Clicking a `#design` chip sets the filter to `#design` and hides an untagged card.
  - [ ] "Tag color" in the card menu (shown only on cards with tags) writes `settings.tagColors` in the persisted markdown; the card-menu pin in `KanbanView.test.ts:246-249` is updated on purpose.

### 4. Kanban cards move between lanes from the card menu (P02 slice)
- Files: `src/lib/plugins/kanban/KanbanView.svelte`, `KanbanLane.svelte`, `KanbanCard.svelte`, `help/documentation/21-kanban.md` (`:73,76`), `KanbanView.test.ts`.
- What to build: a "Manual order paused" chip after the sort select, visible when `!canReorder`, with a title saying drag reorder is off while sorted or filtered; a "Move to" submenu in the card menu listing the other lanes, calling `moveItem(board, from, id, to, storedTargetLength, isLaneAutoComplete(...))`. Drag behaviour unchanged.
- Acceptance:
  - [ ] Failing test first: "Move to" > "Done" on a To Do card puts it last in Done in the persisted markdown. Fails today (no such item).
  - [ ] Moving into an auto-complete lane checks the card; with a filter hiding cards in the target lane, the moved card lands after the hidden ones.
  - [ ] The current lane is not listed; with a single lane the submenu is disabled.
  - [ ] The chip shows with a sort or a filter and not in manual order with no filter.

### 5. Kanban lanes: visible add row, empty and filtered counts, collapsed rail (P05 slice, P143 lane half, P06 slice)
- Files: `src/lib/plugins/kanban/KanbanLane.svelte`, `KanbanView.svelte` (pass `totalCount`), `KanbanWikilinkSuggestions.svelte` (upward placement option), `KanbanView.test.ts`.
- What to build: the add form moves to a `shrink-0` row below the scroll list, always visible, its suggestions opening upward; an empty stored lane says "No cards. Drag one here or add a card.", a lane emptied by the filter says "No matching cards"; with a filter the count reads "n of m"; the auto-complete icon and count get accessible names; a collapsed lane is a 40 px rail (no resize handle, rename expands first).
- Acceptance:
  - [ ] Failing test first: an empty lane renders "No cards. Drag one here or add a card." Fails today.
  - [ ] The add input is outside the `role="list"` element and its form carries no `opacity-0`.
  - [ ] Filter that empties a lane shows "No matching cards"; the count reads "1 of 3" while filtering and is unchanged (including `n/max`) without a filter.
  - [ ] The `n` shortcut still focuses the lane's add input.
  - [ ] A collapsed lane has width 40 px, shows its title, has no "Resize lane" separator; expanding restores the board width.

### 6. Kanban cards: no empty date row, clamped preview, growing editor (P186, P145 slice)
- Files: `src/lib/plugins/kanban/KanbanCard.svelte`, `KanbanView.svelte` (board root ref and focus after edit), `KanbanView.test.ts`.
- What to build: undated cards drop the date row; the "Set date" trigger sits at the end of the title line, outside the double-click span, revealed on hover or focus and kept visible while its popover is open (never `display:none`); dated cards unchanged; preview `line-clamp-3`; card `rounded-md`. The edit textarea grows with its content (scrollHeight); after Enter or Escape, once the textarea has unmounted, focus goes to the board root; a blur commit moves no focus.
- Acceptance:
  - [ ] Failing test first: an undated card has a "Set date" button and no separate date row element. Fails today.
  - [ ] A dated card still shows its badge; the linked preview element has `line-clamp-3`.
  - [ ] With a stubbed `scrollHeight`, typing sets the textarea height to it.
  - [ ] After Enter, `document.activeElement` is the board root and the harness persisted exactly once; after Escape, focus is the board root and nothing persisted.
  - [ ] `chrome-state-styles.test.ts` passes.

### 7. Kanban list, table and archive: named checks, clean cells, restore feedback (P144 slice)
- Files: `src/lib/plugins/kanban/KanbanTableView.svelte`, `KanbanListView.svelte`, `KanbanCardText.svelte` (`hideTags` prop), `KanbanView.svelte` (archive rows, restore toast, pass `onWikilinkClick` to the table), `help/documentation/21-kanban.md` (`:25,27,109`), `KanbanView.test.ts`.
- What to build: check buttons named "Mark done" / "Mark open" in list and table; table card cell renders through `KanbanCardText` with `hideTags` (clickable wikilinks, no tag text, tags stay in the Tags column) and a "No cards" row when no lane has cards; archive rows show `stripCardMetadata(item.text)`; Restore toasts "Restored to <first lane>" through `svelte-sonner` (mocked in the test as a side-effect service).
- Acceptance:
  - [ ] Failing test first: in table view the check button is found by name "Mark done" and flips to "Mark open" after a click. Fails today.
  - [ ] Table card cell of `Ship #design [[Spec]]` shows "Ship" and a "Spec" button, no `#design` text; clicking "Spec" calls `onOpenWikilink('Spec')`.
  - [ ] An empty board in table view shows "No cards".
  - [ ] An archived `Pay rent {2026-11-20} {color:red}` shows "Pay rent"; Restore calls `toast` with "Restored to To Do" and the card is in the first lane.

## Deferred (one line each)
- P02 card drag while sorted or filtered: same drop handlers and index math as open-itens 040 (unfixed), a card-placement path; do with or after 040.
- P02 lane insertion bar and no-drop outline: lane drop index is broken at HEAD (040).
- P03 roving tabindex, focus-visible ring, shortcut hint: M, changes the focus model of every card and menu.
- P05 "..." lane menu: M, a second copy of the six lane actions and their pins.
- P06 scroll new lane into view: likely already done by the title input's `focus()`; check in the running app before any ticket.
- P06 edge fades, visible scrollbar, Add lane / Archive in the toolbar, drops onto the rail: M layout, moves the data-bearing archive panel, and the toolbar is shell-sidebars-ux 25's.
- P88 shared swatch radiogroup / `menuitemradio`: cross-feature primitive (colour and canvas slices).
- P145 editing without `{date}` / `{color}` tokens: rewrites stored card text on commit (owner data rule).
- P144 lane picker on Restore: needs a design decision; archived items store no lane.
- Open-itens 214 part 2 (lane grip `group-hover/lane`): making the grip visible advertises lane drag, which silently does nothing or moves the wrong lane on boards with cards (040); ship after 040.

## Overlaps
- open-itens 049: fully covered by ticket 2 (all its criteria, including the auto-complete drop). Mark wontfix with a pointer. Its "Blocked by 048" was a same-function ordering note; 048 stays open and is not covered.
- open-itens 197: fully covered by ticket 6 (hidden empty date row, focus reachable, `rounded-md`). Mark wontfix with a pointer.
- open-itens 214: not covered (part 1 is NoteRow, part 2 deferred behind 040). Keep open.
- open-itens 040 and 006: not covered; tickets 3 and 6 avoid their code paths on purpose (no drag handler edits, no editing-id clear on tab change).
- shell-sidebars-ux 25: dependency for tickets 3 and 4 (same toolbar lines; 25 forbids a new KanbanView prop, which is why ticket 3 reads `editorStore`).
- No overlap with finders-ux, tasks-view-ux, frontmatter-rules, claude-code-integration (no kanban file in the mvp-claude diff), mods-host-robustness, vault-organization-v2.

## Not verified
Nothing was run. The `focus()` scroll for new lanes (P06), WebKit not focusing clicked buttons (P186), and the suggestions dropdown overflow (P05) are from reading code and platform behaviour, not from the running app.
