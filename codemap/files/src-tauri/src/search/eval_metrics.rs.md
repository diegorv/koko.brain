# file card src-tauri/src/search/eval_metrics.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/search/eval_metrics.rs ' codemap/files
file src-tauri/src/search/eval_metrics.rs rust L364 module src-tauri/src/search in0 t0 t:inline | Pure retrieval metrics for the offline eval harness (`examples/retrieval_eval.rs`).
## reach
in2 src-tauri/src/search/eval_metrics.rs 0 files in 0 modules: -
out2 src-tauri/src/search/eval_metrics.rs 0 files in 0 modules: -
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/search/eval_metrics.rs
## symbols
sym src-tauri/src/search/eval_metrics.rs:15 fn normalize_path(path: &str) -> String L5 | Normalizes a vault-relative path for comparison: trims whitespace and strips a leading `./` or `/`.
sym src-tauri/src/search/eval_metrics.rs:24 fn dedupe_paths(paths: I) -> Vec<String> L15 | Collapses a chunk-level result list to unique normalized paths, keeping first-occurrence order.
sym src-tauri/src/search/eval_metrics.rs:43 fn recall_at_k(ranked: &[String], expected: &[String], k: usize) -> Option<f32> L11 | Fraction of `expected` paths present in the first `k` entries of `ranked`.
sym src-tauri/src/search/eval_metrics.rs:58 fn reciprocal_rank_at_k(ranked: &[String], expected: &[String], k: usize) -> Option<f32> L12 | Reciprocal rank (`1 / rank`, 1-indexed) of the first `expected` path within the top `k` of `ranked`; `0.0` when none appears.
sym src-tauri/src/search/eval_metrics.rs:72 fn mean(values: &[f32]) -> Option<f32> L6 | Arithmetic mean, `None` for an empty slice.
sym src-tauri/src/search/eval_metrics.rs:80 fn median(values: &[f32]) -> Option<f32> L13 | Median (lower-middle average for even counts), `None` for an empty slice.
sym src-tauri/src/search/eval_metrics.rs:98 fn looks_like_a_real_term(term: &str) -> bool L9 | Cheap junk filter for fixture-draft candidates (`retrieval_eval --init-fixture`, bucket A): letters in any script with at most underscores, not a hex-looking b…
sym src-tauri/src/search/eval_metrics.rs:109 struct QueryEval L8 | One query's outcome in one search mode.
sym src-tauri/src/search/eval_metrics.rs:120 struct ModeSummary L16 | Aggregate metrics for one search mode over a set of queries.
sym src-tauri/src/search/eval_metrics.rs:140 fn summarize(evals: &[QueryEval]) -> ModeSummary L29 | Aggregates per-query outcomes into a `ModeSummary`.
## calls
call src-tauri/src/search/eval_metrics.rs:32 in dedupe_paths -> src-tauri/src/search/eval_metrics.rs:normalize_path call
call src-tauri/src/search/eval_metrics.rs:47 in recall_at_k -> src-tauri/src/search/eval_metrics.rs:normalize_path call +1
call src-tauri/src/search/eval_metrics.rs:62 in reciprocal_rank_at_k -> src-tauri/src/search/eval_metrics.rs:normalize_path call +1
call src-tauri/src/search/eval_metrics.rs:149 in summarize -> src-tauri/src/search/eval_metrics.rs:recall_at_k call +1
call src-tauri/src/search/eval_metrics.rs:155 in summarize -> src-tauri/src/search/eval_metrics.rs:reciprocal_rank_at_k call
call src-tauri/src/search/eval_metrics.rs:162 in summarize -> src-tauri/src/search/eval_metrics.rs:mean call +3
call src-tauri/src/search/eval_metrics.rs:166 in summarize -> src-tauri/src/search/eval_metrics.rs:median call
