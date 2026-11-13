# file card src/lib/features/tasks/task-headings.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-headings.logic.ts ' codemap/files
file src/lib/features/tasks/task-headings.logic.ts logic L71 module src/lib/features/tasks in2 t1
## imports
imp src/lib/features/tasks/task-headings.logic.ts:1 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/features/tasks/task-headings.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:TaskHeadingV2
## imported-by
imp src/lib/features/tasks/SourcesPanel.svelte:12 -> src/lib/features/tasks/task-headings.logic.ts type:HeadingMatchMode
imp src/lib/features/tasks/task-query.logic.ts:6 -> src/lib/features/tasks/task-headings.logic.ts headingChains,matchesHeading,type:HeadingMatchMode
## reach
in2 src/lib/features/tasks/task-headings.logic.ts 5 files in 1 modules: src/lib/features/tasks(5)
out2 src/lib/features/tasks/task-headings.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/tasks/task-headings.logic.test.ts imports src/lib/features/tasks/task-headings.logic.ts mirror
## symbols
sym src/lib/features/tasks/task-headings.logic.ts:9 type HeadingMatchMode L1 | How `matchesHeading` compares a tag with a heading: `'tag'` reads the heading's inline tags (the section rule), `'substring'` looks for the tag anywhere in the…
by src/lib/features/tasks/task-headings.logic.ts:HeadingMatchMode <- src/lib/features/tasks/SourcesPanel.svelte:12 in (script) import
by src/lib/features/tasks/task-headings.logic.ts:HeadingMatchMode <- src/lib/features/tasks/task-query.logic.ts:6 in (module) import
sym src/lib/features/tasks/task-headings.logic.ts:19 fn headingChains(taskHeadings?: readonly TaskHeadingV2[] | null): string[][] L10 | The ancestor chain of every heading of a note, from `NoteEntry.taskHeadings`.
by src/lib/features/tasks/task-headings.logic.ts:headingChains <- src/lib/features/tasks/task-query.logic.ts:248 in buildTaskRows call
sym src/lib/features/tasks/task-headings.logic.ts:63 fn matchesHeading(headings: readonly string[], tags: readonly string[], mode: HeadingMatchMode): boolean L9 | Whether any of `tags` matches any heading of a task's chain (`headingChains`), case-insensitive.
by src/lib/features/tasks/task-headings.logic.ts:matchesHeading <- src/lib/features/tasks/task-query.logic.ts:544 in clauseTest call
## locals
local src/lib/features/tasks/task-headings.logic.ts:35 fn activeTagNames(tags: readonly string[], mode: HeadingMatchMode): string[] L9
local src/lib/features/tasks/task-headings.logic.ts:46 fn headingHasTag(heading: string, name: string): boolean L6
## calls
call src/lib/features/tasks/task-headings.logic.ts:47 in headingHasTag -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/features/tasks/task-headings.logic.ts:64 in matchesHeading -> src/lib/features/tasks/task-headings.logic.ts:activeTagNames call
call src/lib/features/tasks/task-headings.logic.ts:67 in matchesHeading -> src/lib/features/tasks/task-headings.logic.ts:headingHasTag call
