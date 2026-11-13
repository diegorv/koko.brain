# file card src/lib/features/collection/expression/date-value.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/date-value.logic.ts ' codemap/files
file src/lib/features/collection/expression/date-value.logic.ts logic L24 module src/lib/features/collection in1 t1
## imported-by
imp src/lib/features/collection/expression/evaluator.ts:6 -> src/lib/features/collection/expression/date-value.logic.ts parseLocalDateOnly
## reach
in2 src/lib/features/collection/expression/date-value.logic.ts 3 files in 2 modules: src/lib/features/collection(2) src/lib/features/auto-organize(1)
out2 src/lib/features/collection/expression/date-value.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/date-value.test.ts imports src/lib/features/collection/expression/date-value.logic.ts
## symbols
sym src/lib/features/collection/expression/date-value.logic.ts:13 fn parseLocalDateOnly(value: string): Date | null L12 | Reads a `YYYY-MM-DD` string as local midnight of that day.
by src/lib/features/collection/expression/date-value.logic.ts:parseLocalDateOnly <- src/lib/features/collection/expression/evaluator.ts:373 in evaluateCall call +3
