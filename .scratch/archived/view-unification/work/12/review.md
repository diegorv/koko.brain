VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first, with the real SQLite schema and real temp vault files: — every listed test exists and passes against the real schema and temp vaults: `utils_fs_test.rs::with_mtime_skips_view_files_that_the_metadata_walk_keeps` (a.md, b.view, c.VIEW; mtime walk = [a.md], metadata walk = all three); `search_fts_test.rs::build_search_index_drops_a_view_row_left_by_an_earlier_build` (removed == 1, "zebracorn" finds nothing, `integrity-check` passes) and `build_search_index_adds_a_view_renamed_to_markdown` (added == 1, removed == 0); `semantic_commands_test.rs::build_semantic_index_inner_no_change_branch_drops_view_rows_and_keeps_notes` (view chunk and `mtime:` key gone, note kept) and `build_semantic_index_inner_with_only_a_view_on_disk_embeds_nothing` (VIEW_YAML is well over 50 chars, Ok with 0 chunks); `search_rekey_test.rs` covers Foo.md -> Foo.view, Foo.md -> Foo.kanban, dir -> dir.view (keeps dir.view/a.md rows) and Foo.view -> Foo.md with no rows (Ok); `semantic.rs` mod tests `no_change_build_clears_the_search_cache_only_when_it_removed_chunks` and `search_rename_to_a_view_clears_the_search_cache`. I confirmed red-before-fix for the no-change cache test with a probe (guard forced false: the test panics at semantic.rs:1727, then restored). By reading the code: before the fix the view would be walked, so it would be in `all_paths` and the cleanup would keep it, and the semantic, FTS and rekey tests would fail.
- [met] FTS rows for views go after one vault open. Semantic rows go after one successful semantic build. With semantic off or the model missing, they stay dormant and unreadable. — `build_search_index_inner` (search_index.rs:62) diffs against the walk that now skips `.view` (fs.rs:248), so `plan_reconcile` removes the rows; the semantic build's both branches call `cleanup_orphaned_chunks(&all_paths)` (semantic.rs:565, :782) with the same walk. With no model, `compute_model_hash` is empty, nothing is built, and `search_semantic` / `search_hybrid` need `ensure_embedder_loaded` (semantic.rs:1011) before reading chunks, so the leftover rows are never served.
- [met] `get_all_vault_entries_v2` and Types > Views still list views. — `walk_dir`, `walk_dir_with_metadata` and `is_markdown_filename` are unchanged; `scan_vault` uses `collect_markdown_paths_with_metadata` (vault.rs:225, :1391) and `get_all_vault_entries_v2` reads `idx.entries()` (vault.rs:565). The new utils_fs test asserts the metadata walk still returns `b.view` and `c.VIEW`.
- [met] `docs/SEARCH.md` (step 4 "One walk", the rename bullet) and `help/documentation/06-search-and-navigation.md` are updated. — SEARCH.md:91 (walk lists only `is_search_indexed_filename`, set-difference cleanup, no version bump), :101 (rename drop at exact key, folder case, reverse no-op), :102 (backstop and no-change cache invalidation); help doc:81 says views are not searched and that renaming a view to `.md` makes it searchable. The "Open view" palette claim matches `src/lib/app/commands.ts:80`.

## Findings

1. nit, src-tauri/src/utils/fs.rs:104: `collect_markdown_paths_with_mtime` now returns a narrower set than `collect_markdown_paths` / `_with_metadata` (no `.view`), but the name still suggests the same set plus mtimes. The doc comment states the difference and the Issue kept the names on purpose, so no change is needed here. A later rename to something like `collect_search_paths_with_mtime` would stop a future VaultIndex caller from dropping views without noticing.

## Checks run by the reviewer

- `cargo test --manifest-path src-tauri/Cargo.toml --test utils_fs_test --test search_fts_test --test semantic_commands_test --test search_rekey_test`: exit 0 (43, 39, 52, 11 passed).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: exit 0 (734 passed, including the 4 `commands::semantic::tests`).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: exit 0.
- `taskpolicy -c background pnpm check`: exit 0, 0 errors (no frontend change; run as the project typecheck).
- Probe: with the `removed > 0` invalidation forced off, `no_change_build_clears_the_search_cache_only_when_it_removed_chunks` fails; restored, and the worktree is clean.
- No change under `src/lib/contracts/generated`, no `#[ts(export)]` edit, no layer-baseline or BASELINE_SIZE change. No `FTS_SCHEMA_VERSION` or `EMBED_RECIPE_VERSION` bump.
- The test verdict rests on: src-tauri/tests/utils_fs_test.rs, src-tauri/tests/search_fts_test.rs, src-tauri/tests/semantic_commands_test.rs, src-tauri/tests/search_rekey_test.rs, and the lib unit tests in src-tauri/src/commands/semantic.rs.

## Traced, not run

- `rename_in_search_index_inner`'s exact-key delete runs for every rename onto a non-searchable name, including plain folder renames (`dir` -> `archive`). The deletes use `path = ?1` / `source_path = ?1` / `key = ?1` (fts_repo.rs:125, semantic_repo.rs:90, :257), so they match no folder child.
- The in-app rename Foo.view -> Foo.md is not marked as a recent save, so the watcher's create upsert for Foo.md carries `vaultPath` (watcher-handler.service.ts:108) and indexes it. The manual in-app check from the Issue Notes was not run.
- Full suite and `pnpm build` are deliver's to run.

## Resolution

1. Rejected (no change). The finding itself says no change is needed: the Issue keeps the `collect_markdown_paths*` names on purpose, and the doc comment on `collect_markdown_paths_with_mtime` states that it skips `.view`. A rename touches every caller and is out of this Issue's scope; it can be a follow-up if the owner wants it.
