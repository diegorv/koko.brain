# file card src/lib/features/collection/expression/expression.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/expression.types.ts ' codemap/files
file src/lib/features/collection/expression/expression.types.ts types L125 module src/lib/features/collection in7 t1
## imported-by
imp src/lib/features/auto-organize/auto-organize.logic.ts:18 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
imp src/lib/features/collection/CollectionTableView.svelte:4 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue
imp src/lib/features/collection/collection-block-widget.ts:6 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue
imp src/lib/features/collection/collection.logic.ts:12 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue,type:ASTNode
imp src/lib/features/collection/expression/evaluator.ts:1 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode,type:DisplayLink,type:DisplayImage,type:DisplayIcon,type:DisplayHTML
imp src/lib/features/collection/expression/parser.ts:1 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
imp src/lib/features/collection/toolbar/filter.logic.ts:2 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
## reach
in2 src/lib/features/collection/expression/expression.types.ts 18 files in 6 modules: src/lib/features/collection(8) src/lib/features/auto-organize(4) src/lib/app(2) src/lib/features/type-definitions(2) src/lib/features/rail-shell(1) +1 modules: q impact src/lib/features/collection/expression/expression.types.ts --depth 2
out2 src/lib/features/collection/expression/expression.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/methods.test.ts imports src/lib/features/collection/expression/expression.types.ts
test src/tests/lib/features/collection/collection-block-widget.test.ts imports-type src/lib/features/collection/expression/expression.types.ts
## symbols
sym src/lib/features/collection/expression/expression.types.ts:2 interface NumberLiteral L4 | Number literal node
sym src/lib/features/collection/expression/expression.types.ts:8 interface StringLiteral L4 | String literal node
sym src/lib/features/collection/expression/expression.types.ts:14 interface BooleanLiteral L4 | Boolean literal node
sym src/lib/features/collection/expression/expression.types.ts:20 interface Identifier L4 | Identifier node (e.g. "status", "priority")
sym src/lib/features/collection/expression/expression.types.ts:26 interface MemberExpr L5 | Member expression node (e.g. "file.name")
sym src/lib/features/collection/expression/expression.types.ts:33 interface BinaryExpr L6 | Binary expression node (e.g. "a + b", "x == y")
sym src/lib/features/collection/expression/expression.types.ts:41 interface UnaryExpr L5 | Unary expression node (e.g. "!x", "-x")
sym src/lib/features/collection/expression/expression.types.ts:48 interface CallExpr L5 | Function call node (e.g. "if(cond, a, b)")
sym src/lib/features/collection/expression/expression.types.ts:60 interface MethodCallExpr L6 | Method call on a computed receiver, e.g. `now().format("YYYY")` or `(a + b).round()`.
sym src/lib/features/collection/expression/expression.types.ts:68 interface ArrayLiteral L4 | Array literal node (e.g. "[1, 2, 3]")
sym src/lib/features/collection/expression/expression.types.ts:74 type ASTNode L11 | Union of all AST node types
by src/lib/features/collection/expression/expression.types.ts:ASTNode <- src/lib/features/auto-organize/auto-organize.logic.ts:18 in (module) import
by src/lib/features/collection/expression/expression.types.ts:ASTNode <- src/lib/features/collection/collection.logic.ts:12 in (module) import
by src/lib/features/collection/expression/expression.types.ts:ASTNode <- src/lib/features/collection/expression/evaluator.ts:1 in (module) import
by src/lib/features/collection/expression/expression.types.ts:ASTNode <- src/lib/features/collection/expression/parser.ts:1 in (module) import
by src/lib/features/collection/expression/expression.types.ts:ASTNode <- src/lib/features/collection/toolbar/filter.logic.ts:2 in (module) import
sym src/lib/features/collection/expression/expression.types.ts:89 interface DisplayLink L5 | Display wrapper for a clickable link
by src/lib/features/collection/expression/expression.types.ts:DisplayLink <- src/lib/features/collection/expression/evaluator.ts:1 in (module) import
sym src/lib/features/collection/expression/expression.types.ts:96 interface DisplayImage L5 | Display wrapper for an inline image
by src/lib/features/collection/expression/expression.types.ts:DisplayImage <- src/lib/features/collection/expression/evaluator.ts:1 in (module) import
sym src/lib/features/collection/expression/expression.types.ts:103 interface DisplayIcon L4 | Display wrapper for a Lucide icon
by src/lib/features/collection/expression/expression.types.ts:DisplayIcon <- src/lib/features/collection/expression/evaluator.ts:1 in (module) import
sym src/lib/features/collection/expression/expression.types.ts:109 interface DisplayHTML L4 | Display wrapper for raw HTML content
by src/lib/features/collection/expression/expression.types.ts:DisplayHTML <- src/lib/features/collection/expression/evaluator.ts:1 in (module) import
sym src/lib/features/collection/expression/expression.types.ts:115 type DisplayValue L1 | Union of all display value types
sym src/lib/features/collection/expression/expression.types.ts:118 fn isDisplayValue(value: unknown): value is DisplayValue L8 | Checks whether a value is a display type wrapper
by src/lib/features/collection/expression/expression.types.ts:isDisplayValue <- src/lib/features/collection/CollectionTableView.svelte:66 in (markup) markup
by src/lib/features/collection/expression/expression.types.ts:isDisplayValue <- src/lib/features/collection/collection-block-widget.ts:457 in buildCollectionTable call
by src/lib/features/collection/expression/expression.types.ts:isDisplayValue <- src/lib/features/collection/collection.logic.ts:393 in formatCellValue call
