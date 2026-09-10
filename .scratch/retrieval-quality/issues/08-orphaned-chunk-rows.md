# Issue 08: Deleting a note leaves its chunks in the semantic index

Status: ready-for-agent
Source: the issue-04 probe on 2026-09-10 (owner's vault DB, opened immutable),
the mirror image of issue 04

## What

Issue 04 was "an FTS row with no chunks". The same probe found the opposite,
and it is the larger number: 133 distinct `chunks.source_path` values have no
matching row in `notes_content`, i.e. chunks whose note was deleted or renamed
and never purged. Both tables are keyed vault-relative (`ftsKey` in
`note-change.service.ts:208-221` feeds `update_semantic_file` and
`remove_from_search_index` alike), so the two columns are directly comparable.

The cause is a deliberate deferral. The delete branch of `applyNoteChange`
(`src/lib/core/filesystem/note-change.service.ts:148-166`) drops the Rust
`VaultIndex` entry and the FTS5 row, and its own comment says semantic chunks
"are cleaned up by the orphan pass at the end of the next
`build_semantic_index` run". That pass is `cleanup_orphaned_chunks`
(`src-tauri/src/commands/semantic.rs:1322-1348`) and it is real, but its only
two callers are inside `build_semantic_index` itself (`:519` and `:727`). A
normal session never triggers a full build, so between builds every delete and
every rename leaks its chunks, and there is no per-path semantic removal
command to call: `delete_chunks_for_path` exists
(`src-tauri/src/db/semantic_repo.rs:85-92`) but nothing exposes it to the front
end - the registered semantic commands (`src-tauri/src/lib.rs:316-327`) have no
`remove_*` entry.

Consequence: those chunks stay in the search cache and can be returned by
semantic and hybrid search as results pointing at paths that no longer exist,
and they inflate the cache footprint the issue-01 int8 work just cut.

## Fix

Close the per-delete leg; the reconcile leg already exists.

1. New Tauri command, `remove_semantic_file(file_path)`, in
   `commands/semantic.rs` next to `update_semantic_file` - a `spawn_blocking`
   wrapper around `db::semantic_repo::delete_chunks_for_path` plus the
   `semantic_meta` `mtime:<rel_path>` key for that path, in one transaction,
   then `invalidate_search_cache()`. Register it in `lib.rs`.
   Dropping the mtime key matters: chunks gone but the mtime left behind means
   a file re-created at the same mtime is treated as unchanged and never
   re-embedded.
2. Call it from the delete branch of `applyNoteChange`, in the same
   `if (key !== null)` block as `remove_from_search_index` and with the same
   fire-and-forget `.catch(...)` shape. `path-change.service::applyPathChange`
   already routes every rename / move / folder delete through `forgetNote`, so
   one call site covers all of them. Replace the "cleaned up by the orphan
   pass" comment, which stops being true.
3. Nothing new is needed on the scan side: `build_semantic_index` keeps its
   Phase 4 `cleanup_orphaned_chunks` as the backstop for whatever the app
   misses while it is not running (files deleted outside the app).

## Tests

`cargo test --manifest-path src-tauri/Cargo.toml` and `pnpm vitest run`.

- Rust: the repo-level delete is already covered
  (`delete_chunks_for_path_removes_matching`, `semantic_repo.rs:371`). Add the
  command-level case: chunks + mtime key for a path, remove, assert both are
  gone and a sibling path's rows survive.
- TS: `src/tests/lib/core/filesystem/note-change.service.test.ts` - assert the
  delete branch invokes `remove_semantic_file` with the vault-relative key,
  that a path outside the vault (`ftsKey` returns `null`) invokes neither
  semantic nor FTS removal, and that a rejected invoke is logged and not
  rethrown.

## Done when

`SELECT COUNT(DISTINCT source_path) FROM chunks WHERE source_path NOT IN
(SELECT path FROM notes_content)` is 0 on the owner's vault after one full
`build_semantic_index` and stays 0 across a session of deletes and renames
without another build (it is 133 today). The "Search cache loaded" line reports
fewer chunks than 139,360 for the same note count, and the retrieval eval shows
no per-query regression.

## Comments

2026-09-10 - Opened from the issue-04 probe. The same read-only pass over the
DB produced both numbers: 78 FTS notes with zero chunks (issue 04, fixed by
3a841bc9) and these 133 chunk paths with no FTS note. Only the chunk count and
the path column were read; no note content left the probe.
