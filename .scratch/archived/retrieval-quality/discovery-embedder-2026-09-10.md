# Discovery: embedder and pooling after the retrieval-quality plan

Status: discovery, no task open (owner decision 2026-09-10: do not migrate
without in-app proof; local stack already improved)
Source: follow-up to the retrieval-quality plan (PR #166); four diagnostics
and measurements run 2026-09-10 against the owner's vault

This is a discovery record, not an issue. It exists so the evidence behind
the 2026-09-10 decision survives, and so issues 02, 05 and 06 can be
re-read against it later. Nothing here is scheduled.

Companion research reports, copied verbatim into `research/`:

- `research/bge-m3-pooling-2026-09-10.md` - how BGE-M3 defines its dense
  vector, what mean pooling costs, the real migration cost, and the
  alternatives that need no re-embed.
- `research/embedder-options-2026-09-10.md` - Voyage AI and the local model
  field (EmbeddingGemma, arctic-embed-l-v2.0, Qwen3-Embedding, harrier,
  granite-r2, multilingual-e5).

Both reports are in Portuguese, as written. They carry their own source
lists; citation markers below refer to those lists.

Queries are named by fixture id only (`a*` = rare exact terms, `b*` =
paraphrase, `c*` = nonsense controls). No note path, title or content
appears in this document.

## 1. Context

The retrieval-quality plan (PR #166) and issues 07, 01, 04, 08 and 09 are
landed - main `740e6f5f`, shipped as release 3.0.2. On the 19-query fixture
the local stack now measures:

| Mode | R@5 | R@10 | MRR | A R@10/MRR | B R@10/MRR | C paths | p50 |
|---|---|---|---|---|---|---|---|
| hybrid | 0.688 | 0.688 | 0.646 | 1.000/0.889 | 0.500/0.500 | 1.3 | 5.0 s |
| semantic | 0.438 | 0.438 | 0.406 | 0.500/0.417 | 0.400/0.400 | 1.0 | 6.4 s |

Bucket A is solved in hybrid (R@10 1.000). Bucket B is the whole remaining
deficit: R@10 0.500. Five paraphrase queries - b01, b02, b05, b09, b10 -
are missed in **every** mode, semantic and hybrid alike. They are the
subject of everything below.

## 2. Diagnostic 1 - where the expected chunks actually rank today

Ranks of the best expected chunk under the shipping configuration
(BGE-M3, mean pooling, int8, 512-token clamp), scored over the full vault,
9,477 distinct paths:

| Query | rank |
|---|---|
| b01 | 619 |
| b02 | 9 |
| b05 | 398 |
| b09 | 562 |
| b10 | 3313 |

Three probes on top of that:

- **Reranker, given the chunk.** Inserting the expected chunk into the
  51-pair pool and rescoring places it at 12, 39, 7, 1, 6. The
  cross-encoder can rank four of the five correctly; it simply never sees
  them, because the first stage hands it a pool of 50.
- **Query language.** Translating the queries to English helps exactly one:
  b05, 398 -> 38. The other four do not move. This is not a
  cross-lingual gap that translation closes.
- **Title as query.** Using the note's own title as the query gives 1, 1,
  386, 9, 67. b01 and b02 are then trivial; b05 and b10 stay far away even
  when asked by their own title.

**Verdict.** Four of the five are first-stage (bi-encoder) recall failures:
the reranker would fix them if the pool contained them. b02 is the one
reranker failure - rank 9 in the first stage, then dropped to 39 of 51 when
rescored. b05 and b10 are a third, different problem: those notes are
poorly represented by their own chunks, so no pooling or model change is
guaranteed to reach them.

## 3. Diagnostic 2 - CLS pooling, on a sample

Issue 02 asks whether the embedder should read `H[CLS]` instead of the
mean. Re-embedding the vault to find out costs ~10 h, so this was tested on
a sample: the current top-50 chunks per query, plus the expected chunks,
plus a 380-path background sample. Exact mean-pooled ranks recomputed
inside that sample, as the control: 502 / 7 / 603 / 643 / 3038 (b01, b02,
b05, b09, b10 - close to the full-vault numbers in §2, so the sample is
representative).

Estimated global CLS ranks for the same five: **1 / ~51 / 1 / 1 / 1-2**.

Around that:

- Controls b03, b04, b06 and b08 stay at rank 1 under CLS.
- a05 improves, 20 -> ~1.
- a01 regresses, 5 -> ~176. a01 is a short keyword query - the kind mean
  pooling resolves by average lexical overlap, which CLS abstracts away.
- CLS compresses the cosine range: good matches land at 0.47-0.66 where
  mean gives 0.63-0.79. Any absolute threshold tuned on mean cosines (issue
  06's floor, the `Cosine` arm of `adaptive_filter`) is invalid under CLS.

**Caveat, and it is a big one.** The candidate set was selected by *mean*
cosine, so CLS only ever got to rank chunks that mean already liked; a
chunk CLS would love and mean ignored was never in the sample. The
estimator is noisy within roughly a factor of two. And per the pooling
report, a mixed index is not a measurement at all: mean space and CLS space
are mutually incompatible, so neither the four gains nor the a01 regression
is admissible evidence on its own [14][6]. The honest reading is: CLS looks
strongly positive, and it has not been measured.

## 4. Research summary

### 4a. Pooling (`research/bge-m3-pooling-2026-09-10.md`)

- BGE-M3's dense vector **is** `norm(H[CLS])` by definition, confirmed in
  four independent primary sources: the paper (§3.2, which assigns `[CLS]`
  to dense and the remaining tokens to sparse/multi-vector by
  construction) [3], the FlagEmbedding reference code
  (`last_hidden_state[:, 0]` then `F.normalize`) [4], `1_Pooling/config.json`
  in the BAAI repo (`pooling_mode_cls_token: true`,
  `pooling_mode_mean_tokens: false`) [1], and the Xenova/bge-m3 card, whose
  own example passes `pooling: 'cls'` [9].
- BAAI's own README: mean pooling gives "a significant decrease in
  performance" [6]. Qualitative - no number attached.
- The app deviates on three axes at once: mean pooling, int8 weights, and a
  512-token clamp that truncates ~21% of chunks.
- **There is no published delta** for "mean pooling applied to a
  CLS-trained checkpoint." The one head-to-head CLS-vs-mean table that
  exists trains ModernBERT separately under each pooling and blames RoPE
  attention decay - BGE-M3 uses learned absolute positions, so it does not
  transfer [17]. So the case for CLS rests on definition, not on a
  benchmark number.
- Nothing that avoids a re-embed fixes first-stage recall: sparse weights
  need the same full forward pass and buy +0.2 R@100 on MKQA pt [3]; query
  translation measures *worse* than the multilingual dense vector
  (96.2/95.6 vs 92.4/93.0 R@15) [36]; a bigger pool plus reranker sits on
  top of the same wrong vectors; re-chunking invalidates the vectors by
  definition.
- Migration cost is real but it is machine time: 9.3-10.8 h at measured
  throughput, ~0.6 GB to hold both vector versions at once [45]. The
  binding constraint is correctness - never compare two pooling versions in
  one query - not disk.

### 4b. Embedder options (`research/embedder-options-2026-09-10.md`)

- **EmbeddingGemma-300m** is the only local model that beats BGE-M3 on
  MTEB Multilingual v2 (62.49 vs 54.60) *and* on native Portuguese
  (MTEB-BR retrieval mean 0.6535 vs 0.6351) *and* has a viable ONNX export
  (q8 308.9 MB, two int64 inputs, `sentence_embedding` output already
  pooled and normalized, so the app's pooling code disappears) [17][18][19].
  Estimated re-embed ~3.3 h by computable-parameter ratio - not measured.
  Gated repo, Gemma licence. **No pt->en evidence exists** for it.
- The rest of the field either loses to BGE-M3 in Portuguese
  (Qwen3-Embedding-0.6B 0.6034, harrier 0.5713/0.6196, granite-r2 0.6074),
  ties it (arctic-embed-l-v2.0 0.6361, +0.001), or has no usable export
  (multilingual-e5-large-instruct is fp32-only, 2.2 GB) [18][17][26].
- **Voyage 4** family: 32k context, 1024 dims with MRL, 200M free tokens
  per account. The vault is ~62M tokens (216 MB at ~3.5 chars/token), so
  the initial index costs **zero** and takes 8-21 min depending on
  tier [9][10][11].
- Voyage privacy is the blocker on paper: storing and training is the
  **default**; opting out requires a payment method plus org-admin, and is
  one-way - "You won't be able to opt-in again in the dashboard after you
  opt out" [12]. No data residency guarantee; data "may be transferred to
  ... computers located outside of your state, province, country" [13]. No
  on-prem, no VPC. Offline works only via voyage-4-nano's open weights,
  whose Portuguese quality is unmeasured [3][4][5].
- No benchmark decides pt->en paraphrase for any of these. The only primary
  pt->en number in the whole field is BGE-M3's own MKQA (dense, pt, R@100
  76.3) [27]. Only the 19-query fixture can decide it.

## 5. Measurement 3 - Voyage, end to end, on the same vault

Run through the owner's separate `koko-rag` project (voyage-4 embeddings +
BM25 + RRF + rerank-2.5), index refreshed 2026-09-10, all 17 expected notes
of the fixture confirmed present in the index. Same 19 queries, same
expected sets, same scorer.

| Config | R@5 | R@10 | MRR | A R@10/MRR | B R@10/MRR | p50 |
|---|---|---|---|---|---|---|
| vector-only | 0.812 | 0.875 | 0.707 | 0.667/0.450 | 1.000/0.861 | 0.4 s |
| hybrid, no rerank | 0.906 | 0.938 | 0.688 | 1.000/0.833 | 0.900/0.600 | 0.5 s |
| hybrid + rerank-2.5 | 1.000 | 1.000 | 0.875 | 1.000/1.000 | 1.000/0.800 | 1.0 s |
| + HyDE | 1.000 | 1.000 | 0.875 | 1.000/1.000 | 1.000/0.800 | 9.6 s |

Two things stand out. First, **HyDE adds nothing** - byte-identical metrics
for 9.6 s instead of 1.0 s. Second, and this is the finding: **vector-only,
with no lexical leg and no reranker at all, finds b01, b02, b05, b09 and
b10 at ranks 1, 9, 1, 1 and 2** (B R@10 1.000, MRR 0.861). The five
queries that the local stack misses in every mode are not hard queries.
They are recall failures of the current first stage.

**Caveats, and they matter.** koko-rag returns ~6.5 unique paths per query;
the app returns ~1.5, because the app applies a gap filter and koko-rag has
no score floor at all (bucket C noise is 6-8 paths there versus 1.0-1.3 in
the app - see issues 05 and 06). It also uses a different chunker and a
different BM25. So this table is evidence **about the model's first-stage
recall**, not an in-app number, and the R@10 1.000 is not a number the app
would reproduce by swapping the embedder alone.

## 6. Measurement 4 - Ollama bge-m3, and one privacy finding

Ollama's `bge-m3` (F16 GGUF, 664 MB, `pooling_type 2` = CLS, running 100%
on Metal) measures **~10 chunks/s at batch 8**, against 3.6-4.2 chunks/s on
the current ONNX CPU path. A full re-embed of the vault is therefore
**~3.8 h instead of ~10 h**.

It is not a drop-in: the GGUF pools CLS, the stored index is mean/int8/512.
Mixing the two in one query is meaningless. So it is only usable as a
**full** re-embed with the query path switched to CLS at the same time -
which is exactly the migration issue 02 describes, at roughly a third of
the cost.

Separately, while checking the koko-rag index: its `EXCLUDE_GLOBS` do
**not** exclude `private/` or `personal/`. Those folders are already being
sent to Voyage today, independently of any decision about the app. That is
a fact about the current state, not a consequence of anything proposed
here.

## 7. Decision matrix

From `research/embedder-options-2026-09-10.md`, with the Voyage row
replaced by the measured numbers from §5.

| Option | Expected quality | Migration cost | Privacy | Offline | Risk |
|---|---|---|---|---|---|
| BGE-M3 + CLS fix | §3: 4 of 5 paraphrases resolved, 1 short-query regression, all on a sample in a mixed space; PT 0.6351 [18] | ~1 h of code + 3.8 h of machine on Ollama (§6) or 9.3-10.8 h on ONNX [45] | Total, in-process [29] | Yes | Low and reversible; the a01 regression stays open, and the cosine range moves (§3) so issue 06's thresholds must be re-derived |
| EmbeddingGemma-300m | Best local on paper: PT 0.6535, MTEB Multi v2 62.49 vs 54.60 [17][18]; zero pt->en evidence | ~4-6 h of code (prefixes both sides, 768 dims, read `sentence_embedding`) + ~3.3 h re-embed, estimated not measured [19][21] | Total, in-process [29] | Yes | Context drops to 2,048 tokens - irrelevant, the app clamps at 512; gated repo, Gemma licence [20] |
| Voyage (voyage-4 + rerank-2.5) | **Measured** §5: R@5/R@10/MRR 1.000/1.000/0.875 at ~1.0 s p50, bucket B 1.000/0.800, and vector-only alone finds all five missed paraphrases - but in koko-rag, not in the app | ~6-8 h of code (input_type, HTTP, token-capped batching [14]) + 8-21 min to index; US$ 0 inside the 200M free tier [9][11] | Retain-and-train by default; opt-out needs a card + org admin and is irreversible; no residency [12][13]. And `private/`/`personal/` already go there via koko-rag (§6) | No, except voyage-4-nano locally [3] | High on privacy; rerank-3 still Preview [8]; the §5 number is not an in-app number |
| Keep as is | B R@10 stays 0.500; expected chunks at 398-3313 never enter the pool of 50 | 0 h | Total [29] | Yes | Does not self-correct. But bucket A is solved, C noise is down to 1.0-1.3 paths, and nothing is on fire |

## 8. Possible next steps

Options, not tasks. None of these is scheduled.

**(a) Voyage provider in-app, behind a setting.** Embed + rerank over the
API, a versioned index table so the Voyage vectors never mix with the local
ones, key from env or keychain (never committed), FTS5 stays local, offline
degrades to text mode. Then run `retrieval_eval` with the provider
switched; that, and only that, gives an apples-to-apples in-app number to
compare against the §1 baseline. Gated on the privacy question, not on the code.

**(b) Local path: BGE-M3 CLS re-embed.** ~3.8 h via Ollama (§6) or ~10 h on
ONNX, incremental with versioned vectors, hard rule of never comparing
versions inside one query, v1 serving until v2 closes 100%. Validate first
on the cheap protocol from the options report: index a random 5% of notes
(~7,015 chunks, ~30 min) plus the 17 expected notes, and compare expected
ranks inside that subset. Reruns issue 02 with real numbers instead of a
sample estimate.

**(c) EmbeddingGemma-300m**, through the same 30-min sample protocol as (b),
on the same sample, so the two are directly comparable. ~1 h of machine
time for both.

**(d) Reranker work, independent of the embedder.** Raise the pool from 50
to 150-200 [30]; raise `max_length` from 512 toward 1024 with
`only_second` truncation [31][34]; issues 05 and 06 on the gap filter and
the zero-result floor; and the b02 case specifically, the one query the
reranker demotes from 9 to 39. None of these needs a re-embed, and none is
blocked by the pooling decision.

**(e) Privacy action on the Voyage dashboard.** Opt out of retention and
training regardless of what the app does - `private/` and `personal/`
already flow there through koko-rag (§6). Note the one-way door: opt-out
cannot be reversed in the dashboard, and it needs a payment method plus
org-admin [12].

### Owner decision, 2026-09-10

**Stop here for now.** The local stack already improved materially - bucket
A solved at R@10 1.000 in hybrid, bucket C noise down to 1.0-1.3 paths from
the 13.7/6.7 recorded pre-sigmoid in issue 06 - and no migration happens
without in-app proof. The §5 Voyage table is evidence about a model, not
about this app. No task is opened from this document; issues 02, 05 and 06
keep their current status.
