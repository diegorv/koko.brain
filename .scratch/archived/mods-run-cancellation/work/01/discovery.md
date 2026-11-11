# Discovery: 01 Stop ends a run's dialogs through `run.ui`

No `spec.md` for this feature; the Issue is the spec. Builds on Issue 02 (`work/02`): runs are keyed per action, `runAction` is the only run entry point.

## Files that change

- `package.json:81`, `pnpm-lock.yaml`: `@kokobrain/mod-core` pin `e4900cd...` -> `328ca55f6add4d18e3c5b1490feee66ce8503b5e` (same `&path:/packages/mod-core`). Its `ModRunV1` adds `ui: ModUiV1` (already installed, lockfile diff is 3 lines).
- `src/lib/plugins/mods/mod-dialogs.store.svelte.ts`
  - `ModDialog` gains optional `runId` (:23-30); `open` (:83) takes an optional `runId` and keeps a `reject` next to `resolve` (:50-55).
  - New `closeForRun(runId)`: rejects every open or queued dialog of that run with `DOMException('...', 'AbortError')`, reason `run-stopped`. `settle` (:58) generalised to resolve or reject.
- `src/lib/plugins/mods/mods-host.service.ts`
  - `ui` (:206-275) becomes a factory `createUi(run?: { runId, signal })`; `ctx.ui = createUi()` (mod-scoped, unchanged), `run.ui = createUi({ runId: id, signal })` built in `runAction` (:356).
  - Scoped calls: reject with `AbortError` at once when the run signal is aborted (before `assertLive` and validation; nothing queued). `openDialog` (:199) passes `runId` to the store and adds it to every `MOD-UI` record (`dialog-rejected`, `loading-task-settled` too).
  - `loading`: task signal also aborts on the run signal; the result is `Promise.race([task-with-finally, dialog-rejection])`, so Stop rejects without waiting for the task while the late task still logs `loading-task-settled`.
  - `runAction` abort listener (:346) calls `modDialogsStore.closeForRun(id)`. Unload goes through the same listener (`abortOnUnload`) before `closeForMod` (:582-584), so run dialogs reject and `ctx.ui` ones still resolve cancelled.
  - Guard at :385 already ends an aborted run Cancelled with no toast; covered by a new test only.
- `ModDialogHost.svelte`: no change expected (queue removal already re-renders the next dialog, as `closeForMod` does).
- `help/documentation/28-mods.md`: runs section (`run.ui`), dialogs section (:373-374), observability (:411). `docs/MOD-CORE.md` does not cover dialogs: no change.

## Plan

1. Store: failing tests in `mod-dialogs.store.test.ts` for `runId` and `closeForRun` (rejects open + queued of that run only, next dialog current, reason via `onTransition`), then implement. Commit.
2. Host + pin: failing tests through real `runAction`, `modDialogsStore`, `ModDialogHost`: Stop with prompt/alert/confirm/pick open; queued run dialog never opens; call after abort; loading (task signal aborts, rejects without waiting); Esc/Cancel/outside unchanged; other run / other mod / `ctx.ui` dialogs stay; unload; Cancelled not Failed; trace `runId` + `run-stopped`; contract `RUN_PUBLIC.ui` and same keys as `ctx.ui`. Implement. Commit.
3. Docs. Commit.

## Prior-art tests

- `mods-host.service.test.ts` "long runs" (:1694, `runnerMod`, `run()!.stop()`) and "ctx.ui" (:1932).
- `ModDialogHost.test.ts` "a dialog opened during a run" (:437) for a real action + picker + rendered dialog.
- `ModDialogDiagnostics.test.ts` `records()` helper and the unload test (:402).
- `mod-api-contract.test.ts` run members test (:284).

## Risks / defaults

- Default: AbortError message `The run was stopped`, for Stop and unload alike (unload aborts the run first).
- Default: a `run.ui` dialog left open after its run ended normally is not closed at run end (not in the AC); it closes on unload as cancelled, like `ctx.ui`.
- `loading` restructure must keep the task called synchronously and keep record order `loading-task-settled` before `dialog-closed` (existing diagnostics tests pin both).
