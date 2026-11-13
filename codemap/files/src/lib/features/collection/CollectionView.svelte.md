# file card src/lib/features/collection/CollectionView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/collection/CollectionView.svelte component L736 module src/lib/features/collection in1 t4
## imports
imp src/lib/features/collection/CollectionView.svelte:3 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,addView,removeView,renameView,setViewType,type:CollectionYamlUpdates,type:ViewType
imp src/lib/features/collection/CollectionView.svelte:4 -> src/lib/features/collection/collection.logic.ts executeQuery
imp src/lib/features/collection/CollectionView.svelte:5 -> src/lib/features/collection/key-edit.logic.ts applyEditorKeyEdit,CollectionEditConflict,EDITOR_KEYS,editorKeyBaseAfter,editorKeyBases,isViewAt,type:EditorKey
imp src/lib/features/collection/CollectionView.svelte:14 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/features/collection/CollectionView.svelte:15 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/CollectionView.svelte:16 -> src/lib/core/editor/editor.service.ts openFileInEditor,reloadExternallyChangedTabs
imp src/lib/features/collection/CollectionView.svelte:17 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/CollectionView.svelte:18 -> src/lib/utils/debug.ts error
imp src/lib/features/collection/CollectionView.svelte:19 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord,type:SortDef,type:CollectionViewDef
imp src/lib/features/collection/CollectionView.svelte:20 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup,type:FormulaEntry
imp src/lib/features/collection/CollectionView.svelte:21 -> src/lib/features/collection/toolbar/filter.logic.ts parseFilterToGroups,filterGroupsToFilter,getAllKnownProperties
imp src/lib/features/collection/CollectionView.svelte:22 -> src/lib/features/collection/toolbar/formula.logic.ts formulasToEntries,entriesToFormulas
imp src/lib/features/collection/CollectionView.svelte:23 -> src/lib/features/collection/CollectionTableView.svelte default
imp src/lib/features/collection/CollectionView.svelte:24 -> src/lib/features/collection/CollectionCalendarView.svelte default
imp src/lib/features/collection/CollectionView.svelte:25 -> src/lib/features/collection/CollectionLinearCalendarView.svelte default
imp src/lib/features/collection/CollectionView.svelte:26 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:27 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:28 -> src/lib/features/collection/toolbar/PropertiesPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:29 -> src/lib/features/collection/toolbar/properties.logic.ts getAllAvailableColumns
imp src/lib/features/collection/CollectionView.svelte:30 -> src/lib/components/ui/popover/index.ts Popover,PopoverTrigger,PopoverContent
imp src/lib/features/collection/CollectionView.svelte:31 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/CollectionView.svelte:32 -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:38 -> src/lib/components/ui/context-menu/index.ts *
## imported-by
imp src/lib/app/EditorView.svelte:14 -> src/lib/features/collection/CollectionView.svelte default
## reach
in2 src/lib/features/collection/CollectionView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionView.svelte 47 files in 10 modules: src/lib/components(21) src/lib/features/collection(8) src/lib/core/editor(4) src/lib/utils(4) src/lib/contracts(2) +5 modules
## tests
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts harness src/lib/features/collection/CollectionView.svelte mirror via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/features/collection/CollectionView.test.ts harness src/lib/features/collection/CollectionView.svelte mirror via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts harness src/lib/features/collection/CollectionView.svelte via src/tests/fixtures/CollectionViewHarness.svelte
test src/tests/lib/lib-specifier-convention.test.ts imports src/lib/features/collection/CollectionView.svelte
## symbols
sym src/lib/features/collection/CollectionView.svelte:1 component CollectionView props:path,yamlContent,onYamlChange,rewriteView L736
by src/lib/features/collection/CollectionView.svelte:default <- src/lib/app/EditorView.svelte:90 in (markup) mount
## locals
local src/lib/features/collection/CollectionView.svelte:143 fn restoreViewIndex() L4
local src/lib/features/collection/CollectionView.svelte:158 fn seedFromDefinition() L12
local src/lib/features/collection/CollectionView.svelte:183 fn reseed() L4
local src/lib/features/collection/CollectionView.svelte:235 fn syncedFormulaColumns(): string[] | null L11
local src/lib/features/collection/CollectionView.svelte:285 fn reportWriteError(err: unknown) L11
local src/lib/features/collection/CollectionView.svelte:308 fn writeYaml(transform: (base: string) => string, onApply?: (yaml: string) => void): Promise<void> L32
local src/lib/features/collection/CollectionView.svelte:346 fn persistKey<K extends EditorKey>(key: K, value: CollectionYamlUpdates[K]) L12
local src/lib/features/collection/CollectionView.svelte:360 fn onView(content: string, idx: number, name: string | undefined): string L4
local src/lib/features/collection/CollectionView.svelte:366 fn handleFormulasChange(entries: FormulaEntry[]) L10
local src/lib/features/collection/CollectionView.svelte:377 fn handleSortsChange(sorts: SortDef[]) L4
local src/lib/features/collection/CollectionView.svelte:382 fn handleGlobalFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/collection/CollectionView.svelte:387 fn handleViewFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/collection/CollectionView.svelte:392 fn handleColumnsChange(cols: string[]) L4
local src/lib/features/collection/CollectionView.svelte:397 fn handleToggleSort(column: string) L13
local src/lib/features/collection/CollectionView.svelte:411 fn handleDatePropertyChange(prop: string) L3
local src/lib/features/collection/CollectionView.svelte:415 fn handleEndDatePropertyChange(prop: string | undefined) L3
local src/lib/features/collection/CollectionView.svelte:419 fn handleWeekStartDayChange(day: number) L3
local src/lib/features/collection/CollectionView.svelte:423 fn handleColorPropertyChange(prop: string | undefined) L3
local src/lib/features/collection/CollectionView.svelte:428 fn handleAddView() L15
local src/lib/features/collection/CollectionView.svelte:445 fn handleDeleteView(idx: number) L7
local src/lib/features/collection/CollectionView.svelte:454 fn handleSetViewType(idx: number, type: ViewType) L4
local src/lib/features/collection/CollectionView.svelte:460 fn startTabRename(idx: number) L10
local src/lib/features/collection/CollectionView.svelte:472 fn commitTabRename() L8
local src/lib/features/collection/CollectionView.svelte:482 fn cancelTabRename() L3
local src/lib/features/collection/CollectionView.svelte:486 fn handleRenameKeydown(e: KeyboardEvent) L9
local src/lib/features/collection/CollectionView.svelte:496 fn handleClickRow(record: PropertyIndexRecord) L3
## mounts
mount src/lib/features/collection/CollectionView.svelte:595 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:603 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:604 CalendarConfigPanel -> src/lib/features/collection/toolbar/CalendarConfigPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:622 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:630 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:631 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:645 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:653 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:654 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:668 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/CollectionView.svelte:672 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/collection/CollectionView.svelte:673 PropertiesPanel -> src/lib/features/collection/toolbar/PropertiesPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:697 CollectionCalendarView -> src/lib/features/collection/CollectionCalendarView.svelte
mount src/lib/features/collection/CollectionView.svelte:711 CollectionLinearCalendarView -> src/lib/features/collection/CollectionLinearCalendarView.svelte
mount src/lib/features/collection/CollectionView.svelte:726 CollectionTableView -> src/lib/features/collection/CollectionTableView.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:90 CollectionView -> src/lib/features/collection/CollectionView.svelte
## calls
call src/lib/features/collection/CollectionView.svelte:126 in parseResult=$derived -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:145 in restoreViewIndex -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.getViewIndex mcall
call src/lib/features/collection/CollectionView.svelte:149 in (script) -> src/lib/features/collection/CollectionView.svelte:restoreViewIndex call
call src/lib/features/collection/CollectionView.svelte:174 in (script) -> src/lib/features/collection/CollectionView.svelte:seedFromDefinition call
call src/lib/features/collection/CollectionView.svelte:154 in $effect@153 -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.setViewIndex mcall
call src/lib/features/collection/CollectionView.svelte:161 in seedFromDefinition -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call +1
call src/lib/features/collection/CollectionView.svelte:164 in seedFromDefinition -> src/lib/features/collection/toolbar/formula.logic.ts:formulasToEntries call
call src/lib/features/collection/CollectionView.svelte:165 in seedFromDefinition -> src/lib/features/collection/key-edit.logic.ts:editorKeyBases call
call src/lib/features/collection/CollectionView.svelte:179 in $effect@178 -> src/lib/features/collection/CollectionView.svelte:seedFromDefinition call
call src/lib/features/collection/CollectionView.svelte:206 in $effect@196 -> src/lib/features/collection/CollectionView.svelte:reseed call
call src/lib/features/collection/CollectionView.svelte:211 in activeFormulas=$derived -> src/lib/features/collection/toolbar/formula.logic.ts:entriesToFormulas call
call src/lib/features/collection/CollectionView.svelte:216 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/collection/CollectionView.svelte:230 in allColumns=$derived -> src/lib/features/collection/toolbar/properties.logic.ts:getAllAvailableColumns call
call src/lib/features/collection/CollectionView.svelte:249 in $effect@248 -> src/lib/features/collection/CollectionView.svelte:syncedFormulaColumns call
call src/lib/features/collection/CollectionView.svelte:256 in queryResult=$derived -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/features/collection/CollectionView.svelte:259 in queryResult=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call +1
call src/lib/features/collection/CollectionView.svelte:269 in queryResult=$derived -> src/lib/features/collection/collection.logic.ts:executeQuery call
call src/lib/features/collection/CollectionView.svelte:280 in sortEmptyText=$derived -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/features/collection/CollectionView.svelte:293 in reportWriteError -> src/lib/utils/debug.ts:error call
call src/lib/features/collection/CollectionView.svelte:330 in writeYaml -> src/lib/features/collection/CollectionView.svelte:reportWriteError call
call src/lib/features/collection/CollectionView.svelte:335 in writeYaml -> src/lib/core/editor/editor.service.ts:reloadExternallyChangedTabs call
call src/lib/features/collection/CollectionView.svelte:336 in writeYaml -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:337 in writeYaml -> src/lib/features/collection/key-edit.logic.ts:editorKeyBases call
call src/lib/features/collection/CollectionView.svelte:338 in writeYaml -> src/lib/features/collection/CollectionView.svelte:reseed call
call src/lib/features/collection/CollectionView.svelte:338 in writeYaml -> src/lib/features/collection/key-edit.logic.ts:EDITOR_KEYS mcall
call src/lib/features/collection/CollectionView.svelte:351 in persistKey -> src/lib/features/collection/key-edit.logic.ts:editorKeyBaseAfter call
call src/lib/features/collection/CollectionView.svelte:352 in persistKey -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:353 in persistKey -> src/lib/features/collection/key-edit.logic.ts:applyEditorKeyEdit call
call src/lib/features/collection/CollectionView.svelte:355 in persistKey -> src/lib/features/collection/key-edit.logic.ts:CollectionEditConflict new
call src/lib/features/collection/CollectionView.svelte:361 in onView -> src/lib/features/collection/key-edit.logic.ts:CollectionEditConflict new
call src/lib/features/collection/CollectionView.svelte:361 in onView -> src/lib/features/collection/key-edit.logic.ts:isViewAt call
call src/lib/features/collection/CollectionView.svelte:370 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:370 in handleFormulasChange -> src/lib/features/collection/toolbar/formula.logic.ts:entriesToFormulas call
call src/lib/features/collection/CollectionView.svelte:372 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:syncedFormulaColumns call
call src/lib/features/collection/CollectionView.svelte:373 in handleFormulasChange -> src/lib/features/collection/CollectionView.svelte:handleColumnsChange call
call src/lib/features/collection/CollectionView.svelte:379 in handleSortsChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:384 in handleGlobalFiltersChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:384 in handleGlobalFiltersChange -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/collection/CollectionView.svelte:389 in handleViewFiltersChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:389 in handleViewFiltersChange -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/collection/CollectionView.svelte:394 in handleColumnsChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:408 in handleToggleSort -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:412 in handleDatePropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:416 in handleEndDatePropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:420 in handleWeekStartDayChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:424 in handleColorPropertyChange -> src/lib/features/collection/CollectionView.svelte:persistKey call
call src/lib/features/collection/CollectionView.svelte:430 in handleAddView -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:431 in handleAddView -> src/lib/features/collection/yaml-parser.ts:addView call
call src/lib/features/collection/CollectionView.svelte:433 in handleAddView -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/CollectionView.svelte:439 in handleAddView -> src/lib/features/collection/CollectionView.svelte:startTabRename call
call src/lib/features/collection/CollectionView.svelte:450 in handleDeleteView -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:450 in handleDeleteView -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:450 in handleDeleteView -> src/lib/features/collection/yaml-parser.ts:removeView call
call src/lib/features/collection/CollectionView.svelte:456 in handleSetViewType -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:456 in handleSetViewType -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:456 in handleSetViewType -> src/lib/features/collection/yaml-parser.ts:setViewType call
call src/lib/features/collection/CollectionView.svelte:478 in commitTabRename -> src/lib/features/collection/CollectionView.svelte:onView call
call src/lib/features/collection/CollectionView.svelte:478 in commitTabRename -> src/lib/features/collection/CollectionView.svelte:writeYaml call
call src/lib/features/collection/CollectionView.svelte:478 in commitTabRename -> src/lib/features/collection/yaml-parser.ts:renameView call
call src/lib/features/collection/CollectionView.svelte:489 in handleRenameKeydown -> src/lib/features/collection/CollectionView.svelte:commitTabRename call
call src/lib/features/collection/CollectionView.svelte:492 in handleRenameKeydown -> src/lib/features/collection/CollectionView.svelte:cancelTabRename call
call src/lib/features/collection/CollectionView.svelte:497 in handleClickRow -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/collection/CollectionView.svelte:528 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleRenameKeydown markup
call src/lib/features/collection/CollectionView.svelte:529 in (markup) -> src/lib/features/collection/CollectionView.svelte:commitTabRename markup
call src/lib/features/collection/CollectionView.svelte:537 in (markup) -> src/lib/features/collection/CollectionView.svelte:startTabRename markup +1
call src/lib/features/collection/CollectionView.svelte:547 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleAddView markup
call src/lib/features/collection/CollectionView.svelte:565 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleSetViewType markup +2
call src/lib/features/collection/CollectionView.svelte:579 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleDeleteView markup
call src/lib/features/collection/CollectionView.svelte:610 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleDatePropertyChange markup
call src/lib/features/collection/CollectionView.svelte:611 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleEndDatePropertyChange markup
call src/lib/features/collection/CollectionView.svelte:612 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleWeekStartDayChange markup
call src/lib/features/collection/CollectionView.svelte:613 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleColorPropertyChange markup
call src/lib/features/collection/CollectionView.svelte:636 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleSortsChange markup
call src/lib/features/collection/CollectionView.svelte:659 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleGlobalFiltersChange markup
call src/lib/features/collection/CollectionView.svelte:660 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleViewFiltersChange markup
call src/lib/features/collection/CollectionView.svelte:677 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleColumnsChange markup
call src/lib/features/collection/CollectionView.svelte:679 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleFormulasChange markup
call src/lib/features/collection/CollectionView.svelte:702 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleClickRow markup +2
call src/lib/features/collection/CollectionView.svelte:730 in (markup) -> src/lib/features/collection/CollectionView.svelte:handleToggleSort markup
## effects
fx src/lib/features/collection/CollectionView.svelte:137 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:153 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:178 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:196 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:248 svelte.$effect in (script)
fx src/lib/features/collection/CollectionView.svelte:439 timer.queueMicrotask in handleAddView
fx src/lib/features/collection/CollectionView.svelte:465 timer.requestAnimationFrame in startTabRename
