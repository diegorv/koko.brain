# 14: Recover remote task completion after a duplicate-anchor freeze

**What to build:** Removing a duplicated task anchor resumes reconciliation without losing remote completion changes received while that task was frozen.

**Blocked by:** none
**Files:** src/lib/features/todoist-sync/sync-now.service.ts, src/lib/features/todoist-sync/completion.logic.ts, src/lib/features/todoist-sync/todoist-sync.store.svelte.ts, src-tauri/src/db/todoist_repo.rs, src/tests/lib/features/todoist-sync/sync-now.service.test.ts, src/tests/lib/features/todoist-sync/completion.logic.test.ts, src/tests/fixtures/todoist-sync.fake.ts, src/tests/fixtures/todoist-vault.fake.ts, src-tauri/tests/todoist_state_test.rs
**Status:** ready-for-agent
**Priority:** P2
**Gate:** Frontend with consecutive production sync cycles.

## Reproduction

Sync an open nonrecurring task, duplicate its anchored line, complete it remotely, sync while duplicated, remove the duplicate, and sync again. The checkpoint can advance past the completion and leave the surviving local task open indefinitely without a further remote change.

## Acceptance criteria

- [ ] While duplicated, preserve the documented freeze: no task-line write or task command for that anchor.
- [ ] After one copy remains, the completion received during the freeze reaches the surviving line.
- [ ] Recovery survives restart and multiple frozen cycles.
- [ ] Already-applied commands are not duplicated during replay/recovery.
- [ ] Preserve ADR-0037's merge, conflict, and detach policies.
- [ ] Persist enough checkpoint or deferred-state information to recover; the choice is an implementation detail, not permission to lose changes.
- [ ] Run consecutive real orchestration cycles with real stores and the repository protocol fixture, checking persisted checkpoint/link state and actual note content.
- [ ] Describe the guarantee as eventual recovery after unfreezing, not deletion or loss of the remote task.

## Provenance

New follow-up to delivered freeze and two-way completion tickets, which did not cover replay after unfreezing. [Evidence](../evidence.md#todoist-freeze).

## Comments
