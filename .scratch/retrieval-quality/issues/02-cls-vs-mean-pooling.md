# Issue 02: Verify BGE-M3 pooling — mean pooling in the embedder vs CLS in the reference

Status: needs-triage
Source: retrieval-quality plan 2026-09-09, observation made while refuting finding 6

## What

`src-tauri/src/semantic/embedder.rs` mean-pools the last hidden state
(`mean_pool_f32` / `mean_pool_f16`) and L2-normalizes. BGE-M3's dense
retrieval vector is, in the BAAI reference implementation, the normalized
CLS token, and the Xenova/bge-m3 model card example uses `pooling: 'cls'`.
This was not verified against the model card during the plan session; it is
a claim to check, not a finding.

## Why it matters

If the reference is CLS, every stored embedding was produced under a
different pooling than the model was trained for. Mean pooling still works
(the eval baseline will show how well) but is likely leaving quality on the
table for both semantic and hybrid modes.

## Scope

1. Confirm against the model card and the FlagEmbedding source. Record the
   answer here.
2. If CLS is the reference: add a pooling switch to the embedder, bump
   `EMBED_RECIPE_VERSION` (full re-embed), run the Task 1 eval before and
   after on the same fixture. Ship only if recall@10 / MRR@10 improve without
   per-query regressions.
3. If mean is fine or the card is ambiguous: close with the reasoning.

Cost is a full re-embed of the vault (minutes on M-series), so this is not a
casual change.
