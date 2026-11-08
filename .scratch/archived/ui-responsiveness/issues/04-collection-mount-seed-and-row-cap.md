# 04: Opening a collection table applies its filters before the first render and caps the rows drawn

**Status:** resolved

Priority: P2 (quick-win bundle; 1.3 s freeze per fresh mount of a table view without `limit`)

**What to build:** Opening `bug-triage.collection` froze the webview 1,292 ms. Svelte runs the template before a component's top-level `$effect`s, so the first `queryResult` (`src/lib/features/collection/CollectionView.svelte:162-176`) runs with empty filters and `CollectionTableView.svelte:43` (unkeyed, uncapped `{#each}`) builds a row for every one of the 10,628 notes, about 118 us per row. The seed effect (`:100-110`) and the unguarded reset effect (`:113-121`) apply the YAML only afterwards. Calendar views with `limit: 50` do not freeze.

1. **Synchronous seed** (quick win): move the seed body into a `seedFromDefinition()` called once in the script body. Arm the reset effect with a plain `let resetArmed` checked AFTER `void yamlContent`; checked before, the effect tracks nothing and external YAML edits stop re-seeding.
2. **Row cap with keyed rows:** render at most about 200 rows, with "Showing N of M" and "Show more", keyed by `record.path`. This is the only fix that covers legitimately large results: `.view` files go through the same `CollectionView` (`editor.service.ts:137`), and `createView()` (`type-definitions.service.ts:269-271`) writes a table view with no filter and no limit. It also bounds the view-tab switch (`:370`), which has the same post-render seed pattern.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/features/collection/CollectionView.svelte:73-74,93-121,162-176,370, src/lib/features/collection/CollectionTableView.svelte:43-48, src/lib/features/collection/collection.logic.ts:122-188, src/lib/core/editor/editor.service.ts:137, src/lib/features/type-definitions/type-definitions.service.ts:269-271

- [x] Failing first: jsdom suite with the real `collectionStore.setPropertyIndex`, about 200 records, 3 matching the YAML filter. A `MutationObserver` attached before `mount`, then `flushSync()` + `takeRecords()`: 0 removed `TR` nodes (today about 197) and 3 `tbody tr`
- [x] Failing first: a table with more rows than the cap renders the cap, shows "Showing N of M", and "Show more" adds rows
- [x] The 3 `selfUpdate` latch tests and `CollectionView.test.ts:119` (external YAML re-seed) stay green
- [ ] Not verified by the agent: on device, opening `bug-triage.collection` from a Markdown tab logs no `[HB] stall` over 400 ms

## Notes

- Needs an owner decision before `ready-for-agent`: the row cap is a visible UI change (cap size, "Show more" wording). The synchronous seed alone needs none.

- Do not add `timeSync` inside the `$derived.by`: `debug()` reads `$state` settings, which would become dependencies of `queryResult`. Time the mount from an `$effect` or under `untrack`.
- `{#key activeTab.path}` (fixes the `activeViewIndex` leak) changes behavior and is Issue 14.
- Research: `.scratch/ui-responsiveness/research/D-deep-dive.md`, `D-verify.md`.

## Comments

- 2026-11-02, branch `issue/04-collection-mount-seed-and-row-cap`: CollectionView seeds the filter result synchronously before first render (no ~197 TR remove churn) and CollectionTableView caps rows at 200 with "Showing N of M" and "Show more". Fix round after review 1: mount-once query test with a counted probe record; `{#key activeViewIndex}` resets the cap per table tab. Tests: pnpm check 0 errors; collection tests 786 passed; full suite at 3d6f1ef1 exit=0 (10139 passed, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED, round 2 APPROVED (nit: merge `{#key}` with Issue 14's later). Not verified: on-device `[HB] stall` check.
