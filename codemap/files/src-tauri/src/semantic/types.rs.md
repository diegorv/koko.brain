# file card src-tauri/src/semantic/types.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/types.rs ' codemap/files
file src-tauri/src/semantic/types.rs rust L212 module src-tauri/src/semantic in5 t3 t:inline
## imported-by
imp src-tauri/src/commands/semantic.rs:12 -> src-tauri/src/semantic/types.rs SemanticFileStatus,SemanticPhase,SemanticProgress,SemanticResult,SemanticStats
imp src-tauri/src/commands/semantic.rs:139 -> src-tauri/src/semantic/types.rs heading_prefixed_text
imp src-tauri/src/commands/semantic.rs:1345 -> src-tauri/src/semantic/types.rs Chunk
imp src-tauri/src/search/hybrid.rs:27 -> src-tauri/src/semantic/types.rs SemanticResult
imp src-tauri/src/semantic/chunker.rs:3 -> src-tauri/src/semantic/types.rs Chunk
imp src-tauri/src/semantic/filtering.rs:1 -> src-tauri/src/semantic/types.rs SemanticResult
imp src-tauri/src/semantic/update_plan.rs:14 -> src-tauri/src/semantic/types.rs Chunk
## reach
in2 src-tauri/src/semantic/types.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/types.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/ipc_contracts_test.rs imports src-tauri/src/semantic/types.rs
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/semantic/types.rs
test src-tauri/tests/semantic_update_plan_test.rs imports src-tauri/src/semantic/types.rs
## symbols
sym src-tauri/src/semantic/types.rs:5 struct SemanticResult L18 dto:SemanticResult | A search result from semantic (embedding-based) search.
by src-tauri/src/semantic/types.rs:SemanticResult <- src-tauri/src/commands/semantic.rs:802 in search_semantic ref +7
by src-tauri/src/semantic/types.rs:SemanticResult <- src-tauri/src/search/hybrid.rs:183 in synthesize_from_fts ref +3
by src-tauri/src/semantic/types.rs:SemanticResult <- src-tauri/src/semantic/filtering.rs:83 in adaptive_filter ref +2
sym src-tauri/src/semantic/types.rs:28 struct SemanticStats L8 dto:SemanticStats | Statistics about the semantic search index.
by src-tauri/src/semantic/types.rs:SemanticStats <- src-tauri/src/commands/semantic.rs:486 in build_semantic_index ref +4
sym src-tauri/src/semantic/types.rs:42 struct SemanticFileStatus L9 dto:SemanticFileStatus | Per-file semantic indexing status.
by src-tauri/src/semantic/types.rs:SemanticFileStatus <- src-tauri/src/commands/semantic.rs:1235 in get_semantic_file_status ref +1
sym src-tauri/src/semantic/types.rs:56 struct SemanticProgress L10 dto:SemanticProgress | Progress event emitted during semantic indexing.
by src-tauri/src/semantic/types.rs:SemanticProgress <- src-tauri/src/commands/semantic.rs:412 in emit_progress ref +7
sym src-tauri/src/semantic/types.rs:72 enum SemanticPhase L10 dto:SemanticPhase | Phase reported by `SemanticProgress`.
by src-tauri/src/semantic/types.rs:SemanticPhase <- src-tauri/src/commands/semantic.rs:439 in download_reranker_model_inner lexical +3
sym src-tauri/src/semantic/types.rs:84 struct Chunk L21 | A chunk of markdown content ready for embedding.
by src-tauri/src/semantic/types.rs:Chunk <- src-tauri/src/commands/semantic.rs:1345 in update_semantic_file lexical
by src-tauri/src/semantic/types.rs:Chunk <- src-tauri/src/semantic/chunker.rs:61 in chunk_markdown ref +3
by src-tauri/src/semantic/types.rs:Chunk <- src-tauri/src/semantic/update_plan.rs:19 in (module) ref +2
sym src-tauri/src/semantic/types.rs:117 fn heading_prefixed_text(parent_headings: &[String], heading: Option<&str>, content: &str) -> String L11 | Builds the heading-prefixed projection of a chunk: the text the embedder indexes (`Chunk::embed_text`) and the text the cross-encoder scores at query time (`Ca…
by src-tauri/src/semantic/types.rs:heading_prefixed_text <- src-tauri/src/commands/semantic.rs:139 in CachedChunk::rerank_text lexical
sym src-tauri/src/semantic/types.rs:134 method Chunk::embed_text(&self) -> String L3 | Returns the text that should be fed to the embedder.
by src-tauri/src/semantic/types.rs:Chunk::embed_text <- src-tauri/src/commands/semantic.rs:659 in build_semantic_index_inner lexical-method +1
## calls
call src-tauri/src/semantic/types.rs:135 in Chunk::embed_text -> src-tauri/src/semantic/types.rs:heading_prefixed_text call
