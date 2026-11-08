# 01: Stop ends a run's dialogs through `run.ui`

**What to build:** Each action run gets its own dialogs, `run.ui`, with the same methods as `ctx.ui` (`alert`, `confirm`, `prompt`, `pick`, `loading`). When the run's signal aborts (Stop, or the mod unloading), every open or queued `run.ui` dialog of that run closes and its promise rejects with an `AbortError`, and any later `run.ui` call rejects with it at once. The mod's code therefore stops at its next `await` with no `run.signal.aborted` check, and the next dialog in the shared queue shows right away.

Today the host cannot tell which run opened a dialog. `ctx.ui` is created once per mod (`mods-host.service.ts:206`), dialogs carry only `modId` (`mod-dialogs.store.svelte.ts:88`), and Stop only aborts the run's controller (`mods-host.service.ts:305`, `:339-343`). A dialog left from a stopped run holds the one queue shared by all mods (`mod-dialogs.store.svelte.ts:40`), and answering it lets the mod go on writing to the vault after Stop. The webview has no async-context API, so ownership has to come from the API, not from guessing.

**Blocked by:** 02

**Status:** ready-for-agent

**Prerequisite outside this repository (met):** this Issue is not built yet. Its prerequisite is a different Issue in a different repository: the contract ticket `.scratch/run-ui/issues/01-run-ui-contract.md` of `kokobrain-mods-src`, merged there (not here) as `328ca55f6add4d18e3c5b1490feee66ce8503b5e` ("feat: run.ui in the mod-core contract and test fake"). This Issue bumps the `@kokobrain/mod-core` pin in `package.json:81` from `e4900cd1d803deb93de2fa6d1444a6c538634ea6` to that SHA, keeping the `&path:/packages/mod-core` suffix, and updates `pnpm-lock.yaml`, so `ModRunV1` has `ui`.

## Acceptance criteria

- [ ] Write failing tests first, through the real `runAction`, `modDialogsStore` and `ModDialogHost` (no mocked stores), asserting promise outcomes, store state and rendered dialogs.
- [ ] `run.ui` is created per run and stamps every dialog with the run's id. `ctx.ui` stays mod-scoped: Stop does not touch its dialogs, which close only on unload, as today.
- [ ] Stop with a `run.ui` prompt open closes it, and the promise rejects with a `DOMException` named `AbortError`. Same for `alert`, `confirm` and `pick`. A queued `run.ui` dialog of that run is removed without ever opening.
- [ ] A `run.ui` call after the run's signal aborted rejects with `AbortError` at once and queues nothing.
- [ ] `run.ui.loading` passes the task a signal that also aborts on Stop. On Stop its dialog closes and its promise rejects with `AbortError` without waiting for the task. The docs say the task's JavaScript may still be running.
- [ ] User cancellation is unchanged: Esc, Cancel and outside click still resolve `run.ui` dialogs to `undefined` / `false` / `null`, and the `cancellable` Cancel of `loading` still aborts only its task.
- [ ] After Stop, the next dialog in the queue (another mod's, or another run's) shows immediately. Dialogs of another run of the same mod, and that mod's `ctx.ui` dialogs, stay open.
- [ ] Unload aborts the mod's runs, so their `run.ui` dialogs reject with `AbortError`, while its `ctx.ui` dialogs keep resolving as cancelled. A reload waiting on a stopped run proceeds as today.
- [ ] An action that rejects with the `AbortError` ends **Cancelled**, never **Failed**, with no error toast (the guard at `mods-host.service.ts:376`).
- [ ] Dialog trace records of `run.ui` dialogs carry the `runId`, and Stop closes them with the reason `run-stopped`. `ctx.ui` records keep no run linkage.
- [ ] The contract test lists `ui` in `RUN_PUBLIC` (`src/tests/lib/plugins/mods/mod-api-contract.test.ts:178`) and checks that `run.ui` has the same keys as `ctx.ui`.
- [ ] `help/documentation/28-mods.md` documents `run.ui` in the runs section and tells actions to use it. The dialogs section (`:373-374`) and the observability paragraph (`:411`, including "Stopping a run does not close its mod's shared dialogs" and "no run or action linkage") describe the new rules. `docs/MOD-CORE.md` is updated if it covers dialogs.

## Scope and constraints

Host only: `mods-host.service.ts`, `mod-dialogs.store.svelte.ts`, `ModDialogHost.svelte` as needed, the `package.json` / `pnpm-lock.yaml` pin bump, tests and docs. The contract, the `@kokobrain/mod-core/testing` fake and moving the mods to `run.ui` happen in the mods repository (`.scratch/run-ui/` there). No backward compatibility is needed: the owner is the only mod user, and the mods migrate right after this ships.

## Verification

Frontend gate: `pnpm check`, `pnpm vitest run` and `pnpm build` (the pin bump changes `pnpm-lock.yaml`), plus the mods E2E suite through `bash scripts/e2e.sh`.

## Comments

- 2026-11-08: Rewritten after review. Decision: `run.ui` with AbortError rejection on abort. Rejected: inferring the owning run from async context (not possible in the webview), a `signal` option on each call (one missed call site brings the bug back, and `alert` resolves the same way whether answered or cancelled), and keeping the behaviour. Source: mods repository `.scratch/mods-review/report.md`, finding H2 (mods-review Issue 19, parked there as wontfix because it belongs to the host).
