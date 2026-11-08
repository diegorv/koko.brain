# 057: Clearing the search box while a search is still running shows the empty-query hint, not a stuck Searching...

**Origin:** `audit-2026-11-05` Issue 48, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** performSearch bumps searchVersion and, for an empty query, clears the lists and returns before its try block (src/lib/features/search/search.service.ts:127-136), so it never calls setSearching(false). The earlier in-flight call then returns on its version checks and its finally clears isSearching only when searchVersion === version (:271-274), which is now false. isSearching stays true, and SearchPanel.svelte:115-116 checks it before the empty-query hint at :117-118, so the panel shows 'Searching...' over an empty box until another non-empty search completes. Fix direction: the empty-query branch also clears isSearching.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/search/search.service.test.ts: with the real searchStore, setQuery('meeting') and a search_fts mock that returns a deferred promise; start performSearch() without awaiting, setQuery(''), await performSearch(), then resolve the deferred and await the first call; searchStore.isSearching is false. It fails today.
- [ ] A newer non-empty search still owns isSearching (an older call finishing does not clear it early; existing test at :285 stays green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. It needs the search box cleared while a search is still running.
- **Trigger:** Type a query, wait for the 200 ms debounce so the search starts, then clear the box before it returns. Most likely in Semantic or Hybrid mode, whose searches take seconds, or with fuzzy text search on a large vault.
- **Evidence (verified by reading code at `5f8003d67`):** src/routes/(app)/+layout.svelte:170-180 performSearch 200 ms after each query change, including an empty one -> src/lib/features/search/search.service.ts:128 ++searchVersion; :130-135 empty query returns without setSearching(false); :138 setSearching(true) only for non-empty -> :154/:193/:204 the older call returns on version mismatch; :271-274 finally clears only when searchVersion === version -> src/lib/features/search/SearchPanel.svelte:115-118 'Searching...' wins over 'Type to search across all files'.
- **Source:** audit 2026-11-05, domain `index`, finding `N-index-07` (from index-ux-3). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). performSearch bumps searchVersion (:128) and returns on an empty query before setSearching (:130-135). The older call's finally clears isSearching only when searchVersion === version (:271-274). SearchPanel.svelte:115-118 checks isSearching before the empty-query hint. +layout.svelte:170-180 runs performSearch for an empty query too. The trigger needs a slow search (semantic or hybrid), so likelihood is low. Corrections to apply while implementing: The second criterion says 'existing test at :285 stays green' as if that test pinned 'a newer non-empty search still owns isSearching'. search.service.test.ts:285 is only 'sets isSearching to false after completion', and no existing test covers an older call finishing while a newer one runs. Ask for a new test for that case.

## Comments
