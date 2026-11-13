# file card src/lib/features/todoist-sync/task-line-edits.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/task-line-edits.logic.ts ' codemap/files
file src/lib/features/todoist-sync/task-line-edits.logic.ts logic L215 module src/lib/features/todoist-sync in3 t2 | The guarded task-line batch applied to a string, for notes open in a tab.
## imports
imp src/lib/features/todoist-sync/task-line-edits.logic.ts:9 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale,type:TaskLinesStaleReason
imp src/lib/features/todoist-sync/task-line-edits.logic.ts:10 -> src/lib/features/todoist-sync/anchor.logic.ts idValues
## imported-by
imp src/lib/features/todoist-sync/note-writer.service.ts:10 -> src/lib/features/todoist-sync/task-line-edits.logic.ts applyTaskLineEdits
imp src/lib/features/todoist-sync/pull.logic.ts:14 -> src/lib/features/todoist-sync/task-line-edits.logic.ts codeFence
imp src/lib/features/todoist-sync/sections.logic.ts:14 -> src/lib/features/todoist-sync/task-line-edits.logic.ts codeFence,headingIndexes
## reach
in2 src/lib/features/todoist-sync/task-line-edits.logic.ts 10 files in 1 modules: src/lib/features/todoist-sync(10)
out2 src/lib/features/todoist-sync/task-line-edits.logic.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/todoist-sync/task-line-edits.logic.test.ts imports src/lib/features/todoist-sync/task-line-edits.logic.ts mirror
test src/tests/fixtures/todoist-vault.fake.ts imports src/lib/features/todoist-sync/task-line-edits.logic.ts
## symbols
sym src/lib/features/todoist-sync/task-line-edits.logic.ts:13 type TaskLineEditOutcome L5 | Result of applyTaskLineEdits.
sym src/lib/features/todoist-sync/task-line-edits.logic.ts:44 fn applyTaskLineEdits(content: string, edits: TaskLineEdits): TaskLineEditOutcome L49 | Applies `edits` to `content`.
by src/lib/features/todoist-sync/task-line-edits.logic.ts:applyTaskLineEdits <- src/lib/features/todoist-sync/note-writer.service.ts:72 in writeToOpenTab call
sym src/lib/features/todoist-sync/task-line-edits.logic.ts:179 fn codeFence(line: string): string | null L6 | Rust `detect_code_fence`: the fence marker a line opens or closes, if any.
by src/lib/features/todoist-sync/task-line-edits.logic.ts:codeFence <- src/lib/features/todoist-sync/pull.logic.ts:282 in extractTaskLines call
by src/lib/features/todoist-sync/task-line-edits.logic.ts:codeFence <- src/lib/features/todoist-sync/sections.logic.ts:66 in noteOutline call
sym src/lib/features/todoist-sync/task-line-edits.logic.ts:187 fn headingIndexes(lines: readonly string[]): [number, number, string][] L21 | `[index, level, trimmed text]` of every heading outside frontmatter and code fences.
by src/lib/features/todoist-sync/task-line-edits.logic.ts:headingIndexes <- src/lib/features/todoist-sync/sections.logic.ts:52 in noteOutline call
## locals
local src/lib/features/todoist-sync/task-line-edits.logic.ts:94 fn validate(edits: TaskLineEdits): void L27
local src/lib/features/todoist-sync/task-line-edits.logic.ts:123 fn locate(lines: readonly string[], anchor: string, expected: string): number | TaskLinesStale L7
local src/lib/features/todoist-sync/task-line-edits.logic.ts:132 fn locateUnanchored(lines: readonly string[], lineNumber: number, anchor: string, expected: string): number | TaskLinesStale L6
local src/lib/features/todoist-sync/task-line-edits.logic.ts:143 fn sectionEnd(lines: readonly string[], heading: string): number | TaskLinesStale L7
local src/lib/features/todoist-sync/task-line-edits.logic.ts:152 fn uniqueHeading(headings: readonly [number, number, string][], heading: string): number | TaskLinesStale L6
local src/lib/features/todoist-sync/task-line-edits.logic.ts:164 fn beforeSections(lines: readonly string[]): number L5
local src/lib/features/todoist-sync/task-line-edits.logic.ts:171 fn afterLastNonBlank(lines: readonly string[], from: number, to: number): number | undefined L6
local src/lib/features/todoist-sync/task-line-edits.logic.ts:209 fn stale(reason: TaskLinesStaleReason, subject: string): TaskLinesStale L3
local src/lib/features/todoist-sync/task-line-edits.logic.ts:213 fn staleOutcome(reason: TaskLinesStaleReason, subject: string): TaskLineEditOutcome L3
## calls
call src/lib/features/todoist-sync/task-line-edits.logic.ts:45 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:validate call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:48 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:staleOutcome call +2
call src/lib/features/todoist-sync/task-line-edits.logic.ts:52 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:headingIndexes call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:52 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:uniqueHeading call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:67 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:locate call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:67 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:locateUnanchored call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:77 in applyTaskLineEdits -> src/lib/features/todoist-sync/anchor.logic.ts:idValues ref +1
call src/lib/features/todoist-sync/task-line-edits.logic.ts:83 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:afterLastNonBlank call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:83 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:beforeSections call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:85 in applyTaskLineEdits -> src/lib/features/todoist-sync/task-line-edits.logic.ts:sectionEnd call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:104 in validate -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call +1
call src/lib/features/todoist-sync/task-line-edits.logic.ts:124 in locate -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:125 in locate -> src/lib/features/todoist-sync/task-line-edits.logic.ts:stale call +2
call src/lib/features/todoist-sync/task-line-edits.logic.ts:134 in locateUnanchored -> src/lib/features/todoist-sync/task-line-edits.logic.ts:stale call +1
call src/lib/features/todoist-sync/task-line-edits.logic.ts:135 in locateUnanchored -> src/lib/features/todoist-sync/anchor.logic.ts:idValues call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:144 in sectionEnd -> src/lib/features/todoist-sync/task-line-edits.logic.ts:headingIndexes call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:145 in sectionEnd -> src/lib/features/todoist-sync/task-line-edits.logic.ts:uniqueHeading call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:148 in sectionEnd -> src/lib/features/todoist-sync/task-line-edits.logic.ts:afterLastNonBlank call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:154 in uniqueHeading -> src/lib/features/todoist-sync/task-line-edits.logic.ts:stale call +1
call src/lib/features/todoist-sync/task-line-edits.logic.ts:165 in beforeSections -> src/lib/features/todoist-sync/task-line-edits.logic.ts:headingIndexes call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:166 in beforeSections -> src/lib/features/todoist-sync/task-line-edits.logic.ts:afterLastNonBlank call +1
call src/lib/features/todoist-sync/task-line-edits.logic.ts:196 in headingIndexes -> src/lib/features/todoist-sync/task-line-edits.logic.ts:codeFence call
call src/lib/features/todoist-sync/task-line-edits.logic.ts:214 in staleOutcome -> src/lib/features/todoist-sync/task-line-edits.logic.ts:stale call
