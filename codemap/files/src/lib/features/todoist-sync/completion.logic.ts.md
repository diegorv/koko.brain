# file card src/lib/features/todoist-sync/completion.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/completion.logic.ts ' codemap/files
file src/lib/features/todoist-sync/completion.logic.ts logic L346 module src/lib/features/todoist-sync in2 t2 | Completion sync, as pure planning: which synced lines get their status (and, for a recurring task, their `📅`) rewritten from Todoist, which links push an `ite…
## imports
imp src/lib/features/todoist-sync/completion.logic.ts:9 -> src/lib/contracts/index.ts type:TodoistSyncLogInput,type:TodoistTaskLink
imp src/lib/features/todoist-sync/completion.logic.ts:10 -> src/lib/features/todoist-sync/pull.logic.ts assertSingleLine,type:LocalBase,type:PullDue,type:PullItem,type:RemoteBase,type:ScannedLine
imp src/lib/features/todoist-sync/completion.logic.ts:11 -> src/lib/features/todoist-sync/task-line.logic.ts addTag,isClosedStatus,nextStatusChar,removeTag,replaceDescription,setDueDate,setPriority,setTaskStatus,taskLineStatus,taskLineText,type:PriorityEmoji,type:TaskLineState
## imported-by
imp src/lib/features/todoist-sync/fields.logic.ts:11 -> src/lib/features/todoist-sync/completion.logic.ts baseDue,dueDay,sameLink,unchangedItem,type:CompletionPlan,type:LineChange
imp src/lib/features/todoist-sync/sync-now.service.ts:30 -> src/lib/features/todoist-sync/completion.logic.ts applyLineChange,planAck,planCompletion,terminalLink,type:LineChange,type:PlannedCommand
## reach
in2 src/lib/features/todoist-sync/completion.logic.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/completion.logic.ts 59 files in 4 modules: src/lib/contracts(52) src/lib/features/todoist-sync(4) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/completion.logic.test.ts imports src/lib/features/todoist-sync/completion.logic.ts mirror
test src/tests/lib/features/todoist-sync/fields.logic.test.ts imports src/lib/features/todoist-sync/completion.logic.ts
## symbols
sym src/lib/features/todoist-sync/completion.logic.ts:27 type CompletionCommandType L1 | The Sync API commands a completion push sends; `item_complete` is never used (rule 6).
sym src/lib/features/todoist-sync/completion.logic.ts:30 interface PendingCommand L6 | `pending_cmd` JSON: a close or reopen sent or about to be sent, kept until acknowledged.
sym src/lib/features/todoist-sync/completion.logic.ts:38 interface LineChange L20 | A token patch for one synced line.
by src/lib/features/todoist-sync/completion.logic.ts:LineChange <- src/lib/features/todoist-sync/fields.logic.ts:11 in (module) import
by src/lib/features/todoist-sync/completion.logic.ts:LineChange <- src/lib/features/todoist-sync/sync-now.service.ts:35 in (module) import
sym src/lib/features/todoist-sync/completion.logic.ts:60 interface PlannedCommand L8 | A command to send for one link.
by src/lib/features/todoist-sync/completion.logic.ts:PlannedCommand <- src/lib/features/todoist-sync/sync-now.service.ts:36 in (module) import
sym src/lib/features/todoist-sync/completion.logic.ts:70 interface CompletionPlan L10 | What planCompletion decided.
by src/lib/features/todoist-sync/completion.logic.ts:CompletionPlan <- src/lib/features/todoist-sync/fields.logic.ts:11 in (module) import
sym src/lib/features/todoist-sync/completion.logic.ts:82 interface CompletionInput L18 | Everything planCompletion reads.
sym src/lib/features/todoist-sync/completion.logic.ts:102 fn dueDay(due: PullDue | null): string | null L3 | `YYYY-MM-DD` of a due, or null.
by src/lib/features/todoist-sync/completion.logic.ts:dueDay <- src/lib/features/todoist-sync/fields.logic.ts:284 in planLink call +2
sym src/lib/features/todoist-sync/completion.logic.ts:107 fn baseDue(due: PullDue | null): PullDue | null L11 | A copy of a due for `remote_base`, the shape `pulledTask` stores.
by src/lib/features/todoist-sync/completion.logic.ts:baseDue <- src/lib/features/todoist-sync/fields.logic.ts:287 in planLink call
sym src/lib/features/todoist-sync/completion.logic.ts:120 fn parsePending(raw: string | null): PendingCommand | null L10 | Parses `pending_cmd`; null when absent or not one of ours.
sym src/lib/features/todoist-sync/completion.logic.ts:156 fn planCompletion(input: CompletionInput): CompletionPlan L71 | Plans the completion half of a cycle, after the pull (rule 6).
by src/lib/features/todoist-sync/completion.logic.ts:planCompletion <- src/lib/features/todoist-sync/sync-now.service.ts:414 in cycle call
sym src/lib/features/todoist-sync/completion.logic.ts:232 fn unchangedItem(id: string, base: RemoteBase): PullItem L16 | The item as its `remote_base` last saw it, for a link whose item an incremental pull did not report (so it did not change).
by src/lib/features/todoist-sync/completion.logic.ts:unchangedItem <- src/lib/features/todoist-sync/fields.logic.ts:171 in planFields call
sym src/lib/features/todoist-sync/completion.logic.ts:250 fn sameLink(a: TodoistTaskLink, b: TodoistTaskLink): boolean L8 | Whether storing `a` over `b` would change nothing: same note, pending command and bases.
by src/lib/features/todoist-sync/completion.logic.ts:sameLink <- src/lib/features/todoist-sync/fields.logic.ts:185 in planFields call
sym src/lib/features/todoist-sync/completion.logic.ts:265 interface AckPlan L10 | What to do for one link once Todoist answered its command.
sym src/lib/features/todoist-sync/completion.logic.ts:288 fn planAck(link: TodoistTaskLink, line: ScannedLine, item: PullItem | undefined): AckPlan L23 | After an `ok` for a link's command, rewrites the line from the item an incremental pull returned (rule 6): its status, and for an open recurring item the new `…
by src/lib/features/todoist-sync/completion.logic.ts:planAck <- src/lib/features/todoist-sync/sync-now.service.ts:661 in pushCompletions call
sym src/lib/features/todoist-sync/completion.logic.ts:317 fn terminalLink(link: TodoistTaskLink, line: ScannedLine): TodoistTaskLink L4 | After a terminal command error (a 4xx `sync_status` other than 429, design rule 13): `pending_cmd` is cleared and the line's status becomes the local base, so …
by src/lib/features/todoist-sync/completion.logic.ts:terminalLink <- src/lib/features/todoist-sync/sync-now.service.ts:671 in pushCompletions call
sym src/lib/features/todoist-sync/completion.logic.ts:329 fn applyLineChange(raw: string, change: LineChange): string | null L18 | Applies a line change to the raw line, or returns null when the raw line no longer holds the scanned text and open/closed state (edited since the scan; an inde…
by src/lib/features/todoist-sync/completion.logic.ts:applyLineChange <- src/lib/features/todoist-sync/sync-now.service.ts:1100 in writeBatches call
## locals
local src/lib/features/todoist-sync/completion.logic.ts:131 fn localBaseFromLine(line: ScannedLine): LocalBase | null L3
local src/lib/features/todoist-sync/completion.logic.ts:259 fn sameJson(a: string | null, b: string | null): boolean L4
## calls
call src/lib/features/todoist-sync/completion.logic.ts:163 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:unchangedItem call
call src/lib/features/todoist-sync/completion.logic.ts:166 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:localBaseFromLine call
call src/lib/features/todoist-sync/completion.logic.ts:169 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:parsePending call
call src/lib/features/todoist-sync/completion.logic.ts:170 in planCompletion -> src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus call +3
call src/lib/features/todoist-sync/completion.logic.ts:173 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:dueDay call +3
call src/lib/features/todoist-sync/completion.logic.ts:212 in planCompletion -> src/lib/features/todoist-sync/task-line.logic.ts:nextStatusChar call
call src/lib/features/todoist-sync/completion.logic.ts:216 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:baseDue call
call src/lib/features/todoist-sync/completion.logic.ts:223 in planCompletion -> src/lib/features/todoist-sync/completion.logic.ts:sameLink call
call src/lib/features/todoist-sync/completion.logic.ts:254 in sameLink -> src/lib/features/todoist-sync/completion.logic.ts:sameJson call +1
call src/lib/features/todoist-sync/completion.logic.ts:296 in planAck -> src/lib/features/todoist-sync/completion.logic.ts:dueDay call
call src/lib/features/todoist-sync/completion.logic.ts:301 in planAck -> src/lib/features/todoist-sync/task-line.logic.ts:nextStatusChar call
call src/lib/features/todoist-sync/completion.logic.ts:303 in planAck -> src/lib/features/todoist-sync/completion.logic.ts:baseDue call
call src/lib/features/todoist-sync/completion.logic.ts:330 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineStatus call
call src/lib/features/todoist-sync/completion.logic.ts:331 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:taskLineText call
call src/lib/features/todoist-sync/completion.logic.ts:332 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus call +1
call src/lib/features/todoist-sync/completion.logic.ts:335 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:replaceDescription call
call src/lib/features/todoist-sync/completion.logic.ts:339 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:setTaskStatus call
call src/lib/features/todoist-sync/completion.logic.ts:340 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:setDueDate call
call src/lib/features/todoist-sync/completion.logic.ts:341 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:setPriority call
call src/lib/features/todoist-sync/completion.logic.ts:342 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:removeTag call
call src/lib/features/todoist-sync/completion.logic.ts:343 in applyLineChange -> src/lib/features/todoist-sync/task-line.logic.ts:addTag call
call src/lib/features/todoist-sync/completion.logic.ts:344 in applyLineChange -> src/lib/features/todoist-sync/pull.logic.ts:assertSingleLine call
