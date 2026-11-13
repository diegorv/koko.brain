# file card src/lib/plugins/queryjs/data-array.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/data-array.ts ' codemap/files
file src/lib/plugins/queryjs/data-array.ts other L358 module src/lib/plugins/queryjs in2 t5
## imports
imp src/lib/plugins/queryjs/data-array.ts:1 -> src/lib/plugins/queryjs/queryjs.types.ts type:AggregateStats
imp src/lib/plugins/queryjs/data-array.ts:2 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:DataArrayV1,type:KBDateTimeV1
imp src/lib/plugins/queryjs/data-array.ts:3 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
## imported-by
imp src/lib/plugins/queryjs/kb-api.ts:5 -> src/lib/plugins/queryjs/data-array.ts DataArray
imp src/lib/plugins/queryjs/kb-ui.ts:22 -> src/lib/plugins/queryjs/data-array.ts DataArray
## reach
in2 src/lib/plugins/queryjs/data-array.ts 3 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(1)
out2 src/lib/plugins/queryjs/data-array.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/plugins/queryjs/data-array.test.ts imports src/lib/plugins/queryjs/data-array.ts mirror
test src/tests/help/queryjs-contract.test.ts imports src/lib/plugins/queryjs/data-array.ts
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/plugins/queryjs/data-array.ts
test src/tests/lib/plugins/queryjs/kb-api.test.ts imports src/lib/plugins/queryjs/data-array.ts
test src/tests/lib/plugins/queryjs/kb-ui.test.ts imports src/lib/plugins/queryjs/data-array.ts
## symbols
sym src/lib/plugins/queryjs/data-array.ts:9 class DataArray L350 | Chainable array wrapper with Proxy-based deep property access.
by src/lib/plugins/queryjs/data-array.ts:DataArray <- src/lib/plugins/queryjs/kb-api.ts:125 in KBAPI.pages new +10
by src/lib/plugins/queryjs/data-array.ts:DataArray <- src/lib/plugins/queryjs/kb-ui.ts:171 in KBUI.heatmap ref +1
## calls
call src/lib/plugins/queryjs/data-array.ts:39 in DataArray.where -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:44 in DataArray.filter -> src/lib/plugins/queryjs/data-array.ts:DataArray.where call
call src/lib/plugins/queryjs/data-array.ts:65 in DataArray.whereTag -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:82 in DataArray.whereDate -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:85 in DataArray.whereDate -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime.tryParse mcall
call src/lib/plugins/queryjs/data-array.ts:102 in DataArray.byDate -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime.tryParse mcall
call src/lib/plugins/queryjs/data-array.ts:110 in DataArray.map -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:115 in DataArray.flatMap -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:127 in DataArray.sort -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:132 in DataArray.sortBy -> src/lib/plugins/queryjs/data-array.ts:DataArray.sort call
call src/lib/plugins/queryjs/data-array.ts:149 in DataArray.groupBy -> src/lib/plugins/queryjs/data-array.ts:DataArray new +1
call src/lib/plugins/queryjs/data-array.ts:157 in DataArray.distinct -> src/lib/plugins/queryjs/data-array.ts:DataArray new +1
call src/lib/plugins/queryjs/data-array.ts:173 in DataArray.limit -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:178 in DataArray.slice -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:183 in DataArray.concat -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:255 in DataArray.to -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:267 in DataArray.into -> src/lib/plugins/queryjs/data-array.ts:DataArray new
call src/lib/plugins/queryjs/data-array.ts:301 in DataArray.avg -> src/lib/plugins/queryjs/data-array.ts:DataArray.sum call
call src/lib/plugins/queryjs/data-array.ts:321 in DataArray.stats -> src/lib/plugins/queryjs/data-array.ts:DataArray.sum call
call src/lib/plugins/queryjs/data-array.ts:322 in DataArray.stats -> src/lib/plugins/queryjs/data-array.ts:DataArray.avg call
call src/lib/plugins/queryjs/data-array.ts:323 in DataArray.stats -> src/lib/plugins/queryjs/data-array.ts:DataArray.min call
call src/lib/plugins/queryjs/data-array.ts:324 in DataArray.stats -> src/lib/plugins/queryjs/data-array.ts:DataArray.max call
