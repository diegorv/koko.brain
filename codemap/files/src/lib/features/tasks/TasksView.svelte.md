# file card src/lib/features/tasks/TasksView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/TasksView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/tasks/TasksView.svelte component L1249 module src/lib/features/tasks in1 t2
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
out2 src/lib/features/tasks/TasksView.svelte 79 files in 13 modules: src/lib/components(48) src/lib/utils(9) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/features/file-icons(3) +8 modules
## tests
test src/tests/lib/features/tasks/TasksView.sources.test.ts imports src/lib/features/tasks/TasksView.svelte mirror
test src/tests/fixtures/tasks.fixture.ts imports src/lib/features/tasks/TasksView.svelte
## symbols
sym src/lib/features/tasks/TasksView.svelte:1 component TasksView props:onOpenWikilink L1249
by src/lib/features/tasks/TasksView.svelte:default <- src/lib/app/EditorView.svelte:73 in (markup) mount
## locals
local src/lib/features/tasks/TasksView.svelte:157 fn openSources(section: 'sources' | 'excludes') L6
local src/lib/features/tasks/TasksView.svelte:195 fn pickShow(value: string) L3
local src/lib/features/tasks/TasksView.svelte:199 fn toggleStatus(status: TaskStatus) L3
local src/lib/features/tasks/TasksView.svelte:210 fn pickDue(value: string) L3
local src/lib/features/tasks/TasksView.svelte:220 fn togglePriority(priority: TaskPriority) L3
local src/lib/features/tasks/TasksView.svelte:233 fn toggleTag(tag: string) L3
local src/lib/features/tasks/TasksView.svelte:238 fn handleSearchInput(value: string) L3
local src/lib/features/tasks/TasksView.svelte:255 fn runEmptyAction(action: NonNullable<EmptyTasksExplanation['action']>) L6
local src/lib/features/tasks/TasksView.svelte:262 fn handleFileClick(filePath: string) L3
local src/lib/features/tasks/TasksView.svelte:266 fn handleToggle(filePath: string, task: TaskItem) L3
local src/lib/features/tasks/TasksView.svelte:271 fn handleTextClick(e: MouseEvent & { currentTarget: HTMLElement }, filePath: string, lineNumber: number) L5
local src/lib/features/tasks/TasksView.svelte:351 fn groupActions(group: TaskGroup): { label: string; target: string; run: () => void }[] L22
local src/lib/features/tasks/TasksView.svelte:375 fn revealGroup(key: string, group: TaskGroup) L6
local src/lib/features/tasks/TasksView.svelte:383 fn rowElement(key: string | null): HTMLElement | undefined L4
local src/lib/features/tasks/TasksView.svelte:393 fn focusIsFree(allowRoot: boolean): boolean L4
local src/lib/features/tasks/TasksView.svelte:419 fn handleListKeydown(e: KeyboardEvent) L28
local src/lib/features/tasks/TasksView.svelte:449 fn handleListFocusin(e: FocusEvent) L6
local src/lib/features/tasks/TasksView.svelte:530 fn handleRowMenuOpen(row: GroupedRow) L3
local src/lib/features/tasks/TasksView.svelte:534 fn handleRowContextMenu(row: GroupedRow) L4
local src/lib/features/tasks/TasksView.svelte:540 fn handleListContextMenu(e: MouseEvent, triggerHandler: unknown) L8
local src/lib/features/tasks/TasksView.svelte:557 fn handleRowMenuCloseFocus(e: Event, key: string) L12
local src/lib/features/tasks/TasksView.svelte:570 fn pickRowStatus(row: GroupedRow, value: string) L3
local src/lib/features/tasks/TasksView.svelte:582 fn setRowDue(row: GroupedRow, date: string | null) L4
local src/lib/features/tasks/TasksView.svelte:588 fn pickRowPriority(row: GroupedRow, value: string) L6
local src/lib/features/tasks/TasksView.svelte:602 fn openDueDialog(row: GroupedRow) L5
local src/lib/features/tasks/TasksView.svelte:608 fn saveDueDialog() L5
local src/lib/features/tasks/TasksView.svelte:614 fn copyTaskText(row: GroupedRow) L7
local src/lib/features/tasks/TasksView.svelte:623 fn modifiedTitle(timestamp: number): string | undefined L5
## mounts
mount src/lib/features/tasks/TasksView.svelte:789 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/tasks/TasksView.svelte:1110 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1111 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/tasks/TasksView.svelte:1113 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1138 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1139 SourcesPanel -> src/lib/features/tasks/SourcesPanel.svelte
mount src/lib/features/tasks/TasksView.svelte:1241 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/TasksView.svelte:1243 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/TasksView.svelte:1244 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:73 TasksView -> src/lib/features/tasks/TasksView.svelte
## calls
call src/lib/features/tasks/TasksView.svelte:148 in propertyKeys=$derived -> src/lib/features/tasks/task-query.logic.ts:propertyKeyOptions call
call src/lib/features/tasks/TasksView.svelte:166 in countText=$derived -> src/lib/features/tasks/task-query.logic.ts:taskCountText call
call src/lib/features/tasks/TasksView.svelte:174 in today=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/features/tasks/TasksView.svelte:177 in ruleSentence=$derived -> src/lib/features/tasks/task-query.logic.ts:describeTaskQuery call
call src/lib/features/tasks/TasksView.svelte:181 in emptyExplanation=$derived -> src/lib/features/tasks/task-query.logic.ts:explainEmptyTasks call
call src/lib/features/tasks/TasksView.svelte:196 in pickShow -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:200 in toggleStatus -> src/lib/features/tasks/task-query.logic.ts:toggleQuickStatus call
call src/lib/features/tasks/TasksView.svelte:200 in toggleStatus -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:211 in pickDue -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:217 in priorityTriggerLabel=$derived -> src/lib/features/tasks/task-query.logic.ts:TASK_PRIORITIES mcall
call src/lib/features/tasks/TasksView.svelte:217 in priorityTriggerLabel=$derived -> src/lib/features/tasks/task-query.logic.ts:priorityWord ref
call src/lib/features/tasks/TasksView.svelte:221 in togglePriority -> src/lib/features/tasks/task-query.logic.ts:toggleQuickPriority call
call src/lib/features/tasks/TasksView.svelte:221 in togglePriority -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:225 in tagOptions=$derived -> src/lib/features/tasks/task-query.logic.ts:tagMenuOptions call
call src/lib/features/tasks/TasksView.svelte:234 in toggleTag -> src/lib/features/tasks/task-query.logic.ts:toggleQuickTag call
call src/lib/features/tasks/TasksView.svelte:234 in toggleTag -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:239 in handleSearchInput -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/features/tasks/TasksView.svelte:245 in foldedCount=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/TasksView.svelte:248 in savedQuick=$derived -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/TasksView.svelte:252 in quickAtSaved=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault call
call src/lib/features/tasks/TasksView.svelte:252 in quickAtSaved=$derived -> src/lib/features/tasks/task-query.logic.ts:isQuickModified call
call src/lib/features/tasks/TasksView.svelte:256 in runEmptyAction -> src/lib/features/tasks/TasksView.svelte:openSources call +1
call src/lib/features/tasks/TasksView.svelte:258 in runEmptyAction -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall +1
call src/lib/features/tasks/TasksView.svelte:263 in handleFileClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/tasks/TasksView.svelte:267 in handleToggle -> src/lib/features/tasks/tasks.service.ts:toggleTask call
call src/lib/features/tasks/TasksView.svelte:274 in handleTextClick -> src/lib/core/editor/open-note-at.service.ts:openNoteAt call
call src/lib/features/tasks/TasksView.svelte:282 in $effect@279 -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex call
call src/lib/features/tasks/TasksView.svelte:293 in $effect@290 -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setScrollOffset mcall
call src/lib/features/tasks/TasksView.svelte:315 in rowsByKey=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:320 in currentKey=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:332 in shownGroups=$derived -> src/lib/features/tasks/task-query.logic.ts:collapseKey call
call src/lib/features/tasks/TasksView.svelte:339 in rendered=$derived -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:341 in tabStopKey=$derived -> src/lib/utils/roving-list.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:356 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideNote call
call src/lib/features/tasks/TasksView.svelte:356 in groupActions -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setExclude mcall +2
call src/lib/features/tasks/TasksView.svelte:362 in groupActions -> src/lib/features/tasks/task-query.logic.ts:onlyThisType call
call src/lib/features/tasks/TasksView.svelte:362 in groupActions -> src/lib/features/tasks/tasks.service.ts:setTaskSources call +1
call src/lib/features/tasks/TasksView.svelte:363 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideType call
call src/lib/features/tasks/TasksView.svelte:369 in groupActions -> src/lib/features/tasks/task-query.logic.ts:onlyThisFolder call
call src/lib/features/tasks/TasksView.svelte:370 in groupActions -> src/lib/features/tasks/task-query.logic.ts:hideFolder call
call src/lib/features/tasks/TasksView.svelte:379 in revealGroup -> src/lib/features/tasks/TasksView.svelte:rowElement call
call src/lib/features/tasks/TasksView.svelte:379 in revealGroup -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/TasksView.svelte:423 in handleListKeydown -> src/lib/features/tasks/tasks-keys.logic.ts:resolveTaskKey call
call src/lib/features/tasks/TasksView.svelte:442 in handleListKeydown -> src/lib/features/tasks/TasksView.svelte:handleToggle call
call src/lib/features/tasks/TasksView.svelte:443 in handleListKeydown -> src/lib/core/editor/open-note-at.service.ts:openNoteAt call
call src/lib/features/tasks/TasksView.svelte:452 in handleListFocusin -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall
call src/lib/features/tasks/TasksView.svelte:487 in $effect@477 -> src/lib/utils/roving-list.ts:nextCurrentRow call +1
call src/lib/features/tasks/TasksView.svelte:493 in $effect@477 -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall +1
call src/lib/features/tasks/TasksView.svelte:494 in $effect@477 -> src/lib/features/tasks/TasksView.svelte:focusIsFree call +1
call src/lib/features/tasks/TasksView.svelte:494 in $effect@477 -> src/lib/features/tasks/TasksView.svelte:rowElement call +2
call src/lib/features/tasks/TasksView.svelte:506 in $effect@477 -> src/lib/utils/roving-list.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:520 in $effect@516 -> src/lib/features/tasks/TasksView.svelte:focusIsFree call
call src/lib/features/tasks/TasksView.svelte:521 in $effect@516 -> src/lib/features/tasks/TasksView.svelte:rowElement call
call src/lib/features/tasks/TasksView.svelte:531 in handleRowMenuOpen -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setCurrentRow mcall
call src/lib/features/tasks/TasksView.svelte:536 in handleRowContextMenu -> src/lib/features/tasks/TasksView.svelte:handleRowMenuOpen call
call src/lib/features/tasks/TasksView.svelte:566 in handleRowMenuCloseFocus -> src/lib/features/tasks/TasksView.svelte:rowElement call +1
call src/lib/features/tasks/TasksView.svelte:566 in handleRowMenuCloseFocus -> src/lib/utils/roving-list.ts:tabStopRow call
call src/lib/features/tasks/TasksView.svelte:571 in pickRowStatus -> src/lib/features/tasks/tasks.service.ts:setTaskStatusFromMenu call
call src/lib/features/tasks/TasksView.svelte:584 in setRowDue -> src/lib/features/tasks/tasks.service.ts:updateTaskFromMenu call
call src/lib/features/tasks/TasksView.svelte:584 in setRowDue -> src/lib/utils/task-tokens.ts:setDueToken call
call src/lib/features/tasks/TasksView.svelte:591 in pickRowPriority -> src/lib/features/tasks/task-row-edit.logic.ts:prioritySignifier call
call src/lib/features/tasks/TasksView.svelte:591 in pickRowPriority -> src/lib/utils/task-tokens.ts:setPriorityToken call
call src/lib/features/tasks/TasksView.svelte:592 in pickRowPriority -> src/lib/features/tasks/task-row-edit.logic.ts:priorityMenuLabel call
call src/lib/features/tasks/TasksView.svelte:592 in pickRowPriority -> src/lib/features/tasks/tasks.service.ts:updateTaskFromMenu call
call src/lib/features/tasks/TasksView.svelte:610 in saveDueDialog -> src/lib/features/tasks/TasksView.svelte:setRowDue call
call src/lib/features/tasks/TasksView.svelte:616 in copyTaskText -> src/lib/features/tasks/tasks.logic.ts:stripTaskTrailers call
call src/lib/features/tasks/TasksView.svelte:626 in modifiedTitle -> src/lib/utils/date.ts:formatDate call
call src/lib/features/tasks/TasksView.svelte:640 in (markup) -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex markup
call src/lib/features/tasks/TasksView.svelte:649 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickShow markup
call src/lib/features/tasks/TasksView.svelte:659 in (markup) -> src/lib/features/tasks/TasksView.svelte:toggleStatus markup
call src/lib/features/tasks/TasksView.svelte:661 in (markup) -> src/lib/features/tasks/task-status.logic.ts:statusGlyph markup +1
call src/lib/features/tasks/TasksView.svelte:667 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickDue markup
call src/lib/features/tasks/TasksView.svelte:683 in (markup) -> src/lib/features/tasks/TasksView.svelte:togglePriority markup
call src/lib/features/tasks/TasksView.svelte:685 in (markup) -> src/lib/features/tasks/task-query.logic.ts:priorityWord markup
call src/lib/features/tasks/TasksView.svelte:695 in (markup) -> src/lib/features/tasks/TasksView.svelte:toggleTag markup
call src/lib/features/tasks/TasksView.svelte:706 in (markup) -> src/lib/core/editor/open-note-at.service.ts:openNoteAt markup
call src/lib/features/tasks/TasksView.svelte:709 in (markup) -> src/lib/features/tasks/TasksView.svelte:copyTaskText markup
call src/lib/features/tasks/TasksView.svelte:712 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickRowStatus markup
call src/lib/features/tasks/TasksView.svelte:714 in (markup) -> src/lib/features/tasks/task-status.logic.ts:statusMenuLabel markup
call src/lib/features/tasks/TasksView.svelte:722 in (markup) -> src/lib/features/tasks/TasksView.svelte:setRowDue markup +1
call src/lib/features/tasks/TasksView.svelte:722 in (markup) -> src/lib/features/tasks/task-row-edit.logic.ts:resolveDuePreset markup
call src/lib/features/tasks/TasksView.svelte:724 in (markup) -> src/lib/features/tasks/TasksView.svelte:openDueDialog markup
call src/lib/features/tasks/TasksView.svelte:734 in (markup) -> src/lib/features/tasks/TasksView.svelte:pickRowPriority markup
call src/lib/features/tasks/TasksView.svelte:736 in (markup) -> src/lib/features/tasks/task-row-edit.logic.ts:priorityMenuLabel markup
call src/lib/features/tasks/TasksView.svelte:751 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.toggleGroupCollapsed markup
call src/lib/features/tasks/TasksView.svelte:759 in (markup) -> src/lib/features/tasks/TasksView.svelte:groupActions markup
call src/lib/features/tasks/TasksView.svelte:783 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/tasks/TasksView.svelte:791 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/features/tasks/TasksView.svelte:799 in (markup) -> src/lib/features/tasks/TasksView.svelte:modifiedTitle markup
call src/lib/features/tasks/TasksView.svelte:800 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleFileClick markup
call src/lib/features/tasks/TasksView.svelte:828 in (markup) -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText markup +1
call src/lib/features/tasks/TasksView.svelte:829 in (markup) -> src/lib/features/tasks/tasks.logic.ts:taskChips markup
call src/lib/features/tasks/TasksView.svelte:829 in (markup) -> src/lib/features/tasks/tasks.logic.ts:usesRawTaskText markup
call src/lib/features/tasks/TasksView.svelte:830 in (markup) -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey markup +3
call src/lib/features/tasks/TasksView.svelte:844 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowContextMenu markup
call src/lib/features/tasks/TasksView.svelte:856 in (markup) -> src/lib/features/tasks/task-status.logic.ts:toggleTarget markup
call src/lib/features/tasks/TasksView.svelte:858 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleToggle markup
call src/lib/features/tasks/TasksView.svelte:867 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleTextClick markup
call src/lib/features/tasks/TasksView.svelte:873 in (markup) -> src/lib/features/tasks/tasks.logic.ts:parseTaskTextSegments markup
call src/lib/features/tasks/TasksView.svelte:914 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowMenuOpen markup
call src/lib/features/tasks/TasksView.svelte:929 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleRowMenuCloseFocus markup +2
call src/lib/features/tasks/TasksView.svelte:952 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleSearchInput markup
call src/lib/features/tasks/TasksView.svelte:974 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setGroupBy markup +2
call src/lib/features/tasks/TasksView.svelte:1037 in (markup) -> src/lib/features/tasks/task-query.logic.ts:statusFilterLabel markup
call src/lib/features/tasks/TasksView.svelte:1101 in (markup) -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.resetQuick markup
call src/lib/features/tasks/TasksView.svelte:1133 in (markup) -> src/lib/features/tasks/tasks.service.ts:setTaskSources markup
call src/lib/features/tasks/TasksView.svelte:1154 in (markup) -> src/lib/features/tasks/TasksView.svelte:runEmptyAction markup
call src/lib/features/tasks/TasksView.svelte:1172 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListKeydown markup
call src/lib/features/tasks/TasksView.svelte:1173 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListFocusin markup
call src/lib/features/tasks/TasksView.svelte:1174 in (markup) -> src/lib/features/tasks/TasksView.svelte:handleListContextMenu markup
call src/lib/features/tasks/TasksView.svelte:1191 in (markup) -> src/lib/features/tasks/TasksView.svelte:revealGroup markup
call src/lib/features/tasks/TasksView.svelte:1238 in (markup) -> src/lib/features/tasks/TasksView.svelte:saveDueDialog markup
## effects
fx src/lib/features/tasks/TasksView.svelte:279 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:290 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:294 dom.scroll viewport in $effect@290
fx src/lib/features/tasks/TasksView.svelte:301 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:405 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:415 dom.keydown document in $effect@405
fx src/lib/features/tasks/TasksView.svelte:477 svelte.$effect in (script)
fx src/lib/features/tasks/TasksView.svelte:516 svelte.$effect in (script)
