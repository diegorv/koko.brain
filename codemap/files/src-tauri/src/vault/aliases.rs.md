# file card src-tauri/src/vault/aliases.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/aliases.rs ' codemap/files
file src-tauri/src/vault/aliases.rs rust L78 module src-tauri/src/vault in1 t1 t:inline | Frontmatter key alias resolution.
## imported-by
imp src-tauri/src/vault/parsing.rs:16 -> src-tauri/src/vault/aliases.rs canonicalize_key
## reach
in2 src-tauri/src/vault/aliases.rs 4 files in 2 modules: src-tauri/src/vault(3) src-tauri/src/commands(1)
out2 src-tauri/src/vault/aliases.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/vault_aliases_test.rs imports src-tauri/src/vault/aliases.rs
## symbols
sym src-tauri/src/vault/aliases.rs:32 fn canonicalize_key(key: &str) -> &str L3 | Returns the canonical key name if the input matches a known alias, otherwise returns the input unchanged.
by src-tauri/src/vault/aliases.rs:canonicalize_key <- src-tauri/src/vault/parsing.rs:823 in project_document lexical +1
