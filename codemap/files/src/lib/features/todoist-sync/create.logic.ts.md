# file card src/lib/features/todoist-sync/create.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/create.logic.ts ' codemap/files
file src/lib/features/todoist-sync/create.logic.ts logic L399 module src/lib/features/todoist-sync in1 t1 | Brain-born tasks, as pure planning: which task lines are created in Todoist, the `item_add` each one sends, and how a pending add finds its Todoist task again …
## imports
imp src/lib/features/todoist-sync/create.logic.ts:9 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/create.logic.ts:10 -> src/lib/features/todoist-sync/anchor.logic.ts anchorToken,hasForeignId,idValues,readAnchor
imp src/lib/features/todoist-sync/create.logic.ts:11 -> src/lib/features/todoist-sync/detach.logic.ts isDetached
imp src/lib/features/todoist-sync/create.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityToTodoist
imp src/lib/features/todoist-sync/create.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts kokobrainAnchor,mappedLabels,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine,type:ScannedNote
imp src/lib/features/todoist-sync/create.logic.ts:14 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,isClosedStatus,taskLineText
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:38 -> src/lib/features/todoist-sync/create.logic.ts ackedLink,addAnchor,orphanAnchorLog,pairPendingAdds,planCreates,type:CreatePlan,type:PendingAdd,type:PlannedCreate
## reach
in2 src/lib/features/todoist-sync/create.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/create.logic.ts 57 files in 4 modules: src/lib/contracts(52) src/lib/features/todoist-sync(2) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/create.logic.test.ts imports src/lib/features/todoist-sync/create.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/create.logic.ts:29 interface AddDue L8 | The due of an `item_add` (live-check R): `{date}`, `{date, string, lang}` or `{string}`.
sym src/lib/features/todoist-sync/create.logic.ts:39 interface ItemAddArgs L18 | The `item_add` args of a brain-born task (SDK `TaskAddArgs`, camel-cased).
sym src/lib/features/todoist-sync/create.logic.ts:59 interface PendingAdd L8 | `pending_cmd` JSON of a brain-born task: its `item_add`, resent as-is until acknowledged.
by src/lib/features/todoist-sync/create.logic.ts:PendingAdd <- src/lib/features/todoist-sync/sync-now.service.ts:45 in (module) import
sym src/lib/features/todoist-sync/create.logic.ts:69 interface CreateInput L28 | Everything planCreates reads.
sym src/lib/features/todoist-sync/create.logic.ts:99 interface PlannedCreate L10 | A line to create: its anchor is written first, then its pending link is stored, then the command is sent (rule 2).
by src/lib/features/todoist-sync/create.logic.ts:PlannedCreate <- src/lib/features/todoist-sync/sync-now.service.ts:46 in (module) import
sym src/lib/features/todoist-sync/create.logic.ts:111 interface CreatePlan L8 | What planCreates decided.
by src/lib/features/todoist-sync/create.logic.ts:CreatePlan <- src/lib/features/todoist-sync/sync-now.service.ts:44 in (module) import
sym src/lib/features/todoist-sync/create.logic.ts:121 fn parsePendingAdd(raw: string | null): PendingAdd | null L12 | Parses `pending_cmd`; null when absent or not an `item_add`.
sym src/lib/features/todoist-sync/create.logic.ts:160 fn planCreates(input: CreateInput): CreatePlan L57 | Plans the creates of one cycle (design Scope, rules 2 and 10).
by src/lib/features/todoist-sync/create.logic.ts:planCreates <- src/lib/features/todoist-sync/sync-now.service.ts:471 in cycle call
sym src/lib/features/todoist-sync/create.logic.ts:261 fn ackedLink(link: TodoistTaskLink, command: PendingAdd, todoistId: string, excludedLabels: ReadonlySet<string>, projectId: string … L23 | The link of an acknowledged add: the Todoist id stored, the pending add cleared, and `remote_base` at the values sent, so the next pull's diff brings in only w…
by src/lib/features/todoist-sync/create.logic.ts:ackedLink <- src/lib/features/todoist-sync/sync-now.service.ts:794 in pushCreates call
sym src/lib/features/todoist-sync/create.logic.ts:291 interface PairInput L8 | Everything pairPendingAdds reads.
sym src/lib/features/todoist-sync/create.logic.ts:301 interface PairPlan L7 | What pairPendingAdds decided.
sym src/lib/features/todoist-sync/create.logic.ts:318 fn pairPendingAdds(input: PairInput): PairPlan L43 | Pairs pulled items with the pending adds whose response was lost (design rule 2), before the pull may insert any of them as a new line.
by src/lib/features/todoist-sync/create.logic.ts:pairPendingAdds <- src/lib/features/todoist-sync/sync-now.service.ts:344 in cycle call
sym src/lib/features/todoist-sync/create.logic.ts:373 fn orphanAnchorLog(occurrences: ReadonlyMap<string, readonly ScannedLine[]>, owned: ReadonlySet<string>, items: Iterable<PullItem>): Todo… L13 | One `orphan-anchor` entry per brain-born anchor in the scan that no link owns and no item names in its `kokobrain:` line, at its first line.
by src/lib/features/todoist-sync/create.logic.ts:orphanAnchorLog <- src/lib/features/todoist-sync/sync-now.service.ts:521 in cycle call
sym src/lib/features/todoist-sync/create.logic.ts:392 fn addAnchor(line: string, anchor: string): string | null L8 | Appends the anchor token to a task line (before a trailing block id and trailing whitespace), for a line that carries no `🆔` yet.
by src/lib/features/todoist-sync/create.logic.ts:addAnchor <- src/lib/features/todoist-sync/sync-now.service.ts:1090 in writeBatches call
## locals
local src/lib/features/todoist-sync/create.logic.ts:135 fn pendingAddOf(link: TodoistTaskLink): PendingAdd | null L4
local src/lib/features/todoist-sync/create.logic.ts:219 fn projectNotes(notes: ScannedNote[], treeIds: ReadonlySet<string>): Map<string, string> L9
local src/lib/features/todoist-sync/create.logic.ts:230 fn addArgs(line: ScannedLine, content: string, anchor: string, projectId: string, input: CreateInput): ItemAddArgs L22
local src/lib/features/todoist-sync/create.logic.ts:285 fn sentDue(due: AddDue | undefined): PullDue | null L4
## calls
call src/lib/features/todoist-sync/create.logic.ts:136 in pendingAddOf -> src/lib/features/todoist-sync/detach.logic.ts:isDetached call
call src/lib/features/todoist-sync/create.logic.ts:137 in pendingAddOf -> src/lib/features/todoist-sync/create.logic.ts:parsePendingAdd call
call src/lib/features/todoist-sync/create.logic.ts:162 in planCreates -> src/lib/features/todoist-sync/create.logic.ts:projectNotes call
call src/lib/features/todoist-sync/create.logic.ts:166 in planCreates -> src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus call
call src/lib/features/todoist-sync/create.logic.ts:171 in planCreates -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/create.logic.ts:172 in planCreates -> src/lib/features/todoist-sync/anchor.logic.ts:hasForeignId call
call src/lib/features/todoist-sync/create.logic.ts:172 in planCreates -> src/lib/features/todoist-sync/anchor.logic.ts:readAnchor call
call src/lib/features/todoist-sync/create.logic.ts:178 in planCreates -> src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem call
call src/lib/features/todoist-sync/create.logic.ts:188 in planCreates -> src/lib/features/todoist-sync/create.logic.ts:addArgs call
call src/lib/features/todoist-sync/create.logic.ts:211 in planCreates -> src/lib/features/todoist-sync/create.logic.ts:pendingAddOf call
call src/lib/features/todoist-sync/create.logic.ts:242 in addArgs -> src/lib/features/todoist-sync/priority.logic.ts:mapPriorityToTodoist call
call src/lib/features/todoist-sync/create.logic.ts:269 in ackedLink -> src/lib/features/todoist-sync/pull.logic.ts:mappedLabels call
call src/lib/features/todoist-sync/create.logic.ts:277 in ackedLink -> src/lib/features/todoist-sync/create.logic.ts:sentDue call
call src/lib/features/todoist-sync/create.logic.ts:322 in pairPendingAdds -> src/lib/features/todoist-sync/create.logic.ts:pendingAddOf call
call src/lib/features/todoist-sync/create.logic.ts:331 in pairPendingAdds -> src/lib/features/todoist-sync/pull.logic.ts:kokobrainAnchor call
call src/lib/features/todoist-sync/create.logic.ts:349 in pairPendingAdds -> src/lib/features/todoist-sync/create.logic.ts:ackedLink call
call src/lib/features/todoist-sync/create.logic.ts:374 in orphanAnchorLog -> src/lib/features/todoist-sync/pull.logic.ts:kokobrainAnchor call
call src/lib/features/todoist-sync/create.logic.ts:393 in addAnchor -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineText call
call src/lib/features/todoist-sync/create.logic.ts:398 in addAnchor -> src/lib/features/todoist-sync/anchor.logic.ts:anchorToken call
