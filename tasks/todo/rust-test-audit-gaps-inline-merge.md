# Rust Test Audit: Gap Coverage + Inline Migration

## Context

Audit of `src-tauri/` found 40 source files, 27 test files, 650+ test cases. Most modules have thorough coverage. This plan addresses two goals:

1. **Fill test gaps** - untested functions, missing corner cases, security boundary tests
2. **Merge tests inline** - move unit-style tests from `tests/` into `#[cfg(test)] mod tests` blocks in source files (idiomatic Rust). Integration tests (DB + FS + cross-module) stay in `tests/`.

---

## Part 1: Fill Test Gaps

### Task 1: `toggle_task_status_inner` tests (HIGH)

**Source:** `src/commands/vault.rs:568`
**Gap:** Zero tests. Reads file from disk, calls `toggle_task_in_content`, writes back, updates VaultIndex. Multiple failure paths.

**Tests to add** (in `tests/vault_file_ops_test.rs`):
- Happy path: create file with `- [ ] task`, toggle line 1, assert file content changed + UpdateResult.changed == true
- No-op: toggle on line with no checkbox, assert file unchanged + changed == false
- Line out of bounds: toggle line 999 on 3-line file, assert no-op
- File read failure: toggle on non-existent path, assert error
- Index update: toggle task, verify VaultIndex entry updated (tasks list reflects new status)
- Multiple toggles: toggle same line twice, assert back to original state

---

### Task 2: `project_note_record` coverage (HIGH)

**Source:** `src/commands/vault.rs:649` (private fn, test via `get_all_property_records` / `query_notes_by_property`)
**Gap:** Only one partial test in vault_file_ops_test.rs. The projection logic (path splitting, is_a injection, organized/archived/favorite, belongs_to/related_to, seconds-to-ms) has no dedicated tests.

**Tests to add** (in `tests/vault_file_ops_test.rs`):
- Path splitting: path with nested dirs extracts correct name/basename/folder/ext
- Path with no extension: ext should be empty string
- Path with no `/`: folder should be empty string
- is_a injection: entry with `is_a = Some("person")` produces `properties["type"] = "person"`
- Boolean fields: organized/archived/favorite injected correctly
- belongs_to/related_to: non-empty arrays injected, empty arrays omitted
- Timestamp conversion: mtime/ctime multiplied by 1000 (seconds to ms)

---

### Task 3: Path traversal security tests (MEDIUM)

**Source:** `src/commands/files.rs` - `read_files_batch`
**Gap:** Current tests have one "outside vault" rejection. Missing `..` traversal and symlink attacks.

**Tests to add** (in `tests/commands/files_test.rs`):
- Path with `../` components: `/vault/sub/../../etc/passwd` rejected
- Path with `..` in middle: `/vault/sub/../../../etc/passwd` rejected
- Symlink inside vault pointing outside (create symlink, request it, assert rejected or handled safely)
- Unicode normalization attack: paths with unicode that normalizes to `..`

---

### Task 4: `semantic/model.rs` tests (MEDIUM)

**Source:** `src/semantic/model.rs` - zero direct tests
**Gap:** Model availability checks, dimensions regression, path construction.

**Tests to add** (new inline `#[cfg(test)]` in `src/semantic/model.rs`):
- `BGE_M3_EMBEDDER.embedding_dimensions` == Some(1024) (regression guard)
- `BGE_RERANKER_V2_M3.embedding_dimensions` == None (regression guard)
- `is_model_available` returns false for empty tmpdir
- `is_model_available` returns false when only some files present (partial download)
- `is_model_available` returns true when all expected files present
- `model_path` returns correct path structure
- `for_embedder` / `for_reranker` construct correctly

---

### Task 5: Semantic command helpers (MEDIUM)

**Source:** `src/commands/semantic.rs`
**Gap:** `get_semantic_stats_inner`, `is_semantic_model_available`, `is_reranker_model_available`, `shutdown_semantic` untested.

**Tests to add** (in `tests/semantic_commands_test.rs`):
- `get_semantic_stats_inner`: returns zeros on fresh DB (no chunks)
- `get_semantic_stats_inner`: returns correct counts after inserting chunks
- `is_semantic_model_available`: returns false when model dir empty
- `is_reranker_model_available`: returns false when model dir empty
- `shutdown_semantic`: no-op when already shut down (no panic)
- `cleanup_orphaned_chunks` with all-orphaned entries (empty existing_paths)

---

### Task 6: Minor gaps batch (LOW)

Collect remaining small gaps in a single task:
- `commands/search.rs`: file exceeding `MAX_FILE_SIZE` (10 MB) is skipped (in `tests/commands/search_test.rs`)
- `commands/debug.rs`: `get_process_memory` returns positive value (smoke test, new inline test)
- `db/mod.rs`: `with_fts_db` returns error when FTS DB not open (in `tests/db_test.rs`)
- `search/rrf.rs`: duplicate keys in single ranking (inline test addition)
- `semantic/chunker.rs`: unclosed frontmatter produces 0 chunks; nested code blocks handled (inline test addition)
- `utils/logger.rs`: `debug_log` with enabled=true but no APP_HANDLE doesn't panic (inline test addition)

---

## Part 2: Merge Tests Inline

### Classification Summary

**Move inline (10 files):** Pure-logic tests, no FS/DB setup
**Hybrid (3 files):** Split - pure portion inline, DB/FS portion stays
**Stay in tests/ (12 files):** Integration tests needing TempDir/DB/cross-module

### Task 7: Merge small pure-logic tests (5 files)

Move to inline `#[cfg(test)] mod tests`:
1. `search_text_test.rs` (160 lines) -> `src/search/text_search.rs`
2. `search_fts_logic_test.rs` (145 lines) -> `src/search/fts_logic.rs`
3. `semantic_filtering_test.rs` (155 lines) -> `src/semantic/filtering.rs`
4. `commands/update_channel_test.rs` (45 lines) -> `src/commands/update_channel.rs`
5. `commands/fonts_test.rs` (36 lines) -> `src/commands/fonts.rs`

**Pattern for each:**
- Read test file, convert `use kokobrain_lib::*` to `use super::*` / `use crate::*`
- Append `#[cfg(test)] mod tests { ... }` to source file
- Delete test file from `tests/`
- Update `tests/commands/mod.rs` (remove fonts_test, update_channel_test declarations)

---

### Task 8: Merge DB pure-logic tests (3 files)

Move to inline (all use in-memory SQLite only, no TempDir):
1. `db_schema_test.rs` (188 lines) -> `src/db/schema.rs`
2. `db_history_repo_test.rs` (119 lines) -> `src/db/history_repo.rs`
3. `db_semantic_repo_test.rs` (400 lines) -> `src/db/semantic_repo.rs`

---

### Task 9: Merge vault pure-logic tests (2 large files)

1. `vault_entry_test.rs` (534 lines) -> `src/vault/entry.rs`
2. `vault_parsing_test.rs` (1034 lines) -> `src/vault/parsing.rs`

These are the two largest moves. `vault_parsing.rs` becomes ~2575 lines - large but acceptable for a heavily-tested parser module.

---

### Task 10: Hybrid splits (3 files)

1. **`semantic_test.rs`** (287 lines) - ALL moves inline:
   - Chunker tests (lines 1-238) -> append to existing inline tests in `src/semantic/chunker.rs`
   - Cosine tests (lines 239-287) -> append to existing inline tests in `src/semantic/embedder.rs`
   - Delete `tests/semantic_test.rs`

2. **`vault_task_test.rs`** (529 lines) - SPLIT:
   - Lines 1-425 (parsing function tests) -> append to tests in `src/vault/parsing.rs`
   - Lines 446-529 (audit #9 toggle TOCTOU test, uses TempDir+threads) -> stays in `tests/vault_task_test.rs` (trimmed)

3. **`search_fuzzy_test.rs`** (290 lines) - SPLIT:
   - Lines 1-129 (levenshtein, auto_distance - pure logic) -> `src/search/fuzzy.rs`
   - Lines 130-290 (expand_fuzzy_terms - needs DB) -> stays in `tests/search_fuzzy_test.rs` (trimmed)

---

### Task 11: Cleanup + verification

- Update `tests/commands/mod.rs` to remove deleted module declarations
- Verify no orphan imports or dead code
- Run `cargo test --manifest-path src-tauri/Cargo.toml` - all tests pass
- Run `cargo test --manifest-path src-tauri/Cargo.toml -- --ignored` - audit tests pass
- Verify test count is unchanged (same 650+ tests, just relocated)

---

## Files that STAY in `tests/` (no action)

| File | Reason |
|------|--------|
| vault_index_test.rs (1966 lines) | Huge, uses TempDir, threading, complex fixtures |
| vault_file_ops_test.rs | TempDir + cross-module (commands + index) |
| vault_watcher_test.rs | Real notify watcher + TempDir |
| search_fts_test.rs | TempDir + DB + global lock |
| semantic_commands_test.rs | TempDir + DB |
| db_test.rs | TempDir + global DB lifecycle |
| history_test.rs | TempDir + DB |
| utils_fs_test.rs | TempDir throughout |
| commands/vault_test.rs | TempDir + cross-module |
| commands/search_test.rs | TempDir + cross-module |
| commands/files_test.rs | TempDir + cross-module |
| commands/terminal_test.rs | External PTY dependency |

---

## Verification

After each task:
1. `cargo test --manifest-path src-tauri/Cargo.toml` - all pass
2. `cargo check --manifest-path src-tauri/Cargo.toml` - no warnings
3. Commit per CLAUDE.md rules

Final verification after all tasks:
- Full test run with `--ignored` flag for audit tests
- Confirm total test count is preserved + new gap tests added
