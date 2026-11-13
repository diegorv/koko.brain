# file card src/lib/features/tasks/SourcesPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/SourcesPanel.svelte ' codemap/files
file src/lib/features/tasks/SourcesPanel.svelte component L496 module src/lib/features/tasks in1 t0
## imports
imp src/lib/features/tasks/SourcesPanel.svelte:6 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/tasks/SourcesPanel.svelte:7 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/tasks/SourcesPanel.svelte:8 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/tasks/SourcesPanel.svelte:9 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/tasks/SourcesPanel.svelte:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/SourcesPanel.svelte:11 -> src/lib/features/tasks/tasks.service.ts setTaskExcludes,setTaskSources
imp src/lib/features/tasks/SourcesPanel.svelte:12 -> src/lib/features/tasks/task-headings.logic.ts type:HeadingMatchMode
imp src/lib/features/tasks/SourcesPanel.svelte:13 -> src/lib/features/tasks/task-query.logic.ts sourceSuggestions,type:LifecycleState,type:PropertyOp,type:TaskExcludes,type:TaskSource,type:TaskSourceClause
## imported-by
imp src/lib/features/tasks/TasksView.svelte:34 -> src/lib/features/tasks/SourcesPanel.svelte default
## reach
in2 src/lib/features/tasks/SourcesPanel.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tasks/SourcesPanel.svelte 40 files in 10 modules: src/lib/components(20) src/lib/features/tasks(6) src/lib/utils(4) src/lib/core/editor(3) src/lib/core/vault(2) +5 modules
## symbols
sym src/lib/features/tasks/SourcesPanel.svelte:1 component SourcesPanel props:id L496
by src/lib/features/tasks/SourcesPanel.svelte:default <- src/lib/features/tasks/TasksView.svelte:1103 in (markup) mount
## locals
local src/lib/features/tasks/SourcesPanel.svelte:91 fn emptyClause(kind: ClauseKind): TaskSourceClause L16
local src/lib/features/tasks/SourcesPanel.svelte:109 fn clauseValue(clause: TaskSourceClause): string L16
local src/lib/features/tasks/SourcesPanel.svelte:127 fn valueSuggestions(clause: TaskSourceClause): string[] L16
local src/lib/features/tasks/SourcesPanel.svelte:145 fn withValue(clause: TaskSourceClause, value: string): TaskSourceClause L16
local src/lib/features/tasks/SourcesPanel.svelte:163 fn updateCard(ci: number, change: (card: TaskSource) => TaskSource) L3
local src/lib/features/tasks/SourcesPanel.svelte:168 fn updateClause(ci: number, li: number, change: (clause: TaskSourceClause) => TaskSourceClause) L3
local src/lib/features/tasks/SourcesPanel.svelte:173 fn setMatch(ci: number, li: number, match: HeadingMatchMode) L3
local src/lib/features/tasks/SourcesPanel.svelte:178 fn setNegate(ci: number, li: number, negate: boolean) L3
local src/lib/features/tasks/SourcesPanel.svelte:183 fn setState(ci: number, li: number, state: LifecycleState) L3
local src/lib/features/tasks/SourcesPanel.svelte:188 fn setProperty(ci: number, li: number, change: { key: string } | { op: PropertyOp }) L3
local src/lib/features/tasks/SourcesPanel.svelte:197 fn refocus(pick: (panel: HTMLElement) => (Element | null | undefined)[]) L5
local src/lib/features/tasks/SourcesPanel.svelte:203 fn addCard() L3
local src/lib/features/tasks/SourcesPanel.svelte:207 fn removeCard(ci: number) L8
local src/lib/features/tasks/SourcesPanel.svelte:216 fn addClause(ci: number, kind: ClauseKind) L3
local src/lib/features/tasks/SourcesPanel.svelte:220 fn removeClause(ci: number, li: number) L9
local src/lib/features/tasks/SourcesPanel.svelte:231 fn setExclude(scope: ExcludeScope, partial: Partial<TaskExcludes>) L5
local src/lib/features/tasks/SourcesPanel.svelte:238 fn addEntry(scope: ExcludeScope, key: ListKey) L6
local src/lib/features/tasks/SourcesPanel.svelte:245 fn removeEntry(scope: ExcludeScope, key: ListKey, value: string) L10
## mounts
mount src/lib/features/tasks/SourcesPanel.svelte:261 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:287 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:302 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:315 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:324 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:356 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:368 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:383 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:397 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:412 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:423 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:432 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:444 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:452 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:470 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:482 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tasks/SourcesPanel.svelte:488 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/tasks/TasksView.svelte:1103 SourcesPanel -> src/lib/features/tasks/SourcesPanel.svelte
## calls
call src/lib/features/tasks/SourcesPanel.svelte:82 in suggestions=$derived -> src/lib/features/tasks/task-query.logic.ts:sourceSuggestions call
call src/lib/features/tasks/SourcesPanel.svelte:164 in updateCard -> src/lib/features/tasks/tasks.service.ts:setTaskSources call
call src/lib/features/tasks/SourcesPanel.svelte:169 in updateClause -> src/lib/features/tasks/SourcesPanel.svelte:updateCard call
call src/lib/features/tasks/SourcesPanel.svelte:174 in setMatch -> src/lib/features/tasks/SourcesPanel.svelte:updateClause call
call src/lib/features/tasks/SourcesPanel.svelte:179 in setNegate -> src/lib/features/tasks/SourcesPanel.svelte:updateClause call
call src/lib/features/tasks/SourcesPanel.svelte:184 in setState -> src/lib/features/tasks/SourcesPanel.svelte:updateClause call
call src/lib/features/tasks/SourcesPanel.svelte:189 in setProperty -> src/lib/features/tasks/SourcesPanel.svelte:updateClause call
call src/lib/features/tasks/SourcesPanel.svelte:204 in addCard -> src/lib/features/tasks/tasks.service.ts:setTaskSources call
call src/lib/features/tasks/SourcesPanel.svelte:208 in removeCard -> src/lib/features/tasks/tasks.service.ts:setTaskSources call
call src/lib/features/tasks/SourcesPanel.svelte:210 in removeCard -> src/lib/features/tasks/SourcesPanel.svelte:refocus call
call src/lib/features/tasks/SourcesPanel.svelte:217 in addClause -> src/lib/features/tasks/SourcesPanel.svelte:emptyClause call
call src/lib/features/tasks/SourcesPanel.svelte:217 in addClause -> src/lib/features/tasks/SourcesPanel.svelte:updateCard call
call src/lib/features/tasks/SourcesPanel.svelte:221 in removeClause -> src/lib/features/tasks/SourcesPanel.svelte:updateCard call
call src/lib/features/tasks/SourcesPanel.svelte:223 in removeClause -> src/lib/features/tasks/SourcesPanel.svelte:refocus call
call src/lib/features/tasks/SourcesPanel.svelte:233 in setExclude -> src/lib/features/tasks/tasks.service.ts:setTaskExcludes call
call src/lib/features/tasks/SourcesPanel.svelte:234 in setExclude -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setExclude mcall
call src/lib/features/tasks/SourcesPanel.svelte:242 in addEntry -> src/lib/features/tasks/SourcesPanel.svelte:setExclude call
call src/lib/features/tasks/SourcesPanel.svelte:247 in removeEntry -> src/lib/features/tasks/SourcesPanel.svelte:setExclude call
call src/lib/features/tasks/SourcesPanel.svelte:249 in removeEntry -> src/lib/features/tasks/SourcesPanel.svelte:refocus call
call src/lib/features/tasks/SourcesPanel.svelte:290 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:setExclude markup
call src/lib/features/tasks/SourcesPanel.svelte:311 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:addEntry markup +1
call src/lib/features/tasks/SourcesPanel.svelte:330 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:removeEntry markup
call src/lib/features/tasks/SourcesPanel.svelte:362 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:setProperty markup +2
call src/lib/features/tasks/SourcesPanel.svelte:387 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:clauseValue markup +1
call src/lib/features/tasks/SourcesPanel.svelte:389 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:updateClause markup +3
call src/lib/features/tasks/SourcesPanel.svelte:389 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:withValue markup +3
call src/lib/features/tasks/SourcesPanel.svelte:391 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:valueSuggestions markup +1
call src/lib/features/tasks/SourcesPanel.svelte:404 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:setState markup
call src/lib/features/tasks/SourcesPanel.svelte:428 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:setMatch markup +1
call src/lib/features/tasks/SourcesPanel.svelte:447 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:setNegate markup
call src/lib/features/tasks/SourcesPanel.svelte:458 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:removeClause markup
call src/lib/features/tasks/SourcesPanel.svelte:478 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:addClause markup
call src/lib/features/tasks/SourcesPanel.svelte:482 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:removeCard markup
call src/lib/features/tasks/SourcesPanel.svelte:488 in (markup) -> src/lib/features/tasks/SourcesPanel.svelte:addCard markup
