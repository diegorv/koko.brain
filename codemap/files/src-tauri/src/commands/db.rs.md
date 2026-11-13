# file card src-tauri/src/commands/db.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/db.rs ' codemap/files
file src-tauri/src/commands/db.rs rust L18 module src-tauri/src/commands in1 t1
## imports
imp src-tauri/src/commands/db.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/db.rs:2 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/db.rs:3 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/lib.rs:326 -> src-tauri/src/commands/db.rs open_vault_db
imp src-tauri/src/lib.rs:327 -> src-tauri/src/commands/db.rs close_vault_db
## reach
in2 src-tauri/src/commands/db.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/db.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/db_test.rs imports src-tauri/src/commands/db.rs
## symbols
sym src-tauri/src/commands/db.rs:7 cmd open_vault_db(vault_path: String) -> Result<(), String> L5 | Opens the database for a vault.
by src-tauri/src/commands/db.rs:open_vault_db <- src-tauri/src/lib.rs:326 in run import
sym src-tauri/src/commands/db.rs:15 cmd close_vault_db() -> Result<(), String> L4 | Closes the database.
by src-tauri/src/commands/db.rs:close_vault_db <- src-tauri/src/lib.rs:327 in run import
## calls
call src-tauri/src/commands/db.rs:8 in open_vault_db -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/db.rs:9 in open_vault_db -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/db.rs:10 in open_vault_db -> src-tauri/src/db/mod.rs:open_database lexical
call src-tauri/src/commands/db.rs:16 in close_vault_db -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/db.rs:17 in close_vault_db -> src-tauri/src/db/mod.rs:close_database lexical
## ipc-in
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:248 in initializeVault -> ipc:open_vault_db -> src-tauri/src/commands/db.rs:7
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:636 in teardownVault -> ipc:close_vault_db -> src-tauri/src/commands/db.rs:15
