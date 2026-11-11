# Item 7 validation: declarative settings in the manifest

Adversarial check of `item-07-host.md`. Paths without a prefix are under `/Users/diegorv/Dev/pet-projects/koko/brain`; `MODS/` is `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src`. Nothing was run. Every claim below was re-read in code. Low priority, needs-triage (owner, 2026-11-11).

## Verdict

- **Cost: small to medium, not large.** Host only, frontend only (gate: `pnpm check` + `pnpm vitest run`). No Rust, no IPC DTO, no new command, no `package.json`, no mod-core SHA adoption, no d.ts, no contract conformance test change. One small, recommended edit in the mods workspace build script (not in `packages/mod-core`).
- **Contract change: no.** The scout's load-bearing premise, "a manifest list alone is useless unless the mod can read the values ... section 4 rules out" any other way, is refuted. The mod already reads its stored values with the stable `ctx.loadData()` if the values live in `data.json`, which is what the owner asked for ("stored in mod data"). The scout rejected that storage (its option A) on a hazard that a reload-based write removes (below).
- **Design: declared keys are top-level keys of the mod's own `data.json`.** The host writes a changed value by unloading the mod, read-merge-writing `data.json` with the existing `read_mod_data` / `write_mod_data` commands, and loading it again, through the folder's existing serialized reload runner. The reload replaces any `onChange` API.
- **The one real tradeoff the owner must accept:** a mod that declares `settings` must keep unknown top-level keys when it saves (`saveData({ ...loaded, ...mine })`). A mod that saves a fresh object drops the user's values. That is author discipline in an opt-in mod, versus the scout's route (separate file + new `ctx` member + mod-core commit and SHA bump + Rust or a workaround). Recorded as owner decision 1.

## Claims checked

Confirmed:

1. `ModManifest` and `parseModManifest` are as described; `ruleActions` is the strict precedent (bad value fails the whole load): `src/lib/plugins/mods/mods.logic.ts:137-158`, `:173-223`, `:216-221`.
2. A manifest edit reloads the mod, so field definitions are static per instance: `mods.logic.ts:14` (`MOD_FILES`), `:35-51` (`mapModChanges`).
3. `upsertEntry` call sites: `src/lib/plugins/mods/mods-host.service.ts:648` (error), `:733` (loaded), `:762` (disabled), `:930` (switch off). `ModStatusEntry` at `src/lib/plugins/mods/mods.store.svelte.ts:2-20`.
4. `saveData` replaces the whole file (`src/lib/plugins/mods/mod-vault.service.ts:208-223`, Rust `write_atomic` at `src-tauri/src/commands/vault.rs:1201`); both data calls go through one FIFO per mod instance (`mod-vault.service.ts:162-169`).
5. The Rust path is fixed to `data.json` and the id is one `[a-z0-9-]` segment (`vault.rs:1179-1189`); `read_mod_data` returns `None` only on NotFound (`vault.rs:1210-1219`). The IPC contract already has both commands (`src/lib/contracts/commands.ts:130,132,278,279`), so the host can call them outside a `ctx`.
6. plugin-fs write ACL is limited to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (`src-tauri/capabilities/default.json:83-100`): the host must not use `writeTextFile` for settings. True, and irrelevant to the design below, which uses the Rust commands.
7. Writes under `.kokobrain/` produce no watcher event (`docs/agents/indexing-watcher-rules.md` rule 5), so a host write to `data.json` cannot trigger a reload or an index update.
8. `ModsStatusList.test.ts:9-12` mocks `mods-host.service.js`; the Labs list imports `enableMod`/`disableMod` from it (`ModsStatusList.svelte:9`). New host functions the row calls are mockable the same way.
9. The shape-strict loaders exist: `MODS/examples/persisted-preferences.ts:9-16` throws on any extra key; `MODS/mods/habits/src/habits.logic.ts:51-59` (`parseState`) returns `{ habits, log }` only, so its save would drop extra keys. These are the two patterns that would break if such a mod declared settings without adapting. Neither declares settings today.

Refuted or corrected:

- **"Not host-only ... a contract member for the mod to read the values" (section 1) and "No Rust and no SHA bump only if the values travel some other way, which section 4 rules out" (section 1).** Refuted. `ctx.loadData()` is stable contract v1 (`help/documentation/mods/05-mod-data.md:7-9`) and returns the whole `data.json` value (`mod-vault.service.ts:185-206`). With values as top-level keys of that value, the mod reads `const { greeting = 'Hi' } = (await ctx.loadData()) ?? {}`. The docs already tell authors to use it "for settings" (`05-mod-data.md:3`). The scout's "Mod re-reads on its own with `loadData`: not possible" holds only under its own option B.
- **Option A rejection, "Two writers (host and mod) to one file with whole-value replace" (section 3).** Overstated. The concurrent writer disappears if the host writes only while the instance is unloaded: `reloadFolder` already waits for live runs, unloads, then loads (`mods-host.service.ts:802-823`, unload at `:815`, load at `:822`), and after `live.unloaded = true` (`:623`) every `saveData` of the old instance rejects at its first `assertLive()` (`mod-vault.service.ts:209`), `onunload` included (`05-mod-data.md:132`). The docs already give the same rule for a hand edit: "Edit the file with the mod switched off" (`05-mod-data.md`, "Where the data lives" last paragraph). What remains is the author-discipline hazard in the Verdict, plus one in-flight-write race (Risks, R1).
- **"A host key added to `data.json` would break mods written like that" (section 3).** True only for a mod that opts in by declaring `settings`. The host never writes `data.json` of a mod without `settings`. The author of an opted-in mod controls its loader.
- **Option B "Recommended" and the whole section 4 contract plan.** Not needed for the power asked. It costs: a `MODS/packages/mod-core/src/contract/mod-api.v1.ts` member, a mods-repo commit and push, a host `package.json`/`pnpm-lock.yaml` SHA bump and `pnpm build` (`docs/MOD-CORE.md` "Updating the dependency"), `mod-api-contract.test.ts` and `mods-types.test.ts` and `help/examples/mods/kokobrain-mod.d.ts` edits, a new store, a new service, and either two new Rust commands (Both gate, ADR 0036 amendment) or a coupling to `core/settings`. Keep it as the fallback if the owner rejects decision 1.
- **"New `mod-settings.store.svelte.ts`" and "`mod-settings.service.ts`" (section 2 rows 7-8), `resolveSettings` filtering at load before `onload` (row 3, section 4 "Loading values before `onload`").** Cut. With no `ctx` member, nothing needs values before `onload`, and nothing reactive outside the Labs row reads them. The row reads the current values on demand.
- **Missed cost: the build's manifest copy.** `MODS/scripts/mod-loader.ts:46-74` (`checkManifest`) is a hand copy of `parseModManifest`, guarded by `MODS/test/host-integration/manifest-check.test.ts` ("The build's manifest check is a copy of the host's parseModManifest"). It does not mirror `ruleActions` today, and the drift test's fixtures do not include it, so the test stays green on that drift. A strict `settings` check in the host only would let `pnpm build` in the workspace deploy a manifest the host then refuses to load. Recommended: mirror the `settings` check in `checkManifest` and add fixtures. This is a workspace script edit, not a mod-core contract change, and needs no host SHA bump (the host pins only `&path:/packages/mod-core`, `package.json:81`).
- **Number type in v1, `description`, Rust tests, E2E.** Cut as speculative for a low-priority item (see design).
- **`mods.logic.ts` additions "must import nothing but types" (section 6).** Accurate, and a helper there must not import Svelte; it may use `serializeModData`/`parseModData` from the same file (`mods.logic.ts:91-116`).

## Minimal design

Manifest (strict, like `ruleActions`; a bad list fails the load with a `manifest.json settings[N].<field> ...` message through `fail`, `mods.logic.ts:175-178`):

```json
"settings": [
	{ "key": "folder", "type": "string", "label": "Target folder", "default": "Inbox" },
	{ "key": "compact", "type": "boolean", "label": "Compact view" }
]
```

- `key`: matches `/^[a-zA-Z][a-zA-Z0-9]*$/`, unique. The pattern rejects `__proto__` without a denylist (it starts with `_`); `constructor` and `prototype` become plain own properties on a JSON object and are harmless.
- `type`: `boolean` or `string` only. A mod parses a number from a string if it needs one.
- `label`: non-empty string, rendered as text (Svelte escaping, never `{@html}`).
- `default`: optional, of the field's type. Shown in Labs when the key is absent from `data.json`. The host never writes defaults (no write at load). The mod applies the same fallback in code; the docs say so. This duplication is the price of no contract member.

Host pieces:

1. `mods.logic.ts`: `ModSettingField` type, `settings?: ModSettingField[]` on `ModManifest`, validation in `parseModManifest`, and one pure helper `mergeModSettings(stored: unknown, patch): { ok: true; value } | { ok: false; reason }`: `null` (no file, or a file holding `null`) becomes `{}`; a plain object is spread and the patch applied; any other value (array, string, number) refuses, so the host never replaces data it does not understand.
2. `mods.store.svelte.ts`: `settings?: ModSettingField[]` on `ModStatusEntry`, set only by the loaded `upsertEntry` (`mods-host.service.ts:733`).
3. `mods-host.service.ts`:
   - `readModSettings(vaultPath, folder)`: `call('read_mod_data')`, `parseModData`, returns the object or a reason (corrupt, not an object, read error). It never moves a corrupt file aside: that stays the mod's `loadData` job (`mod-vault.service.ts:194-206`).
   - `saveModSetting(vaultPath, folder, key, value)`: records the value in a per-folder pending map, then `requestReload` (`:830`). `reloadFolder`, after the unload at `:815` and before the load at `:822`, takes the folder's pending patch, reads, merges, `serializeModData`, `call('write_mod_data')`. On any failure: `toast.error`, `debug` with the key only (never the value), the file untouched, and the mod still loads. `serializeWithRerun` (`src/lib/utils/inflight.ts:65-87`) already coalesces quick edits into one more pass; the pending map merges keys, last value wins.
   - `stopModsHost` (`:946-959`) empties the pending map, next to `reloadRunners.clear()` (`:951`).
4. `ModsStatusList.svelte`: for a loaded entry with `settings`, read values once when the row renders, a `Switch` per boolean (writes at once) and an `Input` per string (commits on `change`, not `input`, the `AutoOrganizeRuleRow.svelte` commit pattern), `aria-label="Setting <label> of <mod name>"`. A refused read (corrupt or not an object) shows one line instead of the fields, so the user cannot write over it.

Docs: `help/documentation/28-mods.md` (manifest table near `:88`), `help/documentation/mods/01-anatomy-and-loading.md` (fields table near `:57`, validation table near `:84`), `help/documentation/mods/05-mod-data.md` (declared keys live in `data.json`; save what you loaded; defaults are applied by the mod; a Labs edit reloads the mod). Workspace: `MODS/scripts/mod-loader.ts`, `MODS/test/host-integration/manifest-check.test.ts`; an example in `MODS/examples/` and `MODS/docs/examples.md` is optional.

Tests (failing first; real stores, mock only Tauri and side-effect services):

- `src/tests/lib/plugins/mods/mods.logic.test.ts`: `settings` parse cases (valid, `[]`, not an array, bad key incl. `__proto__`, duplicate key, unknown type, empty label, wrong-type default, first-failure order); `mergeModSettings` (null, object keeps unknown keys, array/string refuses).
- `src/tests/lib/plugins/mods/mods-host.service.test.ts` (pattern of `reload on file change`, `:1040`): a save unloads, writes the merged object keeping the mod's other keys, and the new instance's `loadData` sees it; the write waits for a live run; a corrupt or array `data.json` is not written and the mod still loads; a write failure toasts and logs without the value; two quick saves give one merged write; a stop drops a pending save.
- `src/tests/lib/plugins/mods/mods.store.test.ts`: `settings` survives `upsertEntry`.
- `src/tests/lib/plugins/mods/ModsStatusList.test.ts`: fields only on loaded rows with `settings`; switch writes at once; text writes on `change` only; refused read shows the line and no fields.

## Risks the design must handle

- **R1, race, data at risk: an old-instance `saveData` already past its `assertLive()` when the unload comes.** Its `write_mod_data` IPC is in flight (`mod-vault.service.ts:217-220`). If it lands between the host's read and write, the mod's last save is lost; if it lands after, the user's value is lost. The window is one IPC. Fix is small: keep the data queue's tail on `ModRuntime` (`mods-host.service.ts:72-81`; `tail` is closure state at `mod-vault.service.ts:161,167`) and await it after the unload, before the read. Recommended because data is at risk; owner decision 3.
- **R2, data loss by mod code:** an opted-in mod that saves a fresh object drops the user's values (`habits` `parseState` pattern). Mitigated by docs only. Owner decision 1.
- **R3, data loss by the host:** never write over a corrupt, unreadable or non-object `data.json`; never move it aside from the host. Covered by `mergeModSettings` refusing and by `readModSettings` not renaming.
- **R4, loops:** none by construction. The host writes `data.json` only, which is invisible to the watcher (rule 5); the reload it triggers writes nothing; a mod's `onload` `saveData` triggers nothing. No `onChange`, so no self-trigger to suppress (contrast item 2).
- **R5, ordering with a switch or a stop:** `disableMod` bumps the epoch (`mods-host.service.ts:922-924`), so a pending `reloadFolder` returns early (`:805`) and the patch waits for the next reload. Decide: drop the folder's pending patch in `disableMod` (simplest, the edit is visibly lost on a row that no longer shows fields) or write it anyway. Stop: pending map emptied (above), so a patch never reaches another vault.
- **R6, a long run delays the edit:** `waitForRuns` (`:776-789`) holds the write until runs end; the run view already shows "Reload pending". Acceptable; the row shows the committed value meanwhile.
- **R7, security:** no new trust boundary (mods are full trust, ADR 0036). Labels and defaults reach the DOM as text only. No password type; docs repeat "Plain text, not a secret store" (`05-mod-data.md`). Logs carry the key, never the value.

## Ordering against the other items

- **After item 6** (visible callback errors): both edit `ModsStatusList.svelte` row markup and `ModsStatusList.test.ts`; item 6 adds a row block below the header (`item-06-host.md` section 3.7). Build 7 on top of it to avoid a merge of two row layouts.
- **Independent of the contract queue (items 1, 2, 4, 5):** with this design, item 7 needs no mod-core commit or SHA bump, so it does not have to be bundled into their adoption. If the owner picks the scout's `ctx.settings` route instead, it must join the same mod-core SHA bump as those items and be blocked by that contract Issue.
- **Independent of item 3** (Auto Organize host only, different files).
- **Last overall** per the owner's priority (low priority, needs-triage). Blocked by: item 6.

## Owner decisions the Issue must carry

1. Storage and read path: declared keys in `data.json`, read with `loadData`, no contract change, author must keep unknown keys (recommended) versus a separate settings store with a new `ctx` member (scout's option B: mod-core change, SHA bump, new Rust commands or a `core/settings` map).
2. Types in v1: `boolean` and `string` only (recommended) or also `number`.
3. R1: await the old instance's data queue before the host write (recommended, data at risk) or accept the one-IPC window.
4. R5: drop a pending edit when the mod is switched off (recommended) or write it anyway.

## Not verified

- `Switch` and `Input` in `src/lib/components/ui/` were not read; that they forward `aria-label` and `onchange` is inferred from their use in `ModsStatusList.svelte:59-64` and `AutoOrganizeRuleRow.svelte`.
- That `reloadFolder` is the right seam for the write was traced in source only; the epoch interplay of a save racing a watcher reload of the same folder (both through one runner, `:830-841`) is believed safe because they share the serialized runner, not tested.
- `MODS/docs/examples.md` and the mods workspace CLAUDE.md conventions for adding fixtures were not read.
- No test, build or UI was run.
