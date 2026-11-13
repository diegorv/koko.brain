# Issue 02 discovery

## Decisions and scope
- Follow plan section 12: unstable `ctx.labs.place(id, { palette: true })`, opt-in palette, lazy output for every non-rail origin without input. Contract v1 stays unchanged.
- ADR-0036 keeps mod code trusted and cleanup host-owned; no new layer exception or dependency.
- No earlier Issue work folder exists at `.scratch/mods-extension-points/work/01/` in this checkout.

## Files and reactive chain
- `src/lib/plugins/mods/mods-host.service.ts:99-123,201-278,298-325`: per-mod registrations, run wrapper, picker, action disposal. Add labs and register action commands here.
- `src/lib/plugins/mods/mods-host.service.ts:420-440,509-514`: reverse disposal on unload and failed onload already owns cleanup.
- New `src/lib/plugins/mods/mod-commands.store.svelte.ts`: raw registrations, identity-based cleanup, reactive palette marks; getter lists every action.
- `src/lib/plugins/mods/mod-app.service.ts:25-73`: expose the same registry object through raw app access.
- `src/lib/app/commands.ts:94-374`: append marked rows as category Mod.
- `src/lib/app/AppOverlays.svelte:18` reads commands; `src/lib/features/command-palette/CommandPalette.svelte:16-18` derives visible rows. Neither needs a source change.
- Host currently writes runs via start/log/progress/finish/fail/cancel and picker via showRun/open/askInput. `modsRunsStore.runFor/isBusy/isReloadPending` and picker getters feed `ModActionPicker.svelte` and rail busy state. Preserve these writes; gate only showRun.

## Plan and verification
1. Add failing registry, host lifecycle/place and lazy-run tests; implement registry + labs + raw exposure, preserving identity cleanup. Run host, registry, raw-app and contract tests plus typecheck; commit.
2. Add failing command filtering and mounted late-registration tests, then append palette commands. Add Cmd+P execution/input-focus E2E and document labs/lazy behavior. Run touched tests, architecture checks, typecheck and targeted vault-mods E2E; commit.
- Prior art: `rail-registry.store.svelte.ts:46-51` for raw identity cleanup; host test writeMod/recordingMod and deferred run gates; commands.test.ts rail-action exclusion; AppOverlays.test.ts real mounted stores; e2e/specs/vault-mods.spec.ts real host with filesystem boundary fixture.
- Full suite is reserved for deliver; do not resolve the Issue here.

## Defaults and risks
- Global command id: `mod:<mod-id>:action:<action-id>`; label `<Mod name>: <title>`.
- Place must refer to an action registered by that mod. Placement disposal clears its mark without removing the action. Action disposal removes its row, including the mark.
- A second invocation while busy reveals the existing run, never starts another; rail and non-rail keys remain separate as specified.
- Late output can replace another picker and steal focus. Quiet runs have no Stop until invoked again and silently hold reload. These are accepted owner decisions, not guards to add.
- Mods must opt in themselves; no external mods repository edits belong to this Issue.

## Build evidence
- Registry/host work: 9 expected host failures before wiring; 127 focused tests passed after implementation. Palette mapping and mounted late-row tests failed before the command append and passed after it.
- Browser setup exposed a pre-existing missing `stat` export in `e2e/mocks/tauri-fs.ts` (imported by the mod vault adapter). Added the file-kind adapter with `src/tests/e2e/tauri-fs.test.ts`: 4 failures before, 4 passes after. No production filesystem change.
- Final targeted selection: 32 files, 764 tests passed, including all mods tests, dependent command/lifecycle tests, the help example and architecture rules. Typecheck: 0 errors, 0 warnings. Vault-mods E2E: 12 passed, including Cmd+P rendered output and input focus.
- Full suite and production/native builds remain for delivery; Issue and ledger are unchanged.
