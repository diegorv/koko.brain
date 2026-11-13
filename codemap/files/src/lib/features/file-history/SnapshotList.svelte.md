# file card src/lib/features/file-history/SnapshotList.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/SnapshotList.svelte ' codemap/files
file src/lib/features/file-history/SnapshotList.svelte component L68 module src/lib/features/file-history in1 t0
## imports
imp src/lib/features/file-history/SnapshotList.svelte:2 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/file-history/SnapshotList.svelte:4 -> src/lib/features/file-history/file-history.logic.ts groupSnapshotsByDay,formatSnapshotTime,formatSnapshotDateTime,formatFileSize,hasBackupForTimestamp
imp src/lib/features/file-history/SnapshotList.svelte:5 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
## imported-by
imp src/lib/features/file-history/FileHistoryDialog.svelte:9 -> src/lib/features/file-history/SnapshotList.svelte default
## reach
in2 src/lib/features/file-history/SnapshotList.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/file-history/SnapshotList.svelte 4 files in 3 modules: src/lib/components(2) src/lib/contracts(1) src/lib/utils(1)
## symbols
sym src/lib/features/file-history/SnapshotList.svelte:1 component SnapshotList props:snapshots,selectedId,onselect,isLoading,backedUpTimestamps,onrevealBackup L68
by src/lib/features/file-history/SnapshotList.svelte:default <- src/lib/features/file-history/FileHistoryDialog.svelte:69 in (markup) mount
## mounts
mount src/lib/features/file-history/SnapshotList.svelte:21 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
## mounted-at
mount src/lib/features/file-history/FileHistoryDialog.svelte:69 SnapshotList -> src/lib/features/file-history/SnapshotList.svelte
## calls
call src/lib/features/file-history/SnapshotList.svelte:18 in groups=$derived -> src/lib/features/file-history/file-history.logic.ts:groupSnapshotsByDay call
call src/lib/features/file-history/SnapshotList.svelte:43 in (markup) -> src/lib/features/file-history/file-history.logic.ts:formatSnapshotTime markup
call src/lib/features/file-history/SnapshotList.svelte:44 in (markup) -> src/lib/features/file-history/file-history.logic.ts:formatSnapshotDateTime markup
call src/lib/features/file-history/SnapshotList.svelte:47 in (markup) -> src/lib/features/file-history/file-history.logic.ts:hasBackupForTimestamp markup
call src/lib/features/file-history/SnapshotList.svelte:60 in (markup) -> src/lib/features/file-history/file-history.logic.ts:formatFileSize markup
