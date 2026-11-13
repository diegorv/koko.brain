# file card src-tauri/src/semantic/filtering.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/semantic/filtering.rs ' codemap/files
file src-tauri/src/semantic/filtering.rs rust L586 module src-tauri/src/semantic in1 t0 t:inline
## imports
imp src-tauri/src/semantic/filtering.rs:1 -> src-tauri/src/semantic/types.rs SemanticResult
## imported-by
imp src-tauri/src/commands/semantic.rs:6 -> src-tauri/src/semantic/filtering.rs self
## reach
in2 src-tauri/src/semantic/filtering.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/semantic/filtering.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/semantic/filtering.rs:4 struct FilterOutcome L6 | Result of adaptive filtering, includes the filtered results and a log message.
sym src-tauri/src/semantic/filtering.rs:14 enum ScoreKind L24 | Which scale `SemanticResult::score` is on.
by src-tauri/src/semantic/filtering.rs:ScoreKind <- src-tauri/src/commands/semantic.rs:922 in search_semantic lexical +1
sym src-tauri/src/semantic/filtering.rs:43 method ScoreKind::for_search(used_reranker: bool, hybrid: bool) -> Self L7 | The kind of score a search hands to `finalize_results`: reranker logits when the cross-encoder ran, otherwise cosine for a semantic search and RRF for a hybrid…
by src-tauri/src/semantic/filtering.rs:ScoreKind::for_search <- src-tauri/src/commands/semantic.rs:922 in search_semantic lexical +1
sym src-tauri/src/semantic/filtering.rs:55 const COSINE_GAP_RATIO L1 | Cosine rule: a gap counts when it exceeds this fraction of the top score. 4% keeps clustered real matches (0.61-0.63 for a broad query) together; 2% split them…
sym src-tauri/src/semantic/filtering.rs:61 const MIN_LOGIT_RESULTS L1 | Fewest results a reranked list keeps after the gap rule.
sym src-tauri/src/semantic/filtering.rs:83 fn adaptive_filter(results: &[SemanticResult], kind: ScoreKind) -> Option<FilterOutcome> L63 | Applies adaptive filtering to remove noise from semantic search results.
sym src-tauri/src/semantic/filtering.rs:151 fn finalize_results(candidates: &mut Vec<SemanticResult>, limit: usize, kind: ScoreKind,) -> Option<FilterOutcome> L15 | Final step shared by `search_semantic` and `search_hybrid`: truncate to `limit`, run `adaptive_filter` for `kind` on what is left, and truncate again to its `k…
by src-tauri/src/semantic/filtering.rs:finalize_results <- src-tauri/src/commands/semantic.rs:924 in search_semantic lexical +1
sym src-tauri/src/semantic/filtering.rs:169 fn format_score_distribution(query: &str, results: &[SemanticResult], query_embedding_dims: usize, query_embedding_norm: f32,) -> String L56 | Logs diagnostic information about score distribution.
by src-tauri/src/semantic/filtering.rs:format_score_distribution <- src-tauri/src/commands/semantic.rs:943 in search_semantic lexical
## locals
local src-tauri/src/semantic/filtering.rs:67 fn sigmoid(x: f32) -> f32 L3
## calls
call src-tauri/src/semantic/filtering.rs:91 in adaptive_filter -> src-tauri/src/semantic/filtering.rs:sigmoid call
call src-tauri/src/semantic/filtering.rs:157 in finalize_results -> src-tauri/src/semantic/filtering.rs:adaptive_filter call
