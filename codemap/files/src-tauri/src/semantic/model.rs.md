# file card src-tauri/src/semantic/model.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/model.rs ' codemap/files
file src-tauri/src/semantic/model.rs rust L290 module src-tauri/src/semantic in1 t1 t:inline
## imported-by
imp src-tauri/src/commands/semantic.rs:7 -> src-tauri/src/semantic/model.rs ModelManager
## reach
in2 src-tauri/src/semantic/model.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/model.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_model_test.rs imports src-tauri/src/semantic/model.rs
## symbols
sym src-tauri/src/semantic/model.rs:13 struct ManagedModel L6 | Static configuration for a downloadable ONNX model.
sym src-tauri/src/semantic/model.rs:22 const BGE_M3_EMBEDDER L15 | BGE-M3 dense retrieval embedder (Xenova's INT8 ONNX conversion). 1024 dimensions, 100+ languages, 8192 max tokens, no query/passage prefixes.
sym src-tauri/src/semantic/model.rs:43 const JINA_RERANKER_V2 L15 | jina-reranker-v2-base-multilingual cross-encoder for reranking (`jinaai/jina-reranker-v2-base-multilingual`). 278M params, XLM-RoBERTa tokenizer, multilingual …
sym src-tauri/src/semantic/model.rs:60 struct ModelManager L4 | Manages ONNX model availability and download for a single `ManagedModel`.
by src-tauri/src/semantic/model.rs:ModelManager <- src-tauri/src/commands/semantic.rs:264 in ensure_embedder_loaded lexical +6
sym src-tauri/src/semantic/model.rs:68 method ModelManager::new(vault_path: &Path, model: &'static ManagedModel) -> Self L9 | Creates a manager scoped to a specific `ManagedModel`.
sym src-tauri/src/semantic/model.rs:79 method ModelManager::for_embedder(vault_path: &Path) -> Self L3 | Manager for the dense retrieval embedder (BGE-M3).
by src-tauri/src/semantic/model.rs:ModelManager::for_embedder <- src-tauri/src/commands/semantic.rs:264 in ensure_embedder_loaded lexical +3
sym src-tauri/src/semantic/model.rs:84 method ModelManager::for_reranker(vault_path: &Path) -> Self L3 | Manager for the cross-encoder reranker (jina-reranker-v2-base-multilingual).
by src-tauri/src/semantic/model.rs:ModelManager::for_reranker <- src-tauri/src/commands/semantic.rs:307 in ensure_reranker_loaded lexical +2
sym src-tauri/src/semantic/model.rs:89 method ModelManager::is_model_available(&self) -> bool L6 | Checks if all required model files exist on disk.
by src-tauri/src/semantic/model.rs:ModelManager::is_model_available <- src-tauri/src/commands/semantic.rs:265 in ensure_embedder_loaded lexical-method +6
sym src-tauri/src/semantic/model.rs:97 method ModelManager::model_path(&self) -> PathBuf L3 | Returns the path to the model directory.
by src-tauri/src/semantic/model.rs:ModelManager::model_path <- src-tauri/src/commands/semantic.rs:271 in ensure_embedder_loaded lexical-method +1
sym src-tauri/src/semantic/model.rs:103 method ModelManager::embedding_dimensions(&self) -> Option<usize> L3 | Returns the expected embedding dimensionality declared by the underlying `ManagedModel`.
by src-tauri/src/semantic/model.rs:ModelManager::embedding_dimensions <- src-tauri/src/commands/semantic.rs:269 in ensure_embedder_loaded lexical-method
sym src-tauri/src/semantic/model.rs:111 method ModelManager::download_model(&self, on_progress: impl Fn(f32),) -> Result<PathBuf, String> L30 | Downloads all model files from HuggingFace Hub.
by src-tauri/src/semantic/model.rs:ModelManager::download_model <- src-tauri/src/commands/semantic.rs:437 in download_reranker_model_inner lexical-method +1
## locals
local src-tauri/src/semantic/model.rs:143 fn ModelManager::download_file(&self, url: &str, dest: &Path, on_progress: impl Fn(f32),) -> Result<(), String> L62
## calls
call src-tauri/src/semantic/model.rs:80 in ModelManager::for_embedder -> src-tauri/src/semantic/model.rs:ModelManager::new call
call src-tauri/src/semantic/model.rs:85 in ModelManager::for_reranker -> src-tauri/src/semantic/model.rs:ModelManager::new call
call src-tauri/src/semantic/model.rs:131 in ModelManager::download_model -> src-tauri/src/semantic/model.rs:ModelManager::download_file call
## effects
fx src-tauri/src/semantic/model.rs:115 rust-tokio-fs.create_dir_all in ModelManager::download_model
fx src-tauri/src/semantic/model.rs:169 rust-tokio-fs.File::create in ModelManager::download_file
fx src-tauri/src/semantic/model.rs:190 rust-tokio-fs.rename in ModelManager::download_file
fx src-tauri/src/semantic/model.rs:200 rust-tokio-fs.remove_file in ModelManager::download_file
