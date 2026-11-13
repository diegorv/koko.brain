# module card src-tauri/src/search
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/search ' codemap/modules
module src-tauri/src/search rust files 6 in-modules 1 out-modules 2 pub 12/28 ipc 0/0 card ~1.3k
## neighbors
dep src-tauri/src/commands -> src-tauri/src/search 4
dep src-tauri/src/search -> src-tauri/src/db 1
dep src-tauri/src/search -> src-tauri/src/semantic 1
in2 src-tauri/src/search 1 modules: src-tauri/src(2)
out2 src-tauri/src/search 1 modules: src-tauri/src/utils(1)
## entry files
entry src-tauri/src/search/fts_logic.rs ext-in1 src-tauri/src/commands/search_index.rs
entry src-tauri/src/search/fuzzy.rs ext-in1 src-tauri/src/commands/search_index.rs
entry src-tauri/src/search/hybrid.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/search/rrf.rs ext-in1 src-tauri/src/commands/semantic.rs
## files
file src-tauri/src/search/eval_metrics.rs rust L364 module src-tauri/src/search in0 t0 t:inline | Pure retrieval metrics for the offline eval harness (`examples/retrieval_eval.rs`).
file src-tauri/src/search/fts_logic.rs rust L418 module src-tauri/src/search in1 t0 t:inline
file src-tauri/src/search/fuzzy.rs rust L195 module src-tauri/src/search in1 t2 t:inline
file src-tauri/src/search/hybrid.rs rust L719 module src-tauri/src/search in1 t0 t:inline | Pure candidate assembly for `search_hybrid`.
file src-tauri/src/search/mod.rs rust L5 module src-tauri/src/search in0 t0
file src-tauri/src/search/rrf.rs rust L138 module src-tauri/src/search in1 t0 t:inline | Reciprocal Rank Fusion (RRF) for combining ranked result lists.
## public
sym src-tauri/src/search/fts_logic.rs:37 fn plan_reconcile(disk: &HashMap<String, i64>, stored: &HashMap<String, i64>) -> ReconcilePlan L22 | Diffs the disk's `path -> mtime` map against the one stored in `notes_content` and returns what has to change.
sym src-tauri/src/search/fts_logic.rs:61 fn extract_title(file_path: &str) -> String L7 | Extracts the title from a file path (filename without extension).
sym src-tauri/src/search/fts_logic.rs:70 fn extract_headings(content: &str) -> String L19 | Extracts heading lines from markdown content.
sym src-tauri/src/search/fts_logic.rs:91 fn extract_tags(content: &str) -> String L99 | Extracts tags from markdown content (frontmatter `tags:` + inline `#tag`).
sym src-tauri/src/search/fts_logic.rs:193 fn sanitize_fts_term(term: &str) -> String L3 | Sanitizes a term for safe use in FTS5 queries.
sym src-tauri/src/search/fuzzy.rs:46 fn expand_fuzzy_terms(conn: &Connection, term: &str) -> Result<Vec<String>, String> L24 | Expands a query term to include fuzzy matches from the FTS5 vocabulary.
sym src-tauri/src/search/hybrid.rs:31 struct ChunkCandidate L10 | One chunk as seen by the assembler.
sym src-tauri/src/search/hybrid.rs:81 fn query_terms(query: &str) -> Vec<String> L17 | Splits a query into lowercase, deduplicated terms on non-alphanumeric boundaries.
sym src-tauri/src/search/hybrid.rs:237 enum PoolEntry L6 | One entry of the rerank pool, in fused order.
sym src-tauri/src/search/hybrid.rs:254 fn build_pool(fused: &[(String, f32)], chunks: I, terms: &[String], snippets: &HashMap<&str, &str>, pool: usize,) -> Vec<PoolEntry> L32 | Assembles the whole rerank pool for `fused`, in fused order, capped at `pool` entries.
sym src-tauri/src/search/rrf.rs:19 const DEFAULT_RRF_K L1 | The published default constant from the SIGIR 2009 paper.
sym src-tauri/src/search/rrf.rs:29 fn rrf_fuse(rankings: &[&[&str]], k: u32) -> Vec<(String, f32)> L19 | Fuses N ranked lists of string keys via Reciprocal Rank Fusion.
## debt
-
