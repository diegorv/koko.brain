# file card src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/core/markdown-editor/extensions/live-preview/widgets.ts other L1127 module src/lib/core/markdown-editor in8 t15
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts parseAlignments,type:ColumnAlignment
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts type:MetaBindOption
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts findMetaBindInputRanges
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts renderInlineMarkdown
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts type:MediaTag
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:8 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts WIKILINK_DECORATION_RE,findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:9 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:10 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,setPropertyByBindTarget,typedOptionValue,extractBody,rebuildContent,detectLossyFrontmatter,LOSSY_FRONTMATTER_MESSAGES
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:19 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:20 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:21 -> src/lib/utils/platform.ts IS_MAC,isMacContextClick,isOpenLinkModifier
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:22 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:23 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts editorLog,reportError
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts isFormControlInputEvent
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:25 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkInfo
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:26 -> src/lib/core/markdown-editor/wikilink-click-target.ts TABLE_WIDGET_CLASS
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:644 -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts dyn:extractHeadingSection,dyn:extractBlockContent,dyn:getNotePreview
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts TaskCheckboxWidget,OrderedListMarkerWidget,UnorderedListMarkerWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts MediaWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts ImageWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts boundValue,pickWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts TableWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts MediaWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts WikilinkImageEmbedWidget,WikilinkNoteEmbedWidget
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:99 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts dyn:dispatchMetaBindUpdate
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/widgets.ts 3 files in 1 modules: src/lib/core/markdown-editor(3)
out2 src/lib/core/markdown-editor/extensions/live-preview/widgets.ts 5 files in 3 modules: src/lib/core/filesystem(2) src/lib/core/markdown-editor(2) src/lib/types(1)
## tests
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-value-types.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/media-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/features/properties/frontmatter-number-spelling.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
test src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:28 class TaskCheckboxWidget extends WidgetType L31
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TaskCheckboxWidget <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:28 in taskMarkerHandler.decorate new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:60 class OrderedListMarkerWidget extends WidgetType L21
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:OrderedListMarkerWidget <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:86 in listMarkHandler.decorate new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:82 class UnorderedListMarkerWidget extends WidgetType L16
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:UnorderedListMarkerWidget <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:94 in listMarkHandler.decorate new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:133 class ImageWidget extends WidgetType L54
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:ImageWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:140 in buildImageDecorations new +1
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:189 class MediaWidget extends WidgetType L31 | Renders an `<audio>` / `<video>` player; the tag drives the `cm-lp-${tag}` classes the theme styles
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MediaWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:25 in computeAudioBlocks new
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MediaWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:25 in computeVideoBlocks new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:362 interface TableSourceRange L8 | Range info for a table block in the document — used by edit-mode UI.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:372 class TableWidget extends WidgetType L164 | Widget that renders a pipe-delimited markdown table as an HTML `<table>` element.
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TableWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:37 in computeTables new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:558 fn renderTableSource(headers: string[], alignments: ColumnAlignment[], rows: string[][]): string L17 | Renders headers/alignments/rows as a markdown pipe-table source string.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:585 fn resolveImageEmbedAssetUrl(host: EditorHost, target: string): string | null L5 | Resolves a wikilink image embed target to a webview-loadable asset URL.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:592 class WikilinkImageEmbedWidget extends WidgetType L38 | Widget that renders a wikilink image embed (`![[image.png]]`, `![[image.png|300]]`)
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:WikilinkImageEmbedWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:83 in buildWikilinkEmbedDecorations new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:652 class WikilinkNoteEmbedWidget extends WidgetType L89 | Widget that renders a wikilink note embed (`![[note]]`, `![[note#heading]]`, `![[note#^block]]`)
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:WikilinkNoteEmbedWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:89 in buildWikilinkEmbedDecorations new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:747 fn boundValue(properties: Property[], bindTarget: string): string | null L5 | The stored value a meta-bind control bound to `bindTarget` shows, as text, or null when the note does not hold it.
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:boundValue <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:75 in buildMetaBindInputDecorations call
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:824 class MetaBindSelectWidget extends WidgetType L26 | Widget that renders a meta-bind inline select dropdown for `INPUT[inlineSelect(...):prop]`
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:858 fn pickWidget(inputType: string, options: MetaBindOption[], bindTarget: string, currentValue: string | null): WidgetType | null L24 | Dispatches a meta-bind INPUT type to its widget class, for the inline plugin and for table cells.
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:pickWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:77 in buildMetaBindInputDecorations call
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:899 fn dispatchMetaBindUpdate(view: EditorView, bindTarget: string, newValue: string | number | boolean): boolean L28 | Dispatches a frontmatter-property update for a meta-bind writer: the inline select, the number / date / toggle inputs and the button's `updateMetadata` action.
by src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:dispatchMetaBindUpdate <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:100 in executeButtonAction call
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:929 fn isNumericString(text: string): boolean L5 | Pure validator: an empty string OR a finite number (`Number.isFinite`).
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:936 fn isDateString(text: string): boolean L6 | Pure validator: empty string OR a `YYYY-MM-DD` date that round-trips through Date.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:954 type MetaBindTextInputType L1 | Meta-bind INPUT types rendered as a validated text input.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:964 class MetaBindTextInputWidget extends WidgetType L31 | Widget for `INPUT[number():prop]` and `INPUT[date():prop]` — a text input with inline validation.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1002 class MetaBindToggleWidget extends WidgetType L35 | Widget for `INPUT[toggle():prop]` / `INPUT[boolean():prop]` — native checkbox styled inline.
## locals
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:113 fn fileUrlToFsPath(fileUrl: string): string | null L19
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:229 fn renderInlineSegments(parent: HTMLElement, text: string, view?: EditorView, properties?: Property[]) L80
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:317 fn renderCellContent(parent: HTMLElement, text: string, view: EditorView, properties?: Property[]) L43
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:548 fn delimiterAlignments(text: string): ColumnAlignment[] L3
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:553 fn delimiterCell(a: ColumnAlignment): string L3
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:632 fn loadEmbedContent(host: EditorHost, target: string, heading: string | null, blockId: string | null): Promise<string | null> L18
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:754 fn labelControl(control: HTMLElement, bindTarget: string): void L5
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:764 fn createMetaBindSelect(options: MetaBindOption[], bindTarget: string, currentValue: string | null, view: EditorView): HTMLSelectElement L58
local src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1039 fn buildMetaBindTextInput(view: EditorView, bindTarget: string, currentValue: string | null, inputType: MetaBindTextInputType): HTMLElement L88
## calls
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:162 in ImageWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:ImageWidget.applyFileSrc call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:163 in ImageWidget.toDOM -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:171 in ImageWidget.applyFileSrc -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:fileUrlToFsPath call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:201 in MediaWidget.toDOM -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:235 in renderInlineSegments -> src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts:renderInlineMarkdown call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:260 in renderInlineSegments -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts:findMetaBindInputRanges call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:263 in renderInlineSegments -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:boundValue call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:264 in renderInlineSegments -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:pickWidget call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:285 in renderInlineSegments -> src/lib/utils/platform.ts:isOpenLinkModifier call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:291 in renderInlineSegments -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:295 in renderInlineSegments -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:327 in renderCellContent -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:WIKILINK_DECORATION_RE mcall
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:330 in renderCellContent -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:renderInlineSegments call +1
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:342 in renderCellContent -> src/lib/utils/platform.ts:isMacContextClick call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:347 in renderCellContent -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:348 in renderCellContent -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:395 in TableWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:renderCellContent call +1
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:419 in TableWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TableWidget.attachAddButtons call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:446 in TableWidget.ignoreEvent -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:480 in TableWidget.attachAddButtons -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TableWidget.dispatchAppendColumn call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:496 in TableWidget.attachAddButtons -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TableWidget.dispatchAppendRow call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:505 in TableWidget.dispatchAppendColumn -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:delimiterAlignments call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:506 in TableWidget.dispatchAppendColumn -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:delimiterCell call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:527 in TableWidget.dispatchAppendRow -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:delimiterAlignments call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:549 in delimiterAlignments -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:parseAlignments call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:567 in renderTableSource -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:delimiterCell ref
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:611 in WikilinkImageEmbedWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:resolveImageEmbedAssetUrl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:646 in loadEmbedContent -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:extractHeadingSection call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:647 in loadEmbedContent -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:extractBlockContent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:648 in loadEmbedContent -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:getNotePreview call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:677 in WikilinkNoteEmbedWidget.toDOM -> src/lib/utils/platform.ts:isMacContextClick call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:680 in WikilinkNoteEmbedWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:704 in WikilinkNoteEmbedWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:loadEmbedContent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:748 in boundValue -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:755 in labelControl -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:772 in createMetaBindSelect -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:labelControl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:815 in createMetaBindSelect -> src/lib/core/frontmatter/properties.logic.ts:typedOptionValue call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:815 in createMetaBindSelect -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:dispatchMetaBindUpdate call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:834 in MetaBindSelectWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:createMetaBindSelect call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:847 in MetaBindSelectWidget.ignoreEvent -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:867 in pickWidget -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MetaBindTextInputWidget new
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:870 in pickWidget -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MetaBindToggleWidget new
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:877 in pickWidget -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MetaBindSelectWidget new
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:905 in dispatchMetaBindUpdate -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:907 in dispatchMetaBindUpdate -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:editorLog call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:912 in dispatchMetaBindUpdate -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:913 in dispatchMetaBindUpdate -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:914 in dispatchMetaBindUpdate -> src/lib/core/frontmatter/properties.logic.ts:setPropertyByBindTarget call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:915 in dispatchMetaBindUpdate -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:949 in META_BIND_TEXT_INPUTS -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:isNumericString ref
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:950 in META_BIND_TEXT_INPUTS -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:isDateString ref
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:974 in MetaBindTextInputWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:buildMetaBindTextInput call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:992 in MetaBindTextInputWidget.ignoreEvent -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1016 in MetaBindToggleWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:labelControl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1021 in MetaBindToggleWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:dispatchMetaBindUpdate call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1034 in MetaBindToggleWidget.ignoreEvent -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1052 in buildMetaBindTextInput -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:labelControl call
call src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1098 in buildMetaBindTextInput -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:dispatchMetaBindUpdate call
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:41 dom.mousedown input in TaskCheckboxWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:284 dom.mousedown el in renderInlineSegments
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:340 dom.mousedown a in renderCellContent
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:473 dom.mousedown addCol in TableWidget.attachAddButtons
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:489 dom.mousedown addRow in TableWidget.attachAddButtons
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:675 dom.mousedown header in WikilinkNoteEmbedWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:804 dom.mousedown select in createMetaBindSelect
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:812 dom.change select in createMetaBindSelect
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1019 dom.mousedown cb in MetaBindToggleWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1020 dom.change cb in MetaBindToggleWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1108 dom.mousedown input in buildMetaBindTextInput
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1109 dom.input input in buildMetaBindTextInput
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1110 dom.blur input in buildMetaBindTextInput
fx src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:1111 dom.keydown input in buildMetaBindTextInput
