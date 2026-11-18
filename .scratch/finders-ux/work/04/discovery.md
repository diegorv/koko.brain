# 04 discovery: search panel states, hints, labels

No `spec.md` exists for finders-ux; the Issue is the input. Same feature folder as 03 (`work/03`), different code (panel, not result cards).

## Files that change

- `src/lib/features/search/search.logic.ts` (after `parseSearchQuery`, :26): `SEMANTIC_MIN_QUERY_CHARS = 3`, `isBelowSemanticMinimum(raw)` = code points of `(parseSearchQuery(raw).text.trim() || raw).trim()` < 3 (Rust trims again, `semantic.rs:804`, `:991`).
- `src/lib/features/search/search.store.svelte.ts`: `searchError: string | null`, getter, `setSearchError`, cleared in `reset()` (:72).
- `src/lib/features/search/search.service.ts:127-276` (`performSearch`): clear `searchError` at the start (empty and non-empty query); `:257-261` in Semantic mode `error()` + set error (hybrid fallthrough stays `debug()`, silent); `:269-270` outer catch: if the version is current, clear the four result arrays and set the error.
- `src/lib/features/search/SearchPanel.svelte`: remove `:98-111` and `Loader2` (`:4`); mode group `role="group" aria-label="Search mode"`, `aria-pressed`, `aria-disabled` instead of `disabled` (`:84-96`); inline note with reason + "Open Settings > Search" (`settingsPanelStore.open('search')`); `$effect` switching mode to Text when a semantic mode becomes unavailable; one persistent `<p role="status">`; `role="alert"` error with `Button` Retry -> `performSearch`; Text-mode operator hint; input `aria-label`, `~` `aria-label` + `aria-pressed`.
- `help/documentation/06-search-and-navigation.md:87-146`.
- Tests: `search.logic.test.ts`, `search.store.test.ts`, `search.service.test.ts:244-252` (+ error cases), `SearchPanel.test.ts:173-178` (setting on + aria-disabled), new `SearchStatus.test.ts`.

## Plan (test-first per step, one commit each)

1. Logic helper + tests.
2. Store `searchError` + tests.
3. Service error state + tests (semantic rejection, outer catch, cleared by new/empty query, FTS fallback and hybrid fallthrough silent).
4. Panel: remove index block (220) + SearchStatus.test.ts.
5. Panel: labels, status node, short query, operator hint.
6. Panel: error + Retry.
7. Panel: disabled modes, note, auto-switch.
8. Help doc.

## Prior-art tests to copy

- `SearchPanel.test.ts` `mountPanel` with real `searchStore` / `settingsStore`; `search.service.test.ts` `mockInvoke.mockImplementation` per command (hybrid fallthrough test at :289) and `mockError`.
- `SearchStatus.test.ts`: same jsdom mount pattern, real stores.

## Risks

- The panel now imports `search.service` (for Retry) and `settingsPanelStore`; panel tests already mock `@tauri-apps/api/core`.
- Outer-catch clearing results: the Issue says "results stay empty" and "no partial results"; clearing all four arrays covers a hybrid legacy path that wrote FTS results before throwing.

## Defaults taken

- Status precedence: empty query (no status text) > short query (Semantic/Hybrid) > Searching > error (alert, no status text) > No results / N results. Short query goes before Searching so a 2-char query does not flicker "Searching...".
- The status `p` keeps the existing classes per state (`text-meta ... mb-1` for the count, centered `text-xs ... py-4` otherwise) and has no padding when empty.
- Tooltip is the native `title` (as the `~` toggle).
- The note shows on activating an unavailable mode or after the auto-switch; it hides when the mode becomes available or Text is activated.
- `searchError` holds `String(err)`; the panel shows only "Search failed".
