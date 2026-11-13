# file card src/lib/features/collection/expression/parser.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/parser.ts ' codemap/files
file src/lib/features/collection/expression/parser.ts other L231 module src/lib/features/collection in5 t1
## imports
imp src/lib/features/collection/expression/parser.ts:1 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
imp src/lib/features/collection/expression/parser.ts:2 -> src/lib/features/collection/expression/tokenizer.ts tokenize,type:Token
## imported-by
imp src/lib/features/auto-organize/auto-organize.logic.ts:19 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/collection.logic.ts:11 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/expression/evaluator.ts:2 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/toolbar/filter.logic.ts:3 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/toolbar/formula.logic.ts:2 -> src/lib/features/collection/expression/parser.ts parse
## reach
in2 src/lib/features/collection/expression/parser.ts 19 files in 5 modules: src/lib/features/collection(11) src/lib/features/auto-organize(4) src/lib/features/type-definitions(2) src/lib/features/rail-shell(1) src/lib/plugins/mods(1)
out2 src/lib/features/collection/expression/parser.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/parser.test.ts imports src/lib/features/collection/expression/parser.ts mirror
## symbols
sym src/lib/features/collection/expression/parser.ts:8 fn parse(expression: string): ASTNode L203 | Parses an expression string into an AST using recursive descent.
by src/lib/features/collection/expression/parser.ts:parse <- src/lib/features/auto-organize/auto-organize.logic.ts:460 in inputsRead call +1
by src/lib/features/collection/expression/parser.ts:parse <- src/lib/features/collection/collection.logic.ts:156 in executeQuery call +3
by src/lib/features/collection/expression/parser.ts:parse <- src/lib/features/collection/expression/evaluator.ts:78 in evaluateExpression call +2
by src/lib/features/collection/expression/parser.ts:parse <- src/lib/features/collection/toolbar/filter.logic.ts:24 in parseExpressionToRow call
by src/lib/features/collection/expression/parser.ts:parse <- src/lib/features/collection/toolbar/formula.logic.ts:103 in validateFormulaExpression call
## locals
local src/lib/features/collection/expression/parser.ts:213 fn flattenMemberToString(node: ASTNode): string L7
local src/lib/features/collection/expression/parser.ts:227 fn isStaticPath(node: ASTNode): boolean L5
## calls
call src/lib/features/collection/expression/parser.ts:9 in parse -> src/lib/features/collection/expression/tokenizer.ts:tokenize call
call src/lib/features/collection/expression/parser.ts:141 in parse -> src/lib/features/collection/expression/parser.ts:isStaticPath call
call src/lib/features/collection/expression/parser.ts:144 in parse -> src/lib/features/collection/expression/parser.ts:flattenMemberToString call
call src/lib/features/collection/expression/parser.ts:216 in flattenMemberToString -> src/lib/features/collection/expression/parser.ts:flattenMemberToString call
call src/lib/features/collection/expression/parser.ts:229 in isStaticPath -> src/lib/features/collection/expression/parser.ts:isStaticPath call
