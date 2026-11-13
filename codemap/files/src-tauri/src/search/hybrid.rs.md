# file card src-tauri/src/search/hybrid.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/search/hybrid.rs ' codemap/files
file src-tauri/src/search/hybrid.rs rust L719 module src-tauri/src/search in1 t0 t:inline | Pure candidate assembly for `search_hybrid`.
## imports
imp src-tauri/src/search/hybrid.rs:27 -> src-tauri/src/semantic/types.rs SemanticResult
## imported-by
imp src-tauri/src/commands/semantic.rs:1071 -> src-tauri/src/search/hybrid.rs query_terms
imp src-tauri/src/commands/semantic.rs:1076 -> src-tauri/src/search/hybrid.rs build_pool
imp src-tauri/src/commands/semantic.rs:1081 -> src-tauri/src/search/hybrid.rs ChunkCandidate
imp src-tauri/src/commands/semantic.rs:1103 -> src-tauri/src/search/hybrid.rs PoolEntry
imp src-tauri/src/commands/semantic.rs:1121 -> src-tauri/src/search/hybrid.rs PoolEntry
## reach
in2 src-tauri/src/search/hybrid.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/search/hybrid.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/search/hybrid.rs:31 struct ChunkCandidate L10 | One chunk as seen by the assembler.
by src-tauri/src/search/hybrid.rs:ChunkCandidate <- src-tauri/src/commands/semantic.rs:1081 in search_hybrid lexical
sym src-tauri/src/search/hybrid.rs:46 struct Pick L6 | A chosen representative: which fused entry it stands for and the index of the chunk in the caller's chunk sequence (enumeration order of the iterator passed to…
sym src-tauri/src/search/hybrid.rs:81 fn query_terms(query: &str) -> Vec<String> L17 | Splits a query into lowercase, deduplicated terms on non-alphanumeric boundaries.
by src-tauri/src/search/hybrid.rs:query_terms <- src-tauri/src/commands/semantic.rs:1071 in search_hybrid lexical
sym src-tauri/src/search/hybrid.rs:101 fn term_hits(content: &str, heading: Option<&str>, terms: &[String]) -> usize L11 | Counts how many distinct `terms` occur (case-insensitively) in `content` or `heading`.
sym src-tauri/src/search/hybrid.rs:120 fn assemble_candidates(fused: &[(String, f32)], chunks: I, terms: &[String], pool: usize,) -> Vec<Pick> L50 | Picks one representative chunk per fused path, in fused order, up to `pool` picks.
sym src-tauri/src/search/hybrid.rs:237 enum PoolEntry L6 | One entry of the rerank pool, in fused order.
by src-tauri/src/search/hybrid.rs:PoolEntry <- src-tauri/src/commands/semantic.rs:1103 in search_hybrid lexical +1
sym src-tauri/src/search/hybrid.rs:254 fn build_pool(fused: &[(String, f32)], chunks: I, terms: &[String], snippets: &HashMap<&str, &str>, pool: usize,) -> Vec<PoolEntry> L32 | Assembles the whole rerank pool for `fused`, in fused order, capped at `pool` entries.
by src-tauri/src/search/hybrid.rs:build_pool <- src-tauri/src/commands/semantic.rs:1076 in search_hybrid lexical
## locals
local src-tauri/src/search/hybrid.rs:183 fn synthesize_from_fts(path: &str, snippet: &str, rrf: f32) -> SemanticResult L11
local src-tauri/src/search/hybrid.rs:209 fn synthesize_fts_only(fused: &[(String, f32)], picks: &[Pick], snippets: &HashMap<&str, &str>,) -> Vec<(usize, SemanticResult)> L26
## calls
call src-tauri/src/search/hybrid.rs:144 in assemble_candidates -> src-tauri/src/search/hybrid.rs:term_hits call
call src-tauri/src/search/hybrid.rs:227 in synthesize_fts_only -> src-tauri/src/search/hybrid.rs:synthesize_from_fts call
call src-tauri/src/search/hybrid.rs:268 in build_pool -> src-tauri/src/search/hybrid.rs:assemble_candidates call
call src-tauri/src/search/hybrid.rs:269 in build_pool -> src-tauri/src/search/hybrid.rs:synthesize_fts_only call
