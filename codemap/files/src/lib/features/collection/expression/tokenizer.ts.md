# file card src/lib/features/collection/expression/tokenizer.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/expression/tokenizer.ts ' codemap/files
file src/lib/features/collection/expression/tokenizer.ts other L181 module src/lib/features/collection in1 t1
## imported-by
imp src/lib/features/collection/expression/parser.ts:2 -> src/lib/features/collection/expression/tokenizer.ts tokenize,type:Token
## reach
in2 src/lib/features/collection/expression/tokenizer.ts 5 files in 2 modules: src/lib/features/collection(4) src/lib/features/auto-organize(1)
out2 src/lib/features/collection/expression/tokenizer.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/expression/tokenizer.test.ts imports src/lib/features/collection/expression/tokenizer.ts mirror
## symbols
sym src/lib/features/collection/expression/tokenizer.ts:2 type TokenType L12 | Token types produced by the tokenizer
sym src/lib/features/collection/expression/tokenizer.ts:16 interface Token L4 | A single token from the expression string
by src/lib/features/collection/expression/tokenizer.ts:Token <- src/lib/features/collection/expression/parser.ts:2 in (module) import
sym src/lib/features/collection/expression/tokenizer.ts:28 fn tokenize(input: string): Token[] L142 | Tokenizes an expression string into an array of tokens.
by src/lib/features/collection/expression/tokenizer.ts:tokenize <- src/lib/features/collection/expression/parser.ts:9 in parse call
## locals
local src/lib/features/collection/expression/tokenizer.ts:172 fn isMatchingQuote(ch: string, opening: string): boolean L10
## calls
call src/lib/features/collection/expression/tokenizer.ts:58 in tokenize -> src/lib/features/collection/expression/tokenizer.ts:isMatchingQuote call
