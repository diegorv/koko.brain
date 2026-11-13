# file card src/lib/features/file-history/file-history.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/file-history.store.svelte.ts ' codemap/files
file src/lib/features/file-history/file-history.store.svelte.ts store L61 module src/lib/features/file-history in2 t3
## imports
imp src/lib/features/file-history/file-history.store.svelte.ts:1 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo,type:DiffLine
## imported-by
imp src/lib/features/file-history/FileHistoryDialog.svelte:4 -> src/lib/features/file-history/file-history.store.svelte.ts fileHistoryStore
imp src/lib/features/file-history/file-history.service.ts:3 -> src/lib/features/file-history/file-history.store.svelte.ts fileHistoryStore
## reach
in2 src/lib/features/file-history/file-history.store.svelte.ts 4 files in 1 modules: src/lib/app(4)
out2 src/lib/features/file-history/file-history.store.svelte.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/file-history/file-history.store.test.ts imports src/lib/features/file-history/file-history.store.svelte.ts mirror
test src/tests/lib/features/file-history/FileHistoryDialog.test.ts imports src/lib/features/file-history/file-history.store.svelte.ts
test src/tests/lib/features/file-history/file-history.service.test.ts imports src/lib/features/file-history/file-history.store.svelte.ts
## symbols
sym src/lib/features/file-history/file-history.store.svelte.ts:28 store fileHistoryStore L34 | Reactive store for file history dialog state.
by src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore <- src/lib/features/file-history/FileHistoryDialog.svelte:15 in fileName=$derived member +18
by src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore <- src/lib/features/file-history/file-history.service.ts:22 in openFileHistory mcall +16
## store
store src/lib/features/file-history/file-history.store.svelte.ts:28 fileHistoryStore esc:0
mem src/lib/features/file-history/file-history.store.svelte.ts:29 get fileHistoryStore.isOpen r:src/lib/features/file-history/FileHistoryDialog.svelte:54 w-via:setOpen,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:30 get fileHistoryStore.filePath r:src/lib/features/file-history/FileHistoryDialog.svelte:15,src/lib/features/file-history/FileHistoryDialog.svelte:16,src/lib/features/file-history/FileHistoryDialog.svelte:31,src/lib/features/file-history/file-history.service.ts:86 w-via:setFilePath,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:31 get fileHistoryStore.snapshots r:src/lib/features/file-history/FileHistoryDialog.svelte:22,src/lib/features/file-history/FileHistoryDialog.svelte:70 w-via:setSnapshots,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:32 get fileHistoryStore.selectedSnapshot r:7 w-via:setSelectedSnapshot,reset
more r 7 not shown: src/lib/features/file-history(7): q store src/lib/features/file-history/file-history.store.svelte.ts:fileHistoryStore.selectedSnapshot
mem src/lib/features/file-history/file-history.store.svelte.ts:33 get fileHistoryStore.diffLines r:src/lib/features/file-history/FileHistoryDialog.svelte:89 w-via:setDiffLines,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:34 get fileHistoryStore.isLoading r:src/lib/features/file-history/FileHistoryDialog.svelte:73 w-via:setLoading,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:35 get fileHistoryStore.isLoadingDiff r:src/lib/features/file-history/FileHistoryDialog.svelte:90 w-via:setLoadingDiff,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:36 get fileHistoryStore.currentContent r:src/lib/features/file-history/file-history.service.ts:63 w-via:setCurrentContent,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:37 get fileHistoryStore.backedUpTimestamps r:src/lib/features/file-history/FileHistoryDialog.svelte:34,src/lib/features/file-history/FileHistoryDialog.svelte:74 w-via:setBackedUpTimestamps,reset
mem src/lib/features/file-history/file-history.store.svelte.ts:39 do fileHistoryStore.setOpen w:src/lib/features/file-history/file-history.service.ts:23
mem src/lib/features/file-history/file-history.store.svelte.ts:40 do fileHistoryStore.setFilePath w:src/lib/features/file-history/file-history.service.ts:22
mem src/lib/features/file-history/file-history.store.svelte.ts:41 do fileHistoryStore.setSnapshots w:src/lib/features/file-history/file-history.service.ts:33
mem src/lib/features/file-history/file-history.store.svelte.ts:42 do fileHistoryStore.setSelectedSnapshot w:src/lib/features/file-history/file-history.service.ts:58
mem src/lib/features/file-history/file-history.store.svelte.ts:43 do fileHistoryStore.setDiffLines w:src/lib/features/file-history/file-history.service.ts:71
mem src/lib/features/file-history/file-history.store.svelte.ts:44 do fileHistoryStore.setLoading w:src/lib/features/file-history/file-history.service.ts:24,src/lib/features/file-history/file-history.service.ts:42,src/lib/features/file-history/file-history.service.ts:49
mem src/lib/features/file-history/file-history.store.svelte.ts:45 do fileHistoryStore.setLoadingDiff w:src/lib/features/file-history/file-history.service.ts:59,src/lib/features/file-history/file-history.service.ts:75
mem src/lib/features/file-history/file-history.store.svelte.ts:46 do fileHistoryStore.setCurrentContent w:src/lib/features/file-history/file-history.service.ts:29
mem src/lib/features/file-history/file-history.store.svelte.ts:47 do fileHistoryStore.setBackedUpTimestamps w:src/lib/features/file-history/file-history.service.ts:37,src/lib/features/file-history/file-history.service.ts:39
mem src/lib/features/file-history/file-history.store.svelte.ts:50 do fileHistoryStore.reset w:src/lib/features/file-history/file-history.service.ts:100,src/lib/features/file-history/file-history.service.ts:182 | Resets all state to initial values
