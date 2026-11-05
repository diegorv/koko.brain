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

## Comments

### 2026-09-10 - answered in part, see the discovery doc

Scope item 1 is settled: the reference **is** CLS. Full evidence and the
numbers below are in `../discovery-embedder-2026-09-10.md` (§3, §4a, §6),
with the verbatim research report at
`../research/bge-m3-pooling-2026-09-10.md`.

The short version:

- `norm(H[CLS])` is the definition of BGE-M3's dense vector in four
  independent primary sources - the paper (which assigns `[CLS]` to dense
  and the other tokens to sparse/multi-vector by construction), the
  FlagEmbedding reference code, `1_Pooling/config.json` in the BAAI repo
  (`pooling_mode_mean_tokens: false`), and the Xenova card's own example.
  BAAI's README calls mean pooling "a significant decrease in performance",
  with no number attached. No published delta exists for mean pooling
  applied to a CLS-trained checkpoint, so the case rests on definition,
  not on a benchmark.
- Measured on a sample (current top-50 chunks + expected chunks + a 380-path
  background): the five paraphrase misses go from mean ranks
  502/7/603/643/3038 to estimated global CLS ranks 1/~51/1/1/1-2. Controls
  b03, b04, b06, b08 stay at 1; a05 improves 20 -> ~1; a01 (short keyword
  query) regresses 5 -> ~176. CLS also compresses the cosine range (good
  matches 0.47-0.66 vs 0.63-0.79 under mean), so the thresholds in issue 06
  would have to be re-derived.
- That sample is **not** a measurement: the candidates were selected by mean
  cosine and the two spaces are mutually incompatible, so neither the gains
  nor the a01 regression is admissible on its own.
- Scope item 2 got cheaper. Ollama's `bge-m3` (F16 GGUF, `pooling_type 2` =
  CLS, 100% Metal) measures ~10 chunks/s at batch 8 against 3.6-4.2 on the
  ONNX CPU path, so a full re-embed is **~3.8 h instead of ~10 h**. It
  cannot coexist with the current index (mean/int8/512), so it is only
  usable as a full re-embed with the query path switched to CLS in the same
  change.

Not scheduled: the owner's 2026-09-10 decision is to not migrate without an
in-app number. If this is picked up, validate on the 30-min 5% sample
protocol in the discovery doc §8(b) before spending the 3.8 h.
