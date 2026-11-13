# file card src/lib/features/todoist-sync/task-line.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/task-line.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/todoist-sync/task-line.logic.ts logic L287 module src/lib/features/todoist-sync in6 t1 | Token patches on a raw task line: each one changes a single field and keeps every other character of the line.
## imports
imp src/lib/features/todoist-sync/task-line.logic.ts:12 -> src/lib/utils/tag-extraction.ts findInlineTags,INLINE_TAG_NAME_SOURCE
imp src/lib/features/todoist-sync/task-line.logic.ts:13 -> src/lib/utils/task-tokens.ts insertToken,removeSpans,setDueToken,setPriorityToken,trailingBlockId,type:PriorityEmoji,type:Span
imp src/lib/features/todoist-sync/task-line.logic.ts:15 -> src/lib/utils/task-tokens.ts PRIORITY_EMOJIS,trailingBlockId,type:PriorityEmoji
## imported-by
imp src/lib/features/todoist-sync/completion.logic.ts:11 -> src/lib/features/todoist-sync/task-line.logic.ts addTag,isClosedStatus,nextStatusChar,removeTag,replaceDescription,setDueDate,setPriority,setTaskStatus,taskLineStatus,taskLineText,type:PriorityEmoji,type:TaskLineState
imp src/lib/features/todoist-sync/create.logic.ts:14 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,isClosedStatus,taskLineText
imp src/lib/features/todoist-sync/fields.logic.ts:22 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,replaceDescription,trailingBlockId,type:PriorityEmoji
imp src/lib/features/todoist-sync/pull.logic.ts:15 -> src/lib/features/todoist-sync/task-line.logic.ts contentRoundTripProblem,hasSignifier,isTaskTagName,taskLineStatus,taskLineText,type:PriorityEmoji,type:RoundTripProblem
imp src/lib/features/todoist-sync/sections.logic.ts:15 -> src/lib/features/todoist-sync/task-line.logic.ts taskLineText
imp src/lib/features/todoist-sync/sync-now.service.ts:89 -> src/lib/features/todoist-sync/task-line.logic.ts taskLineText
## reach
in2 src/lib/features/todoist-sync/task-line.logic.ts 7 files in 1 modules: src/lib/features/todoist-sync(7)
out2 src/lib/features/todoist-sync/task-line.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/todoist-sync/task-line.logic.test.ts imports src/lib/features/todoist-sync/task-line.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/task-line.logic.ts:15 reexport PRIORITY_EMOJIS = src/lib/utils/task-tokens.ts:PRIORITY_EMOJIS L1
sym src/lib/features/todoist-sync/task-line.logic.ts:15 reexport PriorityEmoji = src/lib/utils/task-tokens.ts:PriorityEmoji L1
sym src/lib/features/todoist-sync/task-line.logic.ts:15 reexport trailingBlockId = src/lib/utils/task-tokens.ts:trailingBlockId L1
sym src/lib/features/todoist-sync/task-line.logic.ts:18 type TaskLineState L1 | Whether a task line is set open or closed.
by src/lib/features/todoist-sync/task-line.logic.ts:TaskLineState <- src/lib/features/todoist-sync/completion.logic.ts:23 in (module) import
sym src/lib/features/todoist-sync/task-line.logic.ts:21 type DescriptionPatch L3 | Result of a description replace: the new line, or why it was refused.
sym src/lib/features/todoist-sync/task-line.logic.ts:26 type RoundTripProblem L1 | Why Todoist content would not survive a write into a line and a parse back.
by src/lib/features/todoist-sync/task-line.logic.ts:RoundTripProblem <- src/lib/features/todoist-sync/pull.logic.ts:22 in (module) import
sym src/lib/features/todoist-sync/task-line.logic.ts:97 fn taskLineText(line: string): string | null L3 | The text of a task line after `[ ] ` (Rust `Task.text`), or null when the line is no task.
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineText <- src/lib/features/todoist-sync/completion.logic.ts:331 in applyLineChange call
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineText <- src/lib/features/todoist-sync/create.logic.ts:393 in addAnchor call
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineText <- src/lib/features/todoist-sync/pull.logic.ts:289 in extractTaskLines call
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineText <- src/lib/features/todoist-sync/sections.logic.ts:73 in noteOutline call
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineText <- src/lib/features/todoist-sync/sync-now.service.ts:1090 in writeBatches call
sym src/lib/features/todoist-sync/task-line.logic.ts:102 fn taskLineStatus(line: string): string | null L3 | The status char of a task line, or null when the line is no task.
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineStatus <- src/lib/features/todoist-sync/completion.logic.ts:330 in applyLineChange call
by src/lib/features/todoist-sync/task-line.logic.ts:taskLineStatus <- src/lib/features/todoist-sync/pull.logic.ts:290 in extractTaskLines call
sym src/lib/features/todoist-sync/task-line.logic.ts:107 fn isClosedStatus(status: string): boolean L3 | Whether a status char means closed (design rule 5): `x`, `X` or `-`.
by src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus <- src/lib/features/todoist-sync/completion.logic.ts:170 in planCompletion call +5
by src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus <- src/lib/features/todoist-sync/create.logic.ts:166 in planCreates call
sym src/lib/features/todoist-sync/task-line.logic.ts:115 fn nextStatusChar(status: string, state: TaskLineState): string L5 | The status char setTaskStatus writes over `status`: closing keeps `x`, `X` and `-`, otherwise `x`; opening keeps ` / ? ! >`, otherwise a space.
by src/lib/features/todoist-sync/task-line.logic.ts:nextStatusChar <- src/lib/features/todoist-sync/completion.logic.ts:212 in planCompletion call +1
sym src/lib/features/todoist-sync/task-line.logic.ts:137 fn setTaskStatus(line: string, state: TaskLineState): string | null L5 | Sets the status char per design rule 5.
by src/lib/features/todoist-sync/task-line.logic.ts:setTaskStatus <- src/lib/features/todoist-sync/completion.logic.ts:339 in applyLineChange call
sym src/lib/features/todoist-sync/task-line.logic.ts:147 fn setDueDate(line: string, date: string | null): string | null L3 | Sets the `📅 YYYY-MM-DD` due date of a task line, or removes every one when `date` is null (`setDueToken`).
by src/lib/features/todoist-sync/task-line.logic.ts:setDueDate <- src/lib/features/todoist-sync/completion.logic.ts:340 in applyLineChange call
sym src/lib/features/todoist-sync/task-line.logic.ts:155 fn setPriority(line: string, emoji: PriorityEmoji | null): string | null L3 | Sets the priority emoji of a task line, or removes every one when `emoji` is null (`setPriorityToken`).
by src/lib/features/todoist-sync/task-line.logic.ts:setPriority <- src/lib/features/todoist-sync/completion.logic.ts:341 in applyLineChange call
sym src/lib/features/todoist-sync/task-line.logic.ts:164 fn isTaskTagName(name: string): boolean L3 | Whether `#name` is read back as exactly the tag `name` (design rule 8): a letter or `_` first, then letters, digits, `_`, `/` and `-`, no trailing `/`.
by src/lib/features/todoist-sync/task-line.logic.ts:isTaskTagName <- src/lib/features/todoist-sync/pull.logic.ts:327 in mappedLabels call
sym src/lib/features/todoist-sync/task-line.logic.ts:195 fn addTag(line: string, tag: string): string | null L4 | Adds `#tag` before the anchor (or at the end).
by src/lib/features/todoist-sync/task-line.logic.ts:addTag <- src/lib/features/todoist-sync/completion.logic.ts:343 in applyLineChange call
sym src/lib/features/todoist-sync/task-line.logic.ts:206 fn removeTag(line: string, tag: string): string | null L4 | Removes every `#tag` the parser reads outside a link, case-insensitively.
by src/lib/features/todoist-sync/task-line.logic.ts:removeTag <- src/lib/features/todoist-sync/completion.logic.ts:342 in applyLineChange call
sym src/lib/features/todoist-sync/task-line.logic.ts:246 fn replaceDescription(line: string, description: string): DescriptionPatch | null L15 | Replaces the description words of a task line (design rule 4).
by src/lib/features/todoist-sync/task-line.logic.ts:replaceDescription <- src/lib/features/todoist-sync/completion.logic.ts:335 in applyLineChange call
by src/lib/features/todoist-sync/task-line.logic.ts:replaceDescription <- src/lib/features/todoist-sync/fields.logic.ts:260 in planLink call
sym src/lib/features/todoist-sync/task-line.logic.ts:269 fn contentRoundTripProblem(content: string): RoundTripProblem | null L8 | Reports whether Todoist content, written as a line's description and parsed back, would come out changed, without calling the parser: a newline, any `#`, a sig…
by src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem <- src/lib/features/todoist-sync/create.logic.ts:178 in planCreates call
by src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem <- src/lib/features/todoist-sync/fields.logic.ts:245 in planLink call +4
by src/lib/features/todoist-sync/task-line.logic.ts:contentRoundTripProblem <- src/lib/features/todoist-sync/pull.logic.ts:354 in pulledTask call
sym src/lib/features/todoist-sync/task-line.logic.ts:285 fn hasSignifier(text: string): boolean L3 | Whether the text holds a signifier emoji (`🆔` included), whatever other round-trip problem it has: a line holding one would parse back with metadata or an anc…
by src/lib/features/todoist-sync/task-line.logic.ts:hasSignifier <- src/lib/features/todoist-sync/pull.logic.ts:383 in isSafeRecurrenceText call +1
## locals
local src/lib/features/todoist-sync/task-line.logic.ts:85 fn splitTaskLine(line: string): TaskLineParts | null L7
local src/lib/features/todoist-sync/task-line.logic.ts:121 fn joinTaskLine(parts: TaskLineParts): string L3
local src/lib/features/todoist-sync/task-line.logic.ts:126 fn patchText(line: string, patch: (text: string) => string): string | null L5
local src/lib/features/todoist-sync/task-line.logic.ts:180 fn tagMatches(text: string, tag: string): Span[] L5
local src/lib/features/todoist-sync/task-line.logic.ts:186 fn assertTagName(tag: string): void L3
local src/lib/features/todoist-sync/task-line.logic.ts:211 fn tokenKind(groups: Record<string, string | undefined>): TokenKind L6
local src/lib/features/todoist-sync/task-line.logic.ts:219 fn tokenize(text: string): Token[] L16
## calls
call src/lib/features/todoist-sync/task-line.logic.ts:98 in taskLineText -> src/lib/features/todoist-sync/task-line.logic.ts:splitTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:103 in taskLineStatus -> src/lib/features/todoist-sync/task-line.logic.ts:splitTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:116 in nextStatusChar -> src/lib/features/todoist-sync/task-line.logic.ts:isClosedStatus call
call src/lib/features/todoist-sync/task-line.logic.ts:127 in patchText -> src/lib/features/todoist-sync/task-line.logic.ts:splitTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:129 in patchText -> src/lib/features/todoist-sync/task-line.logic.ts:joinTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:138 in setTaskStatus -> src/lib/features/todoist-sync/task-line.logic.ts:splitTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:140 in setTaskStatus -> src/lib/features/todoist-sync/task-line.logic.ts:joinTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:140 in setTaskStatus -> src/lib/features/todoist-sync/task-line.logic.ts:nextStatusChar call
call src/lib/features/todoist-sync/task-line.logic.ts:148 in setDueDate -> src/lib/features/todoist-sync/task-line.logic.ts:patchText call
call src/lib/features/todoist-sync/task-line.logic.ts:148 in setDueDate -> src/lib/utils/task-tokens.ts:setDueToken call
call src/lib/features/todoist-sync/task-line.logic.ts:156 in setPriority -> src/lib/features/todoist-sync/task-line.logic.ts:patchText call
call src/lib/features/todoist-sync/task-line.logic.ts:156 in setPriority -> src/lib/utils/task-tokens.ts:setPriorityToken call
call src/lib/features/todoist-sync/task-line.logic.ts:165 in isTaskTagName -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/features/todoist-sync/task-line.logic.ts:183 in tagMatches -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/features/todoist-sync/task-line.logic.ts:187 in assertTagName -> src/lib/features/todoist-sync/task-line.logic.ts:isTaskTagName call
call src/lib/features/todoist-sync/task-line.logic.ts:196 in addTag -> src/lib/features/todoist-sync/task-line.logic.ts:assertTagName call
call src/lib/features/todoist-sync/task-line.logic.ts:197 in addTag -> src/lib/features/todoist-sync/task-line.logic.ts:patchText call
call src/lib/features/todoist-sync/task-line.logic.ts:197 in addTag -> src/lib/features/todoist-sync/task-line.logic.ts:tagMatches call
call src/lib/features/todoist-sync/task-line.logic.ts:197 in addTag -> src/lib/utils/task-tokens.ts:insertToken call
call src/lib/features/todoist-sync/task-line.logic.ts:207 in removeTag -> src/lib/features/todoist-sync/task-line.logic.ts:assertTagName call
call src/lib/features/todoist-sync/task-line.logic.ts:208 in removeTag -> src/lib/features/todoist-sync/task-line.logic.ts:patchText call
call src/lib/features/todoist-sync/task-line.logic.ts:208 in removeTag -> src/lib/features/todoist-sync/task-line.logic.ts:tagMatches call
call src/lib/features/todoist-sync/task-line.logic.ts:208 in removeTag -> src/lib/utils/task-tokens.ts:removeSpans call
call src/lib/features/todoist-sync/task-line.logic.ts:229 in tokenize -> src/lib/features/todoist-sync/task-line.logic.ts:tokenKind call
call src/lib/features/todoist-sync/task-line.logic.ts:247 in replaceDescription -> src/lib/features/todoist-sync/task-line.logic.ts:splitTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:249 in replaceDescription -> src/lib/features/todoist-sync/task-line.logic.ts:tokenize call
call src/lib/features/todoist-sync/task-line.logic.ts:250 in replaceDescription -> src/lib/utils/task-tokens.ts:trailingBlockId call
call src/lib/features/todoist-sync/task-line.logic.ts:259 in replaceDescription -> src/lib/features/todoist-sync/task-line.logic.ts:joinTaskLine call
call src/lib/features/todoist-sync/task-line.logic.ts:273 in contentRoundTripProblem -> src/lib/features/todoist-sync/task-line.logic.ts:hasSignifier call
