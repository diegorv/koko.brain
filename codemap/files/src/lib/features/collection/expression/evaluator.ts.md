# file card src/lib/features/collection/expression/evaluator.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/evaluator.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/collection/expression/evaluator.ts other L725 module src/lib/features/collection in3 t4
## imports
imp src/lib/features/collection/expression/evaluator.ts:1 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode,type:DisplayLink,type:DisplayImage,type:DisplayIcon,type:DisplayHTML
imp src/lib/features/collection/expression/evaluator.ts:2 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/expression/evaluator.ts:3 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/expression/evaluator.ts:4 -> src/lib/features/collection/expression/methods.logic.ts dispatchMethod,dispatchField
imp src/lib/features/collection/expression/evaluator.ts:5 -> src/lib/features/collection/expression/duration.logic.ts parseDuration
imp src/lib/features/collection/expression/evaluator.ts:6 -> src/lib/features/collection/expression/date-value.logic.ts parseLocalDateOnly
imp src/lib/features/collection/expression/evaluator.ts:7 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/features/collection/expression/evaluator.ts:8 -> src/lib/utils/clamp.ts clamp
## imported-by
imp src/lib/features/auto-organize/auto-organize.logic.ts:13 -> src/lib/features/collection/expression/evaluator.ts evaluateExpression,validateExpression,type:EvalContext
imp src/lib/features/collection/collection.logic.ts:10 -> src/lib/features/collection/expression/evaluator.ts evaluate,validateExpression,type:EvalContext
imp src/lib/features/collection/toolbar/FilterRow.svelte:17 -> src/lib/features/collection/expression/evaluator.ts validateExpression
## reach
in2 src/lib/features/collection/expression/evaluator.ts 13 files in 4 modules: src/lib/features/collection(7) src/lib/features/auto-organize(4) src/lib/features/rail-shell(1) src/lib/plugins/mods(1)
out2 src/lib/features/collection/expression/evaluator.ts 2 files in 1 modules: src/lib/features/collection(2)
## tests
test src/tests/lib/features/collection/expression/evaluator.test.ts imports src/lib/features/collection/expression/evaluator.ts mirror
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports src/lib/features/collection/expression/evaluator.ts
test src/tests/lib/features/collection/expression/duration.test.ts imports src/lib/features/collection/expression/evaluator.ts
test src/tests/lib/features/collection/expression/methods.test.ts imports src/lib/features/collection/expression/evaluator.ts
## symbols
sym src/lib/features/collection/expression/evaluator.ts:11 interface EvalContext L8 | Context provided to the evaluator for resolving properties and formulas
by src/lib/features/collection/expression/evaluator.ts:EvalContext <- src/lib/features/auto-organize/auto-organize.logic.ts:16 in (module) import
by src/lib/features/collection/expression/evaluator.ts:EvalContext <- src/lib/features/collection/collection.logic.ts:10 in (module) import
sym src/lib/features/collection/expression/evaluator.ts:40 fn evaluate(node: ASTNode, ctx: EvalContext, formulaDepth = 0): unknown L32 | Evaluates a parsed AST node against a context.
by src/lib/features/collection/expression/evaluator.ts:evaluate <- src/lib/features/collection/collection.logic.ts:190 in executeQuery call +2
sym src/lib/features/collection/expression/evaluator.ts:77 fn evaluateExpression(expression: string, ctx: EvalContext): unknown L4 | Parses and evaluates an expression string in one call.
by src/lib/features/collection/expression/evaluator.ts:evaluateExpression <- src/lib/features/auto-organize/auto-organize.logic.ts:75 in ruleMatches call +2
sym src/lib/features/collection/expression/evaluator.ts:296 const PLAIN_FUNCTIONS: ReadonlySet<string> L5 | The plain (dot-free) function names `evaluateCall` handles.
sym src/lib/features/collection/expression/evaluator.ts:308 fn validateExpression(expression: string): string | undefined L10 | Checks an expression without running it: it must parse and every plain function it calls must be one the evaluator handles.
by src/lib/features/collection/expression/evaluator.ts:validateExpression <- src/lib/features/auto-organize/auto-organize.logic.ts:39 in filterProblem call +2
by src/lib/features/collection/expression/evaluator.ts:validateExpression <- src/lib/features/collection/collection.logic.ts:238 in findItemError call
by src/lib/features/collection/expression/evaluator.ts:validateExpression <- src/lib/features/collection/toolbar/FilterRow.svelte:44 in rawError=$derived call
## locals
local src/lib/features/collection/expression/evaluator.ts:23 fn escapeForHtml(str: string): string L12
local src/lib/features/collection/expression/evaluator.ts:100 fn canonicalPropertyName(name: string): string L3
local src/lib/features/collection/expression/evaluator.ts:117 fn isTypeIdentifier(node: ASTNode): boolean L12
local src/lib/features/collection/expression/evaluator.ts:140 fn isLiteralNode(node: ASTNode): boolean L3
local src/lib/features/collection/expression/evaluator.ts:145 fn resolveIdentifier(name: string, ctx: EvalContext, depth: number): unknown L8
local src/lib/features/collection/expression/evaluator.ts:159 fn resolveMember(node: ASTNode & { type: 'member' }, ctx: EvalContext, depth: number): unknown L26
local src/lib/features/collection/expression/evaluator.ts:187 fn flattenMember(node: ASTNode): string L7
local src/lib/features/collection/expression/evaluator.ts:196 fn resolveFileProperty(prop: string, record: PropertyIndexRecord): unknown L21
local src/lib/features/collection/expression/evaluator.ts:219 fn evaluateFormula(name: string, ctx: EvalContext, depth: number): unknown L10
local src/lib/features/collection/expression/evaluator.ts:231 fn evaluateBinary(op: string, left: ASTNode, right: ASTNode, ctx: EvalContext, depth: number): unknown L60
local src/lib/features/collection/expression/evaluator.ts:320 fn findUnknownFunction(node: ASTNode): string | undefined L19
local src/lib/features/collection/expression/evaluator.ts:340 fn firstUnknown(nodes: ASTNode[]): string | undefined L7
local src/lib/features/collection/expression/evaluator.ts:349 fn evaluateCall(callee: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown L124
local src/lib/features/collection/expression/evaluator.ts:478 fn evaluateMethodCall(callee: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown L22
local src/lib/features/collection/expression/evaluator.ts:507 fn evaluateMethodCallNode(receiver: ASTNode, method: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown L10
local src/lib/features/collection/expression/evaluator.ts:522 fn evaluateListHigherOrder(list: unknown[], method: string, exprNode: ASTNode, ctx: EvalContext, depth: number): unknown L41
local src/lib/features/collection/expression/evaluator.ts:565 fn evaluateFileMethod(method: string, args: ASTNode[], ctx: EvalContext, depth: number): unknown L34
local src/lib/features/collection/expression/evaluator.ts:614 fn resolvePropertyPath(path: string, ctx: EvalContext, depth: number): unknown L18
local src/lib/features/collection/expression/evaluator.ts:634 fn toNumber(val: unknown): number L6
local src/lib/features/collection/expression/evaluator.ts:642 fn toTruthy(val: unknown): boolean L5
local src/lib/features/collection/expression/evaluator.ts:649 fn isSameLocalDay(a: Date, b: Date): boolean L3
local src/lib/features/collection/expression/evaluator.ts:662 fn isDayPrecision(val: unknown): boolean L3
local src/lib/features/collection/expression/evaluator.ts:667 fn localDayStart(date: Date): Date L3
local src/lib/features/collection/expression/evaluator.ts:685 fn dateOperandTime(val: unknown, byDay: boolean): number L11
local src/lib/features/collection/expression/evaluator.ts:698 fn looseEqual(a: unknown, b: unknown): boolean L18
local src/lib/features/collection/expression/evaluator.ts:718 fn compareValues(a: unknown, b: unknown): number L8
## calls
call src/lib/features/collection/expression/evaluator.ts:50 in evaluate -> src/lib/features/collection/expression/evaluator.ts:resolveIdentifier call
call src/lib/features/collection/expression/evaluator.ts:53 in evaluate -> src/lib/features/collection/expression/evaluator.ts:resolveMember call
call src/lib/features/collection/expression/evaluator.ts:56 in evaluate -> src/lib/features/collection/expression/evaluator.ts:evaluateBinary call
call src/lib/features/collection/expression/evaluator.ts:59 in evaluate -> src/lib/features/collection/expression/evaluator.ts:evaluate call +2
call src/lib/features/collection/expression/evaluator.ts:59 in evaluate -> src/lib/features/collection/expression/evaluator.ts:toNumber call
call src/lib/features/collection/expression/evaluator.ts:60 in evaluate -> src/lib/features/collection/expression/evaluator.ts:toTruthy call
call src/lib/features/collection/expression/evaluator.ts:63 in evaluate -> src/lib/features/collection/expression/evaluator.ts:evaluateCall call
call src/lib/features/collection/expression/evaluator.ts:66 in evaluate -> src/lib/features/collection/expression/evaluator.ts:evaluateMethodCallNode call
call src/lib/features/collection/expression/evaluator.ts:78 in evaluateExpression -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/expression/evaluator.ts:79 in evaluateExpression -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/expression/evaluator.ts:119 in isTypeIdentifier -> src/lib/features/collection/expression/evaluator.ts:canonicalPropertyName call +1
call src/lib/features/collection/expression/evaluator.ts:148 in resolveIdentifier -> src/lib/features/collection/expression/evaluator.ts:evaluateFormula call
call src/lib/features/collection/expression/evaluator.ts:151 in resolveIdentifier -> src/lib/features/collection/expression/evaluator.ts:canonicalPropertyName call
call src/lib/features/collection/expression/evaluator.ts:167 in resolveMember -> src/lib/features/collection/expression/evaluator.ts:resolveFileProperty call
call src/lib/features/collection/expression/evaluator.ts:169 in resolveMember -> src/lib/features/collection/expression/evaluator.ts:evaluateFormula call
call src/lib/features/collection/expression/evaluator.ts:172 in resolveMember -> src/lib/features/collection/expression/evaluator.ts:canonicalPropertyName call
call src/lib/features/collection/expression/evaluator.ts:177 in resolveMember -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/expression/evaluator.ts:178 in resolveMember -> src/lib/features/collection/expression/methods.logic.ts:dispatchField call
call src/lib/features/collection/expression/evaluator.ts:182 in resolveMember -> src/lib/features/collection/expression/evaluator.ts:flattenMember call
call src/lib/features/collection/expression/evaluator.ts:190 in flattenMember -> src/lib/features/collection/expression/evaluator.ts:flattenMember call
call src/lib/features/collection/expression/evaluator.ts:226 in evaluateFormula -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/expression/evaluator.ts:227 in evaluateFormula -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/expression/evaluator.ts:234 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:evaluate call +5
call src/lib/features/collection/expression/evaluator.ts:235 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:toTruthy call +1
call src/lib/features/collection/expression/evaluator.ts:250 in evaluateBinary -> src/lib/features/collection/expression/duration.logic.ts:parseDuration call
call src/lib/features/collection/expression/evaluator.ts:267 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:isLiteralNode call +1
call src/lib/features/collection/expression/evaluator.ts:267 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:isTypeIdentifier call +1
call src/lib/features/collection/expression/evaluator.ts:272 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:looseEqual call +3
call src/lib/features/collection/expression/evaluator.ts:277 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:toNumber call +9
call src/lib/features/collection/expression/evaluator.ts:284 in evaluateBinary -> src/lib/features/collection/expression/evaluator.ts:compareValues call +3
call src/lib/features/collection/expression/evaluator.ts:311 in validateExpression -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/expression/evaluator.ts:315 in validateExpression -> src/lib/features/collection/expression/evaluator.ts:findUnknownFunction call
call src/lib/features/collection/expression/evaluator.ts:324 in findUnknownFunction -> src/lib/features/collection/expression/evaluator.ts:firstUnknown call +2
call src/lib/features/collection/expression/evaluator.ts:326 in findUnknownFunction -> src/lib/features/collection/expression/evaluator.ts:findUnknownFunction call +4
call src/lib/features/collection/expression/evaluator.ts:342 in firstUnknown -> src/lib/features/collection/expression/evaluator.ts:findUnknownFunction call
call src/lib/features/collection/expression/evaluator.ts:352 in evaluateCall -> src/lib/features/collection/expression/evaluator.ts:evaluateMethodCall call
call src/lib/features/collection/expression/evaluator.ts:357 in evaluateCall -> src/lib/features/collection/expression/evaluator.ts:evaluate call +29
call src/lib/features/collection/expression/evaluator.ts:358 in evaluateCall -> src/lib/features/collection/expression/evaluator.ts:toTruthy call
call src/lib/features/collection/expression/evaluator.ts:373 in evaluateCall -> src/lib/features/collection/expression/date-value.logic.ts:parseLocalDateOnly call
call src/lib/features/collection/expression/evaluator.ts:423 in evaluateCall -> src/lib/features/collection/expression/duration.logic.ts:parseDuration call
call src/lib/features/collection/expression/evaluator.ts:445 in evaluateCall -> src/lib/features/collection/expression/evaluator.ts:escapeForHtml call +2
call src/lib/features/collection/expression/evaluator.ts:456 in evaluateCall -> src/lib/utils/clamp.ts:clamp call
call src/lib/features/collection/expression/evaluator.ts:485 in evaluateMethodCall -> src/lib/features/collection/expression/evaluator.ts:evaluateFileMethod call
call src/lib/features/collection/expression/evaluator.ts:489 in evaluateMethodCall -> src/lib/features/collection/expression/evaluator.ts:resolvePropertyPath call
call src/lib/features/collection/expression/evaluator.ts:493 in evaluateMethodCall -> src/lib/features/collection/expression/evaluator.ts:evaluateListHigherOrder call
call src/lib/features/collection/expression/evaluator.ts:497 in evaluateMethodCall -> src/lib/features/collection/expression/evaluator.ts:evaluate call
call src/lib/features/collection/expression/evaluator.ts:498 in evaluateMethodCall -> src/lib/features/collection/expression/methods.logic.ts:dispatchMethod call
call src/lib/features/collection/expression/evaluator.ts:508 in evaluateMethodCallNode -> src/lib/features/collection/expression/evaluator.ts:evaluate call +1
call src/lib/features/collection/expression/evaluator.ts:511 in evaluateMethodCallNode -> src/lib/features/collection/expression/evaluator.ts:evaluateListHigherOrder call
call src/lib/features/collection/expression/evaluator.ts:515 in evaluateMethodCallNode -> src/lib/features/collection/expression/methods.logic.ts:dispatchMethod call
call src/lib/features/collection/expression/evaluator.ts:538 in evaluateListHigherOrder -> src/lib/features/collection/expression/evaluator.ts:evaluate call +1
call src/lib/features/collection/expression/evaluator.ts:539 in evaluateListHigherOrder -> src/lib/features/collection/expression/evaluator.ts:toTruthy call
call src/lib/features/collection/expression/evaluator.ts:571 in evaluateFileMethod -> src/lib/features/collection/expression/evaluator.ts:evaluate call +3
call src/lib/features/collection/expression/evaluator.ts:616 in resolvePropertyPath -> src/lib/features/collection/expression/evaluator.ts:resolveFileProperty call
call src/lib/features/collection/expression/evaluator.ts:619 in resolvePropertyPath -> src/lib/features/collection/expression/evaluator.ts:evaluateFormula call +1
call src/lib/features/collection/expression/evaluator.ts:622 in resolvePropertyPath -> src/lib/features/collection/expression/evaluator.ts:canonicalPropertyName call +2
call src/lib/features/collection/expression/evaluator.ts:690 in dateOperandTime -> src/lib/features/collection/expression/date-value.logic.ts:parseLocalDateOnly call
call src/lib/features/collection/expression/evaluator.ts:692 in dateOperandTime -> src/lib/features/collection/expression/evaluator.ts:localDayStart call
call src/lib/features/collection/expression/evaluator.ts:694 in dateOperandTime -> src/lib/features/collection/expression/evaluator.ts:toNumber call
call src/lib/features/collection/expression/evaluator.ts:699 in looseEqual -> src/lib/features/collection/expression/evaluator.ts:dateOperandTime call +1
call src/lib/features/collection/expression/evaluator.ts:699 in looseEqual -> src/lib/features/collection/expression/evaluator.ts:isDayPrecision call +1
call src/lib/features/collection/expression/evaluator.ts:704 in looseEqual -> src/lib/features/collection/expression/date-value.logic.ts:parseLocalDateOnly call +1
call src/lib/features/collection/expression/evaluator.ts:705 in looseEqual -> src/lib/features/collection/expression/evaluator.ts:isSameLocalDay call +1
call src/lib/features/collection/expression/evaluator.ts:711 in looseEqual -> src/lib/features/collection/expression/evaluator.ts:toNumber call +1
call src/lib/features/collection/expression/evaluator.ts:720 in compareValues -> src/lib/features/collection/expression/evaluator.ts:isDayPrecision call +1
call src/lib/features/collection/expression/evaluator.ts:721 in compareValues -> src/lib/features/collection/expression/evaluator.ts:dateOperandTime call +1
call src/lib/features/collection/expression/evaluator.ts:724 in compareValues -> src/lib/features/collection/expression/evaluator.ts:toNumber call +1
