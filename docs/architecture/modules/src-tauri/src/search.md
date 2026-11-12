---
summary: "Pure retrieval logic: RRF fusion, hybrid rerank pool assembly, fuzzy term expansion, FTS text helpers and eval metrics."
---

## Responsibility

Holds the pure logic behind text and hybrid search: Reciprocal Rank Fusion of ranked path lists (rrf.rs), assembly of the rerank pool from chunks and FTS snippets (hybrid.rs), Levenshtein-based expansion of query terms against the FTS5 vocabulary (fuzzy.rs), the text helpers that feed the FTS5 index such as title, heading and tag extraction, term sanitizing and the mtime reconcile plan (fts_logic.rs), and retrieval metrics for the offline eval example (eval_metrics.rs). It owns no state and no Tauri commands. The only database access is the vocabulary query that fuzzy.rs delegates to db::fts_repo on a connection the caller passes in. Command handlers live in commands, the schema in db, and the embedding index in semantic.

## Key files

- `src-tauri/src/search/rrf.rs`: rrf_fuse and DEFAULT_RRF_K: fuses ranked path lists by summed 1/(k+rank), ties broken by key.
- `src-tauri/src/search/hybrid.rs`: query_terms, term_hits, assemble_candidates and build_pool: one representative chunk per fused path plus synthesized FTS-only entries for chunkless paths.
- `src-tauri/src/search/fts_logic.rs`: plan_reconcile (disk versus stored mtime diff), extract_title, extract_headings, extract_tags and sanitize_fts_term.
- `src-tauri/src/search/fuzzy.rs`: levenshtein, auto_distance and expand_fuzzy_terms.
- `src-tauri/src/search/eval_metrics.rs`: Path normalization and dedupe, recall at k, reciprocal rank, mean, median and summarize for the retrieval eval example.
- `src-tauri/src/commands/search_index.rs`: Main consumer of fts_logic and fuzzy.
- `src-tauri/src/commands/semantic.rs`: Main consumer of rrf and hybrid inside search_hybrid.

## State

- None. Every item is a pure function or a plain data type.
- fuzzy.rs reads the FTS5 vocabulary table indirectly through db::fts_repo::expand_vocab_terms on a connection passed in by the caller.

## Collaborators

- `src-tauri/src/db`: fuzzy.rs calls db::fts_repo::expand_vocab_terms; fts_logic::extract_title is passed as a callback to db::fts_repo::rename_entries by the caller.
- `src-tauri/src/semantic`: hybrid.rs uses semantic::types::SemanticResult as the type of the synthesized FTS-only pool entries.
- `src-tauri/src/commands`: search_index.rs consumes fts_logic and fuzzy; semantic.rs consumes rrf and hybrid inside search_hybrid.
- `src-tauri/src/vault`: Not a code dependency. vault/parsing.rs extract_tags_strict is a deliberately stricter tag rule than fts_logic::extract_tags.
- `src-tauri/examples`: retrieval_eval.rs imports eval_metrics and scores text, semantic and hybrid retrieval.
- `src-tauri/tests`: search_fuzzy_test.rs and search_fts_test.rs exercise fuzzy and the FTS search path against a real database connection.

## Gotchas

- The module has no Tauri commands. IPC entry points are in commands/search_index.rs and commands/semantic.rs, which own the database and model handles.
- fuzzy.rs narrows vocabulary candidates with a first-character prefix pattern and a fixed candidate limit, so a misspelling in the first character is never corrected. Terms of two or fewer characters skip expansion (auto_distance returns 0).
- fts_logic::plan_reconcile treats only an exactly equal mtime as unchanged, so any difference, including an older timestamp, re-reads the file.
- hybrid::build_pool runs the chunk assembler uncapped and cuts to the pool size only after merging chunk picks with FTS-only entries by fused rank. Capping earlier would let a chunk pick displace a higher-ranked chunkless path.
- FTS-only entries use the key <path>#fts, have no heading and zero line numbers, and carry the fused score as a provisional score that the reranker later overwrites. Snippets that are empty once the mark tags are removed are dropped.
- hybrid.rs query_terms drops tokens shorter than three characters and the STOP_WORDS list, matched literally against lowercased tokens without diacritic folding, so the accented stop words are spelled out.
- fts_logic::sanitize_fts_term only removes double quote characters; it is not a full FTS5 query escaper.
- Two tag rules coexist on purpose: fts_logic::extract_tags is the broad rule for the FTS index and vault/parsing.rs extract_tags_strict is the strict rule for note tags. Changing one does not change the other.
- rrf::rrf_fuse sorts by score and then by key, so output order is deterministic for equal scores.
