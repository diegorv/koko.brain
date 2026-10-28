VERDICT: CHANGES_REQUESTED

# 24 review: write service part 1

Reviewed `git diff main...HEAD` (dd70ca6c, 748ad5a1, 586ba2b3) against Issue 24, plan Task 23 (lines 538-573), Notes C8 and CLAUDE.md.

## What the test verdict rests on

Run by the reviewer in the worktree:
- `pnpm check`: 0 errors, 0 warnings (195 files).
- `pnpm vitest run src/tests/lib/features/event-calendar src/tests/lib/features/properties/frontmatter-write.service.test.ts`: 12 files, 464 passed, 0 failed. This includes `event-calendar.service.test.ts` (the only test file the diff changes) and the tests of the modules it calls: the store, history, form, event and drag logic, plus `frontmatter-write.service.test.ts`.
- A throwaway probe file (a copy of `event-calendar.service.test.ts` plus 4 probe cases, deleted afterwards, never committed). Its results back findings 1 and 3.

The full gate and the E2E spec were not run (deliver runs them).

## Acceptance criteria

- [met] **Self-cleaning per-path queue, two writes run in order.** `holdPath` / `enqueue` (`event-calendar.service.ts:213-235`, drain at `:240`) delete the tail only if it is still the tail. Test "runs two writes to the same path in order".
- [met] **writeGeneration fence, reset keeps the queue, drain.**
  - `writeGeneration` is captured in `enqueue`. `resetEventCalendar` bumps it (`:167-172`) and leaves `writeTails` alone.
  - Every store mutation in `writeEvent` / `applyHistory` sits behind `isCurrent()`.
  - `drainEventCalendarWrites` uses `Promise.allSettled`.
  - Tests: "a write resolving after resetEventCalendar leaves the stores untouched", "resetEventCalendar keeps the queue", "drainEventCalendarWrites resolves after an in-flight write and never rejects".
- [met] **`updateEventFields` contract, plus the `moveEvent` / `resizeEvent` wrappers.**
  - `putPending` runs before `updateNoteFrontmatter(target, applyEventFields)`.
  - On success: `settlePending(target, vaultStore.vaultIndexVersion)`, then the op is recorded unless `record: false`.
  - On failure: `dropPending`, then the error is rethrown.
  - Labels are 'Move event' and 'Resize event'.
- [met] **Tests: overlay before the snapshot, then settled and pruned; rollback; refusal untouched; `missing` drops the pending entry.** Four matching `it` blocks in "updateEventFields, moveEvent and resizeEvent".
- [met] **`editEvent` is one queued unit and one op.**
  - It calls `readDir` and then `planTitleChange`.
  - `renameItem` runs first, and a `null` result throws "may already exist".
  - `remapPath` runs in both stores.
  - The fields are written on the new path with `eventTitle`.
  - A field failure after the rename records a rename-only op.
- [met] **Tests for edit with rename.** Covered: remap with one visible event, `Standup 1.md` with `event_title: Standup`, case-only, rename race, and the rename-only op.
- [partly met] **Undo / redo statuses and preconditions.** Single undos and redos behave as specified: `done`, `refused` with `refuseOp`, `vanished` with `dropPath`, and `empty`. Two quick undos where the newer op renamed the note give a wrong `vanished` and strand the older op (finding 1).
- [met] **Tests: undo / redo of moves and of a title edit, refused after an external change, vanished after an outside rename.** Four matching `it` blocks. None of them covers two undos in flight at once.
- [met] **`toastEventError`.**
  - It skips `save-failed`, and `missing` gets the specified text.
  - Refusals and `vault-changed` get an "Open note" action. Ticket 01 (b) answered "Yes" (plan line 1340).
  - Any other error shows its message.
- [met, re-run open] **Tests mock `@tauri-apps/plugin-fs` and `svelte-sonner`, with the real `editorStore` and stores.** `renameItem` is also mocked. CLAUDE.md allows mocking a side-effect service, and type-definitions tests do the same. p2p-sync Task 1 has not landed (0 tasks checked in `.scratch/p2p-sync/plan-2026-08-25.md`), so there is nothing to re-run yet. Leave that note open.
- [met] **C8.** The service writes only the event-calendar stores. Frontmatter goes through `updateNoteFrontmatter` and the rename through `renameItem`. The build report says the tests failed first (red).
- [not verified] **Gate green, one commit in the full format.** The feat commit 748ad5a1 has Context, Problem, Solution, Behavior and Files. The gate is left to deliver. See finding 5 for the line ranges.

## Findings

1. **Major: two quick undos break when the newer op renamed the note.** `src/lib/features/event-calendar/event-calendar.service.ts:426-462` (`applyHistory`).
   - **Cause.** The op is taken synchronously, but its `op.path` is resolved only when its queued task runs. If an earlier queued undo renamed the note, `remapPath` has already moved the redo-stack copy to the new path. This op object still holds the old path, which now only has a `delete` tombstone. `eventByPath(op.path)` misses, so the task returns `vanished`. `dropPath(oldPath)` then removes nothing.
   - **Probe sequence.** `moveEvent(Standup)`, then `editEvent(Standup, { title: 'Daily sync' })`, then `refresh(2)`, then `undoEventChange()` twice without awaiting in between.
   - **Probe result.**
     - The first undo returns `{done, 'Edit event'}` and the second `{vanished, 'Move event'}`.
     - The note still shows the move (`date: 2026-11-11`).
     - The undo stack is empty. The redo stack holds both 'Edit event' and 'Move event' at `/vault/Standup.md`.
     - The move can no longer be undone, and a later redo of 'Move event' would be refused.
   - **Why it matters.** This is the "two quick Cmd+Z" case the discovery explicitly designs for, and ticket 30 binds it to the keyboard.
   - **Fix.** Serialize history application on one module-level queue and take the op inside it, so each undo or redo starts after the previous one has settled and sees the remapped history. A `historyTail` chained like `enqueue`, under the same generation, is enough. The alternative is to re-resolve the op's current path after the earlier queued writes.
   - **Test to add.** Two undos started without awaiting, after a move and then a title edit. Both must return `done`, the note must be back at `Standup.md` with the original timing, and both ops must sit on the redo stack.
2. **Minor: a rename replaces the remapped event with a bare `update` overlay.** `src/lib/features/event-calendar/event-calendar.service.ts:337`.
   - **Cause.** After `remapPath` moves the event to `target` as a `create` that carries the full `EventNote`, `putPending({ kind: 'update', path: target, ... })` replaces that create. `mergePending` (`event-calendar-event.logic.ts:412-415`) renders an update whose path is not in the snapshot yet with `snippet: ''` and `readOnly: false`.
   - **Effect.** Until the next snapshot, a renamed read-only event (multi-day) shows as draggable, and a snippet disappears.
   - **Fix.** When `target !== path`, keep the event data in the overlay, for example by putting a `create` with `{ ...current, ...after, path: target }`, unsettled, then settled on success. Or document the trade-off and pin it with a test. Not blocking on its own.
3. **Minor: a note deleted on disk but still in the store surfaces a raw read error.** `src/lib/features/event-calendar/event-calendar.service.ts:338-341` (the call to `updateNoteFrontmatter`; the read is at `frontmatter-write.service.ts:90`).
   - **Probe.** Delete `Standup.md` from the fake disk without a refresh, then `moveEvent`. It rejects with a plain `Error: No such file`, not `FrontmatterWriteError('missing')`.
   - **Effect.** `toastEventError` then shows the raw OS message instead of "The note was moved or deleted outside the calendar". This is the common explorer-delete case before the index refresh. The writer documents "Read errors propagate as-is" (ticket 12), so the mapping belongs in the calendar service.
   - **Fix.** In `writeEvent`'s catch, map a non-`FrontmatterWriteError` to `missing` when `!(await exists(target))`, and add a test.
4. **Minor: an undo or redo that fails after its rename leaves the op on the opposite stack.** `src/lib/features/event-calendar/event-calendar.service.ts:450-454`.
   - **Cause.** `refuseOp` is a no-op once `remapPath` has replaced the op (the code comment admits it).
   - **Effect.** The note is renamed back but keeps the old fields. The op stays offered and will be refused on its next use.
   - **Fix.** Drop the op by label and path after the remap, for example by removing the newest op at the new path from the stack it was moved to. If the fix for finding 1 serializes history, track the moved op there.
5. **Nit: weak queue test and stale line ranges.**
   - `src/tests/lib/features/event-calendar/event-calendar.service.test.ts:712`. In "resetEventCalendar keeps the queue", `await second.catch(() => {})` hides whether the second write succeeded. Assert its outcome (it should resolve and the disk should contain `end: 10:30`).
   - The feat commit's Files section cites the test file at `:450-909`. The added block starts at `:486`. Fix it if the commit is reworded anyway.
