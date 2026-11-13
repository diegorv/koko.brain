# file card src/lib/features/todoist-sync/sync-now.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sync-now.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/todoist-sync/sync-now.service.ts service L1235 module src/lib/features/todoist-sync in1 t1
## imports
imp src/lib/features/todoist-sync/sync-now.service.ts:2 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/todoist-sync/sync-now.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/sync-now.service.ts:4 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLineInsert,type:TaskLineRemove,type:TaskLineReplace,type:TodoistSectionLink,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/sync-now.service.ts:13 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/features/todoist-sync/sync-now.service.ts:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/sync-now.service.ts:15 -> src/lib/core/filesystem/fs.service.ts renameItem
imp src/lib/features/todoist-sync/sync-now.service.ts:16 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter
imp src/lib/features/todoist-sync/sync-now.service.ts:17 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/todoist-sync/sync-now.service.ts:23 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/todoist-sync/sync-now.service.ts:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/todoist-sync/sync-now.service.ts:25 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/todoist-sync/sync-now.service.ts:26 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/todoist-sync/sync-now.service.ts:27 -> src/lib/features/todoist-sync/anchor.logic.ts generateAnchor,idValues
imp src/lib/features/todoist-sync/sync-now.service.ts:28 -> src/lib/features/todoist-sync/closed-note-writer.service.ts createNoteFile
imp src/lib/features/todoist-sync/sync-now.service.ts:29 -> src/lib/features/todoist-sync/cycle-log.logic.ts type:CycleRun,type:CycleTrigger
imp src/lib/features/todoist-sync/sync-now.service.ts:30 -> src/lib/features/todoist-sync/completion.logic.ts applyLineChange,planAck,planCompletion,terminalLink,type:LineChange,type:PlannedCommand
imp src/lib/features/todoist-sync/sync-now.service.ts:38 -> src/lib/features/todoist-sync/create.logic.ts ackedLink,addAnchor,orphanAnchorLog,pairPendingAdds,planCreates,type:CreatePlan,type:PendingAdd,type:PlannedCreate
imp src/lib/features/todoist-sync/sync-now.service.ts:48 -> src/lib/features/todoist-sync/detach.logic.ts belowLineBrake,DETACH_AFTER_MISSES,isDetached,missingLineCount,planDetach
imp src/lib/features/todoist-sync/sync-now.service.ts:49 -> src/lib/features/todoist-sync/fields.logic.ts planFields,type:PlannedUpdate
imp src/lib/features/todoist-sync/sync-now.service.ts:50 -> src/lib/features/todoist-sync/note-writer.service.ts readNoteContent,writeTaskLinesToNote
imp src/lib/features/todoist-sync/sync-now.service.ts:51 -> src/lib/features/todoist-sync/projects.logic.ts heldProjectIds,planProjects,projectStateEntry,readProjectState,type:PendingProject,type:PlannedNoteRename,type:PlannedProjectUpdate,type:ProjectState
imp src/lib/features/todoist-sync/sync-now.service.ts:61 -> src/lib/features/todoist-sync/pull.logic.ts excludedLabelSet,formatPullResult,normalizeSyncFolder,planPull,type:PullCounts,type:PullItem,type:ScannedLine,type:ScannedNote
imp src/lib/features/todoist-sync/sync-now.service.ts:71 -> src/lib/features/todoist-sync/sections.logic.ts noteOutline,outOfScopeAnchors,placeInsert,planMoves,planSections,type:LineNote,type:PlannedHeadingAppend,type:PlannedHeadingRename,type:PlannedLineMove,type:PlannedMove,type:PlannedSectionAdd,type:PullSection,type:SectionNote
imp src/lib/features/todoist-sync/sync-now.service.ts:86 -> src/lib/features/todoist-sync/sync-log.service.ts logCycle
imp src/lib/features/todoist-sync/sync-now.service.ts:87 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts isFirstRunDone
imp src/lib/features/todoist-sync/sync-now.service.ts:88 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,syncErrorMessage,treeProjectIds,type:ScopeProject,type:TodoistFailure
imp src/lib/features/todoist-sync/sync-now.service.ts:89 -> src/lib/features/todoist-sync/task-line.logic.ts taskLineText
imp src/lib/features/todoist-sync/sync-now.service.ts:90 -> src/lib/features/todoist-sync/todoist-client.ts createTodoistClient
imp src/lib/features/todoist-sync/sync-now.service.ts:91 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/features/todoist-sync/sync-now.service.ts:92 -> src/lib/features/todoist-sync/vault-scan.service.ts scanVault
## imported-by
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:21 -> src/lib/features/todoist-sync/sync-now.service.ts syncNow,type:SyncMode,type:SyncNowOutcome
## reach
in2 src/lib/features/todoist-sync/sync-now.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/todoist-sync/sync-now.service.ts 81 files in 10 modules: src/lib/contracts(54) src/lib/core/filesystem(6) src/lib/utils(6) src/lib/core/settings(4) src/lib/core/editor(3) +5 modules
## tests
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts imports src/lib/features/todoist-sync/sync-now.service.ts mirror
## symbols
sym src/lib/features/todoist-sync/sync-now.service.ts:99 type SyncFailure L6 | Why a run that started failed: a Todoist failure, the root project gone from Todoist, a vault switch mid-run, the line brake (`lines-missing`, design rule 9), …
sym src/lib/features/todoist-sync/sync-now.service.ts:115 type SyncNowOutcome L9 | The outcome of "Sync now", with the message to show.
by src/lib/features/todoist-sync/sync-now.service.ts:SyncNowOutcome <- src/lib/features/todoist-sync/sync-scheduler.service.ts:21 in (module) import
sym src/lib/features/todoist-sync/sync-now.service.ts:126 type SyncMode L1 | Who started a cycle: "Sync now" (`manual`) or a scheduler trigger (`auto`).
by src/lib/features/todoist-sync/sync-now.service.ts:SyncMode <- src/lib/features/todoist-sync/sync-scheduler.service.ts:21 in (module) import
sym src/lib/features/todoist-sync/sync-now.service.ts:228 fn syncNow(mode: SyncMode, trigger: CycleTrigger = 'manual'): Promise<SyncNowOutcome> L47 | Runs one "Sync now" cycle.
by src/lib/features/todoist-sync/sync-now.service.ts:syncNow <- src/lib/features/todoist-sync/sync-scheduler.service.ts:202 in runCycle call
## locals
local src/lib/features/todoist-sync/sync-now.service.ts:277 fn request<T>(run: () => Promise<T>): Promise<T> L9
local src/lib/features/todoist-sync/sync-now.service.ts:291 fn tracedClient(client: TodoistApi, trace: CycleTrace): SyncClient L12
local src/lib/features/todoist-sync/sync-now.service.ts:304 fn cycle(vaultRoot: string, folder: string, mode: SyncMode, trace: CycleTrace): Promise<PullCounts & { detached: number; skippe… L323
local src/lib/features/todoist-sync/sync-now.service.ts:636 fn pushCompletions(client: SyncClient, vaultRoot: string, commands: PlannedCommand[], stored: Map<string, TodoistTaskLink>, occurrences: … L50
local src/lib/features/todoist-sync/sync-now.service.ts:695 fn pushFields(client: SyncClient, vaultRoot: string, updates: (PlannedUpdate | PlannedMove)[], type: 'item_update' | 'item_move' = '… L30
local src/lib/features/todoist-sync/sync-now.service.ts:744 fn pushCreates(client: SyncClient, vaultRoot: string, projectAdds: PendingProject[], adds: { link: TodoistTaskLink; command: PendingA… L70
local src/lib/features/todoist-sync/sync-now.service.ts:825 fn pushSections(client: SyncClient, vaultRoot: string, adds: PlannedSectionAdd[], logRefusals: boolean): Promise<number> L26
local src/lib/features/todoist-sync/sync-now.service.ts:859 fn readLineNotes(vaultRoot: string, notes: ScannedNote[], treeIds: ReadonlySet<string>, pendingProjectNotes: ReadonlySet<string>): Prom… L20
local src/lib/features/todoist-sync/sync-now.service.ts:887 fn writeProjectId(vaultRoot: string, relPath: string, id: string, log: TodoistSyncLogInput[]): Promise<boolean> L25
local src/lib/features/todoist-sync/sync-now.service.ts:919 fn pushProjectUpdates(client: SyncClient, vaultRoot: string, updates: PlannedProjectUpdate[], state: ProjectState): Promise<number> L28
local src/lib/features/todoist-sync/sync-now.service.ts:954 fn renameProjectNotes(vaultRoot: string, renames: PlannedNoteRename[], state: ProjectState): Promise<number> L20
local src/lib/features/todoist-sync/sync-now.service.ts:985 fn sendCommands(client: SyncClient, commands: { ref: string; command: SyncCommand }[], known: Record<string, string> = {}): Promise<{ … L35
local src/lib/features/todoist-sync/sync-now.service.ts:1040 fn emptyBatch(): NoteBatch L3
local src/lib/features/todoist-sync/sync-now.service.ts:1055 fn writeBatches(vaultRoot: string, batches: Map<string, NoteBatch>, log: TodoistSyncLogInput[]): Promise<{ links: TodoistTaskLink[]; c… L100
local src/lib/features/todoist-sync/sync-now.service.ts:1156 fn isTerminal(status: unknown): boolean L4
local src/lib/features/todoist-sync/sync-now.service.ts:1162 fn byAnchor(base: TodoistTaskLink[], overrides: TodoistTaskLink[]): Map<string, TodoistTaskLink> L5
local src/lib/features/todoist-sync/sync-now.service.ts:1169 fn confirmOverCap(count: number): Promise<boolean> L8
local src/lib/features/todoist-sync/sync-now.service.ts:1182 fn confirmLineBrake(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>): Promise<boolean> L7
local src/lib/features/todoist-sync/sync-now.service.ts:1191 fn confirmDetaches(count: number): Promise<boolean> L6
local src/lib/features/todoist-sync/sync-now.service.ts:1199 fn createCounts(projects: number, sections: number, tasks: number): string L5
local src/lib/features/todoist-sync/sync-now.service.ts:1206 fn confirmFirstRun(what: string): Promise<boolean> L6
local src/lib/features/todoist-sync/sync-now.service.ts:1214 fn confirmCreates(what: string): Promise<boolean> L8
local src/lib/features/todoist-sync/sync-now.service.ts:1224 fn confirmFieldPushes(count: number): Promise<boolean> L8
local src/lib/features/todoist-sync/sync-now.service.ts:1233 fn assertVault(vaultRoot: string): void L3
## calls
call src/lib/features/todoist-sync/sync-now.service.ts:237 in syncNow -> src/lib/features/todoist-sync/pull.logic.ts:normalizeSyncFolder call
call src/lib/features/todoist-sync/sync-now.service.ts:243 in syncNow -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.start mcall
call src/lib/features/todoist-sync/sync-now.service.ts:247 in syncNow -> src/lib/features/todoist-sync/sync-log.service.ts:logCycle call
call src/lib/features/todoist-sync/sync-now.service.ts:249 in syncNow -> src/lib/features/todoist-sync/sync-now.service.ts:cycle call
call src/lib/features/todoist-sync/sync-now.service.ts:250 in syncNow -> src/lib/utils/debug.ts:debug call
call src/lib/features/todoist-sync/sync-now.service.ts:251 in syncNow -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.succeed mcall
call src/lib/features/todoist-sync/sync-now.service.ts:255 in syncNow -> src/lib/features/todoist-sync/pull.logic.ts:formatPullResult call
call src/lib/features/todoist-sync/sync-now.service.ts:262 in syncNow -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:268 in syncNow -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.fail mcall
call src/lib/features/todoist-sync/sync-now.service.ts:281 in request -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:282 in request -> src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError call
call src/lib/features/todoist-sync/sync-now.service.ts:283 in request -> src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage call
call src/lib/features/todoist-sync/sync-now.service.ts:297 in tracedClient -> src/lib/utils/debug.ts:debug call
call src/lib/features/todoist-sync/sync-now.service.ts:311 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:tracedClient call
call src/lib/features/todoist-sync/sync-now.service.ts:311 in cycle -> src/lib/features/todoist-sync/todoist-client.ts:createTodoistClient call
call src/lib/features/todoist-sync/sync-now.service.ts:312 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:request call +1
call src/lib/features/todoist-sync/sync-now.service.ts:313 in cycle -> src/lib/features/todoist-sync/sync-scope.logic.ts:treeProjectIds call +1
call src/lib/features/todoist-sync/sync-now.service.ts:315 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call +5
call src/lib/features/todoist-sync/sync-now.service.ts:316 in cycle -> src/lib/contracts/ipc.ts:call call +5
call src/lib/features/todoist-sync/sync-now.service.ts:334 in cycle -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:isFirstRunDone call
call src/lib/features/todoist-sync/sync-now.service.ts:337 in cycle -> src/lib/features/todoist-sync/vault-scan.service.ts:scanVault call
call src/lib/features/todoist-sync/sync-now.service.ts:339 in cycle -> src/lib/features/todoist-sync/detach.logic.ts:belowLineBrake call
call src/lib/features/todoist-sync/sync-now.service.ts:339 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmLineBrake call
call src/lib/features/todoist-sync/sync-now.service.ts:342 in cycle -> src/lib/features/todoist-sync/pull.logic.ts:excludedLabelSet call
call src/lib/features/todoist-sync/sync-now.service.ts:344 in cycle -> src/lib/features/todoist-sync/create.logic.ts:pairPendingAdds call
call src/lib/features/todoist-sync/sync-now.service.ts:345 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:byAnchor call +6
call src/lib/features/todoist-sync/sync-now.service.ts:346 in cycle -> src/lib/features/todoist-sync/projects.logic.ts:readProjectState call
call src/lib/features/todoist-sync/sync-now.service.ts:347 in cycle -> src/lib/features/todoist-sync/pull.logic.ts:planPull call
call src/lib/features/todoist-sync/sync-now.service.ts:357 in cycle -> src/lib/features/todoist-sync/projects.logic.ts:heldProjectIds call
call src/lib/features/todoist-sync/sync-now.service.ts:359 in cycle -> src/lib/features/todoist-sync/projects.logic.ts:planProjects call
call src/lib/features/todoist-sync/sync-now.service.ts:377 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:readLineNotes call
call src/lib/features/todoist-sync/sync-now.service.ts:380 in cycle -> src/lib/features/todoist-sync/sections.logic.ts:noteOutline call
call src/lib/features/todoist-sync/sync-now.service.ts:382 in cycle -> src/lib/features/todoist-sync/sections.logic.ts:planSections call
call src/lib/features/todoist-sync/sync-now.service.ts:392 in cycle -> src/lib/features/todoist-sync/detach.logic.ts:planDetach call
call src/lib/features/todoist-sync/sync-now.service.ts:398 in cycle -> src/lib/features/todoist-sync/sections.logic.ts:outOfScopeAnchors call
call src/lib/features/todoist-sync/sync-now.service.ts:407 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmDetaches call
call src/lib/features/todoist-sync/sync-now.service.ts:413 in cycle -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/sync-now.service.ts:414 in cycle -> src/lib/features/todoist-sync/completion.logic.ts:planCompletion call
call src/lib/features/todoist-sync/sync-now.service.ts:429 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmOverCap call
call src/lib/features/todoist-sync/sync-now.service.ts:434 in cycle -> src/lib/features/todoist-sync/fields.logic.ts:planFields call
call src/lib/features/todoist-sync/sync-now.service.ts:442 in cycle -> src/lib/features/todoist-sync/sections.logic.ts:planMoves call
call src/lib/features/todoist-sync/sync-now.service.ts:463 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmFieldPushes call
call src/lib/features/todoist-sync/sync-now.service.ts:471 in cycle -> src/lib/features/todoist-sync/create.logic.ts:planCreates call
call src/lib/features/todoist-sync/sync-now.service.ts:483 in cycle -> src/lib/features/todoist-sync/anchor.logic.ts:generateAnchor call
call src/lib/features/todoist-sync/sync-now.service.ts:495 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:createCounts call
call src/lib/features/todoist-sync/sync-now.service.ts:502 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmCreates call
call src/lib/features/todoist-sync/sync-now.service.ts:502 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:confirmFirstRun call
call src/lib/features/todoist-sync/sync-now.service.ts:521 in cycle -> src/lib/features/todoist-sync/create.logic.ts:orphanAnchorLog call
call src/lib/features/todoist-sync/sync-now.service.ts:526 in cycle -> src/lib/features/todoist-sync/closed-note-writer.service.ts:createNoteFile call
call src/lib/features/todoist-sync/sync-now.service.ts:529 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:emptyBatch call
call src/lib/features/todoist-sync/sync-now.service.ts:534 in cycle -> src/lib/features/todoist-sync/sections.logic.ts:placeInsert call
call src/lib/features/todoist-sync/sync-now.service.ts:546 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:writeBatches call
call src/lib/features/todoist-sync/sync-now.service.ts:570 in cycle -> src/lib/features/todoist-sync/projects.logic.ts:projectStateEntry call +1
call src/lib/features/todoist-sync/sync-now.service.ts:584 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:pushCompletions call
call src/lib/features/todoist-sync/sync-now.service.ts:591 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:pushFields call +1
call src/lib/features/todoist-sync/sync-now.service.ts:596 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:pushCreates call
call src/lib/features/todoist-sync/sync-now.service.ts:598 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:pushSections call
call src/lib/features/todoist-sync/sync-now.service.ts:601 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:pushProjectUpdates call
call src/lib/features/todoist-sync/sync-now.service.ts:602 in cycle -> src/lib/features/todoist-sync/sync-now.service.ts:renameProjectNotes call
call src/lib/features/todoist-sync/sync-now.service.ts:644 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:sendCommands call
call src/lib/features/todoist-sync/sync-now.service.ts:650 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:request call
call src/lib/features/todoist-sync/sync-now.service.ts:661 in pushCompletions -> src/lib/features/todoist-sync/completion.logic.ts:planAck call
call src/lib/features/todoist-sync/sync-now.service.ts:667 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:emptyBatch call
call src/lib/features/todoist-sync/sync-now.service.ts:670 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:isTerminal call
call src/lib/features/todoist-sync/sync-now.service.ts:671 in pushCompletions -> src/lib/features/todoist-sync/completion.logic.ts:terminalLink call
call src/lib/features/todoist-sync/sync-now.service.ts:674 in pushCompletions -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:677 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:writeBatches call
call src/lib/features/todoist-sync/sync-now.service.ts:678 in pushCompletions -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:679 in pushCompletions -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/sync-now.service.ts:701 in pushFields -> src/lib/features/todoist-sync/sync-now.service.ts:sendCommands call
call src/lib/features/todoist-sync/sync-now.service.ts:713 in pushFields -> src/lib/features/todoist-sync/sync-now.service.ts:isTerminal call
call src/lib/features/todoist-sync/sync-now.service.ts:717 in pushFields -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:720 in pushFields -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:721 in pushFields -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/sync-now.service.ts:755 in pushCreates -> src/lib/features/todoist-sync/sync-now.service.ts:sendCommands call
call src/lib/features/todoist-sync/sync-now.service.ts:770 in pushCreates -> src/lib/features/todoist-sync/sync-now.service.ts:writeProjectId call
call src/lib/features/todoist-sync/sync-now.service.ts:774 in pushCreates -> src/lib/features/todoist-sync/sync-now.service.ts:isTerminal call +1
call src/lib/features/todoist-sync/sync-now.service.ts:783 in pushCreates -> src/lib/utils/debug.ts:error call +1
call src/lib/features/todoist-sync/sync-now.service.ts:794 in pushCreates -> src/lib/features/todoist-sync/create.logic.ts:ackedLink call
call src/lib/features/todoist-sync/sync-now.service.ts:806 in pushCreates -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:807 in pushCreates -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/sync-now.service.ts:809 in pushCreates -> src/lib/features/todoist-sync/projects.logic.ts:projectStateEntry call
call src/lib/features/todoist-sync/sync-now.service.ts:826 in pushSections -> src/lib/features/todoist-sync/sync-now.service.ts:sendCommands call
call src/lib/features/todoist-sync/sync-now.service.ts:838 in pushSections -> src/lib/features/todoist-sync/sync-now.service.ts:isTerminal call
call src/lib/features/todoist-sync/sync-now.service.ts:841 in pushSections -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:844 in pushSections -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:846 in pushSections -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/sync-now.service.ts:874 in readLineNotes -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:875 in readLineNotes -> src/lib/features/todoist-sync/note-writer.service.ts:readNoteContent call
call src/lib/features/todoist-sync/sync-now.service.ts:875 in readLineNotes -> src/lib/features/todoist-sync/sections.logic.ts:noteOutline call
call src/lib/features/todoist-sync/sync-now.service.ts:888 in writeProjectId -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call +1
call src/lib/features/todoist-sync/sync-now.service.ts:897 in writeProjectId -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/todoist-sync/sync-now.service.ts:898 in writeProjectId -> src/lib/core/frontmatter/frontmatter-write.service.ts:FrontmatterWriteError new
call src/lib/features/todoist-sync/sync-now.service.ts:899 in writeProjectId -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/todoist-sync/sync-now.service.ts:899 in writeProjectId -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/todoist-sync/sync-now.service.ts:899 in writeProjectId -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/features/todoist-sync/sync-now.service.ts:900 in writeProjectId -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/features/todoist-sync/sync-now.service.ts:903 in writeProjectId -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/todoist-sync/sync-now.service.ts:907 in writeProjectId -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:920 in pushProjectUpdates -> src/lib/features/todoist-sync/sync-now.service.ts:sendCommands call
call src/lib/features/todoist-sync/sync-now.service.ts:932 in pushProjectUpdates -> src/lib/features/todoist-sync/sync-now.service.ts:isTerminal call
call src/lib/features/todoist-sync/sync-now.service.ts:940 in pushProjectUpdates -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:943 in pushProjectUpdates -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call
call src/lib/features/todoist-sync/sync-now.service.ts:944 in pushProjectUpdates -> src/lib/contracts/ipc.ts:call call
call src/lib/features/todoist-sync/sync-now.service.ts:958 in renameProjectNotes -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call +2
call src/lib/features/todoist-sync/sync-now.service.ts:960 in renameProjectNotes -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/todoist-sync/sync-now.service.ts:963 in renameProjectNotes -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:971 in renameProjectNotes -> src/lib/contracts/ipc.ts:call call
call src/lib/features/todoist-sync/sync-now.service.ts:999 in sendCommands -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/todoist-sync/sync-now.service.ts:1007 in sendCommands -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/sync-now.service.ts:1008 in sendCommands -> src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError call
call src/lib/features/todoist-sync/sync-now.service.ts:1009 in sendCommands -> src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage call
call src/lib/features/todoist-sync/sync-now.service.ts:1082 in writeBatches -> src/lib/features/todoist-sync/sync-now.service.ts:assertVault call +2
call src/lib/features/todoist-sync/sync-now.service.ts:1087 in writeBatches -> src/lib/features/todoist-sync/note-writer.service.ts:readNoteContent call
call src/lib/features/todoist-sync/sync-now.service.ts:1090 in writeBatches -> src/lib/features/todoist-sync/create.logic.ts:addAnchor call
call src/lib/features/todoist-sync/sync-now.service.ts:1090 in writeBatches -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineText call
call src/lib/features/todoist-sync/sync-now.service.ts:1099 in writeBatches -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/sync-now.service.ts:1100 in writeBatches -> src/lib/features/todoist-sync/completion.logic.ts:applyLineChange call
call src/lib/features/todoist-sync/sync-now.service.ts:1123 in writeBatches -> src/lib/features/todoist-sync/note-writer.service.ts:writeTaskLinesToNote call +1
call src/lib/features/todoist-sync/sync-now.service.ts:1183 in confirmLineBrake -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/sync-now.service.ts:1185 in confirmLineBrake -> src/lib/features/todoist-sync/detach.logic.ts:missingLineCount call
## effects
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:316 in cycle -> ipc:todoist_read_kv -> src-tauri/src/commands/todoist.rs:28
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:335 in cycle -> ipc:todoist_read_links -> src-tauri/src/commands/todoist.rs:34
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:336 in cycle -> ipc:todoist_read_sections -> src-tauri/src/commands/todoist.rs:40
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:573 in cycle -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:578 in cycle -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:605 in cycle -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:679 in pushCompletions -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:683 in pushCompletions -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:721 in pushFields -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:722 in pushFields -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:807 in pushCreates -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:811 in pushCreates -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:846 in pushSections -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:848 in pushSections -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:944 in pushProjectUpdates -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:971 in renameProjectNotes -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
fx src/lib/features/todoist-sync/sync-now.service.ts:1170 tauri-dialog.ask in confirmOverCap
fx src/lib/features/todoist-sync/sync-now.service.ts:1184 tauri-dialog.ask in confirmLineBrake
fx src/lib/features/todoist-sync/sync-now.service.ts:1192 tauri-dialog.ask in confirmDetaches
fx src/lib/features/todoist-sync/sync-now.service.ts:1207 tauri-dialog.ask in confirmFirstRun
fx src/lib/features/todoist-sync/sync-now.service.ts:1215 tauri-dialog.ask in confirmCreates
fx src/lib/features/todoist-sync/sync-now.service.ts:1225 tauri-dialog.ask in confirmFieldPushes
