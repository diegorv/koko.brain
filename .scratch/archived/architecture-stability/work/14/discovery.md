# Issue 14 discovery: Calendar write queue model test

No `spec.md` exists for architecture-stability; the Issue is the spec.

## Files that change
- `src/tests/fixtures/calendar-vault.fixture.ts` (new): the harness now inline in
  `src/tests/lib/features/event-calendar/event-calendar.service.test.ts:879-1001`
  (`disk`, `version`, `eventFile`, `refresh`, `refreshWith`, `holdNextWrite`,
  the plugin-fs / `invoke` / `renameItem` mock impls, the store resets, the teardown).
  Adds what the model needs: a write/index log, `freezeIndex`/`thawIndex`
  (index lag), `staleBump` (bump without reload), `bumpOnNextRead`.
- `event-calendar.service.test.ts:879-1001`: uses the fixture; `version` reads become `vault.version`.
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` (new): seeded runner.
- No app code changes.

## Plan
1. Extract the fixture, switch the service test to it; the service test stays green unchanged otherwise.
2. Model test: a mulberry32 PRNG (in-repo, no fast-check). Each step generates one op from
   the current store / disk / Trash, fires it without awaiting, then yields a random number
   of microtasks. Ops: move, moveToDay, resize, edit (title rename + fields), create,
   duplicate, delete, restore, undo, redo; outside rename / delete (real `renameItem` /
   `deleteItem` through `applyPathChange` and the registered consumer), outside create,
   bump, drain; `hold` / `release` gates over `holdNextWrite`.
   End of a run: release every gate, settle every op, drain, thaw, one bump, then invariants.
3. Invariants: store events equal `eventsFromEntries` over the vault Map and `pendingPaths`
   is empty; no undo/redo returns `refused`; every note write in a vault is followed by its
   `update_note_in_index` in that vault; a `lookup` op equals what a reload at the version it
   read would show (`prunePending` + `mergePending` over the served snapshot).
4. Named sequences (one per past bug) run through the same runner, plus named-only ops:
   `freeze`, `thaw`, `staleBump`, `lookup`, `switchVault`, `check` (mid-run invariant).
5. Mutation check: reverse-apply abeec4ee, d57c0ff9 (src/lib/features only; the
   app-lifecycle hunk is a comment), b9c9eb90, 471978db one at a time; confirm a sequence
   fails, restore. The other seven do not reverse-apply (checked with `git apply -R --check`);
   name the existing service test that pins each in the commit message.

## Prior art
- `event-calendar.service.test.ts` blocks "write queue", "undoEventChange and redoEventChange",
  "deleteEvent and restoreDeletedEvent", "path changes made outside the calendar" (its
  beforeEach switches `renameItem` to the real one and answers `get_backlinks_v2`).
- `src/tests/fixtures/tauri-fs.fixture.ts`: fixture that configures `vi.mocked` impls; the
  test file keeps the hoisted `vi.mock` calls.

## Defaults taken
- "bumps the index" after drain = two refreshes, the `settledAtVersion + 2` horizon of
  `prunePending`: an outside change racing a calendar write can leave a clocked overlay or
  tombstone for one bump. 471978db and abeec4ee are caught by mid-run `check` ops instead.
- Outside create (a note written to disk without the calendar) is added to the outside
  events: 471978db needs the old path retaken without the calendar knowing.
- Index lag, stale bumps, lookups and the vault switch appear only in named sequences.
- The refused-undo invariant counts undos issued while no earlier op is in flight (the
  f98118d3 wording: an undo before a later drag), and ignores `not-in-trash`.
- Random runs: path changes one at a time; a field write during one targets a note shown
  before it began; outside changes skip notes with a field write in flight; the calendar's
  own renames use the fixture's instant `renameItem`. Each limit excludes a race found below.

## Races the unrestricted runs found (not fixed: test-only Issue)
1. Own rename tail: `writeEvent` holds the target path only after `renameItem` returns; a
   bump during its link rewrite / refreshTree / rename_note exposes the new path, and a write
   or an outside rename there interleaves (later write clobbered, tombstone hides the note).
2. `ownPathChanges` is keyed by path: during the calendar's own delete tail, an outside
   rename of another note that took that path is skipped by the consumer.
3. A write on a created note that reaches the snapshot before `showCreated` runs is
   overwritten in the overlay by the draft, and the Create op lands after the Move.
4. Cmd+Z while a drag's write is in flight takes the op before the drag, finds the drag's
   state, refuses and drops it.
5. An outside delete racing a calendar restore of that entry leaves a clocked tombstone over
   the restored note for two bumps.

## Risks
- The random runs may find real races; a finding is reported, not hidden by narrowing the
  generator without saying so.
- Runtime: must stay under 5 s; seed count tuned to measured time.
