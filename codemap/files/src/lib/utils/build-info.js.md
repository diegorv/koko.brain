# file card src/lib/utils/build-info.js
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/build-info.js ' codemap/files
file src/lib/utils/build-info.js other L162 module src/lib/utils in1 t1
## imported-by
imp src/lib/core/settings/BuildInfo.svelte:2 -> src/lib/utils/build-info.js channelLabel
## reach
in2 src/lib/utils/build-info.js 2 files in 2 modules: src/lib/core/settings(1) src/routes(1)
out2 src/lib/utils/build-info.js 0 files in 0 modules: -
## tests
test src/tests/lib/utils/build-info.test.ts imports src/lib/utils/build-info.js mirror
