# file card src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts logic L54 module src/lib/core/markdown-editor in5 t1
## imported-by
imp src/lib/app/editor-host.ts:20 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts findBlockIdPosition,findHeadingPosition
imp src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:3 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE,BLOCK_ID_RE,findHeadingPosition,findBlockIdPosition
imp src/lib/plugins/table-of-contents/toc.logic.ts:1 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts HEADING_RE
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts 7 files in 5 modules: src/lib/core/markdown-editor(3) src/lib/app(1) src/lib/features/copy-block-link(1) src/lib/plugins/kanban(1) src/lib/plugins/table-of-contents(1)
out2 src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/wikilink/navigation.logic.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:6 const HEADING_RE L1 | Regex matching any ATX heading: `# Title`, `## Title`, etc. Tolerates a trailing carriage return so headings are still matched when callers split CRLF (Windows…
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE <- src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:38 in detectBlockElement mcall
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE <- src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:96 in extractHeadingsFromContent mcall
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:HEADING_RE <- src/lib/plugins/table-of-contents/toc.logic.ts:77 in extractTocHeadings mcall
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:14 const BLOCK_ID_RE L1 | Regex matching a block-id marker at the end of a line: `text ^block-id`.
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:BLOCK_ID_RE <- src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:35 in detectBlockElement mcall
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:BLOCK_ID_RE <- src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:108 in extractBlockIdsFromContent mcall
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:21 fn findHeadingPosition(content: string, headingName: string): number | null L14 | Finds the document position of a heading by name.
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findHeadingPosition <- src/lib/app/editor-host.ts:44 in scrollToAnchor call
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findHeadingPosition <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:53 in followWikilinkInfo call
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:41 fn findBlockIdPosition(content: string, blockId: string): number | null L14 | Finds the document position of a block identified by `^block-id`.
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findBlockIdPosition <- src/lib/app/editor-host.ts:45 in scrollToAnchor call
by src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findBlockIdPosition <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:54 in followWikilinkInfo call
