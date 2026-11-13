# 24 discovery: write service part 1 (update, move, resize, edit with rename, undo/redo)

## Files that change
- `src/lib/features/event-calendar/event-calendar.service.ts`: add the queue (`writeTails`, `writeGeneration`, `enqueue`, `holdPath`), `updateEventFields`, `moveEvent`, `resizeEvent`, `editEvent`, `undoEventChange`, `redoEventChange`, `drainEventCalendarWrites`, `toastEventError`; `resetEventCalendar` (`:150-156`) bumps `writeGeneration`.
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`: new `describe` blocks; mocks added for `@tauri-apps/plugin-fs` (in-memory disk: `readTextFile`, `writeTextFile`, `exists`, `readDir`), `svelte-sonner`, and `renameItem` of `fs.service` (actual module spread, `renameItem` moves the bytes on the fake disk, `null` when the target exists). The existing `invoke` mock answers `get_all_vault_entries_v2` from the fake disk via `eventEntryFromContent`.
- No store or logic change: the stores already have `putPending` / `settlePending` / `dropPending` / `remapPath` / `setHistory`; history logic has `pushOp` / `takeUndo` / `takeRedo` / `refuseOp` / `dropPath`; form logic has `planTitleChange`; event logic has `applyEventFields`, `eventState`, `sameEventState`.

## Plan
1. Tests first (red), then the service code, one feat commit (the ticket asks for one).
2. One private core `writeEvent(path, current, after, patch, { label, record, planTitle }, isCurrent)` used by `updateEventFields` (no title planning), `editEvent` and undo/redo (title planning). Order: title plan (`readDir` + `planTitleChange`) -> `renameItem` -> `remapPath` in `eventCalendarStore` and `eventCalendarViewStore` -> `putPending` update at the final path -> `updateNoteFrontmatter(target, applyEventFields)` -> `settlePending(target, version)` + `pushOp`.
3. `editEvent(path, EventFormPatch)`: the form patch's fields are the write patch; the after state is `before` with the patch applied (all-day -> 0..1440; start/end without `allDay` clears it; empty location -> '').
4. Undo/redo take the op synchronously (two quick Cmd+Z take two ops), then run queued on `op.path`; the patch is the field diff between the current and the target state.

## Defaults taken for open points
- "No longer in the snapshot" is checked as: not in the merged store (`eventByPath`) or not on disk (`exists`). A settled overlay write at a renamed-away path stays merged until the version clock prunes it, so the store alone would miss an explorer rename for up to two index bumps. No store getter is added.
- A write on a path the store does not show throws `FrontmatterWriteError('missing')`.
- After a rename, the field write is also held on the new path's queue tail (`holdPath`), so a drag on the new path waits for it.
- Rename-only op after a field failure: its `after.title` is the old `event_title` when the old title differed from the old file base, else the new file base; the overlay keeps a settled `create` at the new path with that title.
- `undo`/`redo` on a `create` or `delete` op (none recorded until ticket 28) is refused.
- An undo/redo whose write throws removes the op (`refuseOp`) and rethrows.
- `empty` returns `label: null`.
- `toastEventError` messages for refusals: one line per lossy reason plus "Open note" (ticket 01 (b): `action` works); `vault-changed`: "The vault changed before the event was saved" plus "Open note"; any other error: its message.

## Prior art
- `frontmatter-write.service.test.ts:1-115` (fake disk, `deferred`, `flush`, tab helpers); `type-definitions.service.test.ts:34-37` (`renameItem` mock); this test file's `beforeEach` and `loadEvents` cases.

## Risks
- `updateNoteFrontmatter` on a closed note runs `notifyAfterSave` -> `applyNoteChange` -> `invoke`; the `invoke` mock must return `undefined` for every command but `get_all_vault_entries_v2`.
- p2p-sync Task 1 is not done, so the re-run note in the ticket stays open (nothing to re-run yet).
