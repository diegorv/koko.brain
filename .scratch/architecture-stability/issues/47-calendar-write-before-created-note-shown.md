# 47: A write on a created note that reaches the snapshot before `showCreated` is overwritten by the draft

**What to build:** `createEvent` / `duplicateEvent` show the new note through `showCreated` (event-calendar.service.ts, around :807). When an index bump puts the created note in the snapshot first and a write (a drag) lands on it before `showCreated` runs, the draft overwrites the write in the overlay, and the Create op lands in the undo history after the Move.

Make `showCreated` not clobber a newer overlay, and keep the undo order (Create before Move). Then lift the model test's limit that a write targets only a note the store showed before the path change began.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [ ] A failing named sequence reproduces it first (create with `create_note` delayed, a bump, a move on the new path)
- [ ] After the fix the move survives in the store and the vault, and undo reverts the move before the create
- [ ] The matching generator limit is lifted

Also in this Issue, from the post-delivery review of Issue 46 (145c2107), both low:
- [ ] Add a named model-test sequence for an outside path-change consumer racing the calendar's own rename. Today only one service test ("undoes and redoes its own title rename through the real rename") catches an own-change mark set on the wrong path; the model test does not.
- [ ] `event-calendar.service.ts:678` says the joined path "must equal the `newPath` `renameItem` builds", a coupling to `fs.service.ts:202-203`. Make `renameItem` return the path it renames to (or pin the two with a test) so the comment cannot go stale.

## Notes

- **Not checked:** in the running app; found by the model test only.
