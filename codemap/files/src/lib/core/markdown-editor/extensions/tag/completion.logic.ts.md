# file card src/lib/core/markdown-editor/extensions/tag/completion.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/tag/completion.logic.ts logic L102 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:1 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
## imported-by
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:4 -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts detectTagContext,rankTags
## reach
in2 src/lib/core/markdown-editor/extensions/tag/completion.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/tag/completion.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/tag/completion.logic.test.ts imports src/lib/core/markdown-editor/extensions/tag/completion.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:4 interface TagMatch L11 | A `#tag` being typed at the cursor.
sym src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:75 fn detectTagContext(docText: string, pos: number): TagMatch | null L15 | The tag being typed at `pos`, or null where no tag can start: after a non-space character (`foo#`), for a heading (`# `, `##`), inside inline code, a fenced co…
by src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:detectTagContext <- src/lib/core/markdown-editor/extensions/tag/completion.ts:21 in tagCompletionSource call
sym src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:96 fn rankTags<T extends { name: string; count: number }>(query: string, tags: readonly T[]): T[] L7 | The tags `query` fuzzy-matches (`utils/fuzzy-match.ts`, as wikilink completion uses), best match first, then the most-used, then by name.
by src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:rankTags <- src/lib/core/markdown-editor/extensions/tag/completion.ts:32 in tagCompletionSource call
## locals
local src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:41 fn endsInInlineCode(text: string): boolean L8
local src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:56 fn inFrontmatterOrFence(docText: string, lineStart: number): boolean L13
## calls
call src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:83 in detectTagContext -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:endsInInlineCode call
call src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:84 in detectTagContext -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:inFrontmatterOrFence call
call src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:98 in rankTags -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
