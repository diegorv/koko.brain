# 23: A tag-only search filters on the index tags instead of reading every note

**Status:** resolved

Priority: P2 (every tag click in the Tags tab blocks the app main thread for 0.2-2.3 s on a 10.6k-note vault)

**What to build:** A click on a tag in the Tags tab opens the search with `tag:<name>` (`src/lib/features/tags/TagsView.svelte:17-18`). That query has operators and no text, so `performSearch` takes the operator-only branch (`src/lib/features/search/search.service.ts:191-197`). The branch calls `loadVaultContentMap`, which reads the content of every note through `read_files_batch` (`search.service.ts:25-37`), and then `performSearchOverFiles` regex-scans every content for the tag (`search.logic.ts:151`, `matchesTagFilter` at `:101`). With no text query, the content is used only to match the tag. The `VaultIndex` entries already carry each note's tags (`loadVaultTagMap`, `search.service.ts:44-51`, used by the FTS-with-operators branch). `read_files_batch` is a sync Tauri command (`src-tauri/src/commands/files.rs:23-24`), so it runs on the app main thread.

Answer an operator-only query from the entries: tags from `entry.tags`, the path filter from `entry.path`, with no content read. Keep the nested-tag prefix match (`tag:a` also matches `a/b`, `search.logic.ts:104-108`) and the case-insensitive compare. The result follows the index tags, so a tag click returns the notes the Tags tab counts (owner decision, see Notes).

Evidence from the owner session `2026-11-03_09-36-54.log` (release build), 4 tag clicks:

| Time | `read_files_batch` (10633 files) | `[MAIN-HB]` stall | `[HB]` stall | Results |
|---|---|---|---|---|
| 12:39:43 | 1605 ms | 2267 ms | 1367 ms | 88 |
| 12:39:49 | 1119 ms | 1390 ms | 427 ms | 100 |
| 12:39:58 | 1078 ms | 1333 ms | 543 ms | |
| 12:40:03 | 268 ms | 246 ms | 757 ms | |

These were the only stalls above 310 ms in the session. The process footprint reached 4.7 GB at 12:39:44, with the semantic search cache (~438 MB) also loaded. The comment at `search.service.ts:13-24` says the content map fires only on rare conditions; the Tags tab makes it the common path.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/features/search/search.service.ts:13-51,186-197, src/lib/features/search/search.logic.ts:101-200, src/lib/features/tags/TagsView.svelte:17-18, src-tauri/src/commands/files.rs:23-24

- [x] Owner decision recorded in Notes: the operator-only branch follows `entry.tags`
- [x] Failing first: an operator-only `tag:` query makes no `read_files_batch` call and returns the notes that carry the tag, including a nested tag
- [x] A note whose only match is `#security-team` is not returned for `tag:security` (today's false positive)
- [x] A `path:` operator-only query still filters by path, and a query with operators and text still goes through FTS
- [x] The FTS-with-operators branch and the `FTS failed` fallback keep their current behavior
- [x] The comment at `search.service.ts:13-24` matches what the code does

## Notes

- Owner decision (triage 2026-11-03): the operator-only branch follows the `VaultIndex` tags (`extract_tags_strict`, `src-tauri/src/vault/parsing.rs:513`), the same set the Tags tab counts. Three results change against today's content regex (`matchesTagFilter`, `search.logic.ts:101-140`), and the owner accepted all three: `tag:security` no longer returns a note that only has `#security-team` (the regex accepts `-` after the tag, the index reads `security-team` as its own tag); a tag inside an HTML comment no longer counts (the index strips comments, the regex does not); a digit-first tag such as `#2024` no longer matches (the index rejects it; the Tags tab never shows one, so no tag click sends it).
- Owner decision: the 100-result cap of `performSearchOverFiles` (`maxResults`, `search.logic.ts:155`) is out of scope. A tag on more than 100 notes still shows 100 results (one click in the session returned exactly 100).
- Out of scope: making `read_files_batch` async. The watcher's incremental path also calls it (`src/lib/app/lifecycle/watcher-handler.service.ts:90`), for up to 10 files at a time. File it separately if a later session shows that path stalling.
- The FTS-with-operators branch matches tags exactly (`tagSet.has`, `search.service.ts:215-216`), without the nested prefix match the operator-only branch has. Do not change that here; record it in Notes if the fix makes the two branches share a matcher.

## Comments

- 2026-11-03, branch `issue/23-tag-only-search-reads-whole-vault`: an operator-only search (`tag:` / `path:`) now filters on `entry.tags` and paths from the vault entries snapshot, with no `read_files_batch` call; nested tags match, `#security-team` no longer matches `tag:security`. Review fixes: `mockSearchIPCs` JSDoc names only the FTS-fallback path; ADR 0025 lines 194-198 rewrapped. Left for the owner: CLAUDE.md:301 still says `loadVaultContentMap` fires on an operator-only query. Tests: `pnpm check` exit 0; `search.service.test.ts` 44/44; full suite at 1c87130f exit=0 (457 files, 10566 passed, 1 skipped, 1 todo, build ok). Reviews: round 1 APPROVED, round 2 APPROVED (fix round ran between them).
