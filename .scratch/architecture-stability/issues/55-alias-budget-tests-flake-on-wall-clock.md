# 55: The alias-budget tests flake on a wall-clock bound

**What to build:** Issue 43 (squash 7006c723) pinned the alias copy budget with five tests in `src/tests/lib/features/properties/properties.logic.test.ts:338-395` (`describe('alias copy budget')`). Each measures `performance.now()` around one parse and asserts `elapsed < 2000`. On 2026-11-01, during Issue 27's deliver with three relay workflows running suites at once, one of them took 4092 ms and failed the full suite (log `brain.worktrees/test-logs/architecture-stability/27-deliver-rebased.log`); alone it passes. A wall-clock bound on a loaded machine fails at random and can block any Issue's delivery.

A second case of the same class: during Issue 10's deliver (same day), `src/tests/help/queryjs-globals.test.ts` hit vitest's default 5 s per-test timeout under full-suite load and passed alone in 2.1 s (log `brain.worktrees/test-logs/architecture-stability/10-deliver.log`). Include it: find what makes it slow (it likely type-checks or evaluates every help example) and give it an explicit timeout sized for a loaded run, or make it cheaper.

The tests guard a real regression: before Issue 43 the same inputs took 21 s to 543 s, so the bound only needs to tell "linear" from "super-linear". Options, owner to pick at triage:
- (A) Count work instead of time: expose a test-only counter of copied nodes / alias resolutions from `properties.logic.ts` (or spy on the walk) and assert it stays linear in the input, with no timer.
- (B) Keep the timer and raise the bound (for example to 10 s, still far below the 21 s the smallest old case took), and move the five cases into their own file so they do not compete with the rest of the suite.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

**Source:** Issue 27 deliver report, 2026-11-01. `src/tests/lib/features/properties/properties.logic.test.ts:338-395`.

- [ ] The five alias-budget cases no longer depend on a 2 s wall-clock bound under load (chosen option recorded in the commit)
- [ ] Each case still fails against the pre-Issue-43 alias pass (check with a scratch revert, not committed)
- [ ] `queryjs-globals.test.ts` passes under full-suite load (cheaper, or an explicit timeout with the reason in a comment)

## Notes

- Changing a test threshold needs the owner's approval (CLAUDE.md), which is why this is an Issue and not a deliver fix.
- **Size:** S.
