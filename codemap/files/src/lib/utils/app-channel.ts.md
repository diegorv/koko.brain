# file card src/lib/utils/app-channel.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/app-channel.ts ' codemap/files
file src/lib/utils/app-channel.ts other L17 module src/lib/utils in1 t1
## imports
imp src/lib/utils/app-channel.ts:1 -> src/lib/core/settings/settings.types.ts type:ReleaseChannel
## imported-by
imp src/lib/core/settings/settings.service.ts:9 -> src/lib/utils/app-channel.ts getBuildChannel
## reach
in2 src/lib/utils/app-channel.ts 3 files in 3 modules: src/lib/app(1) src/lib/core/markdown-editor(1) src/lib/core/settings(1)
out2 src/lib/utils/app-channel.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/lib/utils/app-channel.test.ts imports src/lib/utils/app-channel.ts mirror
## symbols
sym src/lib/utils/app-channel.ts:15 fn getBuildChannel(): ReleaseChannel L3 | Read the build-time `__APP_CHANNEL__` define safely.
by src/lib/utils/app-channel.ts:getBuildChannel <- src/lib/core/settings/settings.service.ts:192 in parseSettings call +1
