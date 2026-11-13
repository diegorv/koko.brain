# file card src-tauri/src/search/rrf.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/search/rrf.rs ' codemap/files
file src-tauri/src/search/rrf.rs rust L138 module src-tauri/src/search in1 t0 t:inline | Reciprocal Rank Fusion (RRF) for combining ranked result lists.
## imported-by
imp src-tauri/src/commands/semantic.rs:1059 -> src-tauri/src/search/rrf.rs rrf_fuse
imp src-tauri/src/commands/semantic.rs:1061 -> src-tauri/src/search/rrf.rs DEFAULT_RRF_K
## reach
in2 src-tauri/src/search/rrf.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/search/rrf.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/search/rrf.rs:19 const DEFAULT_RRF_K L1 | The published default constant from the SIGIR 2009 paper.
by src-tauri/src/search/rrf.rs:DEFAULT_RRF_K <- src-tauri/src/commands/semantic.rs:1061 in search_hybrid lexical
sym src-tauri/src/search/rrf.rs:29 fn rrf_fuse(rankings: &[&[&str]], k: u32) -> Vec<(String, f32)> L19 | Fuses N ranked lists of string keys via Reciprocal Rank Fusion.
by src-tauri/src/search/rrf.rs:rrf_fuse <- src-tauri/src/commands/semantic.rs:1059 in search_hybrid lexical
