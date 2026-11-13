# file card src/lib/core/markdown-editor/extensions/wikilink/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/index.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/index.ts other L5 module src/lib/core/markdown-editor in2 t0
## imports
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts wikilinkCompletionSource
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:2 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts wikilinkDecoration
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:3 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:4 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts type:WikilinkInfo
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE,findHeadingPosition,findBlockIdPosition
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:6 -> src/lib/core/markdown-editor/extensions/wikilink/index.ts findWikilinkInfoAtPosition,findHeadingPosition,findBlockIdPosition,type:WikilinkInfo
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:19 -> src/lib/core/markdown-editor/extensions/wikilink/index.ts wikilinkCompletionSource,wikilinkDecoration
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/index.ts 6 files in 2 modules: src/lib/core/markdown-editor(4) src/lib/app(2)
out2 src/lib/core/markdown-editor/extensions/wikilink/index.ts 6 files in 4 modules: src/lib/core/markdown-editor(3) src/lib/core/filesystem(1) src/lib/types(1) src/lib/utils(1)
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:1 reexport wikilinkCompletionSource = src/lib/core/markdown-editor/extensions/wikilink/completion.ts:wikilinkCompletionSource L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:2 reexport wikilinkDecoration = src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:wikilinkDecoration L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:3 reexport findWikilinkInfoAtPosition = src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:4 reexport WikilinkInfo = src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:WikilinkInfo L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 reexport BLOCK_ID_RE = src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:BLOCK_ID_RE L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 reexport HEADING_RE = src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 reexport findBlockIdPosition = src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findBlockIdPosition L1
sym src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 reexport findHeadingPosition = src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findHeadingPosition L1
