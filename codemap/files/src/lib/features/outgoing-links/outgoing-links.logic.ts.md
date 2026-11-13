# file card src/lib/features/outgoing-links/outgoing-links.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/outgoing-links/outgoing-links.logic.ts ' codemap/files
file src/lib/features/outgoing-links/outgoing-links.logic.ts logic L13 module src/lib/features/outgoing-links in0 t1
## reach
in2 src/lib/features/outgoing-links/outgoing-links.logic.ts 0 files in 0 modules: -
out2 src/lib/features/outgoing-links/outgoing-links.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/outgoing-links/outgoing-links.logic.test.ts imports src/lib/features/outgoing-links/outgoing-links.logic.ts mirror
