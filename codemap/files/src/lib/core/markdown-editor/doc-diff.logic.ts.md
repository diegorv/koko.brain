# file card src/lib/core/markdown-editor/doc-diff.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/doc-diff.logic.ts ' codemap/files
file src/lib/core/markdown-editor/doc-diff.logic.ts logic L157 module src/lib/core/markdown-editor in2 t1
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:48 -> src/lib/core/markdown-editor/doc-diff.logic.ts docDiff
imp src/lib/features/todoist-sync/note-writer.service.ts:6 -> src/lib/core/markdown-editor/doc-diff.logic.ts docDiff
## reach
in2 src/lib/core/markdown-editor/doc-diff.logic.ts 3 files in 2 modules: src/lib/features/todoist-sync(2) src/lib/app(1)
out2 src/lib/core/markdown-editor/doc-diff.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/doc-diff.logic.test.ts imports src/lib/core/markdown-editor/doc-diff.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/doc-diff.logic.ts:2 interface DocChange L8 | One replaced range in a change that turns one doc into another.
sym src/lib/core/markdown-editor/doc-diff.logic.ts:16 const DOC_DIFF_MAX_EDITS L1 | Most line insertions plus deletions `docDiff` looks for before it gives up.
sym src/lib/core/markdown-editor/doc-diff.logic.ts:27 fn docDiff(prev: string, next: string): DocChange[] | null L27 | The changes that turn `prev` into `next`: one per changed region (a run of changed lines, trimmed to its differing characters), ordered, with positions in `pre…
by src/lib/core/markdown-editor/doc-diff.logic.ts:docDiff <- src/lib/core/markdown-editor/MarkdownEditor.svelte:179 in replaceDoc call +2
by src/lib/core/markdown-editor/doc-diff.logic.ts:docDiff <- src/lib/features/todoist-sync/note-writer.service.ts:78 in writeToOpenTab call
## locals
local src/lib/core/markdown-editor/doc-diff.logic.ts:56 fn splitLines(s: string): string[] L12
local src/lib/core/markdown-editor/doc-diff.logic.ts:70 fn lineStarts(lines: string[]): number[] L5
local src/lib/core/markdown-editor/doc-diff.logic.ts:77 fn trim(old: string, insert: string, offset: number): DocChange L10
local src/lib/core/markdown-editor/doc-diff.logic.ts:100 fn diffLines(a: string[], b: string[]): Hunk[] | null L58
## calls
call src/lib/core/markdown-editor/doc-diff.logic.ts:29 in docDiff -> src/lib/core/markdown-editor/doc-diff.logic.ts:splitLines call +1
call src/lib/core/markdown-editor/doc-diff.logic.ts:39 in docDiff -> src/lib/core/markdown-editor/doc-diff.logic.ts:diffLines call
call src/lib/core/markdown-editor/doc-diff.logic.ts:43 in docDiff -> src/lib/core/markdown-editor/doc-diff.logic.ts:lineStarts call +1
call src/lib/core/markdown-editor/doc-diff.logic.ts:50 in docDiff -> src/lib/core/markdown-editor/doc-diff.logic.ts:trim call
