VERDICT: APPROVED

## Acceptance criteria

- [met] A failing named sequence reproduces it first (calendar rename X to Y, settle, an outside create at X, one bump) — `event-calendar.model.test.ts:898-908` ("an outside create on the path a calendar rename left (Issue 60)") runs a calendar title edit Standup to Planning, `settle`, `outsideCreate` at Standup, one `refresh`, `check`. Probe: I put main's three event-calendar source files back into the worktree, ran `pnpm vitest run src/tests/lib/features/event-calendar/event-calendar.model.test.ts -t "Issue 60"`, and got exit=1. The named sequence failed with "the store shows the vault after op #4" (store showed 1 event, vault 2). Then I restored the files with `git checkout HEAD`, leaving the tree clean.
- [met] After the fix the note created at X shows after one bump — the same named sequence passes on the branch, and its `check` runs after the single `refresh`. Store tests `event-calendar.store.test.ts:383-406` (empty `states` and another-state cases) show `eventByPath(from)` with `pending: false` at the first `setSnapshot` after the rename. `prunePending` (`event-calendar-event.logic.ts:484`) drops a settled `delete` whose `states` do not match the snapshot event at its path.
- [met] Seed 252 passes with one end bump — `event-calendar.model.test.ts:1000-1004` runs `runModel('seed 252', ..., 1)`. On main's source it fails with "no pending write outlives the drain and 1 bump(s) ... /vault/Retro.md delete settledAtVersion 7". On the branch it passes.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar`: exit 0, 29 files, 1109 tests passed. This covers every test file the diff changes (`event-calendar-event.logic.test.ts`, `event-calendar.store.test.ts`, `event-calendar.model.test.ts`, which includes the random seed chunks) and the tests of the changed sources (logic, store, types). My test verdict rests on these three files plus the rest of that folder.
- Red-first probe against main's source, described under criterion 1.
- The full suite and `pnpm build` (the Issue's Gate) were not run. Deliver runs them.
- Scope: the diff touches only `src/lib/features/event-calendar/`, `src/tests/lib/features/event-calendar/` and `work/60/`. There are no layer-baseline or composition-root changes.

## Findings

1. minor — `src/lib/features/event-calendar/event-calendar.store.svelte.ts:214-220`. The tombstone records only the snapshot state and the latest overlay state. A stale index row in a third state can now unhide the renamed-away event at `from` for one bump. The old clock rule hid it for two. Example: an earlier settled write whose state the snapshot never showed, and that the latest pending write replaced. The same goes for an empty `states` when `from` showed no event but the index already had one there. I confirmed it with a throwaway store probe (deleted afterwards): snapshot `a@600` at v1, a settled update to 800, `remapPath(a, renamed, 1)`, then `setSnapshot([a@700], 2)`. The tombstone is pruned and `eventByPath(a)` shows `start: 700, pending: false`, a ghost of a file that no longer exists. The glitch is transient and visible. A write on the ghost fails safely, because `event-calendar.service.ts:976` reads the file first, so the file is not recreated. `discovery.md` records this as an accepted risk. The model fixture never serves an old row after a rename, so no test covers this tradeoff. Fix: none needed for this Issue. Optionally add a store test that pins the current one-bump ghost behavior, so a later change to the rule is a deliberate choice.
2. nit — `src/tests/lib/features/event-calendar/event-calendar.model.test.ts:997-999`. The comment says seed 252 "hits this case only under the current `randomStep`". That is true today, but it goes stale as soon as the generator changes. The named sequence is already the lasting guard, so the comment could just say the seed is tied to the generator. Fix: optional rewording.

## Resolution

1. Accepted, no source change (the reviewer and discovery.md agree the one-bump ghost is an accepted, recoverable tradeoff). Added the optional pinning store test "shows a stale old-path row in a third state at once, since the tombstone does not record it" in `src/tests/lib/features/event-calendar/event-calendar.store.test.ts`, so a later change to the rule is deliberate.
2. Fixed: the seed 252 comment in `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` now says the seed depends on `randomStep` and the named sequence is the lasting guard. The seed 40 comment above it (Issue 58) is left as it is.
