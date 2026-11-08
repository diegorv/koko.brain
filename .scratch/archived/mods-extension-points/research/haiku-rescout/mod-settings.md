## Where in code
- Contract (frozen v1 surface): `src/lib/plugins/mods/contract/mod-api.v1.ts:289-328` (`ModContextV1`: `loadData` 320, `saveData` 328); members must be additive (`:13-17`).
- Host builds `ctx`: `src/lib/plugins/mods/mods-host.service.ts:96-371` (`createModContext`); return object `:277-370`; unstable `app`/`kb` getters `:362-369`, typed `:30-46`.
- Labs entry: `src/lib/app/LabsSection.svelte:36-51`. `ModsStatusList` is rendered only when mods are enabled (`:49-51`).
- Per-mod row: `src/lib/plugins/mods/ModsStatusList.svelte:45-76`. Existing expandable pattern for errors at `:66-73` (`<details>` for stack trace).
- Row data: `src/lib/plugins/mods/mods.store.svelte.ts:1-15` (`ModStatusEntry`: id, folder, name, version, state, error; no settings field).
- Data layer: `src/lib/plugins/mods/mod-vault.service.ts:125-201` (`createModData`: per-instance queue `inOrder` at `:137-145`, `saveBlocked` `:136`, `saveData` `:184-199`). Calls `read_mod_data`/`write_mod_data` at `:164` and `:196`.
- Storage: `.kokobrain/mods/<id>/data.json` (`mods.logic.ts:11`). Dot-folders are dropped by the Rust watcher (`docs/agents/indexing-watcher-rules.md:11`, rule 5), and `mod-vault.service.ts:122-123` says this file reaches neither index nor file tree.
- Enable flags are per machine, in localStorage: `src/lib/plugins/mods/mods-enabled.store.svelte.ts:16-19`, `:66-69`.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- The only mod UI slots are the rail and the picker. Rail: `src/lib/features/rail-shell/rail-registry.store.svelte.ts:78-84` (`registerAction`, keyed, returns an unregister). `RailAction` type: `rail-shell.types.ts:202-214`. Consumer: `Rail.svelte:192`. A grep of `src/lib` finds `registerAction(` only in `mods-host.service.ts:344`. Built-ins use the same registry for other kinds, e.g. `plugins/calendar/calendar-rail.service.ts` calls `registerNavigator`.
- Settings sections are hard-coded. `SettingsSection` is a closed union (`src/lib/core/settings/settings.types.ts:337`). Groups are a const list (`settings.logic.ts:~200-270`; Labs at `:265-267`). `sectionComponents: Record<SettingsSection, Component>` (`src/lib/app/SettingsPanel.svelte:71`, Labs at `:90`). A mod cannot add a settings section without a core edit.
- Command palette has no registration API (`src/lib/features/command-palette/command-palette.service.ts` exports only `resetCommandPalette`, line 4).
- No declarative settings schema exists anywhere in `src/lib/core/settings` or `rail-shell`, which I grepped. The closest reusable piece is the row primitive `src/lib/core/settings/sections/SettingItem.svelte:4-30` (label, description, inline or stacked control).
- Mods can already draw their own DOM (`help/documentation/28-mods.md:360-376`), but the host provides no mount point; any node a mod appends outside `ctx.register` survives unload.

## What mods could do
- Today: rail buttons with actions; a text prompt (`ctx.ui.prompt`, contract `:192-205`); `loadData`/`saveData`; toasts; dialogs; vault and note access.
- With a declarative per-mod form: a manifest-declared schema (toggle, text, number, select) rendered under the mod's Labs row, values stored in `data.json`, read by the mod via a new `ctx.settings.get()`, and notified via `ctx.settings.onChange(cb)`. The form works without the mod's code: Labs can render it for a disabled mod, because the schema lives in `manifest.json` and the host reads `data.json` directly.
- With a mod-built UI: a mount slot (e.g. `ctx.ui.panel(container)` or a Labs-row slot) that the host gives to the mod's DOM and tears down at unload.

## API sketch
```jsonc
// manifest.json (additive, unknown keys already ignored: mods.logic.ts parseModManifest)
"settings": [
  { "key": "interval", "type": "number", "label": "Interval (min)", "default": 30, "min": 1 },
  { "key": "mode", "type": "select", "label": "Mode", "default": "daily", "options": ["daily", "weekly"] }
]
```
```ts
// contract addition (additive, needs apiVersion review only if changed later)
interface ModSettingsV1 {
  get: () => Promise<Record<string, unknown>>; // defaults merged with data.json
  onChange: (cb: (values: Record<string, unknown>) => void) => () => void;
}
// ModContextV1.settings: ModSettingsV1
```
Host side: `parseModManifest` validates the schema; a `ModSettingsRow.svelte` renders it inside `ModsStatusList.svelte`; writes go through the same per-mod queue as `createModData`, so they cannot interleave with `saveData`.

## Cost
- Declarative Labs form, without a mod-facing API: M. Manifest parsing and validation (`mods.logic.ts`), a new row component, a host-side read/write helper that reuses `createModData`'s queue (refactor it out of the closure, `mod-vault.service.ts:125`), plus tests in `src/tests/lib/plugins/mods/`.
- Adding `ctx.settings` with change notification: S-M on top, plus a `mod-api-contract.test.ts` freeze update.
- Mod-built UI slot with mount and unmount: M-L, because lifetime and disposal have to be tied to `runtime.disposers` (`mods-host.service.ts:48-58`).
- A new top-level Settings section for mods: L, a core change to the union, the groups list, the icon map and the component map. Not recommended.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Two writers to `data.json`: a host form and the mod's `saveData` need one queue. Writing outside `createModData`'s `inOrder` (`mod-vault.service.ts:137-145`) can race.
- Stale values: the mod holds its own copy. `saveData` does not reload the mod (`.kokobrain` is ignored by the watcher), so a form edit needs an explicit change event or the mod goes stale.
- Corrupt data: a form must handle `ModDataCorruptError` and `saveBlocked` (`mod-vault.service.ts:166-182`), or it can overwrite the only copy.
- Layer rule: `src/lib/app/LabsSection.svelte` already imports `plugins/mods` (allowed: `app/` is not in the core/features/plugins rules). A `features/` or `core/` form component must not import `plugins/mods`; put it in `plugins/mods` or `app/`.
- Disposal: a mod-built DOM slot must be removed at unload (`disposable`, `mods-host.service.ts:105-116`); Labs row components must unmount with `ModsStatusList`.
- Reactivity: `modsStore` and `modsEnabledStore` are `$state`; the row reads `modsEnabledStore.disabledMods` (`ModsStatusList.svelte:61`). A form that reads `data.json` is async and needs its own loading and error state.
- Hot path: none. Settings are read on Labs open and on change; no per-keystroke IO should reach `saveData` (debounce in the form).

## Bugs or complexity removed (say none if none)
- None found on this surface. `PLUGIN_ALLOWLIST` referenced in `src/lib/plugins/mods/mod-app.service.ts:11,14,16` exists at `scripts/import-graph.mjs:47`; the comments are not stale.

## Could not verify
- I did not read all of `help/documentation/28-mods.md` (528 lines); I read the sections on manifest, `loadData`/`saveData`, own UI and raw access, and grepped the rest.
- I did not read `ModDialogHost.svelte`, `mod-picker.store.svelte.ts`, `ModActionPicker.svelte` or `mod-api-contract.test.ts` in full.
- Layer-rule enforcement (`src/tests/lib/architecture/layer-rules.test.ts`, `layer-baseline.json`) was not read; the layer assessment is from `CLAUDE.md` and the import sites I read.
- I cannot see the status of other workflow agents or the failed haiku runs; this report is one scout's output only.
- No code was run or changed (read-only task).