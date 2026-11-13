# file card src/lib/features/copy-block-link/copy-block-link.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/copy-block-link/copy-block-link.service.ts ' codemap/files
file src/lib/features/copy-block-link/copy-block-link.service.ts service L73 module src/lib/features/copy-block-link in2 t3
## imports
imp src/lib/features/copy-block-link/copy-block-link.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/copy-block-link/copy-block-link.service.ts:4 -> src/lib/utils/debug.ts error
imp src/lib/features/copy-block-link/copy-block-link.service.ts:5 -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts detectBlockElement,generateBlockId,buildWikilinkText,getNoteName
## imported-by
imp src/lib/app/commands.ts:31 -> src/lib/features/copy-block-link/copy-block-link.service.ts copyBlockLinkToClipboard,copyBlockEmbedToClipboard
imp src/lib/app/editor-host.ts:29 -> src/lib/features/copy-block-link/copy-block-link.service.ts copyBlockEmbedToClipboard,copyBlockLinkToClipboard
## reach
in2 src/lib/features/copy-block-link/copy-block-link.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/copy-block-link/copy-block-link.service.ts 9 files in 6 modules: src/lib/contracts(2) src/lib/core/editor(2) src/lib/core/settings(2) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) +1 modules
## tests
test src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts imports src/lib/features/copy-block-link/copy-block-link.service.ts mirror
test src/tests/lib/app/commands.test.ts mocks src/lib/features/copy-block-link/copy-block-link.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/features/copy-block-link/copy-block-link.service.ts
## symbols
sym src/lib/features/copy-block-link/copy-block-link.service.ts:17 fn copyBlockLink(view: EditorView, embed: boolean): Promise<void> L47 | Copies a wikilink (or embed) pointing to the block at the current cursor position.
sym src/lib/features/copy-block-link/copy-block-link.service.ts:66 fn copyBlockLinkToClipboard(view: EditorView): Promise<void> L3 | Copies a wikilink to the block at the current cursor position
by src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLinkToClipboard <- src/lib/app/commands.ts:385 in getBuiltInCommands call
by src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLinkToClipboard <- src/lib/app/editor-host.ts:214 in appBlockLinks ref
sym src/lib/features/copy-block-link/copy-block-link.service.ts:71 fn copyBlockEmbedToClipboard(view: EditorView): Promise<void> L3 | Copies an embed wikilink to the block at the current cursor position
by src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockEmbedToClipboard <- src/lib/app/commands.ts:395 in getBuiltInCommands call
by src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockEmbedToClipboard <- src/lib/app/editor-host.ts:215 in appBlockLinks ref
## calls
call src/lib/features/copy-block-link/copy-block-link.service.ts:27 in copyBlockLink -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:detectBlockElement call
call src/lib/features/copy-block-link/copy-block-link.service.ts:28 in copyBlockLink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:getNoteName call
call src/lib/features/copy-block-link/copy-block-link.service.ts:34 in copyBlockLink -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:buildWikilinkText call +1
call src/lib/features/copy-block-link/copy-block-link.service.ts:38 in copyBlockLink -> src/lib/utils/debug.ts:error call +1
call src/lib/features/copy-block-link/copy-block-link.service.ts:49 in copyBlockLink -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:generateBlockId call
call src/lib/features/copy-block-link/copy-block-link.service.ts:67 in copyBlockLinkToClipboard -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLink call
call src/lib/features/copy-block-link/copy-block-link.service.ts:72 in copyBlockEmbedToClipboard -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLink call
