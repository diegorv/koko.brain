# Issue 11 discovery: re-key search rows on path change

No `spec.md` in `.scratch/audit-2026-11-04/`; the Issue and `findings.md` are the source.

## Files that change

- `src-tauri/src/db/fts_repo.rs` (after `delete_entry`, ~:137): new `rename_entries(conn, from, to, title_of)`. `notes_fts` is external-content and indexes `path` and `title`, so an UPDATE of `notes_content` alone leaves stale terms. Per row under the prefix: FTS5 `'delete'` with the old values (same as `delete_entry`), UPDATE `notes_content.path/title` by rowid, re-insert into `notes_fts` with the same rowid. `title` is derived from the path (`fts_logic::extract_title`), so a single-file rename changes it; the closure keeps `db/` free of `search/` imports.
- `src-tauri/src/db/semantic_repo.rs` (near `delete_mtime`, ~:255): new `rename_paths(conn, from, to)`. `chunks.key` is `<source_path>#<slug>-<line>` (`semantic/chunker.rs:395`), so both `key` and `source_path` move; `semantic_meta` `mtime:<rel>` keys move. Embeddings carry no path, so the rows stay valid.
- `src-tauri/src/commands/search_index.rs` (after `remove_from_search_index_inner`, ~:249): `rename_in_search_index(from, to)` async command + `_inner`. One `with_fts_db_transaction` (both connections open the same file, so one transaction covers FTS and semantic tables). After commit, invalidate the semantic search cache when chunks moved (`commands/semantic.rs:148` `invalidate_search_cache` becomes `pub(crate)`).
- `src-tauri/src/lib.rs:361`: register the command. `src/lib/contracts/commands.ts:116,234`: contract entries (parity test reads both).
- `src/lib/core/filesystem/path-change.service.ts:199-214`: after `rename_note`, before the `forgetNote` sweep, await `rename_in_search_index` with `vaultRelativeKey(vaultStore.path, from/to)`; skip when either is null or no vault. Failure is logged via `error('FS', ...)`. Comments :88-96 updated.
- Docs: `CLAUDE.md` Indexing item 6 "delete branch" bullet; `docs/adr/0009-...md` amendment.

## Prefix matching

`path = from OR substr(path, 1, length(from) + 1) = from || '/'`. No LIKE (wildcards `%`/`_` in names, ASCII case folding). `length`/`substr` both count characters, so the slice is consistent for non-ASCII names.

## Tests (prior art)

- Rust: new `src-tauri/tests/search_rekey_test.rs`, global DB pattern from `search_fts_test.rs` (`TEST_LOCK`, `db::open_database(tmp)`), seed via `fts_repo::insert_entry` / `semantic_repo::insert_chunk` / `upsert_mtimes`. Asserts MATCH returns `renamed/a.md`, `renamed/b.md`; nothing under `dir/`; chunk keys + mtime keys moved; `dirx/c.md` untouched; FTS5 `integrity-check` passes; single-file rename updates the title.
- TS: `src/tests/lib/core/filesystem/fs.service.test.ts` `renameItem` / `moveItem` describes; order via `invoke.mock.calls` index against the first `remove_from_search_index`. Copy `seedDirWithTwoChildren`.

## Risks / defaults taken

- Destination rows already present (UNIQUE on `notes_content.path`, PK on chunk key) fail the transaction; it rolls back, the error is logged and the sweep behaves as before this Issue. Not pre-cleared: the disk rename refuses an existing target, so only a stale row could collide.
- A rename that leaves Markdown (`a.md` -> `a.txt`) re-keys the row to a non-md path; the next vault-open reconcile drops it. Accepted.
- Separate try/catch from `rename_note` so one failure does not skip the other.
