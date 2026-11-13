VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `semantic_repo.rs:161` now selects `WHERE key = ?1 AND content_hash = ?2`; the only caller, `semantic.rs:1275-1277`, passes the re-keyed chunk's `content_hash` (the hash the planner matched on), and a `None` still pushes the chunk onto `chunks_to_embed` (`semantic.rs:1280-1283`). A source row rewritten with other text between the two `with_db` locks now has a different hash, so its vector is never copied. Repo test `get_chunk_embedding_returns_none_when_the_row_hash_differs` passes; the existing `..._returns_bytes_and_timestamp_or_none` test was updated to the new signature, not weakened. |
| 2 | minor | resolved | `resource_usage::periodic_sampler_started()` reads an `AtomicBool` set inside the `Once` from `spawn().is_ok()` (`resource_usage.rs:155-178`). `debug_test.rs::enabling_debug_mode_starts_the_periodic_sampler_once` asserts it after `set_tauri_debug_mode(true)`, twice, under `DEBUG_FLAG_LOCK`. `commands/debug.rs:15` is the only caller of `ensure_periodic_sampler`, so the flag can only be set through that command. Passes. |
| 3 | minor | resolved | `utils_resource_usage_test.rs:33` floor is `wall / 10`; a 40x unit error still fails it, and the upper bound is unchanged. Passes. |
| 4 | nit | resolved | `EmbedPass::finish()` reads memory once (`if let Some(m) = memory_usage()` + `format_memory`); both call sites (`semantic.rs:662`, `semantic.rs:1321`) call `finish()` only when `is_debug_enabled()`. `describe_memory()` output is unchanged. |

## Acceptance criteria

- [met] The unload generation advances after a no-change build, if `semantic_commands_test.rs` can build an all-mtimes-match fixture without a model; otherwise record the manual check ("Embedder unloaded" about 120 s after an idle open) — the fixes do not touch this path; `build_semantic_index_inner_with_no_changes_arms_the_idle_unload` still passes (`semantic_commands_test` 50/50).
- [met] Unit test: reported CPU time is non-decreasing across a busy loop and in the expected unit (compare with the wall time of a 100 ms spin) — the floor moved from `wall/2` to `wall/10`; the non-decreasing asserts and the `wall*cores*2` ceiling are unchanged, and a unit error (40x or more) still fails it. `utils_resource_usage_test` 3/3.
- [met] Failing first: a pure planner given old rows and new chunks returns reuse for a re-keyed chunk with a matching hash and embed for a changed one, with no model (pattern at `semantic_commands_test.rs:594-648`) — the planner is unchanged; `semantic_update_plan_test` 5/5 and the command-level reuse test in `semantic_commands_test` pass with the hash-matched read.
- [met] Not verified by the agent: the model's real RSS share (the "1.0-1.3 GB" figure is inferred) — still recorded as not verified; the fixes make no measured RSS claim.

## Findings

None open, none new. No regression found: the fix commit 28d8c08e touches only the four reviewed spots plus their tests; no test was deleted or loosened beyond finding 3's agreed floor; no layer-baseline, composition-root or ts-rs binding change; no scope creep.

## Checks run by the reviewer

In the worktree (shared target), each exit status read directly:
- `cargo test --test commands_test --test utils_resource_usage_test --test semantic_commands_test --test semantic_update_plan_test`: exit 0 (82, 3, 50, 5 passed; includes `enabling_debug_mode_starts_the_periodic_sampler_once`).
- `cargo test --lib semantic_repo`: exit 0 (29 passed, includes `get_chunk_embedding_returns_none_when_the_row_hash_differs`).
- `cargo clippy --all-targets -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors.
- The full suite (`cargo test`, `pnpm vitest run && pnpm build`) is deliver's to run. Not verified: an actual race between two parallel `update_semantic_file` calls; the fix rests on the repo-level hash test, which covers the rewritten-row read that the race produces.
