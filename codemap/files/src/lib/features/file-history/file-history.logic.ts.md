# file card src/lib/features/file-history/file-history.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/file-history.logic.ts ' codemap/files
file src/lib/features/file-history/file-history.logic.ts logic L178 module src/lib/features/file-history in4 t2
## imports
imp src/lib/features/file-history/file-history.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/file-history/file-history.logic.ts:2 -> src/lib/features/file-history/file-history.types.ts type:SnapshotInfo,type:SnapshotGroup
## imported-by
imp src/lib/features/file-history/FileHistoryDialog.svelte:6 -> src/lib/features/file-history/file-history.logic.ts formatSnapshotTime,formatSnapshotDateTime,formatSnapshotLabel,getSnapshotBackupPath,findBackupTimestamp
imp src/lib/features/file-history/SnapshotList.svelte:4 -> src/lib/features/file-history/file-history.logic.ts groupSnapshotsByDay,formatSnapshotTime,formatSnapshotDateTime,formatFileSize,hasBackupForTimestamp
imp src/lib/features/file-history/file-history.service.ts:4 -> src/lib/features/file-history/file-history.logic.ts getRelativePath,getSnapshotBackupDir,getSnapshotBackupPath
imp src/lib/features/properties/note-info.logic.ts:1 -> src/lib/features/file-history/file-history.logic.ts formatFileSize
## reach
in2 src/lib/features/file-history/file-history.logic.ts 5 files in 2 modules: src/lib/app(4) src/lib/features/properties(1)
out2 src/lib/features/file-history/file-history.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/file-history/file-history.logic.test.ts imports src/lib/features/file-history/file-history.logic.ts mirror
test src/tests/lib/features/file-history/FileHistoryDialog.test.ts imports src/lib/features/file-history/file-history.logic.ts
## symbols
sym src/lib/features/file-history/file-history.logic.ts:9 fn formatSnapshotTime(timestamp: number): string L13 | Formats a snapshot timestamp as a human-readable relative time string.
by src/lib/features/file-history/file-history.logic.ts:formatSnapshotTime <- src/lib/features/file-history/FileHistoryDialog.svelte:45 in handleRestore call
by src/lib/features/file-history/file-history.logic.ts:formatSnapshotTime <- src/lib/features/file-history/SnapshotList.svelte:43 in (markup) markup
sym src/lib/features/file-history/file-history.logic.ts:27 fn formatSnapshotDateTime(timestamp: number): string L14 | Formats a snapshot timestamp as an absolute date/time string.
by src/lib/features/file-history/file-history.logic.ts:formatSnapshotDateTime <- src/lib/features/file-history/FileHistoryDialog.svelte:83 in (markup) markup
by src/lib/features/file-history/file-history.logic.ts:formatSnapshotDateTime <- src/lib/features/file-history/SnapshotList.svelte:44 in (markup) markup
sym src/lib/features/file-history/file-history.logic.ts:46 fn formatSnapshotLabel(index: number): string L5 | Returns a version label for a snapshot based on its position in the list.
by src/lib/features/file-history/file-history.logic.ts:formatSnapshotLabel <- src/lib/features/file-history/FileHistoryDialog.svelte:84 in (markup) markup
sym src/lib/features/file-history/file-history.logic.ts:56 fn formatFileSize(bytes: number): string L5 | Formats a byte count as a human-readable file size. e.g., 512 → "512 B", 1536 → "1.5 KB", 1048576 → "1.0 MB"
by src/lib/features/file-history/file-history.logic.ts:formatFileSize <- src/lib/features/file-history/SnapshotList.svelte:60 in (markup) markup
by src/lib/features/file-history/file-history.logic.ts:formatFileSize <- src/lib/features/properties/note-info.logic.ts:33 in buildNoteInfoRows call
sym src/lib/features/file-history/file-history.logic.ts:67 fn groupSnapshotsByDay(snapshots: SnapshotInfo[]): SnapshotGroup[] L37 | Groups snapshots by calendar day for display in the snapshot list.
by src/lib/features/file-history/file-history.logic.ts:groupSnapshotsByDay <- src/lib/features/file-history/SnapshotList.svelte:18 in groups=$derived call
sym src/lib/features/file-history/file-history.logic.ts:109 fn getRelativePath(vaultPath: string, absolutePath: string): string L10 | Computes the relative path of a file within the vault. e.g., ("/Users/me/vault", "/Users/me/vault/notes/file.md") → "notes/file.md"
by src/lib/features/file-history/file-history.logic.ts:getRelativePath <- src/lib/features/file-history/file-history.service.ts:27 in openFileHistory call +1
sym src/lib/features/file-history/file-history.logic.ts:128 fn getSnapshotBackupDir(vaultPath: string, absoluteFilePath: string): string L4 | Computes the backup directory path for a file's snapshots. e.g., ("/Users/me/vault", "/Users/me/vault/notes/meeting.md") → "/Users/me/vault/.kokobrain/snapshot…
by src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupDir <- src/lib/features/file-history/file-history.service.ts:137 in saveSnapshotBackup call +1
sym src/lib/features/file-history/file-history.logic.ts:138 fn getSnapshotBackupPath(vaultPath: string, absoluteFilePath: string, timestamp: number): string L8 | Computes the full path for a single snapshot backup file. e.g., ("/Users/me/vault", "/Users/me/vault/notes/meeting.md", 1708185600000) → "/Users/me/vault/.koko…
by src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupPath <- src/lib/features/file-history/FileHistoryDialog.svelte:36 in handleRevealBackup call
by src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupPath <- src/lib/features/file-history/file-history.service.ts:142 in saveSnapshotBackup call
sym src/lib/features/file-history/file-history.logic.ts:151 fn hasBackupForTimestamp(snapshotTimestamp: number, backedUpTimestamps: Set<number>, toleranceMs: number = 10_000): boolean L7 | Checks if a snapshot timestamp has a corresponding backup within a tolerance window.
by src/lib/features/file-history/file-history.logic.ts:hasBackupForTimestamp <- src/lib/features/file-history/SnapshotList.svelte:47 in (markup) markup
sym src/lib/features/file-history/file-history.logic.ts:163 fn findBackupTimestamp(snapshotTimestamp: number, backedUpTimestamps: Set<number>, toleranceMs: number = 10_000): number | null L11 | Finds the actual backup timestamp that matches a snapshot timestamp within tolerance.
by src/lib/features/file-history/file-history.logic.ts:findBackupTimestamp <- src/lib/features/file-history/FileHistoryDialog.svelte:34 in handleRevealBackup call
## locals
local src/lib/features/file-history/file-history.logic.ts:176 fn toDateKey(date: Date): string L3
## calls
call src/lib/features/file-history/file-history.logic.ts:72 in groupSnapshotsByDay -> src/lib/features/file-history/file-history.logic.ts:toDateKey call +2
call src/lib/features/file-history/file-history.logic.ts:129 in getSnapshotBackupDir -> src/lib/features/file-history/file-history.logic.ts:getRelativePath call
call src/lib/features/file-history/file-history.logic.ts:143 in getSnapshotBackupPath -> src/lib/features/file-history/file-history.logic.ts:getSnapshotBackupDir call
call src/lib/features/file-history/file-history.logic.ts:156 in hasBackupForTimestamp -> src/lib/features/file-history/file-history.logic.ts:findBackupTimestamp call
call src/lib/features/file-history/file-history.logic.ts:177 in toDateKey -> src/lib/utils/date.ts:formatDate call
