# 71: Clockless delete tombstones hide a restored or renamed-back event for the session

**What to build:** a `delete` tombstone in the Calendar's pending overlay always carries a settle clock, so a note that comes back at the same path (restore, `git checkout`, rename undone) is shown again once the index catches up, instead of staying hidden until the vault is reopened.

**Blocked by:** None

**Status:** ready-for-agent

- Found by the post-merge adversarial review of 90f794cc (issue 49 fix); both cases reproduced with throwaway store tests.
- Root cause: `prunePending` (`event-calendar-event.logic.ts:467-468`) drops a settled `delete` only when a snapshot lacks its path; a tombstone with no `settledAtVersion` is kept forever while the path is in the index. The Calendar's own deletes get a clock from `settle` (store `:147`); the new tombstones do not.
- **High:** outside delete then restore within the throttle window (~2 s isolated, up to 10 s in a burst). `event-calendar.service.ts:575` puts `{ kind: 'delete', path, settled: true }` without `settledAtVersion`. The restore goes through `applyNoteChange('restore')`, not the path-change consumers, so nothing clears it. Fix: stamp `settledAtVersion: vaultStore.vaultIndexVersion`.
- **Medium:** outside rename A->B then B->A before a bump. Store `remapPath` (`event-calendar.store.svelte.ts:184-199`) leaves a clockless `delete` at A; the second remap sees `pending.has(A)`, creates no overlay at A and only tombstones B. The calendar's own rename-and-back has the same shape. Fix: clock every tombstone `remapPath` creates, and let a remap back onto a tombstoned path clear it.

- [ ] Failing store/service tests first for both scenarios (snapshots that keep the path for several versions)
- [ ] Every `delete` tombstone carries `settledAtVersion`; the rename-back case shows the event at A
- [ ] `e2e/specs/event-calendar-path-identity.spec.ts` still passes

## Comments

- 2026-10-28 20:47 — discovery — plan in work/71/discovery.md: clock every delete tombstone (service outside delete, store remapPath with a version arg) and let a remap replace a tombstone at `to` — cb258fca
- 2026-10-28 20:49 — implement — every delete tombstone carries settledAtVersion; remap back onto a tombstone shows the event; event-calendar vitest 24 files / 933 passed, pnpm check 0 errors — 83c7896a
- 2026-10-28 20:53 — review — CHANGES_REQUESTED: the rewritten 'ignores settlePending on the tombstone' test no longer tells re-clock from keep (medium); 3 low notes in work/71/review.md — f388736b
- 2026-10-28 20:54 — fix — review findings 1-2 fixed with tests that kill both mutants, 3 noted in JSDoc, 4 kept as is; event-calendar vitest 24 files / 934 passed, pnpm check 0 errors — cad3941a
