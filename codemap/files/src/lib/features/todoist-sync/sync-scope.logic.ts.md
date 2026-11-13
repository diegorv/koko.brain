# file card src/lib/features/todoist-sync/sync-scope.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sync-scope.logic.ts ' codemap/files
file src/lib/features/todoist-sync/sync-scope.logic.ts logic L166 module src/lib/features/todoist-sync in7 t1 | What a vault syncs: the root project's tree plus, optionally, the Inbox (design rule 8c), and the fixed messages for Todoist failures (rule 13).
## imported-by
imp src/lib/features/todoist-sync/TodoistSection.svelte:12 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,syncErrorMessage,type:RootProjectChoice
imp src/lib/features/todoist-sync/detach.logic.ts:12 -> src/lib/features/todoist-sync/sync-scope.logic.ts type:ScopeProject
imp src/lib/features/todoist-sync/projects.logic.ts:18 -> src/lib/features/todoist-sync/sync-scope.logic.ts type:ScopeProject
imp src/lib/features/todoist-sync/pull.logic.ts:13 -> src/lib/features/todoist-sync/sync-scope.logic.ts treeProjectIds,type:ScopeProject
imp src/lib/features/todoist-sync/sync-now.service.ts:88 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,syncErrorMessage,treeProjectIds,type:ScopeProject,type:TodoistFailure
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:20 -> src/lib/features/todoist-sync/sync-scope.logic.ts syncErrorMessage
imp src/lib/features/todoist-sync/todoist-sync.service.ts:5 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,countSyncScope,formatCheckResult,rootProjectChoices,syncErrorMessage,type:RootProjectChoice
## reach
in2 src/lib/features/todoist-sync/sync-scope.logic.ts 11 files in 2 modules: src/lib/features/todoist-sync(8) src/lib/app(3)
out2 src/lib/features/todoist-sync/sync-scope.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/todoist-sync/sync-scope.logic.test.ts imports src/lib/features/todoist-sync/sync-scope.logic.ts mirror
test src/tests/lib/features/todoist-sync/detach.logic.test.ts imports-type src/lib/features/todoist-sync/sync-scope.logic.ts
test src/tests/lib/features/todoist-sync/projects.logic.test.ts imports-type src/lib/features/todoist-sync/sync-scope.logic.ts
test src/tests/lib/features/todoist-sync/pull.logic.test.ts imports-type src/lib/features/todoist-sync/sync-scope.logic.ts
## symbols
sym src/lib/features/todoist-sync/sync-scope.logic.ts:9 interface ScopeProject L11 | The project fields the scope reads (SDK `PersonalProject` / `WorkspaceProject`).
by src/lib/features/todoist-sync/sync-scope.logic.ts:ScopeProject <- src/lib/features/todoist-sync/detach.logic.ts:12 in (module) import
by src/lib/features/todoist-sync/sync-scope.logic.ts:ScopeProject <- src/lib/features/todoist-sync/projects.logic.ts:18 in (module) import
by src/lib/features/todoist-sync/sync-scope.logic.ts:ScopeProject <- src/lib/features/todoist-sync/pull.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/sync-scope.logic.ts:ScopeProject <- src/lib/features/todoist-sync/sync-now.service.ts:88 in (module) import
sym src/lib/features/todoist-sync/sync-scope.logic.ts:22 interface ScopeItem L5 | The item fields the scope reads (SDK `Task`).
sym src/lib/features/todoist-sync/sync-scope.logic.ts:29 interface SyncScopeCounts L8 | Counts of what a vault's sync covers.
sym src/lib/features/todoist-sync/sync-scope.logic.ts:39 interface RootProjectChoice L5 | One entry of the root project picker.
by src/lib/features/todoist-sync/sync-scope.logic.ts:RootProjectChoice <- src/lib/features/todoist-sync/TodoistSection.svelte:12 in (script) import
by src/lib/features/todoist-sync/sync-scope.logic.ts:RootProjectChoice <- src/lib/features/todoist-sync/todoist-sync.service.ts:11 in (module) import
sym src/lib/features/todoist-sync/sync-scope.logic.ts:46 type TodoistFailure L4 | A Todoist failure reduced to what the user can act on.
by src/lib/features/todoist-sync/sync-scope.logic.ts:TodoistFailure <- src/lib/features/todoist-sync/sync-now.service.ts:88 in (module) import
sym src/lib/features/todoist-sync/sync-scope.logic.ts:71 fn treeProjectIds(projects: ScopeProject[], rootId: string, includeInbox: boolean): Set<string> | null L18 | Ids of the live root project and every live project nested under it, plus the Inbox when `includeInbox`.
by src/lib/features/todoist-sync/sync-scope.logic.ts:treeProjectIds <- src/lib/features/todoist-sync/pull.logic.ts:439 in planPull call
by src/lib/features/todoist-sync/sync-scope.logic.ts:treeProjectIds <- src/lib/features/todoist-sync/sync-now.service.ts:313 in cycle call +1
sym src/lib/features/todoist-sync/sync-scope.logic.ts:91 fn countSyncScope(projects: ScopeProject[], items: ScopeItem[], rootId: string, includeInbox: boolean): SyncScopeCounts | null L12 | Counts the projects and open tasks a vault syncs; null when the root is not found.
by src/lib/features/todoist-sync/sync-scope.logic.ts:countSyncScope <- src/lib/features/todoist-sync/todoist-sync.service.ts:56 in checkSyncConnection call
sym src/lib/features/todoist-sync/sync-scope.logic.ts:110 fn rootProjectChoices(projects: ScopeProject[]): RootProjectChoice[] L18 | Live projects other than the Inbox, in tree order (parents before their children, siblings by `childOrder`), labelled with their path.
by src/lib/features/todoist-sync/sync-scope.logic.ts:rootProjectChoices <- src/lib/features/todoist-sync/todoist-sync.service.ts:27 in fetchRootProjectChoices call
sym src/lib/features/todoist-sync/sync-scope.logic.ts:134 fn classifyTodoistError(err: unknown): TodoistFailure L10 | Reduces a thrown value to a failure kind: HTTP 401/403 is an invalid token, 429 a rate limit (with `responseData.error_extra.retry_after` seconds when it is a …
by src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError <- src/lib/features/todoist-sync/TodoistSection.svelte:63 in loadProjects call
by src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError <- src/lib/features/todoist-sync/sync-now.service.ts:282 in request call +1
by src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError <- src/lib/features/todoist-sync/todoist-sync.service.ts:51 in checkSyncConnection call
sym src/lib/features/todoist-sync/sync-scope.logic.ts:146 fn syncErrorMessage(failure: TodoistFailure): string L11 | The fixed user-facing message of a failure kind.
by src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage <- src/lib/features/todoist-sync/TodoistSection.svelte:63 in loadProjects call
by src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage <- src/lib/features/todoist-sync/sync-now.service.ts:283 in request call +1
by src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:162 in rateLimitRefusal call
by src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage <- src/lib/features/todoist-sync/todoist-sync.service.ts:51 in checkSyncConnection call
sym src/lib/features/todoist-sync/sync-scope.logic.ts:159 fn formatCheckResult(counts: SyncScopeCounts): string L4 | The success message of the connection check.
by src/lib/features/todoist-sync/sync-scope.logic.ts:formatCheckResult <- src/lib/features/todoist-sync/todoist-sync.service.ts:64 in checkSyncConnection call
## locals
local src/lib/features/todoist-sync/sync-scope.logic.ts:51 fn isLive(p: ScopeProject) L1
local src/lib/features/todoist-sync/sync-scope.logic.ts:54 fn childrenByParent(projects: ScopeProject[]): Map<string, ScopeProject[]> L11
local src/lib/features/todoist-sync/sync-scope.logic.ts:164 fn plural(n: number, noun: string): string L3
## calls
call src/lib/features/todoist-sync/sync-scope.logic.ts:57 in childrenByParent -> src/lib/features/todoist-sync/sync-scope.logic.ts:isLive call
call src/lib/features/todoist-sync/sync-scope.logic.ts:73 in treeProjectIds -> src/lib/features/todoist-sync/sync-scope.logic.ts:isLive call +1
call src/lib/features/todoist-sync/sync-scope.logic.ts:74 in treeProjectIds -> src/lib/features/todoist-sync/sync-scope.logic.ts:childrenByParent call
call src/lib/features/todoist-sync/sync-scope.logic.ts:97 in countSyncScope -> src/lib/features/todoist-sync/sync-scope.logic.ts:treeProjectIds call
call src/lib/features/todoist-sync/sync-scope.logic.ts:100 in countSyncScope -> src/lib/features/todoist-sync/sync-scope.logic.ts:isLive call
call src/lib/features/todoist-sync/sync-scope.logic.ts:112 in rootProjectChoices -> src/lib/features/todoist-sync/sync-scope.logic.ts:childrenByParent call
call src/lib/features/todoist-sync/sync-scope.logic.ts:114 in rootProjectChoices -> src/lib/features/todoist-sync/sync-scope.logic.ts:isLive call
call src/lib/features/todoist-sync/sync-scope.logic.ts:152 in syncErrorMessage -> src/lib/features/todoist-sync/sync-scope.logic.ts:plural call
call src/lib/features/todoist-sync/sync-scope.logic.ts:161 in formatCheckResult -> src/lib/features/todoist-sync/sync-scope.logic.ts:plural call +1
