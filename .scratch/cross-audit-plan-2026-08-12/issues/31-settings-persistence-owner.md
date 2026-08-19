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


### 31B (duplicated persistence duty deleted) — 2026-08-19

**Red-green.** 31B is a pure behaviour-preserving deletion, so there is no honest red test for it:
every parity assertion below is green before AND after the deletion, because the pre-31B tree wrote
the same bytes twice (explicit `saveSettings` + the 31A effect). Two substitutes were run instead.

- *Repo-wide caller trace.* After the deletion, `grep -rn saveSettings src/ e2e/ docs/ CLAUDE.md`
  returns only the four load-time bootstrap saves inside `settings.service.ts` (:38 no-file branch,
  :48 empty-file branch, :166 merged-defaults, :175 parse-failure — all run before
  `startSettingsPersistence`), the exported function itself, and its own suite. `grep -rn onchange
  src/ e2e/` returns only DOM `onchange` attributes (`ThemeEditor`, `HeadingTypographyEditor`'s
  `<select>`, kanban, graph-view, collection, properties) and `ThemeColorRow`'s unrelated
  `(v: string) => void` prop. Zero consumers left for either deleted duty.
- *Mutation probe (the non-vacuity proof).* With the deletion applied, an early `return` was
  injected into `startSettingsPersistence`. Result: **10 assertions across 3 files went red** —
  `layout.service.test.ts` 5, `global-keybindings.test.ts` 3, `update-check.service.test.ts` 2
  (`AssertionError: expected 0 to be greater than 0`, i.e. `writeTextFile` never called). Probe
  reverted: 59/59 green in those three files. The parity suite is not vacuous — it now depends on
  the effect and nothing else.

**Gate.** `pnpm check` 191 files / 0 errors / 0 warnings. `pnpm vitest run` 285 files, 6367 passed,
1 todo, 0 failed. `pnpm build` built in 4.65s, adapter-static wrote `build`. No e2e collateral was
touched, so `scripts/e2e.sh` was not run.

**Load-bearing finding: `$effect.root` needs the jsdom environment, silently.** `update-check.service.test.ts`
ran under the default node environment. Its rewritten persistence assertions passed there — but only
because the *old* `saveSettings` call was still writing; the effect never fired at all. The tell was
the disk-full case, which expects the persistence owner's own log line and stayed red. Adding
`// @vitest-environment jsdom` made it pass. Any future test that asserts persisted output MUST
declare jsdom, or it will pass for the wrong reason today and go red the moment the last explicit
save is removed. `layout.service.test.ts` was written jsdom for the same reason;
`global-keybindings.test.ts` already was.

**Census, verified against the tree at deletion time.** 17 components carried the prop (16 sections +
`HeadingTypographyEditor`) with **58** `onchange()` call sites between them; 16 `onchange={debouncedSave}`
pass-throughs in `SettingsPanel` plus the single `{onchange}` forward at `EditorSection`; **14**
non-panel `saveSettings` call sites over **8** modules; **18** `expect(saveSettings)` assertions over
4 test files plus one unused mock entry in `command-palette.service.test.ts`. The issue's "13 imports /
~14 assertions" was wrong in both directions; discovery's corrected figures held exactly.

**Orphans removed (all created by this deletion, none pre-existing).** `layout.service.ts` lost
`saveSettings` + `vaultStore` + `error` and is now three store mutations with no I/O.
`global-keybindings.ts` lost `saveSettings` and then `vaultStore` — its only two `vaultStore` reads
lived inside the deleted save lines, an orphan the issue's file list did not anticipate. `AppShell.svelte`
and `TagsView.svelte` each lost `saveSettings` + `debounce` + `error` along with their local 300 ms
`debouncedSave`. `SidebarModeToggle.svelte` lost `saveSettings` + `vaultStore`, which also removes the
only bare `console.error` in the settings surface. `update-check.service.ts` lost `saveSettings` +
`vaultStore` and is now check + record + toast. `SettingsPanel.svelte` lost `onDestroy`, `saveSettings`,
`vaultStore`, `debounce` and `error`.
`command-palette.service.ts` lost `saveSettings` and then the `error` import from `$lib/utils/debug`:
its only three uses were the `.catch((err) => error('CMD-PALETTE', ...))` tails of the deleted saves,
and every remaining `error(` in that file is `toast.error`. `pnpm check` does not flag it (the tsconfig
sets no `noUnusedLocals`), so it had to be caught by reading.

**Accepted behaviour deltas.** Pane resize (`AppShell`) and the tag colour picker (`TagsView`) move
from a 300 ms local debounce to the owner's 500 ms window. Every keybinding, command-palette and
sidebar-mode toggle moves from an immediate write to a 500 ms debounced one; the hard-quit window
that opens is exactly what 31A's `flushSettingsPersistence()` in `registerCloseHandler` closes.
`SettingsPanel`'s `onDestroy` flush is gone on purpose: the debounce is now process-lifetime, not
panel-lifetime, so closing the panel no longer has anything to flush.

One further delta, accepted rather than fixed: the two deleted `await saveSettings(vaultPath)` calls in
`initializeVault`'s deferred semantic-search tail (`app-lifecycle.service.ts`, model-missing branch and
init-failed catch) are covered by the live owner in every ordinary case, but not in one microsecond-wide
race. During a vault switch A to B, `initializeVault(B)` calls `stopSettingsPersistence()` before
`saveAllDirtyTabs()`, and `teardownVault` bumps `initVersion` only after that await. If A's ONNX init
resolves inside that window the version guard still passes, `updateSearch({ semanticSearchEnabled: false })`
runs, and A's session is already stopped, so the flag is written nowhere. Consequence is self-healing:
the next open of A re-runs the failing init and re-shows the same toast once, where before the flag was
persisted false. Reordering `initializeVault` so the stop rides along with teardown's version bump would
close it, but that is issue-30 surface, not 31B's.

**Assertion rewrites (none deleted, per the issue's rule).** `layout.service.test.ts` (8),
`global-keybindings.test.ts` (5), `update-check.service.test.ts` (4) now start the persistence owner,
invoke the action, advance past the debounce and parse the JSON handed to `writeTextFile`, asserting
both the target path and the new flag. Their "does not persist when no vault is open" cases became
"persistence was never started, so nothing is written". `app-lifecycle.service.test.ts` (1) mocks
`settings.service` wholesale so persisted output is not observable there; it asserts
`startSettingsPersistence` was called with `/vault` alongside the real store assertion.
`command-palette.service.test.ts` just drops its unused mock entry. The `AUTO-UPDATE / Failed to
persist lastCheckedAt` error case moved to the owner's own log line (`SETTINGS / Failed to persist
settings:`); the equivalent disk-full coverage already exists in `settings-persistence.test.ts`.

**Plan discrepancies.**
- Orchestrator estimated one commit for issue 31; the issue's own Gate line requires the spike commit
  to be separate, so 31 shipped as two (4e0c3d17 + this one). Issue wins.
- The playbook (`issues/CLAUDE.md` step 2) claim "this repo has no component-rendering tooling" is
  stale: `vitest.config.ts:15` sets `conditions: ['browser']` precisely so `mount()`/`flushSync()`
  work, and two suites already mount real components. It did not matter for 31B (no section has a
  test), but issues 32 and 33 can mount the now prop-free sections directly.

**Follow-up candidates (not this issue).**
- `writeSettingsFile` remains the single stringify-plus-write site and still normalizes nothing —
  that is the seam issue 33.2 needs.
- `e2e/specs/sidebars.spec.ts:63-69` is now the ONLY end-to-end guard that a settings mutation reaches
  disk. It was deliberately left untouched; its `expect.poll` default of 5 s absorbs the 500 ms
  debounce. Worth keeping in mind before anyone trims that spec.
- `settings.service.ts`'s four bootstrap saves are the last hand-copied persistence calls in the tree.
  They are correct (they run before the owner exists) but a future reader will ask; a one-line comment
  on each would pay for itself.
