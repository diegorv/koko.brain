# Issue 30: Move the +layout init tail into initializeVault

Status: ready-for-agent
Phase: P3 Track D step 1 (cluster C10)
Source: ARCH 3.0 (narrowed) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings)
Blocked by: 13-editor-save-deletions, 14-settings-surface-deletions

## What

Move **only** the two post-open side effects out of `+layout.svelte` and into `initializeVault`, so a
rapid vault switch fires update auto-checks and daily-note opening once, for the vault that actually
opened. Narrowed scope: nothing else moves.

## How

- Move **only** `autoOpenDailyNote` + `maybeAutoCheckForUpdates` into `initializeVault`, **after Step
  8**, **behind the `initVersion` guard**, keeping the **same `setTimeout(..., 0)`**.
- Delete `+layout.svelte:65-84`, **including the third stale throttle comment at `:76-80`** that
  neither audit listed.
- **Preserve the `loadSettings` rejection path and its toast** — it is not part of the move.
- **Rewrite arch 3.0's rationale post-#55** (issue 13 step 4): the `closeVault` collision story is
  gone; keep only the "already implemented and tested" leg. Do not carry the stale rationale into the
  commit message.
- Test collateral in the same commit: assert the two effects fire once per opened vault under the
  `initVersion` guard, and that the `loadSettings` rejection path still surfaces its toast.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before the commit. Stage only the
files for this step, verify with `git diff --cached --stat`, and commit using the repo's full commit
format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
