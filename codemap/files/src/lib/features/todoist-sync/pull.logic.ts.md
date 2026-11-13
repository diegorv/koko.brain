# file card src/lib/features/todoist-sync/pull.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/pull.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/todoist-sync/pull.logic.ts logic L642 module src/lib/features/todoist-sync in11 t3 | The pull half of a sync cycle, as pure planning: which project notes to create, which open Todoist tasks to insert as anchored lines, which links to pair or fr…
## imports
imp src/lib/features/todoist-sync/pull.logic.ts:9 -> src/lib/contracts/index.ts type:TaskPriority,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/pull.logic.ts:10 -> src/lib/core/frontmatter/yaml-quoting.logic.ts canonicalizeScalar
imp src/lib/features/todoist-sync/pull.logic.ts:11 -> src/lib/features/todoist-sync/anchor.logic.ts anchorForTodoistId,anchorToken,readAnchor
imp src/lib/features/todoist-sync/pull.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityFromTodoist
imp src/lib/features/todoist-sync/pull.logic.ts:13 -> src/lib/features/todoist-sync/sync-scope.logic.ts treeProjectIds,type:ScopeProject
imp src/lib/features/todoist-sync/pull.logic.ts:14 -> src/lib/features/todoist-sync/task-line-edits.logic.ts codeFence
imp src/lib/features/todoist-sync/pull.logic.ts:15 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,hasSignifier,isTaskTagName,taskLineStatus,taskLineText,type:PriorityEmoji,type:RoundTripProblem
## imported-by
imp src/lib/features/todoist-sync/completion.logic.ts:10 -> src/lib/features/todoist-sync/pull.logic.ts assertSingleLine,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine
imp src/lib/features/todoist-sync/create.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts kokobrainAnchor,mappedLabels,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine,type:ScannedNote
imp src/lib/features/todoist-sync/cycle-log.logic.ts:9 -> src/lib/features/todoist-sync/pull.logic.ts type:PullCounts
imp src/lib/features/todoist-sync/detach.logic.ts:11 -> src/lib/features/todoist-sync/pull.logic.ts type:PullItem,type:ScannedLine
imp src/lib/features/todoist-sync/fields.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts mappedLabels,PRIORITY_EMOJI,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine
imp src/lib/features/todoist-sync/projects.logic.ts:17 -> src/lib/features/todoist-sync/pull.logic.ts projectNoteBaseName,type:ScannedNote
imp src/lib/features/todoist-sync/sections.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts type:LocalBase,type:PullItem,type:RemoteBase,type:ScannedLine,type:TaskPlace
imp src/lib/features/todoist-sync/sync-now.service.ts:61 -> src/lib/features/todoist-sync/pull.logic.ts excludedLabelSet,formatPullResult,normalizeSyncFolder,planPull,type:PullCounts,type:PullItem,type:ScannedLine,type:ScannedNote
imp src/lib/features/todoist-sync/sync-scheduler.logic.ts:8 -> src/lib/features/todoist-sync/pull.logic.ts extractTaskLines
imp src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:2 -> src/lib/features/todoist-sync/pull.logic.ts type:PullCounts
imp src/lib/features/todoist-sync/vault-scan.service.ts:6 -> src/lib/features/todoist-sync/pull.logic.ts extractTaskLines,type:LineFields,type:ScannedLine,type:ScannedNote
## reach
in2 src/lib/features/todoist-sync/pull.logic.ts 6 files in 2 modules: src/lib/features/todoist-sync(5) src/lib/app(1)
out2 src/lib/features/todoist-sync/pull.logic.ts 54 files in 2 modules: src/lib/contracts(52) src/lib/utils(2)
## tests
test src/tests/lib/features/todoist-sync/pull.logic.test.ts imports src/lib/features/todoist-sync/pull.logic.ts mirror
test src/tests/lib/features/todoist-sync/create.logic.test.ts imports src/lib/features/todoist-sync/pull.logic.ts
test src/tests/lib/features/todoist-sync/fields.logic.test.ts imports src/lib/features/todoist-sync/pull.logic.ts
test src/tests/lib/features/todoist-sync/completion.logic.test.ts imports-type src/lib/features/todoist-sync/pull.logic.ts
test src/tests/lib/features/todoist-sync/detach.logic.test.ts imports-type src/lib/features/todoist-sync/pull.logic.ts
test src/tests/lib/features/todoist-sync/projects.logic.test.ts imports-type src/lib/features/todoist-sync/pull.logic.ts
test src/tests/lib/features/todoist-sync/sections.logic.test.ts imports-type src/lib/features/todoist-sync/pull.logic.ts
## symbols
sym src/lib/features/todoist-sync/pull.logic.ts:26 interface PullItem L26 | The item fields the pull reads (SDK `Task`, camel-cased).
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/completion.logic.ts:10 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/detach.logic.ts:11 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/fields.logic.ts:18 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/sections.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullItem <- src/lib/features/todoist-sync/sync-now.service.ts:67 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:54 interface PullDue L14 | A Todoist due date as the SDK returns it.
by src/lib/features/todoist-sync/pull.logic.ts:PullDue <- src/lib/features/todoist-sync/completion.logic.ts:10 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullDue <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullDue <- src/lib/features/todoist-sync/fields.logic.ts:17 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:70 interface LocalBase L26 | `local_base` JSON: the values parsed from the line as last written or seen.
by src/lib/features/todoist-sync/pull.logic.ts:LocalBase <- src/lib/features/todoist-sync/completion.logic.ts:10 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:LocalBase <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:LocalBase <- src/lib/features/todoist-sync/fields.logic.ts:16 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:LocalBase <- src/lib/features/todoist-sync/sections.logic.ts:13 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:98 interface TaskPlace L6 | Where a task is in Todoist: its project and its section, null for none.
by src/lib/features/todoist-sync/pull.logic.ts:TaskPlace <- src/lib/features/todoist-sync/sections.logic.ts:13 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:106 interface RemoteBase L22 | `remote_base` JSON: the raw Todoist values last seen.
by src/lib/features/todoist-sync/pull.logic.ts:RemoteBase <- src/lib/features/todoist-sync/completion.logic.ts:10 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:RemoteBase <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:RemoteBase <- src/lib/features/todoist-sync/fields.logic.ts:19 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:RemoteBase <- src/lib/features/todoist-sync/sections.logic.ts:13 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:130 interface ScannedLine L16 | A task line found in the vault: its text after `[ ] ` (Rust `Task.text`).
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/completion.logic.ts:10 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/detach.logic.ts:11 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/fields.logic.ts:20 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/sections.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/sync-now.service.ts:68 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedLine <- src/lib/features/todoist-sync/vault-scan.service.ts:6 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:148 type LineFields L1 | The parsed fields of a line that a `local_base` keeps besides the status.
by src/lib/features/todoist-sync/pull.logic.ts:LineFields <- src/lib/features/todoist-sync/vault-scan.service.ts:6 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:151 interface ScannedNote L6 | An indexed note, and the Todoist project its frontmatter names when it is in sync scope.
by src/lib/features/todoist-sync/pull.logic.ts:ScannedNote <- src/lib/features/todoist-sync/create.logic.ts:13 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedNote <- src/lib/features/todoist-sync/projects.logic.ts:17 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedNote <- src/lib/features/todoist-sync/sync-now.service.ts:69 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:ScannedNote <- src/lib/features/todoist-sync/vault-scan.service.ts:6 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:159 interface PullInput L20 | Everything planPull reads.
sym src/lib/features/todoist-sync/pull.logic.ts:181 interface PlannedInsert L5 | New lines for one note and the links to store once they are written.
sym src/lib/features/todoist-sync/pull.logic.ts:188 interface PullPlan L16 | What one pull does.
sym src/lib/features/todoist-sync/pull.logic.ts:206 interface PullCounts L26 | What a sync cycle wrote: the pull, then the completion sync.
by src/lib/features/todoist-sync/pull.logic.ts:PullCounts <- src/lib/features/todoist-sync/cycle-log.logic.ts:9 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullCounts <- src/lib/features/todoist-sync/sync-now.service.ts:66 in (module) import
by src/lib/features/todoist-sync/pull.logic.ts:PullCounts <- src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:2 in (module) import
sym src/lib/features/todoist-sync/pull.logic.ts:240 const PRIORITY_EMOJI: Partial<Record<TaskPriority, PriorityEmoji>> L1 | Todoist priority -> line emoji (`PRIORITY_EMOJIS` order).
by src/lib/features/todoist-sync/pull.logic.ts:PRIORITY_EMOJI <- src/lib/features/todoist-sync/fields.logic.ts:306 in planLink ref
sym src/lib/features/todoist-sync/pull.logic.ts:248 fn normalizeSyncFolder(raw: string): string | null L10 | The sync folder as used for paths: trimmed, empty and `.` segments dropped (so the path matches the one the watcher reports), empty -> `Todoist`.
by src/lib/features/todoist-sync/pull.logic.ts:normalizeSyncFolder <- src/lib/features/todoist-sync/sync-now.service.ts:237 in syncNow call
sym src/lib/features/todoist-sync/pull.logic.ts:264 fn projectNoteBaseName(name: string): string L8 | A project name as a note filename (no extension): `\ / : * ? " < > |` and control chars become `-`, whitespace collapses, leading dots and surrounding spaces a…
by src/lib/features/todoist-sync/pull.logic.ts:projectNoteBaseName <- src/lib/features/todoist-sync/projects.logic.ts:239 in planProjects call
sym src/lib/features/todoist-sync/pull.logic.ts:278 fn extractTaskLines(content: string): { lineNumber: number; text: string; status: string; indent: number }[] L16 | Every task line of a note's content with its 1-based number, its text, its status char and its indent level (Rust `calculate_indent`: tabs + spaces / 2), skipp…
by src/lib/features/todoist-sync/pull.logic.ts:extractTaskLines <- src/lib/features/todoist-sync/sync-scheduler.logic.ts:18 in hasAnchoredLine call
by src/lib/features/todoist-sync/pull.logic.ts:extractTaskLines <- src/lib/features/todoist-sync/vault-scan.service.ts:88 in scanVault call
sym src/lib/features/todoist-sync/pull.logic.ts:309 fn kokobrainAnchor(description: string): string | null L3 | The anchor a brain-born task's description names on its own `kokobrain:td-...` line, or null.
by src/lib/features/todoist-sync/pull.logic.ts:kokobrainAnchor <- src/lib/features/todoist-sync/create.logic.ts:331 in pairPendingAdds call +1
sym src/lib/features/todoist-sync/pull.logic.ts:314 fn assertSingleLine(line: string): void L3 | Throws when a line planned for a note holds CR or LF: the writers would refuse it, and the line would split.
by src/lib/features/todoist-sync/pull.logic.ts:assertSingleLine <- src/lib/features/todoist-sync/completion.logic.ts:344 in applyLineChange call
sym src/lib/features/todoist-sync/pull.logic.ts:319 fn excludedLabelSet(defaultLabel: string): Set<string> L5 | Lower-cased labels never written as tags: the scope tag, the context labels and `defaultLabel`.
by src/lib/features/todoist-sync/pull.logic.ts:excludedLabelSet <- src/lib/features/todoist-sync/sync-now.service.ts:342 in cycle call
sym src/lib/features/todoist-sync/pull.logic.ts:326 fn mappedLabels(labels: readonly string[], excludedLabels: ReadonlySet<string>): string[] L3 | The labels written as tags (rule 8): a whole tag name, not excluded (compared lower-cased).
by src/lib/features/todoist-sync/pull.logic.ts:mappedLabels <- src/lib/features/todoist-sync/create.logic.ts:269 in ackedLink call
by src/lib/features/todoist-sync/pull.logic.ts:mappedLabels <- src/lib/features/todoist-sync/fields.logic.ts:313 in planLink call +2
sym src/lib/features/todoist-sync/pull.logic.ts:343 fn pulledTask(item: PullItem, excludedLabels: ReadonlySet<string>): { line: string; localBase: LocalBase; remoteBase: RemoteBase; co… L37 | The line for an open Todoist task, with its bases: `- [ ] <content> <priority> 📅 <date> 🔁 <rule> #tags 🆔 td-<id>`, only the fields that exist.
sym src/lib/features/todoist-sync/pull.logic.ts:437 fn planPull(input: PullInput): PullPlan L109 | Plans one pull over the vault's tree (rule 8c).
by src/lib/features/todoist-sync/pull.logic.ts:planPull <- src/lib/features/todoist-sync/sync-now.service.ts:347 in cycle call
sym src/lib/features/todoist-sync/pull.logic.ts:613 fn formatPullResult(counts: PullCounts): string L22 | The message a finished pull shows.
by src/lib/features/todoist-sync/pull.logic.ts:formatPullResult <- src/lib/features/todoist-sync/sync-now.service.ts:255 in syncNow call
## locals
local src/lib/features/todoist-sync/pull.logic.ts:296 fn indentLevel(line: string): number L6
local src/lib/features/todoist-sync/pull.logic.ts:382 fn isSafeRecurrenceText(text: string): boolean L3
local src/lib/features/todoist-sync/pull.logic.ts:386 fn remoteBaseOf(item: PullItem, unmappedLabels: string[], contentProblem: RoundTripProblem | null): RemoteBase L23
local src/lib/features/todoist-sync/pull.logic.ts:410 fn newLink(anchor: string, todoistId: string, noteRelPath: string, extra: Partial<TodoistTaskLink>): TodoistTaskLink L14
local src/lib/features/todoist-sync/pull.logic.ts:552 fn treeOrder(items: PullItem[]): PullItem[] L17
local src/lib/features/todoist-sync/pull.logic.ts:576 fn projectTargets(input: PullInput, treeIds: Set<string>, plan: PullPlan): Map<string, string> L35
local src/lib/features/todoist-sync/pull.logic.ts:636 fn plural(n: number, noun: string): string L3
local src/lib/features/todoist-sync/pull.logic.ts:640 fn frozenEntry(anchor: string): TodoistSyncLogInput L3
## calls
call src/lib/features/todoist-sync/pull.logic.ts:282 in extractTaskLines -> src/lib/features/todoist-sync/task-line-edits.logic.ts:codeFence call
call src/lib/features/todoist-sync/pull.logic.ts:289 in extractTaskLines -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineText call
call src/lib/features/todoist-sync/pull.logic.ts:290 in extractTaskLines -> src/lib/features/todoist-sync/pull.logic.ts:indentLevel call
call src/lib/features/todoist-sync/pull.logic.ts:290 in extractTaskLines -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineStatus call
call src/lib/features/todoist-sync/pull.logic.ts:327 in mappedLabels -> src/lib/features/todoist-sync/task-line.logic.ts:isTaskTagName call
call src/lib/features/todoist-sync/pull.logic.ts:354 in pulledTask -> src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem call
call src/lib/features/todoist-sync/pull.logic.ts:356 in pulledTask -> src/lib/features/todoist-sync/pull.logic.ts:mappedLabels call
call src/lib/features/todoist-sync/pull.logic.ts:358 in pulledTask -> src/lib/features/todoist-sync/priority.logic.ts:mapPriorityFromTodoist call
call src/lib/features/todoist-sync/pull.logic.ts:362 in pulledTask -> src/lib/features/todoist-sync/pull.logic.ts:isSafeRecurrenceText call
call src/lib/features/todoist-sync/pull.logic.ts:369 in pulledTask -> src/lib/features/todoist-sync/anchor.logic.ts:anchorForTodoistId call
call src/lib/features/todoist-sync/pull.logic.ts:369 in pulledTask -> src/lib/features/todoist-sync/anchor.logic.ts:anchorToken call
call src/lib/features/todoist-sync/pull.logic.ts:374 in pulledTask -> src/lib/features/todoist-sync/pull.logic.ts:remoteBaseOf call
call src/lib/features/todoist-sync/pull.logic.ts:383 in isSafeRecurrenceText -> src/lib/features/todoist-sync/task-line.logic.ts:hasSignifier call
call src/lib/features/todoist-sync/pull.logic.ts:439 in planPull -> src/lib/features/todoist-sync/sync-scope.logic.ts:treeProjectIds call
call src/lib/features/todoist-sync/pull.logic.ts:440 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:treeOrder call
call src/lib/features/todoist-sync/pull.logic.ts:441 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:kokobrainAnchor call +2
call src/lib/features/todoist-sync/pull.logic.ts:450 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:frozenEntry call +1
call src/lib/features/todoist-sync/pull.logic.ts:453 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:projectTargets call
call src/lib/features/todoist-sync/pull.logic.ts:464 in planPull -> src/lib/features/todoist-sync/anchor.logic.ts:anchorForTodoistId call +1
call src/lib/features/todoist-sync/pull.logic.ts:487 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:pulledTask call +1
call src/lib/features/todoist-sync/pull.logic.ts:489 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:newLink call +1
call src/lib/features/todoist-sync/pull.logic.ts:501 in planPull -> src/lib/features/todoist-sync/task-line.logic.ts:hasSignifier call
call src/lib/features/todoist-sync/pull.logic.ts:506 in planPull -> src/lib/features/todoist-sync/pull.logic.ts:assertSingleLine call
call src/lib/features/todoist-sync/pull.logic.ts:507 in planPull -> src/lib/features/todoist-sync/anchor.logic.ts:readAnchor call
call src/lib/features/todoist-sync/pull.logic.ts:602 in projectTargets -> src/lib/features/todoist-sync/pull.logic.ts:projectNoteBaseName call
call src/lib/features/todoist-sync/pull.logic.ts:607 in projectTargets -> src/lib/core/frontmatter/yaml-quoting.logic.ts:canonicalizeScalar call
call src/lib/features/todoist-sync/pull.logic.ts:615 in formatPullResult -> src/lib/features/todoist-sync/pull.logic.ts:plural call +10
