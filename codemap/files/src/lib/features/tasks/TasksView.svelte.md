# file card src/lib/features/tasks/TasksView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/TasksView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/tasks/TasksView.svelte component L1213 module src/lib/features/tasks in1 t2
## imports
imp src/lib/features/tasks/TasksView.svelte:17 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/tasks/TasksView.svelte:18 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/tasks/TasksView.svelte:19 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/tasks/TasksView.svelte:20 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/tasks/TasksView.svelte:21 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/tasks/TasksView.svelte:22 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/tasks/TasksView.svelte:23 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/TasksView.svelte:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tasks/TasksView.svelte:25 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/tasks/TasksView.svelte:26 -> src/lib/features/tasks/tasks.service.ts buildTaskIndex,setTaskSources,setTaskStatusFromMenu,toggleTask,updateTaskFromMenu
imp src/lib/features/tasks/TasksView.svelte:27 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/tasks/TasksView.svelte:28 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/features/tasks/TasksView.svelte:29 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/tasks/TasksView.svelte:30 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/tasks/TasksView.svelte:31 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/tasks/TasksView.svelte:32 -> src/lib/utils/date.ts formatDate,formatNow
imp src/lib/features/tasks/TasksView.svelte:33 -> src/lib/utils/task-tokens.ts setDueToken,setPriorityToken
imp src/lib/features/tasks/TasksView.svelte:34 -> src/lib/features/tasks/SourcesPanel.svelte default
imp src/lib/features/tasks/TasksView.svelte:35 -> src/lib/features/tasks/TaskLists.svelte default
imp src/lib/features/tasks/TasksView.svelte:36 -> src/lib/features/tasks/tasks.logic.ts parseTaskTextSegments,stripTaskTrailers,taskChips,taskDisplayText,usesRawTaskText
imp src/lib/features/tasks/TasksView.svelte:43 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,GROUP_ROW_CAP,TASK_PRIORITIES,collapseKey,describeTaskQuery,explainEmptyTasks,hideFolder,hideNote,hideType,isQuickFieldDefault,isQuickModified,onlyThisFolder,onlyThisType,priorityWord,propertyKeyOptions,statusFilterLabel,tagMenuOptions,taskCountText,toggleQuickPriority,toggleQuickStatus,toggleQuickTag,type:DueRange,type:EmptyTasksExplanation,type:GroupedRow,type:QuickFilterField,type:TaskGroup,type:TaskGroupKey,type:TaskQuickFilters
imp src/lib/features/tasks/TasksView.svelte:73 -> src/lib/features/tasks/task-status.logic.ts ROW_MENU_STATUSES,TASK_STATUSES,statusGlyph,statusMenuLabel,toggleTarget,type:StatusGlyphIcon
imp src/lib/features/tasks/TasksView.svelte:81 -> src/lib/features/tasks/task-row-edit.logic.ts priorityMenuLabel,prioritySignifier,resolveDuePreset,type:DuePreset
imp src/lib/features/tasks/TasksView.svelte:82 -> src/lib/features/tasks/task-views.logic.ts findTaskView
imp src/lib/features/tasks/TasksView.svelte:83 -> src/lib/features/tasks/tasks-keys.logic.ts nextCurrentRow,resolveTaskKey,tabStopRow,taskRowKey
imp src/lib/features/tasks/TasksView.svelte:84 -> src/lib/features/tasks/task-metadata.types.ts type:TaskPriority,type:TaskStatus
imp src/lib/features/tasks/TasksView.svelte:85 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
## imported-by
imp src/lib/app/EditorView.svelte:16 -> src/lib/features/tasks/TasksView.svelte default
## reach
in2 src/lib/features/tasks/TasksView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tasks/TasksView.svelte 78 files in 13 modules: src/lib/components(48) src/lib/utils(8) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/features/file-icons(3) +8 modules
## tests
test src/tests/lib/features/tasks/TasksView.sources.test.ts imports src/lib/features/tasks/TasksView.svelte mirror
test src/tests/fixtures/tasks.fixture.ts imports src/lib/features/tasks/TasksView.svelte
## symbols
sym src/lib/features/tasks/TasksView.svelte:1 component TasksView props:onOpenWikilink L1213
by src/lib/features/tasks/TasksView.svelte:default <- src/lib/app/EditorView.svelte:73 in (markup) mount
## locals
local src/lib/features/tasks/TasksView.svelte:149 fn openSources(section: 'sources' | 'excludes') L6
local src/lib/features/tasks/TasksView.svelte:187 fn pickShow(value: string) L3
local src/lib/features/tasks/TasksView.svelte:191 fn toggleStatus(status: TaskStatus) L3
local src/lib/features/tasks/TasksView.svelte:202 fn pickDue(value: string) L3
local src/lib/features/tasks/TasksView.svelte:212 fn togglePriority(priority: TaskPriority) L3
local src/lib/features/tasks/TasksView.svelte:225 fn toggleTag(tag: string) L3
local src/lib/features/tasks/TasksView.svelte:230 fn handleSearchInput(value: string) L3
local src/lib/features/tasks/TasksView.svelte:247 fn runEmptyAction(action: NonNullable<EmptyTasksExplanation['action']>) L6
local src/lib/features/tasks/TasksView.svelte:254 fn handleFileClick(filePath: string) L3
local src/lib/features/tasks/TasksView.svelte:258 fn handleToggle(filePath: string, task: TaskItem) L3
local src/lib/features/tasks/TasksView.svelte:263 fn handleTextClick(e: MouseEvent & { currentTarget: HTMLElement }, filePath: string, lineNumber: number) L5
local src/lib/features/tasks/TasksView.svelte:343 fn groupActions(group: TaskGroup): { label: string; target: string; run: () => void }[] L22
local src/lib/features/tasks/TasksView.svelte:367 fn revealGroup(key: string, group: TaskGroup) L6
local src/lib/features/tasks/TasksView.svelte:375 fn rowElement(key: string | null): HTMLElement | undefined L4
local src/lib/features/tasks/TasksView.svelte:385 fn focusIsFree(allowRoot: boolean): boolean L4
local src/lib/features/tasks/TasksView.svelte:390 fn handleListKeydown(e: KeyboardEvent) L28
local src/lib/features/tasks/TasksView.svelte:420 fn handleListFocusin(e: FocusEvent) L6
local src/lib/features/tasks/TasksView.svelte:501 fn handleRowMenuOpen(row: GroupedRow) L3
local src/lib/features/tasks/TasksView.svelte:505 fn handleRowContextMenu(row: GroupedRow) L4
local src/lib/features/tasks/TasksView.svelte:511 fn handleListContextMenu(e: MouseEvent, triggerHandler: unknown) L8
local src/lib/features/tasks/TasksView.svelte:528 fn handleRowMenuCloseFocus(e: Event, key: string) L12
local src/lib/features/tasks/TasksView.svelte:541 fn pickRowStatus(row: GroupedRow, value: string) L3
local src/lib/features/tasks/TasksView.svelte:553 fn setRowDue(row: GroupedRow, date: string | null) L4
local src/lib/features/tasks/TasksView.svelte:559 fn pickRowPriority(row: GroupedRow, value: string) L6
local src/lib/features/tasks/TasksView.svelte:573 fn openDueDialog(row: GroupedRow) L5
local src/lib/features/tasks/TasksView.svelte:579 fn saveDueDialog() L5
local src/lib/features/tasks/TasksView.svelte:585 fn copyTaskText(row: GroupedRow) L7
local src/lib/features/tasks/TasksView.svelte:594 fn modifiedTitle(timestamp: number): string | undefined L5
## mounts
mount src/lib/features/tasks/TasksView.svelte:760 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/tasks/TasksView.svelte:1074 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1075 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/tasks/TasksView.svelte:1077 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1102 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1103 SourcesPanel -> src/lib/features/tasks/SourcesPanel.svelte
mount src/lib/features/tasks/TasksView.svelte:1205 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/TasksView.svelte:1207 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/TasksView.svelte:1208 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:73 TasksView -> src/lib/features/tasks/TasksView.svelte
## calls
call src/lib/features/tasks/TasksView.svelte:140 in propertyKeys=$derived -> src/lib/features/tasks/task-query.logic.ts:propertyKeyOptions call
call src/lib/features/tasks/TasksView.svelte:158 in countText=$derived -> src/lib/features/tasks/task-query.logic.ts:taskCountText call
call src/lib/features/tasks/TasksView.svelte:166 in today=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/features/tasks/TasksView.svelte:169 in ruleSentence=$derived -> src/lib/features/tasks/task-query.logic.ts:describeTaskQuery call
call src/lib/features/tasks/TasksView.svelte:173 in emptyExplanation=$derived -> src/lib/features/tasks/task-query.logic.ts:explainEmptyTasks call
call src/lib/features/tasks/TasksView.svelte:188 in pickShow -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:192 in toggleStatus -> src/lib/features/tasks/task-query.logic.ts:toggleQuickStatus call
call src/lib/features/tasks/TasksView.svelte:192 in toggleStatus -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:203 in pickDue -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:209 in priorityTriggerLabel=$derived -> src/lib/features/tasks/task-query.logic.ts:TASK_PRIORITIES mcall
call src/lib/features/tasks/TasksView.svelte:209 in priorityTriggerLabel=$derived -> src/lib/features/tasks/task-query.logic.ts:priorityWord ref
call src/lib/features/tasks/TasksView.svelte:213 in togglePriority -> src/lib/features/tasks/task-query.logic.ts:toggleQuickPriority call
call src/lib/features/tasks/TasksView.svelte:213 in togglePriority -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:217 in tagOptions=$derived -> src/lib/features/tasks/task-query.logic.ts:tagMenuOptions call
call src/lib/features/tasks/TasksView.svelte:226 in toggleTag -> src/lib/features/tasks/task-query.logic.ts:toggleQuickTag call
call src/lib/features/tasks/TasksView.svelte:226 in toggleTag -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:231 in handleSearchInput -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:237 in foldedCount=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/TasksView.svelte:240 in savedQuick=$derived -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/TasksView.svelte:244 in quickAtSaved=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/TasksView.svelte:244 in quickAtSaved=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickModified call
call src/lib/features/tasks/TasksView.svelte:248 in runEmptyAction -> src/lib/features/tasks/TasksView.svelte:openSources call +1
call src/lib/features/tasks/TasksView.svelte:250 in runEmptyAction -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall +1
call src/lib/features/tasks/TasksView.svelte:255 in handleFileClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/tasks/TasksView.svelte:259 in handleToggle -> src/lib/features/tasks/tasks.service.ts:toggleTask call
call src/lib/features/tasks/TasksView.svelte:266 in handleTextClick -> src/lib/core/editor/open-note-at.service.ts:openNoteAt call
call src/lib/features/tasks/TasksView.svelte:274 in $effect@271 -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex call
call src/lib/features/tasks/TasksView.svelte:285 in $effect@282 -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setScrollOffset mcall
call src/lib/features/tasks/TasksView.svelte:307 in rowsByKey=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:312 in currentKey=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:324 in shownGroups=$derived -> src/lib/features/tasks/task-query.logic.ts:collapseKey call
call src/lib/features/tasks/TasksView.svelte:331 in rendered=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:333 in tabStopKey=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:348 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideNote call
call src/lib/features/tasks/TasksView.svelte:348 in groupActions -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setExclude mcall +2
call src/lib/features/tasks/TasksView.svelte:354 in groupActions -> src/lib/features/tasks/task-query.logic.ts:onlyThisType call
call src/lib/features/tasks/TasksView.svelte:354 in groupActions -> src/lib/features/tasks/tasks.service.ts:setTaskSources call +1
call src/lib/features/tasks/TasksView.svelte:355 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideType call
call src/lib/features/tasks/TasksView.svelte:361 in groupActions -> src/lib/features/tasks/task-query.logic.ts:onlyThisFolder call
call src/lib/features/tasks/TasksView.svelte:362 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideFolder call
call src/lib/features/tasks/TasksView.svelte:371 in revealGroup -> src/lib/features/tasks/TasksView.svelte:rowElement call
call src/lib/features/tasks/TasksView.svelte:371 in revealGroup -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:394 in handleListKeydown -> src/lib/features/tasks/tasks-keys.logic.ts:resolveTaskKey call
call src/lib/features/tasks/TasksView.svelte:413 in handleListKeydown -> src/lib/features/tasks/TasksView.svelte:handleToggle call
call src/lib/features/tasks/TasksView.svelte:414 in handleListKeydown -> src/lib/core/editor/open-note-at.service.ts:openNoteAt call
call src/lib/features/tasks/TasksView.svelte:423 in handleListFocusin -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall
call src/lib/features/tasks/TasksView.svelte:458 in $effect@448 -> src/lib/features/tasks/tasks-keys.logic.ts:nextCurrentRow call +1
call src/lib/features/tasks/TasksView.svelte:464 in $effect@448 -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall +1
call src/lib/features/tasks/TasksView.svelte:465 in $effect@448 -> src/lib/features/tasks/TasksView.svelte:focusIsFree call +1
call src/lib/features/tasks/TasksView.svelte:465 in $effect@448 -> src/lib/features/tasks/TasksView.svelte:rowElement call +2
call src/lib/features/tasks/TasksView.svelte:477 in $effect@448 -> src/lib/features/tasks/tasks-keys.logic.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:491 in $effect@487 -> src/lib/features/tasks/TasksView.svelte:focusIsFree call
call src/lib/features/tasks/TasksView.svelte:492 in $effect@487 -> src/lib/features/tasks/TasksView.svelte:rowElement call
call src/lib/features/tasks/TasksView.svelte:502 in handleRowMenuOpen -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall
call src/lib/features/tasks/TasksView.svelte:507 in handleRowContextMenu -> src/lib/features/tasks/TasksView.svelte:handleRowMenuOpen call
call src/lib/features/tasks/TasksView.svelte:537 in handleRowMenuCloseFocus -> src/lib/features/tasks/TasksView.svelte:rowElement call +1
call src/lib/features/tasks/TasksView.svelte:537 in handleRowMenuCloseFocus -> src/lib/features/tasks/tasks-keys.logic.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:542 in pickRowStatus -> src/lib/features/tasks/tasks.service.ts:setTaskStatusFromMenu call
call src/lib/features/tasks/TasksView.svelte:555 in setRowDue -> src/lib/features/tasks/tasks.service.ts:updateTaskFromMenu call
call src/lib/features/tasks/TasksView.svelte:555 in setRowDue -> src/lib/utils/task-tokens.ts:setDueToken call
call src/lib/features/tasks/TasksView.svelte:562 in pickRowPriority -> src/lib/features/tasks/task-row-edit.logic.ts:prioritySignifier call
call src/lib/features/tasks/TasksView.svelte:562 in pickRowPriority -> src/lib/utils/task-tokens.ts:setPriorityToken call
call src/lib/features/tasks/TasksView.svelte:563 in pickRowPriority -> src/lib/features/tasks/task-row-edit.logic.ts:priorityMenuLabel call
call src/lib/features/tasks/TasksView.svelte:563 in pickRowPriority -> src/lib/features/tasks/tasks.service.ts:updateTaskFromMenu call
call src/lib/features/tasks/TasksView.svelte:581 in saveDueDialog -> src/lib/features/tasks/TasksView.svelte:setRowDue call
call src/lib/features/tasks/TasksView.svelte:587 in copyTaskText -> src/lib/features/tasks/tasks.logic.ts:stripTaskTrailers call
call src/lib/features/tasks/TasksView.svelte:597 in modifiedTitle -> src/lib/utils/date.ts:formatDate call
call src/lib/features/tasks/TasksView.svelte:611 in (markup) -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex markup
call src/lib/features/tasks/TasksView.svelte:620 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickShow markup
call src/lib/features/tasks/TasksView.svelte:630 in (markup) -> src/lib/features/tasks/TasksView.svelte:toggleStatus markup
call src/lib/features/tasks/TasksView.svelte:632 in (markup) -> src/lib/features/tasks/task-status.logic.ts:statusGlyph markup +1
call src/lib/features/tasks/TasksView.svelte:638 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickDue markup
call src/lib/features/tasks/TasksView.svelte:654 in (markup) -> src/lib/features/tasks/TasksView.svelte:togglePriority markup
call src/lib/features/tasks/TasksView.svelte:656 in (markup) -> src/lib/features/tasks/task-query.logic.ts:priorityWord markup
call src/lib/features/tasks/TasksView.svelte:666 in (markup) -> src/lib/features/tasks/TasksView.svelte:toggleTag markup
call src/lib/features/tasks/TasksView.svelte:677 in (markup) -> src/lib/core/editor/open-note-at.service.ts:openNoteAt markup
call src/lib/features/tasks/TasksView.svelte:680 in (markup) -> src/lib/features/tasks/TasksView.svelte:copyTaskText markup
call src/lib/features/tasks/TasksView.svelte:683 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickRowStatus markup
call src/lib/features/tasks/TasksView.svelte:685 in (markup) -> src/lib/features/tasks/task-status.logic.ts:statusMenuLabel markup
call src/lib/features/tasks/TasksView.svelte:693 in (markup) -> src/lib/features/tasks/TasksView.svelte:setRowDue markup +1
call src/lib/features/tasks/TasksView.svelte:693 in (markup) -> src/lib/features/tasks/task-row-edit.logic.ts:resolveDuePreset markup
call src/lib/features/tasks/TasksView.svelte:695 in (markup) -> src/lib/features/tasks/TasksView.svelte:openDueDialog markup
call src/lib/features/tasks/TasksView.svelte:705 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickRowPriority markup
call src/lib/features/tasks/TasksView.svelte:707 in (markup) -> src/lib/features/tasks/task-row-edit.logic.ts:priorityMenuLabel markup
call src/lib/features/tasks/TasksView.svelte:722 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.toggleGroupCollapsed markup
call src/lib/features/tasks/TasksView.svelte:730 in (markup) -> src/lib/features/tasks/TasksView.svelte:groupActions markup
call src/lib/features/tasks/TasksView.svelte:754 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/tasks/TasksView.svelte:762 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/features/tasks/TasksView.svelte:770 in (markup) -> src/lib/features/tasks/TasksView.svelte:modifiedTitle markup
call src/lib/features/tasks/TasksView.svelte:771 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleFileClick markup
call src/lib/features/tasks/TasksView.svelte:798 in (markup) -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText markup +1
call src/lib/features/tasks/TasksView.svelte:799 in (markup) -> src/lib/features/tasks/tasks.logic.ts:taskChips markup
call src/lib/features/tasks/TasksView.svelte:799 in (markup) -> src/lib/features/tasks/tasks.logic.ts:usesRawTaskText markup
call src/lib/features/tasks/TasksView.svelte:800 in (markup) -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey markup +3
call src/lib/features/tasks/TasksView.svelte:811 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowContextMenu markup
call src/lib/features/tasks/TasksView.svelte:823 in (markup) -> src/lib/features/tasks/task-status.logic.ts:toggleTarget markup
call src/lib/features/tasks/TasksView.svelte:825 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleToggle markup
call src/lib/features/tasks/TasksView.svelte:834 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleTextClick markup
call src/lib/features/tasks/TasksView.svelte:840 in (markup) -> src/lib/features/tasks/tasks.logic.ts:parseTaskTextSegments markup
call src/lib/features/tasks/TasksView.svelte:881 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowMenuOpen markup
call src/lib/features/tasks/TasksView.svelte:896 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowMenuCloseFocus markup +2
call src/lib/features/tasks/TasksView.svelte:918 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleSearchInput markup
call src/lib/features/tasks/TasksView.svelte:938 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setGroupBy markup +2
call src/lib/features/tasks/TasksView.svelte:1001 in (markup) -> src/lib/features/tasks/task-query.logic.ts:statusFilterLabel markup
call src/lib/features/tasks/TasksView.svelte:1065 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.resetQuick markup
call src/lib/features/tasks/TasksView.svelte:1097 in (markup) -> src/lib/features/tasks/tasks.service.ts:setTaskSources markup
call src/lib/features/tasks/TasksView.svelte:1118 in (markup) -> src/lib/features/tasks/TasksView.svelte:runEmptyAction markup
call src/lib/features/tasks/TasksView.svelte:1136 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListKeydown markup
call src/lib/features/tasks/TasksView.svelte:1137 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListFocusin markup
call src/lib/features/tasks/TasksView.svelte:1138 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListContextMenu markup
call src/lib/features/tasks/TasksView.svelte:1155 in (markup) -> src/lib/features/tasks/TasksView.svelte:revealGroup markup
call src/lib/features/tasks/TasksView.svelte:1202 in (markup) -> src/lib/features/tasks/TasksView.svelte:saveDueDialog markup
## effects
fx src/lib/features/tasks/TasksView.svelte:271 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:282 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:286 dom.scroll viewport in $effect@282
fx src/lib/features/tasks/TasksView.svelte:293 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:448 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:487 svelte.$effect in (script)
