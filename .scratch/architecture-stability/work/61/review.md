VERDICT: CHANGES_REQUESTED

## Acceptance criteria

- [met] A failing test first: a duplicate with a written title equal to its filename base, renamed outside, keeps its written title in the overlay and the history — the model named sequence "an outside rename of a duplicate whose written title equals its filename base (Issue 61)" and the store test "with `outside`, a written title equal to the old filename base stays, on the event and in the history" (overlay and history) fail against main's `src/lib/features/event-calendar/` (I checked main's files out into the worktree, ran both files filtered to these tests: 3 failed, then restored HEAD) and pass on the branch.
- [not met] An untitled note renamed outside still shows its new filename as its title — the existing store test (`event-calendar.store.test.ts:632`) passes, but the branch breaks the criterion for an untitled note that a calendar rename just produced from a titled one (finding 1): an untitled `Planning.md` renamed outside to `Foo` shows "Planning" after one bump. The same probe passes on main.
- [met] Seed 166 passes with one end bump — dedicated test `seed 166, an outside rename of a titled duplicate, with one end bump (Issue 61)` (`event-calendar.model.test.ts`, `runModel(..., 1)`) passes on the branch and fails against main's source.

## Findings

1. **blocker** `src/lib/features/event-calendar/event-calendar.service.ts:732` (also `:764`). Regression: a calendar title edit that renames the note copies the stale `titled` flag onto the moved event. `renamedEvent = { ...current, ...after, path: target }` keeps `current.titled: true` even when `planTitleChange` removes `event_title` (`eventTitle: null`, because the new title equals the new filename base). An outside rename of that note before the next index bump then keeps the old title on the overlay and skips `followRename` in the history (`event-calendar.store.svelte.ts:210`, `:224`). This is the Issue's symptom in reverse: the overlay never matches the index and stays until the clock runs out. I reproduced it with a model sequence (probe file, deleted after the run):
   `edit Standup title Retro` (it becomes "Retro 1" with `event_title: Retro`), `settle`, `refresh`, `edit "Retro 1" title Planning` (it becomes `Planning.md` with no `event_title`), `settle`, `outsideRename Planning -> Foo`, `settle`, `refresh`, `check`.
   On the branch, `check` fails: the store shows `/vault/Foo.md` with title "Planning", while the vault has "Foo". With main's `src/lib/features/event-calendar/` the same sequence passes. Undo or redo of a title edit goes through the same `writeEvent` path, so it hits this too.
   Fix: build `renamedEvent` without `current.titled`, and set `titled: true` only when the plan writes a non-empty title (`fields.eventTitle` is a non-empty string after `planTitleChange`). On the `renamedOnly` failure path (`:760-764`) the disk keeps its old `event_title`, so `current.titled` is still right there. That path's own `before.title === fileBase(path)` heuristic should also honour `current.titled`. Add the sequence above as a named model sequence (it fails on the branch today), plus a service test that checks `titled` on the overlay after a rename that removes `event_title`.

2. **minor** `src/lib/features/event-calendar/event-calendar.service.ts:1182-1187`. The `create` overlay of a restore (`{ path: restored, ...state, title, ... }`) carries no `titled`. A restored titled duplicate ("X (copy).md" with `event_title: X (copy)`) that is renamed outside before the index shows it still hits the original misread. This is not a regression, and discovery.md's "Defaults / risks" do not list it (they name only update overlays at a new path). Fix: carry the flag for a restore of a known event, or list the gap in the known limits.

3. **nit** `src/lib/features/event-calendar/event-calendar.service.ts:1000`. In the lossy branch (`!rewrite && hasEventTitle`), `duplicateEvent` takes the copy's flag from `current.titled`, not from the bytes it copies. If `current` comes from a title-changing update overlay (flag dropped by `mergePending`), the copy keeps `event_title` on disk but has no flag. It is harmless today: the shown title (`current.title`) never equals the "(copy)" base. A one-line comment saying so would help the next reader.

## Checks run (this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/`: exit 0, 29 files, 1115 tests passed. This covers every test file the diff touches (`event-calendar-event.logic.test.ts`, `event-calendar.model.test.ts`, `event-calendar.service.test.ts`, `event-calendar.store.test.ts`) and the tests of the changed code.
- The 18 test files outside that folder that reference `event-calendar`: exit 0, 614 tests passed.
- Red check: the three new Issue 61 tests (named sequence, seed 166, store test) fail against main's source.
- Regression probe for finding 1: fails on the branch and passes against main's source.
- I did not run the full suite or `pnpm build`; both are deliver's job.
- Scope: the diff stays within `src/lib/features/event-calendar/` and `src/tests/lib/features/event-calendar/`, plus the Issue's work record. It adds nothing to the layer baseline and no composition root.

## Resolution

1. **blocker, fixed** in `066c8efc`. `renameAndWrite` builds the renamed overlay without `current.titled` and sets `titled: true` only when the plan writes a non-empty `event_title` (`fields.eventTitle`). The failed-field-write path keeps `current.titled` (the disk keeps its old `event_title`) and its rename-only title now honours it. Tests: model named sequence "an outside rename of a note whose calendar rename removed its written title (Issue 61)" (your probe, it failed with "Planning" at Foo before the fix); service tests "marks the renamed overlay titled only when the rename writes event_title" and "keeps a written title equal to the old filename base when the field write fails after the rename". All three failed before the fix and pass after it. In the second service test the rename-only state equals `before`, so `pushOp` records no op (`event-calendar-history.logic.ts:44`). An update op with an unchanged title could not undo the rename anyway, because `writeEvent` plans a rename only when the title changes.
2. **minor, documented** in `effb52a3`. The gap is now listed under discovery.md "Defaults / risks", together with the same heuristic in `followFilename` for a restore onto a suffixed path. Carrying the flag would mean adding `titled` to the delete op's `EventState` in the history, which goes beyond this Issue.
3. **nit, fixed** in `e336dcac`. I added a comment at the lossy branch of `duplicateEvent` saying the flag comes from `current` and why that is harmless.

Checks after the fixes: `pnpm check` exit 0 (0 errors, 0 warnings); `vitest run src/tests/lib/features/event-calendar/` exit 0, 29 files, 1118 tests passed; the 18 other test files that reference `event-calendar` exit 0, 614 tests passed.
