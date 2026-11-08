# 12 discovery: `.view` leaves the FTS5 and semantic tables

No `spec.md` for this feature (only `PRD.md`, which puts search out of scope; this Issue is the exception it lists).

## Files that change

- `src-tauri/src/utils/fs.rs:134-142`: add `is_search_indexed_filename` after `is_view_filename`; `walk_dir_with_mtime` (`:236`) calls it. Doc fixes at `:84-87` (base walk lists `.view` too), `:97-99` (mtime walk is the search walk, no views), `:109-112`, `:122` (`is_markdown_filename` also matches `.view`, means "in the VaultIndex").
- `collect_markdown_paths_with_mtime` has exactly two callers: `search_index.rs:62` (FTS reconcile) and `semantic.rs:525` (semantic build). Neither is a VaultIndex path, so no VaultIndex behavior moves.
- `src-tauri/src/commands/search_index.rs:270-286` `rename_in_search_index_inner`: in the transaction, before `rename_entries` / `rename_paths`, when `!is_search_indexed_filename(&to)`: `fts_repo::delete_entry(from)`, `semantic_repo::delete_chunks_for_path(from)`, `semantic_repo::delete_mtime(from)`. Invalidate the cache when `dropped + moved > 0`. Exact-key delete, so a folder `dir` -> `dir.view` still re-keys `dir/*`.
- `src-tauri/src/commands/semantic.rs:1522` `cleanup_orphaned_chunks` returns `Result<usize, String>` (count of chunk paths deleted). `:565` no-change branch calls `invalidate_search_cache()` when it is > 0. `:777` ignores the count (it invalidates unconditionally already).
- Docs: `docs/SEARCH.md:91` (step 4, one walk) and `:101` (rename bullet); `help/documentation/06-search-and-navigation.md` (what is searchable).

## Tests (failing first)

- `src-tauri/tests/utils_fs_test.rs`: `a.md`, `b.view`, `c.VIEW`: `_with_mtime` -> only `a.md`; `_with_metadata` -> all three. The existing `with_mtime_returns_same_files_as_without_mtime` has no views, so it stays true.
- `src-tauri/tests/search_fts_test.rs`: seed a `.view` row via `update_search_index_file_inner` alongside `setup_vault()`'s notes after a first build; reconcile -> `removed == 1`, term finds nothing, `integrity-check` passes. Second: view on disk, then rename file to `.md` on disk, reconcile -> `added == 1`.
- `src-tauri/tests/semantic_commands_test.rs`: no-change branch with note + view, both stored mtimes equal to disk, chunks seeded for both -> view chunk and `mtime:` gone, note kept. Only a `.view` (>= 50 chars YAML) -> `Ok`, 0 chunks (pre-fix: `Err("Embedder not initialized")`). Copy `build_semantic_index_inner_with_no_changes_arms_the_idle_unload`.
- `src-tauri/tests/search_rekey_test.rs`: `Foo.md` -> `Foo.view`, `Foo.md` -> `Foo.kanban` leave no rows; `dir` -> `dir.view` keeps `dir.view/a.md`; `Foo.view` -> `Foo.md` with no rows is `Ok`. Copy `seed_note` + `assert_fts_integrity`.
- `semantic.rs mod tests`: copy `search_rename_that_moves_chunks_clears_the_search_cache` for `Foo.md` -> `Foo.view`; a `#[tokio::test]` no-change build over a temp vault with only an orphan chunk seeded -> cache `None`.

## Risks

- `semantic.rs mod tests` share the global DB, `SEARCH_CACHE` and `BUILD_LOCK` across parallel unit tests. A new build test holding `BUILD_LOCK` would break `semantic_build_running_tracks_build_lock`. Default: a module-local `TEST_LOCK` taken by every test in that module.
- No `FTS_SCHEMA_VERSION` / `EMBED_RECIPE_VERSION` bump; existing view rows go by set difference only.
- No `#[ts(export)]` change, so no generated bindings move.

## Defaults taken

- `type-definitions.service.ts:283-284` comment becomes true for every writer; left unchanged (Gate is Rust only).
- Per-file `update_search_index_file` / `update_semantic_file` stay unguarded (Issue Notes).
