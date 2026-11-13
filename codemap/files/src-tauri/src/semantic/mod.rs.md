# file card src-tauri/src/semantic/mod.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/mod.rs ' codemap/files
file src-tauri/src/semantic/mod.rs rust L50 module src-tauri/src/semantic in0 t1
## reach
in2 src-tauri/src/semantic/mod.rs 0 files in 0 modules: -
out2 src-tauri/src/semantic/mod.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_session_builder_test.rs imports src-tauri/src/semantic/mod.rs
## symbols
sym src-tauri/src/semantic/mod.rs:16 fn(crate) ort_environment() -> Result<&'static ort::environment::Environment, String> L10 | Process-wide ONNX Runtime environment shared by the embedder and the reranker.
sym src-tauri/src/semantic/mod.rs:41 fn session_builder(num_threads: usize) -> Result<ort::session::builder::SessionBuilder, String> L10 | Starts an ONNX session builder pinned to the CPU execution provider.
## calls
call src-tauri/src/semantic/mod.rs:42 in session_builder -> src-tauri/src/semantic/mod.rs:ort_environment call
