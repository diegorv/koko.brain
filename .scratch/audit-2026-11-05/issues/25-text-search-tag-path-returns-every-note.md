# 25: Text search with tag: or path: returns every note that matches the words and the operators, and tag: matches nested tags

**What to build:** Two defects in the words-plus-operators branch of performSearch. (1) It sends only the words to search_fts with maxResults 50 (src/lib/features/search/search.service.ts:199-203); Rust ranks by BM25 and applies LIMIT before anything knows about the operators (src-tauri/src/commands/search_index.rs:163 default 50, src-tauri/src/db/fts_repo.rs:84-89 ORDER BY score LIMIT ?2). The tag and path filters then run in JS over those 50 rows (search.service.ts:206-223), so any matching note ranked 51st or lower for the bare words is never returned, and the list may be empty with no sign it was cut. (2) The tag check there is an exact set lookup, tagSet.has(tag.toLowerCase()) (:215), while the operator-only branch uses matchesIndexTag (src/lib/features/search/search.logic.ts:149-155), which also matches `work/...` children, as does the in-memory fallback (matchesTagFilter, search.logic.ts:102-111). Fix direction: apply the operators before the result cap (either filter inside Rust before LIMIT, or fetch an uncapped or much larger candidate list when operators are present and cap after filtering), and use matchesIndexTag for the tag test. Whichever side applies the filter owns the test for the cap.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/search/search.service.test.ts: text mode, query 'meeting tag:work', search_fts resolving one row for notes/a.md, get_all_vault_entries_v2 returning that note with tags ['work/meetings']; after await performSearch(), searchStore.ftsResults contains notes/a.md. It fails today.
- [ ] A test with 60 notes containing the word where the only note under path:projects (or with the tag) ranks below 50 for the bare word returns that note for `meeting path:projects`. Put it in src-tauri/tests/search_fts_test.rs if Rust applies the filter, or in search.service.test.ts if the frontend widens the candidate list.
- [ ] The final list is still capped (50 or the current cap) after filtering, and BM25 order is kept.
- [ ] Operator-only queries and plain text queries behave as today (existing tests at search.service.test.ts:294-442 stay green).
- [ ] Gate for the sides touched: pnpm check and pnpm vitest run; plus cargo test --manifest-path src-tauri/Cargo.toml if Rust changes.

### Merged from Issue 24 (2026-11-06)

A text search shows only its own results: a query with no hits says No results found, even right after a tag click. Same branch of search.service.ts (`performSearch`, the words-plus-operators path) as this Issue; read Issue 24 for its evidence.

- [ ] Failing test first, in src/tests/lib/features/search/search.service.test.ts: with the real searchStore in text mode, query 'tag:work' and get_all_vault_entries_v2 returning a note tagged work, await performSearch() (searchStore.results has 1 entry); then setQuery('zzzz') with search_fts resolving [], await performSearch(); searchStore.results and searchStore.ftsResults are both empty. It fails today.
- [ ] The same holds for 'tag:work zzzz' when the operator filter leaves no FTS row.
- [ ] src/tests/lib/features/search/SearchPanel.test.ts: after that sequence the panel shows 'No results found' and no result count.
- [ ] The FTS-failure fallback and the operator-only branch still clear ftsResults (existing test at search.service.test.ts:147 stays green).

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. The operators filter only the top 50 FTS hits and miss nested tags. It is in the same service as N-index-02, so it comes right after it.
- **Trigger:** Text mode, a query that mixes words and an operator as help 06 documents, e.g. `meeting tag:work` or `meeting path:projects`, in a vault where the word appears in more than 50 notes. Or click the parent tag `work` (which lists `work/meetings` notes) and then add a word.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/search/search.service.ts:184-186 strips operators, ftsQuery = query.text -> :199-203 call('search_fts', { query: ftsQuery, maxResults: 50 }) -> src-tauri/src/commands/search_index.rs:163 limit = max_results.unwrap_or(50); :186 search_match(conn, &fts_query, limit) -> src-tauri/src/db/fts_repo.rs:84-89 ORDER BY score LIMIT ?2 -> search.service.ts:206-223 tag/path filter over those rows; :215 exact tagSet.has -> src/lib/features/search/search.logic.ts:149-155 matchesIndexTag prefix-matches nested tags (used by the operator-only branch at search.service.ts:194 via performOperatorOnlySearch, search.logic.ts:179); search.logic.ts:102-111 matchesTagFilter prefix-matches in the fallback. help/documentation/06-search-and-navigation.md:135-142 documents `meeting tag:work path:projects` and the tag-click equivalence.
- **Second opinion:** upheld (ux, medium). Confirmed. search.service.ts:199-203 sends only the words with maxResults 50, and fts_repo.rs:84-89 applies ORDER BY score LIMIT before the JS tag/path filter. :215 uses an exact tagSet.has, while matchesIndexTag (search.logic.ts:149-155) prefix-matches nested tags. loadVaultTagMap (:43-50) stores the raw entry tags with no parent expansion, so `tag:work` plus a word misses notes tagged `work/meetings`. Search results are incomplete, nothing is written. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-03` (from index-rust-1, index-ux-5, index-spec-3). Size M.

## Comments

- 2026-11-06: Issue 24 merged in by the owner after the challenge review; its criteria are above.
