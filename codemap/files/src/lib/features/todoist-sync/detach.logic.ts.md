# file card src/lib/features/todoist-sync/detach.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/detach.logic.ts ' codemap/files
file src/lib/features/todoist-sync/detach.logic.ts logic L125 module src/lib/features/todoist-sync in4 t1 | Deletion sync, as pure planning: a task deleted on either side is detached, never deleted on the other (design: Deletion, rules 8c and 9 of `.scratch/todoist-b…
## imports
imp src/lib/features/todoist-sync/detach.logic.ts:10 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/detach.logic.ts:11 -> src/lib/features/todoist-sync/pull.logic.ts type:PullItem,type:ScannedLine
imp src/lib/features/todoist-sync/detach.logic.ts:12 -> src/lib/features/todoist-sync/sync-scope.logic.ts type:ScopeProject
## imported-by
imp src/lib/features/todoist-sync/create.logic.ts:11 -> src/lib/features/todoist-sync/detach.logic.ts isDetached
imp src/lib/features/todoist-sync/projects.logic.ts:16 -> src/lib/features/todoist-sync/detach.logic.ts isLiveOutsideTree
imp src/lib/features/todoist-sync/sections.logic.ts:12 -> src/lib/features/todoist-sync/detach.logic.ts isDetached
imp src/lib/features/todoist-sync/sync-now.service.ts:48 -> src/lib/features/todoist-sync/detach.logic.ts belowLineBrake,DETACH_AFTER_MISSES,isDetached,missingLineCount,planDetach
## reach
in2 src/lib/features/todoist-sync/detach.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/detach.logic.ts 57 files in 3 modules: src/lib/contracts(52) src/lib/features/todoist-sync(4) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/detach.logic.test.ts imports src/lib/features/todoist-sync/detach.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/detach.logic.ts:15 const DETACH_AFTER_MISSES L1 | Consecutive scans without the line before its link detaches; also the `miss_count` of a detached link.
by src/lib/features/todoist-sync/detach.logic.ts:DETACH_AFTER_MISSES <- src/lib/features/todoist-sync/sync-now.service.ts:796 in pushCreates ref +1
sym src/lib/features/todoist-sync/detach.logic.ts:18 fn isDetached(link: TodoistTaskLink): boolean L3 | Whether a link is detached: it no longer syncs either way.
by src/lib/features/todoist-sync/detach.logic.ts:isDetached <- src/lib/features/todoist-sync/create.logic.ts:136 in pendingAddOf call
by src/lib/features/todoist-sync/detach.logic.ts:isDetached <- src/lib/features/todoist-sync/sections.logic.ts:271 in outOfScopeAnchors call +1
by src/lib/features/todoist-sync/detach.logic.ts:isDetached <- src/lib/features/todoist-sync/sync-now.service.ts:413 in cycle call +1
sym src/lib/features/todoist-sync/detach.logic.ts:23 interface DetachInput L14 | Everything planDetach reads.
sym src/lib/features/todoist-sync/detach.logic.ts:44 fn isLiveOutsideTree(projectId: string, projects: ScopeProject[], treeIds: ReadonlySet<string>): boolean L13 | Whether `projectId` is a live project whose live ancestors never reach the tree.
by src/lib/features/todoist-sync/detach.logic.ts:isLiveOutsideTree <- src/lib/features/todoist-sync/projects.logic.ts:260 in planProjects call
sym src/lib/features/todoist-sync/detach.logic.ts:59 interface DetachPlan L8 | What planDetach decided.
sym src/lib/features/todoist-sync/detach.logic.ts:82 fn planDetach(input: DetachInput): DetachPlan L27 | Plans the detaches of one cycle.
by src/lib/features/todoist-sync/detach.logic.ts:planDetach <- src/lib/features/todoist-sync/sync-now.service.ts:392 in cycle call
sym src/lib/features/todoist-sync/detach.logic.ts:116 fn belowLineBrake(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>): boolean L5 | The line brake of design rule 9: true when fewer than half of the active (not detached) links have a line in the scan, which includes none at all.
by src/lib/features/todoist-sync/detach.logic.ts:belowLineBrake <- src/lib/features/todoist-sync/sync-now.service.ts:339 in cycle call
sym src/lib/features/todoist-sync/detach.logic.ts:123 fn missingLineCount(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>): number L3 | How many active (not detached) links have no line in the scan: the count the line brake's dialog names.
by src/lib/features/todoist-sync/detach.logic.ts:missingLineCount <- src/lib/features/todoist-sync/sync-now.service.ts:1185 in confirmLineBrake call
## calls
call src/lib/features/todoist-sync/detach.logic.ts:86 in planDetach -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/detach.logic.ts:93 in planDetach -> src/lib/features/todoist-sync/detach.logic.ts:isLiveOutsideTree call
call src/lib/features/todoist-sync/detach.logic.ts:117 in belowLineBrake -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/detach.logic.ts:124 in missingLineCount -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
