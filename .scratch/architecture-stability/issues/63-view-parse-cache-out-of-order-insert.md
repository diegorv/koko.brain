# 63: An older view read that resolves last overwrites the cache entry a newer read stored

**What to build:** Issue 54 (squash fd83dc30) skips a view-cache insert when the path was evicted while the read ran, using an epoch counter in `src/lib/features/type-definitions/view-parse-cache.ts`. The same stale insert also happens without any eviction, so the epoch cannot catch it:
1. The 1 s debounced recount (`TypesNavigator.svelte`, through `countViewNotes` in `view-lens.service.ts`) calls `refreshViewDefinition(A)`, which starts reading A's old bytes.
2. `updateViewQuery` (`type-definitions.service.ts:303-309`) writes A and refreshes the cache with the new content and hash.
3. The recount's read resolves last; its hash differs from the cached one, so it overwrites the entry with the old definition.

`RailNoteList` then seeds the old filters on its next switch to A, the symptom Issue 54 describes, reached by another path.

Fix: a per-path read sequence number taken before `await readTextFile`; skip the insert when a newer read of the same path has already inserted. Do not bump the global epoch on every insert: `countViewNotes` runs its reads concurrently, so each insert would cancel the others.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/type-definitions/view-parse-cache.ts,src/tests/lib/features/type-definitions/view-parse-cache.test.ts

**Source:** review of Issue 54 (`work/54/review.md`, finding 1, minor), 2026-11-01. Present on main before Issue 54; from reading the code, not reproduced.

- [x] A failing test first: a read of A held, a newer read of A that resolves and caches, then the held read resolving leaves the newer entry in the cache
- [x] Concurrent reads of different paths (the `countViewNotes` fan-out) all still cache
- [x] The Issue 54 cases (a read held across an eviction, a read after the eviction, rename A -> B -> A) still pass

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch issue/63-view-parse-cache-out-of-order-insert: view-parse-cache skips an insert from a read older than the last one stored for the path; regression test added. Full suite: 410 files, 9718 passed, 1 skipped, 1 todo; build ok. Review round 1: APPROVED (no findings).
