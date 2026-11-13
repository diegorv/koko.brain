# file card src/lib/utils/capture-path.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/capture-path.ts ' codemap/files
file src/lib/utils/capture-path.ts other L14 module src/lib/utils in3 t1
## imported-by
imp src/lib/features/rail-shell/lens.logic.ts:15 -> src/lib/utils/capture-path.ts buildCaptureFolder
imp src/lib/plugins/calendar/day-lens.logic.ts:1 -> src/lib/utils/capture-path.ts buildCaptureFolder
imp src/lib/plugins/quick-capture/note-composer.logic.ts:4 -> src/lib/utils/capture-path.ts buildCaptureFolder
## reach
in2 src/lib/utils/capture-path.ts 21 files in 6 modules: src/lib/features/rail-shell(11) src/lib/app(5) src/lib/plugins/calendar(2) src/lib/features/search(1) src/lib/plugins/one-on-one(1) +1 modules: q impact src/lib/utils/capture-path.ts --depth 2
out2 src/lib/utils/capture-path.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/capture-path.test.ts imports src/lib/utils/capture-path.ts mirror
## symbols
sym src/lib/utils/capture-path.ts:9 fn buildCaptureFolder(vaultPath: string, baseFolder: string, folderFormat: string, date: dayjs.Dayjs): string L6 | The folder a quick note (Cmd+N) lands in: vaultPath / baseFolder / folderFormat(date).
by src/lib/utils/capture-path.ts:buildCaptureFolder <- src/lib/features/rail-shell/lens.logic.ts:622 in newNoteRule call
by src/lib/utils/capture-path.ts:buildCaptureFolder <- src/lib/plugins/calendar/day-lens.logic.ts:61 in dayNewNoteRule call
by src/lib/utils/capture-path.ts:buildCaptureFolder <- src/lib/plugins/quick-capture/note-composer.logic.ts:19 in buildCapturePath call
