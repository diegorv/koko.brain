# 54: An in-flight view parse can re-insert a stale entry after a rename or delete

**What to build:** Issue 21 (squash 87d79b92) moved the view-cache eviction to run right after `diskOp` (`src/lib/core/filesystem/path-change.service.ts:135-141`, `clearViewParseCacheUnder(from)`). Before, it ran after `await refreshTree()` and `rename_note`. A `.view` is not Markdown, so nothing else is awaited in between, and a read that was already in flight can now outlive the eviction:
1. `TypesNavigator.svelte:64-71`: the 1 s debounced `recountViews` calls `countViewNotes` (`view-lens.service.ts:20-22`), which calls `refreshViewDefinition` for every view, `A.view` included.
2. The user renames `A.view` to `B.view`. The rename resolves first and the consumer evicts `A`.
3. The earlier `readTextFile(A)` resolves, and `view-parse-cache.ts:25` re-inserts `A` with the old content.

Nothing shows until a `.view` exists at `A` again. Example: rename A to B, change filters (`updateViewQuery` refreshes only `B`), then rename B back to A. `RailNoteList.svelte:159` `getCachedViewDefinition(A)` serves the old definition: wrong filters, sort and columns, seeded with the old hash. A toolbar save (`persistViewState`) can then write those old filters back into the file.

Fix in `view-parse-cache.ts`: keep an epoch counter that every clear function increments. Read it before `await readTextFile`, and skip the `parseCache.set` if it changed. Skipping only costs a later re-read.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** post-delivery adversarial review of Issue 21 (87d79b92), 2026-11-01, finding 1 (low). It confirmed the race left open by the Issue 21 review (finding 3). From reading the code; not reproduced.

- [x] A failing test first: a `refreshViewDefinition(A)` whose read is held, an eviction of `A`, then the read resolving leaves no cache entry for `A`
- [x] A read that starts after the eviction still caches normally
- [x] The rename A -> B -> A sequence serves the current definition of `A`

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch `issue/54-view-parse-cache-stale-insert-after-rename`: `view-parse-cache.ts` skips the cache insert of a view read that outlived an eviction of its path; tests cover the held read plus eviction, a read started after eviction, and rename A -> B -> A. Fix round: afterEach `mockReset` of the parse mock (review 1 finding 2). Targeted: `pnpm check` 0 errors; `view-parse-cache.test.ts` 21/21. Full suite at bd52f9a5: vitest 407 files, 9630 passed, 1 skipped, 1 todo; `pnpm build` ok. Reviews: round 1 APPROVED, round 2 APPROVED. Follow-up for review 1 finding 1 (per-path read sequence number) is for the main session to file.
