# 16: Define and enforce external-change protection for task writes

**What to build:** Task read-modify-write operations detect or preserve competing external edits under an explicit, testable concurrency contract.

**Blocked by:** none
**Files:** src-tauri/src/commands/vault.rs, src-tauri/src/utils/fs.rs, src-tauri/src/vault/parsing.rs, src-tauri/src/vault/task_lines.rs, src/lib/features/tasks/tasks.service.ts, src/lib/features/todoist-sync/closed-note-writer.service.ts, src-tauri/tests/vault_task_test.rs, src-tauri/tests/vault_task_text_test.rs, src-tauri/tests/vault_task_lines_test.rs, src/tests/lib/features/tasks/, src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts
**Status:** needs-triage
**Priority:** P1
**Gate:** Both.

## Confirmed problem

Task status/text/batch edits can read A, then replace an externally written B with a task-modified A. Atomic replacement prevents partial files, not lost updates.

## Decision required

Policy decision required before implementation.

Choose bounded detection/refusal for changes observed before commit, or a stronger independently verified preservation mechanism. A reread, hash comparison, or application-local lock must not be described as compare-and-swap against arbitrary writers.

## Proposed acceptance criteria

- [ ] Record the approved concurrency guarantee and the remaining independent-writer interval.
- [ ] Pause the actual task flow after its initial read, write B to a real temporary file, resume, and verify the approved refusal/preservation outcome.
- [ ] Cover status, text, and task-line batch writers, including changes unrelated to the task line.
- [ ] Refused writes leave B untouched and do not publish successful task/index state.
- [ ] Preserve current stale-task and no-change behavior.
- [ ] Test an external write after the final comparison as a limitation case rather than certifying a false guarantee.
- [ ] Use real transformations, files, and index state with deterministic scheduling; do not rely on the stochastic ignored demonstrator as a regression gate.
- [ ] Decide whether safe refresh/retry is manual or automatic before marking ready.

## Provenance

Separate from frontend response settlement in 06. [Evidence](../evidence.md#external-writers).

## Comments
