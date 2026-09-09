# Issue 01: Quantize the in-memory embedding cache to int8

Status: needs-info
Source: retrieval-quality plan 2026-09-09, finding 5 / Task 6

Blocked by: the measured footprint. Task 6 added the
`Search cache loaded: N chunks, ~X MB (vectors …, text …, overhead …)` log
line; read it from a real vault before deciding. Arithmetic says ~4 KB per
chunk in vectors (85k chunks -> ~350 MB), but the number that matters is the
one in the log.

## What

`SEARCH_CACHE` (`src-tauri/src/commands/semantic.rs`) holds every chunk's
embedding as `Vec<f32>` with no idle unload. Vectors are L2-normalized by the
embedder (`embedder.rs`, `normalize_embedding`), so cosine is a dot product,
and int8 with a per-vector scale (i32 accumulate) gives ~4x less memory and
better cache locality on the brute-force scan.

## Scope

- Quantize at cache-load time only. The DB keeps f32 blobs, so no
  `EMBED_RECIPE_VERSION` bump and no reindex.
- Keep the query embedding in f32; dot int8 chunk against a quantized query
  or dequantize on the fly, whichever the benchmark favours.
- Recall check: extend `examples/retrieval_eval.rs` with a `--cache f32|int8`
  switch (or an env var) and compare top-50 overlap per query; the fixture
  from Task 1 is the dataset.
- Two-stage (binary/int8 first pass, f32 rescore) is out of scope at 85k
  chunks: the brute-force scan is already under 20 ms.

## Done when

Footprint log shows the reduction on the real vault, eval report shows
recall@10 unchanged (per-query regression list empty), all Rust tests green.
