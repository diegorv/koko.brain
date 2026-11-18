VERDICT: APPROVED

Re-review, round 2, of the fixes after `.scratch/ux-quick-wins/work/22/review.md` was first committed (`git diff 7dd5b287d..HEAD`, one commit: 14b49e3d0). Changed files: `src/lib/app/LabsSection.svelte`, `src/tests/lib/app/LabsSection.test.ts`, `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`, plus the review file's Resolution.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `LabsSection.svelte` start-failure `.catch` called `setEnabled(false)` before `stopModsHost()`, so a throwing localStorage write skipped the stop and left an unhandled rejection | resolved | `LabsSection.svelte:30-39`: `stopModsHost()` now runs first, then `setEnabled(false)` inside a try/catch that logs via `error()`. `stopModsHost` (`mods-host.service.ts:1142-1157`) is sync and detaches `unsubscribeFileChange`. New test `LabsSection.test.ts:138-155` makes `Storage.prototype.setItem` throw after the click (so only the off-write fails) and asserts `stopModsHost` ran once. Red probe: with `LabsSection.svelte` from 7dd5b287d, that test fails (1 failed, 8 passed, exit 1); on HEAD it passes. Worktree restored, clean. |
| 2 | nit | `PeriodicNotesSection.test.ts` found Auto-open by switch order | resolved | `PeriodicNotesSection.test.ts:61-64` finds the `.bg-setting-item-bg` row whose label span is "Auto-open", then its switch. Assertions unchanged. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/app/LabsSection.test.ts` (mocks only `mods-host.service` and `svelte-sonner`, as it does now): `startModsHost` rejects; `modsEnabledStore.enabled` is false, `stopModsHost` ran and `toast.error` fired. — The original test (`LabsSection.test.ts:124-136`) is unchanged and passes; the added test spies on `Storage.prototype.setItem` (browser API, not a store or logic file) and adds no `vi.mock`. Reordering the catch keeps `enabled` false, `stopModsHost` once and the toast in the normal path.
- [met] Failing test first, new `src/tests/lib/core/settings/PeriodicNotesSection.test.ts` (real `settingsStore`): with Auto-open and Auto-pin off, Auto-pin is disabled; turning Auto-open on enables it; Auto-pin stored on with Auto-open off is enabled, clicking turns it off and then it is disabled. Its `aria-label` is "Auto-pin". — Only the Auto-open locator changed; no assertion removed or weakened; still no mocks. Passes.
- [met] No test mocks `settingsStore`; mocks are limited to `log.service`, `mods-host.service` and `svelte-sonner` (side-effect services). — The fix diff adds no `vi.mock`.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0. `pnpm vitest run src/tests/lib/app/LabsSection.test.ts src/tests/lib/core/settings/PeriodicNotesSection.test.ts` exit 0 (2 files, 12 tests). The full suite is deliver's to run.

## Findings

1. nit — `src/lib/app/LabsSection.svelte:35-37`: when the off-write throws, the in-memory flag stays true (`mods-enabled.store.svelte.ts:54-62` writes localStorage before `enabledVaults`), so the switch shows on while the host is stopped. The user already saw "Could not start vault mods" and toggling again recovers; rare, visible, recoverable. No change needed; the new test could also assert the switch state if someone touches it later.

## Other checks

- Scope: the fix touches only the file named by finding 1 and the two test files; no layer-baseline, BASELINE_SIZE or composition-root change.
- No test deleted or weakened; the new test restores its spy in `finally`.
