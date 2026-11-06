# 24: A text search shows only its own results: a query with no hits says No results found, even right after a tag click

**What to build:** The operator-only branch of performSearch writes the legacy list with searchStore.setResults(results) and clears ftsResults (src/lib/features/search/search.service.ts:189-197), but the FTS branches (:206-227) only call setFtsResults and never clear results; the only setResults([]) is for an empty query (:134). SearchPanel.svelte renders ftsResults when non-empty and otherwise falls back to searchStore.results (:126-135), and hasResults / resultCount count either (:55-69). So a text query whose FTS answer is empty shows the previous tag:work list with its count, as if it answered the new query. Fix direction: every branch that sets one text-mode list clears the other, as the operator-only and fallback branches already do in the other direction.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/search/search.service.test.ts: with the real searchStore in text mode, query 'tag:work' and get_all_vault_entries_v2 returning a note tagged work, await performSearch() (searchStore.results has 1 entry); then setQuery('zzzz') with search_fts resolving [], await performSearch(); searchStore.results and searchStore.ftsResults are both empty. It fails today.
- [ ] The same holds for 'tag:work zzzz' when the operator filter leaves no FTS row.
- [ ] src/tests/lib/features/search/SearchPanel.test.ts: after that sequence the panel shows 'No results found' and no result count.
- [ ] The FTS-failure fallback and the operator-only branch still clear ftsResults (existing test at search.service.test.ts:147 stays green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. After a tag click, the Search panel keeps showing the tag's list.
- **Trigger:** Click a tag in the Tags view (query becomes tag:work, listing its notes), then add a word (tag:work roadmap) or replace the query with a word that has no FTS hit. Zero hits after an operator filter is common because the filter only sees the top 50 hits.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/search/search.service.ts:189-197 operator-only: setResults(results) + setFtsResults([]) -> :199-227 FTS branch: setFtsResults(filtered) at :223 or setFtsResults(results) at :226, results untouched -> :130-135 only the empty query clears results -> src/lib/features/search/SearchPanel.svelte:55-61 hasResults = ftsResults.length > 0 || results.length > 0 in text mode; :63-69 resultCount falls back to results.length; :126-135 renders results when ftsResults is empty. Entry point: src/lib/features/tags/TagsView.svelte:17-18 openSearch(`tag:${tag}`).
- **Second opinion:** upheld (ux, medium). Confirmed. The only setResults calls are at search.service.ts:134 (empty query), :196 (operator-only) and :238 (fallback). The FTS branches at :223 and :226 set only ftsResults, and SearchPanel's hasResults/resultCount and its render fall back to searchStore.results when ftsResults is empty. A tag click followed by a query with no hits keeps showing the tag list and its count. That is a wrong list on screen, not data loss. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-02` (from index-ux-4, index-spec-2). Size S.

## Comments
