VERDICT: CHANGES_REQUESTED

# Issue 28 review: write service part 2 (create, duplicate, delete, restore, undo)

Reviewed `git diff main...HEAD` (aa71267f, 407b00a9, b262e451) in the worktree.

## What I ran

- `pnpm check`: 0 errors, 0 warnings (200 files).
- `vitest run` on `src/tests/lib/features/event-calendar/` (all files, including the changed `event-calendar.service.test.ts`), `src/tests/lib/core/trash/`, `src/tests/lib/features/type-definitions/`, `src/tests/lib/core/layout/tauri-listeners.service.test.ts`, `src/tests/lib/core/app-lifecycle/`: 31 files, 1044/1044 passed. The test verdict below rests on these files, mainly `event-calendar.service.test.ts`.
- Probes: a temporary copy of `event-calendar.service.test.ts` with five extra cases in the `calendar writes` harness (real `createTypedNote`, `createFile`, `deleteItem`, `restoreItem` on the fake disk). I deleted it after the run and committed nothing from it. The results are quoted in the findings.

## Acceptance criteria

- [x] **C8 checklist confirmed before the change.** Met. `work/28/discovery.md` lists the stores written (event-calendar stores plus the `fsStore` / `trashStore` / `editorStore` / index legs reached through the owners), the getters and the readers. I cannot check test-first order from a single commit.
- [x] **`EventCalendarError` with the three reasons, mapped by `toastEventError`.** Met. `event-calendar.service.ts:507-526` and `:896-899`. The messages match the Issue word for word. Tested by the `it.each` in `toastEventError`.
- [x] **`createEvent` through `createTypedNote`, with lossy-template refusal, `create-failed` mapping, pending `create` and 'Create event' op.** Met. `:545-584`. Tests cover the inline template, a configured template and folder, `tp.date.now` rendered for the draft's day, a comment refused with nothing written, `Standup 1.md` with `event_title: Standup`, `1-1 with manager.md`, and a failed `create_note` (null `createFile`) becoming `create-failed`.
- [x] **`duplicateEvent`: tab content or disk, `(copy)` name, `event_title` rewrite only on a safe base, pending `create`, 'Duplicate event' op.** Met. `:600-618`. Tests cover the unchanged bytes, a dirty tab, the `event_title` copy title, and a lossy base that keeps its bytes. A null `createFile` is not tested (finding 5).
- [x] **`deleteEvent`: save first (`save-failed` aborts), `deleteItem` false throws, `trashId` from `items[0]` when it matches, pending `delete`, 'Delete event' op.** Met. `:628-656`. Tests cover a dirty tab (trashed and restored bytes keep the edit), a save failure, a `deleteItem` failure with rollback, and the recorded `trashId`.
- [~] **`restoreDeletedEvent`: by id, else the newest matching `trashedAt`; no match throws with stores untouched; `restoreItem`; remap to a suffixed path; pending `create`.** Partly met. The lookup, the `not-in-trash` refusal with untouched stores, and the restore are correct and tested. The suffixed-path remap moves ops that belong to the note now holding the old path (finding 1, High). The overlay can show another deletion's state (finding 3), and with no op known the restored note stays hidden (finding 4).
- [x] **`undoDeleteEvent` restores and retires the delete op.** Met. `:759-764` passes the op as `retire`, and `restoreNow` refuses it before any remap. Tested: Cmd+Z offers nothing afterwards.
- [~] **Undo/redo of `create` / `delete`, preconditions refuse, a vanished path returns `vanished`.** Mostly met. `applyNoteOp` (`:771-800`) and its tests cover undo and redo of both kinds, a refused undo of a changed create, `vanished`, a refused undo after the Trash was emptied, and a suffixed undo. Finding 1 lets a later undo act on the wrong note.
- [x] **Create tests** (list in the Issue). Met; see the `createEvent` describe.
- [x] **Duplicate tests.** Met.
- [x] **Delete and restore tests.** Met as listed. The cases that would have caught finding 1 are missing.
- [ ] **Gate green; one commit in the full format.** Pending. The full gate and the e2e spec are left to deliver. The commit message of 407b00a9 follows docs/COMMITS.md.

Layer rules: the feature imports `core/trash`, `core/filesystem`, `features/type-definitions` and `features/properties`, and nothing in `core/` imports it. Errors propagate to the caller; `createEvent` logs before rethrowing. JSDoc is present on the exported API. Scope: only the two files the Issue lists, plus the scratch docs. No scope creep.

## Findings

1. **High: a suffixed restore moves the occupying note's history onto the restored note, so Cmd+Z can trash the wrong note.** `src/lib/features/event-calendar/event-calendar.service.ts:715-719`.
   - A suffixed restore only happens when another note holds `path`. `remapHistoryPath(history, path, restored)` re-points every op on `path`, including ops recorded after the delete, which belong to that other note. `follow` then rewrites their filename-derived title to the restored filename. `eventCalendarViewStore.remapPath(path, restored)` likewise moves a popover or selection that is on the occupant.
   - Probe: delete `Standup.md`, then `createEvent` "Standup" with the same day, time and color (it lands at `Standup.md`), then `undoDeleteEvent(Standup.md)` (the toast Undo). The restore lands at `Standup (restored).md`, and the undo stack becomes `[create 'Create event' /vault/Standup (restored).md "Standup (restored)"]`. `undoEventChange()` then returns `done` and trashes `Standup (restored).md`, the note the user just brought back. The new `Standup.md` stays and its create can no longer be undone. With a different state the undo is `refused`, and the new note's create op is lost.
   - Fix: on a suffixed restore, re-point only the restored note's own ops: the delete op being undone or retired, and the ops on `path` recorded before it. Leave the ops recorded after it, and the view state at `path`, on `path`. Add the probe above as a regression test, both through `undoDeleteEvent` and through `restoreDeletedEvent`. Also revisit the test at `event-calendar.service.test.ts:1364`, which asserts that a popover opened on the occupant jumps to the restored note.
2. **Medium: `drainEventCalendarWrites` does not wait for `createEvent`.** `src/lib/features/event-calendar/event-calendar.service.ts:545-584`.
   - `createEvent` is neither `enqueue`d nor held in `writeTails` or the intake. The close-requested handler (`src/lib/core/layout/tauri-listeners.service.ts:63-65`: "A drag, create or delete queued just before quitting must finish its write and its index update before the window dies") and the vault switch (`app-lifecycle.service.ts:178`) can therefore tear down while a create is in flight.
   - Probe: hold `create_note` open, call `createEvent`, call `drainEventCalendarWrites()`. The drain resolves before the note exists (`drained before create finished: true, disk has note false`).
   - Fix: hold the create in the queue, for example `holdPath` under the planned path or a dedicated key that `drainEventCalendarWrites` awaits, and add a test that drain waits for an in-flight create.
3. **Low: a restore by explicit `trashId` overlays the state of a different deletion.** `src/lib/features/event-calendar/event-calendar.service.ts:745-748`.
   - `restoreDeletedEvent(path, trashId)` takes `op?.state` from `findDeleteOp(path)`, which is the newest delete op on the path, not the one for `trashId`.
   - Probe: the "restores the entry with the given id" scenario. The file holds 09:30, but the overlay shows `start: 840` (the second deletion's 14:00) until the next snapshot.
   - Fix: when `trashId` is given, use the op whose `trashId` matches, else pass no state.
4. **Low: a restore with no known op state stays hidden behind the delete tombstone.** `src/lib/features/event-calendar/event-calendar.service.ts:721-730`.
   - With no delete op on either stack (history capped or reset, op refused), `restoreNow` puts no `create`. The settled `delete` at `path` keeps hiding the restored note until `version >= settledAtVersion + 2`.
   - Probe: delete, clear the history, then restore. The note stays hidden right after the restore and after one refresh, and shows only after two.
   - Fix: on a same-path restore without `state`, `dropPending(path)` (the snapshot then shows the note once indexed). Add a test.
5. **Low: missing test for `duplicateEvent` when `createFile` returns null.** `src/tests/lib/features/event-calendar/event-calendar.service.test.ts:1259` (the `duplicateEvent` describe).
   - The build added `EventCalendarError('create-failed')` for this path as a decision (`event-calendar.service.ts:614`), but no test covers it or checks that no overlay or op is recorded.
   - Fix: add a case where `create_note` throws during a duplicate. Assert the reason is `create-failed` and that the history and the pending entries are unchanged.

Not a finding: `restoreItem` never returns null (it rethrows every failure, `trash.service.ts:155-157`), so the null check at `event-calendar.service.ts:712` is unreachable. A restore I/O error reaches the caller as the raw error, and `applyNoteOp` refuses the op and rethrows it. That is the intended behavior.

## Resolution

All five findings accepted and fixed in the fix commit; none rejected.

1. `restoreNow` takes the deleting op as `anchor` and re-points only the ops on the old path recorded at or before it (`opsUpTo`: undo stack oldest first, then redo newest first). Later ops and the view store stay on the old path. Regression tests through `undoDeleteEvent` and `restoreDeletedEvent`; the popover assertion now expects the popover to stay on the occupant.
2. `createEvent` is queued with `enqueue` under a dedicated key, so `drainEventCalendarWrites` waits for it (creates now also run one at a time). Test added.
3. `restoreDeletedEvent(path, trashId)` overlays the state of the delete op that recorded `trashId`, else none. Asserted in the "given id" test.
4. A same-path restore without a known state drops the tombstone at `path`. Test added.
5. Test added for `duplicateEvent` with a failing `create_note`.
