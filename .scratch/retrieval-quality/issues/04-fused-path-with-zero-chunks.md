# Issue 04: Hybrid drops a fused path that has no chunk in the semantic index

Status: ready-for-agent
Source: retrieval-quality plan 2026-09-09, Task 2 residual

## What

After Task 2, `search::hybrid::assemble_candidates` materializes every fused
path that has at least one chunk. A path with zero chunks (a file saved
before the semantic indexer caught up, or one that produced no chunks) is
still skipped, so it drops out of hybrid even though text mode returns it.

## Fix

In `search_hybrid`, after `assemble_candidates`, collect fused paths with no
pick that are in `fts_paths`, and synthesize a `SemanticResult` for each
from the FTS row: `source_path` = path, `content` = the FTS snippet with
`<mark>` tags stripped, `heading` = None, `line_start`/`line_end` = 0, score =
its RRF score. Hand them to the reranker with the rest (they carry real text,
so the cross-encoder can judge them). Cap total pool at
`RERANK_CANDIDATE_POOL`.

## Tests

- Pure: a helper `synthesize_from_fts(path, snippet, rrf)` with snippet
  stripping tested in `search/hybrid.rs`.
- Existing assembler tests unchanged.

## Done when

`hybrid:` log shows `fts_only` counting the synthesized entries and text
mode's top-10 is a subset of hybrid's rerank pool for any query.
