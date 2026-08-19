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

### 31A (persistence owner added, explicit saves still in place)

- **Spike PASSES.** `$effect.root` + `$effect` in a `.svelte.ts` module is unit-testable under
  vitest + jsdom with this repo's `conditions: ['browser']`: it fires on start, re-fires on store
  reassignment, tracks deep mutation because `JSON.stringify` inside the effect reads every leaf,
  and goes silent after the returned disposer. `src/tests/lib/core/settings/settings-persistence.test.ts`
  IS the spike, so the STOP clause above does not trigger and the 31 -> 32 -> 33 chain proceeds.
- **Runes do not compile in plain `.ts`.** The issue says "add `startSettingsPersistence()` in
  settings.service". `settings.service.ts` is a plain `.ts` with ~20 importers, and
  vite-plugin-svelte only compiles runes in `.svelte` / `.svelte.[jt]s`. The owner therefore lives in
  a sibling `src/lib/core/settings/settings-persistence.svelte.ts`. Same module, smallest diff, and
  it keeps side effects out of `settings.store.svelte.ts` per the stores convention.
- **Census in the issue is off.** Not "13 non-panel `saveSettings` imports": 8 import statements over
  8 modules with 14 non-panel call sites. Not "~14 mocked-saveSettings assertions": 18 across 4 test
  files, plus a 5th file (command-palette) carrying an unused mock entry. Budget 31B for 18.
- **Teardown hazard points at the OLD vault, not the new one.** `teardownVault()` has exactly one
  `src/lib` caller, inside `initializeVault` of the NEXT vault, so `vaultStore.path` already points at
  the new vault when it runs. The effect therefore closes over the `vaultPath` handed to
  `startSettingsPersistence` and never reads `vaultStore`, and `stopSettingsPersistence()` runs well
  before `resetSettings()`.
- **Rapid double-switch needs a second stop.** `initializeVault` only reaches `teardownVault()` inside
  `if (unsubscribeFileChange)`, which is still null while an earlier init is between Step 1 and Step 7.
  Without an unconditional `stopSettingsPersistence()` at the very top of `initializeVault`, the
  previous vault's session survives the next `loadSettings`, and the restart flush writes the NEW
  vault's settings (Todoist token included) into the PREVIOUS vault's `settings.json`. Fixed by
  stopping unconditionally next to `vaultStore.resetIndexReady()`, where the store still matches the
  captured path so the flush is a no-op or a correct write.
- **Follow-up candidate (not 31A):** `writeSettingsFile` is now the single stringify-plus-write site,
  which is what issue 33.2 needs for normalization. Nothing normalizes there yet.

