# file card src/lib/utils/task-tokens.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/task-tokens.ts ' codemap/files
file src/lib/utils/task-tokens.ts other L128 module src/lib/utils in3 t3 | Due date and priority token patches on a task text (Rust `Task.text`, the part after `[ ] `).
## imported-by
imp src/lib/features/tasks/TasksView.svelte:33 -> src/lib/utils/task-tokens.ts setDueToken,setPriorityToken
imp src/lib/features/tasks/task-row-edit.logic.ts:2 -> src/lib/utils/task-tokens.ts type:PriorityEmoji
imp src/lib/features/todoist-sync/task-line.logic.ts:13 -> src/lib/utils/task-tokens.ts insertToken,removeSpans,setDueToken,setPriorityToken,trailingBlockId,type:PriorityEmoji,type:Span
imp src/lib/features/todoist-sync/task-line.logic.ts:15 -> src/lib/utils/task-tokens.ts PRIORITY_EMOJIS,trailingBlockId,type:PriorityEmoji
## reach
in2 src/lib/utils/task-tokens.ts 7 files in 2 modules: src/lib/features/todoist-sync(6) src/lib/app(1)
out2 src/lib/utils/task-tokens.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/task-tokens.test.ts imports src/lib/utils/task-tokens.ts mirror
test src/tests/lib/features/tasks/task-row-edit.logic.test.ts imports src/lib/utils/task-tokens.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/utils/task-tokens.ts
## symbols
sym src/lib/utils/task-tokens.ts:14 const PRIORITY_EMOJIS L1 | Priority signifiers, highest to lowest (Rust `PRIORITY_EMOJIS`).
sym src/lib/utils/task-tokens.ts:17 type PriorityEmoji L1 | One of the priority signifier emojis.
by src/lib/utils/task-tokens.ts:PriorityEmoji <- src/lib/features/tasks/task-row-edit.logic.ts:2 in (module) import
by src/lib/utils/task-tokens.ts:PriorityEmoji <- src/lib/features/todoist-sync/completion.logic.ts:22 in (module) import
by src/lib/utils/task-tokens.ts:PriorityEmoji <- src/lib/features/todoist-sync/fields.logic.ts:22 in (module) import
by src/lib/utils/task-tokens.ts:PriorityEmoji <- src/lib/features/todoist-sync/pull.logic.ts:21 in (module) import
by src/lib/utils/task-tokens.ts:PriorityEmoji <- src/lib/features/todoist-sync/task-line.logic.ts:13 in (module) import
sym src/lib/utils/task-tokens.ts:29 const DUE_RE L1 | `📅` + date, Rust `build_date_regex` for the due emoji.
sym src/lib/utils/task-tokens.ts:32 const PRIORITY_RE L1 | Any priority emoji, Rust `build_priority_regex`.
sym src/lib/utils/task-tokens.ts:43 fn trailingBlockId(text: string): string | null L3 | The block id that ends a task text (` ^id`, trailing whitespace allowed), without its space; null without one.
by src/lib/utils/task-tokens.ts:trailingBlockId <- src/lib/features/todoist-sync/fields.logic.ts:229 in planLink call
by src/lib/utils/task-tokens.ts:trailingBlockId <- src/lib/features/todoist-sync/task-line.logic.ts:250 in replaceDescription call
sym src/lib/utils/task-tokens.ts:61 interface Span L6 | A `[from, to)` span of task text.
by src/lib/utils/task-tokens.ts:Span <- src/lib/features/todoist-sync/task-line.logic.ts:13 in (module) import
sym src/lib/utils/task-tokens.ts:69 fn removeSpans(text: string, spans: readonly Span[]): string L3 | Removes the given spans, right to left so offsets stay valid.
by src/lib/utils/task-tokens.ts:removeSpans <- src/lib/features/todoist-sync/task-line.logic.ts:208 in removeTag call
sym src/lib/utils/task-tokens.ts:91 fn insertToken(text: string, token: string): string L11 | Inserts a token before the first `🆔`; without one, before a block id that ends the text, so `^id` stays last and keeps resolving; otherwise at the end before …
by src/lib/utils/task-tokens.ts:insertToken <- src/lib/features/todoist-sync/task-line.logic.ts:197 in addTag call
sym src/lib/utils/task-tokens.ts:108 fn setDueToken(text: string, date: string | null): string L7 | Sets the `📅 YYYY-MM-DD` due date, or removes every one when `date` is null.
by src/lib/utils/task-tokens.ts:setDueToken <- src/lib/features/tasks/TasksView.svelte:555 in setRowDue call
by src/lib/utils/task-tokens.ts:setDueToken <- src/lib/features/todoist-sync/task-line.logic.ts:148 in setDueDate call
sym src/lib/utils/task-tokens.ts:122 fn setPriorityToken(text: string, emoji: PriorityEmoji | null): string L7 | Sets the priority emoji, or removes every one when `emoji` is null.
by src/lib/utils/task-tokens.ts:setPriorityToken <- src/lib/features/tasks/TasksView.svelte:562 in pickRowPriority call
by src/lib/utils/task-tokens.ts:setPriorityToken <- src/lib/features/todoist-sync/task-line.logic.ts:156 in setPriority call
## locals
local src/lib/utils/task-tokens.ts:52 fn removeSpan(text: string, start: number, end: number): string L7
local src/lib/utils/task-tokens.ts:74 fn removeAll(text: string, re: RegExp): string L3
local src/lib/utils/task-tokens.ts:79 fn insertBefore(text: string, index: number, token: string): string L4
## calls
call src/lib/utils/task-tokens.ts:70 in removeSpans -> src/lib/utils/task-tokens.ts:removeSpan call
call src/lib/utils/task-tokens.ts:75 in removeAll -> src/lib/utils/task-tokens.ts:removeSpans call
call src/lib/utils/task-tokens.ts:93 in insertToken -> src/lib/utils/task-tokens.ts:insertBefore call +1
call src/lib/utils/task-tokens.ts:109 in setDueToken -> src/lib/utils/task-tokens.ts:removeAll call
call src/lib/utils/task-tokens.ts:112 in setDueToken -> src/lib/utils/task-tokens.ts:insertToken call
call src/lib/utils/task-tokens.ts:123 in setPriorityToken -> src/lib/utils/task-tokens.ts:removeAll call +1
call src/lib/utils/task-tokens.ts:125 in setPriorityToken -> src/lib/utils/task-tokens.ts:insertToken call
