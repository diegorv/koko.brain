# file card src/lib/plugins/kanban/kanban.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/kanban.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/plugins/kanban/kanban.logic.ts logic L942 module src/lib/plugins/kanban in7 t7
## imports
imp src/lib/plugins/kanban/kanban.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/plugins/kanban/kanban.logic.ts:2 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanArchiveLayout,type:KanbanBoard,type:KanbanItem,type:KanbanLane,type:KanbanSettings,type:KanbanSettingsBlock,type:KanbanSortMode,type:KanbanViewMode
## imported-by
imp src/lib/plugins/kanban/KanbanCard.svelte:10 -> src/lib/plugins/kanban/kanban.logic.ts extractCardDate,setCardDate,removeCardDate,cardProximity,PROXIMITY_CLASSES,extractCardWikilinks,extractCardColor,setCardColor,removeCardColor,stripCardMetadata
imp src/lib/plugins/kanban/KanbanCardText.svelte:2 -> src/lib/plugins/kanban/kanban.logic.ts parseCardSegments,type:CardSegment
imp src/lib/plugins/kanban/KanbanDatePicker.svelte:7 -> src/lib/plugins/kanban/kanban.logic.ts PROXIMITY_CLASSES,type:DateProximity
imp src/lib/plugins/kanban/KanbanListView.svelte:4 -> src/lib/plugins/kanban/kanban.logic.ts stripCardMetadata,extractCardDate,extractCardColor,cardProximity,PROXIMITY_CLASSES
imp src/lib/plugins/kanban/KanbanTableView.svelte:4 -> src/lib/plugins/kanban/kanban.logic.ts stripCardMetadata,extractCardDate,extractCardColor,extractCardTags,cardProximity,PROXIMITY_CLASSES
imp src/lib/plugins/kanban/KanbanView.svelte:13 -> src/lib/plugins/kanban/kanban.logic.ts parseKanbanBoard,serializeKanbanBoard,addItem,removeItem,updateItem,toggleItem,moveItem,addLane,removeLane,renameLane,moveLane,archiveItem,archiveCompletedItems,restoreItem,isLaneCollapsed,toggleLaneCollapsed,DEFAULT_LANE_WIDTH,getLaneMaxItems,isLaneAtLimit,isLaneAutoComplete,setLaneAutoComplete,setLaneMaxItems,setTagColor,removeTagColor,updateBoardSettings,sortItems,setSortMode,filterItems,setViewMode,canReorderItems
imp src/lib/plugins/kanban/kanban.service.ts:4 -> src/lib/plugins/kanban/kanban.logic.ts createEmptyKanbanBoard,serializeKanbanBoard,extractCardWikilinks
## reach
in2 src/lib/plugins/kanban/kanban.logic.ts 5 files in 2 modules: src/lib/app(4) src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/kanban.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/kanban/kanban.logic.test.ts imports src/lib/plugins/kanban/kanban.logic.ts mirror
test src/tests/help/examples-scoping.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
test src/tests/lib/plugins/kanban/KanbanView.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
test src/tests/lib/plugins/kanban/kanban.service.test.ts imports src/lib/plugins/kanban/kanban.logic.ts
## symbols
sym src/lib/plugins/kanban/kanban.logic.ts:30 const DEFAULT_LANE_WIDTH L1 | Default lane width in pixels
by src/lib/plugins/kanban/kanban.logic.ts:DEFAULT_LANE_WIDTH <- src/lib/plugins/kanban/KanbanView.svelte:529 in (markup) markup +2
sym src/lib/plugins/kanban/kanban.logic.ts:33 fn generateKanbanId(): string L3 | Generates a unique ID for lanes/items
sym src/lib/plugins/kanban/kanban.logic.ts:41 fn parseSettings(content: string): KanbanSettings L9 | Parses the `%% kanban:settings ... %%` block from raw content.
sym src/lib/plugins/kanban/kanban.logic.ts:55 fn serializeSettings(settings: KanbanSettings): string L7 | Serializes board settings into a `%% kanban:settings ... %%` block.
sym src/lib/plugins/kanban/kanban.logic.ts:177 fn parseKanbanBoard(content: string): KanbanBoard L73 | Parses a `.kanban` file's markdown content into a KanbanBoard.
by src/lib/plugins/kanban/kanban.logic.ts:parseKanbanBoard <- src/lib/plugins/kanban/KanbanView.svelte:75 in $effect@69 call
sym src/lib/plugins/kanban/kanban.logic.ts:265 fn serializeKanbanBoard(board: KanbanBoard): string L31 | Serializes a KanbanBoard back to markdown.
by src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard <- src/lib/plugins/kanban/KanbanView.svelte:81 in applyChange call
by src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard <- src/lib/plugins/kanban/kanban.service.ts:19 in createKanbanFile call
sym src/lib/plugins/kanban/kanban.logic.ts:298 fn createEmptyKanbanBoard(): KanbanBoard L11 | Creates a new empty board with default lanes
by src/lib/plugins/kanban/kanban.logic.ts:createEmptyKanbanBoard <- src/lib/plugins/kanban/kanban.service.ts:19 in createKanbanFile call
sym src/lib/plugins/kanban/kanban.logic.ts:321 fn addItem(board: KanbanBoard, laneId: string, text: string): KanbanBoard L10 | Adds a new item to the end of a lane.
by src/lib/plugins/kanban/kanban.logic.ts:addItem <- src/lib/plugins/kanban/KanbanView.svelte:95 in handleAddItem call
sym src/lib/plugins/kanban/kanban.logic.ts:370 fn removeItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard L12 | Removes an item from a lane.
by src/lib/plugins/kanban/kanban.logic.ts:removeItem <- src/lib/plugins/kanban/KanbanView.svelte:107 in handleDeleteItem call
sym src/lib/plugins/kanban/kanban.logic.ts:384 fn updateItem(board: KanbanBoard, laneId: string, itemId: string, text: string): KanbanBoard L15 | Updates an item's text.
by src/lib/plugins/kanban/kanban.logic.ts:updateItem <- src/lib/plugins/kanban/KanbanView.svelte:103 in handleUpdateItem call
sym src/lib/plugins/kanban/kanban.logic.ts:401 fn toggleItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard L15 | Toggles an item's checked state
by src/lib/plugins/kanban/kanban.logic.ts:toggleItem <- src/lib/plugins/kanban/KanbanView.svelte:99 in handleToggleItem call
sym src/lib/plugins/kanban/kanban.logic.ts:423 fn moveItem(board: KanbanBoard, fromLaneId: string, itemId: string, toLaneId: string, toIndex: number, autoCheck?: boolean): Kanba… L51 | Moves an item from one lane to another (or within the same lane).
by src/lib/plugins/kanban/kanban.logic.ts:moveItem <- src/lib/plugins/kanban/KanbanView.svelte:405 in handleItemDrop call
sym src/lib/plugins/kanban/kanban.logic.ts:476 fn addLane(board: KanbanBoard, title: string): KanbanBoard L6 | Adds a new lane to the board
by src/lib/plugins/kanban/kanban.logic.ts:addLane <- src/lib/plugins/kanban/KanbanView.svelte:129 in handleAddLane call
sym src/lib/plugins/kanban/kanban.logic.ts:484 fn removeLane(board: KanbanBoard, laneId: string): KanbanBoard L6 | Removes a lane from the board
by src/lib/plugins/kanban/kanban.logic.ts:removeLane <- src/lib/plugins/kanban/KanbanView.svelte:125 in handleDeleteLane call
sym src/lib/plugins/kanban/kanban.logic.ts:492 fn renameLane(board: KanbanBoard, laneId: string, newTitle: string): KanbanBoard L8 | Renames a lane
by src/lib/plugins/kanban/kanban.logic.ts:renameLane <- src/lib/plugins/kanban/KanbanView.svelte:121 in handleRenameLane call
sym src/lib/plugins/kanban/kanban.logic.ts:502 fn moveLane(board: KanbanBoard, fromIndex: number, toIndex: number): KanbanBoard L10 | Moves a lane to a new position
by src/lib/plugins/kanban/kanban.logic.ts:moveLane <- src/lib/plugins/kanban/KanbanView.svelte:453 in handleLaneDrop call
sym src/lib/plugins/kanban/kanban.logic.ts:514 fn archiveItem(board: KanbanBoard, laneId: string, itemId: string): KanbanBoard L13 | Moves an item to the archive.
by src/lib/plugins/kanban/kanban.logic.ts:archiveItem <- src/lib/plugins/kanban/KanbanView.svelte:111 in handleArchiveItem call
sym src/lib/plugins/kanban/kanban.logic.ts:529 fn archiveCompletedItems(board: KanbanBoard, laneId: string): KanbanBoard L21 | Archives all checked items in a lane.
by src/lib/plugins/kanban/kanban.logic.ts:archiveCompletedItems <- src/lib/plugins/kanban/KanbanView.svelte:115 in handleArchiveCompleted call
sym src/lib/plugins/kanban/kanban.logic.ts:555 fn restoreItem(board: KanbanBoard, itemId: string, toLaneId: string): KanbanBoard L27 | Restores an item from the archive to a lane.
by src/lib/plugins/kanban/kanban.logic.ts:restoreItem <- src/lib/plugins/kanban/KanbanView.svelte:335 in handleRestoreItem call
sym src/lib/plugins/kanban/kanban.logic.ts:586 fn updateBoardSettings(board: KanbanBoard, updates: Partial<KanbanSettings>): KanbanBoard L6 | Updates board-level settings (shallow merge)
by src/lib/plugins/kanban/kanban.logic.ts:updateBoardSettings <- src/lib/plugins/kanban/KanbanView.svelte:163 in handleLaneWidthChange call
sym src/lib/plugins/kanban/kanban.logic.ts:594 fn isLaneCollapsed(board: KanbanBoard, laneTitle: string): boolean L3 | Checks if a lane is collapsed
by src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed <- src/lib/plugins/kanban/KanbanView.svelte:528 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:599 fn toggleLaneCollapsed(board: KanbanBoard, laneTitle: string): KanbanBoard L14 | Toggles the collapsed state of a lane in board settings
by src/lib/plugins/kanban/kanban.logic.ts:toggleLaneCollapsed <- src/lib/plugins/kanban/KanbanView.svelte:138 in handleToggleCollapse call
sym src/lib/plugins/kanban/kanban.logic.ts:615 fn getLaneMaxItems(board: KanbanBoard, laneTitle: string): number L3 | Gets the max items limit for a lane (0 = unlimited)
by src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems <- src/lib/plugins/kanban/KanbanView.svelte:530 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:620 fn setLaneMaxItems(board: KanbanBoard, laneTitle: string, maxItems: number): KanbanBoard L16 | Sets the max items limit for a lane (0 or undefined = unlimited)
by src/lib/plugins/kanban/kanban.logic.ts:setLaneMaxItems <- src/lib/plugins/kanban/KanbanView.svelte:151 in handleSetMaxItems call
sym src/lib/plugins/kanban/kanban.logic.ts:638 fn isLaneAtLimit(board: KanbanBoard, laneTitle: string): boolean L6 | Checks if a lane has reached its item limit
by src/lib/plugins/kanban/kanban.logic.ts:isLaneAtLimit <- src/lib/plugins/kanban/KanbanView.svelte:531 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:646 fn isLaneAutoComplete(board: KanbanBoard, laneTitle: string): boolean L3 | Checks if a lane has auto-complete enabled
by src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete <- src/lib/plugins/kanban/KanbanView.svelte:144 in handleToggleAutoComplete call +2
sym src/lib/plugins/kanban/kanban.logic.ts:651 fn setLaneAutoComplete(board: KanbanBoard, laneTitle: string, autoComplete: boolean): KanbanBoard L13 | Sets the auto-complete flag for a lane
by src/lib/plugins/kanban/kanban.logic.ts:setLaneAutoComplete <- src/lib/plugins/kanban/KanbanView.svelte:145 in handleToggleAutoComplete call
sym src/lib/plugins/kanban/kanban.logic.ts:668 fn extractCardDate(text: string): string | null L4 | Extracts a date string from card text (format: {YYYY-MM-DD}).
by src/lib/plugins/kanban/kanban.logic.ts:extractCardDate <- src/lib/plugins/kanban/KanbanCard.svelte:111 in cardDate=$derived call
by src/lib/plugins/kanban/kanban.logic.ts:extractCardDate <- src/lib/plugins/kanban/KanbanListView.svelte:27 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:extractCardDate <- src/lib/plugins/kanban/KanbanTableView.svelte:33 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:674 fn setCardDate(text: string, date: string): string L6 | Sets or replaces a date in card text.
by src/lib/plugins/kanban/kanban.logic.ts:setCardDate <- src/lib/plugins/kanban/KanbanCard.svelte:120 in handleDateChange call
sym src/lib/plugins/kanban/kanban.logic.ts:682 fn removeCardDate(text: string): string L3 | Removes the date from card text
by src/lib/plugins/kanban/kanban.logic.ts:removeCardDate <- src/lib/plugins/kanban/KanbanCard.svelte:122 in handleDateChange call
sym src/lib/plugins/kanban/kanban.logic.ts:687 type DateProximity L1 | Date proximity relative to today
by src/lib/plugins/kanban/kanban.logic.ts:DateProximity <- src/lib/plugins/kanban/KanbanDatePicker.svelte:7 in (script) import
sym src/lib/plugins/kanban/kanban.logic.ts:690 fn getDateProximity(dateStr: string | null, todayStr: string): DateProximity L12 | Determines the date proximity for coloring.
sym src/lib/plugins/kanban/kanban.logic.ts:704 interface ProximityClasses L6 | Tailwind classes for one proximity tone, built on theme tokens so they follow light and dark themes.
sym src/lib/plugins/kanban/kanban.logic.ts:712 const PROXIMITY_CLASSES: Record<DateProximity, ProximityClasses> L8 | The single proximity style map shared by the board card, date picker, list and table views.
by src/lib/plugins/kanban/kanban.logic.ts:PROXIMITY_CLASSES <- src/lib/plugins/kanban/KanbanCard.svelte:158 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:PROXIMITY_CLASSES <- src/lib/plugins/kanban/KanbanDatePicker.svelte:58 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:PROXIMITY_CLASSES <- src/lib/plugins/kanban/KanbanListView.svelte:48 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:PROXIMITY_CLASSES <- src/lib/plugins/kanban/KanbanTableView.svelte:69 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:725 fn cardProximity(dateStr: string | null, todayStr: string, checked: boolean): DateProximity L4 | Proximity tone for a card: a checked (done) card shows no tone, so a completed overdue card does not keep the overdue border and badge.
by src/lib/plugins/kanban/kanban.logic.ts:cardProximity <- src/lib/plugins/kanban/KanbanCard.svelte:114 in dateProximity=$derived call
by src/lib/plugins/kanban/kanban.logic.ts:cardProximity <- src/lib/plugins/kanban/KanbanListView.svelte:30 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:cardProximity <- src/lib/plugins/kanban/KanbanTableView.svelte:37 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:733 fn extractCardColor(text: string): string | null L4 | Extracts a color name from card text (format: {color:name}).
by src/lib/plugins/kanban/kanban.logic.ts:extractCardColor <- src/lib/plugins/kanban/KanbanCard.svelte:112 in cardColor=$derived call
by src/lib/plugins/kanban/kanban.logic.ts:extractCardColor <- src/lib/plugins/kanban/KanbanListView.svelte:28 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:extractCardColor <- src/lib/plugins/kanban/KanbanTableView.svelte:34 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:739 fn setCardColor(text: string, color: string): string L6 | Sets or replaces a color in card text.
by src/lib/plugins/kanban/kanban.logic.ts:setCardColor <- src/lib/plugins/kanban/KanbanCard.svelte:127 in handleColorChange call
sym src/lib/plugins/kanban/kanban.logic.ts:747 fn removeCardColor(text: string): string L3 | Removes the color from card text
by src/lib/plugins/kanban/kanban.logic.ts:removeCardColor <- src/lib/plugins/kanban/KanbanCard.svelte:131 in handleColorRemove call
sym src/lib/plugins/kanban/kanban.logic.ts:752 fn stripCardMetadata(text: string): string L7 | Strips both date and color metadata tokens from card text for display
by src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata <- src/lib/plugins/kanban/KanbanCard.svelte:113 in displayText=$derived call
by src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata <- src/lib/plugins/kanban/KanbanListView.svelte:29 in (markup) markup
by src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata <- src/lib/plugins/kanban/KanbanTableView.svelte:35 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:765 fn extractCardTags(text: string): string[] L7 | Extracts inline #tags from card text
by src/lib/plugins/kanban/kanban.logic.ts:extractCardTags <- src/lib/plugins/kanban/KanbanTableView.svelte:36 in (markup) markup
sym src/lib/plugins/kanban/kanban.logic.ts:774 fn setTagColor(board: KanbanBoard, tag: string, color: string): KanbanBoard L4 | Sets a tag color in board settings
by src/lib/plugins/kanban/kanban.logic.ts:setTagColor <- src/lib/plugins/kanban/KanbanView.svelte:155 in handleSetTagColor call
sym src/lib/plugins/kanban/kanban.logic.ts:780 fn removeTagColor(board: KanbanBoard, tag: string): KanbanBoard L5 | Removes a tag color from board settings
by src/lib/plugins/kanban/kanban.logic.ts:removeTagColor <- src/lib/plugins/kanban/KanbanView.svelte:159 in handleRemoveTagColor call
sym src/lib/plugins/kanban/kanban.logic.ts:791 type CardSegment L4 | A segment of card text for rich rendering
by src/lib/plugins/kanban/kanban.logic.ts:CardSegment <- src/lib/plugins/kanban/KanbanCardText.svelte:2 in (script) import
sym src/lib/plugins/kanban/kanban.logic.ts:797 fn extractCardWikilinks(text: string): Array<{ target: string; heading?: string; display: string }> L10 | Extracts wikilinks from card text
by src/lib/plugins/kanban/kanban.logic.ts:extractCardWikilinks <- src/lib/plugins/kanban/KanbanCard.svelte:136 in hasWikilink=$derived call
by src/lib/plugins/kanban/kanban.logic.ts:extractCardWikilinks <- src/lib/plugins/kanban/kanban.service.ts:63 in loadLinkedFileContent call
sym src/lib/plugins/kanban/kanban.logic.ts:813 fn parseCardSegments(text: string): CardSegment[] L44 | Parses card text into segments for rich rendering.
by src/lib/plugins/kanban/kanban.logic.ts:parseCardSegments <- src/lib/plugins/kanban/KanbanCardText.svelte:16 in segments=$derived call
sym src/lib/plugins/kanban/kanban.logic.ts:864 fn sortItems(items: KanbanItem[], mode: KanbanSortMode): KanbanItem[] L40 | Sorts items according to the given sort mode.
by src/lib/plugins/kanban/kanban.logic.ts:sortItems <- src/lib/plugins/kanban/KanbanView.svelte:182 in displayLane call
sym src/lib/plugins/kanban/kanban.logic.ts:906 fn setSortMode(board: KanbanBoard, mode: KanbanSortMode): KanbanBoard L3 | Sets the board sort mode
by src/lib/plugins/kanban/kanban.logic.ts:setSortMode <- src/lib/plugins/kanban/KanbanView.svelte:176 in handleSetSortMode call
sym src/lib/plugins/kanban/kanban.logic.ts:917 fn filterItems(items: KanbanItem[], query: string): KanbanItem[] L5 | Filters items by a text query.
by src/lib/plugins/kanban/kanban.logic.ts:filterItems <- src/lib/plugins/kanban/KanbanView.svelte:181 in displayLane call
sym src/lib/plugins/kanban/kanban.logic.ts:933 fn canReorderItems(sortMode: KanbanSortMode, filterQuery: string): boolean L3 | Whether manual drag-reordering of cards is valid for the current view.
by src/lib/plugins/kanban/kanban.logic.ts:canReorderItems <- src/lib/plugins/kanban/KanbanView.svelte:173 in canReorder=$derived call
sym src/lib/plugins/kanban/kanban.logic.ts:940 fn setViewMode(board: KanbanBoard, mode: KanbanViewMode): KanbanBoard L3 | Sets the board view mode
by src/lib/plugins/kanban/kanban.logic.ts:setViewMode <- src/lib/plugins/kanban/KanbanView.svelte:201 in handleSetViewMode call
## locals
local src/lib/plugins/kanban/kanban.logic.ts:74 fn archiveHeadingIndex(lines: string[], i: number): number L6
local src/lib/plugins/kanban/kanban.logic.ts:88 fn frontmatterEnd(lines: string[]): number L15
local src/lib/plugins/kanban/kanban.logic.ts:109 fn closeSection(section: ParseSection | null): void L9
local src/lib/plugins/kanban/kanban.logic.ts:125 fn extractSettingsBlock(lines: string[]): { bodyLines: string[]; settings: KanbanSettings; settingsBlock?: KanbanSettingsBlock; } L36
local src/lib/plugins/kanban/kanban.logic.ts:252 fn pushItems(lines: string[], items: KanbanItem[]): void L6
local src/lib/plugins/kanban/kanban.logic.ts:316 fn toCardText(text: string): string L3
local src/lib/plugins/kanban/kanban.logic.ts:338 fn takeItem(items: KanbanItem[], index: number, headLines: string[] | undefined, carry: boolean): { items: KanbanItem[]; headLines… L21
local src/lib/plugins/kanban/kanban.logic.ts:361 fn takeFromLane(lane: KanbanLane, index: number): { lane: KanbanLane; item: KanbanItem } L4
## calls
call src/lib/plugins/kanban/kanban.logic.ts:89 in frontmatterEnd -> src/lib/plugins/kanban/kanban.logic.ts:archiveHeadingIndex call +1
call src/lib/plugins/kanban/kanban.logic.ts:179 in parseKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:extractSettingsBlock call
call src/lib/plugins/kanban/kanban.logic.ts:190 in parseKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:frontmatterEnd call
call src/lib/plugins/kanban/kanban.logic.ts:197 in parseKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:archiveHeadingIndex call
call src/lib/plugins/kanban/kanban.logic.ts:199 in parseKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:closeSection call +2
call src/lib/plugins/kanban/kanban.logic.ts:218 in parseKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:generateKanbanId call +1
call src/lib/plugins/kanban/kanban.logic.ts:271 in serializeKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:pushItems call +1
call src/lib/plugins/kanban/kanban.logic.ts:294 in serializeKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:serializeSettings call
call src/lib/plugins/kanban/kanban.logic.ts:301 in createEmptyKanbanBoard -> src/lib/plugins/kanban/kanban.logic.ts:generateKanbanId call +2
call src/lib/plugins/kanban/kanban.logic.ts:326 in addItem -> src/lib/plugins/kanban/kanban.logic.ts:generateKanbanId call
call src/lib/plugins/kanban/kanban.logic.ts:326 in addItem -> src/lib/plugins/kanban/kanban.logic.ts:toCardText call
call src/lib/plugins/kanban/kanban.logic.ts:362 in takeFromLane -> src/lib/plugins/kanban/kanban.logic.ts:takeItem call
call src/lib/plugins/kanban/kanban.logic.ts:377 in removeItem -> src/lib/plugins/kanban/kanban.logic.ts:takeItem call
call src/lib/plugins/kanban/kanban.logic.ts:392 in updateItem -> src/lib/plugins/kanban/kanban.logic.ts:toCardText call
call src/lib/plugins/kanban/kanban.logic.ts:440 in moveItem -> src/lib/plugins/kanban/kanban.logic.ts:takeFromLane call
call src/lib/plugins/kanban/kanban.logic.ts:449 in moveItem -> src/lib/utils/clamp.ts:clamp call +1
call src/lib/plugins/kanban/kanban.logic.ts:479 in addLane -> src/lib/plugins/kanban/kanban.logic.ts:generateKanbanId call
call src/lib/plugins/kanban/kanban.logic.ts:519 in archiveItem -> src/lib/plugins/kanban/kanban.logic.ts:takeFromLane call
call src/lib/plugins/kanban/kanban.logic.ts:539 in archiveCompletedItems -> src/lib/plugins/kanban/kanban.logic.ts:takeFromLane call
call src/lib/plugins/kanban/kanban.logic.ts:559 in restoreItem -> src/lib/plugins/kanban/kanban.logic.ts:takeItem call
call src/lib/plugins/kanban/kanban.logic.ts:639 in isLaneAtLimit -> src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems call
call src/lib/plugins/kanban/kanban.logic.ts:727 in cardProximity -> src/lib/plugins/kanban/kanban.logic.ts:getDateProximity call
call src/lib/plugins/kanban/kanban.logic.ts:877 in sortItems -> src/lib/plugins/kanban/kanban.logic.ts:extractCardDate call +3
