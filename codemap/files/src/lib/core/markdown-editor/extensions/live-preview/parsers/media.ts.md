# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts other L92 module src/lib/core/markdown-editor in3 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts findMediaBlock
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts findMediaBlock
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts type:MediaTag
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts 7 files in 1 modules: src/lib/core/markdown-editor(7)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/media.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:2 type MediaTag L1 | HTML media tag rendered by the live-preview media plugins
by src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:MediaTag <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:7 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:5 interface MediaBlockInfo L12 | Information about an `<audio>` / `<video>` HTML block
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:36 fn findMediaBlock(lines: { text: string; from: number; to: number }[], startIdx: number, tag: MediaTag): { block: MediaBlockInfo; endIdx… L57 | Finds an `<audio>` / `<video>` HTML block starting at the given index in the lines array.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:findMediaBlock <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:19 in computeAudioBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:findMediaBlock <- src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:19 in computeVideoBlocks call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:25 fn extractSrcAttr(text: string): string | null L4
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:49 in findMediaBlock -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:extractSrcAttr call +1
