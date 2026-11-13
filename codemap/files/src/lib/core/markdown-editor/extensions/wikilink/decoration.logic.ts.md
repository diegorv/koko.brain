# file card src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts logic L128 module src/lib/core/markdown-editor in6 t14
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:2 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkRanges
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:8 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts WIKILINK_DECORATION_RE,findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:9 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkRanges
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:3 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:4 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts type:WikilinkInfo
imp src/lib/core/markdown-editor/wikilink-click-target.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts 13 files in 1 modules: src/lib/core/markdown-editor(13)
out2 src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/wikilink/decoration.logic.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-footnote.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-heading-inline.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-highlight-comment.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-nesting.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-table-meta-bind.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:2 const WIKILINK_DECORATION_RE L2 | Matches wikilinks: `[[target]]`, `[[target#heading]]`, `[[target|display]]`, `[[#heading]]`
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:WIKILINK_DECORATION_RE <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:323 in renderCellContent assign +1
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:6 interface WikilinkDecorationRange L16 | Parsed positions for a single wikilink match
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:24 fn findWikilinkRanges(text: string, offset: number): WikilinkDecorationRange[] L64 | Finds all wikilink ranges in a line of text
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkRanges <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:20 in wikilinkHandler.decorate call
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkRanges <- src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:22 in buildDecorations call
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:90 interface WikilinkInfo L5 | Full wikilink info including target, heading, and block-id
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:WikilinkInfo <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:6 in (module) import
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:97 fn findWikilinkInfoAtPosition(lineText: string, lineFrom: number, docPos: number): WikilinkInfo | null L32 | Returns full wikilink info (target + heading/blockId) at a given document position, or null
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:347 in renderCellContent call
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:108 in executeButtonAction call
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:32 in followWikilinkClick call
by src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition <- src/lib/core/markdown-editor/wikilink-click-target.ts:80 in resolveWikilinkClickPosition call
