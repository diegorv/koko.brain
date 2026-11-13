# file card src/lib/core/markdown-editor/extensions/tag/completion.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/tag/completion.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/tag/completion.ts other L41 module src/lib/core/markdown-editor in2 t3
## imports
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:2 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:VaultTag
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:4 -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts detectTagContext,rankTags
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:21 -> src/lib/core/markdown-editor/extensions/tag/completion.ts tagCompletionSource
imp src/lib/plugins/quick-capture/composer-editor.ts:6 -> src/lib/core/markdown-editor/extensions/tag/completion.ts tagCompletionSource
## reach
in2 src/lib/core/markdown-editor/extensions/tag/completion.ts 4 files in 3 modules: src/lib/core/markdown-editor(2) src/lib/app(1) src/routes(1)
out2 src/lib/core/markdown-editor/extensions/tag/completion.ts 3 files in 3 modules: src/lib/core/filesystem(1) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts imports src/lib/core/markdown-editor/extensions/tag/completion.ts mirror
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/tag/completion.ts
test src/tests/lib/plugins/quick-capture/composer-editor-host.service.test.ts imports src/lib/core/markdown-editor/extensions/tag/completion.ts
## symbols
sym src/lib/core/markdown-editor/extensions/tag/completion.ts:14 fn tagCompletionSource(context: CompletionContext): Promise<CompletionResult | null> L28 | Completion source for `#tags`: the vault's tags (through `editorHost`) that the prefix typed after `#` fuzzy-matches, most-used first among equal matches.
by src/lib/core/markdown-editor/extensions/tag/completion.ts:tagCompletionSource <- src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions ref
by src/lib/core/markdown-editor/extensions/tag/completion.ts:tagCompletionSource <- src/lib/plugins/quick-capture/composer-editor.ts:112 in createComposerEditor ref
## calls
call src/lib/core/markdown-editor/extensions/tag/completion.ts:21 in tagCompletionSource -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:detectTagContext call
call src/lib/core/markdown-editor/extensions/tag/completion.ts:28 in tagCompletionSource -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
call src/lib/core/markdown-editor/extensions/tag/completion.ts:32 in tagCompletionSource -> src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:rankTags call
