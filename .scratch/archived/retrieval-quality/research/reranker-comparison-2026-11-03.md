# Reranker speed and quality, measured on the owner's machine (2026-11-03)

Semantic and hybrid search took 10 to 23 s per query. This note records where
the time went, what was changed to cut it, a comparison of four cross-encoders,
and how to repeat every measurement. Read it before changing the reranker, its
pool, its batch size or its model, so the next change starts from a baseline.

Adopted on 2026-11-03 (branch `perf/jina-reranker`): the reranker is
`jina-reranker-v2-base-multilingual` int8, one pair per batch, a pool of 50, and
the gap filter keeps at least 10 reranked results. Everything else in this
note (the `KOKO_*` variables, the length sorted batches, the score scale, the
CoreML probe) lives only on `experiment/rerank-threads`, not merged.

## Summary

- The cross-encoder is more than 99% of a semantic or hybrid search. Embedding
  the query (8 to 29 ms), the cosine scan (about 20 ms in release), FTS
  (30 to 60 ms) and RRF (0 ms) are noise next to it.
- The cost is almost linear in the real tokens sent to the model. A 512-token
  pair costs about 365 ms alone (4 threads) and the same per pair inside a batch
  of 8, so batching only added padding: 47% of the tokens in a hybrid search
  and 62% in a semantic one were real.
- Running each pair alone (batch 1) and using 8 threads (the old default)
  cut the live rerank time from about 9.1 s to 5 s (semantic) and from about
  19.4 s to 7 s (hybrid), dev build, pool of 50 in both modes.
- Shrinking the candidate pool is a real trade: on the 19-query fixture,
  semantic recall@5 fell from 0.438 to 0.312 going from a pool of 50 to 25.
  An earlier one-query check ("OKR") had suggested 25 was safe. It was not.
- Of the four models compared, only `jina-reranker-v2-base-multilingual`
  (int8) keeps recall near `bge-reranker-v2-m3` (a tie on recall without the
  gap filter) while cutting the latency by about 2.9x. Its licence is CC-BY-NC-4.0 (non commercial).
  `gte-multilingual-reranker-base` is slower than bge, and `mmarco-mMiniLM`
  is fast but loses a lot of recall.
- Only what the header lists is adopted. The numbers come from 16 queries
  with an expected note, so a one-query difference is 0.0625 of recall and is noise.

## Setup

| Item | Value |
|---|---|
| Machine | MacBook Air, Apple M4, 10 cores (4 performance, 6 efficiency), 32 GB, fanless |
| `ort` | 2.0.0-rc.15, CPU provider only (`semantic/mod.rs` `session_builder`, intra-op spinning off) |
| Vault | the owner's, 10,643 notes, 157,026 chunks, int8 search cache of 438 MB |
| Embedder | BGE-M3 int8, 4 threads (unchanged) |
| Reranker | `bge-reranker-v2-m3` int8 from `onnx-community/bge-reranker-v2-m3-ONNX`, 512 token pair cap |
| Live timings | `pnpm tauri dev` (debug build). The cosine scan is 2.7 s there and about 20 ms in release; compare only `rerank_ms` and per batch `run_ms` |
| Eval | `src-tauri/examples/retrieval_eval.rs`, built with `--profile release-fast`, app closed, modes `semantic,hybrid` |
| Fixture | `{vault}/.kokobrain/eval/queries.json`, 19 queries: 6 rare exact terms (A), 10 Portuguese paraphrases (B), 3 with no answer (C). 16 have an expected note |

The eval p50 covers all 19 queries. The fixture and the reports hold note
paths from the vault, so they are not in this repository. The nine reports of
this study are in `{vault}/.kokobrain/eval/report-reranker-2026-11-03-*.json`.

## Where the time goes

The `[TAURI:RUST:SEMANTIC] timing` line (Issue 24 of `ui-responsiveness`)
splits a search by stage. On a warm cache, "OKR":

| Search | total | embedder | cosine (release) | fts | rerank |
|---|---|---|---|---|---|
| semantic | 9.6 to 14.2 s | 11 to 28 ms | 15 to 25 ms | | 9.0 to 11.9 s |
| hybrid | 20.7 to 23.2 s | 11 to 14 ms | 18 to 23 ms | 30 to 33 ms | 20.7 to 23.1 s |

Reloading the search cache after an index update costs 2.2 to 2.9 s and
happened on 2 of 10 searches in a session (Issue 26 of `ui-responsiveness`).
The UI does not freeze during a rerank: the WebView heartbeat kept running.

## Findings

### Padding and batch size

The per batch log (`[TAURI:RUST:RERANKER] batch n= max_len= real_tokens= run_ms=`)
showed that a batch is padded to its longest pair:

| Search | Real tokens | Padded tokens | Share real |
|---|---|---|---|
| hybrid, 50 pairs, batches of 8 | 11,305 | 24,072 | 47% |
| semantic, 50 pairs, batches of 8 | 8,150 | 13,244 | 62% |

Hybrid pairs are mostly 512 tokens (likely because the hybrid pool picks, per
fused path, the chunk with the most query term hits, see `docs/SEARCH.md`; not
verified), so most hybrid batches took
about 3.1 s against 0.85 to 1.5 s for semantic ones of about 290 tokens.

Sorting pairs by length before batching cut the rerank time by 29% (semantic)
and about 50% (hybrid) at 4 threads. Batch 1 was faster still, and scores no
longer depend on the neighbours in a batch.

### Scores depend on the batch

The int8 logits are not batch independent. For the same query the top three
scores moved by 1 to 5% with the batch size and ordering (hybrid "OKR":
5.62 / 3.98 / 3.75 with batches of 8 unsorted, 5.53 / 3.84 / 3.68 sorted,
5.66 / 3.80 / 3.62 with batch 1). Results with identical settings repeat
bit for bit. The cause was not isolated; dynamic int8 activation scales over
the whole batch is the likely one.

The gap filter turned that into a visible change: the same semantic "OKR"
query returned between 3 and 19 results depending on the batch size and pool.
The filter cut is unstable at that noise level, a separate problem from speed.
Batch 1 is the only setting where a document's score does not depend on the
other candidates.

### Threads

The M4 has 4 performance cores, so 4 of the 8 reranker threads land on
efficiency cores. Running only 4 threads was not faster (batch 1, "OKR", `rerank_ms`):

| Threads | semantic | hybrid |
|---|---|---|
| 4 | 5.4 to 5.7 s | 8.05 to 8.09 s |
| 8 | 4.7 to 4.9 s | 6.8 to 6.9 s |

Batch 2 at 8 threads was 3% faster than batch 1, not worth the batch dependent
scores.

### Pool size (live, batch 1, 8 threads, "OKR")

| Pool | semantic rerank | hybrid rerank |
|---|---|---|
| 50 | 4.97 s | 7.0 to 7.2 s |
| 35 | 3.1 s | 4.6 s |
| 25 | 2.1 to 2.3 s | 3.1 to 3.2 s |

In the hybrid search a pool of 25 and of 35 dropped a result the pool of 50
kept (an FTS led candidate ranked 36th to 50th in the fusion). The fixture
measured the cost, see below.

### Model comparison (retrieval_eval, 19 queries)

Pool is semantic / hybrid. R@5 equals R@10 everywhere because the gap filter
returns only 1.3 to 3.3 results on average. MRR is MRR@10.

| Reranker | Pool | hybrid R@5 | hybrid MRR | hybrid p50 | semantic R@5 | semantic MRR | semantic p50 |
|---|---|---|---|---|---|---|---|
| bge int8, batch 8 sorted | 50 / 50 | 0.625 | 0.625 | 5.4 s | 0.438 | 0.438 | 6.7 s |
| bge int8, batch 1 | 50 / 50 | 0.688 | 0.604 | 4.3 s | 0.438 | 0.406 | 7.0 s |
| bge int8, batch 1 | 25 / 50 | 0.688 | 0.604 | 4.0 s | 0.312 | 0.312 | 3.1 s |
| bge int8, batch 1 | 25 / 25 | 0.625 | 0.542 | 3.9 s | 0.312 | 0.312 | 3.6 s |
| gte-multilingual-reranker-base int8 | 25 / 50 | 0.688 | 0.559 | 6.0 s | 0.375 | 0.344 | 4.9 s |
| mmarco-mMiniLMv2-L12 qint8 arm64 | 25 / 50 | 0.438 | 0.438 | 0.68 s | 0.312 | 0.312 | 0.54 s |
| jina-reranker-v2-base-multilingual int8 | 25 / 50 | 0.688 | 0.565 | 1.6 s | 0.375 | 0.344 | 1.2 s |
| jina int8 | 50 / 50 | 0.688 | 0.565 | 1.7 s | 0.375 | 0.375 | 2.7 s |
| jina int8 | 25 / 25 | 0.562 | 0.490 | 1.4 s | 0.375 | 0.344 | 1.3 s |

The first row is not the main branch: the eval binary always sorts by length,
so the unsorted original (batch 8 in arrival order) cannot be run on it. It
reads the live numbers above for that.

Per bucket (jina pool 50 / 50 against bge batch 1 pool 50 / 50): hybrid is
equal (A 1.0 and B 0.5 for both); semantic jina is better on the Portuguese
paraphrases (B 0.5 against 0.4) and worse on rare exact terms (A 0.167 against
0.5), which the hybrid mode covers through FTS.

Reading: with the same pool of 50, jina matches bge in hybrid and loses one
query in semantic, at 39% of the time. `gte` is slower than bge with no recall gain. `mmarco` drops the rare term bucket in hybrid from 1.0 to 0.5.

### Model comparison without the gap filter

With the gap filter on, the lists above hold only 1.3 to 3.3 results, so
recall mixes the ordering of the reranker with where the filter cuts. With
`KOKO_NO_GAP_FILTER=1` the top 20 are returned untouched (R@5 and R@10 then
differ only by 5 positions; both read 0.688 / 0.500 for the three models at
pool 50).

| Reranker | hybrid R@5 | hybrid MRR | hybrid p50 | semantic R@5 | semantic MRR | semantic p50 |
|---|---|---|---|---|---|---|
| bge int8, pool 50 / 50 | 0.688 | 0.604 | 4.6 s | 0.500 | 0.438 | 7.5 s |
| jina int8, pool 50 / 50 | 0.688 | 0.565 | 1.6 s | 0.500 | 0.422 | 2.6 s |
| gte int8, pool 50 / 50 | 0.688 | 0.559 | 8.1 s | 0.500 | 0.469 | 13.5 s |
| bge int8, pool 25 / 25 | 0.625 | 0.542 | 5.2 s | 0.438 | 0.356 | 3.9 s |
| jina int8, pool 25 / 25 | 0.625 | 0.505 | 1.5 s | 0.438 | 0.356 | 1.4 s |

At the same pool, bge, jina and gte tie on recall in both modes; MRR differs
by 0.016 to 0.04 (one expected note one position lower) and gte has the best
semantic MRR (0.469) at 13.5 s. Jina is 2.9x faster than bge. Going from a
pool of 50 to 25 costs one query of recall in both modes, for bge and jina
alike.

### Live check of jina in the app (dev build, "OKR", pool 50)

`KOKO_RERANK_MODEL_DIR=~/rerank-models/jina-v2-int8 KOKO_RERANK_POOL=50 pnpm
tauri dev`: rerank 1.8 to 2.0 s (semantic) and 2.6 to 2.8 s (hybrid), against
5.0 s and 7.0 s for bge, but the semantic search returned 1 result and the
hybrid 2, against 13 and 16 for bge. The raw scores explain it: jina logits
span about -3.7 to +1.1, bge's about -11 to +3 (`[RERANKER] scores n= min=
max=` line). The gap filter in `semantic/filtering.rs` maps scores through a
sigmoid and cuts at the largest gap relative to the top; it was tuned on the
bge scale and cuts at the first or second result on the jina one. Adopting
jina needs the filter to be reviewed (Issue 05 of this feature is the same
problem for bge).

### CoreML and the Neural Engine (probe, `examples/rerank_coreml_probe.rs`)

One synthetic pair at a fixed length, batch 1, `ort` rc.15 with its `coreml`
feature on, MLProgram format, dimensions `batch_size` and `sequence_length`
overridden to static values, a guard that kills the probe above 6 GB of RSS or
300 s.

- `bge-reranker-v2-m3` fp16 (1,136 MB): aborted on `ane`, `gpu` and `all` at
  length 256, 6.2 to 6.3 GB of RSS during load and no inference ran. Same
  failure shape as the embedder in `docs/SEARCH.md`.
- `jina-reranker-v2-base-multilingual` fp16 (557 MB) loads, and the logits
  agree with the CPU (1.1328 on CoreML against 1.1299 fp16 CPU and 1.1293
  int8 CPU at length 256).

Median per pair (ms), jina, 8 CPU threads for the CPU rows:

| Length | CPU int8 | CPU fp16 | CoreML `ane` (fp16) | CoreML `gpu` | CoreML `all` |
|---|---|---|---|---|---|
| 128 | 27 | | 15 | | |
| 256 | 43 to 51 | 63 | 27 to 33 | 66 | 35 |
| 512 | 154 | | 84 | | |

The Neural Engine is about 1.8x faster per pair than int8 on the CPU, and the
GPU is not faster. The costs: loading takes 69 to 87 s per length (a
`ModelCacheDirectory` did not shorten a second load; its folders are named
`*_dynamic_mlprogram` and the graph is split into about 29 CoreML pieces),
each length needs its own session at about 2.3 GB of RSS, and the reranker is
loaded lazily and unloaded after 2 minutes of idle time, so the first search
after a pause would wait for a load. Not adopted. It would need a background
preload, no idle unload, and a fix for the load time first. Not measured:
a full search with it, or recall (fp16 against int8).

### Gap filter on the jina scale (pool 50, filter on)

Jina's raw logits span about -3.7 to +1.1 against bge's -11 to +3, and the
filter cuts at the first or second result on that scale. Two env switches were
tried, both off by default: `KOKO_RERANK_SCORE_SCALE` multiplies the logits and
`KOKO_MIN_RESULTS` stops the gap rule from leaving fewer results than N.

| Config | hybrid R@5 | hybrid n | hybrid p50 | semantic R@5 | semantic n | semantic p50 |
|---|---|---|---|---|---|---|
| bge, gap filter as is | 0.688 | 1.6 | 4.3 s | 0.438 | 1.3 | 7.0 s |
| bge, floor 5 | 0.688 | 5.0 | 6.0 s | 0.500 | 3.9 | 8.3 s |
| jina, gap filter as is | 0.688 | 2.9 | 1.7 s | 0.375 | 1.9 | 2.7 s |
| jina, score x2 | 0.625 | 2.4 | 1.9 s | 0.375 | 1.6 | 3.0 s |
| jina, score x3 | 0.500 | 1.6 | 2.4 s | 0.375 | 1.5 | 3.6 s |
| jina, score x4 | 0.500 | 1.6 | 2.3 s | 0.344 | 1.5 | 3.6 s |
| jina, floor 5 | 0.688 | 5.4 | 2.1 s | 0.438 | 4.4 | 3.2 s |
| jina, floor 10 | 0.688 | 10.0 | 2.2 s | 0.500 | 8.2 | 3.1 s |

Scaling the scores matches bge's list lengths but costs recall (hybrid 0.688 to
0.500 at x3). A floor does not: with jina a floor of 10 gives the same recall
as no filter at all (0.688 hybrid, 0.500 semantic) and lists of 8 to 10, at
about 2.2 s (hybrid) and 3.1 s (semantic).

## Other models read on 2026-11-03 (research only, nothing downloaded or run)

Three read-only agents checked primary pages; vendor numbers are claims.

- Jina v3 and v3.5: listwise rerankers on Qwen3-0.6B (about 597M parameters)
  that rank up to 64 documents in one context. No official ONNX (GGUF and MLX
  only; two undocumented community ONNX builds of v3), CC-BY-NC-4.0, and they
  do not output one logit per pair, so they need new tokenizer, prompt and
  score code. Skip v3. v3.5 could only be probed outside the app with the MLX
  or GGUF build first.
- `Horizon-Labs/multilingual-reranker-small` (v1.2, 2026-10-20): 141M
  parameters, ModernBERT on mmBERT-small, distilled from Qwen3-Reranker-4B,
  47 languages including Portuguese, Apache-2.0. Vendor nDCG@10 mean 0.847
  against 0.866 for bge-reranker-v2-m3 on reranking MTEB candidate lists. Its
  own note: bge-m3 dense similarity alone scores 0.837 on the same
  candidates, so with a BGE-M3 first stage the gain over no reranker is small.
  The official int8 file quantizes only the embeddings, so it is no faster
  than fp32; `sno-lab/multilingual-reranker-small-int8` (171 MB) puts the
  matmuls in int8. Integration risks: a Gemma style tokenizer (pair template
  from `tokenizer.json`, not XLM-R), trained at 384 tokens per pair, and the
  ModernBERT graph on `ort` rc.15 is untested. The only new candidate worth
  testing, mostly for the licence.
- Embedders (granite-embedding-97m-multilingual-r2, multilingual-e5-small,
  jina-embeddings-v5-text-nano-retrieval): none helps search latency (query
  embedding is 8 to 29 ms). Granite 97M (Apache-2.0, 384 dims, int8 98 MB)
  would shrink the vector cache from 161 MB to about 61 MB and speed up
  re-indexing, but it needs a ModernBERT tokenizer and CLS pooling, a full
  re-embed of 157k chunks, and an earlier note had its 311M sibling below
  BGE-M3 on Portuguese retrieval. e5-small is dominated by granite;
  jina v5 nano is CC-BY-NC with Portuguese coverage unconfirmed.

## Candidate models checked on Hugging Face (2026-11-03)

| Model | Parameters | Licence | ONNX used | Size |
|---|---|---|---|---|
| `BAAI/bge-reranker-v2-m3` (current) | 568M | Apache-2.0 | `onnx-community/bge-reranker-v2-m3-ONNX` `model_int8.onnx` | 571 MB |
| `Alibaba-NLP/gte-multilingual-reranker-base` | 306M | Apache-2.0 | `onnx-community/gte-multilingual-reranker-base` `model_int8.onnx` | 341 MB |
| `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` | 118M | Apache-2.0 | `onnx/model_qint8_arm64.onnx` | 119 MB |
| `jinaai/jina-reranker-v2-base-multilingual` | 278M | CC-BY-NC-4.0 | `onnx/model_int8.onnx` | 280 MB |

Not tried: `BAAI/bge-reranker-base` (278M, MIT, card says Chinese and English
only, ONNX fp32 only), `mixedbread-ai/mxbai-rerank-base-v2` (about 500M, an
LLM style reranker with no ONNX export, so no speed gain), Qwen3-Reranker
(larger). Searches found no published ONNX latency numbers for any of them.

## Not done

- A full search with CoreML, and recall of the fp16 model (see the CoreML
  section: only a one-pair probe was run).
- A shorter pair cap than 512 tokens (the cost is near linear in tokens and
  hybrid pairs are mostly 512).
- Showing the FTS and cosine results first (about 60 ms) and replacing them with
  the reranked list when it arrives; no quality cost, needs UI and IPC work.
- A larger fixture. 16 expected queries cannot separate models that differ by
  0.04 in MRR.

## Adoption status

Done on `perf/jina-reranker`:

1. Licence: CC-BY-NC-4.0 accepted; the project is open source and non-commercial.
2. `semantic/model.rs` (`for_reranker`) points at the jina files; the loader
   needed no change (no `token_type_ids`, one logit per pair, the same XLM-R
   pair tokenizer).
3. The gap filter keeps at least 10 reranked results (`MIN_LOGIT_RESULTS`),
   which answers the 1 and 2 result lists the rule left on the jina scale.

Still open: repeat the eval on a larger fixture, with a pool of 50 in both modes.

## Reproduce

```sh
cd <checkout>
cargo build --profile release-fast --manifest-path src-tauri/Cargo.toml --example retrieval_eval
MODELS=~/rerank-models bash .scratch/retrieval-quality/research/reranker-comparison-2026-11-03/fetch-models.sh
```

The per-configuration eval runs need the `KOKO_*` variables below, which exist
only on `experiment/rerank-threads`: check that branch out to repeat them. On
`perf/jina-reranker` and `main` the variables are not read, so every run would
use the shipped setup. Close the app first. One configuration takes 1 to 4
minutes. Variables on `experiment/rerank-threads` (all optional):

| Variable | Effect |
|---|---|
| `KOKO_RERANK_THREADS=N` | reranker intra-op threads (default `min(8, cores)`) |
| `KOKO_RERANK_BATCH=N` | texts per inference batch (default 1) |
| `KOKO_RERANK_POOL=N` | candidates reranked in both modes (default 25 semantic, 50 hybrid) |
| `KOKO_RERANK_MODEL_DIR=<dir>` | load `model.onnx` and `tokenizer.json` from `<dir>` instead of the vault |
| `KOKO_NO_GAP_FILTER=1` | skip the gap filter and return the top `limit` (evaluation only) |

The CoreML probe needs `ort`'s `coreml` feature, enabled in `src-tauri/Cargo.toml`
on the branch.

Commits on `experiment/rerank-threads`: `5926416a` (thread override and per
batch log), `5e9ada1d` (length sorted batches), `18db46bc` (batch override),
`de4c2dec` (batch 1 default and pool override), `838ecf19` (per mode pools),
`685ab90e` (other models and `token_type_ids`), and the commit that adds the
raw score log and `KOKO_NO_GAP_FILTER`.

## Caveats

- One machine, one vault, one fixture of 19 queries. The fanless Air may
  throttle: hybrid batches of 512 tokens rose from 3.05 s to 4.0 s across two
  consecutive searches once; the cause was not confirmed.
- Live timings are a debug build; the eval p50 is a release-fast build with the
  app closed. They are not comparable with each other, only inside one table.
- The live "OKR" checks looked only at the first three results (the log prints
  three).
