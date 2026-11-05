VERDICT: CHANGES_REQUESTED

# 61 review: no calendar write lands on disk without its index update across a vault switch

Reviewed `git diff main...HEAD` at c2dc5917 (b5200f28, 13822922, c2dc5917).

## Test verdict rests on

Run by the reviewer in the worktree:

- `src/tests/lib/core/vault/vault.service.test.ts`
- `src/tests/lib/features/deep-link/deep-link.service.test.ts`
- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts`
- `src/tests/lib/core/app-lifecycle/` (includes the ticket 25 order test)
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts`
- `src/tests/lib/features/properties/frontmatter-write.service.test.ts`

14 files, 604/604 passed. `pnpm check`: 0 errors, 0 warnings.

A temporary probe test was added to `event-calendar.service.test.ts`, run, and reverted (the worktree is clean). It is the basis of finding 1.

## Acceptance criteria

- [ ] **A write still in flight at a vault switch either updates the old vault's index or is refused before writing. Failing test first.** Partly met. A write that was already queued when `switchVault` started is covered. The new test at `event-calendar.service.test.ts:1197-1219` shows the move resolving, `update_note_in_index` running while the path is still `/vault`, and only then the switch to `/other`. The build report says the test was red before the fix. A write enqueued while the drain is running is not covered: the probe in finding 1 shows it reaching disk with no index update, which is the bug this Issue describes.
- [x] **Chosen fix applied; ticket 25 order tests stay green.** Met. `switchVault` is in `vault.service.ts:15-18`, and the dialog, recent and deep-link callers use it (`vault.service.ts:24,46`, `deep-link.service.ts:138`). The initializeVault drain stays (`app-lifecycle.service.ts:182`). The app-lifecycle and tauri-listeners suites pass.

## Other checks

- Layer rules: the new core-to-features import (`vault.service.ts:4`) follows the precedent in ADR 0032, and the ADR table now lists it at the correct line. No import cycle: nothing that `event-calendar.service` imports reaches `vault.service` or `deep-link.service`.
- Tests exist for every changed source file (vault.service, deep-link.service, event-calendar via the integration test). The app-lifecycle change is a comment only. Mocking `event-calendar.service` in the vault and deep-link suites is allowed, because it is a side-effect service and not a store or a `.logic.ts` file.
- Scope: the openers in `vault.service.ts` can only run when no vault is open, because `+page.svelte` renders only under `{#if !vaultStore.isOpen}` (`AppShell.svelte:83`). The deep-link switch is therefore the only live path where a write can be in flight. The opener changes are harmless and the Issue asked for them, so this is not scope creep.
- The commit follows docs/COMMITS.md and has the required trailer.

## Findings

1. **Medium: `src/lib/features/event-calendar/event-calendar.service.ts:482-486` (used by `src/lib/core/vault/vault.service.ts:16`).** A write enqueued while the drain runs still lands on disk without its index update. The residual is the whole drain duration, not only the "microtask gap" that discovery.md and the build report describe. `drainEventCalendarWrites` snapshots `writeTails` after `await intake` and waits only for that snapshot.
   Probe:
   1. Hold a `moveEvent` on closed note `Standup`.
   2. Start `switchVault('/other')`.
   3. Hold a second `moveEvent` on a different closed note, `Retro`, and release `Standup`.
   4. Result: the path became `/other` while Retro's `writeTextFile` was already running (2 writes started). Retro's new bytes reached disk, the move rejected with `vault-changed`, and `update_note_in_index` ran only for Standup.

   A write to the same path is refused before writing, because it queues behind the snapshot tail and its post-read `assertVault` fails. A write to a different path is not refused.
   **Fix:** make the drain wait until the queue is idle. One option is to loop in `drainEventCalendarWrites` until, after an await, `intakeDepth === 0`, `writeTails.size === 0` and `historyTail` has settled; `holdPath` already deletes settled tails. `switchVault` then calls `vaultStore.open` in the same microtask chain, so no user-triggered write can enqueue in between. Add a regression test in the "write queue" block: write B on another closed note, enqueued during `switchVault`'s drain, either indexes in `/vault` or is refused before writing. Then update the `app-lifecycle.service.ts:177-181` comment, the residual in discovery.md and the commit Behavior text.
2. **Low: `src/tests/lib/core/vault/vault.service.test.ts:91-97`.** The test "propagates a drain failure and keeps the current vault" exercises a case the code rules out: `drainEventCalendarWrites` is documented as "Never rejects" (`event-calendar.service.ts:479-480`), and its own test checks that. The commit's Behavior line repeats the claim. **Fix:** drop the test, or rename it so it does not describe a real failure mode, and drop "A drain failure propagates" from the next commit's Behavior.
3. **Low (optional): `src/lib/features/deep-link/deep-link.service.ts:137-138`.** `switchVault` now yields while a calendar write is in flight. A second different-vault deep link arriving in that window overwrites `pendingAction`, so the first action is lost. Before this change, the path changed synchronously and the second link to the same vault ran at once. This needs two deep links during one calendar write, so it is unlikely. **Fix (optional):** note it in discovery.md, or queue pending actions. No change is needed for this Issue.

## Resolution

1. Fixed. `drainEventCalendarWrites` loops until the queue is idle (`intakeDepth === 0`, `writeTails` empty, `historyTail` unchanged). Regression test "switchVault also waits for a write to another closed note enqueued while it drains" (write queue block) was red before the fix (path became `/other` while Retro's write was held) and is green after. The app-lifecycle comment and the discovery residual are updated.
2. Fixed. The "propagates a drain failure" test is dropped.
3. Accepted and documented in discovery.md (Risks); pending actions are not queued.
