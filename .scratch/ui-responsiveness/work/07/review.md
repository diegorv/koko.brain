VERDICT: APPROVED

## Acceptance criteria

- [met] The unload generation advances after a no-change build, if `semantic_commands_test.rs` can build an all-mtimes-match fixture without a model; otherwise record the manual check ("Embedder unloaded" about 120 s after an idle open) — `build_semantic_index_inner_with_no_changes_arms_the_idle_unload` (`src-tauri/tests/semantic_commands_test.rs`) stores the note's real mtime, runs the build with no model, asserts no progress phase and `embedder_unload_generation()` greater than before. Before the fix nothing on the no-change path (`cleanup_orphaned_chunks`, `get_semantic_stats_inner`) calls `schedule_embedder_unload`, so the test would fail; the fix is `semantic.rs:566`. Passes (50/50 in the binary).
- [met] Unit test: reported CPU time is non-decreasing across a busy loop and in the expected unit (compare with the wall time of a 100 ms spin) — `cpu_time_is_non_decreasing_and_counts_a_spin_in_real_time_units` (`src-tauri/tests/utils_resource_usage_test.rs`) asserts user/system/majflt non-decreasing and `wall/2 <= cpu <= wall*cores*2` for a 100 ms spin; CPU comes from `getrusage(RUSAGE_SELF)` timevals, not `ri_*_time` (`resource_usage.rs:48-66`). Passes (3/3).
- [met] Failing first: a pure planner given old rows and new chunks returns reuse for a re-keyed chunk with a matching hash and embed for a changed one, with no model (pattern at `semantic_commands_test.rs:594-648`) — `re_keyed_chunk_with_matching_hash_is_reused_and_changed_one_is_embedded` in `src-tauri/tests/semantic_update_plan_test.rs` against the pure `semantic/update_plan.rs::plan_file_update` (no model, no DB); the planner is a new module, so the test could not pass before it. The command-level test `update_semantic_file_reuses_vectors_of_re_keyed_chunks_without_embedding` follows the 594-648 pattern and fails on main (an embed attempt needs a vault path). Passes (5/5 and 50/50).
- [met] Not verified by the agent: the model's real RSS share (the "1.0-1.3 GB" figure is inferred) — the build report and `work/07/discovery.md` both record it as not verified; nothing in the diff claims a measured figure.

## Findings

1. **major** `src-tauri/src/db/semantic_repo.rs:161` (caller `src-tauri/src/commands/semantic.rs:1263-1281`): the reuse source vector is read by `key` alone, in a second `with_db` lock after the hash read. An overlapping `update_semantic_file` for the same path with different content can commit between the two locks and rewrite that key with other text; the vector of that other text is then stored under the re-keyed chunk with the original `content_hash`. That row is wrong for good, because the hash skip hides it until the text changes or the recipe changes. The comment at 1263 says an overlapping update is handled, but it only covers a source row that was deleted, not one rewritten in place. Fix: pass the expected hash and select `WHERE key = ?1 AND content_hash = ?2`, so a rewritten row returns `None` and the chunk falls back to embedding (or read hashes and vectors inside one `with_db` call). Add a repo test: a row whose hash differs from the expected one returns `None`.
2. **minor** `src-tauri/src/commands/debug.rs:15`: `set_tauri_debug_mode` now starts the periodic sampler, but `src-tauri/tests/commands/debug_test.rs` was not updated and no test shows that the sampler starts (or starts only once). CLAUDE.md rule 11 requires a test change for every changed source file. Fix: expose a `periodic_sampler_started()` flag (same shape as `qos::utility_workers_started`) and assert it after `set_tauri_debug_mode(true)`.
3. **minor** `src-tauri/tests/utils_resource_usage_test.rs:32`: the lower bound `cpu >= wall / 2` measures one spinning thread against wall time. On a loaded CI runner the thread can be descheduled for more than half the spin, which fails the test although the unit is right. A unit error is off by 40x or more, so a looser floor such as `wall / 10` still catches it and is less likely to flake.
4. **nit** `src-tauri/src/utils/resource_usage.rs:141`: `finish()` calls `memory_usage()` twice (once in `is_some()`, again in `describe_memory()`). Both call sites in `semantic.rs` build the line eagerly inside `format!`, so every pass pays two `getrusage` and two `proc_pid_rusage` calls even with debug logging off. The cost is small next to an embed pass. Fix: read the memory once, and skip `finish()` when `!is_debug_enabled()`.

## Checks run by the reviewer

The test verdict rests on these runs in the worktree (shared target `brain/src-tauri/target`):
- `cargo test --test semantic_commands_test --test semantic_update_plan_test --test utils_resource_usage_test --test core_tauri_free_test`: exit 0 (50, 5, 3 and 1 passed).
- `cargo test --lib semantic_repo`: exit 0 (28 passed, including `get_chunk_embedding_returns_bytes_and_timestamp_or_none`).
- `cargo test --test commands_test debug`: exit 0 (2 passed).
- `cargo clippy --all-targets -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors (the diff touches nothing under `src/`; no ts-rs bindings changed).
- The full `cargo test` run is left to deliver. `git status` was clean after these runs.

Scope: `docs/SEARCH.md` (one sentence on the reuse) and the `libc` dependency both trace to the Issue. Putting the pass line around the index-batch `embed_batch` too, not only the `:1285` site, falls under item 2's goal of explaining the slow pass. No scope creep. No layer-baseline or composition-root change.

## Resolution

All four findings accepted and fixed.

1. Fixed: `get_chunk_embedding(conn, key, content_hash)` selects `WHERE key = ?1 AND content_hash = ?2`; `update_semantic_file` passes the re-keyed chunk's hash, so a source row rewritten with other text returns `None` and the chunk is embedded. Repo test `get_chunk_embedding_returns_none_when_the_row_hash_differs`.
2. Fixed: `resource_usage::periodic_sampler_started()` (set when the thread spawns inside the `Once`); `debug_test.rs::enabling_debug_mode_starts_the_periodic_sampler_once` asserts it after `set_tauri_debug_mode(true)`, twice.
3. Fixed: the CPU floor is `wall / 10`.
4. Fixed: `finish()` reads memory once (`format_memory`), and both call sites skip `finish()` when `!is_debug_enabled()`.
