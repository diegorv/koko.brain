# Issue 49 discovery: outside delete racing a Calendar restore

No `spec.md` exists for architecture-stability; the Issue is the spec.

## What the named sequence shows
Calendar delete of Standup, settle, bump; `holdRename`; restore Standup; outside
delete of Standup; release; settle. The outside delete lands in `restoreItem`'s
tail, so its consumer call (`followPathChange`) finds no event at the path, and
`restoreNow` then puts a clockless `create` overlay at a path the disk no longer
has: a ghost that never prunes (worse than the two-bump tombstone the Issue names).

## Files that change
- `src/lib/features/event-calendar/event-calendar.service.ts`: `restoresInFlight`
  (by `ownPathChanges`); `followPathChange` records outside deletes in it;
  `restoreNow` (~1118) skips the overlay and the owned ops of a note deleted
  again before `restoreItem` returned, and puts a clocked delete tombstone.
- `src/tests/lib/features/event-calendar/event-calendar.model.test.ts`: named
  sequence (Issue 49) with a mid-run `check` after one bump; the generator lets
  an outside delete run while calendar restores are in flight; header.

## Prior art
Issue 46/48 work folders: named sequence + lifting the matching generator limit.

## Conflict: criterion 3 cannot hold within this Issue
With `finish` bumping once for every run (and the restore fix in place), four
seeds fail; none involves a restore. Each leaves a clocked overlay the index
never matches, from a different race:
1. Seed 40: an outside rename onto a path while the calendar's delete of it is in
   its tail. `remapPath` keeps the unsettled delete held at `to`; `deleteNow`
   then settles it into a tombstone over the renamed-in note.
2. Seed 127: a calendar field write in flight lands after an outside delete and
   recreates the note under the delete tombstone (the limitation
   `followPathChange` documents).
3. Seed 252: an outside create on a path holding a rename `from` tombstone; the
   calendar gets no notice, and `prunePending` keeps a delete while the path is
   present.
4. Seed 166: an outside rename of a duplicate whose title is written in its
   frontmatter; `followRename` turns the overlay title into the new filename, the
   index keeps the written title.
2 and 3 are gaps in the tombstone design, not one-line fixes. So `finish` keeps
two bumps for runs with an outside change; criteria 1 and 2 are built.

## Retry (after the owner amended criterion 3)
The four races are filed as Issues 58-61. Criterion 3 now asks for exactly what
the branch has: the generator lets an outside delete run during a calendar
restore, and `finish` bumps twice only for runs with an outside change. The retry
only points the `finish` comment at Issues 58-61.

## Risk (known, not handled)
`restoresInFlight` records every outside delete from the moment the restore
starts, including one that lands before `restoreItem` moves the note back (a
delete of the note then occupying the original path, or of a parent folder that
`restoreItem` recreates). Then `gone` is true for a note that is on disk, and its
tombstone hides it for two bumps. That needs an outside delete on the same path
or folder in the few awaits before the move; left as is rather than add an
`exists` check and a second window.
