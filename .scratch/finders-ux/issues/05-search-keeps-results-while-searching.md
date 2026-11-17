# 05: Search keeps previous results dimmed while searching, shows "N+" at the cap, and clearing mid-search does not stick on Searching...

**Origin:** design review 2026-11-17, proposal P30, search half (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-background-refresh.md` (tickets B and C) and `.scratch/finders-ux/research/breakdown.md` (03 and 04). Absorbs `.scratch/open-itens/issues/057-clearing-search-box-while-search-still-running.md`. The Tags half of P30 is 08.

**What to build:**

1. **Clearing mid-search (from 057).** `performSearch`'s empty-query branch (`search.service.ts:130-135`) also calls `searchStore.setSearching(false)`. Today it bumps `searchVersion` and returns before the `try`, and the older in-flight call's `finally` clears `isSearching` only when `searchVersion === version` (`:271-274`), so the panel shows "Searching..." over an empty box.
2. **Keep the previous results.** While `searchStore.isSearching` and the current mode's list is not empty, `SearchPanel.svelte` keeps the count and the list rendered (the store already keeps them, `search.service.ts:138` does not clear them). "Searching..." shows only when there is nothing to keep. After a mode switch the target mode's list may hold an older query's results: they stay on screen and dim like any other kept list.
3. **Dim and spinner after about 300 ms.** A panel-local timer: once a search has run for 300 ms, the list dims and gets `aria-busy="true"`, and a spinner appears in the header input row. The spinner is `aria-hidden="true"`: 04 owns the single `role="status"` region, which carries the Searching text. Both wait for the same 300 ms, so a fast FTS search shows neither (dimming at once would blink on every keystroke past the 200 ms debounce). In Text mode the spinner sits left of the fuzzy `~` toggle (the input is `pr-8` with `~` at `right-2`; shift it like `RailListSearch.svelte`'s `right-7`). No shared helper. The status text reuses the single persistent `role="status"` node from 04.
4. **"N+" at the cap.** Replace the inline caps with one named constant per path: text FTS 50 (`search.service.ts:201`), semantic 20 (`:251`), hybrid 20 (`:152`), operator-only 100 and the in-memory fallback 100 (`search.logic.ts:168` and `:201` defaults). The service records, per search, whether a request reached the cap it asked for, through a store field with a getter, setter and `reset()`. When it did, the count line reads "{N}+ results", where N is the count shown. For the hybrid legacy merge, the flag is set when either source reached its cap. For FTS results filtered by operators after the cap, N is the filtered count and the "+" still shows, since more matches may exist past the cap. Every capped path shows "N+". Semantic drops rows below `minScore` 0.3, so a semantic list can be cut without reaching 20 and then shows no "+"; that under-report is accepted and stated in a comment at the constant.
5. **Help.** One sentence in `help/documentation/06-search-and-navigation.md` "Search Results" says each mode returns at most its cap and that "N+" means more matches exist.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/search.spec.ts`.

- [ ] Failing test first (from 057), `search.service.test.ts`: with the real `searchStore`, `setQuery('meeting')` and a `search_fts` mock that returns a deferred promise; start `performSearch()` without awaiting, `setQuery('')`, await `performSearch()`, then resolve the deferred and await the first call; `searchStore.isSearching` is false.
- [ ] New test: a newer non-empty search still owns `isSearching` while an older call finishes (no existing test covers this; `:285` only checks completion).
- [ ] Failing test first, `SearchPanel.test.ts`: with `ftsResults` holding 2 rows and `setSearching(true)`, both rows and "2 results" stay rendered and "Searching..." is absent.
- [ ] With fake timers: before 300 ms there is no dim and no spinner; after 300 ms the list has `aria-busy="true"` and a spinner is in the header row; when `isSearching` turns false the dim and spinner disappear and the new results render.
- [ ] With `isSearching` true and an empty current-mode list, "Searching..." shows (the existing "shows the searching notice" test changes on purpose into this case).
- [ ] After a mode switch to a mode whose list holds older results, those results stay rendered while the new search runs and dim after 300 ms.
- [ ] `search.service.test.ts` pins that the previous lists stay in the store while a non-empty search is in flight.
- [ ] Failing test first: a text search whose `search_fts` mock returns exactly 50 rows shows "50+ results"; 49 rows show "49 results". Semantic returning 20 and the operator-only path returning 100 show "20+" and "100+"; an empty query clears the flag. The store getter has a test.
- [ ] No inline 50, 20 or 100 cap remains in `performSearch` or the logic helpers it calls.
- [ ] `e2e/specs/search.spec.ts` stays green; help page 06 states the cap.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P30 (search half).** Search keeps the previous results visible and dimmed, shows a spinner after about 300 ms, and says "50+ results" at the cap.
- **057 (absorbed).** Clearing the search box while a search is still running shows the empty-query hint, not a stuck "Searching...". Fix direction: the empty-query branch also clears `isSearching`.

## Problem

Search empties its list on each debounced keystroke, mode or fuzzy change and brings it back when the new search returns, so the panel blinks while typing. When the cap cuts the list the count reads "50 results" as if that were all. Clearing the box while a slow search runs leaves "Searching..." over an empty box until another search completes.

## Evidence

Checked at `bb57e6165`.

- `src/routes/(app)/+layout.svelte:170-180`: `performSearch` 200 ms after each query change, including an empty one.
- `src/lib/features/search/search.service.ts:128` `++searchVersion`; `:130-135` empty query clears the lists and returns without `setSearching(false)`; `:138` `setSearching(true)` without clearing the lists; `:152` hybrid `maxResults: 20`; `:201` FTS `maxResults: 50`; `:251-252` semantic `maxResults: 20, minScore: 0.3`; `:271-274` `finally` clears `isSearching` only when the version matches.
- `src/lib/features/search/search.logic.ts:168` and `:201`: operator-only and in-memory fallback default `maxResults = 100`.
- `src/lib/features/search/SearchPanel.svelte:115-116`: `{#if searchStore.isSearching}` renders only "Searching...", ahead of the empty hint at `:117-118`; `:122-124` count line; `:161-168` input `pr-8` and the `~` toggle at `right-2`.
- Precedents (`TasksView.svelte:907-914`, `RailListSearch.svelte:97-99`) show their spinner at once; the 300 ms delay is new behaviour, hence the fake-timer test.
- `e2e/specs/search.spec.ts:31-37` uses one `fill()` on a fresh panel, so no stale rows exist when it expects "No results found".

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: after a mode switch the older results stay, dimmed after about 300 ms; the spinner uses the same 300 ms; "N+" on every capped path, noting that semantic `minScore` can under-report.
