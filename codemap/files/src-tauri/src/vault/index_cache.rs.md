# file card src-tauri/src/vault/index_cache.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/index_cache.rs ' codemap/files
file src-tauri/src/vault/index_cache.rs rust L285 module src-tauri/src/vault in1 t2 t:inline | Persistent snapshot codec for the `VaultIndex`.
## imports
imp src-tauri/src/vault/index_cache.rs:10 -> src-tauri/src/vault/entry.rs NoteEntry
## imported-by
imp src-tauri/src/commands/vault.rs:1551 -> src-tauri/src/vault/index_cache.rs self
imp src-tauri/src/commands/vault.rs:1768 -> src-tauri/src/vault/index_cache.rs self
## reach
in2 src-tauri/src/vault/index_cache.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/vault/index_cache.rs 3 files in 2 modules: src-tauri/src/vault(2) src-tauri/src/utils(1)
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/vault/index_cache.rs
test src-tauri/tests/vault_cache_test.rs imports src-tauri/src/vault/index_cache.rs
## symbols
sym src-tauri/src/vault/index_cache.rs:18 const INDEX_SCHEMA_VERSION L1 | Bump on `NoteEntry` shape changes (field add/remove/reorder/type change) or on parser output changes: a cache hit reuses entries whose mtime matches without pa…
by src-tauri/src/vault/index_cache.rs:INDEX_SCHEMA_VERSION <- src-tauri/src/commands/vault.rs:1558 in scan_vault_v2_cached_inner ref +1
sym src-tauri/src/vault/index_cache.rs:22 struct IndexSnapshot L9 | Top-level envelope persisted to disk.
sym src-tauri/src/vault/index_cache.rs:35 fn serialize_snapshot(snapshot: &IndexSnapshot) -> Result<Vec<u8>, String> L3 | Serializes a snapshot to MessagePack bytes.
sym src-tauri/src/vault/index_cache.rs:41 fn deserialize_snapshot(bytes: &[u8]) -> Result<IndexSnapshot, String> L3 | Deserializes a snapshot from MessagePack bytes.
sym src-tauri/src/vault/index_cache.rs:47 fn cache_file_path(vault_path: &str) -> std::path::PathBuf L5 | Returns the path to the cache file for the given vault.
by src-tauri/src/vault/index_cache.rs:cache_file_path <- src-tauri/src/commands/vault.rs:1579 in scan_vault_v2_cached_inner lexical
sym src-tauri/src/vault/index_cache.rs:55 fn write_snapshot_atomic(path: &std::path::Path, bytes: &[u8]) -> Result<(), String> L24 | Writes bytes to disk atomically: write to .tmp, fsync, rename.
sym src-tauri/src/vault/index_cache.rs:82 fn read_snapshot(vault_path: &str) -> Result<Option<IndexSnapshot>, String> L11 | Reads the cache file from disk.
by src-tauri/src/vault/index_cache.rs:read_snapshot <- src-tauri/src/commands/vault.rs:1556 in scan_vault_v2_cached_inner lexical
sym src-tauri/src/vault/index_cache.rs:95 fn write_snapshot(vault_path: &str, entries: &[NoteEntry]) -> Result<(), String> L11 | Writes a snapshot to the cache file atomically.
by src-tauri/src/vault/index_cache.rs:write_snapshot <- src-tauri/src/commands/vault.rs:1610 in scan_vault_v2_cached_inner lexical +2
## calls
call src-tauri/src/vault/index_cache.rs:83 in read_snapshot -> src-tauri/src/vault/index_cache.rs:cache_file_path call
call src-tauri/src/vault/index_cache.rs:86 in read_snapshot -> src-tauri/src/vault/index_cache.rs:deserialize_snapshot call
call src-tauri/src/vault/index_cache.rs:102 in write_snapshot -> src-tauri/src/vault/index_cache.rs:serialize_snapshot call
call src-tauri/src/vault/index_cache.rs:103 in write_snapshot -> src-tauri/src/vault/index_cache.rs:cache_file_path call
call src-tauri/src/vault/index_cache.rs:104 in write_snapshot -> src-tauri/src/vault/index_cache.rs:write_snapshot_atomic call
## effects
fx src-tauri/src/vault/index_cache.rs:60 rust-fs.create_dir_all in write_snapshot_atomic
fx src-tauri/src/vault/index_cache.rs:66 rust-fs.File::create in write_snapshot_atomic
fx src-tauri/src/vault/index_cache.rs:74 rust-fs.rename in write_snapshot_atomic
