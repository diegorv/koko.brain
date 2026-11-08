# Issue 61 discovery

No `spec.md` exists for architecture-stability; the Issue is the spec.
Same calendar area and test shape as `work/58/` and `work/60/`.

## Cause
`remapPath` (`event-calendar.store.svelte.ts:208`) and `followRename`
(`event-calendar-history.logic.ts:93`) swap any title equal to `fromBase`
for `toBase`. A duplicate of a note with `event_title` gets
`event_title: <title> (copy)` in "<title> (copy).md", so its written title
equals its filename base and the swap misreads it as untitled. Reproduced on
main: named sequence (edit Standup's title to Retro, so it becomes "Retro 1"
with `event_title: Retro`; duplicate it; rename the copy outside to
Planning; one bump; check) and seed 166 with one end bump both fail.

## Plan
- `event-calendar.types.ts` `EventNote`: optional `titled?: boolean`, true
  when the title is written (`event_title`), absent otherwise.
- `event-calendar-event.logic.ts` `entryToEvent`: set it from `event_title`.
  `mergePending`: an `update` overlay that changes the title drops it (the
  calendar's title write may add or remove `event_title`; unknown until the
  index catches up, so the old heuristic applies there).
- `event-calendar.service.ts` `createNow` and `duplicateEvent`: set it on
  the shown event the same way the write decides `event_title`.
- `event-calendar.store.svelte.ts` `remapPath`: with `outside`, swap the
  moved event's title only when it is not `titled`; history uses
  `followRename` only when the event at `from` is not titled, else the plain
  `remapPath`.
- `followRename`: doc comment updated (the caller passes only untitled notes).
- Tests: model named sequence + seed 166 with one end bump; store test for
  `remapPath` on a titled event; logic tests for `entryToEvent` and
  `mergePending`; service test for duplicate's shown `titled`.

## Defaults / risks
- History ops on a titled note keep every title, including an older state
  that was untitled with the old filename as its title (an op from before a
  calendar title edit). Its undo then writes the old name as a title.
- An event the calendar shows only from an `update` overlay at a new path
  (no snapshot row) has no flag and keeps the old heuristic.
- A restore's `create` overlay (`restoreNow`, `event-calendar.service.ts`)
  has no flag: it is built from the delete op's `EventState`, which does not
  carry `titled`. A restored titled duplicate ("X (copy).md" with
  `event_title: X (copy)`) renamed outside before the index shows it keeps
  the old misread until the snapshot has it. The same heuristic is in
  `followFilename` for a restore onto a suffixed path. Fixing both means
  adding `titled` to the history op state; left out of this Issue.
