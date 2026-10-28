# 24: Write service part 1: move, resize, edit with rename, and undo/redo of updates

**What to build:** `event-calendar.service.ts` can change existing events safely. `updateEventFields`, `moveEvent`, `resizeEvent` and `editEvent` write through the shared `updateNoteFrontmatter` behind a self-cleaning per-path queue, show the change at once through the pending overlay, roll back on failure, and record an `update` undo op. A title change in `editEvent` renames the note first (a numbered file name for a repeated title, no rename for a case-only change, and `event_title` whenever the title differs from the final file name) and remaps overlay and history to the new path. `undoEventChange` / `redoEventChange` reverse `update` ops only when the note still matches, and report `done`, `refused`, `vanished` or `empty` (the toasts arrive in ticket 31). A module write generation fences writes that resolve after `resetEventCalendar`, `drainEventCalendarWrites` lets the lifecycle wait for in-flight writes (wired in ticket 25), and `toastEventError` gives components one way to report write errors. The edit dialog (ticket 27) and pointer drag (ticket 30) call these functions.

**Plan reference:** Task 23 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 538-573). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 10, 13, 21

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar.service.ts` (modify)
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] A per-path promise queue cleans itself (each tail is deleted when it settles, if it is still the tail); a test shows two writes to the same path run in order
- [ ] A module `writeGeneration` is captured by every queued write at enqueue; a write resolving with a stale generation skips `settlePending`, history and every store mutation; `resetEventCalendar` bumps it and never clears the queue, so a later write to the same path cannot skip past an in-flight one; `drainEventCalendarWrites(): Promise<void>` awaits `Promise.allSettled` of every tail and never rejects; tests show a write resolving after `resetEventCalendar` leaves the stores untouched and `drainEventCalendarWrites` resolves after an in-flight write
- [ ] `updateEventFields(path, patch, { label, record })` calls `updateNoteFrontmatter(path, (p) => applyEventFields(p, patch))` with `putPending` before the write; on success it calls `settlePending(path, vaultStore.vaultIndexVersion)` and pushes an `update` op unless `record: false`; on failure it calls `dropPending` and rethrows. `moveEvent(path, timing)` and `resizeEvent(path, end)` wrap it with their labels
- [ ] Tests pass for: the pending overlay visible before the snapshot, then settled and pruned by a matching newer snapshot; rollback on write failure; a refusal leaving the file and store untouched; a `missing` error dropping the pending entry
- [ ] `editEvent(path, patch)` is one queued unit and one 'Edit event' op: on a title change it reads the parent's sibling names with `readDir` and calls `planTitleChange(currentFileBase, patch.title, siblings)`; when `renameTo` is set it renames first with `renameItem(path, renameTo)`, turns a `null` result into a thrown error ("a note with that name may already exist"), and calls `remapPath` in both stores (leaving the tombstone); then it writes the fields on the new path with `eventTitle` from the plan; if the fields fail after a successful rename, the recorded op covers only the rename and the error is rethrown
- [ ] Tests pass for edit with rename: overlay and history remapped with exactly one event visible before the snapshot update; a second "Standup" renames to `Standup 1.md` with `event_title: Standup`; a case-only edit renames nothing and writes `event_title`; a rename race returning null throws
- [ ] `undoEventChange()` / `redoEventChange()` for `update` ops check `sameEventState(current, op.after)` (or `op.before` for redo), apply the other state with `record: false` (planning the title the same way when it differs), call `refuseOp` and return `{ status: 'refused', label }` on a failed precondition, and, when the op's path is no longer in the snapshot (an explorer rename or move, `renameType`, auto-move), call `dropPath` and return `{ status: 'vanished', label }` instead of dropping the ops silently; each returns `{ status: 'done' | 'refused' | 'vanished' | 'empty', label }`
- [ ] Tests pass for undo/redo of moves and of an edit that changed the title, undo refused after an external change, and undo after the note was renamed outside the calendar returning `vanished` and emptying that path's history
- [ ] `toastEventError(err, path)` skips `save-failed` (already toasted), shows "The note was moved or deleted outside the calendar" for `missing`, and for refusals and `vault-changed` shows an "Open note" action, or a plain toast if the Task 1 (b) answer recorded by ticket 01 is "no"
- [ ] The tests extend `event-calendar.service.test.ts`, additionally mocking `@tauri-apps/plugin-fs` and `svelte-sonner`, with the real `editorStore` and stores; they are re-run once p2p-sync Task 1 (its rewrite of the external-reload loop in `editor.service.ts`) has landed (plan Notes > Dependencies, line 938)
- [ ] Checklist C8 (plan lines 1014-1023) holds for this part: the service writes the event-calendar stores directly, frontmatter goes through `updateNoteFrontmatter` (C2), the rename goes through `renameItem` (which owns the `fsStore` tree, `editorStore` tabs and index legs it changes), and each service test is written before its function
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- **2026-10-28, from ticket 17 (b2389a39):** after a rename, settle any write still in flight at the new path `to`. `settlePending` on the old path `from` is a no-op once `remapPath` has moved the write (see the `settlePending` / `remapPath` JSDoc in `event-calendar.store.svelte.ts`).
- 2026-10-28 13:38 — discovery — plan in work/24/discovery.md: one private writeEvent core behind a self-cleaning per-path queue; vanished = not in store or not on disk — d785034f
- 2026-10-28 13:42 — implement — service queue, writeEvent core, update/move/resize/edit, undo/redo, drain, toastEventError; pnpm check 0 errors, 18 related test files 605 passed; p2p-sync Task 1 not landed, so the re-run note stays open; E2E and full gate left to deliver — 748ad5a1
- 2026-10-28 13:45 — review — VERDICT: CHANGES_REQUESTED: 1 major (two quick undos after a renaming op return vanished and strand the older op), 3 minor, 1 nit; see work/24/review.md — 586ba2b3
- 2026-10-28 13:49 — fix — all 5 review findings fixed (serialized undo/redo queue, create overlay after rename, missing mapping for a deleted note, failed undo drops the remapped op, stronger queue test); 5 new tests red before, 66 passed after; pnpm check 0 errors — 748ad5a1
