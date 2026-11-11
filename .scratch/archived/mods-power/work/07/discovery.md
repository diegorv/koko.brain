# Issue 07 discovery: manifest-declared settings edited in Labs

## Files that change
- `src/lib/plugins/mods/mods.logic.ts:137-158` `ModSettingField` + `settings?` on `ModManifest`; `:188,216-221` settings validation after `ruleActions`; new `mergeModSettings`.
- `src/lib/plugins/mods/mods.store.svelte.ts:2-20` `settings?` on `ModStatusEntry`.
- `src/lib/plugins/mods/mod-vault.service.ts:204-280` `createModData` also returns `settled()` (the queue tail, never rejects).
- `src/lib/plugins/mods/mods-host.service.ts`
  - `:74-83` optional `dataSettled?: () => Promise<void>` on `ModRuntime` (optional: tests build runtimes by hand); `:680` set it from `createModData`, spread only `loadData`/`saveData` into ctx.
  - `:818-825` loaded `upsertEntry` carries `settings` when the manifest has them.
  - new `pendingSettings` map; `readModSettings`, `saveModSetting` exported; private `readModData` and `writePendingSettings`.
  - `reloadFolder` `:898-907`: drop patch when `!present`; before `loadMod`, when a patch exists: await old instances' `dataSettled`, take the patch, read, merge, serialize, `write_mod_data`; failures toast + debug (keys only).
  - `disableMod` `:1007` and `stopModsHost` `:1036` drop patches.
- `src/lib/plugins/mods/ModsStatusList.svelte:47-88` per-folder read results in one `$state.raw` map, one `$effect` + `untrack` that reads each loaded entry with settings whose entry object changed; Switch / Input per field.
- Docs: `help/documentation/28-mods.md`, `mods/01-anatomy-and-loading.md`, `mods/05-mod-data.md`.

## Plan (test-first, one commit per step)
1. Logic: settings parse + `mergeModSettings` tests red, then code.
2. Store: `settings` survives `upsertEntry` (passes with the type; store has no logic to change).
3. Host: failing `saveModSetting` test (Issue's first criterion), then the rest of the host tests, then code (incl. `settled`).
4. ModsStatusList tests red, then the Svelte block.
5. Docs.

## Prior-art tests
- Host: `describe('reload on file change')` `emit`/`writeMod` (`mods-host.service.test.ts:1077`), long runs gate (`:1894`). `invoke` mock (`:30`) gets a per-test implementation backed by a `dataFiles` map for `read_mod_data`/`write_mod_data`.
- Status list: `row()` helpers in `ModsStatusList.test.ts`; Input change vs input from `AutoOrganizeRuleRow`.

## Risks
- Patch taken after the drain, so an edit during the drain is included, and a stop or switch-off during it (which drops the map entry) writes nothing.
- A loadMod superseded by a newer request after the write is fine: the rerun loads.

## Defaults taken
- Read reasons: `unreadable`, `not valid JSON`, `not an object` (row shows `Settings unavailable: data.json is <reason>`).
- Toast: `_system/mods/<folder>: cannot save setting "<key>": <reason>` (keys joined with `, ` when several, `settings`).
- `saveModSetting` is a no-op unless `vaultPath` is the open vault and mods are on (like `enableMod`).
- Values shown before the first read completes: no fields (nothing to show yet).
