# Issue 03: BGE-M3 learned sparse weights as a third retrieval signal

Status: needs-info
Source: retrieval-quality plan 2026-09-09, finding 6 (refuted as stated)

Blocked by: the post-Task-2 eval. Task 2 restored the lexical leg in hybrid
(FTS-only paths are now reranked). Only if bucket A (rare exact terms) still
shows misses after that does a learned sparse signal earn its cost.

## Correction to the original finding

The Xenova ONNX export used by the embedder emits only `last_hidden_state`
(`embedder.rs` reads `outputs[0]`). BGE-M3's sparse and ColBERT heads are
separate small linear layers (`sparse_linear.pt`, `colbert_linear.pt` in the
BAAI repo) that are NOT in the export. Nothing is computed and discarded; the
sparse output does not exist today.

## What it would take

- Ship the `sparse_linear` weights (1024 -> 1) in a raw f32 file next to the
  model, apply `relu(W h_i + b)` per token to the hidden states already
  produced by the forward pass, aggregate max weight per token id.
- Store per-chunk token-weight maps (a new table), fuse as a third RRF leg.
- Query side: same projection on the query tokens.

Storage roughly doubles per the original non-goal in `docs/SEARCH.md`; the
forward pass itself is shared, so the compute cost is small.

## Done when

Eval shows bucket A recall@10 improving over the Task 2 baseline with no
bucket B regression; otherwise close as wontfix with the numbers.
