# Embedding Quality Improvements (CPU-only)

Lessons learned from `feat/retrieval-pipeline` (now deleted):
- CoreML EP does NOT accelerate BGE-M3 / XLM-RoBERTa on Apple Silicon (CPU=4.3s vs CoreML=4.4s per batch at static 1024).
- Apple Neural Engine only supports FP16 and ANE-friendly layer ordering — Xenova's BGE-M3 conversion has neither, so ANE never engages.
- INT8 dynamic quant on CPU M-series (via AMX) is FAST — main's config indexes 5.4k files in ~3-4h.
- Static padding + max_seq_len=1024 is a 7-8x slowdown vs main's dynamic + max_seq_len=512.
- FP16 model (Xenova/bge-m3 `model_fp16.onnx`) trips an ORT graph bug (`SimplifiedLayerNormFusion`) — only loads with `GraphOptimizationLevel::Level1`.

Decision: **stay on CPU + INT8 + dynamic padding**. All future work targets retrieval QUALITY, not raw inference speed.

Target metrics vs current main baseline:
- recall@10: +25-40% (parent headings + reranker + hybrid)
- top-1 precision: ~60% → ~85% (reranker)
- p50 latency: <500ms per query end-to-end (rerank top-50 on CPU)

## Phase 0 — SKIPPED

Eval fixture + harness skipped by decision. Quality validation will be qualitative (user spot-checks search results after each phase). Trade: no recall@k delta numbers per phase. Revisit if quality regressions slip through.

## Phase 1 — Chunking quality (4-6 days)

Current chunker is heading-only and produces dilutes embeddings on long sections and headless notes.

- [x] Task 1.1: **Parent-heading prepend.** Track heading stack during `split_into_sections` (H1 → H_current ancestors). `Chunk` struct gains `parent_headings: Vec<String>`. DB schema: add column `parent_headings TEXT` (JSON). Embed text becomes `parent_headings.join(" > ") + "\n\n" + content`; storage `content` stays original (display-correct). Triggers full reindex via `model_hash` bump.
- [x] Task 1.2: **Tighter `max_chunk_chars=3000`** (~700 tokens). Today's 10_000 produces single chunks that span many sub-topics — embedding dilution. ROI: precision win in dense knowledge files.
- [x] Task 1.3: **Sliding-window fallback for headless notes.** Detect files with zero `#` headings. Apply window-based chunking: 2500 chars, 500 char overlap. Today these become one giant 50-200k-char "chunk" that the embedder truncates at max_seq_len=512 — i.e. most of the file is unindexed.
- [ ] Task 1.4: **Token-aware overlap** (replace line-based). Carry the last ~80 tokens of the previous chunk forward instead of 2 lines (lines vary 1-200 chars). Use a cheap word-count proxy; tokenizer-exact split too expensive at chunking time.
- [ ] Task 1.5: **Preserve code-block content for technical notes.** Today `strip_code_blocks` discards everything between triple-backticks. Compromise: keep the first line (which usually has the language tag + function signature) and any inline comments. Function/CLI names matter for retrieval.

## Phase 2 — Reranker (3-5 days) — biggest single quality leap

Cross-encoder reranker reads the (query, chunk) pair jointly — captures nuance no bi-encoder embedding can.

- [ ] Task 2.1: **Pick model.** Recommended: `jinaai/jina-reranker-v2-base-multilingual` (~278M params, 5x smaller than `BGE-reranker-v2-m3` — runs fast on CPU). Verify INT8 ONNX availability or quantize ourselves. Validate PT-BR + EN retrieval quality on the eval fixture.
- [ ] Task 2.2: `semantic/reranker.rs` — new struct `Reranker { session, tokenizer, batch_size }`. Method `rerank(query, candidates) -> Vec<f32>` returns logits (no sigmoid — monotonic). Use `tokenizer.encode_batch(Vec<(query, doc)>)` for pair encoding.
- [ ] Task 2.3: `ModelManager` extension — `.kokobrain/models/jina-reranker-v2-base-multilingual/`. New download URL.
- [ ] Task 2.4: Global `RERANKER: Mutex<Option<Reranker>>` mirroring `EMBEDDER`. Lazy load + idle unload (reuse 120s timeout).
- [ ] Task 2.5: `search_semantic` pipeline change — top-50 cosine candidates → rerank → adaptive filter on rerank logits → top-K. Setting `semanticSearch.useReranker` (default true), UI toggle, bypass falls back to current path.
- [ ] Task 2.6: Eval — target +15-25% MRR, top-1 +20pp.

## Phase 3 — Hybrid search + RRF (2-3 days)

Fuse FTS5 (BM25, exact terms) with semantic (concepts, paraphrase). Captures both strengths.

- [ ] Task 3.1: **FTS5 unicode61 migration.** Drop `notes_fts_vocab` → drop `notes_fts` → recreate with `tokenize='unicode61 remove_diacritics 2'` → recreate vocab → repopulate. Versioned in `app_meta` (new table). Required so "ação" matches "acao".
- [ ] Task 3.2: `search/rrf.rs` — pure `fn rrf_fuse(rankings: &[&[String]], k: u32) -> Vec<(String, f32)>`. k=60 default.
- [ ] Task 3.3: New command `search_hybrid(query, limit)`: `tokio::join!(fts_top_n(30), semantic_top_n(30))` → RRF → top-50 → rerank (Phase 2) → top-K.
- [ ] Task 3.4: Wire frontend search panel + command palette to `search_hybrid`. Keep `search_semantic` + FTS callable for debug.
- [ ] Task 3.5: Eval — target +10-15% MRR over Phase 2 alone on mixed-query workload.

## Phase 4 — Optional refinements (only if eval shows need)

- [ ] Task 4.1: **Sparse retrieval signal.** BGE-M3 actually outputs sparse + colbert vectors too — we throw them away. Storing the sparse component alongside dense could improve recall on rare-term queries without extra model cost. Significant DB schema change.
- [ ] Task 4.2: **Query expansion (HyDE-lite).** For low-recall queries, generate a fake "ideal answer" via cheap rule-based expansion (synonym dict, not LLM) and search with both.
- [ ] Task 4.3: **Adaptive filter tuning post-rerank.** Reranker logits have different distribution than cosine — current 0.04 gap threshold and `mean - 1σ` were tuned on cosine. Re-fit on rerank score distributions.

## What's deliberately out

- **CoreML EP.** Confirmed empirically not helpful for BGE-M3 / XLM-RoBERTa on this hardware. Stay pure CPU.
- **FP16 / FP32 model swap.** INT8 + AMX is the speed sweet spot. Quality difference vs FP16 is <2% — not worth indexing-time cost.
- **Static padding.** Was an attempted CoreML workaround. Useless without CoreML.
- **Reindex-time embedding tricks** (e.g. late chunking, multi-vector indexing). Parent headings achieves 80% of the gain at 10% complexity.
- **sqlite-vec migration.** ~30k chunks, brute-force cosine completes in <20ms on M-series.

## Suggested execution order

- **Week 1:** Phase 0 (baseline) → Phase 1 (chunking)
- **Week 2:** Phase 2 (reranker)
- **Week 3:** Phase 3 (hybrid + FTS migration)
- **Optional:** Phase 4 — only if eval still shows gaps

## Notes

Baseline numbers from main (CPU + INT8 + dynamic + max_seq_len=512, observed 12 May 2026):

- Indexing: ~0.5-0.8s per batch of 4 chunks (5.4k files, ~84k chunks total = ~3-4h end-to-end)
- recall@5: TBD (after Task 0.4)
- recall@10: TBD
- MRR: TBD
- p50/p95 query latency: TBD

Vault profile (measured): 5,448 markdown files, ~26.3M tokens, median 3,343 tok/file, p95 16,678 tok, max 134,647 tok. Char/token ratio 4.26.
