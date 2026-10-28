# 39: Write service: no flicker after a rename, undo keeps its place in the queue

**What to build:** fix two regressions that ticket 24's review-fix commit `4e07625f` introduced in `src/lib/features/event-calendar/event-calendar.service.ts`. An independent adversarial review ran after the merge and found them; the owner of the session confirmed both against the code.

1. **Flicker after a rename (medium).** After a write that renames the note, the service leaves a settled `create` overlay with no `settledAtVersion` (`event-calendar.service.ts:385`, and the failure branch at `:369`). `prunePending` (`event-calendar-event.logic.ts:442`) drops a settled `create` as soon as the snapshot contains its path, whatever fields the snapshot holds. Rust indexes the rename before the frontmatter write, so an index refresh between the two shows the renamed note with its OLD date and time: the event jumps back, then forward again on the next refresh. Scenario: an edit changes the title (renaming the note) and the time; a `vault-index-updated` bump lands between the rename and the field write being indexed. The same applies to an undo or redo that renames.
   - The overlay must stay until the snapshot shows the written state (as the `update` overlay already does via `sameEventState`), or until the version clock (`settledAtVersion + 2`) expires, while keeping the snippet and `readOnly` that ticket 24 fix 2 preserves.
   - Keep the store contract from ticket 17: after a rename, settle at the new path `to` (see the Comments of ticket 24, now closed, and the `settlePending` / `remapPath` JSDoc in `event-calendar.store.svelte.ts`).
2. **Undo loses its place in the queue (low).** `applyHistory` (`event-calendar.service.ts:455-461`) takes the op and enqueues its write only after `historyTail` settles. A drag or edit started right after Cmd+Z can be queued on that path ahead of the undo; the undo then sees the drag's state and returns `refused`, silently dropping the user's undo. Before `4e07625f` the undo was queued first. Keep fix 1 of `4e07625f` (two quick undos both apply, the second sees the path the first renamed; an undo after `resetEventCalendar` returns `empty`; `drainEventCalendarWrites` waits for history), and make an undo or redo hold its place relative to writes started after it.

**Plan reference:** Task 23 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 538-573), the spec ticket 24 implemented. Review notes of ticket 24 are in `.scratch/calendar-feature/work/24/review.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar.service.ts` (modify)
- `src/lib/features/event-calendar/event-calendar-event.logic.ts` (modify, only if the prune rule changes)
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (modify)
- `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts` (modify, only if the prune rule changes)

**Gate:** frontend (`pnpm check` + `pnpm vitest run` + `pnpm build`).

- [ ] Test: an edit that renames and changes the time, with an index refresh whose snapshot has the new path but the old fields, keeps showing the new time; the overlay goes once the snapshot shows the written state or the version clock expires. It fails on `4e07625f`
- [ ] Same test for an undo that renames
- [ ] The renamed overlay still carries the snippet and `readOnly` (ticket 24 fix 2 stays covered)
- [ ] Test: Cmd+Z then an immediate drag on the same event: the undo applies first, then the drag; nothing returns `refused`. It fails on `4e07625f`
- [ ] Ticket 24's five tests from `4e07625f` still pass, including two quick undos and undo after reset
- [ ] Each new test was shown to fail without its fix (record how in `work/39/discovery.md`)
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
