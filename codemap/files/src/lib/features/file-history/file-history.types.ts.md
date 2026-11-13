# file card src/lib/features/file-history/file-history.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/file-history.types.ts ' codemap/files
file src/lib/features/file-history/file-history.types.ts types L11 module src/lib/features/file-history in6 t0
## imports
imp src/lib/features/file-history/file-history.types.ts:1 -> src/lib/contracts/index.ts type:SnapshotInfo
imp src/lib/features/file-history/file-history.types.ts:3 -> src/lib/contracts/index.ts type:SnapshotInfo,type:DiffLine
## imported-by
imp src/lib/features/file-history/DiffViewer.svelte:3 -> src/lib/features/file-history/file-history.types.ts type:DiffLine
imp src/lib/features/file-history/FileHistoryDialog.svelte:12 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
imp src/lib/features/file-history/SnapshotList.svelte:5 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
imp src/lib/features/file-history/file-history.logic.ts:2 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo,type:SnapshotGroup
imp src/lib/features/file-history/file-history.service.ts:11 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
imp src/lib/features/file-history/file-history.store.svelte.ts:1 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo,type:DiffLine
## reach
in2 src/lib/features/file-history/file-history.types.ts 5 files in 2 modules: src/lib/app(4) src/lib/features/properties(1)
out2 src/lib/features/file-history/file-history.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/file-history/FileHistoryDialog.test.ts imports-type src/lib/features/file-history/file-history.types.ts
test src/tests/lib/features/file-history/file-history.logic.test.ts imports-type src/lib/features/file-history/file-history.types.ts
test src/tests/lib/features/file-history/file-history.service.test.ts imports-type src/lib/features/file-history/file-history.types.ts
test src/tests/lib/features/file-history/file-history.store.test.ts imports-type src/lib/features/file-history/file-history.types.ts
## symbols
sym src/lib/features/file-history/file-history.types.ts:3 reexport DiffLine = dto:DiffLine L1
sym src/lib/features/file-history/file-history.types.ts:3 reexport SnapshotInfo = dto:SnapshotInfo L1
sym src/lib/features/file-history/file-history.types.ts:6 interface SnapshotGroup L6 | A group of snapshots belonging to the same day
by src/lib/features/file-history/file-history.types.ts:SnapshotGroup <- src/lib/features/file-history/file-history.logic.ts:2 in (module) import
