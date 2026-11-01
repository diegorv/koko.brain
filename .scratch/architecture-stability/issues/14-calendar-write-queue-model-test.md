# 14: Model test for the Calendar write queue, overlay and tombstones

**What to build:** Extract the in-memory vault harness that already exists inline in `event-calendar.service.test.ts:881-1000` (as of 408896d4) (the `disk` Map, `refresh()` as the index bump, `refreshWith()`, `holdNextWrite()`, and the plugin-fs/`invoke` mocks over `eventEntryFromContent`) into `src/tests/fixtures/`. Do not build a second copy.

A model test runs seeded pseudo-random sequences against it:
- **Calendar operations:** edit, move, resize, rename via edit, create, duplicate, delete, restore, undo, redo.
- **Outside events:** path changes through `registerEventCalendarPathChangeConsumer`, index bumps, and `drainEventCalendarWrites`.

After each sequence it drains, bumps the index and checks invariants against the vault Map.
- The seeded generator is a small in-repo PRNG. Adding fast-check is an alternative that needs owner approval.
- The runner fires ops without awaiting each one and controls write timing through the existing `holdNextWrite` / deferred gates. Sequences that await every op never interleave, so they cannot reach the race class this issue targets.
- The existing hand-written regression tests become seed sequences (service.test.ts:1545 back-to-back undos, 1236 write during a vault-switch drain, 2372 rename then delete, 1995-2224 suffixed restore).

**Blocked by:** none

Do not edit `rustFrontmatter` in `event-notes.fixture.ts`: the follow-up Issue of sidebar-redesign Issue 26 owns that change.

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:**
- Code: `src/lib/features/event-calendar/event-calendar.service.ts` (write queue, intake, path-change consumer), `event-calendar.store.svelte.ts:111-155`, `event-calendar-event.logic.ts:415-470` (`mergePending`, `prunePending`)
- Commits: 4e07625f, f98118d3, 83c7896a, 90f794cc, abeec4ee, 606978d4, 9b8f4aa6, d57c0ff9, b9c9eb90, 471978db, 40a3b8a1

- [x] The fixture lives in `src/tests/fixtures/`, uses real stores and real `.logic.ts`, and mocks only Tauri APIs plus the side-effect services TESTING.md allows (`renameItem`, `svelte-sonner`)
- [x] Invariant: after drain + bump, `eventCalendarStore` events equal the events projected from the vault Map (no ghost events, no hidden events), and `pendingPaths` is empty
- [x] Invariant: an undo issued before a later drag or edit is never dropped as 'refused' (f98118d3)
- [x] Named sequences, one per past bug:
  - two back-to-back undos where the newer one renames (4e07625f)
  - outside rename A->B->A before a bump (83c7896a)
  - rename then delete before a bump (90f794cc)
  - an index bump between the rename and the field write (abeec4ee)
  - restore onto a suffixed path (606978d4, 40a3b8a1, 471978db)
  - duplicate while a redo restores the copy (9b8f4aa6)
  - a write enqueued during a vault-switch drain (d57c0ff9)
- [x] Mutation check on the fixes that still reverse-apply cleanly (abeec4ee, d57c0ff9, b9c9eb90, 471978db): with each reverted locally, at least one sequence fails. For the others, name the existing test that pins the fix. Record both in the commit message
- [x] The random run is bounded (fixed seeds, under 5 s in `pnpm vitest run`), and a failure prints its seed and op list

## Notes

- **Root cause of the bugs it targets:** race/async ordering is the largest event-calendar cause, at 17 of 64 fixes. Each fix added the next interleaving as a single hand-built scenario, so nothing checks in general that the store ends up matching disk.
- **History:** no timezone or DST bug appears in the history, so a pure date module stays low priority.
- **Size:** M (the fixture already exists; the 199 existing tests run in about 200 ms).

## Comments

- 2026-11-01, branch `issue/14-calendar-write-queue-model-test`: extracted the in-memory calendar vault into `src/tests/fixtures/calendar-vault.fixture.ts` (plus write/index logs, index freeze/thaw, stale bump, bump-on-read) and added `event-calendar.model.test.ts`: ten named sequences and 300 fixed seeds x 40 steps. Fix round after review: the end check bumps once (twice only with an outside change) so the random run catches reverted abeec4ee at seed 150; ordered write-to-index matching; `MODEL_SEED` replay with per-seed store resets; full actual/expected on failure. The five races the unrestricted runs found are filed as Issues 45-49. Full suite: 382 files, 9238 passed, 1 skipped, 1 todo; `pnpm build` ok. Review round 1: APPROVED (7 findings, all addressed).
