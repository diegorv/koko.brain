# Kanban inventory (src/lib/plugins/kanban)

Scope: facts only. Paths relative to repo root. Line refs are file:line.
Not runtime-verified unless marked.

## 1. Files and components

| File | Lines | Renders | UI primitives |
|---|---|---|---|
| KanbanView.svelte | 623 | Root kanban pane: toolbar (view toggle, sort select, filter input), board / list / table switch, Add Lane button, Archive panel | Plain `button`, `select`, `input`; lucide icons. No shadcn/bits-ui. |
| KanbanLane.svelte | 399 | One lane column: header (collapse, drag grip, title or rename input, count), card list, add-card form, width resize handle | shadcn `ContextMenu` (`#lib/components/ui/context-menu/index.js`, line 15) on the title; plain markup otherwise |
| KanbanCard.svelte | 264 | One card: check button, text or textarea editor, date picker, linked-file preview, drag grip; card context menu | shadcn `ContextMenu` (line 17); plain markup otherwise |
| KanbanCardText.svelte | 82 | Inline card segments: wikilink buttons, `#tag` chips, tag-color popover | bits-ui `Popover` used directly (line 4), not the shadcn wrapper; plain buttons |
| KanbanDatePicker.svelte | 146 | Date badge + remove, or "Set date" icon; calendar popover | bits-ui `Popover` and `Calendar` primitives (line 4); inline SVG chevrons (lines 106, 110, each tagged `<!-- privacy-ok -->`) despite lucide being imported |
| KanbanListView.svelte | 60 | Read-only list grouped by lane | Plain divs, `h3`, `button`; no primitives |
| KanbanTableView.svelte | 82 | Read-only native table (Lane, Card, Tags, Date, Status) | Native `table`; no primitives |
| KanbanWikilinkSuggestions.svelte | 91 | Absolute file-name suggestion list for `[[` | Plain `button`s; no bits-ui |

Non-Svelte: kanban.logic.ts, kanban.service.ts, kanban.store.svelte.ts, kanban.types.ts. No `.css` file in the folder. No kanban rules in `src/app.css` (grep for "kanban" returned nothing).

Consumer: `src/lib/app/EditorView.svelte:81` (`isKanbanTab && !kanbanSourceMode`); test harness `src/tests/fixtures/KanbanViewHarness.svelte:43`.

## 2. States

Empty / loading / error / disabled:

- Empty board (zero lanes): KanbanView renders only toolbar and "Add Lane" (KanbanView.svelte:513-574). No message or illustration.
- Initial board before parse: `board` starts as `{ lanes: [] }` (KanbanView.svelte:63); the parse runs in `$effect` (lines 69-76). First paint can show the empty-board state. Not runtime-verified.
- Empty lane (board view): no placeholder. Only the add-card form, which is `opacity-0` until hover or focus-within (KanbanLane.svelte:356).
- Empty lane (list view): "No cards" (KanbanListView.svelte:54-56).
- Empty lane (table view): no row, no message (KanbanTableView.svelte:31-79).
- Empty archive: Archive panel is not rendered at all when `archive.length === 0` (KanbanView.svelte:577).
- Filter with zero matches: no "no results" message. Lanes render empty. Lane counters show filtered counts (KanbanView.svelte:524 passes `displayLane(lane)`; KanbanLane.svelte:312 counts `lane.items`). The filter input has no clear button (KanbanView.svelte:500-505).
- Loading linked-file preview: no spinner. The preview is simply absent until the async load resolves (KanbanCard.svelte:139-151, 209-213).
- Error loading linked-file preview: `catch` logs via `error('KANBAN', ...)` and caches `''` (kanban.service.ts:85-89). Result: preview is silently absent. Missing target also returns `''` silently (service.ts:76-78).
- Empty card text: `handleAddItem` returns early on empty trimmed text (KanbanLane.svelte:112-113). Edit with empty text reverts silently (KanbanCard.svelte:95-99).
- Disabled: add-card submit is `disabled={!newItemText.trim()}` (KanbanLane.svelte:379). That is the only disabled state in the folder.
- Drag disabled silently when sort is not manual or a filter is active: `canReorder` (KanbanView.svelte:170-173, 534). Visual effect: grip hidden (KanbanLane.svelte:234; KanbanCard.svelte:217) and draggable off (KanbanCard.svelte:160-162). No tooltip or explanation.
- Lane card limit reached: no disabling. `addItem` does not check the limit (kanban.logic.ts:321-329). Only the border becomes `border-destructive/50` (KanbanLane.svelte:215) and the counter turns red (line 311).
- Error states on the board itself: none. `parseKanbanBoard` try/catch exists only for the settings JSON (kanban.logic.ts:46, 145), not for board parsing.

## 3. Interaction

Keyboard:
- Root handler `handleBoardKeydown` on the root div (KanbanView.svelte:460, 236-326). Root has `tabindex="-1"`.
- Keys: ArrowLeft/Right/Up/Down move focus (lines 248-281), Enter opens editor (282-288), Escape clears focus (289-293), Space toggles check (294-300), Delete/Backspace deletes item with no confirm (301-313), `n`/`N` focuses lane add input via `document.querySelector` + `form input` (314-324).
- Handler is attached for all three view modes. It reads `board.lanes` (line 242), not the displayed lanes. In list and table views the cards are not rendered, so focus and delete act on invisible items. Not runtime-verified.
- Early return when editing or when target is INPUT/TEXTAREA/SELECT (lines 238, 240). Therefore Escape in the filter input does not clear the filter or focus (KanbanView.svelte:500-505).
- No keyboard path for: moving cards between lanes, reordering lanes, archive, restore, sort, or lane rename. Lane rename is reachable only via the context menu "Rename" (KanbanLane.svelte:270-273) or double-click (line 263). The board keyboard handler does not handle lane titles.
- Focus after commit of card edit: `commitEdit` calls `onStopEdit` (KanbanCard.svelte:92-101) with no refocus of the card. Focus falls to body. Not runtime-verified.
- Focus after lane add: lane title input focused via store state (KanbanView.svelte:128-133; KanbanLane.svelte:157-163).
- Focus ring: `ring-2 ring-primary` on the store-focused card only (KanbanCard.svelte:158; KanbanView.svelte:527). No ring on other focused controls.

Tag color popover (KanbanCardText.svelte:33-72):
- Swatches and reset use `onmousedown` only (lines 56, 65), not `onclick`. Keyboard activation (Enter or Space fires click) does nothing. Popover has `onOpenAutoFocus` prevented (line 49), so focus does not enter it.

Mouse-only:
- Wikilink suggestion items use `onmousedown` (KanbanWikilinkSuggestions.svelte:84). Keyboard selection works through the parent's `handleKeydown` (KanbanLane.svelte:120; KanbanCard.svelte:67), not through the list itself.

Hover-only affordances:
- Lane drag grip: `opacity-0 group-hover:opacity-60` (KanbanLane.svelte:236).
- Lane resize handle: `opacity-0 ... group-hover/lane:opacity-60` (KanbanLane.svelte:391). Pointer-only, no keyboard resize.
- Add-card form: hover or focus-within (KanbanLane.svelte:356).
- Card drag grip: `opacity-0 group-hover:opacity-60` (KanbanCard.svelte:218).
- Date "Set date" icon: always visible at `text-muted-foreground/50` (KanbanDatePicker.svelte:79).
- Card color, archive, delete: only in the card context menu (KanbanCard.svelte:225-262). No visible button.
- Lane rename, auto-complete, card limit, archive completed, delete lane: only in the lane title context menu (KanbanLane.svelte:270-303). The context menu is attached to the title `h3` only, not the lane body (KanbanLane.svelte:257-268).
- Add Lane: no context menu.

Drag and drop:
- Card DnD: `draggable` on the whole card (KanbanCard.svelte:160); drop index from `getBoundingClientRect` midpoints (KanbanView.svelte:365-382, 384-410). Drop indicator is an `h-0.5 bg-primary` div (KanbanLane.svelte:325-327, 349-351). Lane highlight `border-primary/50 bg-primary/5` (KanbanLane.svelte:215).
- Lane DnD: grip-only drag (KanbanLane.svelte:235-245); drop index from midpoints (KanbanView.svelte:434-456). No insertion indicator for lanes. `isDragOver` is set only for card drags (KanbanView.svelte:367).
- Dragging a lane over a card list: `handleDragOver` in KanbanLane calls `preventDefault` for any drag (KanbanLane.svelte:165-169), then `onItemDragOver` returns early if `dragItemId` is null (KanbanView.svelte:366).
- No Escape-to-cancel for drags. No keyboard alternative.
- `handleItemDrop` sets `dropEffect` on every drag over (KanbanLane.svelte:166).

Context menus:
- Card: Edit, Archive, Card color (submenu of 7 swatches + Remove color), Delete (KanbanCard.svelte:225-262). Card color swatches are `button` with `title`, `onclick` (lines 242-248), so keyboard works.
- Lane title: Rename, Enable/Disable auto-complete, Set card limit (submenu 3/5/10/15/No limit), Archive completed (conditional), Delete lane (KanbanLane.svelte:269-304).
- Archive rows: no context menu (KanbanView.svelte:596-616).

Tooltips (`title` attribute only, no shared tooltip component in this folder):
- View toggles: "Board view", "List view", "Table view" (KanbanView.svelte:467, 474, 481).
- Archive: "Restore to first lane" (603), "Delete permanently" (611).
- Date: "Set date" (KanbanDatePicker.svelte:82).
- Color swatches: `title={color}` (KanbanCard.svelte:246; KanbanCardText.svelte:57). Shows raw token name ("blue", "gray").
- No title or tooltip on: sort select (KanbanView.svelte:488-496), filter input, lane grip, resize handle, lane collapse button, card check button, add-card submit (it has aria-label only), remove-date (aria-label only).

Confirmations:
- No confirm or undo for: card delete via keyboard (KanbanView.svelte:301-313), card delete via menu (KanbanCard.svelte:259-262), lane delete (KanbanLane.svelte:300-303), "Delete permanently" in archive (KanbanView.svelte:338-340, 607-614), "Archive completed" (KanbanLane.svelte:295-298).
- `grep confirm|Dialog` in the folder returned nothing.

Date picker:
- `onOpenAutoFocus` and `onFocusOutside` / `onInteractOutside` prevented (KanbanDatePicker.svelte:93-95). Focus does not enter the calendar on open.

## 4. Accessibility

Icon-only buttons:
- With `aria-label`: collapse lane (KanbanLane.svelte:226); add card (381); card check (KanbanCard.svelte:171); remove date (KanbanDatePicker.svelte:70); set date (aria-label + title, lines 81-82); restore item (KanbanView.svelte:602); delete archived (610).
- With `title` only: view toggles (KanbanView.svelte:467, 474, 481); card color swatches (KanbanCard.svelte:246); tag color swatches (KanbanCardText.svelte:57).
- With neither: list-view check button (KanbanListView.svelte:35-43); table-view check button (KanbanTableView.svelte:43-51); calendar prev/next SVG-only (KanbanDatePicker.svelte:105-111; bits-ui may supply a label, not verified).

Unlabeled form controls:
- Sort select, no label (KanbanView.svelte:488-496). Visible text is only the value.
- Filter input: placeholder only (KanbanView.svelte:500-505).
- Lane title rename input: no label (KanbanLane.svelte:249-255).
- Card textarea editor: no label (KanbanCard.svelte:180-189).
- Add-card input: placeholder only (KanbanLane.svelte:359-367).

Roles and landmarks:
- Board wrapper `role="region" aria-label="Kanban board"` (KanbanView.svelte:519-520). Only in board mode.
- Lane `role="group" aria-label={lane.title}` (KanbanLane.svelte:218-219).
- Card list `role="list"` (KanbanLane.svelte:322); card `role="listitem"` (KanbanCard.svelte:165). In list and table views, no list roles.
- Lane drag handle: `role="button" tabindex="-1" aria-label="Drag to reorder lane"` (KanbanLane.svelte:240-241). Not focusable, yet has button role.
- Resize handle: `role="separator" aria-label="Resize lane"` (KanbanLane.svelte:395-396) with no `aria-valuenow`, and no keyboard handler.
- Wikilink suggestion list: no `listbox` / `option` roles, no `aria-expanded` or `aria-activedescendant` on the input (KanbanWikilinkSuggestions.svelte:79-90).
- Root keyboard container: `tabindex="-1"` with `svelte-ignore a11y_no_static_element_interactions` (KanbanView.svelte:459-460).
- Table: native `table` with `th` headers (KanbanTableView.svelte:19-29). Good structure.
- List view: lane titles are `h3` with no list semantics (KanbanListView.svelte:21-24).

Clickable or draggable non-button elements:
- Lane title `h3` with `ondblclick` (KanbanLane.svelte:261-266; svelte-ignore line 260). No keyboard path except context menu.
- Card text `span` with `ondblclick` (KanbanCard.svelte:200-205; svelte-ignore 199). Keyboard path is Enter on focused card (KanbanView.svelte:282-288).
- Resize handle `div` with pointer handlers (KanbanLane.svelte:390-397; svelte-ignore 389).
- Card root `div` draggable (KanbanCard.svelte:157-163).
- Lane drag handle `div` draggable (KanbanLane.svelte:235-245).

Focus-visible:
- No `focus-visible:` or `focus:` ring rule on any button in the folder. Focus styles exist only on text inputs: `focus:border-primary` (KanbanView.svelte:501; KanbanLane.svelte:366) and `focus-within` on the add form (KanbanLane.svelte:356).
- Global base sets only outline colour: `* { @apply border-border outline-ring/50 }` (src/app.css:485-487). Whether a visible outline renders on kanban buttons depends on the preflight, not verified.

Contrast-risk classes (facts only, no ratio measured):
- `text-muted-foreground/50` on date-set icon (KanbanDatePicker.svelte:79), date-remove icon (67), placeholder (KanbanLane.svelte:366; KanbanView.svelte:501).
- `text-muted-foreground/40` for outside-month and disabled days (KanbanDatePicker.svelte:130).

## 5. Styling

Raw hex / rgb in kanban source: none (grep for `#hex` and `rgb(` in kanban `.svelte` and `.ts` returned nothing).

Inline rgb via shared palette:
- `src/lib/utils/color-presets.ts:2-10` hard-codes RGB triplets for blue, green, red, orange, purple, yellow, gray (not theme tokens). Background variant is `rgba(...,0.15)` (line 13-15, 23-25); text variant is `rgb(...)` (17-20, 28-30).
- Used via inline `style` at: KanbanCard.svelte:159, 244; KanbanCardText.svelte:38, 55, 76; KanbanListView.svelte:33; KanbanTableView.svelte:40, 60.
- Tag chips in card, list and table use the gray preset when no color is set (KanbanCardText.svelte:38, 76; KanbanTableView.svelte:60).

Inline `style` attributes (non-palette):
- Lane width: `width: {currentWidth}px` (KanbanLane.svelte:216).
- Add-lane and archive widths: KanbanView.svelte:569, 580.
- Hard-coded default lane width 272 (kanban.logic.ts:30). Lane resize clamp 200-500 (KanbanLane.svelte:180-181, 204).

Arbitrary Tailwind values:
- `min-h-[1.25rem]` (KanbanCard.svelte:187). No `text-[...]` arbitrary font sizes in the folder.
- `max-h-32` (KanbanCard.svelte:210), `max-h-48` (KanbanWikilinkSuggestions.svelte:80), `size-2.5` (KanbanDatePicker.svelte:72), `h-0.5` drop indicator (KanbanLane.svelte:326, 350), `w-1.5` resize (KanbanLane.svelte:391).

Font sizes used: `text-xs` and `text-sm` only (plus `font-semibold`, `font-medium`, `font-normal`). Several sites.

z-index: `z-50` on tag popover (KanbanCardText.svelte:46), date popover (KanbanDatePicker.svelte:90), wikilink suggestions (KanbanWikilinkSuggestions.svelte:80). Lanes and cards have no z-index.

Icon sizes in use: `size-2.5`, `size-3`, `size-3.5`, `size-4`. Lane grip `size-4` (KanbanLane.svelte:244) vs card grip `size-3.5` (KanbanCard.svelte:219). Check glyph `size-3` (KanbanCard.svelte:174) inside `size-4` box (line 168).

Radii in use: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`. The same date badge uses `rounded-sm` in the date picker (KanbanDatePicker.svelte:58) and `rounded-xs` in list and table (KanbanListView.svelte:48; KanbanTableView.svelte:69). Tag chip uses `rounded-sm` in card and table (KanbanCardText.svelte:75; KanbanTableView.svelte:59).

Shadows: `shadow-sm` on card (KanbanCard.svelte:158); `shadow-md` on popovers (KanbanCardText.svelte:46; KanbanDatePicker.svelte:90; KanbanWikilinkSuggestions.svelte:80).

Spacing: card `p-2 gap-1.5` (KanbanCard.svelte:158); lane header `px-2 py-2` (KanbanLane.svelte:222); list and table rows `px-3 py-2` (KanbanListView.svelte:32; KanbanTableView.svelte:21-29) vs table cells `px-2 py-1.5` (KanbanTableView.svelte:42-76). Pane body `p-4` (KanbanView.svelte:516, 515; ListView:18; TableView:18).

Theme tokens (CSS variables via Tailwind): `background`, `foreground`, `border`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `destructive`, `accent`, `accent-foreground`, `popover`, `ring`, `success`, `warning`, `type-blue`, `type-orange`, `divider`, `editor-bg`, and opacity modifiers `/5`, `/10`, `/15`, `/20`, `/30`, `/40`, `/50`. Token-only sites; proximity classes are defined in logic (kanban.logic.ts:712-719) as Tailwind class strings.

Transitions and animation:
- `transition-colors` (many), `transition-opacity` (KanbanLane.svelte:356, 391), `transition-all`: none. No explicit `duration-*` or `animate-*` in the folder. Tailwind defaults apply.
- No `prefers-reduced-motion` handling in the kanban folder. The only one in src is `src/lib/features/event-calendar/EventCalendarView.svelte:284`.

Duplicate or divergent visual rules:
- Date proximity badge styling is repeated in three places (KanbanDatePicker.svelte:58; KanbanListView.svelte:48; KanbanTableView.svelte:69) with different radius classes (see above).
- Circle swatch markup duplicated in KanbanCard.svelte:240-250 and KanbanCardText.svelte:52-60 with different ring logic (`cardColor` vs `tagColors[seg.value]`).
- Check-box markup duplicated in four places: KanbanCard.svelte:167-176 (`size-4`, `rounded-xs`), KanbanListView.svelte:35-43, KanbanTableView.svelte:43-51 (`size-4`, no aria), and the table uses `size-4` with `flex items-center` only.

## 6. Copy (user-visible strings)

Case and terminology:
- Button and label case is mixed: "Add Lane" (KanbanView.svelte:573, title case) vs "Add a card..." (KanbanLane.svelte:365, sentence case) vs "Filter cards..." (KanbanView.svelte:502, sentence case). Ellipsis uses three dots.
- Context menu verbs: "Remove color" (KanbanCard.svelte:254) vs "Reset to default" for tag color (KanbanCardText.svelte:68) vs "Remove date" (aria, KanbanDatePicker.svelte:70). Three different verbs for removal.
- Delete wording: "Delete" card (KanbanCard.svelte:261), "Delete lane" (KanbanLane.svelte:302), "Delete permanently" archive title (KanbanView.svelte:611), "Delete archived item" aria (610). "Delete permanently" is the only one that says permanently.
- Restore: "Restore item" aria (601), "Restore to first lane" title (603). The first lane is not named.
- "Archive completed" (KanbanLane.svelte:297) vs "Archive" card (KanbanCard.svelte:232). "Archive ({n})" section header (KanbanView.svelte:592).
- Auto-complete: "Enable auto-complete" / "Disable auto-complete" (KanbanLane.svelte:276). Hyphenated; other copy uses "Auto-complete" consistently.
- Card limit: "Set card limit" (KanbanLane.svelte:281), items "3 cards" ... "No limit", with "(current)" suffix (lines 286, 290). Count display is `n/max` (line 312).
- Sort labels (KanbanView.svelte:187-194): "Manual", "Date (oldest)", "Date (newest)", "Text (A→Z)", "Text (Z→A)", "Unchecked first". The label "Unchecked first" describes the `checked` sort mode, which is not obvious from the key name. Arrow glyph U+2192 is used, the others are ASCII.
- Table headers: "Lane", "Card", "Tags", "Date", "Status" (KanbanTableView.svelte:23-28). Status values "Done" / "Open" (line 75). Done/Open vs Checked/Unchecked in the sort label and "Check/Uncheck" aria (KanbanCard.svelte:171).
- "No cards" (KanbanListView.svelte:55) is the only empty message in the folder.
- Default content: lanes "To Do", "In Progress", "Done" (kanban.logic.ts:300-302); new lane "New Lane" (KanbanView.svelte:129); new file "Untitled.kanban" and label "New Kanban Board" (kanban.service.ts:19, 28-33). "New Lane" title case vs "New Kanban Board" title case match, but "Untitled.kanban" is file-name style.
- Date badge placeholder: "Set date" (aria and title, KanbanDatePicker.svelte:81-82); "Remove date" (aria, line 70).
- Lane resize aria "Resize lane" (KanbanLane.svelte:396) vs drag aria "Drag to reorder lane" (241). Verb-first aria labels are consistent here.
- Terminology for columns: "lane" in code and in the "Add Lane" / "Delete lane" / "Resize lane" strings, but "Board view" (KanbanView.svelte:467), "Kanban board" region label (520), and "Lane" table header (KanbanTableView.svelte:23). "Column" is not used.
- Card check aria "Check" / "Uncheck" (KanbanCard.svelte:171) vs list and table check buttons with no aria-label (KanbanListView.svelte:35-43; KanbanTableView.svelte:43-51).
- Card color names are raw tokens in title attributes: "blue", "green", "red", "orange", "purple", "yellow", "gray" (KanbanCard.svelte:246; KanbanCardText.svelte:57). Lowercase, not localized, unlike the sentence-case UI elsewhere.

## 7. Summary of most notable facts

1. Keyboard handler (KanbanView.svelte:236-326) is attached for all three view modes and reads `board.lanes`, so Delete/Space/Enter act on invisible focused cards in list and table views (not runtime-verified).
2. Delete (Backspace/Delete, KanbanView.svelte:301-313), card and lane delete, and archive "Delete permanently" have no confirmation or undo in the folder.
3. Tag color popover swatches use `onmousedown` only (KanbanCardText.svelte:56, 65), so keyboard users cannot set tag colors.
4. Hover-only affordances hide lane drag grip, card drag grip, resize handle, and add-card form (KanbanLane.svelte:236, 356, 391; KanbanCard.svelte:218); card color, archive and delete exist only in the context menu (KanbanCard.svelte:225-262).
5. Icon-only buttons with no label: list and table check buttons (KanbanListView.svelte:35-43; KanbanTableView.svelte:43-51); view toggles have `title` only (KanbanView.svelte:464-484); sort select and filter input unlabeled (KanbanView.svelte:488-505).
6. No focus-visible style on any kanban button; focus styles exist only on text inputs (KanbanView.svelte:501; KanbanLane.svelte:366).
7. Empty states missing: empty board, empty board lane, filter with no matches, and table with no rows show nothing (KanbanView.svelte:513-574; KanbanTableView.svelte:31-79). Only "No cards" in list view (KanbanListView.svelte:55).
8. Drag reorder is silently disabled under sort or filter (KanbanView.svelte:170-173, 534) and lane reorder has no insertion indicator (KanbanView.svelte:434-456; KanbanLane.svelte:215).
9. Palette colors are hard-coded RGB in `src/lib/utils/color-presets.ts:2-10` and applied as inline styles in six components. Other kanban colors use theme tokens.
10. Copy inconsistencies: "Remove color" vs "Reset to default" vs "Remove date"; "Add Lane" (title case) vs "Add a card..." (sentence case); "Delete" vs "Delete lane" vs "Delete permanently"; raw token names ("gray") in color swatch titles (KanbanCard.svelte:246).
