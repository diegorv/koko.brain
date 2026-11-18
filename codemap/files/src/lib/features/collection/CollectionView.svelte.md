# file card src/lib/features/collection/CollectionView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/collection/CollectionView.svelte component L766 module src/lib/features/collection in1 t4
## imports
imp src/lib/features/collection/CollectionView.svelte:3 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,addView,removeView,renameView,setViewType,type:CollectionYamlUpdates,type:ViewType
imp src/lib/features/collection/CollectionView.svelte:4 -> src/lib/features/collection/collection.logic.ts executeQuery
imp src/lib/features/collection/CollectionView.svelte:5 -> src/lib/features/collection/calendar.logic.ts countUndated
imp src/lib/features/collection/CollectionView.svelte:6 -> src/lib/features/collection/key-edit.logic.ts applyEditorKeyEdit,CollectionEditConflict,EDITOR_KEYS,editorKeyBaseAfter,editorKeyBases,isViewAt,type:EditorKey
imp src/lib/features/collection/CollectionView.svelte:15 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/features/collection/CollectionView.svelte:16 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/CollectionView.svelte:17 -> src/lib/core/editor/editor.service.ts openFileInEditor,reloadExternallyChangedTabs
imp src/lib/features/collection/CollectionView.svelte:18 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/CollectionView.svelte:19 -> src/lib/utils/debug.ts error
imp src/lib/features/collection/CollectionView.svelte:20 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord,type:SortDef,type:CollectionViewDef
imp src/lib/features/collection/CollectionView.svelte:21 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup,type:FormulaEntry
imp src/lib/features/collection/CollectionView.svelte:22 -> src/lib/features/collection/toolbar/filter.logic.ts parseFilterToGroups,filterGroupsToFilter,getAllKnownProperties
imp src/lib/features/collection/CollectionView.svelte:23 -> src/lib/features/collection/toolbar/formula.logic.ts formulasToEntries,entriesToFormulas
imp src/lib/features/collection/CollectionView.svelte:24 -> src/lib/features/collection/CollectionTableView.svelte default
imp src/lib/features/collection/CollectionView.svelte:25 -> src/lib/features/collection/CollectionCalendarView.svelte default
imp src/lib/features/collection/CollectionView.svelte:26 -> src/lib/features/collection/CollectionLinearCalendarView.svelte default
imp src/lib/features/collection/CollectionView.svelte:27 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:28 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:29 -> src/lib/features/collection/toolbar/PropertiesPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:30 -> src/lib/features/collection/toolbar/properties.logic.ts getAllAvailableColumns
imp src/lib/features/collection/CollectionView.svelte:31 -> src/lib/components/ui/popover/index.ts Popover,PopoverTrigger,PopoverContent
imp src/lib/features/collection/CollectionView.svelte:32 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/CollectionView.svelte:33 -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:41 -> src/lib/components/ui/context-menu/index.ts *
## imported-by
imp src/lib/app/EditorView.svelte:14 -> src/lib/features/collection/CollectionView.svelte default
## reach
in2 src/lib/features/collection/CollectionView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionView.svelte 47 files in 10 modules: src/lib/components(21) src/lib/features/collection(7) src/lib/utils(5) src/lib/core/editor(4) src/lib/contracts(2) +5 modules
## tests
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts harness src/lib/features/collection/CollectionView.svelte mirror via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/features/collection/CollectionView.test.ts harness src/lib/features/collection/CollectionView.svelte mirror via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts harness src/lib/features/collection/CollectionView.svelte via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/lib-specifier-convention.test.ts imports src/lib/features/collection/CollectionView.svelte
## symbols
sym src/lib/features/collection/CollectionView.svelte:1 component CollectionView props:path,yamlContent,onYamlChange,rewriteView L766
by src/lib/features/collection/CollectionView.svelte:default <- src/lib/app/EditorView.svelte:90 in (markup) mount
## locals
local src/lib/features/collection/CollectionView.svelte:146 fn restoreViewIndex() L4
local src/lib/features/collection/CollectionView.svelte:161 fn seedFromDefinition() L12
local src/lib/features/collection/CollectionView.svelte:186 fn reseed() L4
local src/lib/features/collection/CollectionView.svelte:238 fn syncedFormulaColumns(): string[] | null L11
local src/lib/features/collection/CollectionView.svelte:301 fn reportWriteError(err: unknown) L11
local src/lib/features/collection/CollectionView.svelte:324 fn writeYaml(transform: (base: string) => string, onApply?: (yaml: string) => void): Promise<void> L32
local src/lib/features/collection/CollectionView.svelte:362 fn persistKey<K extends EditorKey>(key: K, value: CollectionYamlUpdates[K]) L12
local src/lib/features/collection/CollectionView.svelte:376 fn onView(content: string, idx: number, name: string | undefined): string L4
local src/lib/features/collection/CollectionView.svelte:382 fn handleFormulasChange(entries: FormulaEntry[]) L10
local src/lib/features/collection/CollectionView.svelte:393 fn handleSortsChange(sorts: SortDef[]) L4
local src/lib/features/collection/CollectionView.svelte:398 fn handleGlobalFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/collection/CollectionView.svelte:403 fn handleViewFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/collection/CollectionView.svelte:408 fn handleColumnsChange(cols: string[]) L4
local src/lib/features/collection/CollectionView.svelte:413 fn handleToggleSort(column: string) L13
local src/lib/features/collection/CollectionView.svelte:427 fn handleDatePropertyChange(prop: string) L3
local src/lib/features/collection/CollectionView.svelte:431 fn handleEndDatePropertyChange(prop: string | undefined) L3
local src/lib/features/collection/CollectionView.svelte:435 fn handleWeekStartDayChange(day: number) L3
local src/lib/features/collection/CollectionView.svelte:439 fn handleColorPropertyChange(prop: string | undefined) L3
local src/lib/features/collection/CollectionView.svelte:444 fn handleAddView() L15
local src/lib/features/collection/CollectionView.svelte:461 fn handleDeleteView(idx: number) L7
local src/lib/features/collection/CollectionView.svelte:470 fn handleSetViewType(idx: number, type: ViewType) L4
local src/lib/features/collection/CollectionView.svelte:476 fn startTabRename(idx: number) L10
local src/lib/features/collection/CollectionView.svelte:488 fn commitTabRename() L8
local src/lib/features/collection/CollectionView.svelte:498 fn cancelTabRename() L3
local src/lib/features/collection/CollectionView.svelte:502 fn handleRenameKeydown(e: KeyboardEvent) L9
local src/lib/features/collection/CollectionView.svelte:512 fn handleClickRow(record: PropertyIndexRecord) L3
## mounts
mount src/lib/features/collection/CollectionView.svelte:621 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:629 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:630 CalendarConfigPanel -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:648 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:656 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:657 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:671 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:679 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:680 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:694 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:698 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:699 PropertiesPanel -> src/lib/features/collection/toolbar/PropertiesPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:725 CollectionCalendarView -> src/lib/features/collection/CollectionCalendarView.svelte
mount src/lib/features/collection/CollectionView.svelte:741 CollectionLinearCalendarView -> src/lib/features/collection/CollectionLinearCalendarView.svelte
mount src/lib/features/collection/CollectionView.svelte:756 CollectionTableView -> src/lib/features/collection/CollectionTableView.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:90 CollectionView -> src/lib/features/collection/CollectionView.svelte
## calls
call src/lib/features/collection/CollectionView.svelte:129 in parseResult=$derived -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:148 in restoreViewIndex -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.getViewIndex mcall
call src/lib/features/collection/CollectionView.svelte:152 in (script) -> src/lib/features/collection/CollectionView.svelte:restoreViewIndex call
call src/lib/features/collection/CollectionView.svelte:177 in (script) -> src/lib/features/collection/CollectionView.svelte:seedFromDefinition call
call src/lib/features/collection/CollectionView.svelte:157 in $effect@156 -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.setViewIndex mcall
call src/lib/features/collection/CollectionView.svelte:164 in seedFromDefinition -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call +1
call src/lib/features/collection/CollectionView.svelte:167 in seedFromDefinition -> src/lib/features/collection/toolbar/formula.logic.ts:formulasToEntries call
call src/lib/features/collection/CollectionView.svelte:168 in seedFromDefinition -> src/lib/features/collection/key-edit.logic.ts:editorKeyBases call
call src/lib/features/collection/CollectionView.svelte:182 in $effect@181 -> src/lib/features/collection/CollectionView.svelte:seedFromDefinition call
call src/lib/features/collection/CollectionView.svelte:209 in $effect@199 -> src/lib/features/collection/CollectionView.svelte:reseed call
call src/lib/features/collection/CollectionView.svelte:214 in activeFormulas=$derived -> src/lib/features/collection/toolbar/formula.logic.ts:entriesToFormulas call
call src/lib/features/collection/CollectionView.svelte:219 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/collection/CollectionView.svelte:233 in allColumns=$derived -> src/lib/features/collection/toolbar/properties.logic.ts:getAllAvailableColumns call
call src/lib/features/collection/CollectionView.svelte:252 in $effect@251 -> src/lib/features/collection/CollectionView.svelte:syncedFormulaColumns call
call src/lib/features/collection/CollectionView.svelte:259 in queryResult=$derived -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/features/collection/CollectionView.svelte:262 in queryResult=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call +1
call src/lib/features/collection/CollectionView.svelte:272 in queryResult=$derived -> src/lib/features/collection/collection.logic.ts:executeQuery call
call src/lib/features/collection/CollectionView.svelte:288 in undatedCount=$derived -> src/lib/features/collection/calendar.logic.ts:countUndated call
call src/lib/features/collection/CollectionView.svelte:296 in sortEmptyText=$derived -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/features/collection/CollectionView.svelte:309 in reportWriteError -> src/lib/utils/debug.ts:error call
call src/lib/features/collection/CollectionView.svelte:346 in writeYaml -> src/lib/features/collection/CollectionView.svelte:reportWriteError call
call src/lib/features/collection/CollectionView.svelte:351 in writeYaml -> src/lib/core/editor/editor.service.ts:reloadExternallyChangedTabs call
call src/lib/features/collection/CollectionView.svelte:352 in writeYaml -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:353 in writeYaml -> src/lib/features/collection/key-edit.logic.ts:editorKeyBases call
call src/lib/features/collection/CollectionView.svelte:354 in writeYaml -> src/lib/features/collection/CollectionView.svelte:reseed call
call src/lib/features/collection/CollectionView.svelte:354 in writeYaml -> src/lib/features/collection/key-edit.logic.ts:EDITOR_KEYS mcall
call src/lib/features/collection/CollectionView.svelte:367 in persistKey -> src/lib/features/collection/key-edit.logic.ts:editorKeyBaseAfter call
call src/lib/features/collection/CollectionView.svelte:368 in persistKey -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:369 in persistKey -> src/lib/features/collection/key-edit.logic.ts:applyEditorKeyEdit call
call src/lib/features/collection/CollectionView.svelte:371 in persistKey -> src/lib/features/collection/key-edit.logic.ts:CollectionEditConflict new
call src/lib/features/collection/CollectionView.svelte:377 in onView -> src/lib/features/collection/key-edit.logic.ts:CollectionEditConflict new
call src/lib/features/collection/CollectionView.svelte:377 in onView -> src/lib/features/collection/key-edit.logic.ts:isViewAt call
call src/lib/features/collection/CollectionView.svelte:386 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:386 in handleFormulasChange -> src/lib/features/collection/toolbar/formula.logic.ts:entriesToFormulas call
call src/lib/features/collection/CollectionView.svelte:388 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:syncedFormulaColumns call
call src/lib/features/collection/CollectionView.svelte:389 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:handleColumnsChange call
call src/lib/features/collection/CollectionView.svelte:395 in handleSortsChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:400 in handleGlobalFiltersChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:400 in handleGlobalFiltersChange -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/collection/CollectionView.svelte:405 in handleViewFiltersChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:405 in handleViewFiltersChange -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/collection/CollectionView.svelte:410 in handleColumnsChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:424 in handleToggleSort -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:428 in handleDatePropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:432 in handleEndDatePropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:436 in handleWeekStartDayChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:440 in handleColorPropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:446 in handleAddView -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:447 in handleAddView -> src/lib/features/collection/yaml-parser.ts:addView call
call src/lib/features/collection/CollectionView.svelte:449 in handleAddView -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:455 in handleAddView -> src/lib/features/collection/CollectionView.svelte:startTabRename call
call src/lib/features/collection/CollectionView.svelte:466 in handleDeleteView -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:466 in handleDeleteView -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:466 in handleDeleteView -> src/lib/features/collection/yaml-parser.ts:removeView call
call src/lib/features/collection/CollectionView.svelte:472 in handleSetViewType -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:472 in handleSetViewType -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:472 in handleSetViewType -> src/lib/features/collection/yaml-parser.ts:setViewType call
call src/lib/features/collection/CollectionView.svelte:494 in commitTabRename -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:494 in commitTabRename -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:494 in commitTabRename -> src/lib/features/collection/yaml-parser.ts:renameView call
call src/lib/features/collection/CollectionView.svelte:505 in handleRenameKeydown -> src/lib/features/collection/CollectionView.svelte:commitTabRename call
call src/lib/features/collection/CollectionView.svelte:508 in handleRenameKeydown -> src/lib/features/collection/CollectionView.svelte:cancelTabRename call
call src/lib/features/collection/CollectionView.svelte:513 in handleClickRow -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/collection/CollectionView.svelte:544 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleRenameKeydown markup
call src/lib/features/collection/CollectionView.svelte:545 in (markup) -> src/lib/features/collection/CollectionView.svelte:commitTabRename markup
call src/lib/features/collection/CollectionView.svelte:554 in (markup) -> src/lib/features/collection/CollectionView.svelte:startTabRename markup +1
call src/lib/features/collection/CollectionView.svelte:565 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleAddView markup
call src/lib/features/collection/CollectionView.svelte:583 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleSetViewType markup +2
call src/lib/features/collection/CollectionView.svelte:597 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleDeleteView markup
call src/lib/features/collection/CollectionView.svelte:636 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleDatePropertyChange markup
call src/lib/features/collection/CollectionView.svelte:637 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleEndDatePropertyChange markup
call src/lib/features/collection/CollectionView.svelte:638 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleWeekStartDayChange markup
call src/lib/features/collection/CollectionView.svelte:639 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleColorPropertyChange markup
call src/lib/features/collection/CollectionView.svelte:662 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleSortsChange markup
call src/lib/features/collection/CollectionView.svelte:685 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleGlobalFiltersChange markup
call src/lib/features/collection/CollectionView.svelte:686 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleViewFiltersChange markup
call src/lib/features/collection/CollectionView.svelte:703 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleColumnsChange markup
call src/lib/features/collection/CollectionView.svelte:705 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleFormulasChange markup
call src/lib/features/collection/CollectionView.svelte:730 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleClickRow markup +2
call src/lib/features/collection/CollectionView.svelte:760 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleToggleSort markup
## effects
fx src/lib/features/collection/CollectionView.svelte:140 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:156 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:181 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:199 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:251 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:455 timer.queueMicrotask in handleAddView
fx src/lib/features/collection/CollectionView.svelte:481 timer.requestAnimationFrame in startTabRename
