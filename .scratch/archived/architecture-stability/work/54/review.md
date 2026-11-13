VERDICT: APPROVED

## Acceptance criteria

- [met] A failing test first: a `refreshViewDefinition(A)` whose read is held, an eviction of `A`, then the read resolving leaves no cache entry for `A` — `view-parse-cache.test.ts` "does not re-insert the evicted path when the held read resolves" holds the read with `mockReturnValueOnce(new Promise(...))`, calls `clearViewParseCacheUnder('/v/A.view')`, resolves the read and asserts `getViewContentHash` is undefined. I ran the test file against `main`'s `view-parse-cache.ts` and then restored HEAD's copy (worktree clean afterwards): 3 failed / 18 passed. The 3 failures were this test, the `clearViewParseCache` / `clearAllViewParseCache` variant, and the A -> B -> A test. With the fix the file passes 21/21.
- [met] A read that starts after the eviction still caches normally — "caches normally for a read that starts after the eviction" asserts a hash is set, and that the next `getCachedViewDefinition` returns the fresh definition without calling `readTextFile`. The epoch is read when the call starts (`view-parse-cache.ts:29`), so a later call sees the bumped value.
- [met] The rename A -> B -> A sequence serves the current definition of `A` — "serves the current definition of A after renaming A -> B -> A": a stale read of A is held, A is evicted, B is refreshed with `new`, B is evicted, and the stale read then resolves with `old`. `getCachedViewDefinition(A)` returns `new`. This test fails on `main`, where it returns the cached `old`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- Targeted vitest, exit 0, 12 files, 406/406 passed: `src/tests/lib/features/type-definitions/` (all 7 files, including `view-parse-cache.test.ts`), `rail-shell/view-lens.service.test.ts`, `rail-shell/view-lens-seed.logic.test.ts`, `rail-shell/RailNoteList.view.test.ts`, `app/boot.test.ts`, `app/lifecycle/app-lifecycle.service.test.ts`. These cover the changed module and every caller of its API (`boot.ts:36`, `app-lifecycle.service.ts:621`, `type-definitions.service.ts:308`, `view-lens.service.ts:22`, `RailNoteList.svelte:159-160`).
- Red check: the 3 new race tests fail without the source change (see the first criterion).
- The full suite and `pnpm build` (the Issue's gate) belong to deliver and were not run here.
- Scope: the diff touches only `view-parse-cache.ts`, its test file and the Issue's `work/54/discovery.md`. No layer baseline or composition-root changes, nothing under `src-tauri/`.
- Traced the new `hash: undefined` outcome in `RailNoteList.svelte:160`. When a lookup's read is skipped, `getViewContentHash` returns `undefined`. `ViewSeedEvent.hash` is already typed `string | undefined` (`view-lens-seed.logic.ts:23`). The worst case is one extra reseed from content that was just read from disk, so it is not a correctness issue.

## Findings

1. minor — `src/lib/features/type-definitions/view-parse-cache.ts:28-37` — Outside this Issue's scope and present on `main` before this branch: the same out-of-order insert can happen without any eviction. The recount's `refreshViewDefinition(A)` reads the old bytes. `updateViewQuery` (`type-definitions.service.ts:303-309`) then writes A and refreshes the cache with the new hash. The recount's read resolves last, its hash differs from the cached one, and it overwrites the entry with the old definition. RailNoteList can then seed old filters again on its next switch to A, which is the symptom this Issue describes, reached by a different path. The epoch cannot catch this because no clear runs. Fix: file a follow-up Issue for a per-path sequence number taken before the read, where an insert is skipped when a newer read of the same path has already inserted. Do not bump the global epoch on every insert: `countViewNotes` runs its reads concurrently, so each insert would cancel the others.
2. nit — `src/tests/lib/features/type-definitions/view-parse-cache.test.ts:206-208` — The `beforeEach` sets `mockParseCollectionYaml.mockImplementation(...)`. The file-level `vi.clearAllMocks()` does not reset implementations, so this one leaks into the `clearAllViewParseCache` describe that runs afterwards. Those tests set their own `mockReturnValue` and still pass, but they now depend on test order. Fix: reset it in an `afterEach` (`mockParseCollectionYaml.mockReset()`), or set the implementation inside each test.
3. nit — no test drives the race through `path-change.service` or the components. The builder disclosed this. The Issue's criteria are at the cache level and the consumer is a one-line wiring (`boot.ts:36`), so this is acceptable.

## Resolution

1. Not fixed here: out of this Issue's scope (present on `main` before this branch, and no eviction is involved, so the epoch cannot catch it). Left for the main session to file as a follow-up Issue: a per-path read sequence number taken before the read, skipping an insert when a newer read of the same path already inserted; not a global epoch bump per insert, since `countViewNotes` runs its reads concurrently.
2. Fixed: an `afterEach` in the "a read in flight across an eviction" describe calls `mockParseCollectionYaml.mockReset()`, so its implementation no longer leaks into later describes.
3. No change: the reviewer judged it acceptable (cache-level criteria, one-line consumer wiring).
