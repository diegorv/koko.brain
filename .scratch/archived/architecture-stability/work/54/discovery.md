# Issue 54 discovery

## Files that change

- `src/lib/features/type-definitions/view-parse-cache.ts:20-28` (`refreshViewDefinition`) and `:47-65` (the three clear functions).
- `src/tests/lib/features/type-definitions/view-parse-cache.test.ts`: new `describe` for the in-flight read race.

## Plan

1. Module-level `let cacheEpoch = 0`; `clearViewParseCache`, `clearViewParseCacheUnder` and `clearAllViewParseCache` each increment it.
2. `refreshViewDefinition` captures the epoch before `await readTextFile(path)`. After the read, if the epoch moved, return the freshly parsed result to the caller but do not `parseCache.set` (and do not consult the hash short-circuit, which would hand back an entry the read predates). Otherwise unchanged.
3. Tests (test-first, fail before step 1-2):
   - held read of A, `clearViewParseCacheUnder(A)`, read resolves -> `getViewContentHash(A)` undefined.
   - a read started after the eviction caches normally.
   - A -> B -> A: held read of A (old content), evict A, refresh B (new content), evict B, held read resolves; `getCachedViewDefinition(A)` re-reads disk and returns the new definition.

Prior art: the existing tests in the same file (mocked `readTextFile`, `parseCollectionYaml`). Hold a read with a manually resolved promise via `mockReturnValueOnce(new Promise(...))`.

## Risks / defaults

- The epoch is global, not per path: any clear during a read skips that read's insert, including an unrelated path. The Issue accepts this ("Skipping only costs a later re-read"); clears happen only on path changes and vault teardown, so it is rare.
- `getCachedViewDefinition` falls through to `refreshViewDefinition`, so it inherits the guard; no change needed there.
- No caller change: `boot.ts:36` and `app-lifecycle.service.ts:621` keep calling the same clear functions.
