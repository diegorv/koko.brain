# file card src/lib/features/collection/collection.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/collection.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/collection/collection.logic.ts logic L505 module src/lib/features/collection in11 t32
## imports
imp src/lib/features/collection/collection.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:FilterItem,type:PropertyIndexRecord,type:QueryColumn,type:QueryResult
imp src/lib/features/collection/collection.logic.ts:10 -> src/lib/features/collection/expression/evaluator.ts evaluate,validateExpression,type:EvalContext
imp src/lib/features/collection/collection.logic.ts:11 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/collection.logic.ts:12 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue,type:ASTNode
imp src/lib/features/collection/collection.logic.ts:13 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/collection/collection.logic.ts:14 -> src/lib/utils/tag-extraction.ts extractAllTags
imp src/lib/features/collection/collection.logic.ts:15 -> src/lib/core/filesystem/fs.logic.ts getFileExtension,getFileName
imp src/lib/features/collection/collection.logic.ts:16 -> src/lib/core/filesystem/wikilink-resolution.logic.ts parseWikilinks
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:17 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
imp src/lib/features/auto-organize/auto-organize.logic.ts:11 -> src/lib/features/collection/collection.logic.ts evaluateFilter
imp src/lib/features/auto-organize/auto-organize.service.ts:9 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
imp src/lib/features/collection/CollectionTableView.svelte:3 -> src/lib/features/collection/collection.logic.ts formatCellValue,getPropertyValue
imp src/lib/features/collection/CollectionView.svelte:4 -> src/lib/features/collection/collection.logic.ts executeQuery
imp src/lib/features/collection/calendar.logic.ts:3 -> src/lib/features/collection/collection.logic.ts getPropertyValue
imp src/lib/features/collection/collection-block-widget.ts:4 -> src/lib/features/collection/collection.logic.ts executeQuery,formatCellValue,type:QueryRowSet
imp src/lib/features/collection/collection.service.ts:11 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
imp src/lib/features/collection/linear-calendar.logic.ts:4 -> src/lib/features/collection/collection.logic.ts getPropertyValue
imp src/lib/features/rail-shell/lens.logic.ts:40 -> src/lib/features/collection/collection.logic.ts executeQuery,filterCitesArchived
imp src/lib/plugins/mods/mod-query.service.ts:1 -> src/lib/features/collection/collection.logic.ts executeQuery
## reach
in2 src/lib/features/collection/collection.logic.ts 28 files in 8 modules: src/lib/features/rail-shell(11) src/lib/app(9) src/lib/features/auto-organize(2) src/lib/features/collection(2) src/lib/features/search(1) +3 modules: q impact src/lib/features/collection/collection.logic.ts --depth 2
out2 src/lib/features/collection/collection.logic.ts 12 files in 5 modules: src/lib/features/collection(5) src/lib/utils(4) src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## tests
test src/tests/fixtures/recent-view.fixture.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/auto-organize-doc-examples.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/auto-organize-switch-back.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/collection-features.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/examples-scoping.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/queryjs-contract.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/app/boot.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/collection-logic.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/portent-filters.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/toolbar/filter-logic.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/collection/view-relationship-filters.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/features/collection/collection.logic.ts
test src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts imports src/lib/features/collection/collection.logic.ts
## symbols
sym src/lib/features/collection/collection.logic.ts:22 fn buildNoteRecord(filePath: string, content: string, mtime = 0, ctime = 0, size = 0): PropertyIndexRecord L22 | Builds a PropertyIndexRecord from a file path and its content.
by src/lib/features/collection/collection.logic.ts:buildNoteRecord <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:172 in preview=$derived call
by src/lib/features/collection/collection.logic.ts:buildNoteRecord <- src/lib/features/auto-organize/auto-organize.service.ts:294 in evaluateAndMove call +4
by src/lib/features/collection/collection.logic.ts:buildNoteRecord <- src/lib/features/collection/collection.service.ts:154 in updateNoteInIndex call
sym src/lib/features/collection/collection.logic.ts:116 type QueryRowSet L5 | Picks the rows a query shows from the records it matched (filtered, formulas computed, the view's own sort applied, `limit` not yet applied), in display order.
by src/lib/features/collection/collection.logic.ts:QueryRowSet <- src/lib/features/collection/collection-block-widget.ts:4 in (module) import
sym src/lib/features/collection/collection.logic.ts:132 fn executeQuery(definition: CollectionDefinition, view: CollectionViewDef, index: Map<string, PropertyIndexRecord>, vaultPath: string … L91 | Executes a query against the property index using a collection definition and view.
by src/lib/features/collection/collection.logic.ts:executeQuery <- src/lib/features/collection/CollectionView.svelte:269 in queryResult=$derived call
by src/lib/features/collection/collection.logic.ts:executeQuery <- src/lib/features/collection/collection-block-widget.ts:124 in CollectionBlockWidget.toDOM call
by src/lib/features/collection/collection.logic.ts:executeQuery <- src/lib/features/rail-shell/lens.logic.ts:809 in queryViewLens call
by src/lib/features/collection/collection.logic.ts:executeQuery <- src/lib/plugins/mods/mod-query.service.ts:45 in createModQuery call +1
sym src/lib/features/collection/collection.logic.ts:270 fn filterCitesArchived(filter: FilterItem | undefined): boolean L15 | Whether a filter cites the archived flag, which hands the archived rows of a `.view` to the filter instead of the default exclusion.
by src/lib/features/collection/collection.logic.ts:filterCitesArchived <- src/lib/features/rail-shell/lens.logic.ts:771 in queryCitesArchived call +1
sym src/lib/features/collection/collection.logic.ts:326 fn evaluateFilter(filter: FilterItem, ctx: EvalContext, onLeafError?: (err: unknown) => void): boolean L26 | Evaluates a filter item (string expression or recursive filter object) against a note record.
by src/lib/features/collection/collection.logic.ts:evaluateFilter <- src/lib/features/auto-organize/auto-organize.logic.ts:78 in ruleMatches call
sym src/lib/features/collection/collection.logic.ts:391 fn formatCellValue(value: unknown): string L23 | Formats a cell value for display in the table.
by src/lib/features/collection/collection.logic.ts:formatCellValue <- src/lib/features/collection/CollectionTableView.svelte:77 in (markup) markup
by src/lib/features/collection/collection.logic.ts:formatCellValue <- src/lib/features/collection/collection-block-widget.ts:460 in buildCollectionTable call
sym src/lib/features/collection/collection.logic.ts:416 fn getPropertyValue(record: PropertyIndexRecord, column: string): unknown L19 | Retrieves a property value from a PropertyIndexRecord by column name
by src/lib/features/collection/collection.logic.ts:getPropertyValue <- src/lib/features/collection/CollectionTableView.svelte:60 in (markup) markup
by src/lib/features/collection/collection.logic.ts:getPropertyValue <- src/lib/features/collection/calendar.logic.ts:69 in extractDateFromRecord call
by src/lib/features/collection/collection.logic.ts:getPropertyValue <- src/lib/features/collection/linear-calendar.logic.ts:154 in extractEventsForYear call +1
## locals
local src/lib/features/collection/collection.logic.ts:53 fn projectDerivedProperties(properties: Map<string, unknown>, content: string): void L25
local src/lib/features/collection/collection.logic.ts:84 fn wikilinkTargets(value: unknown): string[] L7
local src/lib/features/collection/collection.logic.ts:101 fn boolFlag(properties: Map<string, unknown>, key: string, fallback: boolean): boolean L8
local src/lib/features/collection/collection.logic.ts:231 fn findFilterError(filter: unknown): string | undefined L4
local src/lib/features/collection/collection.logic.ts:236 fn findItemError(item: unknown): string | undefined L19
local src/lib/features/collection/collection.logic.ts:286 fn astCitesArchived(node: ASTNode): boolean L31
local src/lib/features/collection/collection.logic.ts:357 fn evaluateFilterCached(filter: FilterItem, ctx: EvalContext, parseCache: Map<string, ASTNode>): boolean L29
local src/lib/features/collection/collection.logic.ts:441 fn compareForSort(a: unknown, b: unknown, descending: boolean): number L10
local src/lib/features/collection/collection.logic.ts:453 fn compareValues(a: unknown, b: unknown): number L14
local src/lib/features/collection/collection.logic.ts:469 fn resolveColumns(view: CollectionViewDef, records: PropertyIndexRecord[], definition: CollectionDefinition): QueryColumn[] L30
local src/lib/features/collection/collection.logic.ts:501 fn toTruthy(val: unknown): boolean L5
## calls
call src/lib/features/collection/collection.logic.ts:29 in buildNoteRecord -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/collection/collection.logic.ts:30 in buildNoteRecord -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/features/collection/collection.logic.ts:36 in buildNoteRecord -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/collection/collection.logic.ts:40 in buildNoteRecord -> src/lib/features/collection/collection.logic.ts:projectDerivedProperties call
call src/lib/features/collection/collection.logic.ts:58 in projectDerivedProperties -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/collection/collection.logic.ts:63 in projectDerivedProperties -> src/lib/features/collection/collection.logic.ts:boolFlag call +2
call src/lib/features/collection/collection.logic.ts:69 in projectDerivedProperties -> src/lib/utils/tag-extraction.ts:extractAllTags call
call src/lib/features/collection/collection.logic.ts:74 in projectDerivedProperties -> src/lib/features/collection/collection.logic.ts:wikilinkTargets call
call src/lib/features/collection/collection.logic.ts:88 in wikilinkTargets -> src/lib/core/filesystem/wikilink-resolution.logic.ts:parseWikilinks call
call src/lib/features/collection/collection.logic.ts:144 in executeQuery -> src/lib/features/collection/collection.logic.ts:findFilterError call +1
call src/lib/features/collection/collection.logic.ts:146 in executeQuery -> src/lib/features/collection/collection.logic.ts:resolveColumns call +1
call src/lib/features/collection/collection.logic.ts:156 in executeQuery -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/collection.logic.ts:169 in executeQuery -> src/lib/features/collection/collection.logic.ts:evaluateFilterCached call +1
call src/lib/features/collection/collection.logic.ts:190 in executeQuery -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/collection.logic.ts:202 in executeQuery -> src/lib/features/collection/collection.logic.ts:getPropertyValue call +1
call src/lib/features/collection/collection.logic.ts:204 in executeQuery -> src/lib/features/collection/collection.logic.ts:compareForSort call
call src/lib/features/collection/collection.logic.ts:233 in findFilterError -> src/lib/features/collection/collection.logic.ts:findItemError call
call src/lib/features/collection/collection.logic.ts:238 in findItemError -> src/lib/features/collection/expression/evaluator.ts:validateExpression call
call src/lib/features/collection/collection.logic.ts:249 in findItemError -> src/lib/features/collection/collection.logic.ts:findItemError call
call src/lib/features/collection/collection.logic.ts:274 in filterCitesArchived -> src/lib/features/collection/collection.logic.ts:astCitesArchived call
call src/lib/features/collection/collection.logic.ts:274 in filterCitesArchived -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/collection.logic.ts:282 in filterCitesArchived -> src/lib/features/collection/collection.logic.ts:filterCitesArchived call
call src/lib/features/collection/collection.logic.ts:293 in astCitesArchived -> src/lib/features/collection/collection.logic.ts:astCitesArchived call +7
call src/lib/features/collection/collection.logic.ts:329 in evaluateFilter -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/collection.logic.ts:330 in evaluateFilter -> src/lib/features/collection/collection.logic.ts:toTruthy call
call src/lib/features/collection/collection.logic.ts:330 in evaluateFilter -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/collection.logic.ts:341 in evaluateFilter -> src/lib/features/collection/collection.logic.ts:evaluateFilter call +2
call src/lib/features/collection/collection.logic.ts:362 in evaluateFilterCached -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/collection.logic.ts:365 in evaluateFilterCached -> src/lib/features/collection/collection.logic.ts:toTruthy call
call src/lib/features/collection/collection.logic.ts:365 in evaluateFilterCached -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/collection.logic.ts:375 in evaluateFilterCached -> src/lib/features/collection/collection.logic.ts:evaluateFilterCached call +2
call src/lib/features/collection/collection.logic.ts:393 in formatCellValue -> src/lib/features/collection/expression/expression.types.ts:isDisplayValue call
call src/lib/features/collection/collection.logic.ts:448 in compareForSort -> src/lib/features/collection/collection.logic.ts:compareValues call
