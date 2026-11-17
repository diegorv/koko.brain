# Design review: merged proposals

These proposals merge the raw findings from 15 area reviews and 5 lenses (design-system, ia-navigation, a11y-keyboard, feedback-motion, type-color-density). A lens finding takes in the matching area findings, and all of their evidence is kept. Proposals are ordered by tier (clear, moderate, polish), then by impact on daily use: kanban, tables, canvas, meta-bind, Quick Capture and keyboard-first navigation.

Tier counts: clear P01-P82, moderate P83-P170, polish P171-P187.

---

## Clear

### P01 Destructive actions follow four policies; kanban, rules, themes and properties delete with no confirm or undo
- Tier: clear | Category: feedback-states | Effort: M
- Areas: kanban, auto-organize, appearance themes, properties, tasks group rules, trash, file history, mods
- Sources: lens:feedback-motion, lens:design-system, area:kanban, area:organize, area:settings, area:links, area:tasks, area:plugins-misc
- Problem: Moving a note to Trash, which can be undone, blocks on a native confirm and offers no undo. Deleting a kanban card, lane or archived card, a user theme, an auto-organize rule or a property, and Tasks "Clear" or "Hide this note", happen at once with no confirm and no undo, and several of these buttons appear only on hover. Restoring from File History asks for confirmation even though Cmd+Z reverses it. Destructive mod dialogs put initial focus on the destructive button, so Enter confirms. Undo toasts last 4 s. In total there are three confirmation looks: the native ask(), the in-app ModDialogHost, and nothing.
- Evidence: KanbanView.svelte:106,124,301-313,338-340; KanbanCard.svelte:259-262; KanbanLane.svelte:295-303,356; kanban.logic.ts:484-489; AutoOrganizeRuleRow.svelte:316-323; AutoOrganizeSection.svelte:67-70; AppearanceSection.svelte:92-103,190; PropertiesView.svelte:133; PropertyField.svelte:159,176; TasksView.svelte:343-364,732-746,1085-1099; ask() in TrashSection.svelte:34,49, UpdateSection.svelte:238, delete-note.service.ts:14, editor.service.ts:376, NoteRowMenu.svelte:163, FileHistoryDialog.svelte:11,44-47, FilesNavigator.svelte:196; ModDialogHost.svelte:74-79,132-139; Undo precedent tasks.service.ts:265,482-493 and event-calendar.service.ts:1468-1480.
- Proposal: Apply one rule. Reversible actions (Trash moves, event and card deletes, rule, property and theme removal, Tasks hide and clear, File History restore) act immediately and show an Undo toast that lasts about 8 s and pauses on hover. Kanban takes a snapshot of the serialized board so Undo can restore it. Only irreversible or bulk actions confirm (Delete permanently, Empty trash, a lane that holds cards, Todoist caps). They use one in-app confirmAction AlertDialog that states the count ("Delete lane In progress and its 4 cards?"), with Cancel focused. The rule delete moves into a "..." menu (Duplicate, Move up, Move down, Delete). The native sheet is kept only for app-level prompts.
- Impact: A stray Backspace or a mis-click no longer deletes a lane, a rule or a theme for good, and the safest action stops costing an extra dialog.

### P02 Kanban cards cannot move between lanes while a sort or filter is active
- Tier: clear | Category: interaction | Effort: M
- Areas: kanban drag and drop
- Sources: area:kanban
- Problem: canReorder exists to protect in-lane indexes, but it also turns off drag between lanes, a move that needs no index. Nothing explains why drag stopped. There is no menu or keyboard way to move a card, lane drags show no insertion line, and Escape does not cancel a drag.
- Evidence: KanbanView.svelte:173,434-456,534; KanbanCard.svelte:160-162,217; kanban.logic.ts:933; kanban-board-light.png.
- Proposal: Card drag is always on. When reordering is not valid, a drop appends the card to the end of the target lane without an insertion line. Add a "Manual order paused (sorted/filtered)" chip next to the sort control, a "Move to lane" submenu in the card menu and Cmd+Arrow to move a card. Add a lane insertion indicator and Escape to cancel.
- Impact: Restores the main kanban action for a user who sorts by date or filters by tag.

### P03 The kanban key handler hijacks native keys and acts on hidden or wrong cards
- Tier: clear | Category: accessibility | Effort: M
- Areas: kanban keyboard
- Sources: area:kanban, lens:a11y-keyboard
- Problem: One root keydown handler runs in board, list and table modes, reads the unfiltered board.lanes and skips only INPUT, TEXTAREA and SELECT. After any arrow key, Enter, Space or Backspace on a focused button runs the card action in the store. In list and table mode Delete removes a card the user cannot see, and with a filter on, the ring index points at the wrong card. Cards cannot take focus, focus is virtual (the board never scrolls to it), and nothing tells the user the shortcuts exist.
- Evidence: KanbanView.svelte:236-326,240,242,460,527; KanbanCard.svelte:157-165; kanban.store.svelte.ts:13-17.
- Proposal: Use real DOM focus on cards with a roving tabindex, and run card shortcuts only when the card itself is the event target. Limit the handler to board mode and compute indexes from the lanes on screen. Add a focus-visible ring, a shortcut hint (tooltip or "?" popover), and reset focus when the view mode or filter changes.
- Impact: The keyboard can no longer delete or toggle the wrong card on the owner's daily board.

### P04 Renaming a kanban lane silently resets its settings, and new lanes share one settings entry
- Tier: clear | Category: feedback-states | Effort: S
- Areas: kanban lane settings
- Sources: area:kanban
- Problem: Lane settings (auto-complete, card limit, collapsed) are keyed by the lane title. A rename drops them and leaves a stale entry behind. Every new lane is titled "New Lane", so new lanes share one entry.
- Evidence: kanban.logic.ts:492-498,595,616,647; KanbanView.svelte:128-133.
- Proposal: Move the settings entry to the new key on rename. Give new lanes unique titles ("New lane 2"). Block or suffix a rename that would collide with an existing title. Later, key lane settings by lane id.
- Impact: A configured Done lane no longer stops auto-completing after a rename.

### P05 The kanban add-card input and lane and card actions appear only on hover or right-click
- Tier: clear | Category: interaction | Effort: M
- Areas: kanban lanes and cards
- Sources: area:kanban
- Problem: The add-card form stays at opacity 0 until hover and scrolls away at the bottom of a long lane. Empty lanes have no placeholder. Lane actions live only in a context menu on the title h3, and card actions only in the card menu. The header indicators (the auto-complete check and n/max) have no explanation.
- Evidence: KanbanLane.svelte:257-304,308-313,316-384,356; KanbanCard.svelte:225-262; kanban-board-light.png.
- Proposal: Pin a persistent "+ Add card" ghost row below each lane's scroll area. Empty lanes say "No cards. Drag one here or add a card." Add a "..." lane header button that opens a shadcn DropdownMenu, shown on hover and on focus. Add tooltips to the indicators ("Cards moved here are checked", "Limit 5, 6 cards").
- Impact: Adding a card, the most frequent kanban action, is always visible.

### P06 Wide kanban boards hide lanes, Add lane and Archive, and collapsing a lane frees no space
- Tier: clear | Category: layout-density | Effort: M
- Areas: kanban board layout
- Sources: area:kanban
- Problem: At 1440 px three lanes fit, and the fourth sits off-screen with no fade and no visible scrollbar. Add lane and Archive come after the last lane. A collapsed lane keeps its full width.
- Evidence: KanbanView.svelte:516,567-574,577-620; KanbanLane.svelte:215,316; kanban-board-light.png, kanban-board-dark.png.
- Proposal: Add edge fades and a visible scrollbar when lanes overflow. Put "Add lane" and "Archive (n)" in the toolbar. A collapsed lane becomes a 40 px vertical rail that shows the title and count and still accepts drops. Scroll a new lane into view.
- Impact: Boards with 4 or more lanes become navigable, and collapsing a lane becomes useful.

### P07 A corrupt or half-edited canvas JSON shows as an empty board, and the next edit overwrites the file
- Tier: clear | Category: feedback-states | Effort: M
- Areas: canvas parse and persist
- Sources: area:canvas
- Problem: parseCanvas swallows the parse error and returns an empty canvas. The first add, move or delete then persists and replaces the broken text. Source mode is one click away, so hand edits reach this state easily.
- Evidence: canvas.logic.ts:40-48; CanvasInner.svelte:120-132,603-609; EditorView.svelte:109-118.
- Proposal: Track a parse-error state. Show a banner, "This canvas file is not valid JSON", with an "Open source mode" button, hide the add hint, and refuse to persist until the file parses again.
- Impact: Prevents silent data loss on hand-edited canvases.

### P08 An unreadable auto-organize config is reset and then overwritten, and save failures are silent
- Tier: clear | Category: feedback-states | Effort: M
- Areas: auto-organize persistence
- Sources: area:organize, lens:feedback-motion
- Problem: When auto-organize-rules.json fails to parse, the loader resets to the defaults without a word. The page shows "No rules configured", and the next edit saves that empty config over the file. Save errors only reach the log. There is no "saved" cue, and the empty box renders before the config has loaded.
- Evidence: AutoOrganizeSection.svelte:32-39,156-158; auto-organize.service.ts:132-135,196-199; auto-organize.store.svelte.ts isConfigLoaded is not used by the UI.
- Proposal: On a load failure, leave the file untouched and keep a .bak copy. Show an inline banner ("Your rules file could not be read. Nothing was changed. Open file / Retry") and block saves until it is resolved. On a save failure, show an error toast with Retry. Add a "Saved" tick after each write, and show a skeleton until isConfigLoaded is true.
- Impact: Protects the owner's rule set from silent loss.

### P09 Result tables in notes break words mid-word and cannot scroll (collection and QueryJS)
- Tier: clear | Category: layout-density | Effort: S
- Areas: collection live-preview widget, QueryJS block
- Sources: area:editor, area:collection, area:plugins-misc
- Problem: The widget tables inherit CodeMirror's overflow-wrap: anywhere and have no overflow container, so cells break words ("priori ty", "Dieg o") and dates split across lines. The QueryJS table prints absolute paths, and its Run and Prev/Next buttons have no focus-visible style. The full-tab table avoids the wrapping with whitespace-nowrap.
- Evidence: styles.ts:593-607,954-967,973-975,917-933,984-996; node_modules/@codemirror/view/dist/index.js:6917-6918; collection-block-widget.ts:432-471; CollectionTableView.svelte:61; collection-and-queryjs-block-light.png.
- Proposal: Reset word-break and overflow-wrap on both tables. Use nowrap with a max-width, ellipsis and a title for text cells, and plain nowrap for date and number columns. Wrap the table in an overflow-x:auto container with a right-edge fade. Show vault-relative paths. Add a --ring focus-visible style to the QueryJS buttons.
- Impact: Dashboard notes become legible without changing any query.

### P10 Tables in the editor cannot be edited as tables
- Tier: clear | Category: interaction | Effort: L
- Areas: editor table widget
- Sources: area:editor
- Problem: Editing a cell drops into raw pipes with no alignment and no Tab to the next cell. The +row handle is 6 px tall with a 6 px glyph and shows only on hover. Both add buttons have only a title.
- Evidence: styles.ts:411-433,443-449; widgets.ts:468-491; editor-live-preview-scrolled-light.png.
- Proposal: In raw mode, Tab and Shift+Tab move between cells, Tab in the last cell adds a row, and pipes are padded into columns on Tab or when the cursor leaves the table. In rendered mode, show an edge add handle with a target of at least 20 px, revealed on hover and on focus, plus a cell menu with delete row or column and alignment.
- Impact: Removes manual pipe typing for a daily table user.

### P11 Frontmatter renders as a giant heading in source mode and on canvas note cards
- Tier: clear | Category: consistency | Effort: S
- Areas: editor source mode, canvas FileNode
- Sources: area:editor, area:canvas
- Problem: In source mode the closing --- turns the YAML into a Setext H2: the text is drawn about 1.6x larger, tags are underlined and line numbers drift. Canvas note cards pass the raw text to renderCanvasMarkdown, so the main content of every typed note card is "_type: Meeting" set as a heading.
- Evidence: highlight-styles.ts:60-67,86-88; setup/editor-extensions.ts:99-107; parsers/frontmatter.ts:17 (findFrontmatterBlock); FileNode.svelte:82-83; embed-resolver.logic.ts:53 (stripFrontmatter); editor-source-mode-light.png; canvas-view-light.png.
- Proposal: In source mode, decorate the range found by findFrontmatterBlock at body size and weight in the code/meta colour, and highlight keys differently from values. In canvas cards, strip the frontmatter through a logic-layer wrapper around the existing helper so the card shows the first body lines.
- Impact: Source mode becomes usable for editing properties, and canvas note cards become readable.

### P12 Canvas colours are dark-only: edges, grid, minimap and overlays vanish or turn heavy in light themes
- Tier: clear | Category: color-theming | Effort: M
- Areas: canvas
- Sources: area:canvas
- Problem: The xyflow variables are hard-coded white-alpha: the edge stroke is 0.3, the grid 0.05, the borders 0.15, and the minimap mask is 60% black. Menu hover, separators, picker fills, the "+ Add card" border, the "none" colour dot and node borders use rgba(255,255,255,x) too. Node tints append "20" to a hex string. The effect on overlays was derived from the code, not rendered.
- Evidence: CanvasInner.svelte:743-744,757-775,761,792,796; CanvasContextMenu.svelte:181-211; CanvasFilePicker.svelte:91,103,134; CanvasLinkInput.svelte:91,108-109; LinkNode.svelte:199-200; ColorPicker.svelte:69; canvas.logic.ts:149-151; TextNode.svelte:57; canvas-view-light.png.
- Proposal: Derive the stroke, grid, border, minimap and overlay colours from tokens (--border, --accent, --muted, color-mix with --foreground), and use color-mix for node tints. Use a light mask in light themes. Check the result in Lavender Haze and in the dark default.
- Impact: Connections, the main thing a canvas shows, become legible in the light theme.

### P13 Canvas groups and edges cannot be labelled from the UI
- Tier: clear | Category: information-architecture | Effort: M
- Areas: canvas GroupNode, CanvasEdge, context menu
- Sources: area:canvas
- Problem: Groups are created with an empty label. The "Edit label" item exists but is not wired, and the oneditlabel, onopenfile and onopenurl props are never passed. The docs send users to JSON source mode. Existing group labels are 12 px muted text.
- Evidence: GroupNode.svelte:21-23,36-44; CanvasInner.svelte:550,635-686,653; CanvasContextMenu.svelte:127-136,150-154; help/documentation/11-canvas.md.
- Proposal: Double-click a group header or an edge label to edit it inline. Add "Rename" to the group menu and wire "Edit label" on edges. Show group labels as a 13 px foreground header chip. Wire or remove the dead props.
- Impact: Named groups and labelled arrows become possible without leaving the canvas.

### P14 Quick Capture success is invisible, and clipboard captures give no feedback
- Tier: clear | Category: feedback-states | Effort: M
- Areas: quick capture, composer
- Sources: area:plugins-misc
- Problem: A capture writes the note without a toast. The composer flashes a 3 px ring for 180 ms and hides. The clipboard path has no UI at all, and the user never learns the folder or the file name.
- Evidence: deep-link-actions.ts:206-223; src-tauri/src/quick_capture has no notification code; routes/composer/+page.svelte:141-151.
- Proposal: Show a toast in the main window for every capture kind: "Captured to Inbox/2026-11/capture-...md", with an Open action. In the composer, show a check and "Saved" for about 600 ms before hiding.
- Impact: Builds trust in a daily feature.

### P15 The composer says "ESC cancels" but keeps the draft, and saving is hidden
- Tier: clear | Category: content-copy | Effort: S
- Areas: composer
- Sources: area:plugins-misc
- Problem: Esc only hides the window: the draft persists and comes back on the next summon with no cue. There is no "Saving..." state during the wait of up to 3 s, and Cmd+Enter on an empty composer silently dismisses it.
- Evidence: routes/composer/+page.svelte:14,41,105-110,166-198,255.
- Proposal: Change the hint to "Esc hides (draft kept). Cmd+Enter saves". When a draft is restored, show "Draft restored" with a Discard link. Show "Saving..." while waiting. Add a clear-draft shortcut.
- Impact: Removes the fear of losing text, or of sending stale text, in the fast-capture path.

### P16 Errors go to the wrong channel, to both channels, or nowhere
- Tier: clear | Category: feedback-states | Effort: M
- Areas: search, tags, Labs, fonts, log session, File History, Trash, settings
- Sources: lens:feedback-motion, area:settings, area:finders, area:links
- Problem: The code has 104 toast.error calls and 9 inline alerts. Failures of the view on screen become 4 s toasts, while others reach no one: a search error shows "No results found", a tag index failure leaves a stale tree, a failed Labs mod start leaves the switch on, a font list failure hides Browse, initLogSession has no catch, and a failed File History restore is an unhandled rejection. Trash errors print raw error objects.
- Evidence: search.service.ts:268-269; SearchPanel.svelte:119; tags.service.ts:52-53; LabsSection.svelte:21-29; EditorSection.svelte:18-24,54; TroubleshootingSection.svelte:44-46,149-151; FileHistoryDialog.svelte:50; TrashSection.svelte:28,42,57; good models RailNoteList.svelte:872-891, CollectionView.svelte:504-507.
- Proposal: Route by what failed. A failure of what is on screen renders inline at that place with the cause and a Retry or fix, and no toast. A failure of a background action becomes a toast that stays until dismissed. Never only log an error, never use both channels, and never show a raw error object. Revert switches when the action behind them fails.
- Impact: Ends silent failures, which a sole user with no support channel cannot otherwise notice.

### P17 Toasts ignore the theme, and error toasts vanish after 4 seconds
- Tier: clear | Category: feedback-states | Effort: M
- Areas: svelte-sonner Toaster
- Sources: area:foundation, lens:feedback-motion
- Problem: richColors takes the library's colours instead of the theme tokens. The 103 error toasts use the 4000 ms default, there is no close button and no copy action, and a toast covers the content under it.
- Evidence: AppOverlays.svelte:16; node_modules/svelte-sonner/dist/Toast.svelte:3; overrides at settings.service.ts:210 and sync-scheduler.service.ts:261,275; settings-appearance-dark.png, settings-editor-light.png.
- Proposal: Build one token-styled toast: popover surface, 1 px divider, a 3 px left accent by severity, and foreground text. Errors stay until dismissed, or for 10 s with pause on hover, and get a close button and "Copy details". Reversible actions get an Undo action (P01). One helper maps severity to duration.
- Impact: Every error and confirmation is readable and themed, and can be recovered from.

### P18 Every view builds its own header, and kanban, canvas and .view tabs lack note chrome
- Tier: clear | Category: consistency | Effort: L
- Areas: app shell, editor tabs, kanban, canvas, collection, graph, tasks, calendar, tags, navigators
- Sources: lens:design-system, lens:ia-navigation, lens:type-color-density, area:shell, area:editor, area:kanban, area:canvas
- Problem: The 40 px top band is pasted inline 10 times, and pane titles use 7 treatments. Kanban, Collection, Graph and Canvas have no title, and Canvas and Graph float their controls over the content. The source toggle sits bottom-right for kanban and .view files and top-right for canvas, with mismatched title and aria text. The canvas add toolbar uses a bottom: 118px magic offset. Non-note tabs get no breadcrumb, favorite, reveal, history or More menu. Cmd+\ flips only the markdown live-preview flag. Only .view files and types can be pinned to the rail.
- Evidence: AppShell.svelte:256,276; EditorView.svelte:31-35,68-70,80-91,97-149,154; Rail.svelte:270; FilesNavigator.svelte:304-309; TypesNavigator.svelte:216-221; CalendarNavigator.svelte:87-92; RailNoteList.svelte:716-723; SearchPanel.svelte:74-76; EditorTabs.svelte:117; TasksView.svelte:906; EventCalendarHeader.svelte:38; TagsView.svelte:51; SidebarSection.svelte:46-47; GraphControls.svelte:26; CanvasToolbar.svelte:45-46; KanbanView.svelte:462,486-497; editor.service.ts:437-439; NoteRowMenu.svelte:256-266; lens.logic.ts:219-229; kanban-board-light.png, canvas-view-light.png, view-file-table-light.png, graph-view-light.png.
- Proposal: Add a pane-band utility and make text-title (15/600, foreground) the only pane-title role. Give every file-backed tab one FileToolbar: type icon and title, then the view controls, then a source toggle wired to Cmd+\ for every type, then a More menu (reveal, copy path, history, rename, move to trash). Graph and Canvas move their controls into the toolbar, and the floating toggles go away. Favorite and Pin to rail work for any file. Where .canvas and .kanban store that flag is an owner decision.
- Impact: The owner's daily tabs get one header height, one title style and one place for each action.

### P19 Seven categorical palettes and two tag-colour systems, mostly blind to the theme
- Tier: clear | Category: color-theming | Effort: M
- Areas: kanban tags, rail, tags, properties, editor, icon picker, canvas, event calendar, collection linear calendar, QueryJS
- Sources: lens:design-system, area:kanban, lens:type-color-density, area:calendar, area:collection
- Problem: Only --type-* is theme-aware and contrast-checked. The kanban chip text on its 15% tint measures 1.7-3.1:1 in light mode (yellow 1.7). Rail badges put white 11 px text on the item hue (2.8-3.7:1), and the rail icons for Favorites (1.6:1) and Files (2.0:1) fail 3:1. A tag has a global colour and a separate per-board kanban colour. The event colour swatches use the muddy -fg tokens while the chips use the -bg fills. The linear calendar forces white text on every bar colour.
- Evidence: app.css:194-202,402-414; utils/color-presets.ts:2-30; utils/tag-colors.ts:2-9; canvas.types.ts:6-11; IconPicker.svelte:53-60; rail-items.logic.ts:123-141; Rail.svelte:359-374; kanban.logic.ts:775; KanbanCardText.svelte:38,55,76; KanbanTableView.svelte:60; EventColorSwatches.svelte:47,52; EventPopover.svelte:165; CollectionLinearCalendarView.svelte:199,205; linear-calendar.logic.ts:302; kanban-board-light.png, landing-today-light.png, settings-calendar-light.png.
- Proposal: Define one palette, --hue-{red..gray}, starting from the --type-* values. Derive a --hue-X-bg / --hue-X-fg pair per theme with the event-calendar color-mix recipe, and add a contrast test for each preset. Migrate in this order: kanban, rail (icons and badges via type-* hues, badges in primaryForeground), global tags, icon picker, events (swatches drawn with the real chip fill plus a named tooltip), canvas, and the linear calendar via barTextColor. A name map keeps stored values working, and kanban falls back to the global tag colour.
- Impact: A tag looks the same everywhere and is readable in light themes.

### P20 One accent colour does seven jobs, and bold and italic share the link hue
- Tier: clear | Category: color-theming | Effort: M
- Areas: theme builder, chrome colour semantics, editor emphasis
- Sources: lens:type-color-density
- Problem: primary drives the focus ring, selected rows, sidebar titles, wikilinks, task fills, list markers, footnotes and embed headers. In Lavender Haze, headings equal primary. In the default theme, strong and emphasis (#93c5fd) sit next to links (#60a5fa). The mini calendar uses primary for weekends, today and the selected day.
- Evidence: theme-builder.logic.ts:232-283,262; theme.logic.ts:136-138,236,247,303; SidebarSection.svelte:46; NoteInfo.svelte:44; TagsView.svelte:51; NoteRow.svelte:70,89,103; CalendarGrid.svelte:56-59; editor-live-preview-light.png, editor-live-preview-dark.png.
- Proposal: Keep the accent for "interactive or selected". Titles use the foreground colour. Headings get their own ramp, and the builder rejects heading == primary with a delta-E check. Bold and italic default to editorFg and are kept a minimum delta-E away from links. In the mini calendar, weekends are muted, the selected day is primary and today is outlined.
- Impact: Links and the current location become recognisable at a glance.

### P21 Toolbar controls come in three icon sizes, seven search-field recipes and four dropdown kinds
- Tier: clear | Category: consistency | Effort: M
- Areas: note list header, note action bar, kanban, tasks, calendar, collection, graph, tags, properties
- Sources: lens:design-system, lens:type-color-density, area:kanban, area:links
- Problem: Inside the h-10 pane-toolbar, controls range from 20 to 32 px with 14 or 16 px icons and four different active states. Search fields vary in height, radius, focus style and placeholder colour. Kanban and graph use native selects. Kanban's sort shows only "Manual", and its view toggles rely on title text.
- Evidence: app.css:151-153; RailNoteList.svelte:774-820; RailSortMenu.svelte:105; RailPropertiesPicker.svelte:105,131-136; KanbanView.svelte:464-505; GraphControls.svelte:28-60,78-82,100,113; NoteActionBar.svelte:115-116; TagsView.svelte:59-75; EditorView.svelte:98-139; button.svelte:24; EventCalendarHeader.svelte:44-116; CollectionView.svelte:535,595-670; TasksView.svelte:915-922; SearchPanel.svelte:154-161; RailListSearch.svelte:86-90; RelationshipSearch.svelte:55-60; kanban-board-light.png, calendar-week-light.png.
- Proposal: Build components/ui/toolbar. ToolbarButton is 28 px square with a 16 px icon, shared hover and selected tokens, and a required label. ToolbarSearch is h-7 with the icon inside, a clear button and the focus-ring utility. ToolbarMenuTrigger is a ghost "Label: value" button with a chevron that opens a DropdownMenu radio group; it replaces the native selects, and the kanban sort reads "Sort: Manual" with "Open first". Migrate kanban, then graph, collection, note list, tasks, calendar, tags.
- Impact: Size, hit area and focus behaviour stop changing from view to view.

### P22 Icon-only controls have no enforced name or tooltip
- Tier: clear | Category: accessibility | Effort: M
- Areas: components/ui Button and Tooltip; every icon toolbar (collection, auto-organize, properties, canvas, trash, rail, pane headers)
- Sources: area:foundation, area:shell, area:note-list, area:properties, area:collection, area:organize, area:canvas, area:settings
- Problem: Of the size=icon buttons, 11 have no name and 4 have only a title; about 16 raw icon buttons are unnamed as well. The 133 native title tooltips are delayed, never show on focus and print "Cmd+D". Only 3 files use the styled Tooltip. The collection Calendar, Sort, Filter and Properties buttons, the auto-organize rule controls, the canvas add toolbar, the trash row actions and the chip remove X are all unnamed or title-only. The relationship remove button does not say which link it removes, and the sort and properties icons are ambiguous.
- Evidence: CollectionView.svelte:595,622,645,668; FormulaRow.svelte:57-59,80-89; FilterRow.svelte:101,184; SortPanel.svelte:126; PropertiesPanel.svelte:133-146; CollectionCalendarView.svelte:76-110; AutoOrganizeRuleRow.svelte:294-323; AutoOrganizeSection.svelte:114-120,207-211; PropertyField.svelte:147-181; PropertiesView.svelte:197,278-284; RelationshipSearch.svelte:44-50; CanvasToolbar.svelte:25-39; TrashSection.svelte:112-129; RailNoteList.svelte:773-781,879-886; TypesNavigator.svelte:224-226,252-260; Rail.svelte:248-257,362; RailSortMenu.svelte:119-125; RailArchivedMenu.svelte:38-42; NoteActionBar.svelte:148,157,175; EventCalendarView.svelte:237; DailyNoteButton.svelte:15.
- Proposal: Add an IconButton primitive with a required label prop that renders aria-label plus the styled Tooltip, with an optional shortcut chip (P95) and sizes of 24, 28 and 32 px. Put one Tooltip.Provider at the app root with a 400 ms delay. Tooltips state the current value ("Sort: Modified, newest"). Remove buttons name their target ("Remove link Roadmap from Belongs to"). Mark decorative icons aria-hidden. Migrate the unnamed buttons first.
- Impact: Every control has a name, and dense toolbars get fast hints that show their shortcuts.

### P23 The focus ring is drawn at 50% and fails 3:1 on borderless targets; many controls have none
- Tier: clear | Category: accessibility | Effort: S
- Areas: app.css base, Button, Input, Select and Switch primitives, and about 50 feature sites
- Sources: lens:a11y-keyboard, area:foundation, area:note-list, area:properties, area:tasks, area:links, area:shell, area:collection
- Problem: ring/50 measures 1.9-2.6:1, and the destructive /20 ring 1.2-1.3:1. There are five focus treatments. The dialog close button uses focus:, so every dialog opens with a ring on the X. Seven sites use focus: and 22 inputs set outline-none with nothing in its place. The value Input removes its ring. The Tasks text buttons, the graph and tags controls and the collection rename input have no focus-visible style.
- Evidence: app.css:484-500,486; button.svelte:7,12; input.svelte:44; dialog-content.svelte:38; resizable-handle.svelte:24; scroll-area.svelte:32; styles.ts:712; PropertyField.svelte:114,139,191; PropertiesView.svelte:227; RelationshipSearch.svelte:59; TasksView.svelte:609,846,921,928-1117; TaskLists.svelte:74; GraphControls.svelte:81,101,114; KanbanView.svelte:489,501; KanbanCard.svelte:187; CollectionView.svelte:530; TagsView.svelte:58-75; ShowInCalendarButton.svelte:67 (good); EventTaskChip.svelte:27 (good); file-history-light.png.
- Proposal: Add one --focus-ring token at 100% (4.9-6.8:1) and a focus-ring utility: a 2 px ring with 2 px offset on borderless targets and an inset ring on rows. Add a base :focus-visible rule so raw buttons get it too. Replace ring/50, ring/20 and the focus: variants, and give every outline-none input a replacement.
- Impact: The keyboard position is always visible, which P24 needs, and mouse clicks stop leaving rings behind.

### P24 Lists have no keyboard model except Tasks, and every row is its own Tab stop
- Tier: clear | Category: accessibility | Effort: L
- Areas: note list, Files tree, Types, search results, backlinks, tags, TOC, file history snapshots, editor tabs, collection table, start screen
- Sources: lens:a11y-keyboard, area:note-list, area:finders, area:links, area:collection, area:shell
- Problem: The code has no tree, listbox, grid or aria-activedescendant roles. Only Tasks uses a roving tabindex. Search results have no arrow keys and no Enter, and Escape only blurs. Snapshot rows cannot be walked with Up and Down. Collection th and tr elements are mouse-only, and a link click inside a row also opens the note. Every tab is tabindex=0, and the dirty dot has no label. In WebKit, Tab may skip buttons unless macOS keyboard navigation is on (from memory, not verified).
- Evidence: tasks-keys.logic.ts:30-66; TasksView.svelte:802-890; NoteRow.svelte:67-72; RailNoteList.svelte:834,899; FilesNavigator.svelte:296,340-343,482; TypesNavigator.svelte:254,281,410; SearchPanel.svelte:36-39,125-145; SearchResult.svelte:137; global-keybindings.ts:40-49,102-106; LinkItem.svelte; TagItem.svelte:30; TableOfContentsPanel.svelte; SnapshotList.svelte:38-62; EditorTabs.svelte:44-77; CollectionTableView.svelte:44-48,55-58,67-68; routes/(app)/+page.svelte:12-14,49-55; Rail.svelte:312-318.
- Proposal: Lift resolveTaskKey into a roving-list logic module and a Svelte action. Each list gets one Tab stop, Up/Down/Home/End, Enter to open, Cmd+Enter for a new tab, F2 to rename, Shift+F10 for the row menu and type-ahead. Trees add Left/Right with treeitem and aria-expanded. In search, ArrowDown leaves the input and the first Escape clears the query. Collection rows become focusable, headers become buttons, and links inside rows stop propagation. The rail resize handle gets keyboard resizing. Migrate the note list, then Files, search, backlinks, tabs and the table.
- Impact: The largest keyboard gain in the app: notes, folders and results can be reached without the mouse.

### P25 Text on selected rows and alpha-faded text drops below 4.5:1
- Tier: clear | Category: color-theming | Effort: M
- Areas: theme builder pairs, note rows, tree rows, settings nav, search snippets, properties values, and 20+ opacity sites
- Sources: lens:a11y-keyboard, lens:type-color-density, area:finders, area:properties
- Problem: READABILITY_PAIRS checks flat surfaces only. On the selected note row the subtitle is 3.4-3.7:1, and type chips are 3.5-3.8:1 at 11 px. Archived rows at opacity-60 measure 2.5-2.9:1. In total 28 classes in 21 files fade text to /30-/80 (1.75-2.9:1): snippets at /60 (about 3.6:1), property values at /70, placeholders, "N results", out-of-month days and the "Add property" hint. The semantic badge is about 2:1 on light, and archived switcher rows are at opacity-50.
- Evidence: theme-builder.logic.ts:105-155; NoteRow.svelte:70,89,93,103,114,124; SearchResult.svelte:150,166; app.css:183-184,247-248; QuickSwitcher.svelte:81,86; PropertyField.svelte:131,139,191; PropertiesView.svelte:224,235,245; TasksView.svelte:921; KanbanLane.svelte:366; CollectionView.svelte:587; CollectionTableView.svelte:63; CollectionCalendarView.svelte:144; CalendarGrid.svelte:58; KanbanDatePicker.svelte:67,79,130; FormulaRow.svelte:81,87; SortPanel.svelte:90; files-note-list-dark.png, rail-types-light.png, search-results-light.png.
- Proposal: The selected row uses the accent surface with foreground text, or composite pairs are added to READABILITY_PAIRS. Add a --faint-fg tier lifted to 3:1 for placeholders and disabled text. Replace alpha suffixes on text with muted or faint, and add a lint test that bans new text-*/NN. Show archived items with an icon or tag instead of opacity. Give the semantic badge a darker light-theme foreground.
- Impact: The note list, chips, snippets and property values stay readable in every theme.

### P26 Control boundaries fail non-text contrast (switch off state, input and select edges)
- Tier: clear | Category: accessibility | Effort: M
- Areas: design tokens, Switch, Input, Select
- Sources: area:foundation
- Problem: No control boundary is checked against the surface it sits on. In Lavender, the switch track on a setting item is 1.12:1 and the input border 1.08:1. In the default theme the track is 1.74:1. WCAG 1.4.11 asks for 3:1.
- Evidence: theme-builder.logic.ts:105-155,252; theme.logic.ts:174,177,284,286; switch.svelte:18; select-trigger.svelte:22; input.svelte:43; settings-update-light.png.
- Proposal: Add control-boundary pairs at 3:1 (track, input border, select border against settingItemBg, card, popover and editor). Give the off switch a 1 px border. Input and Select share one surface and one border token.
- Impact: Toggles and fields in Settings and dialogs become legible.

### P27 Error text is held to 3:1 only, and only against the editor background
- Tier: clear | Category: accessibility | Effort: M
- Areas: destructive colour, theme builder
- Sources: area:foundation
- Problem: text-destructive is used 59 times, 31 of them at 11-12 px. Lavender's error colour drops to 3.66:1 on the setting item, and the default theme's is 3.44:1. Muted text on settingsHoverBg is 4.05:1. The destructive Button uses a literal text-white.
- Evidence: theme-builder.logic.ts:122,187; theme.logic.ts:139,254; button.svelte:12; AppearanceSection.svelte:262; settings-appearance-light.png, settings-appearance-dark.png.
- Proposal: Add a separate error-text token lifted to 4.5:1 on every panel surface, and keep destructive for fills. Add pairs for muted on hover and on the selected row. The destructive Button uses destructive-foreground.
- Impact: Validation and failure messages stay readable.

### P28 Form controls are labelled by a neighbouring span instead of a label
- Tier: clear | Category: accessibility | Effort: M
- Areas: SettingItem (all 19 settings sections), auto-organize, graph, kanban, collection, canvas, properties
- Sources: lens:a11y-keyboard, area:settings, area:properties
- Problem: About 80 of 126 inputs, switches and selects have no name. SettingItem renders the name and the description as spans, so 15 of 18 switches and all 35 inputs are announced as "switch, off", and clicking the label does nothing. The checkbox property is named by its raw value ("true") and repeats it as text.
- Evidence: SettingItem.svelte:25-27,37; PeriodicNotesSection.svelte:52-62; FilesSection.svelte:39-44; UpdateSection.svelte:305-318,343-346; SentrySection.svelte:52-55; TypesSection.svelte:15-20; TodoistSection.svelte; AutoOrganizeRuleRow.svelte; GraphControls.svelte; FormulaRow.svelte; FilterRow.svelte; CanvasLinkInput.svelte; LinkNode.svelte; PropertyField.svelte:124-132; settings-update-light.png.
- Proposal: SettingItem generates an id, renders the name as a label for it, links the description with aria-describedby and passes the id to the control snippet. Clicking the row toggles a Switch. Apply the same pattern to the auto-organize and properties rows. The checkbox property is named by its key and drops the "true"/"false" text.
- Impact: Larger click targets on every setting, and every control has a name.

### P29 Empty and loading states say "nothing" without the cause or a next step (about 25 variants)
- Tier: clear | Category: feedback-states | Effort: M
- Areas: note list lenses, Files, search, backlinks, tags, collection, kanban filter, properties, tasks loading
- Sources: area:foundation, lens:feedback-motion, area:shell, area:note-list, area:collection, area:properties, area:tasks
- Problem: "No notes here", "Nothing here", "No results found" and similar strings appear at three sizes and in three colours. The same message shows whether nothing exists or a filter hid everything. Favorites never says how to star a note. Collection offers no Clear filters. The Files navigator has no empty branch. Loading is plain text and there is no skeleton. Properties shows "Not available" with no reason, and an empty type dropdown opens an empty menu. Tasks already has the right shape: a cause plus a fix button.
- Evidence: RailNoteList.svelte:826-897; FilesNavigator.svelte; SearchPanel.svelte:116-120; TagsView.svelte:80-82; BacklinksPanel.svelte:58-64; CollectionTableView.svelte:34-37; CollectionView.svelte:509-512; collection-block-widget.ts:102-108,160-166; FilterPanel.svelte:142-150; KanbanView.svelte:181; PropertiesView.svelte:157-162,186-201,208,234; TasksView.svelte:1079-1081; task-query.logic.ts:1459-1501 (model); rail-favorites-light.png, rail-archive-light.png, editor-empty-state-light.png.
- Proposal: Build EmptyState (icon, title, hint, action) and InlineStatus (spinner and label, or error and Retry) components, with skeleton rows and aria-busy. Each list computes its cause: "No <things> yet" with how to make one ("Star a note with Cmd+D"), or "No results match N filters" with Clear filters and Edit filters. Unsupported files say "Properties are available for Markdown notes". Migrate the note list, search, backlinks, tags, collection and kanban.
- Impact: A filtered-out list stops looking like data loss.

### P30 Background refreshes replace the content with a loading line, so lists collapse and blink
- Tier: clear | Category: performance-perceived | Effort: S
- Areas: Tags view, Search panel
- Sources: lens:feedback-motion, area:finders
- Problem: Tags swaps the whole tree for "Indexing tags..." on every vault index bump, which unmounts the items and resets every expanded node. Search empties to "Searching..." on every debounced keystroke. The count shows "50 results" when the cap truncated the list. Tasks already keeps the list in place and shows a spinner in its header.
- Evidence: TagsView.svelte:41-45,52,79-80; tags.service.ts:27; TagItem.svelte:19; search.service.ts:138,140,201; SearchPanel.svelte:115-116,122-124; TasksView.svelte:910-913; RailNoteList.svelte:823. The Tags behaviour was traced in code, not observed at runtime.
- Proposal: Show full-area loading only on the first load. Later refreshes keep the content (dimmed in search) and show a header spinner after about 300 ms. Show "50+ results" when the cap is reached.
- Impact: Typing in search no longer flickers, and the Tags tree stops collapsing after unrelated saves.

### P31 Hand-built overlays do not move, trap or restore focus, and Escape is inconsistent
- Tier: clear | Category: interaction | Effort: M
- Areas: Settings sheet, canvas context menu, canvas file picker and link input, tag colour picker
- Sources: lens:a11y-keyboard, area:shell, area:settings, area:canvas
- Problem: Settings opens with focus left in the editor and has no aria-modal. Tab from the editor never reaches it. The window-level Escape closes it even while a nested popover is open. The canvas context menu has no menu roles, takes no focus and has no arrow keys, and Escape only clears the selection. The canvas file picker and link input are backdrop divs with unlabelled inputs and no arrow navigation, and the picker silently caps results at 20. TemplatePicker and kanban already use the primitives.
- Evidence: SettingsPanel.svelte:105-127; routes/(app)/+layout.svelte:183-187; EditorSection.svelte:55; CanvasContextMenu.svelte:87-174; CanvasInner.svelte:271-274,625-626; CanvasFilePicker.svelte:48-71,61,107; CanvasLinkInput.svelte:48-71; TagColorPicker.svelte:37; TemplatePicker.svelte:65-113; KanbanCard.svelte:17,154.
- Proposal: Route every overlay through bits-ui. Settings becomes a non-modal Sheet that focuses the active section on open, restores focus on close and ignores Escape when defaultPrevented. The canvas menus use ContextMenu with a virtual anchor. The pickers use Command plus Dialog, with arrows and Enter, "Showing 20 of N", and separate empty states for an empty vault and for no match.
- Impact: Escape and Tab behave the same in every overlay.

### P32 Panes have no real minimum width, and the Calendar navigator renders broken
- Tier: clear | Category: layout-density | Effort: M
- Areas: AppShell panes, layout defaults, Calendar rail navigator
- Sources: area:shell, area:note-list, area:calendar
- Problem: The navigator, note list and sidebar all use minSize 3 percent and default to 3 percent, so a new vault shows a 40 px note list. In about 163 px the mini month overflows: the weekday headers collide, the title wraps and the chevrons are clipped. The registry has no width hint.
- Evidence: AppShell.svelte:207-250,268-273; settings.store.svelte.ts:70-74; rail-shell.types.ts; rail-registry.store.svelte.ts; CalendarGrid.svelte:22-51; CalendarNavigator.svelte:96-137; landing-default-pane-sizes-light.png, rail-calendar-light.png, calendar-plugin-navigator-light.png.
- Proposal: Navigators declare a px minWidth (Calendar about 232, others about 160). Dragging below the minimum collapses the pane, and the rail toggle restores it. The first-run default for the note list is about 280 px. The calendar grid becomes container-aware: under about 200 px it drops week numbers, uses single-letter weekdays and keeps the title on one row. Keep a deliberate Focus mode for the widest editor.
- Impact: Removes broken-looking panes on first run and after a stray drag.

### P33 The note-list header loses New note and Daily note at narrow widths
- Tier: clear | Category: layout-density | Effort: M
- Areas: RailNoteList header
- Sources: area:shell, area:note-list
- Problem: Up to eight shrink-0 controls sit in a 40 px band that clips overflow, and the + button is last, so it is the first to disappear. The sort, properties and archive icons are ambiguous: the archive icon reads like the rail's Archive item.
- Evidence: RailNoteList.svelte:716-820; RailSortMenu.svelte:119-125; RailPropertiesPicker.svelte:105-113; RailArchivedMenu.svelte:38-42; narrow-1024x700-editor-light.png, narrow-1024x700-today-light.png.
- Proposal: Fold Sort, Properties and Archive into one Display popover, like the one in Tasks. Keep Search, Filter and + always visible and pinned right, and move anything else into an overflow menu below about 220 px. Prototype at 150, 225 and 320 px.
- Impact: Creating a note from a list works at any width.

### P34 The tab strip has no overflow cue or control, fixed 160 px titles, and no reorder
- Tier: clear | Category: interaction | Effort: M
- Areas: editor tabs
- Sources: area:shell, area:editor
- Problem: The scrollbar is hidden, with no fade, no list of all tabs and no wheel mapping. Tabs never shrink and truncate at 160 px even when there is room. They cannot be dragged to reorder. Pinned tabs show only an icon, and no tab has a tooltip.
- Evidence: EditorTabs.svelte:46,51,52,84,85; tabs-bar-several-light.png, editor-live-preview-light.png.
- Proposal: Let tabs flex from about 220 to about 100 px before the strip scrolls. Map the vertical wheel to horizontal scroll, add edge fades and a trailing menu listing every tab with its dirty dot, and add drag-to-reorder with an insertion marker (pinned tabs stay at the left). Every tab gets a full-path tooltip.
- Impact: Multi-tab work across boards, canvases and notes keeps its context.

### P35 There is no navigation history: every open adds a tab, and there is no Back
- Tier: clear | Category: information-architecture | Effort: L
- Areas: editor tabs, link following
- Sources: lens:ia-navigation
- Problem: Note-list clicks, wikilinks, backlinks, search, graph and calendar all open or focus a tab at the end of the strip. There is no back or forward. "Open in new tab" calls the same function as a plain click.
- Evidence: editor.service.ts:148-198; editor.store.svelte.ts:52-61; editor-host.ts:143-146; NoteRow.svelte:71; NoteRowMenu.svelte:224-227; global-keybindings.ts:86-99; tabs-bar-several-light.png.
- Proposal: Give each tab its own history. A plain click replaces the active unpinned tab. Cmd+click, middle-click and "Open in new tab" open a new tab, and pinned tabs are never replaced. Back and Forward go on Cmd+[ and Cmd+] and mouse buttons 4 and 5. This changes a daily habit, so it is an owner decision. Failing that, rename the menu item and rely on P34.
- Impact: Following links becomes reversible, and tabs stop sprawling.

### P36 "Calendar" names two places, and Tasks, Graph and Tags have no visible entry point
- Tier: clear | Category: information-architecture | Effort: M
- Areas: rail, virtual tabs, palette, settings
- Sources: lens:ia-navigation
- Problem: The rail "Calendar" is the periodic-notes navigator, while the "Calendar" tab is the event calendar, and Settings repeats the split. Tasks, Graph and Tags open only from the palette or a shortcut, and Tags has no shortcut. Calendar Undo and Redo are filed under Navigation.
- Evidence: calendar-rail.service.ts:26-32; commands.ts:213,222,226-267,291; global-keybindings.ts:112,121; CalendarNavigator.svelte:153-160; command-palette-filtered-light.png, settings-calendar-light.png.
- Proposal: Add a "Views" rail group (Tasks, Calendar, Graph, Tags) that opens tabs, reusing the Actions section pattern, hideable and reorderable in Settings. Rename the navigator (for example "Journal"). Move Undo and Redo to a Calendar category.
- Impact: The daily views become one click away, and the names become unambiguous.

### P37 The keyboard can open a lens but not enter it; rail items have no shortcuts
- Tier: clear | Category: interaction | Effort: M
- Areas: global keybindings, rail, note list
- Sources: lens:ia-navigation, area:shell
- Problem: Inbox, Today, Favorites, Types, Files, Archive, pins, the daily note and "+ New here" have no shortcut, and "+ New here" has no command at all. Cmd+1, Cmd+2 and Cmd+Shift+B all control the same panel toggle. After "Go to X", focus stays where it was.
- Evidence: global-keybindings.ts:62-203,133-141; RailNoteList.svelte:808-819; rail-navigation.ts:14-24.
- Proposal: Cmd+1..9 select rail items in rail order, and Cmd+Shift+B becomes the only panel toggle (ADR-0033 approved the current bindings, so this is an owner decision). Selecting a lens moves focus to the active row in the list. Add a "New note here" command and a key that cycles focus through rail, list, editor and sidebar.
- Impact: Every lens can be reached and used from the keyboard.

### P38 Creation has many entry points with different destinations and names, and Files has no visible "+"
- Tier: clear | Category: information-architecture | Effort: M
- Areas: Files header, note creation commands, Files context menu
- Sources: area:note-list, lens:ia-navigation
- Problem: New folder, Canvas and table exist only in a right-click menu. "New File", "New Canvas" and "New Kanban Board" write to the vault root. Names drift: New File, New note, New here, New Canvas, New table and New view, where the last two create the same .view file.
- Evidence: FilesNavigator.svelte:80-91,88-89,304-310,346-403; note-composer.service.ts:20-55; commands.ts:148-192,371-376; new-note.service.ts:26-46; RailNoteList.svelte:808-819; TypesNavigator.svelte:218-230.
- Proposal: Add a "+" menu to the Files and note-list headers (note, canvas, board, view, folder, plugin creators) that targets the picked folder. Cmd+N stays capture. Other creation commands follow the current lens and say where they create ("New canvas in Projects"). Use one wording, "New <kind>", in sentence case.
- Impact: Boards and canvases land where the owner is working.

### P39 Note actions are split across five surfaces, and Inbox triage means opening every note
- Tier: clear | Category: interaction | Effort: M
- Areas: row menu, action bar, tab menu, palette
- Sources: area:note-list, lens:ia-navigation
- Problem: Mark organized and Archive exist only in the action bar. The row menu has no Archive, Organized, Move or History. The tab menu has only Pin and Close. History is in the palette only. The same action is "Delete this note" in one place and "Move to Trash" in another.
- Evidence: NoteActionBar.svelte:30-32,146-219; NoteRowMenu.svelte:221-287; EditorTabs.svelte:98-109; commands.ts:405-415; delete-note.service.ts:14-18; note-row-context-menu-light.png, rail-inbox-light.png.
- Proposal: Build one note-actions list and render it in the row menu, the action bar More menu, the tab menu and the palette: Open in new tab, Rename, Move to..., Duplicate, Favorite, Mark organized, Archive, History, Reveal, Copy, Move to Trash. The tab menu also gets Close others and Close to the right. Add an inline organized check on Inbox rows.
- Impact: Inbox triage takes one action per row.

### P40 Line length swings from about 25 to over 140 characters, and the full-width toggle does nothing by default
- Tier: clear | Category: layout-density | Effort: S
- Areas: editor reading width
- Sources: lens:type-color-density
- Problem: contentWidth defaults to 0 (no limit) and is set in px. The padding is clamp(24px, 5vw, 80px). Because effectiveContentWidth returns 0 either way, the "Use the full note width" toggle has no effect.
- Evidence: settings.store.svelte.ts:84; settings.types.ts:158-159; settings.logic.ts:83-85; editor-theme.ts:39-45; NoteActionBar.svelte:92-97; note-action-bar.service.ts:15-17; editor-live-preview-light.png, narrow-1024x700-editor-light.png.
- Proposal: Add a "Line length" setting in ch: default 72, range 50-120, plus "No limit". Size the padding from the pane with a container query. Hide the wide-notes toggle while there is no limit.
- Impact: Every note keeps a comfortable line length whichever panes are open.

### P41 Custom task statuses show as raw [/] text, while the Tasks view has seven statuses
- Tier: clear | Category: consistency | Effort: M
- Areas: live-preview tasks
- Sources: area:editor
- Problem: The editor decorates only checked and unchecked markers, so [/] shows as a bullet followed by the literal "[/]".
- Evidence: simple-widget-handlers.ts:20-30; widgets.ts:28-57; task-status.logic.ts:7,45-53; editor-live-preview-scrolled-light.png.
- Proposal: Render [/] [?] [!] [>] [-] as glyph widgets with the icon and tone the Tasks view uses. Click toggles todo and done, and right-click opens a status menu.
- Impact: A task looks the same in the note and in the Tasks tab.

### P42 The editor has no formatting or insert commands: no Cmd+B, I or K, and a clipboard-only context menu
- Tier: clear | Category: information-architecture | Effort: M
- Areas: editor authoring
- Sources: area:editor
- Problem: The keymap has no bold, italic or link bindings, and the context menu offers only clipboard items and block links. Inserting a table, callout or code block means remembering the syntax. This was read from the code; the app was not run.
- Evidence: setup/editor-extensions.ts:132-166; MarkdownEditor.svelte:734-758; app/commands.ts.
- Proposal: Add Cmd+B, Cmd+I and Cmd+K with matching palette commands. Add Format (Bold, Italic, Link, H1-H3) and Insert (Task, Table, Callout, Code block) groups to the context menu, with formatShortcut labels.
- Impact: Removes syntax friction and makes the widgets discoverable.

### P43 Properties is a tall static section that pushes TOC and Backlinks below the fold, with empty Relationships chrome
- Tier: clear | Category: layout-density | Effort: M
- Areas: right sidebar, PropertiesView, SidebarSection
- Sources: area:properties, area:shell
- Problem: Properties cannot collapse while the other sidebar panels can. Empty Relationships takes about 100 px on every note. Section headers scroll out of reach.
- Evidence: PropertiesView.svelte:153,156,243-290; SidebarSection.svelte:56-72; AppShell.svelte:277-292; editor-live-preview-light.png, right-sidebar-all-expanded-light.png.
- Proposal: Make Properties collapsible with remembered state, and make section headers sticky. Replace the empty relationship groups with one "Add relationship" row that opens a menu, then search. Render a group only when it has links.
- Impact: Saves about 100 px per note and keeps Backlinks and the TOC reachable.

### P44 A refused property key rename or add fails silently, and the key field shows text that was never saved
- Tier: clear | Category: feedback-states | Effort: S
- Areas: PropertyField, PropertiesView
- Sources: area:properties
- Problem: The key input is uncontrolled and the rename result is ignored, so a duplicate or refused rename keeps the typed text. Blanking a key leaves an empty field. Adding a duplicate shows no message. There is no Enter or Escape handling.
- Evidence: PropertyField.svelte:33,52-58,113-122; PropertiesView.svelte:129-131,137-142; properties.service.ts addNewProperty/renameProperty.
- Proposal: On refusal, revert to property.key and show an inline line ("A property named X already exists") with aria-invalid, under the key and under the add input. Enter commits and Escape reverts.
- Impact: The user no longer believes a rename was saved when the note on disk is unchanged.

### P45 Untyped notes cannot get a type from the panel, and new properties are always text
- Tier: clear | Category: interaction | Effort: M
- Areas: Properties type row, add property
- Sources: area:properties
- Problem: The type row renders only when _type already exists, so it is hidden exactly when it is needed. addProperty hard-codes type text, and the per-row type icon is not a control.
- Evidence: PropertiesView.svelte:165,186-201; properties.logic.ts:703-705; PropertyField.svelte:110; rail-types-light.png.
- Proposal: Always show the type row, with a "Set type" placeholder offering "No type" and "New type...". Make the row icon a menu (Text, Number, Date, Checkbox, List), and let "Add property" take a key and a type.
- Impact: Structuring notes no longer needs source mode.

### P46 The relationship picker cannot be used from the keyboard
- Tier: clear | Category: interaction | Effort: S
- Areas: RelationshipSearch popover
- Sources: area:properties
- Problem: Only Escape is handled. Selection fires on mousedown, there are no arrows and no Enter, trapFocus is false, and an empty query shows an empty list.
- Evidence: RelationshipSearch.svelte:33-38,53,63-90.
- Proposal: Follow the Quick Switcher pattern: an active row moved with Up and Down, Enter to select, click also selects, and recent notes listed for an empty query.
- Impact: Linking notes from the keyboard works.

### P47 Collection headers show raw column ids and file names keep .md
- Tier: clear | Category: content-copy | Effort: S
- Areas: CollectionTableView, collection.logic
- Sources: area:collection
- Problem: displayName falls back to the key ("file.name"), and name cells read "Roadmap.md".
- Evidence: collection.logic.ts:476; view-file-table-light.png, collection-and-queryjs-block-light.png.
- Proposal: Add built-in names for file.* columns (Name, Folder, Created, Modified, Size, Tags) and render file.name without the extension. Show the key only as a secondary label in Properties.
- Impact: Every table looks finished without defining a displayName per column.

### P48 Clicking a collection header silently stacks multi-column sorts
- Tier: clear | Category: interaction | Effort: S
- Areas: collection table sorting
- Sources: area:collection
- Problem: A second header click appends a secondary sort. There is no rank shown and no aria-sort.
- Evidence: CollectionView.svelte:397-409; CollectionTableView.svelte:27-31,44-48.
- Proposal: A click sets a single sort that cycles asc, desc, none. Shift+click adds a secondary sort, and a rank number shows when more than one is active. Add aria-sort.
- Impact: Sorting behaves the way spreadsheet users expect.

### P49 Collection calendar views silently drop undated notes
- Tier: clear | Category: feedback-states | Effort: M
- Areas: collection calendar and linear calendar
- Sources: area:collection
- Problem: Records without the date property are skipped while the count still says "N results", and an empty grid shows no message.
- Evidence: calendar.logic.ts:109-111; CollectionView.svelte:587; CollectionCalendarView.svelte; CollectionLinearCalendarView.svelte.
- Proposal: Add an "N without date" chip that opens a list of those notes, show "No dated entries" over an empty grid, and change the count to "N results, M on calendar".
- Impact: Missing data stops looking like a bug.

### P50 An embedded collection block shows only its first view, with no sign that others exist
- Tier: clear | Category: information-architecture | Effort: M
- Areas: collection live-preview widget
- Sources: area:collection
- Problem: The widget always renders views[0].
- Evidence: collection-block-widget.ts:110-115,139; CollectionView.svelte:518-586.
- Proposal: When there is more than one view, add chip tabs to the block header (session-local) and an "Open as view" link.
- Impact: Dashboards can use multi-view collections.

### P51 The Settings title and the active nav item scroll out of view
- Tier: clear | Category: layout-density | Effort: S
- Areas: Settings panel shell
- Sources: area:settings, area:shell
- Problem: The title sits inside the scrolling nav. The last items are clipped. Opening at a section does not scroll it into view, and the section h2 scrolls away.
- Evidence: SettingsPanel.svelte:114-157; settings-appearance-light.png, settings-update-light.png.
- Proposal: Make the title band sticky and scroll only the list. Scroll the active item into view. Make the section title a sticky header.
- Impact: The user always knows where they are in Settings.

### P52 There is no search across the 19 settings sections
- Tier: clear | Category: information-architecture | Effort: L
- Areas: Settings panel
- Sources: area:settings, area:shell
- Problem: Settings has 19 sections in 6 groups and no filter, so "template" (four sections) or "log to file" means opening sections one by one.
- Evidence: settings.logic.ts:255-300; SettingsPanel.svelte:44-64,122-146.
- Proposal: Add a search field under the title that filters the nav and lists matching rows with a breadcrumb, then jumps to and highlights the row. It needs a label and description index per SettingItem.
- Impact: A large time saver for a power user.

### P53 Dependent settings are described in text but never disabled
- Tier: clear | Category: feedback-states | Effort: S
- Areas: Troubleshooting, Periodic Notes, Todoist
- Sources: area:settings, area:plugins-misc, area:calendar
- Problem: Mod run messages, Heartbeat and the profiling toggle need log-to-file. Auto-pin needs auto-open. The Todoist sync switch turns on without a token or a root project, and its chip then reads "not synced yet".
- Evidence: TroubleshootingSection.svelte:55-56,67,73-75,95; PeriodicNotesSection.svelte:58-63; SentrySection.svelte:82; TodoistSection.svelte:114-126; TodoistSyncStatus.svelte:17; settings-todoist-light.png.
- Proposal: Disable the child control while its parent is off and show a hint ("Turn on Save debug log to file first", or "Add a token and pick a root project first") with a link to the parent.
- Impact: Removes settings that look enabled but do nothing.

### P54 Number fields apply unclamped values on every keystroke
- Tier: clear | Category: interaction | Effort: S
- Areas: Editor settings, 1:1, auto-organize debounce
- Sources: area:settings, area:organize
- Problem: Font size, line height and width write oninput, so typing "14" passes through 1 px and clearing gives 0, reflowing the open note. The debounce field snaps "0" to 0.5. An empty 1:1 value is ignored without a word.
- Evidence: EditorSection.svelte:98-166; settings.store.svelte.ts:266-271; MarkdownEditor.svelte:697-698; OneOnOneSection.svelte:10-16; AutoOrganizeSection.svelte:123-140.
- Proposal: Commit and clamp on blur or Enter. Show the range as helper text and an inline invalid state. Offer a slider with a live sample for font size and line height, and an "s" unit on the debounce field.
- Impact: The editor stops jumping while the user types a value.

### P55 Command dialogs are vertically centred, so the input jumps while typing
- Tier: clear | Category: layout-density | Effort: S
- Areas: command palette, quick switcher
- Sources: area:finders
- Problem: top-50% with a translate moves the input whenever the result count changes.
- Evidence: dialog-content.svelte:30; command-palette-light.png, quick-switcher-light.png.
- Proposal: Anchor command dialogs at about 18vh through command-dialog.svelte. Ordinary dialogs stay centred.
- Impact: Cmd+P and Cmd+O feel stable.

### P56 The command list shows only 4.5 rows
- Tier: clear | Category: layout-density | Effort: S
- Areas: command palette list
- Sources: area:finders
- Problem: The list is capped at 300 px, and each two-line row is 62 px.
- Evidence: command-list.svelte:15; command-dialog.svelte:33; CommandPalette.svelte:56-60; command-palette-light.png.
- Proposal: Cap at min(60vh, 480px). Palette rows become single-line (about 36 px) with the category right-aligned. Two-line rows stay only in the switcher.
- Impact: About ten commands visible instead of 4.5.

### P57 The quick switcher cannot create a note when any fuzzy match exists
- Tier: clear | Category: interaction | Effort: S
- Areas: Quick switcher
- Sources: area:finders
- Problem: Create appears only when there are no results. The note goes to the vault root, and a failure shows a generic toast.
- Evidence: QuickSwitcher.svelte:40-60,72-106.
- Proposal: Always append a Create "query" row and bind Shift+Enter to it. Show the target folder in the row, and put the cause in the error toast.
- Impact: Removes a trap in the fastest way to create a note.

### P58 Hybrid search results hide the note name, and every card says "Both"
- Tier: clear | Category: information-architecture | Effort: S
- Areas: search panel, Hybrid mode
- Sources: area:finders
- Problem: The title is the heading and the subtitle repeats it, so the note name never shows. The source badge is the same on every card.
- Evidence: search.service.ts:163,169; SearchResult.svelte:47-68,153.
- Proposal: The title is always the note name, and the subtitle is the folder plus the heading. Hide a badge that is constant.
- Impact: Users can tell which note a hit belongs to.

### P59 Search failures, short queries and disabled modes all read as "No results found"
- Tier: clear | Category: feedback-states | Effort: M
- Areas: search panel states
- Sources: area:finders
- Problem: FTS and semantic errors fall back silently. Hybrid returns nothing under 3 characters. Disabled modes give no reason. "No results" shows during indexing.
- Evidence: search.service.ts:229-237,257-261,269-270; src-tauri/src/commands/semantic.rs:991; SearchPanel.svelte:89-90,100-104,119-120; search-results-light.png.
- Proposal: Show distinct states: an inline error with Retry, "Type at least 3 characters", a disabled-mode hint with a Settings link, and "Index is still building".
- Impact: Users stop concluding that a note does not exist.

### P60 Overdue and due-today tasks are buried in a list ordered alphabetically by note
- Tier: clear | Category: information-architecture | Effort: M
- Areas: Tasks list ordering
- Sources: area:tasks
- Problem: The default list groups by note path, and no control sets the sort. There are only two built-in lists.
- Evidence: tasks.store.svelte.ts:39; task-query.logic.ts:245; task-views.logic.ts:93; tasks-all-open-light.png.
- Proposal: Add a built-in Today list (overdue plus due today, grouped by due date), a clickable "N overdue" badge, and Sort by in the Display menu.
- Impact: Daily triage takes one list.

### P61 Date urgency is shown five different ways, and Tasks barely signals overdue
- Tier: clear | Category: consistency | Effort: M
- Areas: Tasks chips, kanban cards, 1:1, editor dates, event calendar, properties date
- Sources: area:tasks, lens:type-color-density, area:kanban, area:properties
- Problem: In Tasks, only a 12 px icon turns red for overdue and all chips look alike. Kanban uses a red badge, a 4 px bar and several hues that overlap the user's card tint colours. 1:1 shows overdue in yellow. The editor and the calendar show nothing. Properties shows "01/12/2026", which reads either way round.
- Evidence: TasksView.svelte:869-874; tasks.logic.ts:130,153-164; kanban.logic.ts:712-719; KanbanCard.svelte:158-159; MyPeopleSection.svelte:58; PropertyField.svelte:136; app.css:473-481; kanban-board-light.png, tasks-all-open-light.png, editor-live-preview-light.png.
- Proposal: Add one pure dateTone (from getDateProximity) and one DateChip: "Today", "Tomorrow", "Nov 12", with the year only when it differs. Overdue is always destructive with an alert glyph, as in "5d overdue". Today uses warning. The kanban bar is drawn only for overdue and today. Priority shows a flag icon. Properties shows ISO dates.
- Impact: Overdue work looks the same wherever the owner meets it.

### P62 Task row actions sit about 800 px from the task text
- Tier: clear | Category: layout-density | Effort: S
- Areas: Tasks row
- Sources: area:tasks
- Problem: Rows span the full pane width, with the ellipsis at the far edge.
- Evidence: TasksView.svelte:812,890,1076; tasks-all-open-light.png.
- Proposal: Cap the list at about 760 px, or show the actions next to the chips on hover and on focus-within.
- Impact: Faster, more accurate row actions.

### P63 Tasks note-group headers use three lines for one or two tasks
- Tier: clear | Category: layout-density | Effort: S
- Areas: Tasks group header
- Sources: area:tasks
- Problem: Each header stacks the title, "N of M open" and a folder line, with space-y-6 between groups.
- Evidence: TasksView.svelte:756-780,1135; tasks-all-open-light.png.
- Proposal: Use a one-line header with the folder muted after the title, show the count only when open differs from total, and use space-y-3.
- Impact: Roughly twice as many tasks per screen.

### P64 Month cells clip the "+N more" button on busy days
- Tier: clear | Category: layout-density | Effort: M
- Areas: event calendar month view
- Sources: area:calendar
- Problem: Three chips plus the footer need about 142 px, and the cell is about 125 px.
- Evidence: EventMonthGrid.svelte:92,122-152; event-calendar-view.logic.ts:43; event-calendar-dates.logic.ts:167-169; calendar-month-light.png.
- Proposal: Compute the chip slots from the measured cell height and always reserve the footer, or move "+N" into the day-number row. Optionally render 5 rows for 5-week months.
- Impact: Busy days stop looking broken.

### P65 The week and day Tasks lane hides tasks with no overflow cue
- Tier: clear | Category: feedback-states | Effort: S
- Areas: event calendar task lane
- Sources: area:calendar
- Problem: The lane caps at 3 rows and scrolls inside with no "+N", unlike the all-day lane above it.
- Evidence: EventTaskLane.svelte:23,38; EventAllDayLane.svelte:90-99; calendar-week-light.png, calendar-day-light.png.
- Proposal: Use the all-day pattern ("+N" opens the day view), or make the lane expandable with a count.
- Impact: Dated tasks below the fold no longer get missed.

### P66 Type archive rules are invisible and gated by a master switch that is off by default
- Tier: clear | Category: information-architecture | Effort: M
- Areas: Auto Organize settings, Types
- Sources: area:organize
- Problem: Lifecycle rules run only when Auto Organize is on (default off), are never listed, and the toggle copy does not mention them.
- Evidence: type-lifecycle-rules.ts; auto-organize.service.ts:211,297; settings.store.svelte.ts:111; AutoOrganizeSection.svelte:107-174; TypesSection.svelte; settings-auto-organize-light.png.
- Proposal: Add a read-only "From your types" group, and a line under the toggle. When a type has archiveTo but Auto Organize is off, show a hint with an enable button in Types and Archive.
- Impact: Ends silent "archive does nothing" failures.

### P67 Rules run only on save: no way to apply one to existing notes, and no record of what ran
- Tier: clear | Category: feedback-states | Effort: L
- Areas: Auto Organize behaviour
- Sources: area:organize
- Problem: The builder says "Matches 4 notes now" but cannot act on them. Moves, renames and property writes are silent, so a note changes path seconds after a save with no explanation.
- Evidence: auto-organize.service.ts:206-241,402,415; AutoOrganizeRuleRow.svelte:354-361; auto-organize-rule-builder-light.png.
- Proposal: Add "Apply to 4 notes..." with a confirm sheet that lists each planned change. Show an Undo toast after an automatic run ("Moved X to Y"), and a "Recent activity" list of the last 20 runs.
- Impact: Rules become controllable and can backfill existing notes.

### P68 The Auto Organize copy describes "move" and "first match", which is not how rules work
- Tier: clear | Category: content-copy | Effort: S
- Areas: Auto Organize copy
- Sources: area:organize
- Problem: Rules also rename, set properties, create notes and run mods, and precedence differs per consequence: first match for rename, move and action, every match for properties and creation.
- Evidence: AutoOrganizeSection.svelte:112,151-154; auto-organize.service.ts:283-290; AutoOrganizeRuleRow.svelte:365-525.
- Proposal: Rewrite the help to state the precedence per consequence. Add an effect badge row to each card ("moves", "renames", "sets 2 properties"). The toggle reads "Run the rules below when notes are saved".
- Impact: Prevents rules ordered on a wrong assumption.

### P69 The destination field hides its template variables, and a typo creates a literal folder
- Tier: clear | Category: interaction | Effort: M
- Areas: Auto Organize Move to folder
- Sources: area:organize
- Problem: None of the seven variables is listed, there is no preview and no autocomplete, and "{yaer}" creates a folder with that literal name.
- Evidence: AutoOrganizeRuleRow.svelte:400-407; auto-organize.logic.ts:933-971.
- Proposal: Add an "Insert variable" menu or a "{" typeahead with examples, a live preview from the first matched note, unknown variables flagged before saving, and folder suggestions.
- Impact: Prevents misfiled notes and stray folders.

### P70 Each rule is a flat, always-expanded form with no summary
- Tier: clear | Category: information-architecture | Effort: L
- Areas: Auto Organize rule card
- Sources: area:organize
- Problem: All six sections render even when unused, so one rule fills the viewport.
- Evidence: AutoOrganizeRuleRow.svelte:285-525,365; auto-organize-rule-builder-light.png.
- Proposal: Collapse cards to a one-line summary ("When ... -> set owner = me, move to ...") with the switch and a "..." menu. Expanded cards show only the consequences in use, plus "Add action". New rules open expanded with the name focused.
- Impact: The rule list becomes scannable.

### P71 The Backlinks and Outgoing panels collapse on every note switch, with no counts
- Tier: clear | Category: interaction | Effort: M
- Areas: right sidebar link panels
- Sources: area:links
- Problem: Both panels set expanded=false on every path change, and collapsed headers show no count.
- Evidence: BacklinksPanel.svelte:33-39; OutgoingLinksPanel.svelte:29-35; SidebarSection.svelte:44-50; right-sidebar-crop-light.png.
- Proposal: Remember the open state per panel and refetch when the note changes. Show a count badge on the header.
- Impact: Saves two clicks per navigation in the linking loop.

### P72 Relationship backlinks are hidden when a note has no linked mentions
- Tier: clear | Category: feedback-states | Effort: S
- Areas: Backlinks panel
- Sources: area:links
- Problem: The empty state checks only linkedMentions, and Relationships renders inside the non-empty branch.
- Evidence: BacklinksPanel.svelte:61-62,80.
- Proposal: Show the empty state only when both lists are empty, and render the two groups independently.
- Impact: Fixes a misleading state in the typed-relationship workflow.

### P73 Unlinked mentions are computed but never displayed
- Tier: clear | Category: information-architecture | Effort: M
- Areas: Backlinks, Outgoing links
- Sources: area:links
- Problem: The stores and services compute unlinked mentions, and no component reads them.
- Evidence: backlinks.store.svelte.ts; outgoing-links.store.svelte.ts; backlinks.service.ts:211-233; outgoing-links.service.ts:75-87.
- Proposal: Add an "Unlinked mentions" section, computed lazily, with a "Link" action that wraps the text in [[ ]] and offers Undo.
- Impact: Surfaces finished functionality that improves vault connectivity.

### P74 Sidebar link rows truncate the identifying text and show raw markdown snippets
- Tier: clear | Category: layout-density | Effort: M
- Areas: Backlinks and Outgoing rows
- Sources: area:links
- Problem: Path, alias and heading share one truncated line. Snippets are raw markdown that can cut off the link itself. An alias row gives no hint of the real target.
- Evidence: OutgoingLinksPanel.svelte:65-71; LinkItem.svelte:25,27; right-sidebar-crop-light.png, right-sidebar-all-expanded-light.png.
- Proposal: Use two-line rows: the title, then a muted line with the folder or target and the heading, with the full path in a tooltip. Strip markdown from snippets, window them around the link, and use line-clamp-2. Share the stripper with P158.
- Impact: The right note can be identified without opening it.

### P75 Unresolved outgoing links are dead, dimmed rows
- Tier: clear | Category: interaction | Effort: M
- Areas: Outgoing links
- Sources: area:links
- Problem: Each is a div at opacity-60 in red, with no action.
- Evidence: OutgoingLinksPanel.svelte:74-80.
- Proposal: Make them buttons that create the note, group them under "Broken links", and drop the opacity.
- Impact: One-click note creation from a broken link.

### P76 The Tags view hides rare tags by default, and its header contradicts the body
- Tier: clear | Category: feedback-states | Effort: S
- Areas: Tags view
- Sources: area:links
- Problem: hideRareTags is on and the threshold is 10, so "7 tags" sits above "No tags found".
- Evidence: tags.store.svelte.ts:5; TagsView.svelte:15,35-39,52-64,81-82.
- Proposal: The header reads "Showing 12 of 87 tags" with "Show all". The filter defaults off at 50 tags or fewer. The empty message names the cause.
- Impact: The view stops looking broken in small vaults.

### P77 File History restore and load failures give no feedback, and empty states make false claims
- Tier: clear | Category: feedback-states | Effort: S
- Areas: File History dialog
- Sources: area:links
- Problem: Restore has no catch and no success message. A load failure reads "No history available", and an identical snapshot reads "Select a snapshot". With no versions, the full 1020x720 two-pane dialog still opens.
- Evidence: FileHistoryDialog.svelte:50,55; file-history.service.ts:47-50,72-74,101-104; SnapshotList.svelte:26-29; DiffViewer.svelte:34-37; file-history-light.png.
- Proposal: Toast on restore success and on error. Show inline errors with Retry and a "No differences from the current note" state. With no snapshots, use one compact empty state that points to the retention setting.
- Impact: A rare, high-stakes action never fails silently.

### P78 Graph labels collide, and orphan nodes dominate the canvas
- Tier: clear | Category: layout-density | Effort: M
- Areas: Graph view
- Sources: area:links
- Problem: Every label draws above k > 0.8 (the default zoom is 1.3) with no collision test. In the sample, 27 of 36 nodes are orphans.
- Evidence: GraphView.svelte:261-267, onMount scaleTo 1.3; GraphControls.svelte:89; graph-view-light.png.
- Proposal: Draw labels by linkCount priority and skip any that overlap, always labelling the hovered node and its neighbours. Default Orphans off, or dim orphans.
- Impact: The graph becomes readable.

### P79 The Todoist status chip is not actionable; Sync now and the log are in the palette only
- Tier: clear | Category: interaction | Effort: M
- Areas: Todoist sync
- Sources: area:plugins-misc
- Problem: The chip is a span, and the error text appears only in its title.
- Evidence: TodoistSyncStatus.svelte:17-30; commands.ts:278,284; AppOverlays.svelte:25.
- Proposal: Make the chip a button that opens the log, with the last error pinned and a Sync now button. Add Sync now and View log next to the Settings switch.
- Impact: A failing sync gets a recovery path.

### P80 The Todoist "Root project" control overflows onto its description
- Tier: clear | Category: layout-density | Effort: S
- Areas: Todoist settings
- Sources: area:plugins-misc
- Problem: The button and the w-44 select are wider than SettingItem's 50% control column.
- Evidence: TodoistSection.svelte:123-148; SettingItem.svelte:37; settings-todoist-light.png.
- Proposal: Use the stacked layout, turn "Load projects" into a "Refresh list" link, and load the list automatically once a token is saved.
- Impact: Fixes a visibly broken row.

### P81 The template picker hides the destination and the chosen template, and silently opens existing files
- Tier: clear | Category: interaction | Effort: M
- Areas: Templates
- Sources: area:plugins-misc
- Problem: The naming step does not name the template. Files always go to the vault root. An existing name opens that note without a word. There is no way back.
- Evidence: TemplatePicker.svelte:65-91; templates.service.ts:55-70; note-creator.service.ts:87-90.
- Proposal: Show a template chip and an editable destination (the active folder by default). Backspace on an empty field goes back. When the name exists, say "foo.md exists, Enter opens it".
- Impact: Notes land in the right place.

### P82 QueryJS table Prev/Next probably destroy the widget on mouse click (unverified lead)
- Tier: clear | Category: interaction | Effort: S
- Areas: QueryJS kb.ui.table
- Sources: area:plugins-misc
- Problem: Run stops mousedown as live-preview rule 11 requires, but Prev/Next do not, so CodeMirror probably reveals the source before the click fires. The tests use .click(), which cannot catch this. Not reproduced at runtime.
- Evidence: kb-ui.ts:505-545; queryjs-block-widget.ts:217,329; docs/agents/live-preview-rules.md rule 11; kb-ui.test.ts:789.
- Proposal: Page a table in the app first. If paging fails, add stopPropagation on mousedown and a mousedown-based test.
- Impact: Pagination works on dashboards.

---

## Moderate

### P83 Text selection is disabled app-wide with no opt-in
- Tier: moderate | Category: interaction | Effort: S
- Areas: app.css base
- Sources: area:foundation
- Problem: body is user-select: none, so errors, paths, version strings, Info values and toasts cannot be copied.
- Evidence: app.css:498; editor-theme.ts:40 (the only opt-in); settings-update-light.png.
- Proposal: Keep none on chrome, and add a selectable utility on settings content, toasts, dialogs, errors, Info rows and snippets.
- Impact: Errors and paths can be copied exactly when something goes wrong.

### P84 Active filter, sort and display state is shown by colour only
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: note-list Filter and Archive, Tasks filter bar, collection toolbar, graph filters
- Sources: area:note-list, area:tasks, area:collection, area:links
- Problem: In the note list, an active filter only tints the icon. Tasks triggers look the same whether modified or not. In collection, activeFilterCount is computed and never shown, and hidden columns give no indication.
- Evidence: RailNoteList.svelte:774-777; RailArchivedMenu.svelte:34-37; TasksView.svelte:999,1016,1033,1050; CollectionView.svelte:222,595-670; FilterPanel.svelte:101-105; GraphControls.svelte:99-123.
- Proposal: Show a count badge on Filter and Sort, a dot on Properties or Archive when they differ from the default, bg-accent on non-default triggers, and a one-click clear.
- Impact: Prevents "where did my notes go" confusion.

### P85 Hover and selected states: 28 hover recipes and about nine selected treatments, with no state tokens
- Tier: moderate | Category: color-theming | Effort: M
- Areas: rail, navigators, note list, Tasks lists, settings nav, menus, theme list
- Sources: lens:design-system, lens:feedback-motion, lens:type-color-density, area:shell, area:note-list
- Problem: The selected item uses a rail-hue mix, primary/25, file-explorer-primary/25, bg-accent or the hover token itself (in Settings nav, selected equals hover). One screen can show three selection colours.
- Evidence: Rail.svelte:359-371; FilesNavigator.svelte:293-298; TypesNavigator.svelte:281-287; NoteRow.svelte:70,89; TaskLists.svelte:185,191; SettingsPanel.svelte:137; AppearanceSection.svelte:173; command-item.svelte:16; RailNoteList.svelte:738; AppShell.svelte:191; landing-today-light.png, files-note-list-light.png.
- Proposal: Derive --state-hover, --state-selected and --state-selected-fg per surface, and add row-hover and row-selected utilities keyed to aria-current and data-selected. Rail hues stay on the icon only. Add the selected pair to READABILITY_PAIRS.
- Impact: One "you are here" signal across every column.

### P86 Six segmented controls with five selected looks, and only one has ARIA
- Tier: moderate | Category: consistency | Effort: S
- Areas: kanban view switch, calendar D/W/M, graph mode, search modes, collection view tabs, theme editor tabs
- Sources: lens:design-system, lens:feedback-motion, area:calendar, area:settings, area:foundation
- Problem: The selected item uses primary/10, bg-muted, a shadow pill, primary/15 or an underline. Search marks unavailable modes with opacity-40, so they look like unselected ones. The calendar uses one-letter labels and role=tab without a panel. The theme editor tabs have no tab semantics.
- Evidence: KanbanView.svelte:463-485; EventCalendarHeader.svelte:99-123; GraphControls.svelte:28-46; SearchPanel.svelte:83-95; CollectionView.svelte:522-551; ThemeEditor.svelte:176-185; calendar-week-light.png.
- Proposal: Build one SegmentedControl: a muted track, a raised selected pill, a disabled state with a reason tooltip, roving arrows, labels (Day/Week/Month at normal widths) and aria-pressed or a radiogroup. Page-level tabs use a separate Tabs primitive.
- Impact: The same look and keyboard model for daily view switching.

### P87 Interactive controls are nested inside other interactive controls; theme-row Edit also selects the theme
- Tier: moderate | Category: consistency | Effort: S
- Areas: collection triggers, Appearance theme list, editor tabs, note-row pills, File History snapshots
- Sources: lens:a11y-keyboard, area:foundation, area:collection, area:note-list, area:links, area:settings
- Problem: 14 popover and dropdown triggers render a button inside a button. The theme row is role=button with buttons inside it, so Enter on Edit selects and persists the theme, and Cancel then re-applies it. Theme actions are hover-only, and the card has no focus ring. Note-row pills are role=link spans with tabindex -1. The snapshot backup icon is a span with role=button that answers Enter only.
- Evidence: CollectionView.svelte:521,594-670; CalendarConfigPanel.svelte:51-123; FilterRow.svelte:114,156; FilterPanel.svelte:112,174; SortPanel.svelte:98-105,144; AppearanceSection.svelte:82-144,171-239; EditorTabs.svelte:51-85; NoteRow.svelte:67,113-116; SnapshotList.svelte:48-58.
- Proposal: Triggers use the child snippet, and row actions are siblings of the row button. Theme cards become a radio group with a visible "..." menu (Edit, Duplicate, Delete). Pills become separate buttons, or "Open first link" goes in the row menu. Enforce the rule with a source-scan test.
- Impact: Removes a class of keyboard bugs and double Tab stops.

### P88 Six colour pickers, and only one is accessible
- Tier: moderate | Category: accessibility | Effort: S
- Areas: canvas ColorPicker, TagColorPicker, IconPicker, kanban card and tag colours
- Sources: lens:a11y-keyboard, area:kanban, area:note-list, area:canvas
- Problem: Swatches carry only a title ("1".."6", "blue") and show selection only as a ring. The kanban tag popover responds to mousedown only and focus never enters it. Kanban card swatches inside a submenu are skipped by the menu's arrow keys. Clicking a tag opens the palette instead of filtering.
- Evidence: EventColorSwatches.svelte:26-49 (good); ColorPicker.svelte:20-35; TagColorPicker.svelte:32-63; IconPicker.svelte:219,234,260-308; KanbanCardText.svelte:49,56-57,65; KanbanCard.svelte:242-250.
- Proposal: Promote EventColorSwatches into a shared radiogroup primitive with human colour names, aria-checked and a visible focus ring. In menus, colours become menuitemradio. A plain tag click filters the board, and the colour moves to a context menu or Shift+click.
- Impact: Colours can be set from the keyboard, the same way in every picker.

### P89 Copy actions confirm in four ways, and Copy block link gives no feedback
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: copy block link, action bar, row menus, code blocks, tasks
- Sources: lens:feedback-motion, area:editor
- Problem: 13 clipboard writes behave four ways. Cmd+Shift+L shows nothing on success, returns silently on an empty line, and inserts "^id" before the clipboard write, so a failed write leaves a stray id. Copy path in the row menu says nothing, while the action bar shows a toast.
- Evidence: copy-block-link.service.ts:25,35-62; note-action-bar.service.ts:33-41,49,65; code-block-widget.ts:89-99; TasksView.svelte:585-590; FilesNavigator.svelte:206-207; NoteRowMenu.svelte:246,249; TypesNavigator.svelte:325-375.
- Proposal: Add one copyToClipboard(text, label). A trigger that stays visible swaps its label to "Copied". A trigger that disappears shows a short toast with the copied text. Failures always toast. Write to the clipboard before inserting a block id, and on an empty line say "Place the cursor on a block".
- Impact: Ends the paste-to-check habit and stray ids.

### P90 Async dialogs and actions have no pending-to-done loop
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: TypeNameDialog, ViewDialog, EventForm, Trash, Duplicate, type rename
- Sources: lens:feedback-motion, area:properties, area:settings
- Problem: TypeNameDialog closes before its work finishes, so a failure loses the typed name, and its taken-name toast is several sentences of jargon. ViewDialog shows empty filters and a silently disabled Save while loading. A bulk rename shows no progress. Trash restore and Duplicate give no success signal. Trash buttons are unnamed 28 px icons, and no vault means an empty view.
- Evidence: TypeNameDialog.svelte:40-45,64-74; type-definitions.service.ts:182-244; type-definitions.logic.ts:158; TypesNavigator.svelte:465-472; ViewDialog.svelte:51,65,78,198-218; EventForm.svelte:187; TrashSection.svelte:17-30,112-129; NoteRowMenu.svelte:84-85.
- Proposal: The dialog stays open with a busy button ("Saving..." after 300 ms) and an inline error that keeps the input. ViewDialog shows a skeleton and a reason next to the disabled Save. Show "Updating N notes...". Success toasts with Open or Reveal ("Restored X"). Trash buttons get names, and an empty Trash says "No vault open".
- Impact: Input is never lost, and slow actions stop looking dead.

### P91 Form validation fires on open, and error styles differ
- Tier: moderate | Category: interaction | Effort: S
- Areas: event form, view dialog, theme editor, type name dialog, formulas
- Sources: lens:feedback-motion, area:calendar, area:properties
- Problem: A new event opens with "Enter a title." in red and Save disabled. Other forms validate on the first keystroke or only on submit. Errors are text-xs in some dialogs and text-meta in others.
- Evidence: EventForm.svelte:38-39,73-75,187; event-calendar-form.logic.ts:104,163; ViewDialog.svelte:189-192; ThemeEditor.svelte:81,141-145; TypeNameDialog.svelte:66,68; FormulaRow.svelte:62; AutoOrganizeRuleRow.svelte:394.
- Proposal: Validate after blur or on submit, never on open. Add a placeholder, "Event title". Use one error style: text-meta, the error-text token (P27) and aria-describedby.
- Impact: Creating an event stops starting with an error.

### P92 Floating surfaces bypass the elevation tokens, and dialogs come in 8 widths
- Tier: moderate | Category: consistency | Effort: M
- Areas: settings sheet, dialogs, hand-built menus and pickers
- Sources: lens:design-system, area:settings
- Problem: The settings sheet and the pickers use literal shadows and white-alpha borders, and white or black alpha appears in 20 files. Dialog.Content widths include xs, 440, md, lg, 550, 720 and 5xl, with three paddings. Settings has no scrim.
- Evidence: SettingsPanel.svelte:116-117; KanbanCardText.svelte:46 (correct); TasksView.svelte:1187; EventDialog.svelte:192; TypeNameDialog.svelte:56; ModDialogHost.svelte:94; ViewDialog.svelte:169; IconPicker.svelte:165; TodoistSyncLogDialog.svelte:24; FileHistoryDialog.svelte:55.
- Proposal: Add a surface-floating utility and a test that bans new rgba literals outside theme.logic.ts. Give Dialog.Content a size prop (sm 400, md 520, lg 720, full) with one padding. The settings sheet uses shadow-xl and an optional light scrim.
- Impact: Floating surfaces stay consistent in every theme.

### P93 Chips and badges are rebuilt in every feature
- Tier: moderate | Category: consistency | Effort: M
- Areas: note list, editor tags, kanban, properties, collection filters, rail, tasks, calendar
- Sources: lens:design-system
- Problem: The type chip is copied three times and always uses primary, so Event, Person and Project look identical. Tags have three implementations, counts have three styles, and date chips use different radii.
- Evidence: NoteRow.svelte:103,114,124; styles.ts:269-276; KanbanCardText.svelte:37-38; PropertyField.svelte:171-186; Rail.svelte:374; FilterPanel.svelte:102,164; KanbanListView.svelte:48; KanbanTableView.svelte:69; KanbanDatePicker.svelte:58; EventTaskChip.svelte:27; BuildInfo.svelte:50.
- Proposal: Add a Badge primitive with count, tag (P19 hue pair), type (the type's own hue), date (P61) and status variants: rounded-sm, 18 px tall, text-label.
- Impact: Type, tag and due state are recognisable in every view.

### P94 Primitive gaps make features hand-roll their controls
- Tier: moderate | Category: consistency | Effort: L
- Areas: components/ui coverage
- Sources: area:foundation
- Problem: The code has 206 raw buttons against 97 uses of Button. There is no Checkbox (7 native inputs), Textarea or Spinner, and native selects appear although Select exists.
- Evidence: PropertiesPanel.svelte:80,98,127; EventDialog.svelte:202; PropertyField.svelte:126; RailPropertiesPicker.svelte:149; KanbanView.svelte:488; GraphControls.svelte:100,113; kanban-board-dark.png.
- Proposal: Add Checkbox, Textarea, Spinner and Tabs, alongside the Segmented (P86), Badge (P93) and toolbar (P21) primitives. Replace the native selects first, then migrate the surfaces other proposals flag.
- Impact: Accessibility and theming fixes land once.

### P95 Shortcut hints are spelled four ways, and the canvas shows "Ctrl+A" on a Mac
- Tier: moderate | Category: content-copy | Effort: S
- Areas: tooltips, canvas menu, calendar shortcuts, pickers, settings copy
- Sources: lens:design-system, area:canvas, area:editor
- Problem: formatShortcut renders glyphs, but tooltips say "(Cmd+D)", the canvas says "Ctrl+A", and calendar and settings use other spellings. Canvas Delete, Undo, Redo and Shift+2 have no hints, and the nouns drift ("+ Add card", "Create group", "Search vault files...").
- Evidence: utils/keybindings.ts:40; CommandPalette.svelte:62; NoteRowMenu.svelte:280; MarkdownEditor.svelte:755; NoteActionBar.svelte:148,157; CanvasContextMenu.svelte:115,119; CanvasInner.svelte:269,281-318,606,627; CanvasToolbar.svelte:25-37; CanvasFilePicker.svelte:57; event-calendar-keys.logic.ts:64-65; QuickCaptureSection.svelte:33; EventShortcutsDialog.svelte:23-24.
- Proposal: Add a Kbd primitive that goes through formatShortcut and use it everywhere. List the missing canvas shortcuts. Standardise canvas nouns with the verb "Add" ("Search notes...").
- Impact: Correct and discoverable shortcuts.

### P96 Developer jargon in user-facing copy
- Tier: moderate | Category: content-copy | Effort: S
- Areas: settings descriptions, note-list rule caption, calendar Needs attention, QueryJS settings intro
- Sources: area:settings, area:note-list, area:calendar, area:plugins-misc
- Problem: Descriptions expose "_one_on_one_every: true", "kb.pages()" and "run.log". The note-list caption reads "_type == 'Project', not archived" at 11 px. Needs attention says "all_day is not true or false", is always expanded to 160 px, and calls one state by two names. The QueryJS intro prints a repo path.
- Evidence: OneOnOneSection.svelte:90; TypesSection.svelte:55; FilesSection.svelte:25; TroubleshootingSection.svelte:56,67; RailNoteList.svelte:826-829; lens.logic.ts:307-312; EventCalendarNeedsAttention.svelte:17-39,74,82,94; QueryjsSection.svelte:45-50; rail-types-light.png, settings-queryjs-light.png.
- Proposal: Use plain words, with keys as copyable code chips. Long warnings get a "Learn more" disclosure. The caption becomes plain language or removable filter chips. Needs attention collapses to one line with plain reasons. Add an "Open QueryJS guide" button.
- Impact: Faster comprehension.

### P97 The empty editor is a dead end beside empty sidebar chrome
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: editor empty state, right sidebar
- Sources: area:shell, area:editor
- Problem: One line of text, with "No file open" and three panel headers beside it.
- Evidence: EditorView.svelte:153-158; AppShell.svelte:265; layout.logic.ts:23-28; PropertiesView.svelte:158; editor-empty-state-light.png.
- Proposal: Show a centred start card: five recent notes, New note, Quick switcher, Command palette and Today, each with its shortcut. Hide the right sidebar while no tab is open.
- Impact: The idle state becomes a launch point.

### P98 The right sidebar toggle covers the tab strip and is not accessible
- Tier: moderate | Category: accessibility | Effort: S
- Areas: AppShell toggle
- Sources: area:shell
- Problem: The toggle is absolutely positioned with a title only, has no aria-pressed and no ring, and covers the end of the tab strip.
- Evidence: AppShell.svelte:190-196; EditorTabs.svelte:52; landing-default-pane-sizes-light.png.
- Proposal: Reserve about 40 px for it in the strip, and add aria-label, aria-pressed and the focus ring.
- Impact: No covered tabs, and the control can be reached.

### P99 Zoom gives no feedback and is not persisted
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: zoom service
- Sources: area:shell
- Problem: Zoom changes silently, and the factor lives in a module variable that resets on launch.
- Evidence: zoom.service.ts:3-29; global-keybindings.ts:177-181.
- Proposal: Show a transient "125%" chip that resets on click, and persist the factor in settings.
- Impact: The user sees what the shortcut did and keeps the scale.

### P100 Full views hide the right sidebar but keep the note list
- Tier: moderate | Category: layout-density | Effort: S
- Areas: AppShell
- Sources: lens:ia-navigation
- Problem: Calendar, Tasks and kanban keep the navigator and the note list open beside them.
- Evidence: layout.logic.ts:14-28; AppShell.svelte:205-259; calendar-week-light.png, tasks-all-open-light.png, kanban-board-light.png.
- Proposal: Hide the left panels while a full-view tab is active, without changing the saved setting.
- Impact: Boards and calendars get the width they need.

### P101 A .view file has two homes, and the surface decides which one opens
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: Types navigator, Files, collection
- Sources: lens:ia-navigation
- Problem: Files opens the table tab, Types fills the note list, and the palette and wikilinks follow the Types rule.
- Evidence: NoteRow.svelte:71; TypesNavigator.svelte:414; commands.ts:98-110; rail-navigation.ts:32-38; editor-host.ts:185-188; FilesNavigator.svelte:412.
- Proposal: Let _open_in_editor decide everywhere, and add "Open as table" and "Show in note list" switches.
- Impact: Tables open predictably.

### P102 Nothing in the open note leads back to where it lives
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: note action bar breadcrumb, Neighbourhood lens, search
- Sources: area:editor, lens:ia-navigation
- Problem: The breadcrumb shows _type followed by the file name with .md, reads like a folder path and is static. There is no "Reveal in list". Neighbourhood has no rail row and no way back. Escape on search only blurs. The organized toggle reuses the Tasks "done" glyph.
- Evidence: note-action-bar.logic.ts:5-9,32-37; NoteActionBar.svelte:128-132,155-167; rail-items.logic.ts:24-25; lens.logic.ts:196; open-search.service.ts:11-15; note-action-bar-light.png.
- Proposal: Show a type chip, then the folder, then the title without .md; each segment is clickable and the title renames on click. Add a "Reveal in list" command. Neighbourhood gets a dismissible chip. Escape on an empty search returns to the previous lens. The organized toggle shows text or an inbox-check icon.
- Impact: The user can always find and return to a note's home.

### P103 The macOS menu bar holds almost nothing
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: native menu
- Sources: lens:ia-navigation
- Problem: There is no File, View, Go or Note menu, and no way to switch vaults once one is open.
- Evidence: src-tauri/src/lib.rs:212-247; routes/(app)/+page.svelte:13-17.
- Proposal: Add File, View, Go and Note menus with accelerators, including Open vault and Open recent.
- Impact: Commands and shortcuts become discoverable where Mac users look.

### P104 Sidebar panels and feature settings can be reached only through the Settings sheet
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: right sidebar, settings deep links
- Sources: lens:ia-navigation
- Problem: Panels are shown or hidden only in Settings > Layout, and nothing calls settingsPanelStore.open(section) with a section.
- Evidence: LayoutSection.svelte:129-150; commands.ts:322-330; settings-panel.store.svelte.ts:11.
- Proposal: Add a hide control on each panel header, an "add panel" menu, and "Configure..." links that open Settings at the right section.
- Impact: Settings change where they are used.

### P105 Trash can be browsed only from inside Settings
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: Trash, rail
- Sources: lens:ia-navigation
- Problem: Archive is a rail lens and Trash is a settings page. Trashing a note offers no Undo and no "View Trash".
- Evidence: TrashSection.svelte; delete-note.service.ts:14-19; rail-items.logic.ts:46.
- Proposal: Add a hideable Trash lens next to Archive, an "Open Trash" command, and Undo on the toast (P01).
- Impact: Recovery takes one step.

### P106 Appearance has no light/dark pairing or "Match system", and the vault picker is always dark
- Tier: moderate | Category: interaction | Effort: M
- Areas: Appearance, theme.service, vault picker
- Sources: area:foundation, lens:type-color-density
- Problem: There is one active theme and no prefers-color-scheme. app.html ships class="dark", so the picker shows the stale fallback palette.
- Evidence: AppearanceSection.svelte:87-90; theme.service.ts:27-35; src/app.html:2; app.css:215-377; vault-picker-light.png.
- Proposal: Add Light theme, Dark theme and Match system controls that listen to matchMedia. Cache the last theme variables in localStorage and apply them before the first paint.
- Impact: The theme follows the OS, and the app stops launching in the wrong theme.

### P107 The theme editor exposes 128 raw tokens with no preview, search, reset or contrast check
- Tier: moderate | Category: information-architecture | Effort: L
- Areas: ThemeEditor
- Sources: area:settings, area:foundation
- Problem: There are five tabs of hex rows, buildTheme is not used, ThemePreview is not shown, and Cancel discards instantly. The tabs lack semantics, and the swatches have no label or ring.
- Evidence: theme-editor.logic.ts:42-190; ThemeEditor.svelte:80-83,109-121,176-184; ThemeColorRow.svelte:51-61; theme-builder.logic.ts:19,105,302-318.
- Proposal: Open on a Simple tab of about 12 core colours that regenerate the rest through buildTheme. Keep Advanced overrides with reset-to-derived. Show contrast pass/fail chips, a sticky ThemePreview header, token search, a confirm on discard when dirty, and labelled swatches.
- Impact: A usable theme takes a minute instead of 128 values.

### P108 The theme catalog reports the same failure twice and does not finish the install
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: theme catalog
- Sources: area:foundation
- Problem: Every visit fetches the catalog. On failure it shows a toast and an inline error, and the toast covers the panel. Install does not apply the theme.
- Evidence: AppearanceSection.svelte:44-68,260-289; settings-appearance-light.png, settings-appearance-dark.png.
- Proposal: Show only the inline state, with a last-checked time and the cached list. Offer "Install and apply".
- Impact: Quieter offline use.

### P109 In the dark default theme the tab strip is the brightest surface
- Tier: moderate | Category: color-theming | Effort: S
- Areas: KokoBrain Default elevation
- Sources: lens:type-color-density
- Problem: The tabBar override #5a5c79 is 2.1:1 lighter than the editor background.
- Evidence: theme.logic.ts:119-120,155; theme-builder.logic.ts:238; Rail.svelte:270; AppShell.svelte:256,276; calendar-week-dark.png, kanban-board-dark.png.
- Proposal: Drop the override and give the active tab the editor surface. Add a builder check on the tab strip's luminance.
- Impact: Content becomes the brightest area again.

### P110 Editor headings sit closer to the text above than to their own content
- Tier: moderate | Category: typography | Effort: S
- Areas: live-preview heading rhythm
- Sources: lens:type-color-density
- Problem: Headings get no top space, so each one floats between sections.
- Evidence: styles.ts:171-212; editor-theme.ts:47-50; editor-live-preview-scrolled-light.png.
- Proposal: Add padding-top per level (about 1.2em, 0.8em, 0.5em) and a "Space above headings" multiplier, and reuse the values in canvas-markdown.css.
- Impact: Long notes become scannable.

### P111 Meta-bind inline controls use three looks, and the number field is stretched
- Tier: moderate | Category: consistency | Effort: S
- Areas: live-preview meta-bind controls
- Sources: area:foundation, area:editor
- Problem: The select is a pill, the number field is about 190 px for one digit, and the date field uses native chrome with a forced !important colour at 70%.
- Evidence: styles.ts:683-800; widgets.ts:1047-1060; app.css:473-482; editor-live-preview-light.png.
- Proposal: Give all controls one base (height, radius, padding). Size the number field to its content (minimum about 4ch), style the date field with tokens, and scope the date colour rule.
- Impact: The daily meta-bind controls read as one family.

### P112 Live-preview widgets have thin loading and error states (embeds, images, mermaid, math, QueryJS)
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: embeds, images, mermaid, math, QueryJS block
- Sources: area:editor, area:plugins-misc
- Problem: Embeds show raw markdown in a 200 px box. Missing images are unstyled, and there is no onerror. Mermaid is blank while rendering, and math errors fall back to raw text. QueryJS shows text only while running, Run has no running state, and errors are all italic red.
- Evidence: widgets.ts:133-186,615,705-713; styles.ts:677-685,883-891; mermaid-widget.ts:80-108; math-widget.ts:62-64; queryjs-block-widget.ts:118-121,203-243,299-330.
- Proposal: Render embeds with the inline renderer, show a dashed placeholder for missing images with onerror fallbacks, give mermaid a reserved-height skeleton, and show the KaTeX error. QueryJS gets a spinner, a disabled Run while running, and an upright error with the stack in details, keeping mousedown stopPropagation.
- Impact: Failures stop looking like content, and layout stops jumping.

### P113 Editor widget controls are mouse-only
- Tier: moderate | Category: accessibility | Effort: M
- Areas: task checkbox, code Copy, callout popover, embed header, table wikilinks
- Sources: area:editor
- Problem: These controls act on mousedown only. Copy appears only on hover and has no catch. The code language select is unlabelled. The callout popover ignores keys. There is no command to toggle the task under the cursor.
- Evidence: widgets.ts:37-50,336-353,675-681; code-block-widget.ts:89-99,147; callout-field.ts:26-34,67-98; styles.ts:345-361.
- Proposal: Also handle click and Enter or Space, reveal on :focus-within, add aria-labels, add Escape and arrow keys to the popover, add a "Toggle task" command with a shortcut, and announce "Copied".
- Impact: Tasks and code can be used from the keyboard.

### P114 Callouts show a lowercase type word, a chevron on every callout, and an italic body
- Tier: moderate | Category: typography | Effort: M
- Areas: live-preview callouts
- Sources: area:editor
- Problem: The type word is lowercase, the fold chevron appears even when a callout is not foldable, and blockquote italics carry into callouts.
- Evidence: callout-field.ts:28,196-215; styles.ts:504; highlight-styles.ts:39; editor-live-preview-light.png.
- Proposal: Show a colour-matched icon that opens the type menu, show the chevron only for +/- callouts, use the type as the title when none is given, and cancel italics inside callouts.
- Impact: Callouts read as callouts.

### P115 The table of contents has decorative chevrons, no current heading, and loses state on tab switch
- Tier: moderate | Category: interaction | Effort: M
- Areas: Table of contents
- Sources: area:editor
- Problem: Chevrons appear on every row and do nothing. There is no scroll-spy. The panel collapses on each tab switch.
- Evidence: TableOfContentsPanel.svelte:18-32,60,62; toc.store.svelte.ts; toc.logic.ts; right-sidebar-all-expanded-light.png.
- Proposal: Remove the chevrons or make them collapse subtrees. Highlight the current heading with aria-current. Remember the open state. Add a "Go to heading" command.
- Impact: Navigation in long notes keeps its place.

### P116 Two different word counts on screen
- Tier: moderate | Category: consistency | Effort: S
- Areas: status bar count, Info panel
- Sources: area:editor
- Problem: The status bar shows 268 and Info shows 242, because the status bar counts code-block source. There is no selection count, and it says "1 words".
- Evidence: word-count.logic.ts:1-12; note-info.logic.ts:32; src-tauri/src/vault/entry.rs:267; WordCount.svelte:33; editor-live-preview-light.png.
- Proposal: Use one definition (body only), show "N of M words" for a selection, and pluralise correctly.
- Impact: One trustworthy number.

### P117 The note row's second line differs across lenses
- Tier: moderate | Category: consistency | Effort: S
- Areas: NoteRow subtitle
- Sources: area:note-list
- Problem: Files shows a kind word and no time, and the folder repeats inside folder lists.
- Evidence: lens.logic.ts:258-260,924-975; files-note-list-light.png, rail-types-light.png.
- Proposal: Show the relative time first, the folder only for cross-folder lists, and the kind through the icon.
- Impact: Consistent scanning.

### P118 An italic title means "unorganized", with no legend
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: NoteRow
- Sources: area:note-list
- Problem: The italics appear in other lenses too and look like a rendering quirk.
- Evidence: lens.logic.ts:291; NoteRow.svelte:89; rail-types-light.png.
- Proposal: Use a small dot or an Inbox chip, and keep italics only inside the Inbox lens.
- Impact: The state becomes readable.

### P119 System folders mix into the Files tree, with no counts
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: FilesNavigator
- Sources: area:note-list
- Problem: _system and _templates sit at the top, and folders show no counts.
- Evidence: lens.logic.ts:937-940; FilesNavigator.svelte:479-494; files-note-list-light.png.
- Proposal: Dim underscore folders and sort them last, or offer a setting to hide them. Add optional counts.
- Impact: Browsing focuses on the user's content.

### P120 The "My people" section: raw empty state, ambiguous labels, overdue by colour only
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: Today lens, one-on-one
- Sources: area:note-list, area:plugins-misc
- Problem: The empty state prints "_one_on_one_every" and wraps one word per line. "3d" has no context, overdue is an 11 px warning colour, and the buttons have no focus style.
- Evidence: MyPeopleSection.svelte:35-74; one-on-one.logic.ts:227-236; landing-today-light.png, narrow-1024x700-today-light.png.
- Proposal: Hide the section when no one is configured, or show a short setup link. Use "3d ago" or "2d overdue" with an icon, focus rings and text-meta.
- Impact: Removes a bug-looking block from the default landing list.

### P121 A narrow right sidebar truncates property names to one letter
- Tier: moderate | Category: layout-density | Effort: M
- Areas: Properties rows
- Sources: area:properties
- Problem: The key, the value and an always-reserved remove button squeeze each other, and a dead 16 px spacer takes more room.
- Evidence: PropertyField.svelte:108-164; PropertiesView.svelte:167-203; AppShell.svelte:271; narrow-1024x700-editor-light.png.
- Proposal: Below about 220 px, a container query stacks the key over the value. The remove button leaves the flow and shows on hover or focus. Raise the pane minimum (P32).
- Impact: The panel stays readable on a laptop.

### P122 List property chips cannot be edited or reordered, and add/remove are hover-only
- Tier: moderate | Category: interaction | Effort: M
- Areas: PropertyField list values
- Sources: area:properties
- Problem: Chips are static. Enter and blur behave differently. Controls are at opacity 0, and an empty list shows only the key.
- Evidence: PropertyField.svelte:147-153,168-201,192-196.
- Proposal: Click a chip to edit it, drag to reorder, keep the input open after Enter, and show a visible "+" chip ("Add item" when the list is empty).
- Impact: Removes the delete-and-retype detour on tags.

### P123 Info values truncate their own dates and hide read failures behind "--"
- Tier: moderate | Category: content-copy | Effort: S
- Areas: NoteInfo
- Sources: area:properties
- Problem: "November 10, 2026, 1..." is clipped, and a failed read shows the same "--" as an unknown value.
- Evidence: NoteInfo.svelte:29-33,51; note-info.logic.ts:13-19; editor-live-preview-light.png.
- Proposal: Use a short format with the full text in a tooltip, and show "Unavailable" when the read fails.
- Impact: Info shows what it exists for.

### P124 Path and format fields have no validation, picker or preview
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: Quick Capture, Periodic Notes, 1:1, Files settings
- Sources: area:settings, area:calendar
- Problem: Template paths are truncated free text with no existence check. Date formats ("YYYY-[W]WW") show no example. "Day starts at" actually sets the scroll hour.
- Evidence: SettingItem.svelte:37; QuickCaptureSection.svelte; PeriodicNotesSection.svelte:20-80; OneOnOneSection.svelte:62-80; EventCalendarSection.svelte:157; settings-quick-capture-light.png, settings-periodic-notes-light.png.
- Proposal: Use the stacked layout and a template picker with "File not found". Show a live "Example: Daily/2026-11-10.md" line, validate on blur, and rename the field to "Scroll to hour on open".
- Impact: Catches misconfiguration for the daily features.

### P125 Periodic Notes repeats five identical Format and Template blocks
- Tier: moderate | Category: layout-density | Effort: M
- Areas: Periodic Notes settings
- Sources: area:settings
- Problem: Ten near-identical rows on one long page.
- Evidence: PeriodicNotesSection.svelte:34-131.
- Proposal: One pair of fields driven by a segmented control, showing the Daily-only switches when Daily is picked, or a compact 5-row table.
- Impact: The page fits one screen.

### P126 The update "Check" button also downloads and installs, and progress is text only
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: Update settings
- Sources: area:settings
- Problem: The label under-promises what it does, the size can show "?", and errors appear as raw strings.
- Evidence: UpdateSection.svelte:123,167-210,276,282.
- Proposal: Split into Check, then "Download vX.Y.Z", with a determinate progress bar, a release notes link, friendly errors with a details disclosure, and an explicit handler.
- Impact: A predictable update flow.

### P127 The time grid and Today never scroll to the now-line
- Tier: moderate | Category: interaction | Effort: S
- Areas: event calendar time grid
- Sources: area:calendar
- Problem: The grid scrolls only to dayStartHour on mount. After 17:00 the now-line is off screen.
- Evidence: EventTimeGrid.svelte:97-100; event-calendar-layout.logic.ts; calendar-week-light.png.
- Proposal: Scroll the now-line to about a third of the height on mount and on Today, and show a "Now" pill when it is off screen.
- Impact: "What's next" stops needing a scroll.

### P128 Day view stacks two headers and uses a third of the height
- Tier: moderate | Category: layout-density | Effort: M
- Areas: event calendar day view
- Sources: area:calendar
- Problem: The day is named twice, an empty All day row takes space, and events become 960 px bars.
- Evidence: EventCalendarView.svelte:250-251; EventTimeGrid.svelte:253; calendar-day-light.png.
- Proposal: Drop the in-grid header, collapse an empty all-day row, and cap event width at about 720 px.
- Impact: More of the timeline visible.

### P129 Event creation gestures are hidden and inconsistent
- Tier: moderate | Category: interaction | Effort: M
- Areas: event calendar interaction
- Sources: area:calendar
- Problem: A click creates in the time grid, a double-click in month, a click in the all-day lane. A stray click opens a dialog. None of this is documented.
- Evidence: EventTimeGrid.svelte:119-141; event-calendar-drag.logic.ts:192-195; EventMonthGrid.svelte:45-63; EventAllDayLane.svelte:47-50; EventDayHeaders.svelte:14-18; event-calendar-keys.logic.ts:57-67.
- Proposal: Drag or double-click creates and a single click selects, everywhere. Add a Mouse section to the shortcuts dialog and an empty-range hint.
- Impact: No accidental dialogs.

### P130 The daily-note icon repeats in every cell and header
- Tier: moderate | Category: consistency | Effort: S
- Areas: event calendar cells
- Sources: area:calendar
- Problem: 42 notebook-pen icons at 60% read as edit or new, with native title hints.
- Evidence: EventDailyNoteButton.svelte:30,32; EventMonthGrid.svelte:120; EventDayHeaders.svelte:47; calendar-month-light.png.
- Proposal: Reveal it on hover or focus-within, keep it visible on today, use a clearer glyph and a shared Tooltip.
- Impact: Cuts constant visual noise.

### P131 The rail periodic-notes list has no daily row and no existence cue
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: Calendar rail navigator
- Sources: area:calendar
- Problem: There is no daily row. "Open or create" can silently create a note. The weekly path has no error toast. The month title secretly means "Go to today".
- Evidence: calendar.logic.ts:121-142; calendar-rail.service.ts:36-43; CalendarNavigator.svelte:80-82,113-151; calendar-plugin-navigator-light.png.
- Proposal: Add a "Today, Tue 10 Nov" row, mark notes that exist versus ones not yet created, toast weekly failures, add an explicit Today button and make the month title a plain label.
- Impact: Prevents accidental empty notes.

### P132 Calendar grids: five implementations, and only the date picker has grid semantics
- Tier: moderate | Category: accessibility | Effort: M
- Areas: rail mini month, collection calendars, event month grid
- Sources: lens:a11y-keyboard, area:calendar
- Problem: The mini month is 48 Tab stops, each named "10" or "46". Note days are marked by colour dots only, and today's ring looks like focus. The collection calendars have no keyboard support, and the event month has no arrows.
- Evidence: KanbanDatePicker.svelte (good); CalendarGrid.svelte:30-75,58,59; CollectionCalendarView.svelte:144; CollectionLinearCalendarView.svelte; EventMonthGrid.svelte:91,112; rail-calendar-light.png.
- Proposal: Add a shared roving-grid helper: arrows, PageUp and PageDown, Enter. Give each day a full-date aria-label with "N notes", and mark today with a filled number.
- Impact: Daily-note navigation by keyboard.

### P133 New canvas cards are not ready to type into and stack on each other
- Tier: moderate | Category: interaction | Effort: S
- Areas: canvas creation flow
- Sources: area:canvas
- Problem: A new card is not selected or in edit mode, toolbar adds land on the same centre, and menu adds use different positions.
- Evidence: CanvasInner.svelte:474-545,644-654; TextNode.svelte:20-25,76.
- Proposal: Start new text cards in edit mode and selected, remember the click position for menu adds, and cascade repeated adds by 20-30 px.
- Impact: Saves a double-click on every new card.

### P134 A single click on a canvas file or link header navigates away
- Tier: moderate | Category: interaction | Effort: S
- Areas: canvas FileNode, LinkNode
- Sources: area:canvas
- Problem: The title row, the natural grab spot, opens the note or the browser. The open icon is hover-only, and URL failures are swallowed.
- Evidence: FileNode.svelte:66-71,134-142; LinkNode.svelte:83-90,118-122.
- Proposal: A click selects. Open with Cmd+click, double-click or a persistent icon. Toast URL failures.
- Impact: No accidental navigation while arranging cards.

### P135 Canvas text cards are hard to enter and cramped once editing
- Tier: moderate | Category: interaction | Effort: M
- Areas: canvas TextNode
- Sources: area:canvas
- Problem: Editing needs a double-click. The textarea is 40 px with its own resizer and outline none.
- Evidence: TextNode.svelte:59,62-77,112-125.
- Proposal: Enter or F2 starts editing. The textarea fills the card, a primary ring shows while editing, and a one-time markdown hint appears.
- Impact: Faster writing in cards.

### P136 Canvas connection handles are hidden until hover and only 8 px
- Tier: moderate | Category: interaction | Effort: S
- Areas: canvas handles
- Sources: area:canvas
- Problem: Handles are at opacity 0, with no larger hit area, and there are eight stacked handles per card.
- Evidence: CanvasInner.svelte:807-816; TextNode.svelte:81-88; ImageNode.svelte:64-67.
- Proposal: Show handles on selected nodes too, give them a 16 px hit area, and use one handle per side in loose mode.
- Impact: Connecting cards becomes discoverable.

### P137 Canvas file and image cards give weak or stale status
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: canvas FileNode, ImageNode
- Sources: area:canvas
- Problem: A note card reads its file once and never refreshes, and its error names no file. Images show the same state for loading and failure, use the path as alt text, and crop with cover.
- Evidence: FileNode.svelte:30-52,80-81; ImageNode.svelte:54,60,100.
- Proposal: Refresh on vault change, show "Note not found: <name>" with Open and Remove, separate a skeleton from "Image not found", and use object-fit contain.
- Impact: Cards stay trustworthy.

### P138 Collection view-tab actions hide behind double-click and right-click
- Tier: moderate | Category: interaction | Effort: S
- Areas: collection view tabs
- Sources: area:collection
- Problem: Rename and delete are hidden, there is no type icon, and Delete is disabled without a reason.
- Evidence: CollectionView.svelte:534-584.
- Proposal: Add a chevron menu on the active tab, a type icon, and a tooltip on the disabled Delete.
- Impact: View management becomes discoverable.

### P139 The filter conjunction selector looks like plain text
- Tier: moderate | Category: interaction | Effort: S
- Areas: FilterPanel
- Sources: area:collection
- Problem: "All the following are true" is a borderless button.
- Evidence: FilterPanel.svelte:113-115,175-177; FilterRow.svelte:114-121.
- Proposal: Use a bordered select trigger with a chevron, labelled "Match all of".
- Impact: Surfaces and/or/not logic.

### P140 Sort rows drag with no indicator and no keyboard path
- Tier: moderate | Category: interaction | Effort: S
- Areas: SortPanel
- Sources: area:collection
- Problem: No drop line, no keyboard reorder, an orphan listitem role, and unnamed icons.
- Evidence: SortPanel.svelte:58-63,80-92,126-133.
- Proposal: Draw an insertion line, add Alt+Up/Down, wrap the rows in a list, and label "Remove sort by X".
- Impact: Predictable reordering.

### P141 Collection columns cannot be reordered
- Tier: moderate | Category: interaction | Effort: M
- Areas: collection PropertiesPanel
- Sources: area:collection
- Problem: The panel offers checkboxes only, while the stored order is persisted but cannot be edited.
- Evidence: PropertiesPanel.svelte:79-102; CollectionView.svelte:392-395.
- Proposal: Add drag handles, with visible columns listed first in their order.
- Impact: Tables read the way the owner wants.

### P142 Collection tables have no sticky header or cell truncation
- Tier: moderate | Category: layout-density | Effort: S
- Areas: CollectionTableView
- Sources: area:collection
- Problem: With up to 200 rows the header scrolls away, and nowrap cells grow without limit.
- Evidence: CollectionTableView.svelte:20,39-61.
- Proposal: Make thead sticky, and give text cells a max-width with truncation and a title.
- Impact: Long tables stay readable.

### P143 The kanban filter has no clear button, gives no empty feedback, and leaks across boards
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: kanban filter
- Sources: area:kanban
- Problem: There is no X and Escape does nothing. Lane counts show filtered numbers. The query lives in a module store and follows the user to other boards. It matches raw {color:} tokens.
- Evidence: KanbanView.svelte:240,500-505,524; KanbanLane.svelte:312; kanban.store.svelte.ts:11,17; kanban.service.ts:39; kanban.logic.ts:917-921; RailListSearch.svelte:106-112.
- Proposal: Add an X and Escape to clear, keep filter state per board, show "3 of 11 cards", add a "No cards match" placeholder per lane, show "n of m" counts, and match displayed text only.
- Impact: Ends "my cards vanished" moments.

### P144 Kanban list, table and archive show raw text and dead ends
- Tier: moderate | Category: content-copy | Effort: M
- Areas: kanban list/table views, archive
- Sources: area:kanban
- Problem: The table shows raw #tags and [[links]] and repeats the tags. Checks are unlabelled. Archive rows show {date} and {color:} tokens. Restore always goes to the first lane.
- Evidence: KanbanTableView.svelte:31-79; KanbanListView.svelte:35-43; KanbanView.svelte:332-336,596-616.
- Proposal: Strip tags and render links, add aria-labels and an empty row, run archive rows through stripCardMetadata, and restore to the original lane with a toast.
- Impact: Usable alternate views.

### P145 Inline kanban card editing is one fixed row and exposes metadata tokens
- Tier: moderate | Category: interaction | Effort: S
- Areas: kanban card edit
- Sources: area:kanban
- Problem: rows=1 with no auto-grow, the {date} and {color} tokens are editable, and focus is not returned. This was read from the code.
- Evidence: KanbanCard.svelte:92-105,180-189.
- Proposal: Use field-sizing: content, edit only the display text, and return focus to the card.
- Impact: Safer editing of long cards.

### P146 The rule filter borrows collection-view wording and has two add buttons
- Tier: moderate | Category: consistency | Effort: M
- Areas: auto-organize filter builder
- Sources: area:organize
- Problem: "This view" makes no sense in a rule. "Add filter" and "Add expression" sit side by side. The layout uses an ml-[6.5rem] hack.
- Evidence: FilterPanel.svelte:149,158-162,211; AutoOrganizeRuleRow.svelte:332-355.
- Proposal: Label the block "When", hide the header in rules, offer one "Add condition" split button, and use a two-column grid.
- Impact: The rule reads as a sentence.

### P147 Property rows pack six controls and unexplained jargon
- Tier: moderate | Category: layout-density | Effort: M
- Areas: auto-organize Set properties
- Sources: area:organize
- Problem: Key, source, type, value, mode and delete sit in one row, and the mode labels are unexplained.
- Evidence: AutoOrganizeRuleProperty.svelte:51-56,222-352; auto-organize-rule-builder-light.png.
- Proposal: Write each row as a sentence: [key] [Set if empty | Set always | Add to list | Remove] [value], with an advanced caret and verb tooltips.
- Impact: The most common action becomes self-explanatory.

### P148 Rule validation errors are colour-only and not tied to their fields
- Tier: moderate | Category: accessibility | Effort: M
- Areas: auto-organize forms
- Sources: area:organize
- Problem: Errors are red paragraphs with no aria-invalid. "It is not saved." trails the message. Captions are spans, and some inputs are placeholder-only.
- Evidence: AutoOrganizeRuleRow.svelte:288-293,329-531; AutoOrganizeRuleProperty.svelte:354-364; input.svelte:30; AutoOrganizeSection.svelte:127-139,184-191.
- Proposal: Add aria-invalid and aria-describedby, an icon with role=alert, "Not saved: ..." wording, real labels and aria-labels.
- Impact: Errors become perceivable without colour.

### P149 New rules, properties and expressions are added without scroll or focus
- Tier: moderate | Category: interaction | Effort: S
- Areas: auto-organize interaction
- Sources: area:organize
- Problem: A new rule appears below the fold with focus left on the button.
- Evidence: AutoOrganizeSection.svelte:49-60,145; AutoOrganizeRuleRow.svelte:161-165,435-438,481.
- Proposal: Scroll the new item into view, expand it and focus its first input, and announce it politely.
- Impact: Removes the "did it work?" moment.

### P150 Excluded folders accept anything and give no feedback
- Tier: moderate | Category: feedback-states | Effort: S
- Areas: auto-organize excluded folders
- Sources: area:organize
- Problem: Free text, duplicates are ignored silently, unknown folders are not flagged, and the placeholder reads like a typed value.
- Evidence: AutoOrganizeSection.svelte:90-97,184-191,202; settings-auto-organize-light.png.
- Proposal: Add folder autocomplete, "Already excluded", stale-chip marking, "No folders excluded", and the placeholder "e.g. _templates".
- Impact: Fewer typos in exclusions.

### P151 A legacy "file icon" button duplicates the _icon property
- Tier: moderate | Category: consistency | Effort: M
- Areas: auto-organize Move row
- Sources: area:organize
- Problem: Two controls with two names set the same icon under different conditions.
- Evidence: AutoOrganizeRuleRow.svelte:408-421,540-549; auto-organize.service.ts:360-364; AutoOrganizeRuleProperty.svelte:279-288.
- Proposal: Migrate rule.icon to an _icon property row and remove the button.
- Impact: One way to set an icon.

### P152 Property rows are keyed by index, so error state follows the wrong row
- Tier: moderate | Category: interaction | Effort: S
- Areas: auto-organize Set properties
- Sources: area:organize
- Problem: After a delete, local drafts and errors shift to the next row. Traced in code, not reproduced.
- Evidence: AutoOrganizeRuleRow.svelte:427,468; AutoOrganizeRuleProperty.svelte:65-79.
- Proposal: Key rows by a stable client id.
- Impact: Avoids confusing wrong-row errors.

### P153 The File History diff lacks orientation
- Tier: moderate | Category: content-copy | Effort: M
- Areas: File History diff
- Sources: area:links
- Problem: The header shows an epoch timestamp, the newest snapshot is labelled "Current", the columns are unlabelled, and there is no change summary or navigation.
- Evidence: FileHistoryDialog.svelte:83-84,96; file-history.logic.ts:46-50; DiffViewer.svelte:43-48.
- Proposal: Use "Compared with current note" with +N/-M chips, "Latest saved version", Previous and Next change buttons, column headers, and one noun ("version").
- Impact: The user knows what they are restoring.

### P154 Graph controls: an always-open panel, unlabelled buttons, fake switches, native selects
- Tier: moderate | Category: consistency | Effort: M
- Areas: Graph controls
- Sources: area:links
- Problem: Three cards cover the canvas. The switches are plain buttons. Search filters nodes instead of highlighting them. Close duplicates the tab close.
- Evidence: GraphControls.svelte:26-141; graph-view.logic.ts:90; graph-view-light.png.
- Proposal: Use one Filters popover with an active count, shadcn Switch and Select, text mode buttons, and search that highlights and pans. Remove Close.
- Impact: More canvas and consistent controls.

### P155 The local graph has a fixed depth and no isolated, loading or error state
- Tier: moderate | Category: feedback-states | Effort: M
- Areas: Graph view
- Sources: area:links
- Problem: Depth is fixed at 1, an isolated note is a lone dot, the canvas is blank while building, and errors only reach the log.
- Evidence: GraphView.svelte:81-91,100,451-462.
- Proposal: Add a depth stepper (1-3), "This note has no links yet", a skeleton, an inline error with Retry, and an empty-vault message.
- Impact: The local graph becomes useful while writing.

### P156 The graph canvas is mouse-only and ignores reduced motion
- Tier: moderate | Category: accessibility | Effort: L
- Areas: Graph view
- Sources: area:links
- Problem: The canvas has no role, no tabindex, no Cmd-click and no reduced-motion handling.
- Evidence: GraphView.svelte:135-137,349-350,450.
- Proposal: Add role=img with a summary, a focusable canvas with neighbour navigation, Cmd-click for a new tab, and run the simulation to rest without animation under reduced motion.
- Impact: Keyboard access and open-in-tab.

### P157 The Tags tree has no filter box, tiny targets and misaligned leaves
- Tier: moderate | Category: interaction | Effort: M
- Areas: Tags view
- Sources: area:links
- Problem: There is no search. The chevron is about 20 px and unlabelled. Leaf dots sit 12 px off. The colour dot has no label.
- Evidence: TagsView.svelte:57-76; TagItem.svelte:29-62; TagColorPicker.svelte:32.
- Proposal: Add a filter input, a fixed chevron slot, a 24 px hit area, and "Change color for #tag".
- Impact: Faster tag navigation.

### P158 Search result cards show raw markdown, unstyled highlights and a redundant path
- Tier: moderate | Category: content-copy | Effort: M
- Areas: search result card
- Sources: area:finders
- Problem: Snippets show **, # and [[ ]], <mark> has no style, and the subtitle repeats the file name.
- Evidence: SearchResult.svelte:161-172; sanitize.ts:54-63; app.css (no mark rule); search-results-light.png.
- Proposal: Strip markdown from snippets (shared with P74), style mark with a theme token, and show the parent folder only.
- Impact: The user sees why a note matched.

### P159 Palette ranking puts Undo and Redo above "Go to Calendar"
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: command palette ranking
- Sources: area:finders
- Problem: The fuzzy score rewards short targets, and 13 of 38 commands are filed under Navigation.
- Evidence: fuzzy-match.ts:34-47; command-palette.logic.ts:29-41; commands.ts:105,236,253-262; command-palette-filtered-light.png.
- Proposal: Boost word starts and leading verbs, add a frequency term, and recategorise the commands.
- Impact: Two letters find the intended command.

### P160 The palette's empty query has no Recent section and no key hints
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: palette, switcher empty state
- Sources: area:finders
- Problem: Recents and the rest form one flat list, and there is no footer.
- Evidence: command-palette.logic.ts:9-17; QuickSwitcher.svelte:73-95; command-group.svelte:25.
- Proposal: Add a Recent group with a heading and a footer of key hints.
- Impact: Recents and extra actions become discoverable.

### P161 Search operators and the fuzzy toggle are undiscoverable
- Tier: moderate | Category: interaction | Effort: S
- Areas: search input
- Sources: area:finders
- Problem: tag: and path: are never shown, and the fuzzy toggle is a bare tilde with no name.
- Evidence: search.logic.ts:6-7; SearchPanel.svelte:118,164-168.
- Proposal: List operator examples and recent queries in the empty state, and make the toggle a labelled Fuzzy control with aria-pressed in the mode row.
- Impact: Surfaces the strongest search features.

### P162 Search panel markup and async status changes are silent to assistive tech
- Tier: moderate | Category: accessibility | Effort: S
- Areas: search panel, save status, indexing, copy block link, Todoist
- Sources: area:finders, lens:a11y-keyboard
- Problem: Inputs are placeholder-only. Modes have no pressed state. Results have no list roles and contain div/p inside button. The app has only two role=status regions, so the search count, save state, indexing and sync change silently.
- Evidence: SearchPanel.svelte:84-96,125-162; SearchResult.svelte:141-171; command-input.svelte:16-25; SearchSection.svelte:112-119; SentrySection.svelte:88; TasksView.svelte:911; SaveStatus.svelte; SemanticIndexStatus.svelte; TodoistSyncStatus.svelte:17-30.
- Proposal: Add aria-labels, a radiogroup for modes, list roles, and spans inside the button. Add one shell live region and an announce helper that these sites call.
- Impact: Status reaches every user at low cost.

### P163 The Tasks Display menu hides the current grouping and has no sort
- Tier: moderate | Category: information-architecture | Effort: S
- Areas: Tasks Display menu
- Sources: area:tasks
- Problem: Heading sits outside Group by, and the trigger always reads "Display".
- Evidence: TasksView.svelte:926-959.
- Proposal: Put Heading under Group by, make the trigger read "Group: Note", and add Sort by (P60).
- Impact: Discoverable grouping.

### P164 The Sources panel exposes AND/OR logic as jargon
- Tier: moderate | Category: content-copy | Effort: M
- Areas: Tasks SourcesPanel
- Sources: area:tasks
- Problem: "every clause of one card", no "or" separators, Remove card with no undo, and 16 always-open exclude controls.
- Evidence: SourcesPanel.svelte:276-351,482,494-495.
- Proposal: "Match any of these cards", "or" and "all of" dividers, and Global excludes collapsed.
- Impact: Lists get built correctly.

### P165 The Tasks rule sentence, Edit/Clear and the modified marker are cryptic
- Tier: moderate | Category: content-copy | Effort: S
- Areas: Tasks sources sentence, list marker
- Sources: area:tasks
- Problem: Bare "Edit" and "Clear", a lowercase "modified", and Save/Revert versus Save as view/Reset.
- Evidence: TasksView.svelte:1085-1099; TaskLists.svelte:246-256; task-query.logic.ts:1466,1472.
- Proposal: "Edit sources", "Clear sources" (with Undo, P01), "Unsaved changes", and Save/Discard everywhere.
- Impact: A clear model of temporary versus saved edits.

### P166 Three rows of chrome before the first task
- Tier: moderate | Category: layout-density | Effort: M
- Areas: Tasks toolbar and filter bar
- Sources: area:tasks
- Problem: The first task starts at y=217 of 900.
- Evidence: TasksView.svelte:905,965,1084; tasks-all-open-light.png.
- Proposal: Merge search into the filter row, and show the rule sentence only when the sources are customised.
- Impact: More of the list visible.

### P167 The Tasks search field is low contrast and keyboard-poor
- Tier: moderate | Category: accessibility | Effort: S
- Areas: Tasks search input
- Sources: area:tasks
- Problem: The placeholder is muted/50, the field is h-6 w-40, Escape does nothing, and no shortcut focuses it.
- Evidence: TasksView.svelte:915-922; tasks-keys.logic.ts.
- Proposal: Use ToolbarSearch (P21), Escape to clear, and Cmd+F or "/" to focus it when Tasks is active.
- Impact: Findable, faster search.

### P168 Setting a due date or priority takes several clicks, with no shortcuts
- Tier: moderate | Category: interaction | Effort: M
- Areas: Tasks row menu and keys
- Sources: area:tasks
- Problem: Due and priority live in submenus, and the keys cover only navigation and toggling.
- Evidence: TasksView.svelte:676-712; tasks-keys.logic.ts:49-62.
- Proposal: "d" for the due menu, 1-4 for priority, hints in the menu, and Tomorrow and Next week at the first level.
- Impact: Faster daily triage.

### P169 The mods list shows load times, not what each mod does
- Tier: moderate | Category: information-architecture | Effort: M
- Areas: Mods settings
- Sources: area:plugins-misc
- Problem: The manifest description and author are parsed and then dropped. The list is hidden until the master switch is on, and an enable failure only reaches the log.
- Evidence: ModsStatusList.svelte:94-102; mods.logic.ts:145,207-223; mods.store.svelte.ts:4-24; LabsSection.svelte:27-29; settings-labs-light.png.
- Proposal: Show the name, a one-line description and a state badge, with the load time in a tooltip and an inline error with Retry.
- Impact: The list becomes usable for deciding what to turn off.

### P170 The mod run view's status, progress and log are not legible or accessible
- Tier: moderate | Category: accessibility | Effort: S
- Areas: Mods run view (ModActionPicker)
- Sources: area:plugins-misc
- Problem: Running, Done and Failed all use the same 12 px muted text. The progressbar has no name, the log has no role=log and no aria-live, and Stop gives no feedback after a click.
- Evidence: ModActionPicker.svelte:104-148 (status at 108, progressbar at 111-117, log at 128).
- Proposal: Show a coloured status badge with an icon (spinner, check, X). Name the progressbar, add role=log with aria-live=polite to the log, and show a disabled "Stopping..." state on Stop. Use the P162 announce helper.
- Impact: Long mod runs become legible at a glance and to assistive tech.

---

## Polish

### P171 Motion has no tokens, and reduced motion is honoured in one place
- Tier: polish | Category: motion | Effort: S
- Areas: foundation, overlays, settings sheet, spinners, live preview, canvas, chevrons
- Sources: lens:feedback-motion, lens:a11y-keyboard, area:foundation, area:shell, area:note-list, area:editor, area:settings, area:tasks, area:collection, area:plugins-misc
- Problem: The only prefers-reduced-motion rule is in EventCalendarView. Durations vary (0.15s ease, transition-all, duration-200, an 820 px fly in 200 ms, 300 ms fit-view). Spinners, pulses, chevrons and smooth scroll ignore the OS setting. Settings flies further than any other overlay.
- Evidence: EventCalendarView.svelte:284-288; SettingsPanel.svelte:117; styles.ts:242,354,424,484,507,730; CanvasInner.svelte:283,748; CanvasToolbar.svelte:62; dialog-content.svelte; Rail.svelte:377; SaveStatus.svelte:16; RailListSearch.svelte:103; FilesNavigator.svelte:463; TasksView.svelte:724,734,912; ModDialogHost.svelte:112; ModActionPicker.svelte:118; TodoistSyncStatus.svelte:27; PropertiesPanel.svelte:69; composer +page.svelte.
- Proposal: Define two motion tokens (fast 120-150 ms, base 200 ms) and one easing. Give Settings a short slide of about 24 px. Add one base reduced-motion block that stops spin, pulse and smooth scroll.
- Impact: Respects the OS setting with one CSS block.

### P172 Copy and casing drift across the app
- Tier: polish | Category: content-copy | Effort: S
- Areas: shell, editor chrome, settings, search, tasks, collection, kanban, auto-organize, links, plugins
- Sources: area:shell, area:editor, area:settings, area:finders, area:tasks, area:collection, area:kanban, area:organize, area:links, area:plugins-misc
- Problem: Casing mixes sentence case and Title Case. Error toasts use both "Failed to" and "Could not". Ellipses are written as "..." and as "…". Spellings mix US and UK ("neighbourhood"). Counts read "1 words". Empty states use several phrasings. Collection says "Parse Error" in one place and "Filter error" in another. Auto-organize uses "Open it", "if missing" and "Matches N notes now". The relationship label replaces only the first underscore and stays lowercase. Hard-coded "(Cmd+D)" tooltips and "Source mode" sit next to "Show raw Markdown".
- Evidence: LayoutSection.svelte:51,62; RailNoteList.svelte:812-813; TypesNavigator.svelte:225,255,467; NoteActionBar.svelte:35,61,88-97,148-175; EditorView.svelte:101-142; AppearanceSection.svelte:162,254; TrashSection.svelte:28,36,51; SearchPanel.svelte:106,118-120,157; SearchStatus.svelte:27; CommandPalette.svelte:69; TasksView.svelte:109,549; task-query.logic.ts:905,915,1430; CollectionView.svelte:505,691,706; collection-block-widget.ts:55,184,249-261; KanbanView.svelte:573; AutoOrganizeRuleRow.svelte:356-521; BacklinksPanel.svelte:58-62,96; TemplatePicker.svelte:69; composer +page.svelte:251-255; settings-copy.test.ts.
- Proposal: Make one pass: sentence case, the verb "New", "Could not", "…", "Esc", US spelling, plural-aware counts, "No <things> yet", one disclosure label, and shared strings and caps between the collection widget and the full view. Extend settings-copy.test.ts to cover the app.
- Impact: The app reads with one voice.

### P173 Vocabulary collisions: view, pin, toggle
- Tier: polish | Category: content-copy | Effort: S
- Areas: palette, Tasks, rail, tabs
- Sources: lens:ia-navigation
- Problem: "View" means five things. "Pin" means a tab pin and a rail pin. "Toggle X View" closes an active tab.
- Evidence: TaskLists.svelte:239; commands.ts:208-234; EditorTabs.svelte:99-102; TypesNavigator.svelte:445-448; Rail.svelte:286-292; tasks.service.ts:571-580; tags.service.ts:149-158.
- Proposal: Use "view" only for .view files, call Tasks lists "Saved lists", use "Open Tasks" and "Open Calendar", and keep "pin" for the rail.
- Impact: Labels predict what will happen.

### P174 Token hygiene: radii, raw font sizes, icon sizes, the duplicated dark fallback, z-index
- Tier: polish | Category: consistency | Effort: S
- Areas: app.css, kb-ui, canvas, calendar, properties, collection, tags, editor widgets
- Sources: lens:design-system, area:foundation, lens:type-color-density, area:note-list, area:calendar, area:properties, area:collection, area:links, area:editor, area:plugins-misc
- Problem: kb-ui and canvas use px radii. text-[11px] and scoped 11px sizes bypass --text-label, and em-sized editor labels drop to about 10 px. Icons come in three sizes with no rule. border-border and border-divider have no usage rule. The .dark fallback block has drifted, about ten tokens can only be set by fallback, and there is no z-index scale. Chip heights are 22, 24 and 28 px. Hard-coded fallback colours remain. "now" never updates after midnight in collection calendars. A Separator import is unused.
- Evidence: kb-ui.ts:118,202,232,308,329,346,878; CanvasContextMenu.svelte:184,201,219,225; ImageNode.svelte:89; CanvasEdge.svelte:70; FileNode.svelte:154; LinkNode.svelte:183; styles.ts:141,340-872; settings.logic.ts:67-68; app.css:79-103,92,215-361,266; theme.logic.ts; NoteRow.svelte:93-124; EventMonthGrid.svelte:125; EventTaskLane.svelte:16; EventAllDayLane.svelte:19; RelationshipSearch.svelte:59-89; TypeNameDialog.svelte:66; PropertyField.svelte:163,180; CollectionCalendarView.svelte:38,154,162; TagItem.svelte:43,67; TagColorPicker.svelte:58-110; GraphControls.svelte:28-41; BacklinksPanel.svelte:6; OutgoingLinksPanel.svelte:6; TableOfContentsPanel.svelte:4; callout-field.ts:28; parsers/callout.ts:45.
- Proposal: Add --radius-card and --radius-chip. Use var(--text-label) with max() floors. Set icon sizes at 16, 14 and 12 px by placement. Generate the fallback block from KOKOBRAIN_DEFAULT_THEME. Add --z-* steps and a lint test that fails new text-[Npx]. Recompute "today" on focus, and remove unused imports.
- Impact: New code stays on the scale, and theme changes apply everywhere.

### P175 No pressed state, and the cursor policy is split between hand and arrow
- Tier: polish | Category: interaction | Effort: S
- Areas: buttons and rows app-wide
- Sources: lens:design-system, lens:feedback-motion
- Problem: The code has 288 hover variants and 4 active: variants. cursor-pointer appears 88 times (Tasks, Collection, Tags, Search) and cursor-default 54 times (rail, navigators, rows).
- Evidence: KanbanLane.svelte:236; KanbanCard.svelte:218; TasksView.svelte:812; SearchResult.svelte:137; NoteRow.svelte:70; FilesNavigator.svelte:296; CalendarNavigator.svelte; RailSortMenu.svelte.
- Proposal: Add a pressed fill one step stronger than hover. Follow the macOS convention: an arrow on chrome and a hand only on links.
- Impact: The app feels native and consistent.

### P176 The status bar is tall for passive text, and the save indicator pulses and shifts
- Tier: polish | Category: layout-density | Effort: S
- Areas: status bar
- Sources: area:shell, lens:feedback-motion
- Problem: The bar is 32 px for 12 px text, and nothing in it is clickable. "Modified" pulses and changes width on every autosave, which shifts the Todoist chip.
- Evidence: app.css:212; StatusBar.svelte:9,16; SaveStatus.svelte:14-23; editor.service.ts:276; AppShell.svelte:307-311.
- Proposal: Reduce the bar to about 24 px. Saved opens History and the index status shows details. Drop the pulse and reserve a fixed width for the slot.
- Impact: More vertical space and a calmer writing surface.

### P177 Right-sidebar section titles are indented off their own content
- Tier: polish | Category: layout-density | Effort: S
- Areas: SidebarSection, NoteInfo, Properties hierarchy
- Sources: lens:type-color-density, area:properties
- Problem: A 14 px chevron slot is always reserved, so titles start at x=1221 while their rows start at x=1208. Info uses an icon instead. Relationships and its children are identical uppercase labels.
- Evidence: SidebarSection.svelte:41-46; NoteInfo.svelte:43-47; PropertiesView.svelte:54,245,250; editor-live-preview-light.png, right-sidebar-default-light.png.
- Proposal: Render the chevron slot only when the section collapses, or move it right. Children become 13 px sentence-case labels ("Belongs to").
- Impact: The sidebar reads as one aligned column.

### P178 The Labs and Advanced group structure is inconsistent
- Tier: polish | Category: information-architecture | Effort: S
- Areas: settings navigation
- Sources: area:settings
- Problem: Labs holds one toggle while its log flag lives in Troubleshooting. Nav labels differ from page titles.
- Evidence: settings.logic.ts:255-300; LabsSection.svelte:37-46; TroubleshootingSection.svelte:55; TypesSection.svelte:9.
- Proposal: Fold Labs into "Advanced > Mods" together with its log toggle, and align nav labels with page titles.
- Impact: Fewer places to look.

### P179 Quick switcher rows are uniform and unlabelled
- Tier: polish | Category: consistency | Effort: M
- Areas: quick switcher rows
- Sources: area:finders
- Problem: Every row has the same icon, the path repeats .md, archived is only an icon swap, matches are not highlighted, and the dialog shows an X.
- Evidence: QuickSwitcher.svelte:80-91; command-dialog.svelte:31; dialog-content.svelte:37-42; quick-switcher-light.png.
- Proposal: Use the type icon, show only the folder, add an Archived tag and match highlighting, and hide the X in command dialogs.
- Impact: Faster disambiguation.

### P180 Dimmed Tasks context rows have no explanation
- Tier: polish | Category: feedback-states | Effort: S
- Areas: Tasks row
- Sources: area:tasks
- Problem: Parent rows at opacity-60 read as disabled.
- Evidence: TasksView.svelte:803,812.
- Proposal: Add a "Shown for context" tooltip, or use a thin left rule instead of opacity.
- Impact: Less confusion.

### P181 The Tasks list column uses 176 px for three entries
- Tier: polish | Category: layout-density | Effort: M
- Areas: TaskLists column
- Sources: area:tasks
- Problem: A fixed w-44 column narrows the list.
- Evidence: TaskLists.svelte:178; tasks-all-open-light.png.
- Proposal: Use a segmented control or tabs above the filter row, reusing the existing dropdown variant.
- Impact: More room for tasks.

### P182 Multi-day read-only events look editable but ignore drags
- Tier: polish | Category: feedback-states | Effort: S
- Areas: event blocks, popover
- Sources: area:calendar
- Problem: Only data-readonly marks them, and a drag silently does nothing.
- Evidence: EventBlock.svelte:83; EventMonthGrid.svelte:132; EventTimeGrid.svelte:125; EventPopover.svelte:181-192.
- Proposal: Add a span or lock icon, and a caption in the popover.
- Impact: Removes a silent no-op.

### P183 Today versus selected, weekends and out-of-month cells in the month grid
- Tier: polish | Category: color-theming | Effort: S
- Areas: event calendar month grid
- Sources: area:calendar
- Problem: Selecting another day takes away today's badge. Out-of-month cells look heavier than in-month days. Weekends are not distinguished.
- Evidence: EventMonthGrid.svelte:94,104-111; calendar-month-light.png.
- Proposal: Today keeps a ring or dot and selection is the fill. Out-of-month cells recede. Weekends get a faint tint. Also drop the comma in "November, 2026" (event-calendar-view.logic.ts:165).
- Impact: Easier orientation.

### P184 Opening a canvas can mark it modified without any edit
- Tier: polish | Category: feedback-states | Effort: S
- Areas: canvas persistence
- Sources: area:canvas
- Problem: The fixture uses 2-space indentation and serializeCanvas writes tabs, and persist has no equality guard. Not verified with a tab-indented file.
- Evidence: canvas-view-light.png; zz-design-capture.spec.ts:261-279; canvas.logic.ts:54-56; CanvasInner.svelte:120-126,229-243.
- Proposal: Skip persist when the serialization equals the canonical form of the parsed original. Confirm with a tab-indented file first.
- Impact: Avoids spurious saves.

### P185 A disabled rule looks almost identical to an enabled one
- Tier: polish | Category: color-theming | Effort: S
- Areas: auto-organize rule card
- Sources: area:organize
- Problem: Only the switch reflects state, and the card has no focus-within style.
- Evidence: AutoOrganizeRuleRow.svelte:285,294-297; AutoOrganizeSection.svelte:55-56.
- Proposal: Dim a disabled card to about 60%, add an "Off" pill, and add a focus-within border.
- Impact: Live rules are visible at a glance.

### P186 Kanban card anatomy polish
- Tier: polish | Category: consistency | Effort: S
- Areas: kanban cards and labels
- Sources: area:kanban
- Problem: Every undated card shows an empty calendar row. The grip reserves invisible space. The linked preview dumps raw markdown. Check and date-badge markup is duplicated.
- Evidence: KanbanDatePicker.svelte:76-110; KanbanLane.svelte:234-246,365; KanbanCard.svelte:206-221; KanbanCardText.svelte:68; KanbanListView.svelte:48; KanbanTableView.svelte:69.
- Proposal: Show the date icon on hover only and inline with the tags, reserve no grip space, clamp the preview to 3 lines, and share the check and date-badge components.
- Impact: Denser, calmer cards.

### P187 Tags is a full tab that only hands off to Search
- Tier: polish | Category: information-architecture | Effort: M
- Areas: Tags view
- Sources: lens:ia-navigation
- Problem: Clicking a tag opens Search. The tab can be reached only from the palette and shows a generic tab icon.
- Evidence: TagsView.svelte:17-19; commands.ts:286-293; EditorTabs.svelte:69-83.
- Proposal: Make Tags a rail navigator that fills the note list with a tag lens, and retire the tab. This is low priority: tags are not one of the owner's daily tools.
- Impact: Tags follow the same model as everything else.
