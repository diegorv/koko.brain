# Issue 31: Settings persistence owner

Status: ready-for-agent
Phase: P3 Track D step 2 (cluster C09/C10)
Source: ARCH 4.0 (Strong) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track D — Settings)
Blocked by: 01-sidebar-layout-persistence, 14-settings-surface-deletions

## What

Make persisting settings a property of the settings module instead of a duty copied across every
mutation site. Mutating the store *is* persisting, so a forgotten save call can never again produce a
persistence bug (the class of bug LB4 belonged to).

## How

- **MANDATORY FIRST STEP — spike:** prove `$effect.root` is unit-testable in vitest. There are **zero
  existing uses in `src/`**, and **ADR-0005/0006 warn that rune scheduling misbehaves outside a
  mounted tree**. **If the spike fails, STOP: set this issue's `Status: needs-info` and record the
  findings in Comments.** Do not claim the test win before the spike passes.
- Delete `onchange` from **all 17 sections** + the **13 non-panel `saveSettings` imports**.
- Add `startSettingsPersistence()` in `settings.service` via `$effect.root`, started/stopped by
  `initializeVault` / `teardownVault`, with an explicit `flush()` on quit. **Serialize inside the
  effect.**
- **Teardown suppression is load-bearing:** vault-switch teardown must not write defaults into the
  NEW vault. Pin it with a test.
- Budget the **~14 mocked-`saveSettings` assertion rewrites** — rewrite them against persisted
  output, do not delete them.
- Census is **9 modules, not 10** (post-B1, issue 14).
- This **supersedes** issue 14's #47 second comment fix: it also deletes `update-check.service.ts:4`
  and `:66-70`. Not a conflict — a supersede.

## Gate

Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit (spike commit
separate from the refactor). Stage only this step's files, verify with `git diff --cached --stat`,
and use the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
