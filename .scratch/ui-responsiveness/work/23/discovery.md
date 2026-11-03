# Issue 23 discovery: a tag-only search filters on the index tags

No `spec.md` for this feature.

## Files that change

- `src/lib/features/search/search.logic.ts`: new pure `performOperatorOnlySearch(entries, query, vaultPath, maxResults = 100)` and `matchesIndexTag(tags, tag)` next to `matchesTagFilter` (`:101`) / `performSearchOverFiles` (`:151`).
- `src/lib/features/search/search.service.ts`: operator-only branch (`:190-198`) calls `get_all_vault_entries_v2` and the new function, no `read_files_batch`. Comment on `loadVaultContentMap` (`:13-24`) rewritten: it now serves only the `FTS failed` fallback.
- Tests: `src/tests/lib/features/search/search.logic.test.ts`, `src/tests/lib/features/search/search.service.test.ts` (`'uses in-memory search for operator-only queries'` at `:323` changes to entries tags).

## Plan

1. `matchesIndexTag(tags, tag)`: lower-case, strip a leading `#` from the query tag (as `matchesTagFilter` does), match `t === tag || t.startsWith(tag + '/')`.
2. `performOperatorOnlySearch`: iterate entries in order; path filter via `relativePath(vaultPath, path)` + `matchesPathFilter` (same as `performSearchOverFiles`); every query tag must match; result `{ filePath, fileName, matches: [], snippets: [] }`; stop at `maxResults`; sort by fileName (all match counts are 0, so this equals today's sort).
3. Service branch: `const entries = await call('get_all_vault_entries_v2')`, version check, `performOperatorOnlySearch(entries, query, vaultPath)`. An IPC error still falls into the `FTS failed` catch, unchanged.

FTS-with-operators branch (`:207-224`) and its exact `tagSet.has` match are untouched; the two branches do not share a matcher.

## Tests (failing first)

- Service: operator-only `tag:` query makes no `read_files_batch` call, returns notes whose `entry.tags` carry the tag, including a nested `review/weekly`; a note whose content has `#security-team` (entry tags `['security-team']`) is not returned for `tag:security`; `path:` operator-only filters by path without content read; text + operators still calls `search_fts` (existing test); FTS failure fallback still reads content (existing tests).
- Logic: `matchesIndexTag` exact / nested / case / `#` prefix / non-prefix sibling (`security-team`), empty tags; `performOperatorOnlySearch` path + tag AND, cap, empty entries.
- Prior art: `mockSearchIPCs` + `entryV2` fixture in `search.service.test.ts`.

## Risks / defaults

- Default: keep the 100 cap and iteration order (owner: cap out of scope).
- `entry.tags` carry no `#` (`loadVaultTagMap` compares them to bare query tags).
