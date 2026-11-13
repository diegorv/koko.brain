# file card src/lib/features/todoist-sync/fields.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/fields.logic.ts ' codemap/files
file src/lib/features/todoist-sync/fields.logic.ts logic L466 module src/lib/features/todoist-sync in1 t1 | Field sync between Todoist and the note, as pure planning: per synced line, the content, due date, priority and labels Todoist changed since `remote_base`, eac…
## imports
imp src/lib/features/todoist-sync/fields.logic.ts:10 -> src/lib/contracts/index.ts type:TaskPriority,type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/fields.logic.ts:11 -> src/lib/features/todoist-sync/completion.logic.ts baseDue,dueDay,sameLink,unchangedItem,type:CompletionPlan,type:LineChange
imp src/lib/features/todoist-sync/fields.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityFromTodoist,mapPriorityToTodoist
imp src/lib/features/todoist-sync/fields.logic.ts:13 -> src/lib/features/todoist-sync/pull.logic.ts mappedLabels,PRIORITY_EMOJI,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine
imp src/lib/features/todoist-sync/fields.logic.ts:22 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,replaceDescription,trailingBlockId,type:PriorityEmoji
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:49 -> src/lib/features/todoist-sync/fields.logic.ts planFields,type:PlannedUpdate
## reach
in2 src/lib/features/todoist-sync/fields.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/fields.logic.ts 58 files in 4 modules: src/lib/contracts(52) src/lib/features/todoist-sync(3) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/fields.logic.test.ts imports src/lib/features/todoist-sync/fields.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/fields.logic.ts:32 interface FieldsInput L16 | Everything planFields reads besides the completion plan.
sym src/lib/features/todoist-sync/fields.logic.ts:50 interface PushDue L10 | A due as an `item_update` sends it.
sym src/lib/features/todoist-sync/fields.logic.ts:62 interface ItemUpdateArgs L12 | The `item_update` args of one push; only the fields the brain changed.
sym src/lib/features/todoist-sync/fields.logic.ts:76 interface PlannedUpdate L14 | An `item_update` to send for one link.
by src/lib/features/todoist-sync/fields.logic.ts:PlannedUpdate <- src/lib/features/todoist-sync/sync-now.service.ts:49 in (module) import
sym src/lib/features/todoist-sync/fields.logic.ts:92 interface FieldsPlan L10 | What planFields decided: the completion plan merged with the field half.
sym src/lib/features/todoist-sync/fields.logic.ts:155 fn planFields(input: FieldsInput, completion: CompletionPlan): FieldsPlan L49 | Plans the field half of a cycle on top of the completion plan (whose links carry the bases completion moved) and returns both merged: one line change and one l…
by src/lib/features/todoist-sync/fields.logic.ts:planFields <- src/lib/features/todoist-sync/sync-now.service.ts:434 in cycle call
## locals
local src/lib/features/todoist-sync/fields.logic.ts:206 fn fieldsChanged(item: PullItem, base: RemoteBase): boolean L3
local src/lib/features/todoist-sync/fields.logic.ts:219 fn planLink(anchor: string, line: ScannedLine, localBase: LocalBase, remoteBase: RemoteBase, item: PullItem, excludedLabels: Reado… L190
local src/lib/features/todoist-sync/fields.logic.ts:411 fn pushDue(day: string, base: PullDue | null): PushDue L10
local src/lib/features/todoist-sync/fields.logic.ts:423 fn dueAfterPush(sent: PushDue, base: PullDue | null): PullDue L10
local src/lib/features/todoist-sync/fields.logic.ts:434 fn has(list: readonly string[], value: string): boolean L3
local src/lib/features/todoist-sync/fields.logic.ts:439 fn minus(a: readonly string[], b: readonly string[]): string[] L3
local src/lib/features/todoist-sync/fields.logic.ts:444 fn uniq(a: readonly string[]): string[] L3
local src/lib/features/todoist-sync/fields.logic.ts:448 fn sameSet(a: readonly string[], b: readonly string[]): boolean L3
local src/lib/features/todoist-sync/fields.logic.ts:452 fn sameList(a: readonly string[], b: readonly string[]): boolean L3
local src/lib/features/todoist-sync/fields.logic.ts:456 fn sameDue(a: PullDue | null, b: PullDue | null): boolean L11
## calls
call src/lib/features/todoist-sync/fields.logic.ts:171 in planFields -> src/lib/features/todoist-sync/completion.logic.ts:unchangedItem call
call src/lib/features/todoist-sync/fields.logic.ts:174 in planFields -> src/lib/features/todoist-sync/fields.logic.ts:fieldsChanged call
call src/lib/features/todoist-sync/fields.logic.ts:182 in planFields -> src/lib/features/todoist-sync/fields.logic.ts:planLink call
call src/lib/features/todoist-sync/fields.logic.ts:185 in planFields -> src/lib/features/todoist-sync/completion.logic.ts:sameLink call
call src/lib/features/todoist-sync/fields.logic.ts:207 in fieldsChanged -> src/lib/features/todoist-sync/fields.logic.ts:sameDue call
call src/lib/features/todoist-sync/fields.logic.ts:207 in fieldsChanged -> src/lib/features/todoist-sync/fields.logic.ts:sameList call
call src/lib/features/todoist-sync/fields.logic.ts:229 in planLink -> src/lib/utils/task-tokens.ts:trailingBlockId call
call src/lib/features/todoist-sync/fields.logic.ts:245 in planLink -> src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem call +4
call src/lib/features/todoist-sync/fields.logic.ts:260 in planLink -> src/lib/features/todoist-sync/task-line.logic.ts:replaceDescription call
call src/lib/features/todoist-sync/fields.logic.ts:284 in planLink -> src/lib/features/todoist-sync/completion.logic.ts:dueDay call +2
call src/lib/features/todoist-sync/fields.logic.ts:286 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:sameDue call
call src/lib/features/todoist-sync/fields.logic.ts:287 in planLink -> src/lib/features/todoist-sync/completion.logic.ts:baseDue call
call src/lib/features/todoist-sync/fields.logic.ts:300 in planLink -> src/lib/features/todoist-sync/priority.logic.ts:mapPriorityToTodoist call +2
call src/lib/features/todoist-sync/fields.logic.ts:305 in planLink -> src/lib/features/todoist-sync/priority.logic.ts:mapPriorityFromTodoist call
call src/lib/features/todoist-sync/fields.logic.ts:313 in planLink -> src/lib/features/todoist-sync/pull.logic.ts:mappedLabels call +2
call src/lib/features/todoist-sync/fields.logic.ts:315 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:sameSet call +3
call src/lib/features/todoist-sync/fields.logic.ts:318 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:sameList call
call src/lib/features/todoist-sync/fields.logic.ts:323 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:minus call +7
call src/lib/features/todoist-sync/fields.logic.ts:332 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:has call +2
call src/lib/features/todoist-sync/fields.logic.ts:372 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:pushDue call
call src/lib/features/todoist-sync/fields.logic.ts:375 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:dueAfterPush call
call src/lib/features/todoist-sync/fields.logic.ts:398 in planLink -> src/lib/features/todoist-sync/fields.logic.ts:uniq call
call src/lib/features/todoist-sync/fields.logic.ts:440 in minus -> src/lib/features/todoist-sync/fields.logic.ts:has call
call src/lib/features/todoist-sync/fields.logic.ts:445 in uniq -> src/lib/features/todoist-sync/fields.logic.ts:has call
call src/lib/features/todoist-sync/fields.logic.ts:449 in sameSet -> src/lib/features/todoist-sync/fields.logic.ts:minus call +1
