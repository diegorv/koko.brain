# file card src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts other L203 module src/lib/core/markdown-editor in2 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:3 -> src/lib/core/markdown-editor/wikilink-click-target.ts TABLE_WIDGET_CLASS
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts bandDragHead,blockBandClick
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts soleBlockWidget
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:12 interface BandTarget L4 | Where a press in a block widget's blank band sends the cursor: a document position on the visible line next to the block, or `null` to keep the selection as it…
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:18 type BandPress L1 | The parts of a mouse event `bandClickTarget` reads.
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:26 fn soleBlockWidget(line: Element): HTMLElement | null L16 | The one block-level widget element a `.cm-line` holds, when the line holds nothing else but CodeMirror's `cm-widgetBuffer` images; otherwise `null`.
by src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:soleBlockWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:71 in isBlockWidgetLine call
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:87 fn bandClickTarget(view: EditorView, event: BandPress): BandTarget | null L26 | Decides whether a press lands in the blank band above or below a block widget.
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:125 const blockBandClick = EditorView.mouseSelectionStyle.of(…) L21 | Mouse selection for a press in a block widget's blank band (see `bandClickTarget`): the press puts the cursor on the line next to the block, shift extends the …
by src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:blockBandClick <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:84 in livePreviewExtensions ref
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:172 const bandDragHead = Prec.lowest(…) L32 | Mouse selection for a plain single click that no other style takes (a press on text, not in a band): CodeMirror's default single-click selection (a hand copy o…
by src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:bandDragHead <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:85 in livePreviewExtensions ref
## locals
local src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:44 fn visibleSibling(line: Element, dir: -1 | 1): Element | null L7
local src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:53 fn lastVisibleChild(view: EditorView): Element | null L4
local src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:59 fn lineAtY(view: EditorView, clientY: number): Element | null L8
local src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:153 fn blockEdge(view: EditorView, target: Element, bandPos: number): number L6
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:55 in lastVisibleChild -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:visibleSibling call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:91 in bandClickTarget -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:lineAtY call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:92 in bandClickTarget -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:soleBlockWidget call +3
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:93 in bandClickTarget -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:lastVisibleChild call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:108 in bandClickTarget -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:visibleSibling call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:126 in blockBandClick -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:bandClickTarget call +1
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:186 in bandDragHead -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:bandClickTarget call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:188 in bandDragHead -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:blockEdge call
