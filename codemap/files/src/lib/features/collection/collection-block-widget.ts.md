# file card src/lib/features/collection/collection-block-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/collection-block-widget.ts ' codemap/files
file src/lib/features/collection/collection-block-widget.ts other L507 module src/lib/features/collection in2 t6
## imports
imp src/lib/features/collection/collection-block-widget.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/features/collection/collection-block-widget.ts:3 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml
imp src/lib/features/collection/collection-block-widget.ts:4 -> src/lib/features/collection/collection.logic.ts executeQuery,formatCellValue,type:QueryRowSet
imp src/lib/features/collection/collection-block-widget.ts:5 -> src/lib/features/collection/view-row-set.port.ts getViewRowSetPort
imp src/lib/features/collection/collection-block-widget.ts:6 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue
imp src/lib/features/collection/collection-block-widget.ts:7 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/collection-block-widget.ts:8 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/collection/collection-block-widget.ts:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/collection-block-widget.ts:10 -> src/lib/utils/sanitize.ts sanitizeHtml
imp src/lib/features/collection/collection-block-widget.ts:11 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord,type:CollectionViewDef,type:QueryResult
imp src/lib/features/collection/collection-block-widget.ts:12 -> src/lib/features/collection/calendar.logic.ts getCalendarGrid,groupRecordsByDate,formatMonthYear,getWeekDayLabels,formatDateKey
imp src/lib/features/collection/collection-block-widget.ts:19 -> src/lib/features/collection/linear-calendar.logic.ts buildLinearYearLayout,buildColorMapping,getColorForValue,barTextColor
## imported-by
imp src/lib/app/editor-host.ts:28 -> src/lib/features/collection/collection-block-widget.ts collectionBlockRenderer
imp src/lib/app/lifecycle/app-lifecycle.service.ts:84 -> src/lib/features/collection/collection-block-widget.ts clearCollectionCache
## reach
in2 src/lib/features/collection/collection-block-widget.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/collection/collection-block-widget.ts 17 files in 7 modules: src/lib/utils(6) src/lib/core/editor(4) src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/core/frontmatter(1) +2 modules
## tests
test src/tests/lib/features/collection/collection-block-widget.test.ts imports src/lib/features/collection/collection-block-widget.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.test.ts imports src/lib/features/collection/collection-block-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/features/collection/collection-block-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/features/collection/collection-block-widget.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/features/collection/collection-block-widget.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/features/collection/collection-block-widget.ts
## symbols
sym src/lib/features/collection/collection-block-widget.ts:55 const COLLECTION_ROW_CAP L1 | Maximum number of table rows a collection block renders in the editor.
sym src/lib/features/collection/collection-block-widget.ts:65 const LINEAR_CALENDAR_LANE_CAP L1 | Maximum number of event lanes a linear-calendar month row renders in the editor.
sym src/lib/features/collection/collection-block-widget.ts:68 fn clearCollectionCache(): void L3 | Drops all cached renders.
by src/lib/features/collection/collection-block-widget.ts:clearCollectionCache <- src/lib/app/lifecycle/app-lifecycle.service.ts:657 in teardownVault call
sym src/lib/features/collection/collection-block-widget.ts:73 class CollectionBlockWidget extends WidgetType L343 | Widget that renders a ```collection code block as an inline table
sym src/lib/features/collection/collection-block-widget.ts:418 const collectionBlockRenderer: FencedBlockRenderer L7 | Renders `` ```collection `` blocks; the app installs it in the editor's `fencedBlockRenderers`.
by src/lib/features/collection/collection-block-widget.ts:collectionBlockRenderer <- src/lib/app/editor-host.ts:210 in appFencedBlockRenderers ref
sym src/lib/features/collection/collection-block-widget.ts:432 fn buildCollectionTable(result: QueryResult): HTMLTableElement L40 | Builds the `<table>` for a collection table view from a query result, rendering at most `COLLECTION_ROW_CAP` body rows.
## locals
local src/lib/features/collection/collection-block-widget.ts:480 fn stopEditorMousedown(el: HTMLElement): void L6
local src/lib/features/collection/collection-block-widget.ts:488 fn handleRowClick(record: PropertyIndexRecord) L3
local src/lib/features/collection/collection-block-widget.ts:493 fn getCellValue(record: PropertyIndexRecord, key: string): unknown L15
## calls
call src/lib/features/collection/collection-block-widget.ts:89 in CollectionBlockWidget.toDOM -> src/lib/features/collection/collection-block-widget.ts:CollectionBlockWidget.renderView call +1
call src/lib/features/collection/collection-block-widget.ts:93 in CollectionBlockWidget.toDOM -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/collection/collection-block-widget.ts:120 in CollectionBlockWidget.toDOM -> src/lib/features/collection/view-row-set.port.ts:getViewRowSetPort call
call src/lib/features/collection/collection-block-widget.ts:124 in CollectionBlockWidget.toDOM -> src/lib/features/collection/collection.logic.ts:executeQuery call
call src/lib/features/collection/collection-block-widget.ts:151 in CollectionBlockWidget.renderView -> src/lib/features/collection/collection-block-widget.ts:CollectionBlockWidget.buildCalendar call
call src/lib/features/collection/collection-block-widget.ts:156 in CollectionBlockWidget.renderView -> src/lib/features/collection/collection-block-widget.ts:CollectionBlockWidget.buildLinearCalendar call
call src/lib/features/collection/collection-block-widget.ts:169 in CollectionBlockWidget.renderView -> src/lib/features/collection/collection-block-widget.ts:buildCollectionTable call
call src/lib/features/collection/collection-block-widget.ts:194 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/calendar.logic.ts:groupRecordsByDate call
call src/lib/features/collection/collection-block-widget.ts:199 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/calendar.logic.ts:formatMonthYear call
call src/lib/features/collection/collection-block-widget.ts:210 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/calendar.logic.ts:getWeekDayLabels call
call src/lib/features/collection/collection-block-widget.ts:221 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/calendar.logic.ts:getCalendarGrid call
call src/lib/features/collection/collection-block-widget.ts:222 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/calendar.logic.ts:formatDateKey call +1
call src/lib/features/collection/collection-block-widget.ts:254 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/collection-block-widget.ts:stopEditorMousedown call
call src/lib/features/collection/collection-block-widget.ts:255 in CollectionBlockWidget.buildCalendar -> src/lib/features/collection/collection-block-widget.ts:handleRowClick call
call src/lib/features/collection/collection-block-widget.ts:286 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/linear-calendar.logic.ts:buildLinearYearLayout call
call src/lib/features/collection/collection-block-widget.ts:287 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/linear-calendar.logic.ts:buildColorMapping call
call src/lib/features/collection/collection-block-widget.ts:379 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/linear-calendar.logic.ts:getColorForValue call
call src/lib/features/collection/collection-block-widget.ts:380 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/linear-calendar.logic.ts:barTextColor call
call src/lib/features/collection/collection-block-widget.ts:383 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/collection-block-widget.ts:stopEditorMousedown call
call src/lib/features/collection/collection-block-widget.ts:384 in CollectionBlockWidget.buildLinearCalendar -> src/lib/features/collection/collection-block-widget.ts:handleRowClick call
call src/lib/features/collection/collection-block-widget.ts:420 in collectionBlockRenderer.widget -> src/lib/features/collection/collection-block-widget.ts:CollectionBlockWidget new
call src/lib/features/collection/collection-block-widget.ts:451 in buildCollectionTable -> src/lib/features/collection/collection-block-widget.ts:stopEditorMousedown call
call src/lib/features/collection/collection-block-widget.ts:452 in buildCollectionTable -> src/lib/features/collection/collection-block-widget.ts:handleRowClick call
call src/lib/features/collection/collection-block-widget.ts:456 in buildCollectionTable -> src/lib/features/collection/collection-block-widget.ts:getCellValue call
call src/lib/features/collection/collection-block-widget.ts:457 in buildCollectionTable -> src/lib/features/collection/expression/expression.types.ts:isDisplayValue call
call src/lib/features/collection/collection-block-widget.ts:458 in buildCollectionTable -> src/lib/utils/sanitize.ts:sanitizeHtml call
call src/lib/features/collection/collection-block-widget.ts:460 in buildCollectionTable -> src/lib/features/collection/collection.logic.ts:formatCellValue call
call src/lib/features/collection/collection-block-widget.ts:489 in handleRowClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
## effects
fx src/lib/features/collection/collection-block-widget.ts:255 dom.click pill in CollectionBlockWidget.buildCalendar
fx src/lib/features/collection/collection-block-widget.ts:384 dom.click bar in CollectionBlockWidget.buildLinearCalendar
fx src/lib/features/collection/collection-block-widget.ts:452 dom.click tr in buildCollectionTable
fx src/lib/features/collection/collection-block-widget.ts:481 dom.mousedown el in stopEditorMousedown
