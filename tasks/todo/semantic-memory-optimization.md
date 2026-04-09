# Semantic Embedder Memory Optimization

The ONNX semantic embedder (BGE-M3) causes RSS to spike from 183 MB to 4.7 GB at startup
and never release. Root cause: large batch size (32), all CPU threads (10), and model stays
loaded permanently in a static Mutex.

Fix: reduce batch/threads for lower peak memory, unload after indexing, lazy-reload on demand
with an idle timer that auto-unloads after 120s of inactivity.

## Tasks

- [x] Task 1: Reduce INFERENCE_BATCH_SIZE from 32 to 4 in embedder.rs, batch_size from 32 to 4 in semantic.rs, and cap intra-op threads at 4
- [x] Task 2: Add vault path static + lazy reload helper + debounced unload timer in semantic.rs
- [x] Task 3: Unload embedder after build_semantic_index completes, lazy-load in search_semantic and update_semantic_file, schedule idle unload after use
- [ ] Task 4: Update debug_semantic_embeddings to lazy-load, and update tests

## Notes

- Model load time is ~1s (acceptable for lazy reload)
- The debounced unload uses an AtomicU64 generation counter — each use bumps it, only the latest scheduled unload fires
- update_semantic_file already has vault_path param; search_semantic does NOT — need to use the stored vault path
