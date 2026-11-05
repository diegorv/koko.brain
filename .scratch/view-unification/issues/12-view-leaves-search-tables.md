# 12: `.view` leaves the FTS5 and semantic tables

**What to build:** `is_markdown_filename` (`utils/fs.rs:134-137`) carries two meanings: "belongs in the VaultIndex" and "is a searchable note". The search walks inherit the first, so every vault open gives each `.view` an FTS row and embedded raw YAML chunks. Meanwhile no per-file path updates them, so results show stale YAML. The comment at `type-definitions.service.ts:283-284` is true only for that writer.

1. **Predicate split, `utils/fs.rs`:**

   ```rust
   /// True for a file that gets FTS5 rows and embeddings. A `.view` is in the
   /// VaultIndex (`is_markdown_filename`) but on no search surface.
   pub fn is_search_indexed_filename(file_name: &str) -> bool {
   	is_markdown_filename(file_name) && !is_view_filename(file_name)
   }
   ```

   `walk_dir_with_mtime` (`:236`) calls it. `is_markdown_filename`, `walk_dir` and `walk_dir_with_metadata` stay, so `vault.rs:225,325,1123,1391` and the menus are untouched. Fix the docs at `:84-87,97-99,109-112,122`.

2. **Rename, `rename_in_search_index_inner` (`search_index.rs:274-278`):** inside the transaction, before the re-keys, when `!is_search_indexed_filename(&to)`: `delete_entry`, `delete_chunks_for_path` and `delete_mtime` for `from`, and count the dropped chunks in the cache-invalidation check. Use this predicate, not `is_view_filename`, so `Foo.md` -> `Foo.kanban` also drops its rows. The delete uses the exact key, so a folder `A` -> `A.view` still re-keys its children.

3. **Semantic no-change branch (`semantic.rs:565`):** `cleanup_orphaned_chunks` returns the count of deleted chunk paths, and the branch calls `invalidate_search_cache()` when it is above 0. Without this, view hits stay in semantic and hybrid results after the rows are gone.

Existing rows go by set difference, with no migration and no version bump: `plan_reconcile` (`fts_logic.rs:48-52`), then `cleanup_orphaned_chunks` and `delete_orphaned_mtimes`. Do not bump `FTS_SCHEMA_VERSION` or `EMBED_RECIPE_VERSION`, which would rebuild or re-embed the vault.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`. No `#[ts(export)]` edits.

- [ ] Failing tests first, with the real SQLite schema and real temp vault files:
  - `utils_fs_test.rs`: with `a.md`, `b.view`, `c.VIEW`, the `_with_mtime` walk returns only `a.md`, and the `_with_metadata` walk returns all three.
  - `search_fts_test.rs`: a seeded `.view` row is gone after `build_search_index_inner`, `stats.removed == 1`, the term finds nothing, and `integrity-check` passes.
  - `semantic_commands_test.rs`: the no-change branch removes a view's chunk and `mtime:` key, and keeps a note's.
  - `semantic_commands_test.rs`: only a `.view` on disk gives `Ok` with 0 chunks. **The fixture needs at least 50 characters of YAML** (`chunker.rs:26`), or the test is green before the fix.
  - `search_rekey_test.rs`: `Foo.md` -> `Foo.view` and `Foo.md` -> `Foo.kanban` leave no rows. Folder `dir` -> `dir.view` keeps `dir.view/a.md`'s rows. `Foo.view` -> `Foo.md` with no rows is `Ok`.
  - `search_fts_test.rs`: after `Foo.view` -> `Foo.md` on disk, the next reconcile reports `added == 1`.
  - `semantic.rs mod tests`: the no-change build clears the cache when it removed chunks, and `Foo.md` -> `Foo.view` clears it too.
- [ ] FTS rows for views go after one vault open. Semantic rows go after one successful semantic build. With semantic off or the model missing, they stay dormant and unreadable.
- [ ] `get_all_vault_entries_v2` and Types > Views still list views.
- [ ] `docs/SEARCH.md` (step 4 "One walk", the rename bullet) and `help/documentation/06-search-and-navigation.md` are updated.

## Notes

- **Manual check in the app:** rename `Foo.view` to `Foo.md`, then search for it. It should be searchable within the watcher debounce (`watcher.rs:272`, `watcher-handler.service.ts:105`). This was traced, not run.
- **Not guarded on purpose:** `update_search_index_file` and `update_semantic_file` take any path. Every current caller filters, so a guard has no concrete failure to prevent. "Is searchable" is therefore decided by several call sites, not one owner. Do not claim otherwise.
- **Accepted:** a query before the first reconcile can still hit a view. After an embed failure the chunks stay until a build completes.
- **Search eval:** the owner runs it after delivery. `retrieval_eval` reads the DB without reconciling, so open the app once between runs.
- **Consumer note:** a tag held only by a view shows in TagsView and returns 0 results, until Issue 14 removes view tags.
- **Size:** M.
