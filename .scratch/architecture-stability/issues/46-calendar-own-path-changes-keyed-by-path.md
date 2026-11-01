# 46: `ownPathChanges` is keyed by path, so an outside rename onto that path during the Calendar's delete is skipped

**What to build:** `ownPathChanges` (event-calendar.service.ts, around :365 and :553-580) marks the calendar's own rename or delete by path. While the calendar's own delete of `A` is in its path-change tail, an outside rename of another note onto `A` reaches `followPathChange` with `from` or `to` matching a marked path and is skipped, so the store does not follow the outside change.

Key the marker to the change itself (not the bare path), then lift the model test's limit that an outside change starts only once the previous path change settled.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** Issue 14 (calendar write queue model test, branch `issue/14-calendar-write-queue-model-test`): the unrestricted random runs of `src/tests/lib/features/event-calendar/event-calendar.model.test.ts` reached this race; the generator now excludes it (see that file's header). Code: `src/lib/features/event-calendar/event-calendar.service.ts`.

- [ ] A failing named sequence reproduces it first (calendar delete with its tail held, an outside rename onto the deleted path)
- [ ] After the fix the outside change is followed and the store equals the vault after drain + bump
- [ ] The matching generator limit is lifted

## Notes

- **Not checked:** in the running app; found by the model test only.
