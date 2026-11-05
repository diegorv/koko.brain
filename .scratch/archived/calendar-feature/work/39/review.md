VERDICT: CHANGES_REQUESTED

# Review: Issue 39, write service rename flicker and undo queue order

Reviewed `git diff main...HEAD` (base 43dc6ead, HEAD 02e841cd) in the worktree. Source files changed: `event-calendar.service.ts`, `event-calendar-event.logic.ts`. Test files changed: `event-calendar.service.test.ts`, `event-calendar-event.logic.test.ts`.

## What I ran (my test verdict rests on these)

- `vitest run src/tests/lib/features/event-calendar/` (11 files): 456/456 passed.
- Consumer tests: `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` and `src/tests/lib/features/command-palette/command-palette.service.test.ts`: 84/84 passed.
- `pnpm check`: 0 errors, 0 warnings.
- Red probe A: both source files set back to base 43dc6ead, then `event-calendar.service.test.ts` + `event-calendar-event.logic.test.ts` run: 8 failed / 138 passed. The 5 fix-1 tests and the 3 fix-2 tests (including the drain test) failed.
- Red probe B: service at f578bf14 (fix 1 only), logic at HEAD: 3 failed / 143 passed. "Cmd+Z then an immediate drag" and "a drag started after the second of two quick undos" returned `{ status: 'refused' }`. "drainEventCalendarWrites waits for a write queued behind an undo" failed with `expected true to be false`.
- Red probe C: HEAD with `await intake;` removed from `drainEventCalendarWrites`: the drain test fails.
- Mutation probe D: HEAD with `settledAtVersion: vaultStore.vaultIndexVersion,` deleted from the failure branch (`event-calendar.service.ts:419`): all 456 tests still pass (finding 1).
- I restored every probe with `git checkout HEAD -- <file>`. `git status` was clean after each one.

## Acceptance criteria

- [x] **Met.** Edit that renames and changes the time, run through a stale refresh (new path, old fields), keeps the new time. The overlay goes once the snapshot shows the written state or the clock expires. Fails on 4e07625f. Evidence: `event-calendar.service.test.ts` "keeps the written time after a rename while the index still shows the old fields, until it catches up" and "drops a renamed overlay on the version clock when the index never shows the written state". Both failed in probe A.
- [x] **Met.** Same test for an undo that renames. Evidence: "keeps the undone time after an undo that renames while the index still shows the old fields". It failed in probe A. Redo shares `applyHistoryNow`/`writeEvent` and has no test of its own, which is acceptable.
- [x] **Met.** The renamed overlay keeps its snippet and `readOnly`. Evidence: the rename test asserts `snippet: 'Body', readOnly: false` through the stale refresh. The existing read-only Retreat test gained a stale-refresh step that asserts `readOnly: true` (it failed in probe A).
- [x] **Met.** Cmd+Z then an immediate drag: the undo applies first, then the drag, and nothing returns `refused`. Fails on 4e07625f. Evidence: "Cmd+Z then an immediate drag on the same event: ..." returned `refused` in probe B.
- [x] **Met.** Ticket 24's tests from 4e07625f still pass: two quick undos, undo after reset (`empty`), failed undo after a rename, the renamed read-only overlay, and deleted-on-disk `missing`. Evidence: the event-calendar folder is green, 456/456.
- [~] **Partly met.** Each new test was shown to fail without its fix, and discovery.md records it. My probes confirm every new test is red without its fix. One discovery.md claim is wrong, though: it says the drain test "passes on the old code". It fails on both 43dc6ead and f578bf14 (finding 2). The `await intake` removal check it reports does hold (probe C).
- [ ] **Not yet.** Gate green, one commit. The full gate belongs to deliver. Commits: two fix commits plus two docs commits, not "one commit". This follows the workflow rule of one commit per task, so it is not a finding. Both fix commits follow docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with ranges, Co-Authored-By).

PRD/plan decisions and CLAUDE.md rules:
- **Ticket 17 store contract:** writeEvent now settles at `target` through `settlePending` (`event-calendar.service.ts:427-430`). The clockless `create` from `remapPath` keeps the path-present rule (`event-calendar-event.logic.ts:443`). This matches the `settlePending`/`remapPath` JSDoc in `event-calendar.store.svelte.ts:128-165`.
- **Rules followed:** no layer violations, no mocked stores or logic, JSDoc on every new helper, tabs throughout. Error handling is unchanged.
- **Deadlock:** I traced the intake for cycles. An undo turn waits only on earlier turns and on `historyTail`. Path tasks never wait on the intake, and a deferred write claims its path only after the undos ahead of it have claimed theirs. I found no cycle.

## Findings

1. **Low-medium (missing test): the failure-branch clock is untested.** Where: `src/lib/features/event-calendar/event-calendar.service.ts:414-420`. The diff adds `settledAtVersion` to the rename-only `create` that is left when the field write fails after a rename. This changes behavior. That overlay used to stay until `target` appeared in a snapshot, with no expiry. It now prunes on a state match, or at `settledAtVersion + 2`. Mutation probe D deletes the line, and all 456 tests still pass. The Issue names this branch explicitly (":369"), and CLAUDE.md says every changed behavior needs a test. **Fix:** in `event-calendar.service.test.ts`, extend "records only the rename when the field write fails after it" (line 874), or add a sibling test. After the rejected `editEvent`:
   - `refreshWith` a snapshot that lacks `Daily sync`: the overlay stays pending.
   - Refresh twice with that snapshot: the clock expires and the overlay is gone.
   - Alternatively, `refreshWith` the renamed note with its old fields: it prunes on the state match and shows start 570.

   The test must fail with the line removed.
2. **Low (record accuracy): discovery.md misstates the drain test's old-code result.** Where: `.scratch/calendar-feature/work/39/discovery.md`, "Fail-without-fix evidence", Fix 2 bullet. The record says the drain test passes on the old code. Probes A and B show it fails on both 43dc6ead and f578bf14 (`expected true to be false`). On the old code the drag claims the path first and takes the write-through mock, so the drain is not held. **Fix:** correct the sentence: the test fails on the old code too, and the `await intake` removal check is the targeted evidence that the intake await matters.
3. **Info (no change required): writes on other paths can wait behind an undo.** Where: `event-calendar.service.ts:279-283` (`enqueue`) and `:503-511` (`applyHistory`). While an undo turn is outstanding, writes on unrelated paths also defer through the intake. Their optimistic overlay (`putPending` runs inside the task) appears only after the undo turn, and that turn waits on `historyTail`, which is the previous undo's full disk write. After two quick undos, a drag on another event can therefore snap back for the length of one write. discovery.md "Risks" accepts this for ordering correctness, and I agree it is acceptable. If it shows in use, the follow-up is to defer only writes on the undo's path. That path is not known before the turn runs, so it would need the op peeked at call time.

## Resolution

1. Fixed. Added "drops the rename-only overlay of a failed field write on the version clock" to `event-calendar.service.test.ts`: after the rejected `editEvent`, a refresh whose snapshot lacks `Daily sync` keeps the overlay pending at start 570, and the second refresh expires the clock and drops it. Mutation probe D (the `settledAtVersion` line deleted) now fails this test with `expected true to be false`.
2. Fixed. discovery.md now says the drain test fails on the old code too, and keeps the `await intake` removal check as the targeted evidence.
3. Accepted as is, no change (Info). Deferring only writes on the undo's path would need the op peeked at call time; left as a follow-up if the delay shows in use.
