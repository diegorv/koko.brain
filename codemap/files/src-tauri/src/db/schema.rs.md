# file card src-tauri/src/db/schema.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/schema.rs ' codemap/files
file src-tauri/src/db/schema.rs rust L446 module src-tauri/src/db in0 t1 t:inline
## reach
in2 src-tauri/src/db/schema.rs 0 files in 0 modules: -
out2 src-tauri/src/db/schema.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/fts_repo_test.rs imports src-tauri/src/db/schema.rs
## symbols
sym src-tauri/src/db/schema.rs:17 fn create_tables(conn: &Connection) -> Result<(), String> L157 | Creates all application tables if they don't exist.
## locals
local src-tauri/src/db/schema.rs:176 fn get_app_meta(conn: &Connection, key: &str) -> Result<Option<String>, String> L7
local src-tauri/src/db/schema.rs:185 fn set_app_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> L9
## calls
call src-tauri/src/db/schema.rs:121 in create_tables -> src-tauri/src/db/schema.rs:get_app_meta call
call src-tauri/src/db/schema.rs:152 in create_tables -> src-tauri/src/db/schema.rs:set_app_meta call
## effects
fx src-tauri/src/db/schema.rs:18 rust-db.execute in create_tables
fx src-tauri/src/db/schema.rs:107 rust-db.execute in create_tables
fx src-tauri/src/db/schema.rs:123 rust-db.execute in create_tables
fx src-tauri/src/db/schema.rs:162 rust-db.execute in create_tables
fx src-tauri/src/db/schema.rs:186 rust-db.execute in set_app_meta
