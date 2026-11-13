# Issue 59 discovery: a field write landing after an outside delete

No `spec.md` exists for architecture-stability; the Issue is the spec.

## The race
`updateNoteFrontmatter` (closed note) reads, checks `exists`, then calls
`writeTextFile(path, next)`. plugin-fs opens with `create: true` by default
(tauri-plugin-fs 2.7.1 `commands.rs` `WriteFileOptions`, `default_create_value`),
so an outside delete landing between the `exists` check and the open recreates
the note. `followPathChange` has already put a settled `delete` tombstone and
dropped the path's ops; the write then settles nothing (`settlePending` skips a
settled write) and records its op at the gone-then-recreated path.

## Files that change
- `src/lib/core/frontmatter/frontmatter-write.service.ts:145`: write a closed
  note with `{ create: false }`, so the OS refuses to recreate it (the doc
  already promises "never re-creates a note that vanished"). Outside the Issue's
  Files line: the only place the disk refusal can be atomic.
- `src/lib/features/event-calendar/event-calendar.service.ts:739-778`
  (`renameAndWrite`): on a failed write, roll back the overlay and record the
  rename-only op only while the overlay at `target` is still the one this write
  put (an outside delete replaced it with its tombstone). The error is already
  mapped to `missing` there (`exists` check), so the user sees the usual
  "moved or deleted" refusal. Update the `followPathChange` "Known limitations".
- `src/tests/fixtures/calendar-vault.fixture.ts`: `writeTextFile` mocks honour
  `create: false` (throw, log no write) in `install` and `holdNextWrite`.
- Tests: `frontmatter-write.service.test.ts` (write passes `create: false`, a
  delete during the write throws `missing` and nothing is recreated);
  `event-calendar.model.test.ts` named sequence (hold, move, outside delete,
  release, settle, one bump, check), generator lets an outside delete target a
  note with a field write in flight, `seed 127 ... one end bump (Issue 59)`.

## Prior art
`work/49`: named sequence + lifting a generator limit; the seed tests for
Issues 58, 60, 61 at the end of the model test.

## Risks / defaults
- The open-tab branch (`saveFileByPath`) is not changed: an outside delete of an
  open note during its save is a different path (editor save), not this Issue.
- A delete landing after the write succeeded (the note goes to the Trash with the
  new bytes) still records the op; an undo then reports `vanished`. Left as is.
- Seed 127 only means Issue 49's generator; with the lifted generator the seed
  test is whatever seed 127 draws, the named sequence is the lasting guard.
