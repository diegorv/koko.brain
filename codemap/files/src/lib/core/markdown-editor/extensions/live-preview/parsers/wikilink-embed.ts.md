# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts other L72 module src/lib/core/markdown-editor in1 t8
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts findWikilinkEmbedRanges
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-blockquote-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-callout.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-edge-cases.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-heading-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-math-block-ref.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:7 const WIKILINK_EMBED_RE L2 | Matches wikilink embeds: `![[target]]`, `![[target#heading]]`, `![[target#^block]]`, `![[target|size]]`
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:11 type WikilinkEmbedType L1 | Type of wikilink embed
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:14 interface WikilinkEmbedRange L16 | Parsed range for a single wikilink embed match
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:32 fn isImageEmbed(target: string): boolean L6 | Returns true if the target filename has an image extension
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:40 fn findWikilinkEmbedRanges(text: string, offset: number): WikilinkEmbedRange[] L33 | Finds all wikilink embed ranges in a line of text
by src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:findWikilinkEmbedRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:76 in buildWikilinkEmbedDecorations call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:67 in findWikilinkEmbedRanges -> src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts:isImageEmbed call
