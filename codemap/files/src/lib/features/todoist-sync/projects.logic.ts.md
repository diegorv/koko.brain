# file card src/lib/features/todoist-sync/projects.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/projects.logic.ts ' codemap/files
file src/lib/features/todoist-sync/projects.logic.ts logic L300 module src/lib/features/todoist-sync in1 t1 | Project sync, as pure planning: which project notes are renamed after a Todoist rename, which Todoist projects are renamed after a note rename, which new notes…
## imports
imp src/lib/features/todoist-sync/projects.logic.ts:14 -> src/lib/contracts/index.ts type:TodoistKvEntry,type:TodoistSyncLogInput
imp src/lib/features/todoist-sync/projects.logic.ts:15 -> src/lib/features/todoist-sync/anchor.logic.ts isInSyncScope
imp src/lib/features/todoist-sync/projects.logic.ts:16 -> src/lib/features/todoist-sync/detach.logic.ts isLiveOutsideTree
imp src/lib/features/todoist-sync/projects.logic.ts:17 -> src/lib/features/todoist-sync/pull.logic.ts projectNoteBaseName,type:ScannedNote
imp src/lib/features/todoist-sync/projects.logic.ts:18 -> src/lib/features/todoist-sync/sync-scope.logic.ts type:ScopeProject
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:51 -> src/lib/features/todoist-sync/projects.logic.ts heldProjectIds,planProjects,projectStateEntry,readProjectState,type:PendingProject,type:PlannedNoteRename,type:PlannedProjectUpdate,type:ProjectState
## reach
in2 src/lib/features/todoist-sync/projects.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/projects.logic.ts 56 files in 3 modules: src/lib/contracts(52) src/lib/features/todoist-sync(3) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/projects.logic.test.ts imports src/lib/features/todoist-sync/projects.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/projects.logic.ts:21 const PROJECT_STATE_KEY L1 | The `todoist_kv` key holding the ProjectState JSON.
sym src/lib/features/todoist-sync/projects.logic.ts:24 interface ProjectBase L10 | A project as last seen on both sides.
sym src/lib/features/todoist-sync/projects.logic.ts:36 interface PendingProject L10 | A brain-born project whose `project_add` is stored before it is sent (design rule 2) and resent until acknowledged.
by src/lib/features/todoist-sync/projects.logic.ts:PendingProject <- src/lib/features/todoist-sync/sync-now.service.ts:56 in (module) import
sym src/lib/features/todoist-sync/projects.logic.ts:48 interface ProjectState L8 | Everything kept between cycles about projects.
by src/lib/features/todoist-sync/projects.logic.ts:ProjectState <- src/lib/features/todoist-sync/sync-now.service.ts:59 in (module) import
sym src/lib/features/todoist-sync/projects.logic.ts:58 interface PlannedNoteRename L10 | A Todoist rename to apply to the note.
by src/lib/features/todoist-sync/projects.logic.ts:PlannedNoteRename <- src/lib/features/todoist-sync/sync-now.service.ts:57 in (module) import
sym src/lib/features/todoist-sync/projects.logic.ts:70 interface PlannedProjectUpdate L12 | A note rename to push as `project_update`.
by src/lib/features/todoist-sync/projects.logic.ts:PlannedProjectUpdate <- src/lib/features/todoist-sync/sync-now.service.ts:58 in (module) import
sym src/lib/features/todoist-sync/projects.logic.ts:84 interface ProjectInput L24 | Everything planProjects reads.
sym src/lib/features/todoist-sync/projects.logic.ts:110 interface ProjectPlan L13 | What planProjects decided.
sym src/lib/features/todoist-sync/projects.logic.ts:125 fn readProjectState(kv: TodoistKvEntry[]): ProjectState L15 | Reads the project state from the kv rows; empty when absent or unreadable.
by src/lib/features/todoist-sync/projects.logic.ts:readProjectState <- src/lib/features/todoist-sync/sync-now.service.ts:346 in cycle call
sym src/lib/features/todoist-sync/projects.logic.ts:142 fn noteBaseName(relPath: string): string L3 | The note's file name without its Markdown extension.
sym src/lib/features/todoist-sync/projects.logic.ts:157 fn heldProjectIds(state: ProjectState, projects: ScopeProject[], treeIds: ReadonlySet<string>, notes: ScannedNote[]): Set<string> L9 | Tree projects with no note whose name matches a brain-born project still pending under the root: its `project_add` may have been applied with the response lost…
by src/lib/features/todoist-sync/projects.logic.ts:heldProjectIds <- src/lib/features/todoist-sync/sync-now.service.ts:357 in cycle call
sym src/lib/features/todoist-sync/projects.logic.ts:187 fn planProjects(input: ProjectInput): ProjectPlan L109 | Plans the project side of one cycle.
by src/lib/features/todoist-sync/projects.logic.ts:planProjects <- src/lib/features/todoist-sync/sync-now.service.ts:359 in cycle call
sym src/lib/features/todoist-sync/projects.logic.ts:298 fn projectStateEntry(state: ProjectState): TodoistKvEntry L3 | The kv row of a project state.
by src/lib/features/todoist-sync/projects.logic.ts:projectStateEntry <- src/lib/features/todoist-sync/sync-now.service.ts:570 in cycle call +2
## locals
local src/lib/features/todoist-sync/projects.logic.ts:146 fn parentOf(relPath: string): string L4
## calls
call src/lib/features/todoist-sync/projects.logic.ts:221 in planProjects -> src/lib/features/todoist-sync/projects.logic.ts:noteBaseName call +2
call src/lib/features/todoist-sync/projects.logic.ts:239 in planProjects -> src/lib/features/todoist-sync/pull.logic.ts:projectNoteBaseName call
call src/lib/features/todoist-sync/projects.logic.ts:241 in planProjects -> src/lib/features/todoist-sync/projects.logic.ts:parentOf call +1
call src/lib/features/todoist-sync/projects.logic.ts:260 in planProjects -> src/lib/features/todoist-sync/detach.logic.ts:isLiveOutsideTree call
call src/lib/features/todoist-sync/projects.logic.ts:277 in planProjects -> src/lib/features/todoist-sync/anchor.logic.ts:isInSyncScope call
