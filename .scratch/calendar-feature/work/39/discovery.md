# Issue 39 discovery: rename flicker and undo queue order

## Files that change
- `src/lib/features/event-calendar/event-calendar-event.logic.ts:436-446` `prunePending`: a settled `create` WITH a version clock prunes only when the snapshot event at its path has its state (`sameEventState`), else on the clock (`settledAtVersion + 2`). A `create` without a clock (the one `remapPath` leaves for an outside rename) keeps the old rule: prunes once its path is present. JSDoc updated.
- `src/lib/features/event-calendar/event-calendar.service.ts`
  - `:369-373` failure after rename: the rename-only `create` gets `settledAtVersion`.
  - `:379-384` success after rename: `settlePending(target, version)` on the `create` put at `:347` (keeps `renamedEvent`, so snippet and readOnly stay), instead of a clockless settled `create`. Matches the ticket 17 contract (settle at `to`).
  - `:180-248`, `:451-502` undo order: a module `intake` chain plus `intakeDepth`. `applyHistory` takes its turn on the intake (gated on `historyTail` as today); while any intake turn is outstanding, `enqueue` (public writes) also goes through the intake, so a write started after Cmd+Z claims its path slot only after the undo has claimed its own. With no intake turn outstanding, `enqueue` claims synchronously as before. `applyHistoryNow` claims its path directly (`claimPath`), since it already runs at its turn. `drainEventCalendarWrites` awaits `intake` first.
- Tests: `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (editEvent, undo describes), `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts` (`prunePending`).

## Plan
1. Prune rule + service settle with clock (fix 1), test-first: stale-index refresh after an edit rename, after an undo rename, plus snippet/readOnly through the stale refresh, plus prunePending unit cases.
2. Intake ordering (fix 2), test-first: Cmd+Z then an immediate drag on the same event.

## Prior art
- Stale-snapshot shape: `prunePending` test "a settled update plus a newer snapshot with old values does not prune at +1, prunes at +2".
- Service harness: `calendar writes` fake disk; stale index simulated by overriding the `get_all_vault_entries_v2` mock for one refresh.

## Risks
- Deadlock in intake: undo claims wait only on earlier intake turns and `historyTail`; path tasks never wait on the intake. No cycle.
- A write deferred behind the intake must keep the generation of its call time (captured before deferral).
- Writes on other paths wait for an in-flight undo turn (one undo write at most). Accepted for ordering correctness.

## Defaults taken
- Clockless `create` (outside rename via `remapPath`) keeps path-present pruning: its title may legitimately differ from the snapshot (filename-derived title), so a state check would hold it forever.

## Fail-without-fix evidence
(filled in at implement)
