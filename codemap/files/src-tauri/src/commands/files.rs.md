# file card src-tauri/src/commands/files.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/files.rs ' codemap/files
file src-tauri/src/commands/files.rs rust L84 module src-tauri/src/commands in1 t1
## imports
imp src-tauri/src/commands/files.rs:1 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/files.rs:2 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/lib.rs:366 -> src-tauri/src/commands/files.rs read_files_batch
## reach
in2 src-tauri/src/commands/files.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/files.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/files_test.rs imports src-tauri/src/commands/files.rs
## symbols
sym src-tauri/src/commands/files.rs:12 struct FileReadResult L5 dto:FileReadResult | Result of reading a single file in a batch operation.
sym src-tauri/src/commands/files.rs:24 cmd read_files_batch(vault_path: String, paths: Vec<String>,) -> Result<Vec<FileReadResult>, String> L61 | Reads the text content of multiple files in a single call.
by src-tauri/src/commands/files.rs:read_files_batch <- src-tauri/src/lib.rs:366 in run import
## calls
call src-tauri/src/commands/files.rs:29 in read_files_batch -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/files.rs:31 in read_files_batch -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
## ipc-in
ipc-call src/lib/app/lifecycle/watcher-handler.service.ts:98 in incrementalUpdateFiles -> ipc:read_files_batch -> src-tauri/src/commands/files.rs:24
ipc-call src/lib/features/search/search.service.ts:27 in loadVaultContentMap -> ipc:read_files_batch -> src-tauri/src/commands/files.rs:24
