# Issue 06 discovery: run view, Stop, busy rail button

Builds on `work/03` (picker store, `ModActionPicker.svelte`), `work/04` (per-folder reload runner) and `work/05` (input step).

## Files that change

- `plugins/mods/contract/mod-api.v1.ts`: `ModRunV1 { signal, log(text), progress(done, total, label?) }`; `ModActionV1.run(input, run)`. Freeze test `mod-api-contract.test.ts` gains `RUN_PUBLIC` and a runtime key check of the `run` an action receives.
- New `plugins/mods/mods-runs.store.svelte.ts`: `$state.raw` runs (one per button key, latest kept), each `{ id, modId, buttonKey, title, status, lines, progress, error, stop }`; `MAX_RUN_LOG_LINES = 500`; `start/log/progress/finish/fail/cancel/setReloadPending/reset`; getters `runs`, `liveRuns`, `runFor(key)`, `isBusy(key)`, `isModBusy(modId)`, `isReloadPending(modId)`. Updates to an ended run are ignored.
- `plugins/mods/mod-picker.store.svelte.ts`: `runKey` + `showRun(modId, buttonKey)`; `closeForMod` keeps a run view open (it shows the run's end).
- `plugins/mods/mods-host.service.ts`:
  - `ModRuntime.runs: Set<Promise<void>>` (settle when each run ends).
  - `runAction(:114)` takes the button key: one AbortController per run, aborted by `stop()` and by the mod's own signal (unload); an abort ends the run `cancelled` at once and a later rejection is not a failure. `showRun` before awaiting. Failure: store `fail` + the existing toast.
  - `addRailButton(:205)`: `busy: () => modsRunsStore.isBusy(key)`; click shows the run view while busy, else the picker.
  - `reloadFolder(:374)`: with the manifest present and live runs, set reload pending and wait until the runs end or a newer request wakes it (`reloadWakers`, woken in `requestReload :398`); then re-check `current()`. A delete (no manifest) still unloads at once.
  - `stopModsHost(:511)` also closes the picker, run view included.
- `plugins/mods/ModActionPicker.svelte`: picking no longer closes; run view (title, progress bar + label, log, status, `<details>` stack, Reload pending, Stop, Close).
- `features/rail-shell/Rail.svelte:182`: busy mark (`data-rail-busy`, `aria-busy`) from `action.busy?.()`.
- `app/lifecycle/app-lifecycle.service.ts:631`: `modsRunsStore.reset()` next to `queryjsSessionStore.reset()`.
- E2E `e2e/specs/vault-mods.spec.ts`: a slow action.

## Prior art

- Store tests: `mod-picker.store.test.ts`, `mods.store.test.ts`. Host: `mods-host.service.test.ts` (gated globals, `emit`). Component: `ModActionPicker.test.ts`. Rail: `Rail.test.ts` "action buttons". Lifecycle: `app-lifecycle.service.test.ts` "vault mods host".

## Defaults taken

- Stop marks the run `cancelled` immediately; the busy mark clears even if mod code keeps going (sync code cannot be stopped, PRD P4). Later `log`/`progress` calls are dropped.
- The view stays open after a quick action ends; the user closes it (the Issue: every pick switches to the run view).
- The teardown criterion is split: the lifecycle test mocks the host, so it asserts `teardownVault` aborts runs in the real runs store; the host test asserts `ctx.vault.create` after stop throws and writes nothing. "Labs toggle off" is `stopModsHost` (what `LabsSection.svelte:31` calls).
- A reload waits for every live run of the mod, including one started while it waits.
- `progress` checks its numbers and label (mods are untyped), throwing `Mod "<id>": run.progress needs ...`.

## Risks

- A run the mod never settles keeps a reload pending forever; Stop releases it.
