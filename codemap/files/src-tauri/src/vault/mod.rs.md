# file card src-tauri/src/vault/mod.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/mod.rs ' codemap/files
file src-tauri/src/vault/mod.rs rust L26 module src-tauri/src/vault in2 t1 | Vault metadata module.
## imported-by
imp src-tauri/src/commands/vault.rs:13 -> src-tauri/src/vault/mod.rs VaultIndexState
imp src-tauri/src/lib.rs:33 -> src-tauri/src/vault/mod.rs VaultIndexState
## reach
in2 src-tauri/src/vault/mod.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/vault/mod.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/vault/mod.rs
## symbols
sym src-tauri/src/vault/mod.rs:26 type VaultIndexState L1 | Tauri-managed wrapper around `VaultIndex`.
by src-tauri/src/vault/mod.rs:VaultIndexState <- src-tauri/src/commands/vault.rs:360 in update_note_in_index ref +22
by src-tauri/src/vault/mod.rs:VaultIndexState <- src-tauri/src/lib.rs:319 in run lexical
