# file card src/lib/plugins/queryjs/kb-datetime.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/kb-datetime.ts ' codemap/files
file src/lib/plugins/queryjs/kb-datetime.ts other L231 module src/lib/plugins/queryjs in3 t5
## imports
imp src/lib/plugins/queryjs/kb-datetime.ts:5 -> src/lib/utils/date.ts side-effect
imp src/lib/plugins/queryjs/kb-datetime.ts:6 -> src/lib/plugins/queryjs/contract/kb-api.v1.ts type:KBDateTimeV1
## imported-by
imp src/lib/plugins/queryjs/data-array.ts:3 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
imp src/lib/plugins/queryjs/kb-api.ts:6 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
imp src/lib/plugins/queryjs/queryjs.logic.ts:4 -> src/lib/plugins/queryjs/kb-datetime.ts KBDateTime
## reach
in2 src/lib/plugins/queryjs/kb-datetime.ts 4 files in 2 modules: src/lib/plugins/mods(2) src/lib/plugins/queryjs(2)
out2 src/lib/plugins/queryjs/kb-datetime.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/queryjs/kb-datetime.test.ts imports src/lib/plugins/queryjs/kb-datetime.ts mirror
test src/tests/lib/plugins/queryjs/data-array.test.ts imports src/lib/plugins/queryjs/kb-datetime.ts
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports src/lib/plugins/queryjs/kb-datetime.ts
test src/tests/lib/plugins/queryjs/kb-api.test.ts imports src/lib/plugins/queryjs/kb-datetime.ts
test src/tests/lib/plugins/queryjs/queryjs.logic.test.ts imports src/lib/plugins/queryjs/kb-datetime.ts
## symbols
sym src/lib/plugins/queryjs/kb-datetime.ts:12 class KBDateTime L220 | Lightweight Luxon-compatible date wrapper.
by src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime <- src/lib/plugins/queryjs/data-array.ts:85 in DataArray.whereDate mcall +1
by src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime <- src/lib/plugins/queryjs/kb-api.ts:161 in KBAPI.date new +4
by src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime <- src/lib/plugins/queryjs/queryjs.logic.ts:96 in maybeParseDate new
## calls
call src/lib/plugins/queryjs/kb-datetime.ts:47 in KBDateTime.tryParse -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new +5
call src/lib/plugins/queryjs/kb-datetime.ts:143 in KBDateTime.plus -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new
call src/lib/plugins/queryjs/kb-datetime.ts:158 in KBDateTime.minus -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime.plus call
call src/lib/plugins/queryjs/kb-datetime.ts:205 in KBDateTime.startOf -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new
call src/lib/plugins/queryjs/kb-datetime.ts:214 in KBDateTime.endOf -> src/lib/plugins/queryjs/kb-datetime.ts:KBDateTime new
