# 16: Text search with tag: or path: filters before the result cap, matches nested tags, and drops stale operator results

**Origin:** `.scratch/open-itens/issues/045-text-search-tag-path-returns-every-note.md` (from `audit-2026-11-05` Issue 25, with that audit's Issue 24 merged in on 2026-11-06), carried into finders-ux on 2026-11-17. No design-review proposal ID. Related research: `.scratch/finders-ux/research/verdict-background-refresh.md` and `.scratch/finders-ux/research/verdict-search-panel.md` (where it appears as an edge of the "N+" and Search panel tickets).

**What to build:** three defects in the words-plus-operators path of `performSearch` (`src/lib/features/search/search.service.ts`), fixed in the frontend only:

1. **Operators after the cap.** A query that mixes words and an operator (`meeting tag:work`, `meeting path:projects`) sends only the words to `search_fts` with `maxResults: 50` (`:199-203`). Rust ranks by BM25 and applies `LIMIT` before anything knows about the operators (`src-tauri/src/commands/search_index.rs:163` default 50, `src-tauri/src/db/fts_repo.rs:84-89` `ORDER BY score LIMIT ?2`). The tag and path filters then run in JS over those 50 rows (`:206-223`), so a matching note ranked 51st or lower for the bare words is never returned, and the list can be empty with no sign it was cut. Fix: when operators are present, ask `search_fts` for an uncapped candidate list by sending a named constant (for example `FTS_OPERATOR_CANDIDATE_LIMIT = 100_000`; `maxResults` is a plain number in `src/lib/contracts/commands.ts` and Rust takes `usize`), apply the tag and path filters, then cap the filtered list at the FTS cap from 05, keeping BM25 order. Do not derive the limit from the vault entry count: a count of 0 (index not built yet) sends `LIMIT 0` and returns nothing, a stale count brings the silent cut back, and it would add a serial `get_all_vault_entries_v2` call to `path:`-only queries. Load the vault entries only when a `tag:` operator is present, as today. Filter tags with the VaultIndex entry tags, never with the FTS row's `tags` column, which comes from a looser extractor (`src-tauri/src/search/fts_logic.rs` `extract_tags` vs `src-tauri/src/vault_index/entry.rs`) and would disagree with a tag click. Wrap the call in `timeAsync` so its cost shows in the debug log. Plain text queries keep the capped `search_fts` call as today.
2. **Exact tag match.** The tag check in that branch is an exact set lookup, `tagSet.has(tag.toLowerCase())` (`:215`), built by `loadVaultTagMap` (`:43-50`) from the raw entry tags with no parent expansion. The operator-only branch uses `matchesIndexTag` (`src/lib/features/search/search.logic.ts:149-155`), which also matches `work/...` children, as does the in-memory fallback (`matchesTagFilter`, `search.logic.ts:102-111`). Use `matchesIndexTag` over the entry's tags here too, so `tag:work` plus a word finds notes tagged `work/meetings`.
3. **Stale operator results (from the merged Issue 24).** An operator-only query stores its list in `searchStore.results` (`:194-197`). The `search_fts` branch then sets only `ftsResults` (`:223`, `:226`) and never clears `results`, and the panel's count and `hasResults` fall back to `results` when `ftsResults` is empty (`SearchPanel.svelte:55-69`). So a text query with no hits, right after a tag click, still shows the tag click's notes. The `search_fts` branch clears `searchStore.results`.
4. **"N+" after the fix.** 05 shows "{N}+ results" when a request reached its cap, and for operator-filtered FTS today it shows the "+" whenever the raw FTS response reached the cap. With step 1 the candidate list is no longer cut, so for words plus operators the "+" shows when the filtered list was longer than the cap before it was capped, or when the candidate list itself reached the constant. Update 05's flag and its test for this branch; plain text, semantic, hybrid and operator-only keep 05's rule.
5. **Help.** `help/documentation/06-search-and-navigation.md:138` says `tag:tagname` matches notes that contain that tag; add that it also matches nested tags (`tag:work` finds `work/meetings`), in operator-only and combined queries alike.

No Rust change: `search_fts` already takes `max_results`. Whichever side applies the filter owns the cap test, so the cap test is in `search.service.test.ts`.

**Blocked by:** 05

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` (frontend only; the fix does not touch `src-tauri/`).

- [ ] Failing test first, `src/tests/lib/features/search/search.service.test.ts`: text mode, query `meeting tag:work`, `search_fts` resolving one row for `notes/a.md`, `get_all_vault_entries_v2` returning that note with tags `['work/meetings']`; after `await performSearch()`, `searchStore.ftsResults` contains `notes/a.md`.
- [ ] Failing test first: 60 notes contain the word, and the only note under `path:projects` (and, in a second case, the only note with the tag) ranks below 50 for the bare word; `meeting path:projects` returns that note. The `search_fts` mock honours `maxResults`, so the test fails while the call still asks for 50.
- [ ] The final list is still capped at the FTS cap after filtering, and BM25 order is kept.
- [ ] With operators, 51 or more filtered matches show "{cap}+ results"; exactly the cap or fewer show the plain count (05's test for this branch changes on purpose).
- [ ] Operator-only queries and plain text queries behave as today: the existing tests at `search.service.test.ts:294-465` stay green, except the `maxResults: 50` assertions for operator queries (`:312-316`, and `:435` in the `path:` test that starts at `:422`), which change on purpose to the candidate constant. The `path:` test needs no new mock: `path:`-only operators must not trigger a `get_all_vault_entries_v2` call.
- [ ] Failing test first (from Issue 24): with the real `searchStore` in text mode, query `tag:work` and `get_all_vault_entries_v2` returning a note tagged `work`, `await performSearch()` (`searchStore.results` has 1 entry); then `setQuery('zzzz')` with `search_fts` resolving `[]`, `await performSearch()`; `searchStore.results` and `searchStore.ftsResults` are both empty.
- [ ] The same holds for `tag:work zzzz` when the operator filter leaves no FTS row.
- [ ] `src/tests/lib/features/search/SearchPanel.test.ts`: after that sequence the panel shows "No results found" and no result count.
- [ ] The FTS-failure fallback and the operator-only branch still clear `ftsResults` (the test at `search.service.test.ts:147` stays green).
- [ ] The help page says `tag:` matches nested tags.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **045 (absorbed).** Apply the operators before the result cap (either filter inside Rust before `LIMIT`, or fetch an uncapped or much larger candidate list when operators are present and cap after filtering), and use `matchesIndexTag` for the tag test. Whichever side applies the filter owns the test for the cap.
- **Issue 24 (merged into 045 on 2026-11-06).** A text search shows only its own results: a query with no hits says No results found, even right after a tag click.

## Problem

Text mode with a query that mixes words and an operator, as help page 06 documents (`meeting tag:work path:projects`), in a vault where the word appears in more than 50 notes: the operators filter only the top 50 FTS hits, so matching notes are missing and the list can be empty. `tag:work` plus a word misses notes tagged `work/meetings`, although a tag click (`tag:work` alone) lists them. After a tag click, a text query with no hits still shows the tag click's notes. Results are incomplete or stale; nothing is written.

## Evidence

Re-checked at `bb57e6165`; 045's line numbers from `5f8003d67` still hold except where noted.

- `src/lib/features/search/search.service.ts:43-50` `loadVaultTagMap` (raw lowercased tags, no parent expansion); `:184-186` operators parsed, `ftsQuery = query.text`; `:189-197` operator-only branch, `performOperatorOnlySearch`, `setResults`, `setFtsResults([])`; `:199-203` `call('search_fts', { query: ftsQuery, maxResults: 50, ... })`; `:206-223` tag and path filter over those rows, `:215` exact `tagSet.has`; `:226` plain FTS `setFtsResults`, with no `setResults([])` in either FTS sub-branch; `:229-240` FTS-failure fallback.
- `src-tauri/src/commands/search_index.rs:155` `max_results: Option<usize>`, `:163` `unwrap_or(50)`, `:186` `search_match(conn, &fts_query, limit)`.
- `src-tauri/src/db/fts_repo.rs:84-89`: `bm25(...) as score ... ORDER BY score LIMIT ?2`.
- `src/lib/features/search/search.logic.ts:102-111` `matchesTagFilter` and `:149-155` `matchesIndexTag`, both prefix-matching nested tags; `:179` `performOperatorOnlySearch` uses `matchesIndexTag`; `:189` `matchesPathFilter`.
- `src/lib/features/search/SearchPanel.svelte:55-69`: `hasResults` and `resultCount` in Text mode fall back to `searchStore.results` when `ftsResults` is empty.
- `src/tests/lib/features/search/search.service.test.ts:294-321` asserts `maxResults: 50` for `tag:javascript fix`; `:422` the `path:` variant; `:147` "clears stale ftsResults when FTS5 fails and falls back".
- `help/documentation/06-search-and-navigation.md:134-144` documents the operators and the tag-click equivalence (045 cited `:135-142`).

## Comments

- 2026-11-06 (in 045): Issue 24 merged in by the owner after the challenge review; its criteria are above.
- 2026-11-17, triage: ready-for-agent. Decided: the fix stays in the frontend (a fixed candidate constant sent as `maxResults` to `search_fts` when operators are present, not the vault entry count, filtered with `matchesIndexTag` and `matchesPathFilter`, then capped), because it needs no Rust or IPC change and `search_fts` already takes `max_results`; a Rust-side filter before `LIMIT` is not part of this ticket. Runs after 05, whose "N+" flag this ticket updates for the operator branch.
