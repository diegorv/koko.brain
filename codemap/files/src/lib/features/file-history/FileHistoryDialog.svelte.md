# file card src/lib/features/file-history/FileHistoryDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/FileHistoryDialog.svelte ' codemap/files
file src/lib/features/file-history/FileHistoryDialog.svelte component L102 module src/lib/features/file-history in1 t1
## imports
imp src/lib/features/file-history/FileHistoryDialog.svelte:2 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/file-history/FileHistoryDialog.svelte:3 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/file-history/FileHistoryDialog.svelte:4 -> src/lib/features/file-history/file-history.store.svelte.ts fileHistoryStore
imp src/lib/features/file-history/FileHistoryDialog.svelte:5 -> src/lib/features/file-history/file-history.service.ts selectSnapshot,restoreSnapshot,closeFileHistory
imp src/lib/features/file-history/FileHistoryDialog.svelte:6 -> src/lib/features/file-history/file-history.logic.ts formatSnapshotTime,formatSnapshotDateTime,formatSnapshotLabel,getSnapshotBackupPath,findBackupTimestamp
imp src/lib/features/file-history/FileHistoryDialog.svelte:7 -> src/lib/core/filesystem/fs.service.ts revealInSystemExplorer
imp src/lib/features/file-history/FileHistoryDialog.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/file-history/FileHistoryDialog.svelte:9 -> src/lib/features/file-history/SnapshotList.svelte default
imp src/lib/features/file-history/FileHistoryDialog.svelte:10 -> src/lib/features/file-history/DiffViewer.svelte default
imp src/lib/features/file-history/FileHistoryDialog.svelte:11 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/file-history/FileHistoryDialog.svelte:12 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo
## imported-by
imp src/lib/app/AppOverlays.svelte:11 -> src/lib/features/file-history/FileHistoryDialog.svelte default
## reach
in2 src/lib/features/file-history/FileHistoryDialog.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/file-history/FileHistoryDialog.svelte 27 files in 8 modules: src/lib/components(12) src/lib/core/filesystem(5) src/lib/core/editor(3) src/lib/contracts(2) src/lib/utils(2) +3 modules
## tests
test src/tests/lib/features/file-history/FileHistoryDialog.test.ts imports src/lib/features/file-history/FileHistoryDialog.svelte mirror
## symbols
sym src/lib/features/file-history/FileHistoryDialog.svelte:1 component FileHistoryDialog L102
by src/lib/features/file-history/FileHistoryDialog.svelte:default <- src/lib/app/AppOverlays.svelte:24 in (markup) mount
## locals
local src/lib/features/file-history/FileHistoryDialog.svelte:26 fn handleOpenChange(open: boolean) L3
local src/lib/features/file-history/FileHistoryDialog.svelte:30 fn handleRevealBackup(snapshot: SnapshotInfo) L9
local src/lib/features/file-history/FileHistoryDialog.svelte:40 fn handleRestore() L12
## mounts
mount src/lib/features/file-history/FileHistoryDialog.svelte:69 SnapshotList -> src/lib/features/file-history/SnapshotList.svelte
mount src/lib/features/file-history/FileHistoryDialog.svelte:88 DiffViewer -> src/lib/features/file-history/DiffViewer.svelte
mount src/lib/features/file-history/FileHistoryDialog.svelte:96 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:24 FileHistoryDialog -> src/lib/features/file-history/FileHistoryDialog.svelte
## calls
call src/lib/features/file-history/FileHistoryDialog.svelte:27 in handleOpenChange -> src/lib/features/file-history/file-history.service.ts:closeFileHistory call
call src/lib/features/file-history/FileHistoryDialog.svelte:34 in handleRevealBackup -> src/lib/features/file-history/file-history.logic.ts:findBackupTimestamp call
call src/lib/features/file-history/FileHistoryDialog.svelte:36 in handleRevealBackup -> src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupPath call
call src/lib/features/file-history/FileHistoryDialog.svelte:37 in handleRevealBackup -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer call
call src/lib/features/file-history/FileHistoryDialog.svelte:45 in handleRestore -> src/lib/features/file-history/file-history.logic.ts:formatSnapshotTime call
call src/lib/features/file-history/FileHistoryDialog.svelte:50 in handleRestore -> src/lib/features/file-history/file-history.service.ts:restoreSnapshot call
call src/lib/features/file-history/FileHistoryDialog.svelte:54 in (markup) -> src/lib/features/file-history/FileHistoryDialog.svelte:handleOpenChange markup
call src/lib/features/file-history/FileHistoryDialog.svelte:72 in (markup) -> src/lib/features/file-history/file-history.service.ts:selectSnapshot markup
call src/lib/features/file-history/FileHistoryDialog.svelte:75 in (markup) -> src/lib/features/file-history/FileHistoryDialog.svelte:handleRevealBackup markup
call src/lib/features/file-history/FileHistoryDialog.svelte:83 in (markup) -> src/lib/features/file-history/file-history.logic.ts:formatSnapshotDateTime markup
call src/lib/features/file-history/FileHistoryDialog.svelte:84 in (markup) -> src/lib/features/file-history/file-history.logic.ts:formatSnapshotLabel markup
call src/lib/features/file-history/FileHistoryDialog.svelte:96 in (markup) -> src/lib/features/file-history/FileHistoryDialog.svelte:handleRestore markup
## effects
fx src/lib/features/file-history/FileHistoryDialog.svelte:44 tauri-dialog.ask in handleRestore
