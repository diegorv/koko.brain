# Exploratory Bug Audit: src-tauri/ Rust Backend

## Context

Proactive audit of the entire Rust backend (~10,840 lines, 41 files, 60+ Tauri commands). No specific bug reported -- the goal is to systematically find latent bugs, data corruption risks, race conditions, and panicking code paths across the codebase.

## Scope

```
src-tauri/src/
  commands/  (11 files, ~4,215 lines) -- Tauri IPC handlers
  vault/     (7 files, ~3,261 lines)  -- core parsing, indexing, watching
  semantic/  (6 files, ~1,497 lines)  -- embeddings, chunking, reranking
  db/        (5 files, ~731 lines)    -- SQLite repos
  search/    (5 files, ~438 lines)    -- FTS, fuzzy, RRF
  utils/     (3 files, ~349 lines)    -- fs helpers, logger
  lib.rs, main.rs
```

## Confirmed Findings (from initial scan)

These are verified bugs/risks found during planning. Each phase will audit for MORE, but these are already confirmed:

1. **Case-sensitive extension check** in `commands/search.rs:68` -- uses `.ends_with(".md")` while `utils/fs.rs:86` uses `to_ascii_lowercase()`. `.MD` files show in sidebar but not in search.
2. **Adaptive filter negative scores** in `semantic/filtering.rs:41` -- `gap_threshold = top_score * 0.04` becomes negative when reranker logits are all negative, causing the gap filter to trigger on any trivial gap.
3. **Unsafe `from_utf8_unchecked`** in `vault/parsing.rs:861` -- safety invariant is correct but relies on manual verification; could be replaced with safe `from_utf8` at negligible cost.
4. **23 `unwrap()` calls** -- most provably safe, but none have justification comments. 6 in `task.rs:215-236` on `serde_json::to_string()` (infallible for unit enums).
5. **`std::sync::Mutex` held across blocking I/O** in `ensure_embedder_loaded` (line 129-148) -- holds EMBEDDER lock while loading ONNX model from disk (seconds). All concurrent search callers block.
6. **Duplicate directory walker** in `commands/search.rs:31-85` -- reimplements vault walking without `excluded_folders` support or shared utilities from `utils/fs.rs`.

## Tasks

- [x] Task 1: Phase 1 -- Concurrency audit (commands/semantic.rs, commands/terminal.rs, db/mod.rs, vault/watcher.rs) -- CLEAN, no bugs
  - Map every static Mutex/RwLock/AtomicU64 and document lock ordering
  - Verify no function holds 2+ locks simultaneously in conflicting order (already disproved ABBA between VAULT_PATH/EMBEDDER -- `init_semantic_search` drops VAULT_PATH before acquiring EMBEDDER)
  - Check lock poisoning handling at every `.lock()` / `.try_lock()` site
  - Check `std::sync::Mutex` held inside `tokio::spawn` closures (schedule_embedder_unload, schedule_reranker_unload)
  - Verify watcher bridge thread cleanup when starting new watcher

- [x] Task 2: Phase 2 -- Unsafe code + panicking unwraps (fonts.rs, parsing.rs, task.rs, chunker.rs, semantic.rs) -- CLEAN, all safe
  - Verify fonts.rs CoreText FFI: retained vs non-retained refs, buffer sizing, null termination
  - Verify parsing.rs:861 `from_utf8_unchecked` safety invariant; replace with safe alternative if cost is negligible
  - Audit all 23 unwrap sites: classify as (a) provably safe, (b) safe-but-should-use-expect, (c) actually reachable panic
  - Replace bare `.unwrap()` with `.expect("reason")` where the reason isn't obvious from context

- [ ] Task 3: Phase 3 -- Filesystem security (commands/files.rs, commands/vault.rs, commands/search.rs, utils/fs.rs)
  - Fix case-sensitive extension check in search.rs:68 (use `is_markdown_filename()` from utils/fs.rs)
  - Refactor search.rs to use shared walker from utils/fs.rs (eliminates duplicate code + gets `excluded_folders`)
  - Verify all IPC-reachable file read/write paths have `canonicalize` + `starts_with` containment
  - Audit `read_file_mtime_secs` and `read_file_metadata` for missing containment checks

- [ ] Task 4: Phase 4 -- Database integrity (db/mod.rs, db/schema.rs, db/fts_repo.rs, db/semantic_repo.rs, db/history_repo.rs)
  - Verify all SQL uses parameterized queries (no string interpolation)
  - Check FTS5 schema migration: `DROP TABLE` then `CREATE` not in a transaction -- crash between them = broken startup
  - Audit `.filter_map(|r| r.ok())` sites for cascading data loss (skipped row leaves orphaned references)
  - Verify transaction vs panic behavior: Mutex-poisoned connection with open transaction

- [ ] Task 5: Phase 5 -- Semantic pipeline data correctness (semantic/embedder.rs, chunker.rs, filtering.rs, reranker.rs, model.rs, types.rs)
  - Fix adaptive filter negative-score edge case (filtering.rs:41)
  - Check embedding deserialization: `chunks_exact(4)` silently drops remainder if `blob.len() % 4 != 0`
  - Verify reranker output length assumption: `rerank()` returns fewer scores than documents -> mixed scoring in sorted list
  - Check chunker edge cases: file shorter than overlap_chars, empty content, single-char file

- [ ] Task 6: Phase 6 -- Vault parsing + index correctness (vault/parsing.rs, index.rs, entry.rs, task.rs, aliases.rs)
  - Full parsing.rs review: frontmatter range edge cases, fenced code block with >3 backticks, task toggle preserves metadata
  - Verify index version counter increments on every update (not just when changed)
  - Check `remove_note_from_index` cleans up all reverse indexes (backlinks, tags, properties)
  - Audit `toggle_task_in_content`: verify checkbox change doesn't corrupt adjacent inline metadata

- [ ] Task 7: Phase 7 -- Search pipeline (commands/search_index.rs, search/fts_logic.rs, fuzzy.rs, rrf.rs, text_search.rs)
  - Verify FTS5 query sanitization prevents operator injection (`AND`, `OR`, `NOT`, `NEAR`, `*`)
  - Check fuzzy prefix with LIKE wildcards (`_`, `%` in first char -> overly broad LIKE match)
  - Verify text_search memory bounds: byte-offset map for 10MB file = 80MB Vec<usize>
  - Audit RRF score fusion: different score ranges (cosine 0-1 vs reranker logits -inf to +inf) combined correctly

- [ ] Task 8: Phase 8 -- Terminal + remaining files (commands/terminal.rs, commands/history.rs, commands/update_channel.rs, commands/debug.rs, lib.rs, utils/logger.rs)
  - PTY reader thread: verify `child.kill()` causes reader EOF on macOS
  - No session limit on concurrent terminal sessions (unbounded HashMap)
  - Terminal cwd validation: no vault containment (intentional? document)
  - Remaining files sweep: lib.rs, debug.rs, update_channel.rs, logger.rs, aliases.rs -- quick checklist pass

## Approach

**Fix scope: confirmed bugs only.** No safety hardening (expect messages, style improvements). Audit reads everything to find NEW bugs, but only changes code for verified defects.

Each task = one systematic audit phase. For each file:
1. Read the entire file
2. Check the specific items from the checklist
3. Fix ONLY confirmed bugs (actual incorrect behavior, panics on reachable paths, data corruption)
4. Report "safe but could improve" items without changing them
5. Run `cargo test` + `cargo clippy` after each phase that has fixes
6. Commit only phases that produce code changes

## Verification

After all phases:
- `cargo test --manifest-path src-tauri/Cargo.toml` -- all tests pass
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -W clippy::all` -- no new warnings
- `pnpm check` -- TypeScript still compiles (in case any IPC signatures changed)
- Audit tracking: every .rs file in src-tauri/src/ appears in at least one phase
