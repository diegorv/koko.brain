# file card src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts ' codemap/files
file src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts logic L92 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE
imp src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:2 -> src/lib/core/filesystem/wikilink-resolution.logic.ts getNoteName
## imported-by
imp src/lib/features/copy-block-link/copy-block-link.service.ts:5 -> src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts detectBlockElement,generateBlockId,buildWikilinkText,getNoteName
## reach
in2 src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.test.ts imports src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:5 type BlockElementType L1 | The kind of markdown element detected on a line
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:8 interface DetectedBlockElement L8 | Result of analyzing a line for copy-block-link
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:34 fn detectBlockElement(lineText: string): DetectedBlockElement L20 | Detects the type of markdown element on a given line.
by src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:detectBlockElement <- src/lib/features/copy-block-link/copy-block-link.service.ts:27 in copyBlockLink call
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:59 fn generateBlockId(): string L6 | Generates a random 6-character alphanumeric block ID.
by src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:generateBlockId <- src/lib/features/copy-block-link/copy-block-link.service.ts:49 in copyBlockLink call
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:71 fn buildWikilinkText(noteName: string, element: DetectedBlockElement, blockId: string | null, embed: boolean): string L16 | Builds a wikilink string for the given element.
by src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:buildWikilinkText <- src/lib/features/copy-block-link/copy-block-link.service.ts:34 in copyBlockLink call +1
## calls
call src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:35 in detectBlockElement -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:BLOCK_ID_RE mcall
call src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:38 in detectBlockElement -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE mcall
