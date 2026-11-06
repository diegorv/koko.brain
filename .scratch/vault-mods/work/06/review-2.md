VERDICT: APPROVED

Re-review of fix commit fbab80116 (`git diff d3a06d4a2..HEAD`).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `ModActionPicker.svelte:50-52` `handleRunKeydown` stops every key except Escape on the run view container (`:91`), so the Command root's Enter `preventDefault` no longer runs. Focus effect (`:30-33`) keys on the derived `runStatus`, not `run`, so log lines do not move focus; Stop unmounting on the end nulls `stopButton` and the effect moves focus to Close. New tests in `ModActionPicker.test.ts` (focus Stop then Close, Enter on Stop cancels, Enter on Close hides, Escape still closes) pass. The `pressKey` helper clicks only when the default was not prevented, which matches browser behavior, so the Enter tests do exercise the bug. See new finding 1 for a Tab side effect. |
| 2 | minor | resolved (deferred to owner) | No owner decision was possible in this run; the current default and the auto-close alternative are recorded in `.scratch/vault-mods/issues/07-docs-example-adr.md` Notes, which is the review's second option. The owner still has to choose; this is not a blocker. |
| 3 | nit | resolved | `liveRuns` removed from `mods-runs.store.svelte.ts`; `grep -rn liveRuns src e2e` finds nothing. Store test asserts moved to `runs` / `isBusy`, no assertion lost in meaning (the "done" test still checks `isBusy` false). |
| 4 | nit | resolved | `$effect` on `lineCount` scrolls `logBox` to the bottom while `followLog`; `handleLogScroll` clears it beyond 8px from the bottom. Two tests (follow and stay put) pass. See new finding 2 for a stale-flag edge. |

## Acceptance criteria re-checked

- [met] Failing tests first: — the fix touches only the run view's component tests and the store tests; `ModActionPicker.test.ts` keeps the progress/log, Close-keeps-run and busy-reopen cases and adds the keyboard, focus and log-follow cases; `mods-runs.store.test.ts` still covers start, progress, log cap, done, failed, cancelled and every remaining getter (`runs`, `runFor`, `isBusy`, `isReloadPending`). Targeted tests pass (below); the full suite and the E2E re-run are deliver's.

## Findings

1. **nit** (plausible, not reproduced) `src/lib/plugins/mods/ModActionPicker.svelte:50-52`: stopping every key also stops Tab. bits-ui's FocusScope loops Tab with a keydown listener on the dialog content (`node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js:141-160`, added with `on()`, which respects delegated `stopPropagation`). Shift+Tab on Stop (the first tabbable in the run view) then no longer wraps to the dialog's X; focus leaves and the scope's `focusin` capture puts it back on Stop. The trap holds, only the wrap is lost. Fix: let Tab through too (`if (e.key !== 'Escape' && e.key !== 'Tab')`), or stop only the keys the Command root handles (Enter, Home, End, arrows).
2. **nit** `src/lib/plugins/mods/ModActionPicker.svelte:27`: `followLog` is component state and the picker is mounted for the whole session (`src/lib/app/AppOverlays.svelte:20`). After a user scrolls a log up and closes the view, the next run view's log box mounts with `followLog` still false and does not follow new lines until the user scrolls to the bottom. Fix: reset `followLog = true` when the run key changes or the log box element is (re)bound.

## Other checks

- Typecheck: `taskpolicy -c background pnpm check` exit 0, 0 errors, 0 warnings.
- Tests: `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/mods/ src/tests/lib/features/rail-shell/ src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts` exit 0, 47 files, 1333 tests passed.
- Not run: the full suite, `pnpm build` and `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts` (deliver's). jsdom does not prove the real webview keeps focus on Stop.
- No weakened or deleted test beyond the `liveRuns` asserts that went with the getter. No layer baseline or composition-root change. No scope creep: the Issue 07 Notes line is the workflow's own record of finding 2.
