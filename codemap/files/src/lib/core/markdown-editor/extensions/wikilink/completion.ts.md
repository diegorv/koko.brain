# file card src/lib/core/markdown-editor/extensions/wikilink/completion.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/completion.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/completion.ts other L229 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:3 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2,type:FrontmatterValue
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:7 -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts detectWikilinkContext,matchFilesForWikilink,extractHeadingsFromContent,extractBlockIdsFromContent
## imported-by
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts wikilinkCompletionSource
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/completion.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/wikilink/completion.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/completion.ts
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/completion.ts
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/completion.ts:43 fn wikilinkCompletionSource(context: CompletionContext): Promise<CompletionResult | null> L17 | Completion source for `[[wikilinks]]` (files, aliases, headings, block IDs).
by src/lib/core/markdown-editor/extensions/wikilink/completion.ts:wikilinkCompletionSource <- src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions ref
## locals
local src/lib/core/markdown-editor/extensions/wikilink/completion.ts:15 fn resolveTargetContent(host: EditorHost, target: string): Promise<string | null> L10
local src/lib/core/markdown-editor/extensions/wikilink/completion.ts:27 fn getAliasesFromEntry(entry: NoteEntryV2): string[] L10
local src/lib/core/markdown-editor/extensions/wikilink/completion.ts:62 fn buildFileCompletions(match: ReturnType<typeof detectWikilinkContext> & {}, context: CompletionContext): Promise<CompletionResult | null> L63
local src/lib/core/markdown-editor/extensions/wikilink/completion.ts:127 fn buildHeadingCompletions(match: ReturnType<typeof detectWikilinkContext> & {}, context: CompletionContext): Promise<CompletionResult | null> L50
local src/lib/core/markdown-editor/extensions/wikilink/completion.ts:179 fn buildBlockIdCompletions(match: ReturnType<typeof detectWikilinkContext> & {}, context: CompletionContext): Promise<CompletionResult | null> L50
## calls
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:21 in resolveTargetContent -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:47 in wikilinkCompletionSource -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:detectWikilinkContext call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:51 in wikilinkCompletionSource -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:buildHeadingCompletions call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:55 in wikilinkCompletionSource -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:buildBlockIdCompletions call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:58 in wikilinkCompletionSource -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:buildFileCompletions call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:71 in buildFileCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:matchFilesForWikilink call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:88 in buildFileCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:getAliasesFromEntry call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:90 in buildFileCompletions -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:92 in buildFileCompletions -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:139 in buildHeadingCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:resolveTargetContent call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:143 in buildHeadingCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:extractHeadingsFromContent call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:149 in buildHeadingCompletions -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:191 in buildBlockIdCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:resolveTargetContent call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:195 in buildBlockIdCompletions -> src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:extractBlockIdsFromContent call
call src/lib/core/markdown-editor/extensions/wikilink/completion.ts:201 in buildBlockIdCompletions -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
