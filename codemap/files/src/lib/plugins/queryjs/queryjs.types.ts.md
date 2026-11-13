# file card src/lib/plugins/queryjs/queryjs.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/queryjs.types.ts ' codemap/files
file src/lib/plugins/queryjs/queryjs.types.ts types L9 module src/lib/plugins/queryjs in3 t0
## imports
imp src/lib/plugins/queryjs/queryjs.types.ts:3 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBLinkV1,type:KBElOptionsV1,type:KBPageV1,type:KBTaskV1,type:AggregateStatsV1
## imported-by
imp src/lib/plugins/queryjs/data-array.ts:1 -> src/lib/plugins/queryjs/queryjs.types.ts type:AggregateStats
imp src/lib/plugins/queryjs/kb-api.ts:3 -> src/lib/plugins/queryjs/queryjs.types.ts type:KBPage,type:KBLink,type:KBElOptions
imp src/lib/plugins/queryjs/queryjs.logic.ts:2 -> src/lib/plugins/queryjs/queryjs.types.ts type:KBPage,type:KBLink,type:KBTask
## reach
in2 src/lib/plugins/queryjs/queryjs.types.ts 4 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(2)
out2 src/lib/plugins/queryjs/queryjs.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/kb-api.test.ts imports-type src/lib/plugins/queryjs/queryjs.types.ts
## symbols
sym src/lib/plugins/queryjs/queryjs.types.ts:4 reexport KBLink = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBLinkV1 L1
sym src/lib/plugins/queryjs/queryjs.types.ts:5 reexport KBElOptions = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBElOptionsV1 L1
sym src/lib/plugins/queryjs/queryjs.types.ts:6 reexport KBPage = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBPageV1 L1
sym src/lib/plugins/queryjs/queryjs.types.ts:7 reexport KBTask = src/lib/plugins/queryjs/contract/kb-api.v1.ts:KBTaskV1 L1
sym src/lib/plugins/queryjs/queryjs.types.ts:8 reexport AggregateStats = src/lib/plugins/queryjs/contract/kb-api.v1.ts:AggregateStatsV1 L1
