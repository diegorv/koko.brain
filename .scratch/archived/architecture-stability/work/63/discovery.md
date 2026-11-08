# Issue 63 discovery

Repeats the Issue 54 pattern (`work/54/`): same module, same held-read test helper. What differs is listed below.

## Files that change

- `src/lib/features/type-definitions/view-parse-cache.ts:27-38` (`refreshViewDefinition`) and the three clear functions (`:56-78`).
- `src/tests/lib/features/type-definitions/view-parse-cache.test.ts`: hoist `holdNextRead` (`:199-203`) to file scope; new `describe` for out-of-order reads of one path.

## Plan

1. Module-level `let readSeq = 0` and `const insertedSeq = new Map<string, number>()` (the sequence number of the read that last inserted each path).
2. `refreshViewDefinition` takes `const seq = ++readSeq` before `await readTextFile(path)`. After the read (and after the existing epoch check), when `insertedSeq.get(path) > seq`, return the read's own parse without touching the cache, like the epoch branch. On insert, and on a hash hit (the read confirmed the entry), `insertedSeq.set(path, seq)`.
3. Clear functions delete the matching `insertedSeq` keys with the cache keys, so the map stays bounded by the cache. A read held across a clear is still caught by the epoch.
4. Tests, written first and seen failing:
   - held read of A (`old`), newer read of A resolves `new` and caches, held read resolves: `getCachedViewDefinition(A)` serves `new` without a disk read.
   - concurrent held reads of A, B, C resolved in reverse order all cache.
   - the existing Issue 54 tests stay unchanged and green.

## Risks / defaults

- The counter is global but compared per path, so concurrent reads of different paths (the `countViewNotes` fan-out) never block each other. The global epoch is not bumped on insert, as the Issue requires.
- A skipped stale read returns its own (older) parse to its caller, matching the epoch branch's "still returns what it read to its own caller". Default taken: not returning the newer cached entry, to keep both skip branches the same.
- The hash hit records its sequence too: otherwise bytes going Y -> X -> Y, with the X read resolving last, would overwrite a confirmed Y entry.
