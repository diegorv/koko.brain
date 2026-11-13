# Issue 17 discovery

No `spec.md` for architecture-stability. ADR 0003 (layers) applies to the ratchet: it reads source text only.

## Files that change

- `src/lib/features/rail-shell/view-lens-seed.logic.ts` (new): `ViewSeedState` (`seededPath`, `seededHash`,
  `selfUpdatePath`), `INITIAL_VIEW_SEED`, `stepViewSeed(prev, event) -> { next, reseed }`. Events: `loaded`
  (path, hash), `load-failed`, `no-view`, `save-started` (path), `save-failed`. Same `{ next, flag }` shape as
  `stepTypesPickCheck` in `lens.logic.ts:446`.
- `src/lib/features/rail-shell/RailNoteList.svelte:118-122,136-213`: the three latch/seed variables become one
  `$state.raw<ViewSeedState>`; the effect (139-140), `loadView` (158-175, 188) and `persistViewState`
  (201, 205-206) call `stepViewSeed`. `viewToolbarReady` (126) reads `viewSeed.seededPath`.
- `src/tests/lib/features/rail-shell/view-lens-seed.logic.test.ts` (new): table-first (`it.each`) plus the
  sequence cases the Issue names.
- `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`: append two cases (309, 546 switch-back),
  existing cases untouched.
- `src/tests/lib/raw-write-ratchet.test.ts` (new): scans `src/lib` + `src/routes` for `writeTextFile(`
  outside `src/lib/core/filesystem/`, allowlist keyed by file with one reason per site; fails on an
  unlisted site and on a stale entry. `features/properties/frontmatter-write.service.ts` exempt by rule.

## Plan

1. Logic + table tests (red, then green). Commit.
2. Wire RailNoteList to it; existing view tests pass unedited. Commit.
3. Port 309 and the 546 switch-back to the real-disk harness of `RailNoteList.view.test.ts`. Commit.
4. Ratchet test. Commit.

## Prior art

`stepTypesPickCheck` tests (`lens.logic.test.ts:465`); `rail-shell.boundary.test.ts` for the source scan.

## Risks / defaults

- Behaviour-equivalence: today a rejected read clears only `seededViewPath`, a parse failure clears path and
  hash. Both become one `load-failed` that clears path and hash: the hash is only compared when
  `seededPath === path`, so a null path makes the hash irrelevant. The latch is kept on both, as today.
- Baseline count: dad4c4c6 had 21 sites including the exempt one; main has 20 (bookmarks.service.ts's write
  is gone). The allowlist matches main: 19 listed + 1 exempt.
- Allowlist keyed by file + count, not line numbers, so unrelated edits do not churn it.
- The 546 port parks `writeTextFile` (the real `updateViewQuery` runs) instead of mocking `updateViewQuery`.
