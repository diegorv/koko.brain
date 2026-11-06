# 67: The first semantic or hybrid search after a one-file index update does not reload the whole search cache

**Migrated from:** `.scratch/ui-responsiveness/issues/26-search-cache-reload-after-index-update.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Performance fine-tuning (about 2.5 s once per index change). The Issue itself requires the owner decision first.

**Audit check at `5f8003d67`:** still_present (polish, medium). invalidate_search_cache (src-tauri/src/commands/semantic.rs:148) still drops the whole cache and get_or_load_cache (:157) reloads it in full on the next semantic/hybrid search. Call sites at HEAD: :571 (after cleanup_orphaned_chunks), :786 (build_semantic_index), :1262 (shutdown_semantic), :1294 (remove_semantic_file when rows were removed), :1321 (update_semantic_file empty content), :1468 (update_semantic_file with changes). Performance, not correctness.

**Stale in the text below:** Cited lines moved (781->786, 1267->1262, 1299->1294, 1326->1321, 1473->1468) and the invalidation list misses the call at :571. The owner decision (A, B or C) is still not recorded in Notes.

**Owner decision needed:** Search cache after an index update: option A, B or C as described in the Issue (for example keep the cache and patch the changed file's rows, or reload it in the background), recorded in Notes with the Issue 24 timing numbers.

**Status:** needs-info

Priority: P3 (2.5 to 2.9 s on the first semantic or hybrid search after an index change; 2 of 6 cache lookups in the owner session; the reranker is the larger cost)

**What to build:** Decide whether the semantic search cache should survive a one-file index update, and if so how. `invalidate_search_cache` (`src-tauri/src/commands/semantic.rs:148`) drops the whole cache (156,885 chunks, 437.7 MB in the owner vault) and is called after `build_semantic_index` (`:781`), `shutdown_semantic` (`:1267`), `remove_semantic_file` when rows were removed (`:1299`), and `update_semantic_file` when the note has no content (`:1326`) or its chunks changed (`:1473`). The next `search_semantic` or `search_hybrid` finds no cache and reloads every chunk from the database before it can score anything (`get_or_load_cache`, `semantic.rs:157-164`, logs the miss at `:164`).

Evidence from the owner session `2026-11-03_11-40-57.log` (release build): 17 invalidations, 6 cache lookups by a semantic or hybrid search, 4 hits and 2 misses:

| Time (log clock, UTC) | Lookup | Cost |
|---|---|---|
| 15:33:26 | miss | `Search cache loaded: 156885 chunks, ~437.7 MB` after 2.9 s |
| 15:33:57, 15:35:07, 15:35:24, 15:35:26 | hit | none |
| 15:36:04 | miss | loaded at 15:36:07, 2.5 s |

Both misses followed real changes. Before 15:36:04: an update of a journal note under `legacy-vault` at 15:35:58 invalidated the cache 140 ms after its FTS update, and two template notes under `_system/templates/types` (`SlackRadar.md`, `DocsRadar.md`) invalidated it twice at 15:36:00-01. The line "all 11 chunks unchanged" at 15:35:58.816 belongs to a second, duplicate watcher event for the journal note, 600 ms after the first; it skipped the update and did not invalidate. So this session shows no invalidation that was avoidable by a content check, and Issue 24's note saying the reload "may have been avoidable" is corrected there.

The cost per miss is known; what is not known is how often a reload lands in normal use. Issue 24's `[SEMANTIC] timing` line (`cache=miss` with its milliseconds) will show it per search once the app is rebuilt.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only, if code changes)

**Source:** src-tauri/src/commands/semantic.rs:148,157-164,781,1267,1299,1326,1473, docs/SEARCH.md (log table)

Options, with what each costs:

- **A. Patch the cache in place.** `update_semantic_file` and `remove_semantic_file` replace or remove that file's chunks inside the cached structure instead of dropping it. No reload, and a search right after an edit sees it. The cost is complexity in code the cosine scan and `build_pool` index by position (`cached_chunks[idx]`), an int8 layout to keep consistent, and a stale or wrong result if the patch is wrong; it needs its own tests.
- **B. Reload in the background after a quiet period.** The next search finds a warm cache. It spends 2.5 to 2.9 s of CPU and a 437 MB read after every edit burst, even when no search follows, and competes with typing.
- **C. Leave it.** One reload of about 2.5 s after an edit, against 10 to 29 s of reranking in the same searches.

Recommendation: C until Issue 24's numbers exist. Revisit with A if `cache=miss` is a large share of a typical search after edits.

- [ ] Owner decision recorded in Notes (A, B or C), with the Issue 24 timing numbers that support it
- [ ] If A or B: failing first, a test that a search right after `update_semantic_file` for one note neither reloads the whole cache (A) nor returns the note's old chunks; full `cargo test` green
- [ ] If C: the Issue closes as wontfix with the numbers in Notes

## Notes

- Not a hard dependency, but the decision should wait for Issue 24's on-device `[SEMANTIC] timing` numbers.
- This Issue needs an owner decision before an agent can implement it, so it is not `ready-for-agent`. Run `/relay-lite:run` for it only after the decision is in Notes, with its number named.
- The journal note and the two template notes were written by something other than the app UI (the watcher reported them); the log does not say what wrote them.

## Comments

- 2026-11-06: migrated from `.scratch/ui-responsiveness/issues/26-search-cache-reload-after-index-update.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
