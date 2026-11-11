# 07: A mod declares its settings in the manifest and Labs edits them

**What to build:** a mod's `manifest.json` gains an optional `settings` list of fields. Settings > Labs shows a control for each field in the mod's row. A value the user sets is stored as a top-level key of the mod's own `data.json`, so the mod reads it with the stable `ctx.loadData()` it already has. The host writes a value by reloading the mod: unload, read-merge-write `data.json`, load. No contract change, no new `ctx` member, no new IPC command.

```json
{
	"id": "daily-log",
	"name": "Daily log",
	"version": "1.0.0",
	"settings": [
		{ "key": "folder", "type": "string", "label": "Target folder", "default": "Inbox" },
		{ "key": "compact", "type": "boolean", "label": "Compact view" }
	]
}
```

```javascript
// In the mod: the same fallback as the manifest's default.
const { folder = 'Inbox', compact = false } = (await ctx.loadData()) ?? {};
```

**Blocked by:** 06

**Requires first (other repo):** nothing. `ctx.loadData()` is stable contract v1 (`help/documentation/mods/05-mod-data.md:5-7`) and returns the whole `data.json` value (`src/lib/plugins/mods/mod-vault.service.ts:185-206`). No `packages/mod-core` edit and no mod-core SHA adoption.

**Related (other repo):** the mods workspace build check `checkManifest` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/scripts/mod-loader.ts:46-74`) is a hand copy of `parseModManifest`. It ignores unknown keys, so it lets a manifest with a bad `settings` list deploy, and the host then refuses it. Mirroring the check there, with fixtures in `test/host-integration/manifest-check.test.ts`, is a workspace script edit. File it as a mods-repo Issue at triage if the owner wants it; it does not block this one.

**Status:** ready-for-agent

**Priority:** low (nice to have; the owner chose to build it on 2026-11-11)

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Manifest type.** `src/lib/plugins/mods/mods.logic.ts`: a `ModSettingField` type `{ key: string; type: 'boolean' | 'string'; label: string; default?: boolean | string }` and `settings?: ModSettingField[]` on `ModManifest` (`:138-158`), with JSDoc on the type and every field. Pure types only: the file imports nothing but types.
2. **Validation.** In `parseModManifest` (`mods.logic.ts:173-223`), after the `ruleActions` block (`:216-221`), strict like it: the first bad field fails the whole load through `fail` (`:175-178`), so the row shows **Error**. Message tails:
   - not an array: `settings must be a list of fields`;
   - an item that is not a plain object: `settings[N] must be an object`;
   - `key` not matching `/^[a-zA-Z][a-zA-Z0-9]*$/`: `settings[N].key must be letters and digits, starting with a letter`. The pattern rejects `__proto__` without a denylist;
   - a `key` already used: `settings[N].key "<key>" is used twice`;
   - `type` not `boolean` or `string`: `settings[N].type must be "boolean" or "string"`;
   - `label` not a non-empty string: `settings[N].label must be a non-empty string`;
   - `default` present and not of the field's type: `settings[N].default must be a <type>`.
   
   `settings: []` is valid. Unknown keys inside a field are dropped. The copy is a new array of new objects.
3. **Merge helper.** One pure `mergeModSettings(stored: unknown, patch: Record<string, boolean | string>)` in `mods.logic.ts`, returning `{ ok: true; value }` or `{ ok: false; reason }`:
   - `null` (no file, or a file holding `null`) becomes `{}` with the patch applied;
   - a plain object is spread and the patch applied, so every key the mod saved is kept;
   - any other value (array, string, number, boolean) refuses. The host never replaces data it does not understand.
4. **Status entry.** `ModStatusEntry` (`src/lib/plugins/mods/mods.store.svelte.ts:2-20`) gets `settings?: ModSettingField[]` with JSDoc. Only the loaded `upsertEntry` sets it (`src/lib/plugins/mods/mods-host.service.ts:733-740`). The error (`:648`), disabled (`:762`) and switch-off (`:930`) entries have none.
5. **Reading values.** A new exported `readModSettings(vaultPath, folder)` in `mods-host.service.ts`: `call('read_mod_data', { vaultPath, modId: folder })` (`src/lib/contracts/commands.ts:132`), `parseModData` (`mods.logic.ts:110`), and returns the object or a reason (read error, not valid JSON, not an object). It never moves a corrupt file aside: that stays the mod's `loadData` job (`mod-vault.service.ts:194-206`).
6. **Writing a value.** A new exported `saveModSetting(vaultPath, folder, key, value)` in `mods-host.service.ts`:
   - records the value in a per-folder pending patch (keys merge, last value wins), then calls `requestReload` (`:830`). `serializeWithRerun` (`src/lib/utils/inflight.ts:65`) already coalesces quick edits into one more pass;
   - in `reloadFolder` (`:802-823`), after the unload (`:815`) and before the load (`:822`), when the folder has a pending patch: wait for the old instance's data queue to drain (Behavior 7), take the patch, read, `mergeModSettings`, `serializeModData` (`mods.logic.ts:91`), `call('write_mod_data', ...)` (`commands.ts:130`). Then load as today, so the new instance's `loadData` sees the value;
   - on any failure (read error, corrupt, not an object, serialize or write error): `toast.error` naming `_system/mods/<folder>` and the key, `debug` with the key only, never the value; `data.json` untouched; the mod still loads;
   - a patch is dropped when the folder is switched off (`disableMod`, `:922`), when the manifest is gone (`reloadFolder`'s `!present` branch), and on `stopModsHost` (`:946-959`, next to `reloadRunners.clear()` at `:951`), so a patch never reaches another vault or a mod the user turned off.
7. **No write under the old instance.** After `live.unloaded = true` (`:623`) every queued `saveData` of the old instance rejects at its `assertLive()` (`mod-vault.service.ts:163-165`). One already past it has its `write_mod_data` in flight (`:217-220`). Keep the data queue's tail where the host can await it (`tail` is closure state at `mod-vault.service.ts:161,167`; expose it through `ModRuntime`, `mods-host.service.ts:72-81`), and await it before the host's read. Without this, that in-flight write can land between the host's read and write (the mod's save is lost) or after it (the user's value is lost).
8. **Labs row.** `src/lib/plugins/mods/ModsStatusList.svelte`, inside the row `li` (`:47-75`), below the row content item 06 adds:
   - only for `state === 'loaded'` and `settings?.length`;
   - values read with `readModSettings` when the row mounts and again each time the loaded entry is replaced (a reload upserts a new entry), through `$effect` with `untrack()` (docs/PATTERNS.md). A key that is absent, or holds a value of another type, shows the field's `default` (`false` or `''` without one). The host never writes defaults;
   - a refused read shows one line, `Settings unavailable: data.json is <reason>`, and no fields, so the user cannot write over the file;
   - a `Switch` per boolean, writing at once; an `Input` per string, committing on `change`, never per keystroke (the `AutoOrganizeRuleRow.svelte:382` pattern). An unchanged value writes nothing;
   - each control has `aria-label="Setting <label> of <mod name>"`. Labels reach the DOM as text only, never `{@html}`.
   
   The row shows the committed value until the re-read after the reload.

### Docs

- `help/documentation/28-mods.md`: a `settings` row in the manifest table (`:81-88`) and a short paragraph on the Labs fields.
- `help/documentation/mods/01-anatomy-and-loading.md`: the manifest example and fields table (`:31-57`), `settings` in the "not visible to the mod" bullet (`:62`; the mod reads the values, not the definitions), the new rows in the validation table (`:64-84`), a Labs setting edit in "What triggers a reload" (`:330-343`), and the fields in "Labs status rows" (`:406-418`).
- `help/documentation/mods/05-mod-data.md`: a section on declared settings:
  - declared keys are top-level keys of `data.json`;
  - **save what you loaded**: a mod that declares `settings` must keep unknown top-level keys, `saveData({ ...loaded, ...mine })`. A mod that saves a fresh object drops the user's values;
  - the mod applies the same defaults in code; the host never writes them;
  - a Labs edit reloads the mod (waiting for live runs, like a save of `main.js`);
  - "Plain text, not a secret store" (`:26`) applies; there is no password field.
  
  Adjust "use it for settings" (`:3`) and the hand-edit paragraph (`:29`) to match.

### Acceptance

- [ ] Failing test first, in `src/tests/lib/plugins/mods/mods-host.service.test.ts` (pattern of `reload on file change`, `:1040`): a loaded mod whose `data.json` holds `{ "count": 3 }` and whose manifest declares a string field `folder`; `saveModSetting(vault, folder, 'folder', 'Work')` unloads the mod, writes `{ "count": 3, "folder": "Work" }`, and the new instance's `loadData` returns it. It fails today, because `saveModSetting` does not exist.
- [ ] `mods-host.service.test.ts`: the write waits for a live run to end; an in-flight old-instance `saveData` lands before the host's read (Behavior 7); a corrupt, array or unreadable `data.json` is not written, a toast names the folder and the key, and the mod still loads; a write failure toasts, and no `debug` call contains the value; two quick saves give one merged write; `disableMod` and `stopModsHost` drop a pending patch; the loaded entry carries `settings`, the error and disabled entries do not.
- [ ] `src/tests/lib/plugins/mods/mods.logic.test.ts` (next to `ruleActions`, `:295`): valid list kept; `[]`; not an array; item not an object; bad key incl. `__proto__` and `1x`; duplicate key; unknown type; empty label; wrong-type default; unknown field keys dropped; first failure wins after the existing checks. `mergeModSettings`: `null` gives the patch; an object keeps unknown keys; an array, a string and a number refuse.
- [ ] `src/tests/lib/plugins/mods/mods.store.test.ts`: `settings` survives `upsertEntry`.
- [ ] `src/tests/lib/plugins/mods/ModsStatusList.test.ts` (mock `readModSettings` and `saveModSetting` in the existing `mods-host.service.js` mock, `:9-12`): fields only on loaded rows with `settings`; stored values shown, defaults for absent or wrongly typed keys; a switch click calls `saveModSetting` at once; a text field calls it on `change` and not on `input`; a refused read shows the line and no fields.
- [ ] Docs above updated.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Notes

- **Research:** `.scratch/mods-power/research/item-07-host.md` and `item-07-validation.md`, which wins where they differ. Code read at `c2bed3463`.
- **Owner decisions** (the owner accepted the recommended choice of each on 2026-11-11; Behavior follows them):
  1. **Storage and read path.** Recommended: declared keys in `data.json`, read with `loadData`, no contract change; the author must keep unknown keys when saving. Alternative (scout's option B): a separate settings file and a new `ctx` member, which costs a mod-core contract edit and SHA bump, `pnpm build`, the d.ts and contract conformance tests, and two new Rust commands (Both gate, ADR 0036 amendment). Choosing B replaces this Issue and adds a mods-repo contract Issue that blocks it.
  2. **Types in v1.** Recommended: `boolean` and `string` only; a mod parses a number from a string. Adding `number` needs a rule for empty and invalid input.
  3. **In-flight write (Behavior 7).** Recommended: await the old instance's data queue, since data is at risk. Alternative: accept the one-IPC window.
  4. **Pending edit on switch-off (Behavior 6).** Recommended: drop it; the row no longer shows fields. Alternative: write it anyway.
- **Why a reload, not an `onChange`:** the host writes only while no instance of the mod is live, so it never races the mod's own `saveData` (`mod-vault.service.ts:208-223` replaces the whole file). The docs already give the same rule for a hand edit (`05-mod-data.md:29`).
- **No loop:** `.kokobrain/` writes produce no watcher event (`docs/agents/indexing-watcher-rules.md` rule 5), so the host's write triggers no reload or index update, and nothing fires back into the mod.
- **Mods that would break if they opted in:** `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/examples/persisted-preferences.ts:9-16` throws on any extra key, and `mods/habits/src/habits.logic.ts:51-59` (`parseState`) keeps only its own keys. Neither declares settings; the docs rule above covers new ones.
- **Ordering:** after 06, which also changes the `ModsStatusList.svelte` row and its test. Independent of the contract items (01, 02, 04, 05) and of 03.
- Line numbers are from `c2bed3463`; locate each edit by the quoted text after earlier mods-power Issues land.
- **Cut:** a `ctx.settings` member, `onChange`, a settings store or service file, a `description` field, `number`/select/password types, host-written defaults, E2E, an ADR amendment (no new command, file or trust boundary under ADR 0036).
- **Not verified:** that `Switch` and `Input` (`src/lib/components/ui/`) forward `aria-label` and `onchange` is inferred from their use (`ModsStatusList.svelte:58-63`, `AutoOrganizeRuleRow.svelte:280-284,382`), not read in their source. The interplay of a setting save with a watcher reload of the same folder is believed safe because both go through one serialized runner (`mods-host.service.ts:830-841`); not tested. No test, build or UI was run.

## Comments
