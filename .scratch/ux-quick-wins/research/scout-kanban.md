# Scout: kanban slice (P02 P03 P04 P05 P06 P88 P143 P145 P144 P186)

Checked at HEAD 085b23c5d. Prototype: `.scratch/design-review/prototypes/kanban-board.html`. All code is in `src/lib/plugins/kanban/` (no Rust, no core path). The Claude MVP diff (`git diff --stat origin/main...origin/mvp-claude`, 172 files) touches no kanban file; it does touch `help/documentation/07`, `19`, `20`, so kanban tickets should edit only `help/documentation/21-kanban.md`.

Test seam for every ticket below: `src/tests/lib/plugins/kanban/KanbanView.test.ts` with `src/tests/fixtures/KanbanViewHarness.svelte` (real `kanbanStore`, real `kanban.logic`, only `kanban.service.js` mocked; menus are already opened there with the `openMenu` helper), plus `kanban.logic.test.ts` for pure logic. Toasts go through `svelte-sonner` (mock that, it is a side-effect service). Never mock the store or `.logic.ts`.

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P02 | QUICK-PART | S | Ship the "Manual order paused" chip, a "Move to" card-menu submenu and cross-lane drag while sorted/filtered; defer the lane insertion bar |
| P03 | QUICK-PART | S | Ship the data-safety slice (board mode only, visible lanes only, act only when the board itself has focus); defer roving tabindex and the shortcut hint |
| P04 | QUICK | S | Pure `kanban.logic.ts`: `renameLane` moves the settings key, new lanes get unique titles; no UI beyond one call site |
| P05 | QUICK-PART | S | Pinned always-visible add row, empty-lane hint, labels on header indicators; defer the "..." lane menu (duplicates the context menu) |
| P06 | QUICK-PART | S | Scroll a new lane into view and shrink a collapsed lane to a 40 px rail; defer edge fades, toolbar Add lane / Archive, drop onto the rail |
| P88 | QUICK-PART | S | Tag click sets the board filter, tag colour moves to a "Tag color" card-menu submenu; defer the shared swatch radiogroup (primitive, other slices) |
| P143 | QUICK | S | Clear X, Escape, reset on board change, "n of m" and "No matching cards"; split over two tickets because it touches the toolbar and the lane |
| P145 | QUICK-PART | S | Auto-grow textarea and return focus to the board after Enter/Escape; defer hiding the date/colour tokens (rewrites card text on commit) |
| P144 | QUICK-PART | S | Check-button names, clean table cells, empty table row, archive rows without tokens, restore toast; defer the lane picker for Restore |
| P186 | QUICK | S | Drop the empty date row on undated cards (reveal on hover/focus), clamp the linked preview to 3 lines |

No DONE and no DROP: every premise still holds at HEAD (verified below). Nothing is Rust, canvas, frontmatter or core write path. The only data-adjacent items are P04 (a kanban settings key moves on rename) and the card-text rewrite in P145 (deferred).

## Per-proposal detail

### P02. Cards cannot move between lanes while sorted/filtered: QUICK-PART (S)

Premise confirmed. `canReorder` (`KanbanView.svelte:173`) is passed as `disableDrag={!canReorder}` (`:534`); `KanbanCard.svelte:160-162` sets `draggable={!disableDrag}` and `KanbanLane.svelte:234` hides the lane grip. The card menu (`KanbanCard.svelte:225-263`) has no move action.

Ship:
- A chip "Manual order paused" in the toolbar right after the sort `<select>` (`KanbanView.svelte:486-497`), visible when `!canReorder`, with a `title` saying why ("Sorted or filtered: dropping appends to the end of the lane").
- A "Move to" `ContextMenu.Sub` in `KanbanCard.svelte` listing the other lanes by title (current lane excluded, disabled when there are none). It calls a new `onMove(toLaneId)` prop wired in `KanbanLane.svelte` and handled in `KanbanView.svelte` by `moveItem(board, from, id, to, targetLane.items.length, isLaneAutoComplete(board, targetLane.title))` using the stored (unfiltered) lane length so the card is appended to the full list.
- Keep card drag on in every state: split `disableDrag` in two (lane grip hides when `!canReorder`; card draggable stays). In `handleItemDrop` (`:384`) when `!canReorder`, compute `toIndex = full target lane length` and do nothing when `toLaneId === dragFromLaneId`. In `handleItemDragOver` (`:365`) draw the indicator at the end when `!canReorder`.

Defer: the vertical insertion bar for lane drags and the no-drop outline. Lane drag-drop itself is broken at HEAD for another reason (see Overlaps, open-itens 040), so a polish bar on top of it should wait for that fix.

Files: `KanbanView.svelte`, `KanbanLane.svelte`, `KanbanCard.svelte`, `kanban.logic.ts` only if a tiny helper is wanted (not required). Tests: `KanbanView.test.ts` (menu seam, no DragEvent needed for "Move to"; the drag slice needs a stubbed `dataTransfer` and `getBoundingClientRect`, same pattern open-itens 040 describes).

### P03. Key handler hijacks native keys and acts on hidden cards: QUICK-PART (S)

Premise confirmed and it is the one real data-loss path in this slice. `handleBoardKeydown` (`KanbanView.svelte:236-326`) reads `board.lanes` (unfiltered, unsorted, `:242`) while the ring (`:527`) and the cards on screen come from `displayLane`. With a filter or a sort on, Delete/Backspace (`:301-312`) removes `lanes[li].items[ii]`, which is not the card under the ring. It also runs in list/table mode (the root div wraps all three, `:460`) and acts on Space when the target is a button (double toggle). Kanban has no undo.

Ship (all inside `KanbanView.svelte`):
1. Return early unless `currentViewMode === 'board'`.
2. Return early unless `e.target === e.currentTarget` (the board root has `tabindex="-1"`, so a click on card text focuses it; keys on buttons, links, inputs, menus and the textarea are never hijacked). This replaces the INPUT/TEXTAREA/SELECT check at `:239-240`.
3. Compute `lanes` from `board.lanes.map(displayLane)` and pass the focused id at `:527` from the same visible list, so index, ring and the deleted card are the same card in filtered and sorted states.
4. `$effect` that calls `kanbanStore.clearFocus()` when `kanbanStore.filterQuery`, `currentSortMode` or `currentViewMode` changes.

Defer: roving tabindex with real DOM focus, focus-visible ring and the shortcut hint (M, changes the focus model of every card and the menu/edit flows). The `n` shortcut (`:314-324`) still works because it queries `form input` inside the lane element.

Files: `KanbanView.svelte`. Tests: harness; seed `#x` and plain cards, `kanbanStore.setFilterQuery('#x')`, dispatch keydown on the root, assert the markdown after Backspace.

### P04. Rename resets lane settings; new lanes share one entry: QUICK (S)

Premise confirmed. `renameLane` (`kanban.logic.ts:492-499`) changes only the title; every getter reads `laneSettings[laneTitle]` (`:594-659`); `handleAddLane` (`KanbanView.svelte:128-133`) always adds "New Lane". No test covers settings on rename (`kanban.logic.test.ts:550-561` checks the title only).

Ship in `kanban.logic.ts`:
- `renameLane` moves `settings.laneSettings[oldTitle]` to `[newTitle]` and deletes the old key, but only when no other lane still carries the old title (duplicate titles already share one entry) and the old key exists (a lane without settings must not gain an entry).
- A title already used by another lane is suffixed " 2", " 3", ... (the prototype's choice; refusing would be a silent no-op in `commitTitleEdit`). Export `uniqueLaneTitle(board, title)` and use it in `renameLane` and in `handleAddLane` ("New Lane", "New Lane 2").
- Not in scope: stale keys left by past renames stay as they are on disk (no migration, per the review: lane ids are not persisted).

Files: `kanban.logic.ts`, `KanbanView.svelte` (one line). Tests: `kanban.logic.test.ts`; plus a harness test that renames through the lane title input and checks the saved settings block.

Data caution: the rename already rewrites the board file; this only moves a key inside the existing `laneSettings` object, same shape. It strictly prevents the loss of a configured limit/auto-complete/collapsed state. Flagging it because it changes what is serialized on rename.

### P05. Add-card input and lane actions only on hover/right-click: QUICK-PART (S)

Premise confirmed: the form is `opacity-0 ... group-hover/lane:opacity-100` inside the scrolling list (`KanbanLane.svelte:354-356`), empty lanes render nothing, the auto-complete check (`:308-310`) and the count (`:311-313`) have no labels, lane actions live only in the title context menu (`:257-305`).

Ship in `KanbanLane.svelte`:
- Move the add form out of the `overflow-y-auto` list into a `shrink-0` row under it, always visible (quiet ghost styling, normal on hover/focus). Keep the `<form>`, input and `Add card` button so the `n` shortcut (`document.querySelector('[data-lane-id=...] form input')`) and wikilink suggestions keep working.
- Empty lane (stored lane has no cards): "No cards. Drag one here or add a card." Filtered-empty copy is in P143.
- `title`/`aria-label` on the auto-complete check ("Auto-complete lane: cards dropped here are checked") and on the count ("3 of 5 cards, limit reached").

Defer: the "..." lane menu (needs a DropdownMenu twin of the context menu's six items; the `KanbanView.test.ts:251-256` menu-anatomy tests would need to pin both; M and not needed for the daily action).

Files: `KanbanLane.svelte`. Tests: harness; empty lane text, add input present without hover class dependency (assert it is outside the `role="list"` scroll container), `aria-label` presence.

### P06. Wide boards: QUICK-PART (S)

Premise confirmed (`KanbanView.svelte:516` `overflow-x-auto`, Add lane and Archive after the last lane `:567-620`, collapsed lane keeps `style="width: {currentWidth}px"` `KanbanLane.svelte:216`). Review severity was "moderate" (trackpad scrolling works).

Ship:
- `handleAddLane` (`KanbanView.svelte:128`): after the update and a `tick()`, `scrollIntoView({ inline: 'nearest' })` on the new `[data-lane-id]`.
- Collapsed lane renders as a 40 px rail (`KanbanLane.svelte:214-216`, header `:222-314`): chevron on top, count, title vertical (`writing-mode: vertical-rl`), resize handle hidden while collapsed. The title keeps its context menu and double-click rename. Rail does not accept drops (same as today: a collapsed lane has no drop zone because the list is not rendered).

Defer: edge fades and visible scrollbar (scroll listener and CSS mask work), moving Add lane and Archive (n) into the toolbar and the archive panel (moves a data-bearing UI), drops onto the rail.

Files: `KanbanLane.svelte`, `KanbanView.svelte`. Tests: harness; jsdom has no `scrollIntoView`, stub `Element.prototype.scrollIntoView` (DOM service) and assert it is called on the new lane; assert collapsed lane has the rail width and the title text.

### P88. Six colour pickers, kanban tag popover: QUICK-PART (S)

Premise confirmed. A tag chip in a card is a Popover trigger (`KanbanCardText.svelte:49-66`), swatches use `onmousedown` and `title` only (`:71-78`), and the popover has `onOpenAutoFocus` prevented, so there is no keyboard path. The board filter already matches raw `#tag` text (`kanban.logic.ts:913-921`).

Ship:
- `KanbanCardText.svelte`: the tag becomes a plain `<button>` with a new `onTagClick(tag)` prop (no Popover). `KanbanCard.svelte` forwards it; `KanbanView.svelte` calls `kanbanStore.setFilterQuery('#' + tag)`.
- A "Tag color" `ContextMenu.Sub` in the card menu, shown only when the card has tags (`extractCardTags`), one row per tag with the existing swatches plus "Reset to default", calling the existing `onSetTagColor` / `onRemoveTagColor` (same board-settings write as today).
- Update `help/documentation/21-kanban.md:154`.

Defer: the shared swatch radiogroup / `menuitemradio` promotion (a cross-feature primitive spanning canvas, tags and the other pickers; belongs to the colour and canvas slices, not kanban).

Owner check: this changes a gesture the owner may use (click tag to colour). The proposal itself moves it to the card menu, so it is within the validated design, but confirm before launching. Files: `KanbanCardText.svelte`, `KanbanCard.svelte`, `KanbanLane.svelte` (prop pass-through), `KanbanView.svelte`, help page. Tests: harness; click a `#design` chip, assert `kanbanStore.filterQuery === '#design'` and cards narrowed; menu test for "Tag color".

### P143. Filter has no clear, no empty feedback, leaks across boards: QUICK (S)

Premise confirmed. `filterQuery` is module state (`kanban.store.svelte.ts:9,29`), `KanbanView` is mounted unkeyed (`src/lib/app/EditorView.svelte:81`, canvas and collection use `{#key path}`), the filter input (`KanbanView.svelte:500-505`) has no clear control, and the lane count shows `lane.items.length` of the already-filtered lane (`KanbanLane.svelte:312`).

Ship, in two tickets because it spans the toolbar and the lane:
- Toolbar (ticket K-A): a clear button `aria-label="Clear filter"` shown only with a non-empty query, Escape in the input clears it; reset the query when the board changes. Do not `{#key}` the view in `EditorView` (that mounts/unmounts on tab change and interacts with the unfixed open-itens 006). Instead add an optional `path` prop to `KanbanView` (EditorView passes `editorStore.activeTab.path`), and an `$effect` on `path` that clears filter, focus and editing ids; also clear the query on destroy so leaving and returning does not resurrect it.
- Lane (ticket K-D): pass `totalCount` to `KanbanLane`; while a filter is active the count reads "n of m", and a lane emptied by the filter says "No matching cards" (vs "No cards. Drag one here or add a card." when the stored lane is empty).

Keep raw-text matching. Files: `KanbanView.svelte`, `KanbanLane.svelte`, `src/lib/app/EditorView.svelte` (one prop), harness fixture (a `path` prop). Tests: `KanbanView.test.ts`; `kanban.store.test.ts` already covers `reset`.

### P145. Inline card edit: QUICK-PART (S)

Premise confirmed (`KanbanCard.svelte:180-189` `rows="1"`, no growth, the textarea is seeded from raw `item.text` `:105`, and after `commitEdit` the textarea unmounts so focus falls to `body`).

Ship:
- Auto-grow: set `style.height='auto'` then `scrollHeight` on input and on mount of the edit state. Do not rely on `field-sizing: content` alone: I could not verify its support in the Tauri WKWebView targets, so use the scrollHeight path (optionally add `field-sizing` as progressive enhancement).
- After Enter or Escape (not after blur, which would steal focus from wherever the user clicked), focus the board root. Needs a ref in `KanbanView.svelte` and an `onEditDone`-style signal from `KanbanCard.svelte`; the root already has `tabindex="-1"`.

Defer: editing only `stripCardMetadata(item.text)` and re-appending `{date}`/`{color}` on commit. That rewrites the stored card text (token order, whitespace collapse in `stripCardMetadata`, `kanban.logic.ts:752-758`) for cards the owner uses daily; it needs a round-trip fidelity design and is DEFER by the data rule.

Files: `KanbanCard.svelte`, `KanbanView.svelte`. Tests: harness; start edit with a long string, assert textarea height style grows (stub `scrollHeight`), Enter then `document.activeElement` is the board root.

### P144. List, table and archive: QUICK-PART (S)

Premise confirmed. `KanbanTableView.svelte:35` check buttons have no name, `:43` renders `displayText` as raw text (tags and `[[links]]` as typed, tags also repeated in the Tags column `:46-56`), no empty row; `KanbanListView.svelte:35-45` check button unnamed; archive rows show raw `item.text` (`KanbanView.svelte:598`); Restore sends to the first lane with no feedback (`:332-336`).

Ship:
- `aria-label` "Mark done" / "Mark open" on the check buttons in both views.
- Table: card cell renders through `KanbanCardText` (clickable wikilinks; thread `onWikilinkClick` from `KanbanView.svelte:512`, it is currently not passed) with tags removed from the text since the Tags column shows them (a small pure `stripCardTags` in `kanban.logic.ts`, display only); an empty-state row "No cards" when no lane has cards.
- Archive rows show `stripCardMetadata(item.text)` and the Restore button toasts "Restored to <first lane title>" via `svelte-sonner`.

Defer: a lane picker on Restore (design decision, and the review rules out origin-lane tracking). Files: `KanbanTableView.svelte`, `KanbanListView.svelte`, `KanbanView.svelte`, `kanban.logic.ts`. Tests: harness in table/list mode; `getByRole`-style label queries; `kanban.logic.test.ts` for `stripCardTags`.

### P186. Card anatomy: QUICK (S)

Premise confirmed (`KanbanCard.svelte:206-208` always renders the date picker row; `KanbanDatePicker.svelte:76-85` shows a 50% calendar icon when undated; `:209-213` preview is `max-h-32 overflow-y-auto`).

Ship:
- Undated card: no separate row. Render `KanbanDatePicker` inside the title line (`:200-205`, after the text) with `opacity-0 group-hover:opacity-100 focus-within:opacity-100` (the card root already has `group`, `:158`), never `display:none` so it stays Tab-reachable (owner decision of 2026-11-06 recorded in open-itens 197), and keep it visible while its popover is open. Dated cards keep the badge row unchanged.
- Preview: `line-clamp-3` instead of the 128 px scroll box.

Files: `KanbanCard.svelte`, maybe a prop-less tweak in `KanbanDatePicker.svelte`. Tests: harness; undated card has the "Set date" button but no empty row wrapper; dated card still shows the badge; preview element has the clamp class (jsdom cannot evaluate hover, so a computed-style check belongs in `e2e/specs/kanban-view.spec.ts`, optional).

## Candidate quick tickets (impact vs size, quick wins first)

Order suggested: K-C, K-A, K-E, K-D, K-B. K-A, K-B, K-D share `KanbanView.svelte` / `KanbanLane.svelte`, so they must run one after another (the owner already runs one workflow at a time).

### K-C. Kanban: renaming a lane keeps its settings (P04)
Pure logic plus one call site. Failing tests first:
1. `kanban.logic.test.ts`: board with lane "Done" and `laneSettings { Done: { autoComplete: true, maxItems: 5, collapsed: true } }`; `renameLane(..., 'Complete')` gives `isLaneAutoComplete`, `getLaneMaxItems`, `isLaneCollapsed` true/5/true for "Complete" and no "Done" key. Fails today.
2. A lane with no settings renames without gaining a `laneSettings` entry.
3. Renaming to a title another lane already has yields "<title> 2"; two lanes titled "Done" keep one shared entry when one is renamed.
4. `uniqueLaneTitle`: "New Lane", "New Lane 2", "New Lane 3" on repeated adds (harness: click Add Lane twice).
5. Serialize then `parseKanbanBoard` round-trips the settings under the new title.
6. Harness: rename through the lane title input, persisted markdown carries the settings under the new title.

### K-A. Kanban board: filter that clears, and safe keyboard shortcuts (P143 toolbar half, P03 slice, P88 slice)
`KanbanView.svelte`, `KanbanCardText.svelte`, `KanbanCard.svelte` (prop pass), `EditorView.svelte` (one prop), help page. Failing tests first:
1. Filtered board with a hidden card: ArrowDown + Backspace on the board root deletes only a visible card (hidden card still in the markdown). Fails today.
2. In list and table view, Delete/Backspace/Space on the board root change nothing; Space on a focused check button toggles it once.
3. Typing in the filter shows "Clear filter"; clicking it, or pressing Escape in the input, empties `kanbanStore.filterQuery` and restores all cards.
4. Changing the `path` prop (or unmounting) clears the filter, so another board opens unfiltered.
5. Clicking a `#design` chip sets the filter to `#design` and narrows the cards; "Tag color" in the card menu applies a colour through the existing `tagColors` setting.
6. Sorting or switching view mode clears the keyboard focus ring.

### K-B. Kanban: move cards between lanes while sorted or filtered (P02 slice)
`KanbanView.svelte`, `KanbanLane.svelte`, `KanbanCard.svelte`. Failing tests first:
1. With a sort active, the toolbar shows "Manual order paused"; with manual order and no filter it does not.
2. Card menu has "Move to" listing the other lanes; picking one moves the card to the end of that lane in the persisted markdown, checked when the target lane is auto-complete, and works while a filter hides other cards in the target lane (appended after the hidden ones).
3. A card stays `draggable` while sorted/filtered; a drop into another lane appends, a drop in its own lane changes nothing; lane grip stays hidden.
4. Manual order, no filter: existing drag behaviour unchanged.

### K-D. Kanban lanes: visible add row, empty and filtered counts, rail, new lane in view (P05 slice, P143 lane half, P06 slice)
`KanbanLane.svelte`, `KanbanView.svelte`. Rider: change the lane grip class `group-hover:opacity-60` (`KanbanLane.svelte:236`) to `group-hover/lane:opacity-60`; no unnamed `.group` ancestor exists above the lane, so the grip never appears (open-itens 214 part 2). Failing tests first:
1. An empty lane shows "No cards. Drag one here or add a card."; a filter that empties a lane shows "No matching cards".
2. The add input is rendered outside the scrolling `role="list"` and its form is not opacity-gated on hover.
3. With a filter active the count reads "n of m"; without, unchanged (including `n/max`).
4. Auto-complete check and count carry accessible names.
5. A collapsed lane is a 40 px rail with the title text and no resize handle; expanding restores the board width.
6. Add Lane scrolls the new lane into view (stubbed `scrollIntoView`).

### K-E. Kanban cards and alternate views: calmer cards, growing editor, clean list/table/archive (P186, P145 slice, P144 slice)
`KanbanCard.svelte`, `KanbanTableView.svelte`, `KanbanListView.svelte`, `KanbanView.svelte` (archive block), `kanban.logic.ts` (`stripCardTags`). Failing tests first:
1. Undated card has no empty date row yet still exposes the "Set date" button; a dated card renders its badge as before; the linked preview is line-clamped.
2. The edit textarea grows with its content (stubbed `scrollHeight`); after Enter and after Escape the board root has focus; after a blur commit focus is not moved.
3. Check buttons in list and table are named "Mark done" / "Mark open" and flip with the card state.
4. Table shows card text without the `#tag` text and with a clickable wikilink; an empty board shows a "No cards" row.
5. Archive rows show text without `{date}`/`{color}` tokens; Restore toasts "Restored to <lane>" (mock `svelte-sonner`) and the card lands in the first lane.
6. `stripCardTags` in `kanban.logic.test.ts`: keeps non-tag `#` text, collapses spaces, empty input.

## Deferred parts (with reason)

- P02: lane insertion bar and no-drop outline: depends on the lane drop index fix (open-itens 040 below), visual only.
- P03: roving tabindex, real DOM focus, shortcut hint: M, changes the focus model of every card.
- P05: "..." lane menu: M, duplicates the context menu items and its test pins.
- P06: edge fades and scrollbar, Add lane / Archive in the toolbar, archive panel, drop onto the rail: M layout and a data-bearing panel moved.
- P88: shared swatch radiogroup with check mark and `menuitemradio`: cross-feature primitive, owned by the colour and canvas slices.
- P145: hide `{date}`/`{color}` tokens while editing: rewrites stored card text on commit, owner data rule.
- P144: lane picker on Restore: needs a design decision; no origin-lane tracking exists.

## Overlaps found

- `.scratch/open-itens/issues/049` (renaming a lane keeps limit, auto-complete, collapsed): fully covered by K-C (same fix and tests). Mark wontfix with a pointer to K-C.
- `.scratch/open-itens/issues/197` (empty date row hidden until hover/focus, keyboard reachable, owner decision 2026-11-06): fully covered by the P186 part of K-E. Mark wontfix with a pointer.
- `.scratch/open-itens/issues/214` part 2 (lane grip `group-hover` vs `group/lane`): covered by the K-D rider. Part 1 (NoteRow hover) is a different slice and stays open elsewhere, so 214 is only half covered; do not mark it wontfix on this ticket alone.
- `.scratch/open-itens/issues/040` (drag-drop index bugs): NOT fixed at HEAD and not in the design review. `handleLaneDrop` (`KanbanView.svelte:439`) indexes `querySelectorAll('[data-lane-id]')`, and every card also carries `data-lane-id` (`KanbanCard.svelte:164`), so lane reorder by drag misplaces or does nothing on a board with cards; downward same-lane card moves land one slot low (`moveItem` removes then splices, indicator index counts the dragged card, `kanban.logic.ts:421-470`). This is a real daily-use bug near K-B. Recommend a separate small bug ticket (S) before the P02 lane insertion bar is ever built; not folded into the five tickets above.
- `.scratch/open-itens/issues/006` (card or lane-title edit saved into the wrong tab on keyboard tab switch): still open; K-A deliberately avoids `{#key}` on `KanbanView` and only adds a `path` prop for the filter reset. K-A's `path` prop could later be reused by the 006 fix.
- `.scratch/open-itens/issues/206` is already wontfix and points to this kanban group; its kanban empty-state half is delivered by K-D.
- `.scratch/shell-sidebars-ux/issues/12` explicitly leaves "kanban empty lanes (P02, P05, P143)" to this group: no conflict, K-D is that work. `shell-sidebars-ux/18` only extracts a roving-list util for Tasks/notes; K-A does not use it.
- Color slice: P88's swatch primitive and the card "Card color" swatches (`KanbanCard.svelte:240-250`, title-only names) belong there; do not count them twice.
- Not overlapping: finders-ux, tasks-view-ux, frontmatter-rules, claude-code-integration (no kanban files in the MVP diff), mods-host-robustness, vault-organization-v2.

## Not verified

No code was run. `field-sizing: content` support in the app's WKWebView was not checked (scrollHeight path specified instead). jsdom cannot evaluate Tailwind hover/focus-within, so reveal-on-hover behaviour (P186, K-D grip) is asserted by DOM structure in vitest; a computed-style check would be an optional Playwright case in `e2e/specs/kanban-view.spec.ts`.
