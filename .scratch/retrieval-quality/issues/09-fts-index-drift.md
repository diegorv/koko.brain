# Issue 09: FTS index drifts from disk: count-within-5% skip never reconciles external adds, deletes and edits

Status: ready-for-agent
Source: retrieval-quality, measured on the owner's vault 2026-09-10 while
verifying the issue 08 close (`44baa618`)

## What

`build_search_index_inner` (`src-tauri/src/commands/search_index.rs:40-71`) is
the only full-vault reconcile the FTS5 index gets. It collects the markdown
paths (`:43`, `collect_markdown_paths` with an empty exclusion list), counts
the rows already in `notes_content` (`:47`), and returns early when

```rust
let threshold = (disk_count / 20).max(5); // 5% or at least 5
if diff <= threshold { /* skip */ }
```

(`:49-61`). Otherwise it falls through to a full read of every file and a
`clear_index` + `insert_entry` loop (`:90-107`).

A cardinality comparison cannot see identity or freshness, and the table has
nothing to compare against: `notes_content` stores `path, title, content,
headings, tags` and no mtime or content hash
(`src-tauri/src/db/schema.rs:89-96`). Every other update is app-initiated:
the after-save observer (`src/lib/features/search/search.service.ts:329`),
`applyNoteChange`'s edit branch
(`src/lib/core/filesystem/note-change.service.ts:195`) and its delete branch
(`:160`). Nothing the app did not itself perform is ever noticed.

So three failure modes survive indefinitely, and one of them hides the other
two by cancelling out in the count:

1. **External adds.** A file appearing while the app is closed (sync client,
   git pull, an importer) has no row, and one missing row moves `diff` by 1.
2. **External deletes.** A removed file keeps its row and answers searches
   with content that is not on disk. A delete offsets an add exactly, so the
   two together leave `diff` unchanged.
3. **External edits.** Same path, same count, stale content forever. Not even
   a full rebuild is triggered by this one, because `diff` never moves.

Measured on the owner's vault, 2026-09-10:

| Metric | Value |
| --- | --- |
| markdown files on disk | 9,524 |
| rows in `notes_content` | 9,384 |
| `diff` / `threshold` | 140 / 476, so the rebuild is skipped |
| notes with semantic chunks but no FTS row | 171 |
| chunk rows behind those 171 paths | 3,666 |
| FTS rows whose file no longer exists | 26 |

The 171 are mostly large saved articles under the reading list (p50 21 KB,
38 of them modified in the last 3 days). They are invisible to `text` mode
and to hybrid's FTS leg, while semantic still returns them, which is why the
gap reads as a ranking oddity rather than a missing index.

The semantic index does not have this problem. `build_semantic_index`
compares each file's mtime against the stored one
(`src-tauri/src/commands/semantic.rs:479-490`) and sweeps rows whose file is
gone (`cleanup_orphaned_chunks`, `:1357-1379`). FTS5 has neither half.

### Correction to the issue 08 close

The close commit `44baa618` recorded the 133 orphaned `chunks.source_path`
values as chunks of deleted or renamed notes, and promised the count would
drop to 0 after one full `build_semantic_index`. Both halves are wrong. The
query behind that number is anti-joined against `notes_content`, so what it
counted was this FTS drift: notes that exist on disk, are correctly chunked,
and are missing their FTS row. The count is 3,666 rows over 171 paths today
and a semantic re-index cannot move it, because the missing side is the FTS
table. The fix that shipped (`2973907e`, purge chunks on every real removal)
is unaffected and stays valid: it addresses a real leak on app-initiated
deletes. Only the diagnosis and the "drops to 0" gate were misattributed.

## Fix

Replace the count heuristic with a path + mtime reconcile at vault open.

1. **Add the column.** `mtime INTEGER NOT NULL DEFAULT 0` on `notes_content`,
   through the migration mechanism already in `schema.rs`: the
   `ALTER TABLE ... ADD COLUMN` whose "duplicate column name" error is
   swallowed and every other error propagated, exactly as
   `chunks.parent_headings` is added at `schema.rs:66-76`. Do **not** bump
   `FTS_SCHEMA_VERSION` (`schema.rs:10`): that constant exists for
   `tokenize=` changes and its drop + recreate throws the whole table away
   (`:83-112`). An added column leaves the 9,384 good rows in place; they
   default to mtime 0, so the first reconcile re-indexes them once and then
   settles. `notes_content` is the external content table for `notes_fts`,
   which addresses its columns by name, so an extra column it does not list
   is inert.

2. **Reconcile instead of counting.** Walk the disk with the helper that
   already exists, `collect_markdown_paths_with_mtime`
   (`src-tauri/src/utils/fs.rs:80-87`, returns
   `(rel_path, abs_path, mtime_secs)` from the metadata the walk already
   fetched, so no extra stat per file), read `path -> mtime` out of
   `notes_content`, and diff the two maps:
   - path in DB, not on disk -> `delete_entry`
   - path on disk, not in DB -> read + `insert_entry`
   - both, `disk_mtime > stored_mtime` -> read + re-index
   - both, otherwise -> untouched, never read

   Keep passing the empty exclusion list the current call uses
   (`search_index.rs:43`). Semantic's `EXCLUDED_FOLDERS` skips `_templates`
   (`semantic.rs:1310-1311`); FTS deliberately indexes it, and reusing the
   semantic constant here would silently drop those notes.

   Keep the `clear_index` + full rebuild for exactly two cases: the table is
   empty, or `fts_schema_version` did not match and the migration recreated
   it. Both are already detectable, and both make a diff pointless.

3. **Keep the save path from re-indexing itself.** `insert_entry`
   (`src-tauri/src/db/fts_repo.rs:25-48`) gains an `mtime` parameter, so
   `update_search_index_file_inner` (`search_index.rs:168-179`) has to supply
   one, and it currently receives only `file_path` + `content` with no vault
   root to resolve them against. Give the command a `vaultPath` argument and
   stat the real file the way `update_stored_mtime` does
   (`semantic.rs:1316-1338`: canonicalize, `starts_with` traversal check,
   `as_secs() as i64`, 0 on failure). Both call sites already have the vault
   path in hand and already pass it to `update_semantic_file` on the adjacent
   line (`note-change.service.ts:195-199`,
   `search.service.ts:329-335`), so this is a one-argument change on each.
   Storing wall-clock `now()` instead would avoid the signature change but
   would record a timestamp ahead of the file's real mtime, and second
   resolution then swallows an external edit landing in the same second as a
   save.

4. **Report what happened.** `IndexStats` (`search_index.rs:13-15`) carries
   only `total_documents`. Add `added`, `updated` and `removed` so the
   existing `debug_log` line states the reconcile instead of the skip, and so
   the panel counter has the numbers behind it. `SearchIndexStats`
   (`src/lib/features/search/search.types.ts:63`) needs the matching optional
   fields; `SearchPanel.svelte:122` and `SearchStatus.svelte:22,27` read
   `totalDocuments` only and keep working unchanged.

Cost per open is one directory walk plus reads of the changed files only,
against today's full read of every file whenever the count happens to drift
past 5%.

## Tests

`cargo test --manifest-path src-tauri/Cargo.toml`.

- **Unit, on the decision alone.** Extract the diff as a pure function over
  two `HashMap<String, i64>` (disk, stored) returning the three path lists,
  and cover: empty stored (everything added), empty disk (everything
  removed), equal mtimes (nothing touched), disk newer (updated), stored
  newer, or equal-but-both-present (not touched), and the add + delete pair
  that today cancels out in the count. This is where the regression actually
  lives, and it needs no filesystem.
- **Integration, temp vault.** Build the index over a temp vault, then
  outside any app code: add a file, remove a file, rewrite a file with a
  newer mtime, and leave a fourth untouched. Reconcile and assert the row
  set and the row contents match disk, that `IndexStats` reports
  `added: 1, updated: 1, removed: 1`, and that the untouched file was not
  re-read (assert on `updated`, or on a read counter, not just on the final
  content, which is identical either way).
- **Existing FTS suites stay green:** `src-tauri/tests/search_fts_test.rs`,
  `src-tauri/tests/fts_repo_test.rs`, `src-tauri/tests/db_test.rs` (the
  `fts_schema_version` cases at `schema.rs:286-316` cover the migration path
  the new column rides on).
- Frontend touched (`search.types.ts`, the two `invoke` call sites), so the
  full gate applies: `pnpm check` + `pnpm vitest run` + `pnpm build`.

## Done when

On the owner's vault, after opening the app exactly once, both counts are 0:

```sql
-- FTS rows with no file on disk
SELECT COUNT(*) FROM notes_content WHERE path NOT IN (:disk_paths);
-- notes with chunks but no FTS row (the 3,666 / 171 above)
SELECT COUNT(*) FROM chunks c
WHERE NOT EXISTS (SELECT 1 FROM notes_content n WHERE n.path = c.source_path);
```

and `text` mode of `src-tauri/examples/retrieval_eval.rs` (`--mode text`,
`ALL_MODES` at `:65`, dispatch at `:580`) returns a reading-list note that is
missing from its results today. Pick one of the 171 for the query fixture
before the fix lands, so the before/after is a single named query rather than
a vibe.

## Comments

_(none yet)_
