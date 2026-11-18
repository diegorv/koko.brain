# 05 discovery: keep results while searching, "N+" at the cap, clear mid-search

No `spec.md` exists for finders-ux; the Issue is the input. Same panel as 04 (`work/04`): this builds on its single `role="status"` node and `showError`.

## Files that change

- `src/lib/features/search/search.service.ts:129-135` empty-query branch: add `setSearching(false)` and `setResultsCapped(false)`. Caps `:152` (hybrid 20), `:201` (FTS 50), `:251` (semantic 20) become named constants; a local `capped` is set at each result write (operator-only, FTS raw length before the operator filter, in-memory fallback, semantic `||`), written once at the end of the `try`; the Rust hybrid branch sets it before its `return`; the outer catch clears it.
- `src/lib/features/search/search.logic.ts:168`, `:201`: defaults `= 100` become `OPERATOR_ONLY_MAX_RESULTS` / `FALLBACK_MAX_RESULTS`. All five cap constants live here (pure, exported; the service imports them). The semantic one carries the `minScore` under-report comment.
- `src/lib/features/search/search.store.svelte.ts`: `resultsCapped` state, getter, `setResultsCapped`, cleared in `reset()`.
- `src/lib/features/search/SearchPanel.svelte:115` `showResults` drops `!isSearching`; `:121` "Searching..." only when `!hasResults`; `:123` count adds `+` when `resultsCapped`. Panel-local `searchSlow` set by a 300 ms `setTimeout` in an `$effect` on `isSearching` (cleanup clears the timer and the flag). List `div` gets `aria-busy="true"` + `opacity-50` while slow; `LoaderCircle` spinner `aria-hidden="true"` in the header snippet, `right-7` in Text mode (left of `~`), `right-2` otherwise.
- `help/documentation/06-search-and-navigation.md:135-145` one sentence.
- Tests: `search.service.test.ts` (057 deferred test, newer search owns `isSearching`, lists kept in flight, capped flag per path incl. operator-filtered FTS and hybrid legacy, empty query clears), `search.store.test.ts` (getter), `SearchPanel.test.ts` (kept rows, fake-timer dim/spinner, empty list "Searching...", mode switch, 50+/49, 20+, 100+ through the real service with the mocked `invoke`), `search.logic.test.ts` if it pins the `100` default.

## Plan (test-first, one commit each)

1. Service: clear `isSearching` on empty query + in-flight tests.
2. Store `resultsCapped` + service caps/constants + tests.
3. Panel: keep results, 300 ms dim + spinner, "N+" + tests.
4. Help doc.

## Prior-art tests

- `search.service.test.ts:305` deferred promise via `mockImplementationOnce`; `SearchPanel.test.ts:326` Retry drives the real service through the mocked `invoke`.

## Risks

- `resultsCapped` is one flag for the last search, not per mode: right after a mode switch the kept older list shows the previous search's "+" until the new search lands. Accepted (the list is stale anyway and dimmed after 300 ms).
- The timer runs from the moment `isSearching` turns true; chained keystroke searches keep it true (older `finally` does not clear it), so dimming tracks continuous searching, as intended.

## Defaults taken

- Dim is `opacity-50` with `transition-opacity`; spinner is `LoaderCircle size-3.5 animate-spin` like `RailListSearch.svelte:97-104`.
- Input padding stays `pr-8` (the Issue shifts only the spinner); a long query can run under the Text-mode spinner while it shows.
