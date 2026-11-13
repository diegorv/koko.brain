# file card src/lib/features/collection/expression/duration.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/duration.logic.ts ' codemap/files
file src/lib/features/collection/expression/duration.logic.ts logic L71 module src/lib/features/collection in1 t1
## imported-by
imp src/lib/features/collection/expression/evaluator.ts:5 -> src/lib/features/collection/expression/duration.logic.ts parseDuration
## reach
in2 src/lib/features/collection/expression/duration.logic.ts 3 files in 2 modules: src/lib/features/collection(2) src/lib/features/auto-organize(1)
out2 src/lib/features/collection/expression/duration.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/duration.test.ts imports src/lib/features/collection/expression/duration.logic.ts
## symbols
sym src/lib/features/collection/expression/duration.logic.ts:2 interface Duration L6 | Represents a parsed duration
sym src/lib/features/collection/expression/duration.logic.ts:51 fn parseDuration(input: string): Duration | null L21 | Parses a duration string into milliseconds.
by src/lib/features/collection/expression/duration.logic.ts:parseDuration <- src/lib/features/collection/expression/evaluator.ts:250 in evaluateBinary call +1
