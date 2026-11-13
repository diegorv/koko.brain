# file card src/lib/features/collection/expression/methods.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/methods.logic.ts ' codemap/files
file src/lib/features/collection/expression/methods.logic.ts logic L285 module src/lib/features/collection in1 t1
## imported-by
imp src/lib/features/collection/expression/evaluator.ts:4 -> src/lib/features/collection/expression/methods.logic.ts dispatchMethod,dispatchField
## reach
in2 src/lib/features/collection/expression/methods.logic.ts 3 files in 2 modules: src/lib/features/collection(2) src/lib/features/auto-organize(1)
out2 src/lib/features/collection/expression/methods.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/methods.test.ts imports src/lib/features/collection/expression/methods.logic.ts
## symbols
sym src/lib/features/collection/expression/methods.logic.ts:62 const methodRegistry: Record<string, Record<string, MethodFn>> L166 | Registry of methods organized by runtime type.
sym src/lib/features/collection/expression/methods.logic.ts:230 const fieldRegistry: Record<string, Record<string, FieldFn>> L17 | Registry of fields (property-like access without parentheses) organized by runtime type
sym src/lib/features/collection/expression/methods.logic.ts:255 fn dispatchMethod(value: unknown, method: string, args: unknown[]): unknown L16 | Dispatches a method call to the appropriate handler based on the runtime type of the value.
by src/lib/features/collection/expression/methods.logic.ts:dispatchMethod <- src/lib/features/collection/expression/evaluator.ts:498 in evaluateMethodCall call +1
sym src/lib/features/collection/expression/methods.logic.ts:276 fn dispatchField(value: unknown, field: string): unknown | undefined L10 | Dispatches a field access to the appropriate handler based on the runtime type of the value.
by src/lib/features/collection/expression/methods.logic.ts:dispatchField <- src/lib/features/collection/expression/evaluator.ts:178 in resolveMember call
## locals
local src/lib/features/collection/expression/methods.logic.ts:11 fn formatDate(d: Date, fmt: string): string L11
local src/lib/features/collection/expression/methods.logic.ts:24 fn relativeDateString(d: Date): string L25
local src/lib/features/collection/expression/methods.logic.ts:51 fn getRuntimeType(value: unknown): string L9
local src/lib/features/collection/expression/methods.logic.ts:249 fn hasOwn(obj: object, key: string): boolean L1
## calls
call src/lib/features/collection/expression/methods.logic.ts:119 in methodRegistry -> src/lib/features/collection/expression/methods.logic.ts:formatDate call
call src/lib/features/collection/expression/methods.logic.ts:123 in methodRegistry -> src/lib/features/collection/expression/methods.logic.ts:relativeDateString call
call src/lib/features/collection/expression/methods.logic.ts:218 in methodRegistry -> src/lib/features/collection/expression/methods.logic.ts:getRuntimeType call
call src/lib/features/collection/expression/methods.logic.ts:256 in dispatchMethod -> src/lib/features/collection/expression/methods.logic.ts:getRuntimeType call
call src/lib/features/collection/expression/methods.logic.ts:260 in dispatchMethod -> src/lib/features/collection/expression/methods.logic.ts:hasOwn call +1
call src/lib/features/collection/expression/methods.logic.ts:277 in dispatchField -> src/lib/features/collection/expression/methods.logic.ts:getRuntimeType call
call src/lib/features/collection/expression/methods.logic.ts:280 in dispatchField -> src/lib/features/collection/expression/methods.logic.ts:hasOwn call
