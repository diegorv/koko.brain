# 45: A write or outside rename during the Calendar's own rename tail clobbers or hides the note

**What to build:** `writeEvent` (event-calendar.service.ts, around :627) holds the target path only after `renameItem` returns. An index bump during the rename's tail (link rewrite, `refreshTree`, `rename_note`) exposes the new path before the calendar claims it, so a field write or an outside rename on that path interleaves with the rename: a later write is clobbered, or a tombstone hides the note.

Fix the ordering so the calendar's rename and its follow-up field write are one unit from the store's view, then lift the model test's limit that a field write during a path change targets only a note shown before it began.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [x] A failing named sequence in the model test reproduces the race first (a rename via edit with the tail held, a bump, then a write on the new path)
- [x] After the fix the store equals the vault after drain + bump, and no later write is lost
- [x] The model test's generator limit for this race is lifted and the random run stays green

## Notes

- **Not checked:** in the running app; found by the model test only.

## Comments

- 2026-11-01, branch issue/45-calendar-own-rename-tail-race: writes on a note the Calendar renames now queue behind the whole rename (the new path's queue is joined before the rename starts), so a write or outside rename during the rename tail no longer clobbers or hides the note. The model test reproduces the race and its generator limit is lifted. Full suite: 395 files, 9519 passed, 1 skipped, 1 todo; build ok. Reviews: round 1 CHANGES_REQUESTED (fixed), round 2 APPROVED.
