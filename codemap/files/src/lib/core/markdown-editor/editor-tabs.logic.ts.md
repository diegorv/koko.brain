# file card src/lib/core/markdown-editor/editor-tabs.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/editor-tabs.logic.ts ' codemap/files
file src/lib/core/markdown-editor/editor-tabs.logic.ts logic L38 module src/lib/core/markdown-editor in1 t1
## imported-by
imp src/lib/core/markdown-editor/EditorTabs.svelte:35 -> src/lib/core/markdown-editor/editor-tabs.logic.ts countHiddenTabs,edgeFades
## reach
in2 src/lib/core/markdown-editor/editor-tabs.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/editor-tabs.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/editor-tabs.logic.test.ts imports src/lib/core/markdown-editor/editor-tabs.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/editor-tabs.logic.ts:2 interface Span L6 | A horizontal extent in viewport pixels, as `getBoundingClientRect` gives it.
sym src/lib/core/markdown-editor/editor-tabs.logic.ts:10 interface EdgeFades L6 | Which edges of the tab strip show a fade because tabs continue past them.
sym src/lib/core/markdown-editor/editor-tabs.logic.ts:27 fn edgeFades(scrollLeft: number, clientWidth: number, scrollWidth: number): EdgeFades L7 | The edge fades of a horizontally scrolling strip: none when it does not overflow, otherwise one at each end that has content scrolled past it.
by src/lib/core/markdown-editor/editor-tabs.logic.ts:edgeFades <- src/lib/core/markdown-editor/EditorTabs.svelte:73 in measure call
sym src/lib/core/markdown-editor/editor-tabs.logic.ts:36 fn countHiddenTabs(scroller: Span, tabs: readonly Span[]): number L3 | How many tabs extend more than 4 px past either edge of the scroller.
by src/lib/core/markdown-editor/editor-tabs.logic.ts:countHiddenTabs <- src/lib/core/markdown-editor/EditorTabs.svelte:75 in measure call
