# file card src-tauri/src/semantic/reranker.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/reranker.rs ' codemap/files
file src-tauri/src/semantic/reranker.rs rust L160 module src-tauri/src/semantic in1 t1
## imports
imp src-tauri/src/semantic/reranker.rs:1 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/semantic.rs:10 -> src-tauri/src/semantic/reranker.rs Reranker
## reach
in2 src-tauri/src/semantic/reranker.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/reranker.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_reranker_test.rs imports src-tauri/src/semantic/reranker.rs
## symbols
sym src-tauri/src/semantic/reranker.rs:16 struct Reranker L5 | Cross-encoder reranker wrapping a jina-reranker-v2-base-multilingual ONNX session.
by src-tauri/src/semantic/reranker.rs:Reranker <- src-tauri/src/commands/semantic.rs:49 in (module) ref +1
sym src-tauri/src/semantic/reranker.rs:39 method Reranker::load(model_dir: &Path) -> Result<Self, String> L48 | Loads the ONNX model + tokenizer from a directory containing `model.onnx` and `tokenizer.json`.
by src-tauri/src/semantic/reranker.rs:Reranker::load <- src-tauri/src/commands/semantic.rs:314 in ensure_reranker_loaded lexical
sym src-tauri/src/semantic/reranker.rs:93 method Reranker::rerank(&mut self, query: &str, documents: &[&str]) -> Result<Vec<f32>, String> L18 | Returns a logit per `(query, doc)` pair.
## locals
local src-tauri/src/semantic/reranker.rs:112 fn Reranker::run_inference(&mut self, pairs: Vec<EncodeInput>) -> Result<Vec<f32>, String> L48
## calls
call src-tauri/src/semantic/reranker.rs:56 in Reranker::load -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/semantic/reranker.rs:105 in Reranker::rerank -> src-tauri/src/semantic/reranker.rs:Reranker::run_inference call
