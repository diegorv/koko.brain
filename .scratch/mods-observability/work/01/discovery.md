# Issue 01 discovery

## Scope and evidence
- `src/lib/plugins/mods/mods-host.service.ts:165-168,281-368,413-456`: menu, command and rail callbacks converge on the picker/run wrapper. Pass an explicit origin, not the lazy flag.
- `mods-host.service.ts:283-338`: start/log/progress/finish/fail/cancel write the run store; abort settles host cancellation before arbitrary JS necessarily stops.
- `mods-host.service.ts:524-628,662-707`: unload, load and reload-wait seams already own lifecycle decisions; retain generation/epoch checks and scheduling.
- `src/lib/plugins/mods/mods-runs.store.svelte.ts:59-138`: runs/runFor/isBusy/isReloadPending derive from run and pending-reload state; nextId survives reset.
- `src/lib/plugins/mods/ModActionPicker.svelte:27,97-147` reads runFor and isReloadPending; rail busy callbacks at host line 455 read isBusy.
- `src/lib/plugins/mods/mods.store.svelte.ts:35-60` exposes entries updated by load/unload orchestration; `ModsStatusList.svelte:42-46` renders them.
- Picker writes showRun/open/askInput/closeForMod/close feed getters in `mod-picker.store.svelte.ts:31-66`, read by `ModActionPicker.svelte:22-100`.
- `src/lib/utils/debug.ts:17-23` gates file output; `log.service.ts:82-120,238-242` buffers and flushes. Neither needs changes.
- Feature spec.md is absent. Read ADR-0036, logging ADR-0015 and indexing/watcher rules; no watcher or index changes planned.

## Smallest implementation plan
1. Add real-host integration tests in `src/tests/lib/plugins/mods/mods-host-trace.service.test.ts`; mock only FS, IPC and side-effect boundaries, retain logger/settings/run stores, inspect flushed file bytes and real getters. Run red first.
2. Emit fixed-tag JSON load-attempt/load-result/unload/reload-wait and action-start/action-end records in the host. Explicit field allowlist, escaped identifiers, monotonic timing, session-local existing run IDs, one terminal event guarded per run.
3. Add a UI-to-file assertion to `e2e/specs/vault-mods.spec.ts` using the existing virtual FS and E2E wrapper. Document vocabulary and limits in `help/documentation/28-mods.md`.
4. Run pnpm check, targeted host/logger/store/architecture tests and the mods E2E suite; commit implementation. Full suite belongs to deliver.

## Prior art, defaults and risks
- Copy filesystem/source-loader fixtures and reload gates from `mods-host.service.test.ts`; buffering assertions from `src/tests/lib/utils/log.service.test.ts`.
- Existing host tests mock debug: keep them intact and add a separate real-logger suite.
- Origins: rail, note-menu, folder-menu, command (palette and programmatic remain indistinguishable).
- Outcomes: running for starts; done/failed/cancelled for runs; loaded/failed/superseded for load results. Lifecycle records use folder as modId before manifest validation, which enforces id equality.
- Do not log input, titles, target paths, output/progress or error text in automatic records. Existing mod-authored/error debug messages remain separate and unchanged.
- Cancellation records host state only. Superseded loads never claim success. No global current-run, no store persistence and no logger rewrite.
- Browser FS assertions do not prove native WKWebView delivery; desktop session-file verification remains manual.
