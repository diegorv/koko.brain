# Issue 16 discovery

Line numbers in the Issue predate 05's merge; current ones below (at c190203d8).

## Files that change

- `src/lib/features/search/search.logic.ts:12-13` `FTS_MAX_RESULTS` doc (cap now applies after the operator filter); add `FTS_OPERATOR_CANDIDATE_LIMIT = 100_000` next to it.
- `src/lib/features/search/search.service.ts`
  - `:53-60` `loadVaultTagMap` returns `Map<path, string[]>` (raw entry tags) so the filter can use `matchesIndexTag`.
  - `:166-200` Rust hybrid path: also `setResults([])` and `setResultsCapped('text', false)` (it already clears `ftsResults`).
  - `:226-258` words-plus-operators branch: ask `search_fts` for `FTS_OPERATOR_CANDIDATE_LIMIT` wrapped in `timeAsync`, filter tags with `matchesIndexTag` over entry tags and paths with `matchesPathFilter`, slice to `FTS_MAX_RESULTS` (BM25 order kept). `textCapped = filtered.length > FTS_MAX_RESULTS || candidates.length >= FTS_OPERATOR_CANDIDATE_LIMIT`. Plain text keeps the capped call and 05's rule. Both FTS sub-branches `setResults([])`.
- `help/documentation/06-search-and-navigation.md` Search Operators section: `tag:` also matches nested tags, in operator-only and combined queries.

## Tests

- `src/tests/lib/features/search/search.service.test.ts`: `mockSearchIPCs` honours `maxResults` (slices). Debug mock gains `timeAsync: (_t, _l, fn) => fn()`. New: nested tag + word; 60 rows with the only `path:`/`tag:` match ranked 55; filtered list capped at 50 in BM25 order; 51 filtered -> capped, 50 -> not; stale `results` after tag click then `zzzz` and `tag:work zzzz`; operator-only -> capped FTS -> Rust hybrid clears `results` and the text flag. Changed on purpose: `maxResults: 50` for `tag:javascript fix` and `path:daily/ test` become the constant; 05's "keeps the flag for FTS rows cut by operators after a full page" becomes the new rule (50 rows, 1 match -> no "+").
- `src/tests/lib/features/search/SearchPanel.test.ts` result cap block: same sequence through the panel shows "No results found" and no count. Prior art: the existing "a mode switch shows the target mode's own cap" test there.

## Risks

- A 100k-row IPC payload on a vault where the bare words match most notes: accepted by triage; `timeAsync` logs it.
- `loadVaultTagMap` still fires only on a successful `search_fts` with `tag:` (indexing-watcher rule 12 holds). `path:` with words loads no entries.

## Defaults taken

- Constant lives in `search.logic.ts` with the other caps.
- `timeAsync` wraps only the operator-candidate `search_fts` call; plain text stays untimed as today.
- No SearchPanel.svelte change: once the service clears `results`, its fallback to `results` shows nothing stale.
