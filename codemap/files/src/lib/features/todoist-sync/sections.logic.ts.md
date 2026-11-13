# file card src/lib/features/todoist-sync/sections.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sections.logic.ts ' codemap/files
file src/lib/features/todoist-sync/sections.logic.ts logic L451 module src/lib/features/todoist-sync in1 t1 | Sections and task moves, as pure planning: a Todoist section is a `##` heading of its project note (`todoist_section_link` ties the two), and a task's place (i…
## imports
imp src/lib/features/todoist-sync/sections.logic.ts:10 -> src/lib/contracts/index.ts type:TaskLineInsert,type:TodoistSectionLink,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/sections.logic.ts:11 -> src/lib/features/todoist-sync/anchor.logic.ts readAnchor
imp src/lib/features/todoist-sync/sections.logic.ts:12 -> src/lib/features/todoist-sync/detach.logic.ts isDetached
imp src/lib/features/todoist-sync/sections.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts type:LocalBase,type:PullItem,type:RemoteBase,type:ScannedLine,type:TaskPlace
imp src/lib/features/todoist-sync/sections.logic.ts:14 -> src/lib/features/todoist-sync/task-line-edits.logic.ts codeFence,headingIndexes
imp src/lib/features/todoist-sync/sections.logic.ts:15 -> src/lib/features/todoist-sync/task-line.logic.ts taskLineText
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:71 -> src/lib/features/todoist-sync/sections.logic.ts noteOutline,outOfScopeAnchors,placeInsert,planMoves,planSections,type:LineNote,type:PlannedHeadingAppend,type:PlannedHeadingRename,type:PlannedLineMove,type:PlannedMove,type:PlannedSectionAdd,type:PullSection,type:SectionNote
## reach
in2 src/lib/features/todoist-sync/sections.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/sections.logic.ts 57 files in 4 modules: src/lib/contracts(52) src/lib/features/todoist-sync(2) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/sections.logic.test.ts imports src/lib/features/todoist-sync/sections.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/sections.logic.ts:21 interface PullSection L9 | A section as the pulls report it (SDK `Section`, the fields read).
by src/lib/features/todoist-sync/sections.logic.ts:PullSection <- src/lib/features/todoist-sync/sync-now.service.ts:83 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:32 interface NoteOutline L12 | The `##` headings of a project note and where its task lines sit.
sym src/lib/features/todoist-sync/sections.logic.ts:50 fn noteOutline(content: string): NoteOutline L35 | Reads a note's outline, skipping frontmatter and code fences as the task-line writer does.
by src/lib/features/todoist-sync/sections.logic.ts:noteOutline <- src/lib/features/todoist-sync/sync-now.service.ts:380 in cycle call +1
sym src/lib/features/todoist-sync/sections.logic.ts:87 interface SectionNote L5 | A project note the sections sync reads: the one note of a tree project, not frozen.
by src/lib/features/todoist-sync/sections.logic.ts:SectionNote <- src/lib/features/todoist-sync/sync-now.service.ts:84 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:94 interface SectionInput L14 | Everything planSections reads.
sym src/lib/features/todoist-sync/sections.logic.ts:110 interface PlannedHeadingAppend L5 | A heading to append at the end of a note for a new Todoist section.
by src/lib/features/todoist-sync/sections.logic.ts:PlannedHeadingAppend <- src/lib/features/todoist-sync/sync-now.service.ts:78 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:117 interface PlannedHeadingRename L7 | A heading to rename after its section was renamed in Todoist.
by src/lib/features/todoist-sync/sections.logic.ts:PlannedHeadingRename <- src/lib/features/todoist-sync/sync-now.service.ts:79 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:126 interface PlannedSectionAdd L13 | A brain heading to create as a Todoist section.
by src/lib/features/todoist-sync/sections.logic.ts:PlannedSectionAdd <- src/lib/features/todoist-sync/sync-now.service.ts:82 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:141 interface SectionPlan L12 | What planSections decided.
sym src/lib/features/todoist-sync/sections.logic.ts:175 fn planSections(input: SectionInput): SectionPlan L82 | Plans the sections of one cycle (design Sections).
by src/lib/features/todoist-sync/sections.logic.ts:planSections <- src/lib/features/todoist-sync/sync-now.service.ts:382 in cycle call
sym src/lib/features/todoist-sync/sections.logic.ts:259 type LineNote L1 | Where an anchored line's note puts it: a project note (with its outline), or another note in sync scope.
by src/lib/features/todoist-sync/sections.logic.ts:LineNote <- src/lib/features/todoist-sync/sync-now.service.ts:77 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:268 fn outOfScopeAnchors(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>, notes: ReadonlyMap<string, LineNote>): Set<string> L11 | The anchors whose one line sits in a note that is no project note and whose line has no `#todoist` (design Scope): such a line is out of sync scope and detache…
by src/lib/features/todoist-sync/sections.logic.ts:outOfScopeAnchors <- src/lib/features/todoist-sync/sync-now.service.ts:398 in cycle call
sym src/lib/features/todoist-sync/sections.logic.ts:281 interface MoveInput L22 | Everything planMoves reads.
sym src/lib/features/todoist-sync/sections.logic.ts:305 interface PlannedLineMove L13 | A line to move to where Todoist has its task.
by src/lib/features/todoist-sync/sections.logic.ts:PlannedLineMove <- src/lib/features/todoist-sync/sync-now.service.ts:80 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:320 interface PlannedMove L11 | An `item_move` for a line the brain moved.
by src/lib/features/todoist-sync/sections.logic.ts:PlannedMove <- src/lib/features/todoist-sync/sync-now.service.ts:81 in (module) import
sym src/lib/features/todoist-sync/sections.logic.ts:333 interface MovePlan L7 | What planMoves decided.
sym src/lib/features/todoist-sync/sections.logic.ts:366 fn planMoves(input: MoveInput): MovePlan L65 | Plans the moves of one cycle.
by src/lib/features/todoist-sync/sections.logic.ts:planMoves <- src/lib/features/todoist-sync/sync-now.service.ts:442 in cycle call
sym src/lib/features/todoist-sync/sections.logic.ts:439 fn placeInsert(line: string, link: TodoistTaskLink, targetHeadings: ReadonlyMap<string, string>): { insert: TaskLineInsert; link: Tod… L13 | Where a pulled task's line goes in its note: under the heading of its section when that is known this cycle, else above the sections.
by src/lib/features/todoist-sync/sections.logic.ts:placeInsert <- src/lib/features/todoist-sync/sync-now.service.ts:534 in cycle call
## locals
local src/lib/features/todoist-sync/sections.logic.ts:155 fn headingText(name: string): string | null L4
local src/lib/features/todoist-sync/sections.logic.ts:341 fn samePlace(a: TaskPlace | undefined, b: TaskPlace): boolean L3
local src/lib/features/todoist-sync/sections.logic.ts:346 fn placed(link: TodoistTaskLink, local: TaskPlace, remote: TaskPlace, relPath: string): TodoistTaskLink L5
## calls
call src/lib/features/todoist-sync/sections.logic.ts:52 in noteOutline -> src/lib/features/todoist-sync/task-line-edits.logic.ts:headingIndexes call
call src/lib/features/todoist-sync/sections.logic.ts:66 in noteOutline -> src/lib/features/todoist-sync/task-line-edits.logic.ts:codeFence call
call src/lib/features/todoist-sync/sections.logic.ts:73 in noteOutline -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineText call
call src/lib/features/todoist-sync/sections.logic.ts:77 in noteOutline -> src/lib/features/todoist-sync/anchor.logic.ts:readAnchor call
call src/lib/features/todoist-sync/sections.logic.ts:190 in planSections -> src/lib/features/todoist-sync/sections.logic.ts:headingText call +1
call src/lib/features/todoist-sync/sections.logic.ts:271 in outOfScopeAnchors -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/sections.logic.ts:369 in planMoves -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/sections.logic.ts:382 in planMoves -> src/lib/features/todoist-sync/sections.logic.ts:samePlace call +5
call src/lib/features/todoist-sync/sections.logic.ts:385 in planMoves -> src/lib/features/todoist-sync/sections.logic.ts:placed call +5
