# file card src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts logic L114 module src/lib/core/markdown-editor in2 t1
## imports
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:1 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:3 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE
## imported-by
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:7 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts detectWikilinkContext,matchFilesForWikilink,extractHeadingsFromContent,extractBlockIdsFromContent
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:2 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts detectWikilinkContext
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:3 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts matchFilesForWikilink
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts 3 files in 2 modules: src/lib/plugins/kanban(2) src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts 1 files in 1 modules: src/lib/core/filesystem(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/wikilink/completion.logic.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:6 type WikilinkMode L1 | Completion mode: what kind of suggestions to show
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:8 interface WikilinkMatch L9
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:26 fn detectWikilinkContext(docText: string, pos: number): WikilinkMatch | null L47 | Detects whether the cursor is inside a `[[...]]` wikilink and determines the completion mode (file, heading, or blockId).
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:detectWikilinkContext <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:47 in wikilinkCompletionSource call
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:detectWikilinkContext <- src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:23 in context=$derived call
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:75 fn matchFilesForWikilink(query: string, files: readonly FileEntry[]): FileEntry[] L16 | Matches files by fuzzy-matching the query against file names
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:matchFilesForWikilink <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:71 in buildFileCompletions call
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:matchFilesForWikilink <- src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:29 in files=$derived call
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:93 fn extractHeadingsFromContent(content: string): string[] L10 | Extracts all ATX heading texts from markdown content
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:extractHeadingsFromContent <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:143 in buildHeadingCompletions call
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:105 fn extractBlockIdsFromContent(content: string): string[] L10 | Extracts all block ID markers (`^block-id`) from markdown content
by src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:extractBlockIdsFromContent <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:195 in buildBlockIdCompletions call
## calls
call src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:81 in matchFilesForWikilink -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
call src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:96 in extractHeadingsFromContent -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE mcall
call src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:108 in extractBlockIdsFromContent -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:BLOCK_ID_RE mcall
