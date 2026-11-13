# file card src/lib/core/markdown-editor/wikilink-click-target.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/wikilink-click-target.ts ' codemap/files
file src/lib/core/markdown-editor/wikilink-click-target.ts other L81 module src/lib/core/markdown-editor in3 t2
## imports
imp src/lib/core/markdown-editor/wikilink-click-target.ts:3 -> src/lib/utils/platform.ts isMacContextClick,isOpenLinkModifier
imp src/lib/core/markdown-editor/wikilink-click-target.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/wikilink-click-target.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:49 -> src/lib/core/markdown-editor/wikilink-click-target.ts resolveWikilinkClickPosition
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:3 -> src/lib/core/markdown-editor/wikilink-click-target.ts TABLE_WIDGET_CLASS
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:26 -> src/lib/core/markdown-editor/wikilink-click-target.ts TABLE_WIDGET_CLASS
## reach
in2 src/lib/core/markdown-editor/wikilink-click-target.ts 11 files in 2 modules: src/lib/core/markdown-editor(10) src/lib/app(1)
out2 src/lib/core/markdown-editor/wikilink-click-target.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts imports src/lib/core/markdown-editor/wikilink-click-target.ts
test src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts imports src/lib/core/markdown-editor/wikilink-click-target.ts
## symbols
sym src/lib/core/markdown-editor/wikilink-click-target.ts:15 const WIKILINK_SELECTOR L2 | CSS selector matching every DOM node that represents a clickable wikilink in the editor — both the source-mode tokens (`.cm-wikilink-*`) and the live-preview r…
sym src/lib/core/markdown-editor/wikilink-click-target.ts:25 fn findWikilinkElement(target: EventTarget | null): HTMLElement | null L4 | Returns the closest wikilink ancestor element of `target`, or `null` when the click did not happen on a wikilink.
sym src/lib/core/markdown-editor/wikilink-click-target.ts:35 const TABLE_WIDGET_CLASS L1 | Class of the live-preview table widget's root (`TableWidget.toDOM`), which handles its own cell link clicks.
by src/lib/core/markdown-editor/wikilink-click-target.ts:TABLE_WIDGET_CLASS <- src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:97 in bandClickTarget ref
by src/lib/core/markdown-editor/wikilink-click-target.ts:TABLE_WIDGET_CLASS <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:385 in TableWidget.toDOM ref
sym src/lib/core/markdown-editor/wikilink-click-target.ts:38 type WikilinkClickView L1 | The parts of an `EditorView` the click resolver reads.
sym src/lib/core/markdown-editor/wikilink-click-target.ts:65 fn resolveWikilinkClickPosition(e: MouseEvent, view: WikilinkClickView, mac: boolean): number | null L17 | Returns the document position of the wikilink a mousedown should open, or `null` to leave the event to CodeMirror.
by src/lib/core/markdown-editor/wikilink-click-target.ts:resolveWikilinkClickPosition <- src/lib/core/markdown-editor/MarkdownEditor.svelte:275 in handleEditorClick call
## calls
call src/lib/core/markdown-editor/wikilink-click-target.ts:66 in resolveWikilinkClickPosition -> src/lib/utils/platform.ts:isMacContextClick call
call src/lib/core/markdown-editor/wikilink-click-target.ts:68 in resolveWikilinkClickPosition -> src/lib/core/markdown-editor/wikilink-click-target.ts:findWikilinkElement call
call src/lib/core/markdown-editor/wikilink-click-target.ts:70 in resolveWikilinkClickPosition -> src/lib/utils/platform.ts:isOpenLinkModifier call
call src/lib/core/markdown-editor/wikilink-click-target.ts:74 in resolveWikilinkClickPosition -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call
call src/lib/core/markdown-editor/wikilink-click-target.ts:80 in resolveWikilinkClickPosition -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition call
