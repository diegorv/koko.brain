# Personal RAG for koko.brain

Add a personal RAG layer on top of the existing semantic search system: BGE-reranker-v2-m3 + OpenAI-compatible LLM client (default Kimi K2.6) + chat panel. The user asks natural-language questions about their vault and gets cited, streamed answers.

The existing `src-tauri/src/semantic/` system (BGE-M3 embedder, SQLite chunks table, watcher-driven incremental indexing) is reused as-is. Only the reranker, LLM client, retrieval orchestration, chat UI, and an editor scroll-to-line capability are new.

Full plan: `/root/.claude/plans/personal-rag-for-clever-crab.md`.

## Tasks

- [x] Task 1: Refactor — extract `ensure_embedder_loaded`, `get_or_load_cache`, `schedule_embedder_unload`, `invalidate_search_cache`, `unload_embedder` into `semantic/runtime.rs` with `pub(crate)` visibility.
- [x] Task 2: Reranker inference — `semantic/reranker.rs::Reranker::load` + `rerank` using pair encoding; `RerankerModelManager` mirrors `ModelManager`.
- [x] Task 3: Reranker lifecycle + commands — static `RERANKER` + independent idle unload, `is_reranker_model_available`, `rag_download_reranker` (with `rag-reranker-progress` events).
- [x] Task 4: Config + keyring — `rag/config.rs` parses `rag.toml`; `resolve_api_key` tries keyring then env.
- [x] Task 5: Retrieval orchestration — `rag/retrieval.rs::retrieve` does embed → cosine top-30 from `SEARCH_CACHE` → reranker top-5. Add `rag_search` command.
- [x] Task 6: LLM streaming — `rag/llm/openai_compat.rs` builds context block and streams tokens via `async-openai`.
- [x] Task 7: `rag_chat` command — spawns task, emits `rag-chat-sources`, `rag-chat-token`, `rag-chat-done`, `rag-chat-error`.
- [ ] Task 8: Editor scroll-to-line — add `pendingScrollLine` to editor store; extend `MarkdownEditor.svelte:344` effect; extend `openFileInEditor(path, line?)`.
- [ ] Task 9: Frontend chat panel — `rag.store.svelte.ts` + `rag.service.ts` + `RagChatPanel.svelte`. Mount in `AppShell.svelte` right sidebar. Settings toggle `ragChatVisible`.
- [ ] Task 10: Reranker status component — `RerankerStatus.svelte` next to `SemanticIndexStatus.svelte`. Shows download UI when missing.

## Notes

- Reuse SQLite `chunks` table, mean pooling, quantized BGE-M3 — do NOT migrate to LanceDB, fp16, or CLS pooling.
- Embedder lock: scope to query-embed only, drop before rerank/LLM to avoid contention with concurrent `search_semantic` (mirror `commands/semantic.rs:489-496`).
- Two independent idle unload generations (one for embedder, one for reranker).
- Pair tokenization: `EncodeInput::Dual((q, p))`, not manual concat.
- Linux keyring needs Secret Service — env var fallback is documented in the sample `rag.toml`.
- Citation paths in DB are vault-relative; build absolute in the click handler.
