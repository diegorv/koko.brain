# Kokobrain design review

Scope: the whole Kokobrain UI (shell, rail, note list, editor and live preview, right sidebar, finders, kanban, canvas, collection, calendar, tasks, auto-organize, settings, theming), reviewed for the sole user: a power user who works daily in meta-bind, kanban, tables, canvas and Quick Capture, with no external sync. Read-only review. Screenshots were captured at 1440x900 with Tauri mocked (see [screens/MANIFEST.md](screens/MANIFEST.md)). Light = Lavender Haze, dark = KokoBrain Default. Each proposal was validated against the code. The validation note gives the verdict (keep or revise) and what changed.

Effort: S = under a day, M = a few days, L = a week or more.

## 1. Summary

1. **Kanban, a daily surface, can lose data silently.** Card, lane and archive deletes have no confirm and no undo. The board key handler runs in list and table modes and acts on hidden cards. A lane rename drops that lane's settings. Cards cannot change lanes while a sort or filter is on. (P01, P02, P03, P04, P05)
2. **Failures and successes are hard to see.** Toasts ignore the theme and vanish after 4 s. Search errors read as "No results". A corrupt canvas or rules file is overwritten by the next edit. Quick Capture success is invisible. (P07, P08, P14, P16, P17, P59, P77)
3. **The editor lacks the authoring basics a table and task user expects.** Tables cannot be edited as tables, there is no Cmd+B/I/K, custom task statuses show as raw `[/]`, frontmatter renders as a huge heading in source mode, and result tables break words. (P09, P10, P11, P41, P42)
4. **Navigation and chrome do not scale.** There is no back/forward history, the tab strip gives no overflow cue, the note-list header loses "+" when narrow, note actions are split across five surfaces, and every view builds its own header. (P18, P33, P34, P35, P39)
5. **Colour and contrast are checked on flat surfaces only.** Canvas colours are dark-only. Control edges, error text, selected-row text and the 50% focus ring fall below WCAG in at least one built-in theme. (P12, P19, P23, P25, P26, P27)

## 2. Opportunities

### 2.1 Clear

#### P01. Destructive actions follow four policies; kanban, rules, themes and properties delete with no confirm or undo
- **Problem:** Kanban card, lane and archive deletes, user theme deletes, rule deletes and property removal happen at once with no undo, several from hover-only buttons. Destructive mod dialogs focus the destructive button, so Enter confirms. Undo toasts last 4 s.
- **Evidence:** KanbanView.svelte:106-108, 122-124, 338-340; AutoOrganizeRuleRow.svelte:316-323 via AutoOrganizeSection.svelte:67-70; AppearanceSection.svelte:92-103, 190; PropertyField.svelte:159; ModDialogHost.svelte:74-79, 132-139; AppOverlays.svelte:16 (no duration, sonner default 4000 ms).
- **Proposal:** (a) Kanban keeps one previous-board snapshot. Card, lane and archived-item deletes and "Archive completed" show an Undo toast. Deleting a lane that still has cards asks first ('Delete lane "X" and its N cards?', Cancel focused). (b) Rule delete and user theme delete show an Undo toast that puts the item back at its old index. (c) ModDialogHost focuses Cancel when the dialog is destructive. (d) Undo toasts last about 8 s. Two open questions for the owner, not changes: whether File History restore still needs its confirm, and whether Trash should keep the native confirm.
- **Impact:** A stray click no longer deletes a lane, rule or theme for good. **Effort:** M
- **Validation:** revise. The core claims hold. Dropped: Tasks Clear/Hide only change the view query, so they are not destructive (TasksView.svelte:343-364). The Trash confirm is deliberate (delete-note.service.ts:7-14).

#### P03. The kanban key handler hijacks native keys and acts on hidden or wrong cards
- **Problem:** One root handler runs in board, list and table modes. It reads the unfiltered `board.lanes` and skips only INPUT, TEXTAREA and SELECT. With a filter on, the focus ring and Backspace target a hidden card. In list and table modes, arrow keys move an invisible focus and Delete then removes a card the user cannot see. Space on a focused button toggles the virtual card.
- **Evidence:** KanbanView.svelte:236-326, 240, 242, 460, 527, 532; KanbanCard.svelte:157-165; kanban.store.svelte.ts:11-17.
- **Proposal:** Use real DOM focus with a roving tabindex, and run shortcuts only when the event target is the card. Limit the handler to board mode, compute indexes from the visible lanes, reset focus when the mode or filter changes, and add a focus-visible ring and a shortcut hint.
- **Impact:** The keyboard can no longer delete or toggle the wrong card. Kanban has no undo, so today this is silent data loss. **Effort:** M
- **Validation:** keep.

#### P02. Kanban cards cannot move between lanes while a sort or filter is active
- **Problem:** `canReorder` protects in-lane indexes, but it also turns off cross-lane drag, which needs no index. Nothing explains this. The card menu has no "Move to" and lane reordering has no insertion bar.
- **Evidence:** KanbanView.svelte:173, 534; KanbanCard.svelte:160-162, 240-264; KanbanLane.svelte:229, 325-327; handleLaneDrop KanbanView.svelte:434-456.
- **Proposal:** Keep card drag on in every state. When manual order is off, a drop into another lane appends the card and a drop in the same lane does nothing. Show a "Manual order paused (sorted/filtered)" chip next to the sort control. Add a "Move to" submenu listing the other lanes, and a vertical insertion bar for lane drags.
- **Impact:** The core kanban action works for anyone who sorts or filters. **Effort:** M
- **Validation:** revise. Escape already cancels native HTML5 drags (KanbanView.svelte:349-362). Card drops already show a bar.

#### P05. The kanban add-card input and lane and card actions appear only on hover or right-click
- **Problem:** The add-card form sits at opacity 0 inside the scroll area, so it scrolls out of view in long lanes. Empty lanes show nothing. Lane actions exist only in a context menu on the title, and header indicators have no labels.
- **Evidence:** KanbanLane.svelte:257-304, 306-308, 316-384; KanbanCard.svelte:225-262; [kanban-board-light.png](screens/kanban-board-light.png).
- **Proposal:** Pin a "+ Add card" ghost row below each lane's scroll area. Empty lanes say "No cards. Drag one here or add a card." Add a "..." lane menu that shows on hover and focus, and tooltips on the indicators.
- **Impact:** The most frequent kanban action is always visible. **Effort:** M
- **Validation:** keep.

#### P04. Renaming a kanban lane silently resets its settings, and new lanes share one settings entry
- **Problem:** Lane settings are keyed by title. A rename drops auto-complete, the card limit and the collapsed state. Every new lane is titled "New Lane".
- **Evidence:** kanban.logic.ts:492-499, 595-659; KanbanView.svelte:128-133. Lane ids are regenerated on every parse (kanban.logic.ts:33, 218, 234).
- **Proposal:** `renameLane` moves `laneSettings[oldTitle]` to the new title, and refuses or suffixes a title already in use. New lanes get unique titles ("New Lane 2", ...). Do not plan an id-keyed migration, because lane ids are not persisted.
- **Impact:** A configured Done lane keeps auto-completing after a rename. **Effort:** S
- **Validation:** revise. Dropped the "key by lane id" follow-up.

#### P10. Tables in the editor cannot be edited as tables
- **Problem:** Raw mode shows unaligned pipes, and Tab does not move to the next cell. The rendered "+row" handle is 6 px and shows only on hover. Both add buttons carry only a title.
- **Evidence:** editor-extensions.ts:14, 165 (only indentWithTab); styles.ts:411-433, 443-449; widgets.ts:468-491; [editor-live-preview-scrolled-light.png](screens/editor-live-preview-scrolled-light.png).
- **Proposal:** In raw mode, Tab and Shift+Tab move between cells, Tab in the last cell adds a row, and pipes align on Tab or when the cursor leaves the table. In rendered mode, add an edge add-handle of at least 20 px (shown on hover and focus) and a cell menu for delete and align.
- **Impact:** No more manual pipe typing for a daily table user. **Effort:** L
- **Validation:** keep.

#### P42. The editor has no formatting or insert commands: no Cmd+B, I or K, and a clipboard-only context menu
- **Problem:** There are no format shortcuts, and the context menu has only clipboard and block-link items. Read from code; the app was not run.
- **Evidence:** setup/editor-extensions.ts (keymap block); MarkdownEditor.svelte:734-758. Cmd+B is bound globally to the right-sidebar toggle (global-keybindings.ts:142-147).
- **Proposal:** Add Cmd+B, Cmd+I and Cmd+K plus palette commands, and Format and Insert groups in the context menu with `formatShortcut` labels. The editor-scoped Cmd+B must win while the editor has focus, or the sidebar toggle moves.
- **Impact:** Less syntax friction, and the widgets become discoverable. **Effort:** M
- **Validation:** keep.

#### P41. Custom task statuses show as raw [/] text, while the Tasks view has seven statuses
- **Problem:** Only `[ ]` and `[x]` are decorated, so `[/]` renders as a bullet plus literal text.
- **Evidence:** simple-widget-handlers.ts:20-30; widgets.ts:28-57; task-status.logic.ts:7, 45-53; highlight-styles.ts:87; [editor-live-preview-scrolled-light.png](screens/editor-live-preview-scrolled-light.png).
- **Proposal:** Render each status as a glyph widget in the Tasks view's tone. A click toggles todo and done, and a right-click opens a status menu.
- **Impact:** Tasks look the same in the note and in the Tasks tab. **Effort:** M
- **Validation:** keep.

#### P11. Frontmatter renders as a giant heading in source mode and on canvas note cards
- **Problem:** The closing `---` turns the YAML into a Setext H2 in source mode. Canvas note cards render the raw file, so every typed note card shows "_type: Meeting" as a heading.
- **Evidence:** highlight-styles.ts:60-67, 86-88; editor-extensions.ts:99-107; FileNode.svelte:82-83; embed-resolver.logic.ts:53-54; [editor-source-mode-light.png](screens/editor-source-mode-light.png), [canvas-view-light.png](screens/canvas-view-light.png).
- **Proposal:** In source mode, decorate the frontmatter range at body size in the meta colour, with keys styled apart from values. Canvas cards strip frontmatter through a logic-layer wrapper around `stripFrontmatter`.
- **Impact:** Source mode becomes usable, and canvas note cards become readable. **Effort:** S
- **Validation:** keep.

#### P09. Result tables in notes break words mid-word and cannot scroll (collection and QueryJS)
- **Problem:** The widget tables inherit `overflow-wrap: anywhere` and have no overflow container, so words and dates split across lines. The QueryJS Run and Prev/Next buttons have no focus-visible style.
- **Evidence:** styles.ts:593-607, 917-933, 954-975, 984-996; [collection-and-queryjs-block-light.png](screens/collection-and-queryjs-block-light.png).
- **Proposal:** Set `overflow-wrap: normal; word-break: normal` on both result tables. Header, date and number cells get `nowrap`. Text cells get a max-width, ellipsis and a title. Wrap each table in an `overflow-x: auto` container, and add a `:focus-visible` ring to the buttons. Leave `file.folder` absolute.
- **Impact:** Dashboard notes become legible without changing any query. **Effort:** S
- **Validation:** revise. The absolute path is the user's script output, and `file.folder` is absolute by API design (queryjs.logic.ts:206).

#### P82. QueryJS table Prev/Next probably destroy the widget on mouse click (unverified lead)
- **Problem:** Prev/Next do not stop mousedown (live-preview rule 11), so the widget is probably revealed and destroyed before the click fires. The tests use `.click()` and cannot catch it. Not reproduced at runtime.
- **Evidence:** kb-ui.ts:505-545; queryjs-block-widget.ts:177-179, 211-217, 326-329; docs/agents/live-preview-rules.md rule 11; kb-ui.test.ts:789-792.
- **Proposal:** Verify in the app first. If paging fails, stop mousedown propagation and add a mousedown-based test.
- **Impact:** Pagination works on dashboards. **Effort:** S
- **Validation:** keep. The Run buttons in the same widget already carry this fix.

#### P39. Note actions are split across five surfaces, and Inbox triage means opening every note
- **Problem:** Mark organized and Archive exist only for the active note. The row menu has no Archive, Organized, Move or History, and the tab menu has only Pin and Close. The same action is called both "Delete this note" and "Move to Trash".
- **Evidence:** NoteActionBar.svelte:30-32, 146-219; NoteRowMenu.svelte:221-287; EditorTabs.svelte:98-109; commands.ts:405-415; delete-note.service.ts:14-18; [note-row-context-menu-light.png](screens/note-row-context-menu-light.png), [rail-inbox-light.png](screens/rail-inbox-light.png).
- **Proposal:** Build one note-actions list with the same labels and order in the row menu, the More menu, the tab menu and the palette. The tab menu adds Close others and Close to the right. Inbox rows get an inline organized check.
- **Impact:** Inbox triage of Quick Capture notes takes one action per row. **Effort:** M
- **Validation:** keep.

#### P45. Untyped notes cannot get a type from the panel, and new properties are always text
- **Problem:** The type row renders only when `_type` exists. `addProperty` hard-codes text, and the row icon is not a control.
- **Evidence:** PropertiesView.svelte:91, 165; core/frontmatter/properties.logic.ts:703-705; PropertyField.svelte:110.
- **Proposal:** Always show the type row, with a "Set type" placeholder. The row icon opens a type menu, and Add property asks for a key and a type.
- **Impact:** Typing Inbox captures no longer needs source mode. **Effort:** M
- **Validation:** keep.

#### P43. Properties is a tall static section that pushes TOC and Backlinks below the fold, with empty Relationships chrome
- **Problem:** Properties cannot collapse, and the empty Relationships block takes about 100 px on every note. Section headers scroll out of reach.
- **Evidence:** PropertiesView.svelte:153, 156, 243-290; SidebarSection.svelte:31, 56-72; AppShell.svelte:277-292; [editor-live-preview-light.png](screens/editor-live-preview-light.png), [right-sidebar-all-expanded-light.png](screens/right-sidebar-all-expanded-light.png).
- **Proposal:** Make Properties collapsible, remember the state, and make section headers sticky. Replace the empty groups with one "Add relationship" row, and render a group only when it has links.
- **Impact:** Saves about 100 px per note and keeps Backlinks reachable. **Effort:** M
- **Validation:** keep.

#### P35. There is no navigation history: every open adds a tab, and there is no Back
- **Problem:** Every open focuses or appends a tab, and there is no back or forward. "Open in new tab" calls the same function as a plain click.
- **Evidence:** editor.service.ts:148-198; NoteRow.svelte:71; NoteRowMenu "Open in new tab". CodeMirror binds Mod-[ and Mod-] to indent (setup/editor-extensions.ts), and Cmd+Shift+[ / ] switch tabs (global-keybindings.ts:86-99).
- **Proposal:** Give each tab its own back/forward history, bound to Cmd+Opt+Left/Right (Obsidian's default) and mouse buttons 4 and 5. Owner decision: should a plain click replace the active unpinned tab (with Cmd+click, middle-click and the menu item opening a new one)? Until then, make "Open in new tab" really open a second tab, or rename it "Open".
- **Impact:** Following links becomes reversible, and tabs stop sprawling. **Effort:** L
- **Validation:** revise. Moved the keys off Cmd+[ / ], and made tab replacement an owner decision.

#### P34. The tab strip has no overflow cue or control, fixed 160 px titles, and no reorder
- **Problem:** The macOS overlay scrollbar is invisible at rest, so there is no cue, no list of tabs and no wheel mapping. Tabs never shrink, cannot be reordered and have no tooltips. Pinned tabs show only an icon.
- **Evidence:** EditorTabs.svelte:36-41, 45, 52, 84-85, 98-109; [tabs-bar-several-light.png](screens/tabs-bar-several-light.png).
- **Proposal:** Tabs flex from about 220 px down to about 100 px. Map the wheel to horizontal scroll, add edge fades and a list-all-tabs menu with dirty dots, support drag-to-reorder with a marker, and give every tab a full-path tooltip.
- **Impact:** Multi-tab work keeps its context. **Effort:** M
- **Validation:** keep. The active tab already scrolls into view.

#### P33. The note-list header loses New note and Daily note at narrow widths
- **Problem:** Up to eight `shrink-0` controls share a clipped 40 px band, and "+" is the first to disappear. The sort, properties and archive icons are ambiguous.
- **Evidence:** RailNoteList.svelte:714-820; RailSortMenu.svelte:119-125; RailPropertiesPicker.svelte:105-113; RailArchivedMenu.svelte:38-42; [narrow-1024x700-editor-light.png](screens/narrow-1024x700-editor-light.png), [narrow-1024x700-today-light.png](screens/narrow-1024x700-today-light.png).
- **Proposal:** Fold Sort, Properties and Archive into one Display popover. Keep Search, Filter and "+" pinned, with an overflow menu below about 220 px. Prototype it at 150, 225 and 320 px.
- **Impact:** Creating a note from a list works at any width. **Effort:** M
- **Validation:** keep.

#### P57. The quick switcher cannot create a note when any fuzzy match exists
- **Problem:** Create appears only when there are no results. It writes to the vault root and fails with a generic toast.
- **Evidence:** QuickSwitcher.svelte:40-60, 72-106; file-entries.logic.ts:51-56.
- **Proposal:** Always add a Create row, bound to Shift+Enter, that shows the target folder. Include the cause when creation fails.
- **Impact:** Removes a trap in the fastest way to create a note. **Effort:** S
- **Validation:** keep.

#### P55. Command dialogs are vertically centred, so the input jumps while typing
- **Problem:** A centred dialog moves its input whenever the number of results changes.
- **Evidence:** dialog-content.svelte:30; command-dialog.svelte:33; [command-palette-light.png](screens/command-palette-light.png), [quick-switcher-light.png](screens/quick-switcher-light.png).
- **Proposal:** Anchor command dialogs at about 18vh. Ordinary dialogs stay centred.
- **Impact:** Cmd+P and Cmd+O feel stable. **Effort:** S
- **Validation:** keep.

#### P56. The command list shows only 4.5 rows
- **Problem:** The list is capped at 300 px, and each row is 62 px tall with two lines.
- **Evidence:** command-list.svelte:15; command-dialog.svelte:33; CommandPalette.svelte:56-60; [command-palette-light.png](screens/command-palette-light.png).
- **Proposal:** Cap the list at `min(60vh, 480px)` and use single-line rows with the category right-aligned.
- **Impact:** About ten commands visible at once. **Effort:** S
- **Validation:** keep.

#### P12. Canvas colours are dark-only: edges, grid, minimap and overlays vanish or turn heavy in light themes
- **Problem:** The xyflow variables and the overlay chrome hard-code white or black alpha. Node tints append a hex alpha suffix. In light themes, edges and the grid are barely visible and the minimap is a dark slab.
- **Evidence:** CanvasInner.svelte:743-775, 792, 796; CanvasContextMenu.svelte:181-211; CanvasFilePicker.svelte:91, 103, 134; CanvasLinkInput.svelte:91, 108-109; LinkNode.svelte:199-200; ColorPicker.svelte:69; canvas.logic.ts:149-151; TextNode.svelte:57; GroupNode.svelte:18-33; [canvas-view-light.png](screens/canvas-view-light.png).
- **Proposal:** Derive the canvas colours from theme tokens with `color-mix`, use `color-mix` for node tints, and use a light minimap mask in light themes. Check both built-in themes.
- **Impact:** Connections become legible in the light theme. **Effort:** M
- **Validation:** keep.

#### P13. Canvas groups and edges cannot be labelled from the UI
- **Problem:** Groups are created with an empty label. "Edit label" and its props are never wired, so edge labels need JSON. Group labels are tiny muted text.
- **Evidence:** GroupNode.svelte:21-23, 36-44; CanvasInner.svelte:548-553, 635-686, 653-655; CanvasContextMenu.svelte:127-136, 150-154; help/documentation/11-canvas.md.
- **Proposal:** Double-click a group or edge label to edit it inline, add Rename to the group menu and wire "Edit label", show a 13 px header chip on groups, and wire or remove the dead props.
- **Impact:** Named groups and labelled arrows without JSON. **Effort:** M
- **Validation:** keep.

#### P17. Toasts ignore the theme, and error toasts vanish after 4 seconds
- **Problem:** `richColors` bypasses the theme tokens. The 103 `toast.error` calls use the 4000 ms default with no close button and no copy action.
- **Evidence:** src/lib/app/AppOverlays.svelte:16; svelte-sonner Toast.svelte:3; settings.service.ts:210; sync-scheduler.service.ts:261, 275; [settings-appearance-dark.png](screens/settings-appearance-dark.png) (red on dark red).
- **Proposal:** Drop `richColors`. Style the Toaster through its CSS variables, using the popover tokens plus a severity accent (left bar or icon). A small toast helper sets the defaults: errors stay until closed (or about 10 s) with a close button, and info and success keep 4 s. Add "Copy details" to errors that carry a message.
- **Impact:** Every message is readable, themed and recoverable. **Effort:** M
- **Validation:** revise. Sonner already pauses on hover, and Tasks already has an Undo toast (tasks.service.ts:431-437), so neither is new work.

#### P48. Clicking a collection header silently stacks multi-column sorts
- **Problem:** A second click on another column appends a sort and writes it to the `.view` file. No rank is shown and there is no `aria-sort`.
- **Evidence:** CollectionView.svelte:397-409; CollectionTableView.svelte:27-31, 44-48.
- **Proposal:** A click sets a single sort that cycles ASC, DESC, off. Shift+click adds a secondary sort. Show a rank number, and set `aria-sort` on the th.
- **Impact:** Sorting behaves the way spreadsheet users expect. **Effort:** S
- **Validation:** keep.

#### P72. Relationship backlinks are hidden when a note has no linked mentions
- **Problem:** The empty state checks only linked mentions, and the relationship groups render inside the non-empty branch.
- **Evidence:** BacklinksPanel.svelte:30, 61-62, 80-102.
- **Proposal:** Show the empty state only when both lists are empty, and render each group on its own.
- **Impact:** Fixes a misleading state in the typed-relationship workflow. **Effort:** S
- **Validation:** keep.

#### P64. Month cells clip the "+N more" button on busy days
- **Problem:** Three chips plus the footer need about 142 px, and the cell is about 125 px tall.
- **Evidence:** EventMonthGrid.svelte:92, 122-152; event-calendar-view.logic.ts:43; event-calendar-dates.logic.ts:167-169; [calendar-month-light.png](screens/calendar-month-light.png).
- **Proposal:** Compute the number of chip slots from the cell height and reserve the footer, or move "+N" into the day row. Optionally render months with 5 rows when they fit.
- **Impact:** Busy days stop looking broken. **Effort:** M
- **Validation:** keep.

### 2.2 Moderate

#### P07. A corrupt or half-edited canvas JSON shows as an empty board, and the next edit overwrites the file
- **Problem:** `parseCanvas` swallows the parse error and returns an empty canvas. The first add, move or delete then saves over the broken text.
- **Evidence:** canvas.logic.ts:36-49; CanvasInner.svelte:99-132, 603-609; EditorView.svelte:109-118 (source toggle, a realistic trigger).
- **Proposal:** Track a parse-error state. Show a banner, "This canvas file is not valid JSON", with "Open source mode", hide the add hint, and refuse to save until the file parses.
- **Impact:** Prevents silent data loss on hand-edited canvases. **Effort:** M
- **Validation:** keep. Lowered to moderate because it needs a malformed file.

#### P08. An unreadable auto-organize config is reset and then overwritten, and save failures are silent
- **Problem:** On a parse failure the loader resets to the defaults, and the next edit saves that empty config over the file. Save errors reach only the log.
- **Evidence:** auto-organize.service.ts:113-136, 186-200; AutoOrganizeSection.svelte:32-39, 156-158.
- **Proposal:** On a parse failure, set `loadError` and keep the rules as they are. Show an inline banner, "Rules file is not valid JSON", with "Reveal file" and "Retry", and block `saveConfig` while it shows. A failed save shows `toast.error('Could not save auto-organize rules')`.
- **Impact:** Protects the owner's rule set from silent loss. **Effort:** M
- **Validation:** revise. Dropped the .bak copy, the Saved tick and the skeleton.

#### P143. The kanban filter has no clear button, gives no empty feedback, and leaks across boards
- **Problem:** There is no X and Escape does nothing. Lane counts show filtered numbers, and the query follows the user to the next board, where cards look gone.
- **Evidence:** kanban.store.svelte.ts:9, 19, 29; KanbanView.svelte:180-185, 500-505; KanbanLane.svelte:312; kanban.logic.ts:913-921 (raw-text matching by design).
- **Proposal:** Add an X button (RailListSearch pattern) and Escape to clear. Clear the query when another board loads, or key it by board path. While filtering, lane counts read "n of m" and emptied lanes say "No matching cards". Keep raw-text matching.
- **Impact:** Ends "cards vanished" moments. **Effort:** S
- **Validation:** revise. Kept raw-token matching, which allows filtering by #tag and date.

#### P145. Inline kanban card editing is one fixed row and exposes metadata tokens
- **Problem:** The textarea is `rows=1` with no auto-grow, the `{date}` and `{color}` tokens are editable, and focus is lost after an edit, so arrow keys stop working.
- **Evidence:** KanbanCard.svelte:92-108, 180-189; kanban.logic.ts:752-758; KanbanView.svelte:236-240, 460.
- **Proposal:** Auto-grow the textarea (`field-sizing: content` with a scrollHeight fallback). Edit only `stripCardMetadata(item.text)` and re-append date and colour on commit. After commit or Escape, focus the board container.
- **Impact:** Safer long-card edits. **Effort:** S
- **Validation:** revise. Focus goes back to the board container, because cards are not focusable.

#### P06. Wide kanban boards hide lanes, Add lane and Archive, and collapsing a lane frees no space
- **Problem:** At 1440 px three lanes fit and the fourth is cut off with no fade or visible scrollbar. Add lane and Archive come after the last lane. A collapsed lane keeps its full width.
- **Evidence:** KanbanView.svelte:516, 534-540, 567-620; KanbanLane.svelte:215-217, 316; [kanban-board-light.png](screens/kanban-board-light.png), [kanban-board-dark.png](screens/kanban-board-dark.png).
- **Proposal:** Add edge fades and a visible scrollbar. Move "Add lane" and "Archive (n)" into the toolbar. A collapsed lane becomes a 40 px vertical rail that still accepts drops. Scroll a new lane into view.
- **Impact:** Boards with 4 or more lanes become navigable. **Effort:** M
- **Validation:** keep. Lowered from clear: trackpad scrolling works, so this is friction, not a blocker.

#### P133. New canvas cards are not ready to type into and stack on each other
- **Problem:** A new card is neither selected nor in edit mode. Toolbar adds all use the viewport centre, and menu adds place cards inconsistently.
- **Evidence:** CanvasInner.svelte:474-545, 644-654; TextNode.svelte:20-25, 76.
- **Proposal:** New text cards start selected and in edit mode. Menu adds use the click position, and repeated adds cascade.
- **Impact:** Saves a double-click on every card. **Effort:** S
- **Validation:** keep.

#### P134. A single click on a canvas file or link header navigates away
- **Problem:** The header is where users grab the card, yet a click there opens the file. The open icon shows only on hover, and URL failures are silent.
- **Evidence:** FileNode.svelte:55-57, 66-70, 134-142; LinkNode.svelte:80-88, 97; help/documentation/11-canvas.md:85.
- **Proposal:** A plain click selects the card. Cmd+click, or an open icon that is always visible, opens it. Double-click stays "edit" on link cards. Show a toast when `openUrl` fails or `isSafeUrl` rejects the URL. Update the help doc.
- **Impact:** No accidental navigation away from a canvas. **Effort:** S
- **Validation:** revise. Double-click cannot mean "open", because it already means edit on link cards.

#### P135. Canvas text cards are hard to enter and cramped once editing
- **Problem:** Editing needs a double-click. The textarea is 40 px tall, has its own resizer, and has no outline.
- **Evidence:** TextNode.svelte:59, 62-77, 112-125.
- **Proposal:** Enter or F2 on a selected card starts editing. The textarea fills the card (height 100%, `resize: none`) and shows a focus ring while editing.
- **Impact:** Faster card writing. Ships well with P133. **Effort:** M
- **Validation:** revise. Dropped the one-time hint, because the empty card already says "Double-click to edit".

#### P141. Collection columns cannot be reordered
- **Problem:** The panel has checkboxes only, so the persisted column order cannot be edited.
- **Evidence:** PropertiesPanel.svelte:77-105; toolbar/properties.logic.ts:47-72; CollectionView.svelte:392-395.
- **Proposal:** Add drag handles, with visible columns listed first.
- **Impact:** Tables read in the owner's order. **Effort:** M
- **Validation:** keep.

#### P142. Collection tables have no sticky header or cell truncation
- **Problem:** The header scrolls away in long tables, and `nowrap` cells grow without limit.
- **Evidence:** CollectionTableView.svelte:20, 39-61.
- **Proposal:** Make the thead sticky, either by bounding the wrapper's height or by letting the page scroller own vertical scroll. Cap text cells with `truncate` and a title.
- **Impact:** Long tables stay readable. **Effort:** S
- **Validation:** revise. Added the caveat that sticky positioning resolves against the nearest scroller.

#### P121. A narrow right sidebar truncates property names to one letter
- **Problem:** The key, the value and a reserved remove button squeeze each other.
- **Evidence:** PropertyField.svelte:108-164; PropertiesView.svelte:203 (spacer that aligns with the remove slot); AppShell.svelte:271; [narrow-1024x700-editor-light.png](screens/narrow-1024x700-editor-light.png).
- **Proposal:** Below about 220 px, stack the key over the value with a container query. Take the remove button (and the matching spacer) out of the flow.
- **Impact:** Meta-bind values stay readable on a laptop. **Effort:** M
- **Validation:** keep.

#### P44. A refused property key rename or add fails silently, and the key field shows text that was never saved
- **Problem:** The key input is uncontrolled and ignores the rename result, so a duplicate or blank key is refused without a word and the field keeps the unsaved text.
- **Evidence:** PropertyField.svelte:29-33, 52-58, 113-119; PropertiesView.svelte:129-131, 144-152; properties.service.ts:159-172.
- **Proposal:** On a refused rename, restore `property.key` (with a refusal counter, as the value field does) and show an inline message with `aria-invalid`. Enter commits and Escape reverts. The add input shows the same duplicate message.
- **Impact:** A refused edit is no longer mistaken for a saved one. **Effort:** S
- **Validation:** revise. The add input already handles Enter and Escape.

#### P46. The relationship picker cannot be used from the keyboard
- **Problem:** Only Escape works. Rows select on mousedown, there are no arrow keys or Enter, and `trapFocus` is false.
- **Evidence:** RelationshipSearch.svelte:25, 33-38, 53, 63-90; file-entries.logic.ts:36-46.
- **Proposal:** Follow the Quick Switcher: an active row, Up/Down, Enter, and `aria-activedescendant`. Pass the recent files so an empty query lists recents first.
- **Impact:** Linking works from the keyboard. **Effort:** S
- **Validation:** revise. An empty query already lists 20 files, alphabetically.

#### P74. Sidebar link rows truncate the identifying text and show raw markdown snippets
- **Problem:** Path, alias and heading share one truncated line. Snippets are raw markdown and can cut off the link itself.
- **Evidence:** OutgoingLinksPanel.svelte:65-71; LinkItem.svelte:25, 27; [right-sidebar-crop-light.png](screens/right-sidebar-crop-light.png), [right-sidebar-all-expanded-light.png](screens/right-sidebar-all-expanded-light.png).
- **Proposal:** Two-line rows: the title, then the folder or target and the heading in muted text, plus a path tooltip. Strip markdown from snippets and window them around the link with `line-clamp-2`, sharing the stripper with P158.
- **Impact:** The right note can be identified without opening it. **Effort:** M
- **Validation:** keep.

#### P71. The Backlinks and Outgoing panels collapse on every note switch, with no counts
- **Problem:** Both panels reset to collapsed on every path change.
- **Evidence:** BacklinksPanel.svelte:33-39; OutgoingLinksPanel.svelte:29-35; commit 77c8cbcda (on-demand panels).
- **Proposal:** Keep the open or closed state across switches. While a panel is open, refetch for the new note. While it is closed, fetch nothing.
- **Impact:** Saves two clicks per navigation. **Effort:** M
- **Validation:** revise. Dropped the count badge, because it would bring back the eager fetch that 77c8cbcda removed.

#### P18. Every view builds its own header, and kanban, canvas and .view tabs lack note chrome
- **Problem:** The top band is copied into 10 places. Kanban, Collection and Canvas have no title. The source toggle sits in a different corner for each file type, and Cmd+\ flips only the markdown flag. The canvas toolbar uses a magic offset.
- **Evidence:** EditorView.svelte:31-35, 97-149; editor.service.ts:437-439; CanvasToolbar.svelte:45-46; KanbanView.svelte:462; app.css:151-153 (`pane-toolbar`); NoteRowMenu.svelte:255-266.
- **Proposal:** (1) Add a `pane-band` utility for the 10 copies. (2) Kanban, canvas and collection tabs get a slim header in the existing `pane-toolbar` row with the title, view controls and source toggle, which replaces the floating toggles and the canvas offset. (3) Cmd+\ toggles the active tab's own source mode.
- **Impact:** The daily tabs get one header height, one title style and one place for each action. **Effort:** L
- **Validation:** revise. Favorite and pin stay off non-markdown files, because they write frontmatter.

#### P21. Toolbar controls come in three icon sizes, seven search-field recipes and four dropdown kinds
- **Problem:** Controls in the h-10 band range from 20 to 32 px, with four different active states. Search fields differ in every dimension. Kanban and Graph use native selects, and the kanban sort shows only "Manual".
- **Evidence:** KanbanView.svelte:464-505; GraphControls.svelte:28-60, 100, 113; TagsView.svelte:59-75; NoteActionBar.svelte:115-116; RailNoteList.svelte:774-820; SearchPanel.svelte:154-161; RailListSearch.svelte:86-90; TasksView.svelte:915-922; CollectionView.svelte:535, 595-670.
- **Proposal:** Add a `components/ui/toolbar` kit. ToolbarButton is 28 px with a 16 px icon and a required label. ToolbarSearch is h-7 with the icon inside, a clear button and a focus ring. ToolbarMenuTrigger reads "Label: value" with a chevron and opens a DropdownMenu radio group. Migrate kanban first, together with P18.
- **Impact:** Size, hit area and focus behaviour stop changing from view to view. **Effort:** M
- **Validation:** keep. Lowered to moderate.

#### P16. Errors go to the wrong channel, to both channels, or nowhere
- **Problem:** A search error reads as no results. A failed Labs start leaves the switch on. `initLogSession` has no catch, and a File History restore failure is an unhandled rejection.
- **Evidence:** search.service.ts:268-269; SearchPanel.svelte:119; LabsSection.svelte:26-30; FileHistoryDialog.svelte:50; file-history.service.ts:101-104; TroubleshootingSection.svelte:44-46, 149-151.
- **Proposal:** Fix these four. (1) `searchStore` gets an error state, and SearchPanel shows "Search failed: <message>" with Retry. (2) A Labs start failure shows a toast and turns the switch back off. (3) `handleRestore` catches and shows a toast. (4) `initLogSession` gets a catch that shows a toast and reverts the switch. Record the principle for new code: on-screen failures inline with Retry, background failures as a toast, a switch reverts on failure. No sweep of existing calls.
- **Impact:** Ends silent failures for a user with no support channel. **Effort:** M
- **Validation:** revise. The tag and font cases are low impact, and Trash prints string errors, not raw objects.

#### P59. Search failures, short queries and disabled modes all read as "No results found"
- **Problem:** Hybrid and Semantic return nothing under 3 characters. Disabled modes give no reason. Errors are logged only.
- **Evidence:** semantic.rs:804, 991; SearchPanel.svelte:84-94, 98-103, 119-120; search.service.ts:172-176, 269-270.
- **Proposal:** Separate states: "Type at least 3 characters" in Semantic and Hybrid, an error state with Retry, and a tooltip on disabled modes saying the model is unavailable, with a Settings link.
- **Impact:** Users stop concluding that a note does not exist. **Effort:** M
- **Validation:** revise. The indexing state already exists.

#### P58. Hybrid search results hide the note name, and every card says "Both"
- **Problem:** The heading is used as both title and subtitle, and every card carries the same badge.
- **Evidence:** search.service.ts:163, 169; SearchResult.svelte:47-68, 143-153.
- **Proposal:** The title is the note name, and the subtitle is the folder plus the heading. Hide a badge that is the same on every card.
- **Impact:** Users can tell which note a hit belongs to. **Effort:** S
- **Validation:** keep. Moderate because hybrid is opt-in.

#### P158. Search result cards show raw markdown, unstyled highlights and a redundant path
- **Problem:** Snippets are raw markdown, `<mark>` has no style, and the subtitle repeats the file name.
- **Evidence:** SearchResult.svelte:55-56, 161-172; sanitize.ts:54-63; app.css (no `mark` rule); [search-results-light.png](screens/search-results-light.png).
- **Proposal:** Strip markdown from snippets (shared with P74), style `mark` with a theme token, and show only the parent folder.
- **Impact:** Shows why a note matched. **Effort:** M
- **Validation:** keep.

#### P159. Palette ranking puts Undo and Redo above "Go to Calendar"
- **Problem:** Labels that start with "Calendar:" get a prefix bonus. 13 of 38 commands, including Undo and Redo, are filed under Navigation.
- **Evidence:** fuzzy-match.ts:34-40; commands.ts:236-262; command-palette.logic.ts:27-35; [command-palette-filtered-light.png](screens/command-palette-filtered-light.png).
- **Proposal:** Show Calendar Undo and Redo only when the calendar has something to undo or its tab is active, and move the calendar commands to a "Calendar" category. Add a word-start bonus in `fuzzyMatch`.
- **Impact:** Two letters find the right command. **Effort:** M
- **Validation:** revise. A word-start bonus alone ties the labels, so the context gating carries the fix.

#### P14. Quick Capture success is invisible, and clipboard captures give no feedback
- **Problem:** The composer flashes a ring for 180 ms. Clipboard and deep-link captures show nothing, and the user never sees the folder or name.
- **Evidence:** routes/composer/+page.svelte:12, 141-151; deep-link-actions.ts:212-224; quick_capture/commands.rs `capture_clipboard_now`; no notification plugin in src-tauri/Cargo.toml.
- **Proposal:** The composer shows a check and "Saved to <folder>/<name>" for about 600 ms before it hides. Clipboard and deep-link captures show a toast with Open when the main window is focused, and otherwise a macOS notification (add tauri-plugin-notification), or at least a dock bounce. Surface clipboard errors the same way.
- **Impact:** Builds trust in a daily feature. **Effort:** M
- **Validation:** revise. A main-window toast is not seen while the user works in another app.

#### P15. The composer says "ESC cancels" but keeps the draft, and saving is hidden
- **Problem:** Esc hides the window and keeps the draft, which comes back silently on the next summon. Nothing shows during the save wait of up to 3 s.
- **Evidence:** routes/composer/+page.svelte:14, 41, 105-108, 166-174, 252-255.
- **Proposal:** The hint reads "Esc hides (draft kept) · ⌘↩ saves", and the two error hints use the same wording. Show "Saving…" while waiting. A restored draft shows "Draft restored" with a Discard link.
- **Impact:** No fear of losing text or sending stale text. **Effort:** S
- **Validation:** revise. Dropped the clear-draft shortcut.

#### P40. Line length swings from about 25 to over 140 characters, and the full-width toggle does nothing by default
- **Problem:** `contentWidth` defaults to 0 (no limit), so the wide-notes toggle switches between two identical layouts.
- **Evidence:** settings.store.svelte.ts:84; settings.logic.ts:83-85; editor-theme.ts:39-45; [settings-editor-light.png](screens/settings-editor-light.png).
- **Proposal:** Default `contentWidth` to about 72ch (or the px equivalent). While it is 0, disable the action-bar width toggle and give it a tooltip that points to Settings > Editor > Content width.
- **Impact:** Every note keeps a comfortable line length. **Effort:** S
- **Validation:** revise. The setting already exists, so the defect is the default and the no-op toggle.

#### P112. Live-preview widgets have thin loading and error states (embeds, images, mermaid, math, QueryJS)
- **Problem:** Embeds render as raw text. Missing images have no style and no `onerror`. Mermaid is blank while it renders.
- **Evidence:** widgets.ts:175, 615, 705-713; mermaid-widget.ts:78-100; math-widget.ts:56-58; queryjs-block-widget.ts:236-241, 299-330.
- **Proposal:** Render embedded notes as read-only markdown. Style `.cm-lp-image-missing` and switch to it from `img onerror`. Show a placeholder while mermaid renders.
- **Impact:** Failures stop looking like content. **Effort:** M
- **Validation:** revise. Math and QueryJS already handle errors and double runs.

#### P113. Editor widget controls are mouse-only
- **Problem:** Widget controls act on mousedown only. Code Copy shows only on hover and has no catch. There is no Toggle task command.
- **Evidence:** widgets.ts:37-45; code-block-widget.ts:89-101; styles.ts:345-358; callout-field.ts:26-34, 67-105; simple-widget-handlers.ts:18.
- **Proposal:** Add a "Toggle task" editor command for every selected line, in the palette and bound to Cmd+L (Obsidian's key). Copy failures show "Copy failed". ARIA and key handling inside widgets come later as polish.
- **Impact:** Tasks and code work from the keyboard. **Effort:** M
- **Validation:** revise. On the cursor line the raw marker already shows, so it can be edited as text.

#### P114. Callouts show a lowercase type word, a chevron on every callout, and an italic body
- **Problem:** The type word is lowercase and the body inherits the quote italics.
- **Evidence:** highlight-styles.ts:39; styles.ts:470, 504; callout-field.ts:171-175, 209; callout-field.test.ts:155; [editor-live-preview-light.png](screens/editor-live-preview-light.png).
- **Proposal:** Cancel the italics inside `.cm-lp-callout`. Show the type in its callout colour in Title case, and use the type name as the title when none is given. Keep the chevron on every callout. Dimming it until hover needs the owner's approval.
- **Impact:** Callouts read as callouts. **Effort:** M
- **Validation:** revise. The chevron on every callout is the tested Phase 17 decision.

#### P115. The table of contents has decorative chevrons, no current heading, and loses state on tab switch
- **Problem:** The chevrons do nothing, there is no scroll-spy, and there is no "Go to heading" command.
- **Evidence:** TableOfContentsPanel.svelte:11-27, 60; commands.ts:324; commit 80ee3491a.
- **Proposal:** Remove the chevrons (or make them collapse subtrees). Highlight the current heading with `aria-current`, and add a "Go to heading" palette command. Keeping the panel open across tabs is an owner decision.
- **Impact:** Long-note navigation keeps its place. **Effort:** M
- **Validation:** revise. The collapse on tab switch is deliberate.

#### P102. Nothing in the open note leads back to where it lives
- **Problem:** The breadcrumb is static text ("Project › file.md"), and there is no "Reveal in note list".
- **Evidence:** note-action-bar.logic.ts:32-37; NoteActionBar.svelte:100, 128-132; [note-action-bar-light.png](screens/note-action-bar-light.png).
- **Proposal:** Make the breadcrumb clickable: the type opens the Types lens, a folder opens the Files lens, and the name drops ".md". Add "Reveal in note list" to the overflow menu and the palette, scrolling to and highlighting the row.
- **Impact:** The user can always find and return to a note's home. **Effort:** M
- **Validation:** revise. Dropped the Neighbourhood, Escape and organized-label items.

#### P38. Creation has many entry points with different destinations and names, and Files has no visible "+"
- **Problem:** Folder, canvas and table creation exist only on right-click. "New File", "New Canvas" and "New Kanban Board" write to the vault root, and the names drift.
- **Evidence:** FilesNavigator.svelte:80-91, 304-310, 346-403; commands.ts:148-192, 371-376; note-composer.service.ts:20-55; new-note.service.ts:26-46; RailNoteList.svelte:808-819; TypesNavigator.svelte:218-230.
- **Proposal:** Add a "+" menu in the Files and note-list headers that targets the selected folder. Cmd+N stays capture. Other creation commands follow the active lens and say where they create. Use one pattern, "New <kind>".
- **Impact:** Boards and canvases land where the owner works. **Effort:** M
- **Validation:** keep.

#### P37. The keyboard can open a lens but not enter it; rail items have no shortcuts
- **Problem:** After "Go to X", focus stays where it was, and "+ New here" has no command.
- **Evidence:** rail-navigation.ts:14-24; global-keybindings.ts:133-141, 181; commands.ts; ADR-0033 (Cmd+1 and Cmd+2 assigned).
- **Proposal:** Selecting a lens moves focus to its active or first row. Add a "New note here" command. Owner decisions: direct keys for rail items (Ctrl+1..9 or Cmd+Opt+1..9), merging the three panel bindings, and an optional F6 focus cycle.
- **Impact:** Every lens is usable from the keyboard. **Effort:** M
- **Validation:** revise. Cmd+1..9 would reverse ADR-0033.

#### P36. "Calendar" names two places, and Tasks, Graph and Tags have no visible entry point
- **Problem:** The rail Calendar is the periodic-notes navigator, while the Calendar tab is the event calendar. Calendar Undo and Redo are filed under Navigation.
- **Evidence:** calendar-rail.service.ts:26-32; CalendarNavigator.svelte:153-160; commands.ts:253-267.
- **Proposal:** Rename the rail navigator (for example "Journal"), and move Calendar Undo and Redo into a "Calendar" category. Optionally add tab-opening rail items for Tasks, Graph and Tags through an ADR-0033 amendment.
- **Impact:** The daily views are easier to find. **Effort:** M
- **Validation:** revise. The Calendar tab already has a button, and the views have shortcuts.

#### P103. The macOS menu bar holds almost nothing
- **Problem:** There is no way to switch vaults from inside an open vault.
- **Evidence:** lib.rs:212-247; routes/(app)/+page.svelte:13-17; `vaultStore.close()` has no caller; [vault-picker-light.png](screens/vault-picker-light.png).
- **Proposal:** Add "Open vault..." and "Switch vault" palette commands and a native File menu with Open Vault and Open Recent. Full View, Go and Note menus are polish.
- **Impact:** Vault switching becomes possible without a restart. **Effort:** M
- **Validation:** revise.

#### P84. Active filter, sort and display state is shown by colour only
- **Problem:** On the note-list Filter and Archive triggers and the collection toolbar, an active filter only tints the icon. Hidden columns give no sign.
- **Evidence:** RailNoteList.svelte:772-777; RailArchivedMenu.svelte:33-37; CollectionView.svelte:221-225, 620-623, 646-649, 662-665.
- **Proposal:** Count badges on the note-list Filter trigger and the collection Filter and Sort triggers (`activeFilterCount`, `localSort.length`). Add a dot on Archive when it is not at its default and on Columns when any column is hidden, plus a one-click "Clear filters".
- **Impact:** Prevents "missing notes" confusion. **Effort:** S
- **Validation:** revise. Tasks, Graph and FilterPanel already show values as text.

#### P85. Hover and selected states: 28 hover recipes and about nine selected treatments, with no state tokens
- **Problem:** The selected item can be a rail hue, primary/25, bg-accent or the hover token itself. One screen can show three selection colours.
- **Evidence:** FilesNavigator.svelte:294-297; TypesNavigator.svelte:281-283; NoteRow.svelte:70; TaskLists.svelte:185; SettingsPanel.svelte:137; AppearanceSection.svelte:173; [kanban-board-dark.png](screens/kanban-board-dark.png).
- **Proposal:** Keep the ADR-0033 rail tint. Move navigators, the note list, Tasks lists, settings nav, the theme list and command items onto `--state-hover`, `--state-selected` and `--state-selected-fg`, keyed to `aria-current` and `aria-selected`. Add the selected pair to READABILITY_PAIRS.
- **Impact:** One "you are here" signal. **Effort:** M
- **Validation:** revise. Rail.svelte:359-360 is ADR-0033, not drift.

#### P29. Empty and loading states say "nothing" without the cause or a next step (about 25 variants)
- **Problem:** Empty states differ in size and wording. Favorites does not say how to star. Collection and kanban filters do not say that a filter hid everything.
- **Evidence:** RailNoteList.svelte:826-897; [rail-favorites-light.png](screens/rail-favorites-light.png), [rail-archive-light.png](screens/rail-archive-light.png).
- **Proposal:** Add a small EmptyState (icon, title, hint, optional action). Give each lens a hint (how to star, how to archive). Filtered views say "No results match N filters" with Clear filters, and Properties explains unsupported files.
- **Impact:** A filtered-out list stops looking like data loss. **Effort:** M
- **Validation:** revise. The note list already separates loading, missing, error and no-match. No skeletons.

#### P30. Background refreshes replace the content with a loading line, so lists collapse and blink
- **Problem:** Tags swaps its tree for "Indexing tags..." on every index bump, which collapses expanded nodes. Search empties on each debounced keystroke and shows "50 results" when the cap cuts the list.
- **Evidence:** TagsView.svelte:41-46, 79-80; tags.service.ts:27; TagItem.svelte:19; search.service.ts:138, 201; SearchPanel.svelte:115-116.
- **Proposal:** Search keeps the previous results visible and dimmed, shows a spinner after about 300 ms, and says "50+ results" at the cap. Tags shows the loading line only on the first build.
- **Impact:** No flicker while typing, and the tag tree stays open. **Effort:** S
- **Validation:** revise.

#### P24. Lists have no keyboard model except Tasks, and every row is its own Tab stop
- **Problem:** The note list and search results have no arrow-key navigation, and Escape in search only blurs.
- **Evidence:** SearchPanel.svelte:35-38; NoteRow.svelte; tasks-keys.logic.ts; KanbanView.svelte:255-290.
- **Proposal:** Extract a roving-list action from `tasks-keys.logic.ts` and apply it to the note list and search results first: one Tab stop, Up/Down/Home/End, Enter, Cmd+Enter for a new tab, F2 to rename. In search, ArrowDown moves from the input into the results, and the first Escape clears the query. The Files and Types trees and collection rows come second.
- **Impact:** The largest keyboard gain in the app. **Effort:** L
- **Validation:** revise. Kanban already has a keyboard model.

#### P22. Icon-only controls have no enforced name or tooltip
- **Problem:** About 27 icon buttons have no name, and native titles are slow and never show on keyboard focus.
- **Evidence:** CollectionView.svelte:595, 622, 645, 668; Tooltip used in 3 files; [view-file-table-light.png](screens/view-file-table-light.png).
- **Proposal:** An IconButton whose label is required, rendering `aria-label` plus a styled Tooltip with an optional shortcut chip, under one root Tooltip.Provider (about 400 ms). Migrate the collection toolbar, auto-organize controls and Trash first, then the title-only toolbars. Remove buttons name their target.
- **Impact:** Faster hints that show shortcuts. **Effort:** M
- **Validation:** revise. The canvas buttons have titles, so they are named.

#### P23. The focus ring is drawn at 50% and fails 3:1 on borderless targets; many controls have none
- **Problem:** `ring/50` measures 1.9-2.6:1, and the destructive `/20` ring 1.2-1.3:1. The dialog close button uses `focus:`, so it rings on open. Several inputs use `outline-none` with no replacement.
- **Evidence:** app.css:484-500; button.svelte:7, 12; input.svelte:44; dialog-content.svelte:38; PropertyField.svelte:114, 139, 191; TasksView.svelte:609, 846, 921; GraphControls.svelte:81, 101, 114; KanbanView.svelte:489, 501; CollectionView.svelte:530; [file-history-light.png](screens/file-history-light.png).
- **Proposal:** Add one `--focus-ring` token at 100% opacity (4.9-6.8:1) and a focus-ring utility (a 2 px ring with offset, inset on rows), plus a base `:focus-visible` rule. Replace the `/50` and `/20` rings and the `focus:` variants.
- **Impact:** The keyboard position is always visible, and clicks stop leaving rings. **Effort:** S
- **Validation:** keep. The token is S, and the call-site sweep is closer to M.

#### P25. Text on selected rows and alpha-faded text drops below 4.5:1
- **Problem:** The selected-row subtitle is about 3.9:1, chips about 3.6:1 at 11 px, and archived rows sit at opacity-60. Snippets and values are faded to `/60` and `/70`.
- **Evidence:** NoteRow.svelte:70, 93, 96-97, 103, 114, 124; SearchResult.svelte; PropertyField.svelte; PropertiesView.svelte.
- **Proposal:** Selected rows keep foreground and muted text at 4.5:1, or add the composite pair to READABILITY_PAIRS. Chips use full primary. Drop opacity-60 on archived rows, which already show an icon. Add a `--faint-fg` tier at 3:1 for placeholders, and use muted for snippets and values.
- **Impact:** The note list, chips, snippets and values stay readable. **Effort:** M
- **Validation:** revise. No blanket lint; add pairs for specific surfaces.

#### P26. Control boundaries fail non-text contrast (switch off state, input and select edges)
- **Problem:** In Lavender, the off switch track is 1.12:1 and the input border 1.08:1. In the default theme the track is 1.74:1. WCAG asks for 3:1.
- **Evidence:** theme-builder.logic.ts:105-155, 252; theme.logic.ts:174, 177, 284, 286; switch.svelte:18; select-trigger.svelte:22; input.svelte:43; [settings-update-light.png](screens/settings-update-light.png).
- **Proposal:** Add control-boundary pairs at 3:1 against settingItemBg, card, popover and editor. Give the off switch a 1 px border. Input and Select share one surface token and one border token.
- **Impact:** Toggles and fields become legible. **Effort:** M
- **Validation:** keep. Ship with P25 and P27 as one contrast-pairs pass.

#### P27. Error text is held to 3:1 only, and only against the editor background
- **Problem:** `text-destructive` appears 59 times, 31 of them at 11-12 px, and measures 3.44-3.66:1. Muted text on hover is 4.05:1. The destructive Button uses a literal white.
- **Evidence:** theme-builder.logic.ts:122, 187; theme.logic.ts:139, 254; button.svelte:12; AppearanceSection.svelte:262; [settings-appearance-light.png](screens/settings-appearance-light.png), [settings-appearance-dark.png](screens/settings-appearance-dark.png).
- **Proposal:** Add a separate error-text token held to 4.5:1 on every panel surface, and keep destructive for fills. Add pairs for muted text on hover and on selection. The destructive Button uses `destructive-foreground`.
- **Impact:** Failure messages stay readable. **Effort:** M
- **Validation:** keep.

#### P28. Form controls are labelled by a neighbouring span instead of a label
- **Problem:** SettingItem renders spans, so switches have no name and clicking the label does nothing. The checkbox property is named "true".
- **Evidence:** SettingItem.svelte:25-27, 37; PropertyField.svelte:124-132; [settings-update-light.png](screens/settings-update-light.png).
- **Proposal:** SettingItem generates an id, renders a `<label>`, and links the description with `aria-describedby`. Clicking the row toggles its Switch. Apply the same to auto-organize and properties rows. The checkbox property is named by its key.
- **Impact:** Larger click targets, and every control has a name. **Effort:** M
- **Validation:** keep. Fixing SettingItem covers 19 sections.

#### P19. Seven categorical palettes and two tag-colour systems, mostly blind to the theme
- **Problem:** On light themes, kanban chips measure 1.7-3.1:1 and rail badges fail. A tag has a global colour and a separate per-board one. The linear calendar forces white text.
- **Evidence:** color-presets.ts; KanbanCardText.svelte:38, 76; kanban.logic.ts:775; tag-colors.ts; CollectionLinearCalendarView.svelte:199; collection-block-widget.ts:380; Rail.svelte:373; ADR-0033:183-190.
- **Proposal:** (1) Kanban and QueryJS chips derive their text from the `--type-*` tokens or mix the preset toward `--editor-fg`, with a contrast test. (2) The linear calendar uses `barTextColor`. (3) Rail badge text picks black or white by contrast. (4) Optionally move kanban tag colours onto the `tag-colors.ts` names.
- **Impact:** A tag looks the same everywhere and is readable in light themes. **Effort:** M
- **Validation:** revise. The rail icon palette stays fixed, per ADR-0033.

#### P20. One accent colour does seven jobs, and bold and italic share the link hue
- **Problem:** In KokoBrain Default, bold (#93c5fd) sits next to the link colour (#60a5fa), so bold text looks like a link. Section titles and calendar weekends use primary.
- **Evidence:** theme-builder.logic.ts:232-283; theme.logic.ts:236, 247; CalendarGrid.svelte:45, 58-59; [editor-live-preview-dark.png](screens/editor-live-preview-dark.png).
- **Proposal:** (1) Move bold and italic off the link hue, and add a builder check on the hue distance from link and wikilink. (2) Section titles use foreground. (3) Calendar weekends use muted.
- **Impact:** Links and the current location become recognisable at a glance. **Effort:** M
- **Validation:** revise. Calendar today and selection are already distinct, and heading = primary in Lavender is the owner's taste.

#### P109. In the dark default theme the tab strip is the brightest surface
- **Problem:** The `tabBar` override (#5a5c79) is about 2.1:1 lighter than the editor.
- **Evidence:** theme.logic.ts:155; theme-builder.logic.ts:238; Rail.svelte:270; AppShell.svelte:256, 276; [kanban-board-dark.png](screens/kanban-board-dark.png).
- **Proposal:** Drop the override so `tabBar` derives from `sidebarBg`, or set it close to the editor surface, then check the dark screenshots.
- **Impact:** Content is the brightest area again. **Effort:** S
- **Validation:** revise. The active tab already uses the editor background.

#### P31. Hand-built overlays do not move, trap or restore focus, and Escape is inconsistent
- **Problem:** The canvas context menu has no roles and no arrow keys, and Escape does not close it. Settings neither moves nor restores focus, and its window-level Escape fires unconditionally.
- **Evidence:** CanvasContextMenu.svelte:87-99; CanvasInner.svelte:271-274; CanvasFilePicker.svelte; CanvasLinkInput.svelte; SettingsPanel.svelte:104-112.
- **Proposal:** Canvas first: move the pane, node and edge menu onto bits-ui ContextMenu, or at least close it on Escape and outside focus and add menu roles and arrows. The file picker and link input use Command/Dialog and say "Showing 20 of N". Settings moves focus in on open, restores it on close, and ignores Escape when `defaultPrevented`.
- **Impact:** Escape and Tab behave the same in every overlay. **Effort:** M
- **Validation:** revise. The `+layout.svelte` citation was wrong.

#### P32. Panes have no real minimum width, and the Calendar navigator renders broken
- **Problem:** At about 163 px, the mini month's weekday headers collide and its chevrons clip.
- **Evidence:** CalendarGrid.svelte:22-51; settings.store.svelte.ts:70-74; [rail-calendar-light.png](screens/rail-calendar-light.png), [calendar-plugin-navigator-light.png](screens/calendar-plugin-navigator-light.png).
- **Proposal:** Make CalendarGrid container-aware: single-letter weekdays and no week-number column below about 200 px, and chevrons that do not clip. Optionally let navigators declare a px `minWidth`.
- **Impact:** No broken-looking panes. **Effort:** M
- **Validation:** revise. The 3% default pane sizes are an owner decision and stay.

#### P49. Collection calendar views silently drop undated notes
- **Problem:** Undated records are skipped while the count still includes them, and an empty grid shows no message.
- **Evidence:** features/collection/calendar.logic.ts:109-111; CollectionView.svelte:587; CollectionCalendarView.svelte; CollectionLinearCalendarView.svelte.
- **Proposal:** An "N without date" chip that opens a list, a "No dated entries" message, and the count "N results, M on calendar".
- **Impact:** Missing data stops looking like a bug. **Effort:** M
- **Validation:** keep.

#### P65. The week and day Tasks lane hides tasks with no overflow cue
- **Problem:** The lane stops at 3 rows and scrolls internally, with no "+N".
- **Evidence:** EventTaskLane.svelte:23, 38; EventAllDayLane.svelte:90-99; [calendar-week-light.png](screens/calendar-week-light.png), [calendar-day-light.png](screens/calendar-day-light.png).
- **Proposal:** Use the all-day pattern ("+N" opens the day view), and in the day view expand the lane in place with a count.
- **Impact:** Dated tasks stop getting missed. **Effort:** S
- **Validation:** keep.

#### P127. The time grid and Today never scroll to the now-line
- **Problem:** The grid scrolls only to `dayStartHour` on mount, so after about 15:00 the now-line opens off screen.
- **Evidence:** EventTimeGrid.svelte:97-100; event-calendar-layout.logic.ts:11; EventCalendarView.svelte:65; [calendar-week-light.png](screens/calendar-week-light.png).
- **Proposal:** Keep the mount scroll. When today is visible and the now-line is below the viewport, bring it about a third of the way down. The Today button also scrolls to now. Optionally show a "Now" pill when the line is off screen.
- **Impact:** "What's next" needs no scroll. **Effort:** S
- **Validation:** revise. Keeps the "Day starts at" setting.

#### P66. Type archive rules are invisible and gated by a master switch that is off by default
- **Problem:** Lifecycle rules run only when Auto Organize is on (default off) and are never listed. With it off, Archive marks a note but never moves it.
- **Evidence:** type-lifecycle-rules.ts:22-62; auto-organize.service.ts:211; settings.store.svelte.ts:110-112; lifecycle.service.ts:88-92; AutoOrganizeSection.svelte:107-174; [settings-auto-organize-light.png](screens/settings-auto-organize-light.png).
- **Proposal:** Add a read-only "From your types" group and a line under the toggle. When `archiveTo` is set but Auto Organize is off, show a hint with an Enable button.
- **Impact:** Ends silent "archive does nothing" failures. **Effort:** M
- **Validation:** keep.

#### P67. Rules run only on save: no way to apply one to existing notes, and no record of what ran
- **Problem:** "Matches 4 notes now" offers no action, and automatic moves and renames happen silently.
- **Evidence:** auto-organize.service.ts:206-241, 402, 415; AutoOrganizeRuleRow.svelte:354-361; [auto-organize-rule-builder-light.png](screens/auto-organize-rule-builder-light.png).
- **Proposal:** Add "Apply to N notes..." behind a confirm dialog that lists the effects. After an automatic move or rename, show an info toast with Undo.
- **Impact:** Rules become controllable and can be applied to existing notes. **Effort:** L
- **Validation:** revise. Dropped the Recent activity log.

#### P68. The Auto Organize copy describes "move" and "first match", which is not how rules work
- **Problem:** Rules also rename, set properties, create notes and run mods, and precedence differs by effect.
- **Evidence:** AutoOrganizeSection.svelte:112, 151-154; auto-organize.service.ts:283-290.
- **Proposal:** Rewrite the toggle description and the help text: the first match wins for rename, move and mod actions; every match applies for set-properties and create-note; type lifecycle rules run after user rules.
- **Impact:** Rules are no longer ordered on a wrong assumption. **Effort:** S
- **Validation:** revise. Effect badges belong to P70.

#### P69. The destination field hides its template variables, and a typo creates a literal folder
- **Problem:** None of the 7 variables is listed, and an unknown `{var}` is kept literally (`{yaer}` becomes a folder).
- **Evidence:** AutoOrganizeRuleRow.svelte:400-407; auto-organize.logic.ts:933-971.
- **Proposal:** Add an "Insert variable" menu or typeahead, a live preview, a flag on unknown variables, and folder suggestions.
- **Impact:** Prevents misfiled notes and stray folders. **Effort:** M
- **Validation:** keep.

#### P70. Each rule is a flat, always-expanded form with no summary
- **Problem:** All six sections render even when unused, so one rule fills the viewport.
- **Evidence:** AutoOrganizeRuleRow.svelte:285-525; [auto-organize-rule-builder-light.png](screens/auto-organize-rule-builder-light.png).
- **Proposal:** Collapse each card to a one-line summary. An expanded card shows only the effects in use plus "Add action". A new rule opens expanded with the name focused.
- **Impact:** The rule list becomes scannable. **Effort:** L
- **Validation:** keep.

#### P152. Property rows are keyed by index, so error state follows the wrong row
- **Problem:** After a delete, local drafts and errors move to the next row, and a later mode change can save the deleted row's refused expression into another property. Traced in code only.
- **Evidence:** AutoOrganizeRuleRow.svelte:427, 468; AutoOrganizeRuleProperty.svelte:65-79, 137-140.
- **Proposal:** Key rows by a stable client-side id that is not persisted.
- **Impact:** Errors and drafts stay on the right row. **Effort:** S
- **Validation:** keep.

#### P153. The File History diff lacks orientation
- **Problem:** The header shows a raw epoch. "Current" labels a snapshot rather than the note. The columns have no labels, and there is no summary or change navigation.
- **Evidence:** FileHistoryDialog.svelte:83-84, 96; file-history.logic.ts:46-50; file-history.service.ts:62-68; DiffViewer.svelte:43-48.
- **Proposal:** A header reading "Compared with current note" with +/- chips, the label "Latest saved version", Previous/Next change buttons, column headers and one consistent noun.
- **Impact:** The user knows what they are restoring. **Effort:** M
- **Validation:** keep.

#### P77. File History restore and load failures give no feedback, and empty states make false claims
- **Problem:** A failed restore is an unhandled rejection. A load failure reads as "No history", and an empty history opens the full 1020x720 dialog.
- **Evidence:** FileHistoryDialog.svelte:40-51, 55; file-history.service.ts:47-50, 101-104; SnapshotList.svelte:26-29; history.rs:105-145.
- **Proposal:** Catch restore errors and show a toast. Show an inline error with Retry when loading or diffing fails. When nothing changed, say "No differences from the current version". An empty history gets a compact state that links to the retention setting.
- **Impact:** A high-stakes action never fails silently. **Effort:** S
- **Validation:** revise. Identical content renders as an all-unchanged diff, not as the empty state.

#### P76. The Tags view hides rare tags by default, and its header contradicts the body
- **Problem:** A threshold of 10 hides most tags, so the header can read "7 tags" above "No tags found".
- **Evidence:** tags.store.svelte.ts:5; TagsView.svelte:15, 35-39, 52-64, 81-82.
- **Proposal:** The header says "Showing X of Y" with an inline "Show all". The empty state reads "All N tags are used fewer than 10 times. Show all".
- **Impact:** The view stops looking broken. **Effort:** S
- **Validation:** revise. Keeps the default.

#### P83. Text selection is disabled app-wide with no opt-in
- **Problem:** `body` is `user-select: none`, so errors, paths, versions, Info values and toasts cannot be copied.
- **Evidence:** app.css:498; editor-theme.ts:40; [settings-update-light.png](screens/settings-update-light.png).
- **Proposal:** Keep chrome non-selectable, and add a `selectable` utility for settings content, toasts, dialogs, errors, Info rows and snippets.
- **Impact:** Errors can be copied when something fails. **Effort:** S
- **Validation:** keep.

#### P88. Six colour pickers, and only one is accessible
- **Problem:** Clicking a kanban tag opens the colour palette instead of filtering. Swatches are named by title only and show selection only as a ring. The kanban tag popover never takes focus.
- **Evidence:** EventColorSwatches.svelte:38-50; ColorPicker.svelte:20-35; TagColorPicker.svelte:37-55; KanbanCardText.svelte:49-66; KanbanCard.svelte:240-250; KanbanView.svelte:181, 499-504.
- **Proposal:** A click on a kanban tag sets the board filter (`setFilterQuery('#tag')`), and tag colour moves to the card menu or Shift+click. Then promote EventColorSwatches to a shared radiogroup, using `menuitemradio` inside menus.
- **Impact:** One click filters a board by tag. **Effort:** S
- **Validation:** revise. Tag-click filtering is the daily-use part.

#### P89. Copy actions confirm in four ways, and Copy block link gives no feedback
- **Problem:** 13 clipboard writes behave in four different ways. The block-link shortcut is silent, inserts `^id` before the write, and does nothing on an empty line.
- **Evidence:** copy-block-link.service.ts:25, 32-62; note-action-bar.service.ts:33-42; code-block-widget.ts:89-99; TasksView.svelte:585-590; FilesNavigator.svelte:205-207; NoteRowMenu.svelte:246-249; TypesNavigator.svelte:325-375.
- **Proposal:** One `copyToClipboard` helper with a label swap or short toast, and a failure toast. Write to the clipboard before inserting the id. On an empty line, say "Place the cursor on a block".
- **Impact:** No more pasting to check, and no stray ids. **Effort:** S
- **Validation:** keep.

#### P91. Form validation fires on open, and error styles differ
- **Problem:** A new event opens with a red error and Save disabled.
- **Evidence:** EventForm.svelte:38-39, 73-75, 187; event-calendar-form.logic.ts:104, 163; ViewDialog.svelte:189-192; ThemeEditor.svelte:81, 141-145; TypeNameDialog.svelte:29-30, 66, 68; FormulaRow.svelte:62; AutoOrganizeRuleRow.svelte:394.
- **Proposal:** Validate after blur or submit, add an "Event title" placeholder, and use one error style (`text-meta`, the error token, `aria-describedby`).
- **Impact:** Creating an event no longer starts with an error. **Effort:** S
- **Validation:** keep. TypeNameDialog already follows this pattern.

#### P98. The right sidebar toggle covers the tab strip and is not accessible
- **Problem:** While the sidebar is hidden, the absolutely positioned toggle covers the last tab. It has no `aria-pressed` and no focus ring.
- **Evidence:** AppShell.svelte:190-196, 276; EditorTabs.svelte:41, 45; [tabs-bar-several-light.png](screens/tabs-bar-several-light.png).
- **Proposal:** While the sidebar is hidden, pad the end of the tab strip by the toggle's width. Add `aria-pressed` and the shared focus ring.
- **Impact:** No covered tabs. **Effort:** S
- **Validation:** revise. `title` already gives the toggle a name.

### 2.3 Polish ("perfumaria")

#### P186. Kanban card anatomy polish
- **Problem:** Every undated card has a near-empty date row, and the linked-note preview is a raw-text scroll box.
- **Evidence:** KanbanCard.svelte:206-221; KanbanDatePicker.svelte:76-85; [kanban-board-light.png](screens/kanban-board-light.png).
- **Proposal:** On undated cards, drop the date row and show the set-date icon at the end of the tag or title line on hover or focus. Clamp the preview to 3 lines.
- **Impact:** Denser, calmer cards. **Effort:** S
- **Validation:** revise. Grip and markup dedup are left out.

#### P144. Kanban list, table and archive show raw text and dead ends
- **Problem:** The table shows raw tags and `[[links]]`, the check buttons are unlabelled, archive rows show raw tokens, and Restore always goes to the first lane.
- **Evidence:** KanbanTableView.svelte:35, 43-54, 69; KanbanListView.svelte:35-56; KanbanView.svelte:599, 604; kanban.logic.ts:752-758.
- **Proposal:** The table renders cards through KanbanCardText with tags stripped and adds an empty row. Check buttons get "Mark done" / "Mark open" labels. Archive rows show stripped text. Restore keeps "first lane", or offers a lane picker, and toasts "Restored to <lane>".
- **Impact:** Usable alternate views. **Effort:** M
- **Validation:** revise. No origin-lane tracking, because archived items store no lane.

#### P111. Meta-bind inline controls use three looks, and the number field is stretched
- **Problem:** The number field is about 190 px wide, and the date field keeps native WebKit chrome.
- **Evidence:** styles.ts:690-707, 783-795; app.css:473-482; [editor-live-preview-light.png](screens/editor-live-preview-light.png).
- **Proposal:** Size the number input to its content (`field-sizing: content`, min about 4ch). Give the date input the same padding and border as the other controls.
- **Impact:** The daily meta-bind controls read as one family. **Effort:** S
- **Validation:** revise. The select and the inputs already share tokens.

#### P110. Editor headings sit closer to the text above than to their own content
- **Problem:** Headings get no top space.
- **Evidence:** styles.ts:171-212; editor-theme.ts:47-50; heading-typography.logic.ts; [editor-live-preview-scrolled-light.png](screens/editor-live-preview-scrolled-light.png).
- **Proposal:** Add an optional "space above" value to the per-level heading typography, applied as padding-top with a small default for H1-H3.
- **Impact:** Long notes become easier to scan. **Effort:** S
- **Validation:** revise. The effect is mild.

#### P116. Two different word counts on screen
- **Problem:** A one-word note shows "1 words", and there is no selection count.
- **Evidence:** WordCount.svelte:33; word-count.logic.ts:4-9; entry.rs:361-363; e2e/mocks/vault-index.ts:100-104.
- **Proposal:** Pluralise correctly ("1 word"). With a selection, show "N of M words".
- **Impact:** One trustworthy number. **Effort:** S
- **Validation:** revise. The two counts match in the real app; the screenshot mismatch is the mock.

#### P50. An embedded collection block shows only its first view, with no sign that others exist
- **Problem:** The widget always renders `views[0]`.
- **Evidence:** collection-block-widget.ts:111, 141; docs/adr/0027 line 40.
- **Proposal:** When an inline block has more than one view, add a muted "1 of N views" hint (or a tooltip naming them).
- **Impact:** Hidden views become visible. **Effort:** S
- **Validation:** revise. No interactive chips.

#### P47. Collection headers show raw column ids and file names keep .md
- **Problem:** `displayName` falls back to the key ("file.name"), and name cells show ".md".
- **Evidence:** collection.logic.ts:419-420, 474-477, 485; [view-file-table-light.png](screens/view-file-table-light.png).
- **Proposal:** Use `file.basename` as the default first column of an inferred table, or hide ".md" in the cell only. Add built-in display names for `file.*` columns, with the raw key as a tooltip.
- **Impact:** Tables look finished by default. **Effort:** S
- **Validation:** revise. `file.name` keeps its Bases-style value.

#### P138. Collection view-tab actions hide behind double-click and right-click
- **Problem:** Tab actions are hidden, tabs have no type icon, and Delete is disabled without a reason.
- **Evidence:** CollectionView.svelte:534-584.
- **Proposal:** Add a chevron menu, a type icon and a tooltip on the disabled Delete.
- **Impact:** View management becomes discoverable. **Effort:** S
- **Validation:** keep.

#### P139. The filter conjunction selector looks like plain text
- **Problem:** A borderless text button switches between and, or and not.
- **Evidence:** FilterPanel.svelte:113-115, 175-177; FilterRow.svelte:114-121; toolbar.types.ts:59-63.
- **Proposal:** Style it like the FilterRow selectors (border plus chevron) and keep the existing labels.
- **Impact:** The filter logic becomes visible. **Effort:** S
- **Validation:** revise.

#### P140. Sort rows drag with no indicator and no keyboard path
- **Problem:** There is no drop line and no key path. The listitem role has no list parent, and the remove icons are unnamed.
- **Evidence:** SortPanel.svelte:58-63, 80-92, 126-133.
- **Proposal:** Add an insertion line, Alt+Up/Down to reorder, a list wrapper and named remove buttons.
- **Impact:** Predictable reordering. **Effort:** S
- **Validation:** keep.

#### P136. Canvas connection handles are hidden until hover and only 8 px
- **Problem:** Handles have tiny targets, and ImageNode has only 4 handles with mixed types.
- **Evidence:** CanvasInner.svelte:807-822; TextNode.svelte:81-88; ImageNode.svelte:63-66.
- **Proposal:** Show handles on selected nodes too, give them a 16 px invisible hit area, and give ImageNode the same 8 handles as the other nodes.
- **Impact:** Connecting becomes discoverable. **Effort:** S
- **Validation:** revise. Keep the paired handles, because the JSON Canvas side mapping depends on them.

#### P137. Canvas file and image cards give weak or stale status
- **Problem:** Images show the same placeholder for loading and error, use the path as alt text, and crop.
- **Evidence:** ImageNode.svelte:54-60, 100; FileNode.svelte:31-52; EditorView.svelte:85.
- **Proposal:** ImageNode gets a loading skeleton and a separate "Image not found" state with the path, alt text from the basename, and `object-fit: contain`. FileNode can reload when the index reports a change.
- **Impact:** Cards stay trustworthy. **Effort:** M
- **Validation:** revise. The canvas remounts on tab return.

#### P95. Shortcut hints are spelled four ways, and the canvas shows "Ctrl+A" on a Mac
- **Problem:** `formatShortcut` exists, but tooltips say "(Cmd+D)" and the canvas says "Ctrl+A". Several canvas actions have no hint.
- **Evidence:** keybindings.ts:40; NoteActionBar.svelte:148, 157; CanvasContextMenu.svelte:115; CanvasInner.svelte:269-276.
- **Proposal:** Send hard-coded hints through `formatShortcut` (a small Kbd component). Add hints for canvas Delete, Undo, Redo and zoom-to-selection.
- **Impact:** Correct, discoverable shortcuts. **Effort:** S
- **Validation:** revise. Ctrl+A works; only the label is not Mac-style.

#### P97. The empty editor is a dead end beside empty sidebar chrome
- **Problem:** One line of text sits next to "No file open" and three panel headers.
- **Evidence:** EditorView.svelte:153-158; layout.logic.ts:23-28; PropertiesView.svelte:158; [editor-empty-state-light.png](screens/editor-empty-state-light.png).
- **Proposal:** `hidesRightSidebar(null)` returns true. Replace the line with a short hint listing Quick switcher, Command palette and New note with their shortcuts.
- **Impact:** The idle state becomes a launch point. **Effort:** S
- **Validation:** revise. No recent-notes card.

#### P99. Zoom gives no feedback and is not persisted
- **Problem:** Zoom changes silently and resets on launch.
- **Evidence:** zoom.service.ts:3-29; global-keybindings.ts:177-181.
- **Proposal:** Persist the zoom factor and apply it at startup. Show a brief "110%" chip that resets the zoom when clicked.
- **Impact:** The scale is visible and kept. **Effort:** S
- **Validation:** revise.

#### P176. The status bar is tall for passive text, and the save indicator pulses and shifts
- **Problem:** The bar is 32 px tall for 12 px text, and "Modified" pulses and changes width on every autosave.
- **Evidence:** app.css:212; SaveStatus.svelte:14-23; StatusBar.svelte:9.
- **Proposal:** Lower `--status-bar-height` to about 24 px, remove the pulse, and give the save slot a fixed min-width.
- **Impact:** More space and a calmer writing surface. **Effort:** S
- **Validation:** revise. Clickable items are left for later.

#### P104. Sidebar panels and feature settings can be reached only through the Settings sheet
- **Problem:** Panels are toggled only in Settings > Layout, and `open(section)` has no caller.
- **Evidence:** LayoutSection.svelte:127-150; commands.ts:322-330.
- **Proposal:** Add palette toggles for Properties, Backlinks and Outgoing links, a "Hide panel" item in each header menu, and "Configure..." links through `settingsPanelStore.open(section)`.
- **Impact:** Settings change where they are used. **Effort:** S
- **Validation:** revise.

#### P105. Trash can be browsed only from inside Settings
- **Problem:** Archive is a lens while Trash is a settings page.
- **Evidence:** TrashSection.svelte; delete-note.service.ts:14-19; rail-items.logic.ts:46.
- **Proposal:** Add an "Open Trash" palette command that calls `settingsPanelStore.open('trash')`. Undo stays with P01.
- **Impact:** Recovery takes one step. **Effort:** S
- **Validation:** revise. No rail lens.

#### P117. The note row's second line differs across lenses
- **Problem:** In a folder lens the subtitle repeats the folder. Canvas, kanban and view rows show a kind word and no time.
- **Evidence:** lens.logic.ts:258-260, 291, 924-932, 960-962, 1003-1006; [narrow-1024x700-today-light.png](screens/narrow-1024x700-today-light.png), [files-note-list-light.png](screens/files-note-list-light.png).
- **Proposal:** Leave the folder out of the subtitle in a folder lens. Non-markdown rows show their modified time and let the icon carry the kind.
- **Impact:** Consistent scanning. **Effort:** S
- **Validation:** revise. The "Note" subtitle is a mock artifact.

#### P119. System folders mix into the Files tree, with no counts
- **Problem:** `_system` and `_templates` sit at the top and look like user folders.
- **Evidence:** FilesNavigator.svelte:77; fs.logic.ts:408-478; folder-notes.logic.ts:16-48; [files-note-list-light.png](screens/files-note-list-light.png).
- **Proposal:** Show underscore folders in muted text, and sort them after user folders when no custom order exists. Note counts are optional.
- **Impact:** Browsing focuses on user content. **Effort:** S
- **Validation:** revise. Folder ordering already exists.

#### P120. The "My people" section: raw empty state, ambiguous labels, overdue by colour only
- **Problem:** The empty state prints "_one_on_one_every" and a folder path. "3d" has no context, and the rows have no focus style.
- **Evidence:** MyPeopleSection.svelte:35-38, 58; [landing-today-light.png](screens/landing-today-light.png), [narrow-1024x700-today-light.png](screens/narrow-1024x700-today-light.png).
- **Proposal:** Hide the section, or show one muted "Set up 1:1 tracking" line that links to Settings. Label days "3d ago" / "never", add an overdue icon and add focus rings.
- **Impact:** Removes a bug-looking block from the landing list. **Effort:** S
- **Validation:** revise.

#### P122. List property chips cannot be edited or reordered, and add/remove are hover-only
- **Problem:** Chips are static spans, the controls sit at opacity 0, and an empty list shows only the key.
- **Evidence:** PropertyField.svelte:90-96, 147-153, 166-196.
- **Proposal:** Double-click a chip to edit it in place, and show a visible "+ Add" chip when the list is empty. Drag-to-reorder is optional.
- **Impact:** No more delete-and-retype on tags. **Effort:** M
- **Validation:** revise. Enter already keeps the add input open.

#### P123. Info values truncate their own dates
- **Problem:** Long dates are clipped ("November 10, 2026, 1...").
- **Evidence:** note-info.logic.ts:15-21; NoteInfo.svelte:29-33, 51.
- **Proposal:** Use a short format ("Nov 10, 2026, 10:00"). The tooltip already holds the full value.
- **Impact:** Info shows its data. **Effort:** S
- **Validation:** revise. Dropped the "Unavailable" state.

#### P177. Right-sidebar section titles are indented off their own content
- **Problem:** Info builds its own header with an icon. Relationships and its children use the same label style.
- **Evidence:** SidebarSection.svelte:40-44; NoteInfo.svelte:43-46; PropertiesView.svelte:245, 250; [right-sidebar-default-light.png](screens/right-sidebar-default-light.png).
- **Proposal:** Keep the chevron slot. Render Info through SidebarSection. The Relationships children become 13 px sentence-case row labels ("Belongs to", "Related to", "Has many").
- **Impact:** The sidebar reads as one aligned column. **Effort:** S
- **Validation:** revise. The slot is what aligns the titles.

#### P75. Unresolved outgoing links are dead, dimmed rows
- **Problem:** Each is a div at opacity-60 in red, with no action.
- **Evidence:** OutgoingLinksPanel.svelte:74-80.
- **Proposal:** Make them buttons that create the note, group them under "Broken links", and drop the opacity.
- **Impact:** One-click note creation. **Effort:** M
- **Validation:** keep.

#### P160. The palette's empty query has no Recent section and no key hints
- **Problem:** Recents are prepended to one flat list with no heading, and there is no footer.
- **Evidence:** command-palette.logic.ts:9-17; CommandPalette.svelte:50; QuickSwitcher.svelte:73-95; command-group.svelte:25.
- **Proposal:** With an empty query, show "Recent" and "All commands" groups ("Recent notes" in the switcher), plus a one-line key-hint footer.
- **Impact:** Recents and actions become discoverable. **Effort:** S
- **Validation:** revise.

#### P161. Search operators and the fuzzy toggle are undiscoverable
- **Problem:** `tag:` and `path:` are never shown in the panel, and the fuzzy toggle is a bare "~".
- **Evidence:** SearchPanel.svelte:118, 157, 164-168; help/documentation/06-search-and-navigation.md:139-144.
- **Proposal:** Show one hint line in the empty state ("Try tag:work or path:Projects"). Give the "~" toggle `aria-pressed` and the label "Fuzzy matching".
- **Impact:** The strongest search features become visible. **Effort:** S
- **Validation:** revise. No recent queries.

#### P162. Search panel markup and async status changes are silent to assistive tech
- **Problem:** The input has only a placeholder, the mode buttons have no pressed state, and result buttons contain div and p.
- **Evidence:** SearchPanel.svelte:86-94, 154-162; SearchResult.svelte:136-172.
- **Proposal:** Add `aria-label` on the input and `aria-pressed` on the modes, and use spans inside SearchResult.
- **Impact:** Correct semantics at low cost. **Effort:** S
- **Validation:** revise. No global announce helper.

#### P179. Quick switcher rows are uniform and unlabelled
- **Problem:** Every row has the same icon, paths include ".md", there is no match highlight, and command dialogs show an X.
- **Evidence:** QuickSwitcher.svelte:80-91; file-entries.logic.ts:10-26; command-dialog.svelte:31; dialog-content.svelte:15, 37-42; [quick-switcher-light.png](screens/quick-switcher-light.png).
- **Proposal:** Type icons, folder-only paths, an "Archived" tag, match highlighting, and no X in command dialogs.
- **Impact:** Faster disambiguation of canvas and kanban files. **Effort:** M
- **Validation:** keep.

#### P78. Graph labels collide
- **Problem:** Every label draws above zoom 0.8, with no overlap test.
- **Evidence:** GraphView.svelte:261-267, 428; [graph-view-light.png](screens/graph-view-light.png).
- **Proposal:** Draw labels by priority (degree, then the hovered node and its neighbours) and skip any label that overlaps one already drawn.
- **Impact:** The graph becomes readable. **Effort:** M
- **Validation:** revise. Keep the orphan default.

#### P154. Graph controls: fake switches, native selects and a duplicate Close
- **Problem:** The toggles are plain buttons, the filters are native selects, and Close duplicates the tab's close.
- **Evidence:** GraphControls.svelte:64-70, 84-95, 97-123, 127-138.
- **Proposal:** Use shadcn Switch and Select and remove the Close button. A "Filters (n)" popover is optional.
- **Impact:** Consistent controls. **Effort:** M
- **Validation:** revise. Search keeps filtering, as in Obsidian.

#### P155. The local graph has a fixed depth and no isolated, loading or error state
- **Problem:** Depth is always 1, the canvas is blank while building, and errors only go to the log.
- **Evidence:** GraphView.svelte:65, 81-87, 451-455; graph-view.logic.ts:103.
- **Proposal:** A 1-3 depth stepper, "This note has no links yet", a loading line, and an inline error with Retry.
- **Impact:** The local graph is useful while writing. **Effort:** M
- **Validation:** revise.

#### P156. The graph canvas ignores the open-in-new-tab modifier
- **Problem:** Cmd-click opens the node in the current tab, unlike every other link.
- **Evidence:** GraphView.svelte:352-358; utils/platform.ts:10-31.
- **Proposal:** Honour the platform link modifier (Cmd-click opens a new tab).
- **Impact:** Graph clicks behave like links. **Effort:** S
- **Validation:** revise. Dropped the canvas ARIA work.

#### P157. The Tags tree has no filter box, tiny targets and misaligned leaves
- **Problem:** There is no search, the chevron is unlabelled, and leaf dots sit 12 px off from parent dots.
- **Evidence:** TagsView.svelte:56-76; TagItem.svelte:29-62; TagColorPicker.svelte:32.
- **Proposal:** A filter that matches full paths and expands matching parents, a fixed chevron slot on leaves, and labels on the chevron and dot.
- **Impact:** Faster tag navigation. **Effort:** M
- **Validation:** revise.

#### P187. Tags is a full tab that only hands off to Search
- **Problem:** The Tags tab uses the generic note icon.
- **Evidence:** TagsView.svelte:17-19; commands.ts:286-293; EditorTabs.svelte:69-83.
- **Proposal:** Give the Tags tab its own icon (lucide Tag or Hash). No rail navigator.
- **Impact:** The tab is recognisable. **Effort:** S
- **Validation:** revise.

#### P63. Tasks note-group headers use two lines for one or two tasks
- **Problem:** The folder sits on its own line, and groups are far apart.
- **Evidence:** TasksView.svelte:766-779, 1135; [tasks-all-open-light.png](screens/tasks-all-open-light.png).
- **Proposal:** Put the folder inline after the count (muted, truncated), and tighten spacing from `space-y-6` to `space-y-4`.
- **Impact:** Roughly twice as many tasks per screen. **Effort:** S
- **Validation:** revise. Keeps Issue 236's count.

#### P163. The Tasks Display menu hides the current grouping
- **Problem:** The trigger always reads "Display".
- **Evidence:** TasksView.svelte:930, 936-959.
- **Proposal:** Show the grouping in the trigger ("Display · Note"). A Sort control is an owner question.
- **Impact:** The grouping is visible. **Effort:** S
- **Validation:** revise.

#### P164. The Sources panel exposes AND/OR logic as jargon
- **Problem:** Cards have no "or" separator, and both exclude sections are always expanded.
- **Evidence:** SourcesPanel.svelte:348-495.
- **Proposal:** Add an "or" divider between cards, and collapse Global excludes behind a disclosure with a count.
- **Impact:** Lists get built correctly. **Effort:** S
- **Validation:** revise. Keeps the vocabulary.

#### P165. The Tasks rule sentence says a bare "Edit"
- **Problem:** The same action is called "Edit" in the sentence and "Edit sources" in the empty state.
- **Evidence:** TasksView.svelte:1094; task-query.logic.ts:1466.
- **Proposal:** Rename it to "Edit sources".
- **Impact:** One name for one action. **Effort:** S
- **Validation:** revise. The marker verbs are deliberate (Issue 125).

#### P167. The Tasks search field is low contrast and keyboard-poor
- **Problem:** The placeholder, background and border all sit at `/50`, and there is no shortcut.
- **Evidence:** TasksView.svelte:915-922; global-keybindings.ts:100-105.
- **Proposal:** Full muted-foreground and border tokens. Cmd+F focuses the field while the Tasks tab is active.
- **Impact:** Search is findable and faster. **Effort:** S
- **Validation:** revise. No "/" key (owner decision A8).

#### P180. Dimmed Tasks context rows have no explanation
- **Problem:** Parent rows at opacity-60 read as disabled.
- **Evidence:** TasksView.svelte:803, 812; task-query.logic.ts:55-58.
- **Proposal:** A "Shown for context" tooltip, or a thin left rule instead of opacity.
- **Impact:** Less confusion. **Effort:** S
- **Validation:** keep.

#### P128. Day view stacks two headers and uses a third of the height
- **Problem:** The day is named twice, and the empty all-day row is tall.
- **Evidence:** EventCalendarView.svelte:250-251; EventDayHeaders.svelte:46; EventAllDayLane.svelte:47-49; [calendar-day-light.png](screens/calendar-day-light.png).
- **Proposal:** In day view, move the daily-note button into the week strip and drop the in-grid header. Shrink the empty all-day lane to a thin strip that still accepts clicks.
- **Impact:** More of the timeline is visible. **Effort:** M
- **Validation:** revise.

#### P129. Event creation gestures are hidden
- **Problem:** Each view uses a different create gesture, and none is listed.
- **Evidence:** help/documentation/27-calendar.md:29, 48-52; event-calendar-keys.logic.ts:57-67.
- **Proposal:** Add a "Mouse" group to the calendar shortcuts dialog. An optional hover hint on empty month cells ("Double-click to add").
- **Impact:** Gestures become discoverable. **Effort:** S
- **Validation:** revise. Keeps the gestures.

#### P130. The daily-note icon repeats in every cell and header
- **Problem:** 42 notebook-pen icons read as "edit".
- **Evidence:** EventDailyNoteButton.svelte:28-37; EventMonthGrid.svelte:120; EventDayHeaders.svelte:47; [calendar-month-light.png](screens/calendar-month-light.png).
- **Proposal:** Show it on hover or focus and always on today, with a clearer glyph and the shared Tooltip.
- **Impact:** Less noise. **Effort:** S
- **Validation:** keep.

#### P131. The rail periodic-notes list: silent weekly errors and a hidden "Go to today"
- **Problem:** Weekly-note failures are silent, and "Go to today" exists only as the month title's tooltip.
- **Evidence:** CalendarNavigator.svelte:68-82, 113-120; calendar-rail.service.ts:36-43; [rail-calendar-light.png](screens/rail-calendar-light.png).
- **Proposal:** `openWeeklyNote` shows a toast on failure. Add an explicit "Today" button and make the month label plain text. (The weekday overlap is fixed in P32.)
- **Impact:** Fewer silent dead ends. **Effort:** S
- **Validation:** revise. Dropped the Today row and the existence markers.

#### P132. The rail mini month has no grid semantics
- **Problem:** 48 Tab stops, number-only names, dots-only note days, and a today ring that looks like focus.
- **Evidence:** CalendarGrid.svelte:30-75; KanbanDatePicker.svelte:4.
- **Proposal:** Roving tabindex with arrows (or the bits-ui Calendar), full-date labels with note counts, and a filled or underlined today mark.
- **Impact:** Daily-note navigation by keyboard. **Effort:** M
- **Validation:** revise. Limited to the mini month.

#### P182. Multi-day read-only events look editable but ignore drags
- **Problem:** Only `data-readonly` marks them, and a drag silently does nothing.
- **Evidence:** event-calendar-event.logic.ts:222; EventTimeGrid.svelte:125; EventAllDayLane.svelte:83; event-calendar-day-drag.svelte.ts:54-57; EventBlock.svelte:118; EventPopover.svelte:181-192.
- **Proposal:** A span or lock icon on the block, and a caption in the popover.
- **Impact:** No silent no-op. **Effort:** S
- **Validation:** keep.

#### P183. Today versus selected, and out-of-month cells, in the month grid
- **Problem:** When another day is selected, today keeps only a weak cue. Out-of-month cells look heavier, and the title has a stray comma.
- **Evidence:** EventMonthGrid.svelte:94, 104-111; event-calendar-view.logic.ts:165; [calendar-month-light.png](screens/calendar-month-light.png).
- **Proposal:** Today always keeps a ring and selection is a fill (both when they coincide). Out-of-month cells drop the fill. The title reads "November 2026".
- **Impact:** Easier orientation. **Effort:** S
- **Validation:** revise. No weekend tint.

#### P51. The Settings title scrolls out of view
- **Problem:** The title sits inside the scrolling nav.
- **Evidence:** SettingsPanel.svelte:122-127, 139; [settings-appearance-light.png](screens/settings-appearance-light.png).
- **Proposal:** Move the h-14 title band outside the nav's overflow container.
- **Impact:** The user always knows where they are. **Effort:** S
- **Validation:** revise.

#### P52. There is no search across the 19 settings sections
- **Problem:** 19 sections in 6 groups, with no filter.
- **Evidence:** settings.logic.ts:255-300; SettingsPanel.svelte:44-64, 122-146.
- **Proposal:** If wanted, a filter field above the nav that matches section labels plus a short keyword list per section.
- **Impact:** Faster settings lookups. **Effort:** S
- **Validation:** revise. No per-row index.

#### P53. Dependent settings are described in text but never disabled
- **Problem:** Child toggles stay active while their parent is off.
- **Evidence:** PeriodicNotesSection.svelte:58-63; TroubleshootingSection.svelte.
- **Proposal:** Disable Auto-pin while Auto-open is off, and the log-dependent toggles while no log-to-file option is on.
- **Impact:** No settings that look on but do nothing. **Effort:** S
- **Validation:** revise. Todoist and Sentry are left out.

#### P54. Number fields apply unclamped values on every keystroke
- **Problem:** Clearing a field writes 0 (font size 0, or no width limit), and the debounce field snaps while typing.
- **Evidence:** EditorSection.svelte; MarkdownEditor.svelte:697-698; AutoOrganizeSection.svelte:131-135.
- **Proposal:** Write on input only when the value is finite and in range, and clamp on change. Move the debounce clamp to change.
- **Impact:** The editor stops jumping while the user types. **Effort:** S
- **Validation:** revise.

#### P80. The Todoist "Root project" control overflows onto its description
- **Problem:** The control is wider than SettingItem's 50% column.
- **Evidence:** TodoistSection.svelte:123-148; SettingItem.svelte:37; [settings-todoist-light.png](screens/settings-todoist-light.png).
- **Proposal:** Use the stacked SettingItem layout for that row.
- **Impact:** Fixes a visibly broken row. **Effort:** S
- **Validation:** revise.

#### P79. The Todoist status chip is not actionable
- **Problem:** The chip is a span, and its error text exists only in a hover title.
- **Evidence:** TodoistSyncStatus.svelte:17-30; commands.ts:275-284.
- **Proposal:** Make the chip a button that opens the sync log, and put "Sync now" and the last error at the top of the log.
- **Impact:** A failing sync gets a recovery path. **Effort:** M
- **Validation:** revise.

#### P81. The template picker hides the chosen template and silently opens existing files
- **Problem:** The naming step does not name the template. An existing name opens that note without a word, and there is no back step.
- **Evidence:** TemplatePicker.svelte:69-70, 84-89; templates.service.ts:55-69; note-creator.service.ts:87-90.
- **Proposal:** Show a "Creates <name>.md in the vault root" line and a template chip. Change the hint to "Enter opens the existing note" when the name exists. Backspace on an empty name goes back.
- **Impact:** No surprises when creating from a template. **Effort:** S
- **Validation:** revise. The root destination is by design.

#### P124. Path and format fields have no validation or preview
- **Problem:** Paths are truncated free text, and formats show no example.
- **Evidence:** PeriodicNotesSection.svelte:20-131; OneOnOneSection.svelte:55-85; EventMonthGrid.svelte:57-62.
- **Proposal:** A live example under each format ("Today: Daily/2026-11-17.md"), a muted "File not found" under template paths, and the stacked layout.
- **Impact:** Catches misconfigured daily features. **Effort:** M
- **Validation:** revise. Keeps "Day starts at".

#### P125. Periodic Notes repeats five identical Format and Template blocks
- **Problem:** Ten near-identical rows.
- **Evidence:** PeriodicNotesSection.svelte:34-131; [settings-periodic-notes-light.png](screens/settings-periodic-notes-light.png).
- **Proposal:** One compact table (period, format, template, example), designed together with P124.
- **Impact:** Fits one screen. **Effort:** M
- **Validation:** revise.

#### P126. The update "Check" button also downloads and installs
- **Problem:** The label under-promises, the size can show "?", and progress is plain text.
- **Evidence:** UpdateSection.svelte:122-126, 167-210, 266, 276.
- **Proposal:** Rename it "Check and download", add a progress bar, hide an unknown size, and wrap the handler.
- **Impact:** A predictable update flow. **Effort:** S
- **Validation:** revise.

#### P169. The mods list shows load times, not what each mod does
- **Problem:** The manifest description is parsed and then dropped.
- **Evidence:** mods.logic.ts:223; mods.store.svelte.ts:4-24; ModsStatusList.svelte:112-119.
- **Proposal:** Carry the description into ModStatusEntry and show it under the name. Load time moves to a tooltip.
- **Impact:** The list becomes usable. **Effort:** S
- **Validation:** revise. Load errors already show inline.

#### P170. The mod run view's status, progress and Stop are not legible
- **Problem:** Running, Done and Failed look alike, the progressbar has no name, and Stop gives no feedback.
- **Evidence:** ModActionPicker.svelte:108, 111-117, 134-135, 145; mods-host.service.ts:391.
- **Proposal:** "Stopping..." on Stop, coloured status labels, and `aria-label` on the progressbar.
- **Impact:** Long runs are legible at a glance. **Effort:** S
- **Validation:** revise.

#### P146. The rule filter borrows collection-view wording and has two add buttons
- **Problem:** A rule shows "This view", two add buttons sit side by side, and offsets use a margin hack.
- **Evidence:** FilterPanel.svelte:149, 158-162, 202-211; AutoOrganizeRuleRow.svelte:332-355; [auto-organize-rule-builder-light.png](screens/auto-organize-rule-builder-light.png).
- **Proposal:** Label the block "When", merge the two into one "Add condition" dropdown, and use a shared two-column grid.
- **Impact:** Rules read as sentences. **Effort:** M
- **Validation:** revise.

#### P147. Property rows pack six controls and unexplained jargon
- **Problem:** Six controls share a row, and the mode "always" hides that it overwrites.
- **Evidence:** AutoOrganizeRuleProperty.svelte:51-56, 222-352.
- **Proposal:** Verb labels ("Set if missing", "Always overwrite", "Remove", "Add to list") with one-line descriptions. Collapse the source and type choosers while they are at their defaults.
- **Impact:** The common actions explain themselves. **Effort:** M
- **Validation:** revise.

#### P148. Rule validation errors are not tied to their fields
- **Problem:** The inputs are never marked `aria-invalid`, and the name and folder inputs use placeholders only.
- **Evidence:** AutoOrganizeRuleRow.svelte:288-293, 392-407, 449-458; AutoOrganizeRuleProperty.svelte:354-364; input.svelte:30.
- **Proposal:** Set `aria-invalid` (which turns on the existing red border) and `aria-describedby`. Lead each message with "Not saved:", and add the missing labels.
- **Impact:** The bad field is highlighted. **Effort:** S
- **Validation:** revise. The errors are already text, not colour-only.

#### P149. New rules are added below the fold without focus
- **Problem:** "Add rule" sits at the top while the new card appears at the bottom, and focus does not move.
- **Evidence:** AutoOrganizeSection.svelte:49-60, 145; AutoOrganizeRuleRow.svelte:161-179, 344-352, 427-438.
- **Proposal:** Scroll the new card into view and focus its name input. A new property or expression row focuses its first input.
- **Impact:** No "did it work?" moment. **Effort:** S
- **Validation:** revise.

#### P150. Excluded folders accept anything and give no feedback
- **Problem:** Duplicates are ignored silently, nothing checks that the folder exists, and the placeholder reads like a value.
- **Evidence:** AutoOrganizeSection.svelte:90-97, 184-191, 202; [settings-auto-organize-light.png](screens/settings-auto-organize-light.png).
- **Proposal:** Folder suggestions through a datalist, "Already excluded", a mark on chips for missing folders, an "e.g. _templates" placeholder, and "No excluded folders" when empty.
- **Impact:** Fewer exclusion typos. **Effort:** S
- **Validation:** revise.

#### P151. A legacy "file icon" button duplicates the _icon property
- **Problem:** Two controls set an icon, under two names and two conditions.
- **Evidence:** AutoOrganizeRuleRow.svelte:408-421, 540-549; auto-organize.service.ts:359-364, 666-685; .scratch/frontmatter-rules/PRD.md:43.
- **Proposal:** Show the legacy button only on rules that already set `rule.icon`, labelled "Legacy icon on move", with a hint that points to `_icon`.
- **Impact:** One way to set an icon. **Effort:** S
- **Validation:** revise. No data migration.

#### P185. A disabled rule looks almost identical to an enabled one
- **Problem:** Only the switch shows the state.
- **Evidence:** AutoOrganizeRuleRow.svelte:285, 294-297; AutoOrganizeSection.svelte:55-56.
- **Proposal:** An "Off" pill next to the switch, a dashed border on disabled cards, and a focus-within border. Inputs keep full opacity.
- **Impact:** Live rules are visible at a glance. **Effort:** S
- **Validation:** revise.

#### P106. The vault picker and first paint ignore the last theme
- **Problem:** `app.html` ships with the dark class, so the picker and the first paint use the fallback theme.
- **Evidence:** app.html:2; settings.service.ts:251; theme.service.ts:54; [vault-picker-light.png](screens/vault-picker-light.png).
- **Proposal:** Call `applyStoredTheme()` in the main window at boot. Pairing light and dark with "Match system" is an optional later feature.
- **Impact:** No wrong-theme launch. **Effort:** S
- **Validation:** revise.

#### P107. The theme editor exposes 128 raw tokens with no simple mode or reset
- **Problem:** Hex rows only, buildTheme is not used, Cancel discards without asking, and swatches are unlabelled.
- **Evidence:** ThemeEditor.svelte:67-77, 149, 173-184; ThemeColorRow.svelte:51-61; theme-builder.logic.ts:19.
- **Proposal:** A "Simple" mode that edits the CorePalette through buildTheme, with raw tokens as advanced overrides and a per-token reset. Confirm Cancel on a dirty draft, and label the swatches.
- **Impact:** A usable theme in minutes. **Effort:** L
- **Validation:** revise. The live preview already exists.

#### P108. The theme catalog reports the same failure twice and does not finish the install
- **Problem:** A failure shows both a toast and an inline error, and Install does not apply the theme.
- **Evidence:** AppearanceSection.svelte:44-68, 260-289; [settings-appearance-light.png](screens/settings-appearance-light.png).
- **Proposal:** Remove the toast, keeping the inline error and Retry, and add "Install and apply".
- **Impact:** Quieter offline use. **Effort:** S
- **Validation:** revise. No caching, per ADR-0035.

#### P86. Six segmented controls with five selected looks, and only one has ARIA
- **Problem:** Each control has its own selected look, and disabled search modes give no reason.
- **Evidence:** KanbanView.svelte:465-483; EventCalendarHeader.svelte:110-121; GraphControls.svelte:29-31; SearchPanel.svelte:86-93; CollectionView.svelte:536; ThemeEditor.svelte:176-180.
- **Proposal:** One SegmentedControl (raised-pill selection, a tooltip reason on disabled items, roving arrows, `aria-pressed` or radiogroup) for kanban, graph, search and the calendar D/W/M. Collection and theme tabs get tab semantics.
- **Impact:** The same look and keyboard model for view switching. **Effort:** M
- **Validation:** revise. Keeps the one-letter D/W/M.

#### P87. Interactive controls are nested inside other interactive controls; theme-row Edit also selects the theme
- **Problem:** Pressing Enter on a theme row's Edit or Duplicate also selects and saves that theme. Buttons nest inside buttons.
- **Evidence:** AppearanceSection.svelte:133, 171-178, 191-210; CollectionView.svelte:594-670; NoteRow.svelte:113-122; SnapshotList.svelte:49-58.
- **Proposal:** Stop the theme row selecting on keydowns from its children (a radio group with sibling actions). Use the `child` snippet for triggers, and make the pills and the snapshot icon real buttons.
- **Impact:** Removes a class of keyboard bugs. **Effort:** S
- **Validation:** revise.

#### P90. Async dialogs and actions have no pending-to-done loop
- **Problem:** TypeNameDialog closes before its work finishes, so a failure loses the typed name. A type rename shows no progress.
- **Evidence:** TypeNameDialog.svelte:40-45; type-definitions.service.ts:185-188.
- **Proposal:** Keep the dialog open with a busy confirm button until `onConfirm` resolves, and show failures inline. A rename shows "Updating notes...".
- **Impact:** Input is never lost. **Effort:** S
- **Validation:** revise. ViewDialog and Trash are already fine.

#### P92. Floating surfaces bypass the elevation tokens, and dialogs come in 6 widths
- **Problem:** Settings uses a literal shadow, hand-built menus use alpha literals, and dialog widths are ad hoc.
- **Evidence:** SettingsPanel.svelte:116; CanvasContextMenu.svelte; CanvasFilePicker.svelte; CanvasLinkInput.svelte.
- **Proposal:** Use `var(--shadow-xl)` and the elevation tokens, and add a Dialog size prop (sm, md, lg). A scrim is an owner decision.
- **Impact:** Floating surfaces stay consistent in every theme. **Effort:** M
- **Validation:** revise.

#### P93. Chips and badges are rebuilt in every feature
- **Problem:** Tags, counts and dates use different chip styles in each feature.
- **Evidence:** NoteRow.svelte:103, 114, 124; KanbanCardText.svelte:37-38; Rail.svelte.
- **Proposal:** A small Badge primitive (count, tag, type, date), adopted when code is next touched, starting with NoteRow and kanban.
- **Impact:** Metadata is recognisable in every view. **Effort:** M
- **Validation:** revise.

#### P94. Primitive gaps make features hand-roll their controls
- **Problem:** Four native selects (kanban sort, graph filters) sit next to the Select primitive.
- **Evidence:** KanbanView.svelte sort select; GraphControls.svelte:100, 113; [kanban-board-dark.png](screens/kanban-board-dark.png).
- **Proposal:** Replace the native selects with Select. Add Checkbox and Textarea only when their call sites are touched.
- **Impact:** Fixes land once. **Effort:** S
- **Validation:** revise.

#### P171. Motion has no tokens, and reduced motion is honoured in one place
- **Problem:** The only reduced-motion rule is in EventCalendarView. Spinners, pulses and smooth scroll ignore the OS setting.
- **Evidence:** EventCalendarView.svelte:284; SettingsPanel.svelte:117.
- **Proposal:** A base `prefers-reduced-motion` CSS block for spin, pulse and smooth scroll. Svelte transitions read the reduced-motion query (check the installed `svelte/motion` API first).
- **Impact:** Respects the OS setting. **Effort:** S
- **Validation:** revise. Keeps the drawer distance.

#### P172. Copy and casing drift across the app
- **Problem:** Mixed casing, both "Failed to" and "Could not", two ellipsis styles, "1 words", hard-coded "(Cmd+D)", and "Source mode" next to "Show raw Markdown".
- **Evidence:** EditorView.svelte:101-128; NoteActionBar.svelte:148; WordCount.svelte:33; settings-copy.test.ts.
- **Proposal:** One pass over user-visible strings only (toasts, labels, titles, empty states). Extend `settings-copy.test.ts` for settings.
- **Impact:** One voice. **Effort:** M
- **Validation:** revise. Log messages are out of scope.

#### P174. Token hygiene: radii, raw font sizes, icon sizes, the duplicated dark fallback, z-index
- **Problem:** 28 raw `text-[Npx]` sites, px radii in kb-ui, no z-index scale, and unused Separator imports.
- **Evidence:** chrome-type-scale.test.ts; MyPeopleSection.svelte:58; CalendarGrid.svelte:57; BacklinksPanel.svelte:6; OutgoingLinksPanel.svelte:6.
- **Proposal:** Remove the unused imports. Extend `chrome-type-scale.test.ts` to forbid `text-[Npx]` where a text role exists, and add radius and z-index tokens. Ticket the dark fallback and the stale "today" separately.
- **Impact:** New code stays on the scale. **Effort:** S
- **Validation:** revise. Split it when ticketing.

#### P175. No pressed state, and the cursor policy is split between hand and arrow
- **Problem:** 288 hover variants against 4 `active:` variants. 88 cursor-pointer against 54 cursor-default.
- **Evidence:** KanbanLane.svelte:236; KanbanCard.svelte:218; TasksView.svelte:812; SearchResult.svelte:137; NoteRow.svelte:70; FilesNavigator.svelte:296.
- **Proposal:** A pressed fill one step stronger than hover, and the macOS convention: arrow cursor on chrome, hand only on links.
- **Impact:** A native, consistent feel. **Effort:** S
- **Validation:** keep.

## 3. Rejected during validation

- **P60** Overdue tasks buried: already handled by Group by Due and the Due quick filter; the fixed sort is an Issue 112 decision.
- **P61** Five date-urgency styles: conflicts with Issue 109's accepted tone, and mixes different concepts (1:1 cadence is not a deadline).
- **P62** Task row actions far from the text: right-click anywhere on the row and Shift+F10 already open the menu (Issue 241).
- **P73** Unlinked mentions not shown: removed on purpose in commit 77c8cbcda; the leftover service code is dead code to report.
- **P96** Developer jargon in copy: for this owner the literal keys are the actionable part.
- **P100** Full views keep the note list: the left panels are navigation, and Cmd+1 already hides them.
- **P101** A .view has two homes: the split is documented (ADR-0027 amendment, help doc 25), and the cited evidence was wrong.
- **P118** Italic means unorganized: a deliberate, documented cue that the owner designed.
- **P166** Three rows of chrome in Tasks: the evidence is wrong, and the rule sentence is the core of Issue 108.
- **P168** Due date and priority shortcuts: bare-letter keys go against owner decision A8.
- **P173** View/pin/toggle vocabulary: the labels are already explicit, and "toggle" is accurate.
- **P178** Labs and Advanced structure: the placement follows each setting's prerequisite.
- **P181** Tasks list column width: it is already responsive (hides below 720 px) and holds saved views.
- **P184** Canvas marked modified on open: a capture-fixture artifact (2-space JSON); files the app writes round-trip unchanged.

## 4. Coverage gaps

No work is missing from the review pipeline. Known limits of the evidence:
- Screenshots come from a mocked browser E2E harness, not the Tauri window. Mock data affects some observations ("just now" times, the "Note" subtitle, word counts, the offline catalog toast).
- Runtime-only claims were traced in code but not reproduced: P82 (QueryJS paging), P152 (index-keyed rows), and the Escape and popover interaction in P31.
- The Tags panel was not found in the right sidebar during capture. Tags was reviewed as a tab view only.
- No VoiceOver pass was run. The accessibility findings come from code and contrast arithmetic.
