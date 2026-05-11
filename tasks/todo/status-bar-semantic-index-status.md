# Status bar: semantic index status for active markdown tab

Show a small indicator in the status bar that reflects whether the currently active markdown tab is indexed in the semantic search DB. Helps the user see at a glance when a freshly opened file has not been chunked + embedded yet (and when a save has just refreshed its embeddings).

## Tasks

- [x] Task 1: Rust — add `get_file_index_info(source_path)` to `src-tauri/src/db/semantic_repo.rs` returning `{ chunk_count: u64, last_embedded_at: Option<i64> }`. Single SQL roundtrip using the existing `idx_chunks_source` index (`SELECT COUNT(*), MAX(embedded_at) FROM chunks WHERE source_path = ?`). Unit test against a temporary DB seeded with `insert_chunk` covering: file with chunks, file with zero chunks, multiple chunks (latest `embedded_at` wins).
- [x] Task 2: Rust — add `#[tauri::command] get_semantic_file_status(file_path: String) -> SemanticFileStatus` in `src-tauri/src/commands/semantic.rs`. Returns `{ chunkCount: u64, lastEmbeddedAt: Option<i64>, modelLoaded: bool }`. `file_path` is the vault-relative path (same convention as `update_semantic_file`). Register in `src-tauri/src/lib.rs` invoke_handler. Add a struct in `semantic/types.rs` (`SemanticFileStatus`, camelCase serde rename). Smoke-test through cargo test.
- [x] Task 3: Frontend — `src/lib/core/status-bar/SemanticIndexStatus.svelte`. Reads `editorStore.activeTab`, skips non-markdown and virtual tabs. Converts absolute tab path to vault-relative using `vaultStore.path`. Invokes `get_semantic_file_status` and renders `Indexed (N)` / `Not indexed` / `Semantic off` (model not loaded) / nothing (no markdown tab). Refresh triggers: activeTab change, `searchStore.semanticStats` change (full rebuild finished), after-save observer for the current tab path. Unit test the path-to-relative helper + the label-resolution logic via a thin `.logic.ts`.
- [ ] Task 4: Frontend — slot `SemanticIndexStatus` into `AppShell.svelte` `right` snippet next to `SaveStatus`. No other layout change.

## Notes

- Chunk source paths are vault-relative in `chunks.source_path` (see `update_semantic_file` in `commands/semantic.rs`). Editor tab paths are absolute, so the frontend must strip `vaultStore.path` prefix before invoking — same logic as `registerSearchIndexHook` in `search.service.ts:278-280`.
- "Indexed" means `chunk_count > 0`. The semantic index does not record an explicit per-file state, but having ≥1 chunk implies an embedding pass ran for that path.
- Do not block the UI: invoke is fire-and-forget; render a stale label until the new result arrives. No spinner required.
- After-save flow: `update_semantic_file` may skip embedding when all chunk hashes match (content-hash dedup). The label stays accurate either way because the COUNT does not depend on whether embeddings re-ran — only on row presence.
- Model-not-loaded path: when `modelLoaded === false`, render `Semantic off` rather than `Not indexed` so the user does not think their file is missing from a healthy index.
- Component visibility: hide entirely when `editorStore.activeTab` is null, virtual, or not `.md` / `.markdown`. Keeps the status bar uncluttered for non-note contexts.
