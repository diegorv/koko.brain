VERDICT: APPROVED

Re-review, round 2, of the fix commit `e39f6e71c` (`git diff 28f1398ad..HEAD`): `help/documentation/28-mods.md` (3 lines), `src/tests/lib/plugins/mods/ModDialogHost.test.ts` (1 test name) and the review's Resolution section. No source code changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | Stop bullet (`28-mods.md:378`) now ends "A `run.ui` call you do not `await` needs a `.catch`, or **Stop** leaves an unhandled rejection." The host-caught sentence (`:637`) lists "awaited `run.ui` calls". Checked against code: an awaited `run.ui` rejection propagates to `runAction`'s catch (`mods-host.service.ts:412-419`), which ignores it after abort and otherwise logs with `debug` and toasts, never calling Sentry; so "awaited" is the accurate qualifier. |
| 2 | nit | resolved | Unload bullet (`28-mods.md:379`) now says "its live runs are aborted first" and that "`run.ui` dialogs a run opened after it ended" close as cancelled. Checked against code: `end()` removes `abortOnUnload` (`mods-host.service.ts:367-368`), so `live.controller.abort()` in `unloadMod` (`:611`) no longer aborts an ended run's controller; `closeForMod` (`mod-dialogs.store.svelte.ts:127-128`) filters by `modId` only, so those dialogs settle with `CANCELLED[kind]`, and a post-run `loading` still aborts through its `runtime.controller.signal` listener (`mods-host.service.ts:272`). The doc text matches. |
| 3 | nit | resolved | `ModDialogHost.test.ts:632` renamed to "closing a pick with its close button resolves null"; body and assertions unchanged (one-line diff), so no coverage lost. |

## Acceptance criteria re-checked

- [met] User cancellation is unchanged: Esc, Cancel and outside click still resolve `run.ui` dialogs to `undefined` / `false` / `null`, and the `cancellable` Cancel of `loading` still aborts only its task. — Only the pick test's name changed; its assertions and the other cancellation tests are untouched and pass (`ModDialogHost.test.ts`, run below). Outside click shares the `onOpenChange(false)` path, as round 1 found.
- [met] Unload aborts the mod's runs, so their `run.ui` dialogs reject with `AbortError`, while its `ctx.ui` dialogs keep resolving as cancelled. A reload waiting on a stopped run proceeds as today. — No code change in this round; the Unload doc bullet now matches the code for live versus ended runs (finding 2). Unload tests in `ModDialogHost.test.ts` and `mods-host.service.test.ts` pass.
- [met] `help/documentation/28-mods.md` documents `run.ui` in the runs section and tells actions to use it. The dialogs section (`:373-374`) and the observability paragraph (`:411`, including "Stopping a run does not close its mod's shared dialogs" and "no run or action linkage") describe the new rules. `docs/MOD-CORE.md` is updated if it covers dialogs. — The fix only adds the `.catch` sentence, the live-run caveat and "awaited `run.ui` calls"; the round 1 content stays. `src/tests/help/` (docs assertions) passes.

## Findings

None open or new. The fixes are docs and one test name; no regression, no weakened or deleted test, no scope creep.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/mods/ModDialogHost.test.ts src/tests/lib/plugins/mods/mods-host.service.test.ts src/tests/help/`: exit 0, 10 files, 419 tests passed.
- Left to deliver: the full `pnpm vitest run`, `pnpm build` (the branch changes `pnpm-lock.yaml`) and `bash scripts/e2e.sh`.
