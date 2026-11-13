# file card src/lib/contracts/commands.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/contracts/commands.ts ' codemap/files
file src/lib/contracts/commands.ts other L331 module src/lib/contracts in1 t2 | The typed IPC command contract: one `CommandMap` entry per command in `generate_handler![...]` (`src-tauri/src/lib.rs`).
## imports
imp src/lib/contracts/commands.ts:7 -> src/lib/contracts/index.ts type:CachedScanResult,type:DiffLine,type:FileNode,type:FileReadResult,type:FileTaskGroup,type:FtsSearchResult,type:IndexDelta,type:IndexStats,type:NoteEntry,type:NoteRecord,type:OutgoingLink,type:OutgoingUnlinkedMention,type:RelationshipBacklink,type:SemanticFileStatus,type:SemanticResult,type:SemanticStats,type:SnapshotInfo,type:TagAggregate,type:TaskLineEdits,type:TaskLinesWriteResult,type:TaskStatus,type:TaskTextWriteResult,type:TodoistKvEntry,type:TodoistSectionLink,type:TodoistStateCommit,type:TodoistSyncLogEntry,type:TodoistSyncLogInput,type:TodoistTaskLink,type:ToggleTaskResult,type:UpdateMetadata,type:UpdateResult
## imported-by
imp src/lib/contracts/ipc.ts:3 -> src/lib/contracts/commands.ts type:CommandArgs,type:CommandMap,type:CommandResult
## reach
in2 src/lib/contracts/commands.ts 45 files in 24 modules: src/lib/app(5) src/lib/core/filesystem(5) src/lib/features/todoist-sync(5) src/lib/core/settings(4) src/lib/features/search(3) +19 modules: q impact src/lib/contracts/commands.ts --depth 2
out2 src/lib/contracts/commands.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/contracts/ipc-parity.test.ts imports src/lib/contracts/commands.ts
test src/tests/lib/contracts/ipc.test.ts imports src/lib/contracts/commands.ts
test e2e/mocks/tauri-core.ts imports-type src/lib/contracts/commands.ts
## symbols
sym src/lib/contracts/commands.ts:42 type NoArgs L1 | Args of a command that takes no IPC arguments.
sym src/lib/contracts/commands.ts:45 interface CommandMap L192 | Every Tauri command: its camelCase args object and its `Ok` result.
by src/lib/contracts/commands.ts:CommandMap <- src/lib/contracts/ipc.ts:3 in (module) import
sym src/lib/contracts/commands.ts:239 type CommandArgs L1 | The args object of command `K`.
by src/lib/contracts/commands.ts:CommandArgs <- src/lib/contracts/ipc.ts:3 in (module) import
sym src/lib/contracts/commands.ts:242 type CommandResult L1 | The resolved result of command `K`.
by src/lib/contracts/commands.ts:CommandResult <- src/lib/contracts/ipc.ts:3 in (module) import
sym src/lib/contracts/commands.ts:250 type ArgKey L3 | An arg name of command `K`, with a `?` suffix when the arg is optional.
sym src/lib/contracts/commands.ts:258 const COMMAND_ARGS L74 | Runtime manifest of every command's arg names (`?` marks Rust `Option` params), read by the parity test.
