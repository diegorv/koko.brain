# file card src-tauri/src/semantic/embedder.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/embedder.rs ' codemap/files
file src-tauri/src/semantic/embedder.rs rust L484 module src-tauri/src/semantic in1 t4 t:inline
## imports
imp src-tauri/src/semantic/embedder.rs:1 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/semantic.rs:5 -> src-tauri/src/semantic/embedder.rs cosine_similarity,deserialize_embedding,Embedder
## reach
in2 src-tauri/src/semantic/embedder.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/embedder.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/semantic/embedder.rs
test src-tauri/tests/semantic_embedder_qos_session_test.rs imports src-tauri/src/semantic/embedder.rs
test src-tauri/tests/semantic_embedder_threads_test.rs imports src-tauri/src/semantic/embedder.rs
test src-tauri/tests/semantic_qos_test.rs imports src-tauri/src/semantic/embedder.rs
## symbols
sym src-tauri/src/semantic/embedder.rs:18 fn embedder_intra_threads(available: Option<usize>) -> usize L3 | Returns the ONNX intra-op thread count for the embedder session, given the machine's available parallelism (`None` when it cannot be read).
sym src-tauri/src/semantic/embedder.rs:26 fn embedder_session_builder(num_threads: usize) -> Result<ort::session::builder::SessionBuilder, String> L5 | Starts the embedder's session builder: the shared [`super::session_builder`] policies plus [`super::qos::UtilityQosThreadManager`], so ORT starts the intra-op …
sym src-tauri/src/semantic/embedder.rs:33 struct Embedder L7 | Embedding model wrapper for ONNX inference.
by src-tauri/src/semantic/embedder.rs:Embedder <- src-tauri/src/commands/semantic.rs:28 in (module) ref +1
sym src-tauri/src/semantic/embedder.rs:58 method Embedder::load(model_dir: &Path, dimensions: usize) -> Result<Self, String> L48 | Loads the ONNX model and tokenizer from the given directory.
by src-tauri/src/semantic/embedder.rs:Embedder::load <- src-tauri/src/commands/semantic.rs:271 in ensure_embedder_loaded lexical
sym src-tauri/src/semantic/embedder.rs:108 method Embedder::dimensions(&self) -> usize L3 | Returns the embedding dimensionality.
sym src-tauri/src/semantic/embedder.rs:115 method Embedder::embed(&mut self, text: &str) -> Result<Vec<f32>, String> L7 | Generates an embedding for a single text string.
sym src-tauri/src/semantic/embedder.rs:127 method Embedder::embed_batch(&mut self, texts: &[&str],) -> Result<Vec<Vec<f32>>, String> L13 | Generates embeddings for multiple texts, automatically batching for inference.
by src-tauri/src/semantic/embedder.rs:Embedder::embed_batch <- src-tauri/src/commands/semantic.rs:671 in build_semantic_index_inner lexical-method +1
sym src-tauri/src/semantic/embedder.rs:238 fn(crate) hidden_dim_from_shape(shape: &[usize]) -> Result<usize, String> L10 | Returns the hidden dimension of a 3D `[batch, seq, hidden]` model output.
sym src-tauri/src/semantic/embedder.rs:252 fn(crate) validate_dimensions(expected: usize, actual: usize) -> Result<(), String> L9 | Returns `Ok(())` when `actual` matches the embedder's pinned `expected` dimensionality.
sym src-tauri/src/semantic/embedder.rs:342 fn deserialize_embedding(bytes: &[u8]) -> Option<Vec<f32>> L13 | Deserializes an embedding blob (little-endian f32s) or returns `None` for a malformed blob whose length is not a multiple of 4.
by src-tauri/src/semantic/embedder.rs:deserialize_embedding <- src-tauri/src/commands/semantic.rs:171 in get_or_load_cache lexical
sym src-tauri/src/semantic/embedder.rs:364 fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 L22 | Computes cosine similarity between two vectors.
by src-tauri/src/semantic/embedder.rs:cosine_similarity <- src-tauri/src/commands/semantic.rs:130 in CachedChunk::score lexical
## locals
local src-tauri/src/semantic/embedder.rs:142 fn Embedder::run_inference(&mut self, texts: &[&str]) -> Result<Vec<Vec<f32>>, String> L90
local src-tauri/src/semantic/embedder.rs:263 fn mean_pool_f32(token_embs: &ArrayViewD<f32>, attention_mask: &Array2<i64>, batch_len: usize, max_len: usize, hidden_dim: usize,) -> V… L28
local src-tauri/src/semantic/embedder.rs:293 fn mean_pool_f16(token_embs: &ArrayViewD<f16>, attention_mask: &Array2<i64>, batch_len: usize, max_len: usize, hidden_dim: usize,) -> V… L28
local src-tauri/src/semantic/embedder.rs:323 fn normalize_embedding(sum: &mut [f32], count: f32) L13
## calls
call src-tauri/src/semantic/embedder.rs:74 in Embedder::load -> src-tauri/src/semantic/embedder.rs:embedder_intra_threads call
call src-tauri/src/semantic/embedder.rs:75 in Embedder::load -> src-tauri/src/utils/logger.rs:debug_log lexical +4
call src-tauri/src/semantic/embedder.rs:77 in Embedder::load -> src-tauri/src/semantic/embedder.rs:embedder_session_builder call
call src-tauri/src/semantic/embedder.rs:116 in Embedder::embed -> src-tauri/src/semantic/embedder.rs:Embedder::embed_batch call
call src-tauri/src/semantic/embedder.rs:134 in Embedder::embed_batch -> src-tauri/src/semantic/embedder.rs:Embedder::run_inference call
call src-tauri/src/semantic/embedder.rs:214 in Embedder::run_inference -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/semantic/embedder.rs:215 in Embedder::run_inference -> src-tauri/src/semantic/embedder.rs:hidden_dim_from_shape call +1
call src-tauri/src/semantic/embedder.rs:216 in Embedder::run_inference -> src-tauri/src/semantic/embedder.rs:validate_dimensions call +1
call src-tauri/src/semantic/embedder.rs:217 in Embedder::run_inference -> src-tauri/src/semantic/embedder.rs:mean_pool_f32 call
call src-tauri/src/semantic/embedder.rs:223 in Embedder::run_inference -> src-tauri/src/semantic/embedder.rs:mean_pool_f16 call
call src-tauri/src/semantic/embedder.rs:285 in mean_pool_f32 -> src-tauri/src/semantic/embedder.rs:normalize_embedding call
call src-tauri/src/semantic/embedder.rs:315 in mean_pool_f16 -> src-tauri/src/semantic/embedder.rs:normalize_embedding call
