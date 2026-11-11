# Item 7, host side: declarative settings in the manifest

Scout report. Low priority, nice-to-have (owner, 2026-11-11). Paths are relative to /Users/diegorv/Dev/pet-projects/koko/brain unless noted. Nothing was run; every claim below was read in code.

## 1. Verdict

Larger than items 1 to 3, and not host-only. A manifest list alone is useless unless the mod can read the values, so the item has four parts: manifest parsing, a Labs UI, a storage place, and a contract member for the mod to read (and react to) the values. Costs in order:

- Contract change: an additive `ctx` member (see section 4). That edits `packages/mod-core/src/contract/mod-api.v1.ts` in the mods workspace, needs a commit, then a host adoption by full SHA (docs/MOD-CORE.md "Updating the dependency"), then the d.ts for authors.
- Storage: the owner wrote "stored in mod data". Putting the values inside `data.json` collides with the mod's own `saveData` (section 3). A separate file needs a Rust change (Both gate). A no-Rust option exists (section 3, option C) at the price of coupling to `settingsStore`.
- UI: a new settings block in the mod's Labs row, with the draft-and-commit pattern.

Gate if the Rust route is chosen: Both (`cargo test`, `pnpm check`, `pnpm vitest run`), and `pnpm build` when the mod-core dependency SHA moves (`package.json` and `pnpm-lock.yaml` change; CLAUDE.md rule 6). No Rust and no SHA bump only if the values travel some other way, which section 4 rules out.

## 2. Exact code an implementation touches

| # | File:line | Change |
|---|-----------|--------|
| 1 | `src/lib/plugins/mods/mods.logic.ts:137-158` (`ModManifest`) | Add `settings?: ModSettingField[]` with JSDoc on the type and every field. Define the field types here (pure logic, no framework imports; `src/tests/lib/architecture/pure-logic.test.ts`). |
| 2 | `src/lib/plugins/mods/mods.logic.ts:173-223` (`parseModManifest`) | Destructure `settings` (line 188), validate, copy into `manifest` like `ruleActions` (216-221). Validation: array of objects; `key` non-empty string, unique, and not `__proto__`, `constructor`, `prototype` (values end up as property names); `type` in a closed set; `label` non-empty string; optional `default` of the matching type; optional `description` string. Every failure message starts `_system/mods/<folder>: manifest.json settings[N].<field> ...` through `fail`. |
| 3 | `src/lib/plugins/mods/mods.logic.ts` (new pure helper) | `resolveSettings(fields, stored: unknown): Record<string, value>`: keep only declared keys, drop values of the wrong type, fall back to `default`. This is the one place that defends against a hand-edited or stale file after a manifest change. |
| 4 | `src/lib/plugins/mods/mods.store.svelte.ts:2-20` (`ModStatusEntry`) | Add `settings?: ModSettingField[]` so the row can render the fields. Set only for `state: 'loaded'`. |
| 5 | `src/lib/plugins/mods/mods-host.service.ts:733-740` (the `upsertEntry` after `onload`) | Pass `settings: manifest.settings`. The other `upsertEntry` calls (648, 762, 930) are error and disabled rows: leave them without settings (see section 5, "disabled mod"). |
| 6 | `src/lib/plugins/mods/mods-host.service.ts:122-607` (`createModContext`) and `ModRuntime` 72-81 | Wire the new `ctx` member (section 4): read through the storage service, hold `onChange` subscribers as `disposable(...)` so unload removes them (pattern: `theme.onChange` 311-322, `watch` 560-565). Reading throws `Mod "<id>" is unloaded` through `assertLive` (124-126) like every member. |
| 7 | `src/lib/plugins/mods/mod-vault.service.ts:149-225` (`createModData`) | Pattern to copy for the storage service, not to edit. A new `createModSettings` (or a new file `mod-settings.service.ts`, preferred so `ModsStatusList` tests can mock it without mocking the whole host, as `ModsStatusList.test.ts:11-14` mocks `mods-host.service.js`) reuses the same FIFO queue idea (`inOrder`, 162-169). |
| 8 | New `src/lib/plugins/mods/mod-settings.store.svelte.ts` | Reactive values per mod folder so the Labs row and `ctx` `onChange` see one source. Getter-based, `$state.raw`, JSDoc on exports, `_reset()` for tests like `modsEnabledStore._reset` (`mods-enabled.store.svelte.ts:82-86`). Every computed getter needs a test (CLAUDE.md). |
| 9 | `src/lib/plugins/mods/ModsStatusList.svelte:49-78` (row markup) | Under the row header, render the entry's fields when `entry.state === 'loaded'` and `entry.settings?.length`. Controls: `Switch` for boolean, `Input` for string and number (both in `src/lib/components/ui/`). Layout can reuse `SettingItem` (`src/lib/core/settings/sections/SettingItem.svelte`, imported by `src/lib/app/LabsSection.svelte:6`), but the Labs list rows are plain `li` with `text-row`/`text-meta` classes, so a compact custom block is closer to the current look. aria-label per field (`Setting <label> of <mod name>`), as tests query by aria-label (`ModsStatusList.test.ts` uses `Enable <name>`). |
| 10 | `src/lib/plugins/mods/mods-host.service.ts` reload paths 802-823 | No change expected: a manifest edit reloads the mod (`MOD_FILES` in `mods.logic.ts:14`), so field definitions are static per instance. Verify with a test that new fields appear after a manifest save. |
| 11 | Docs and types (section 7) | Several files. |

Rust, only for the separate-file option: `src-tauri/src/commands/vault.rs:1174-1219` (`mod_data_path`, `write_mod_data`, `read_mod_data`), registration `src-tauri/src/lib.rs:362-363`, TS contract `src/lib/contracts/commands.ts:130,132,278,279`, Rust tests `src-tauri/tests/vault_file_ops_test.rs:139-170` and `vault_watcher_test.rs:449`.

No change needed: `mods-enabled.*` (per-mod on/off stays in localStorage, `mods-enabled.store.svelte.ts:18-19`), `mod-commands.store`, `mod-picker.store`, `src/lib/core/rule-actions/`, Auto Organize (`src/lib/features/auto-organize/`, unrelated), the editor-save path.

## 3. Storage: the real design question

Facts read:
- `data.json` is one JSON value owned by the mod; `saveData` replaces the whole file (`mod-vault.service.ts:208-223`, Rust `write_atomic` at `vault.rs:1201`). `loadData` on a corrupt file moves it aside (`mod-vault.service.ts:195-206`).
- The mods workspace's own example insists on an exact shape: `Object.keys(data).length !== 1` throws `Unsupported preferences` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/examples/persisted-preferences.ts`, the `loadPreferences` body). A host key added to `data.json` would break mods written like that.
- `docs/adr/0036-vault-mods-trust-loader-storage.md` (amendment): Rust builds the path with a fixed file name on purpose, because `std::fs` is outside the plugin-fs ACL and a general write command would be a way to overwrite any file. The plugin-fs ACL for `.kokobrain/**` only covers `$HOME/kokobrain-vaults` and `$DOCUMENT/kokobrain-vaults` (`src-tauri/capabilities/default.json:83-100`), so a vault anywhere else cannot be written from the webview with `writeTextFile`. Do not depend on plugin-fs for settings.
- The data folder is invisible to the watcher (`docs/agents/indexing-watcher-rules.md` rule 5), so a hand edit of a settings file is not noticed (same as `data.json`; `help/documentation/mods/05-mod-data.md` says so).

Options:

- **A. Reserved key inside `data.json`.** Rejected. Two writers (host and mod) to one file with whole-value replace: the mod's `saveData` erases the host's key, or the host's write erases the mod's data unless it reads, merges and writes inside the mod's queue. Shares the shape-strict mod problem above. No Rust change, but permanent hazard.
- **B. Separate `settings.json` in `.kokobrain/mods/<id>/`.** Recommended if the owner wants the values in the vault next to the mod's data. Add a `file`-style distinction to the two Rust commands, or two new commands `read_mod_settings`/`write_mod_settings` with the file name fixed in Rust (keeps the ADR's "no general write" property; a free `file` string argument would break it, so use a closed enum or separate commands). This is an IPC change: Both gate, Rust tests next to `vault_file_ops_test.rs:143-180`, and an ADR 0036 amendment line. Reuse `parseModData`, `serializeModData` and the corrupt-move logic from `mods.logic.ts:91-116`, or simpler: on unparseable settings, ignore the file, use defaults and log, and do not move it aside (a settings file is small and re-creatable; flag this as a decision). The same "failed load blocks saves" rule (`saveBlocked`, `mod-vault.service.ts:160`) should apply if a read error is distinguishable from NotFound.
- **C. The vault's own settings (`.kokobrain/settings.json`) under a `modSettings` map.** No Rust change. Costs: `Settings` type in `src/lib/core/settings/settings.types.ts`, default and parse in `settings.service.ts` (the `debugModRunMessages` pattern at lines 171 and 142 of `settings.service.ts` / `settings.store.svelte.ts` shows the per-key wiring, getter at store line 187, setter at 352), a store setter for a map, and a debounced persistence the owner does not control. It couples `core/settings` to mods data (`core/` must not import `plugins/`, ADR-0003, so the type must stay generic: `Record<string, Record<string, unknown>>`). Values travel with the vault's main settings file and its sync story. Viable, but the generic map in core settings is the kind of coupling the layer rules push against. Not recommended over B.

Recommendation: B, with the "unreadable file means defaults" rule, and say the choice to the owner before building (new Rust surface).

## 4. How the mod reads the values (contract)

Without a read path the item does nothing, because `ctx.mod` is only `{ id, name, version, dir }` and `description`, `author`, `ruleActions` are deliberately invisible to the mod (`help/documentation/mods/01-anatomy-and-loading.md`, bullet after the fields table). Two shapes:

- **`ctx.settings`** (recommended): `{ get(): Record<string, string | number | boolean>; onChange(cb): () => void }` or a single `ctx.settings: () => Promise<...>`. Additive to `ModContextV1`, so no `apiVersion` bump (contract header, `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/packages/mod-core/src/contract/mod-api.v1.ts:12-19`). Needs the exact signature agreed with the contract-side scouts; this report does not invent it. Prefer synchronous `get()` over declared defaults so a mod never waits on disk: the host loads values before calling `onload`.
- Mod re-reads on its own with `loadData`: not possible under option B (different file).

Loading values before `onload`: today `onload` is awaited right after `createModContext` (`mods-host.service.ts:720`); reading the file adds an await before it, inside the `loading` async block at 718-742. A failed read must not fail the mod (use defaults).

Conformance: `src/tests/lib/plugins/mods/mod-api-contract.test.ts:46-62` `CONTEXT_PUBLIC` uses `satisfies Record<keyof ModContextV1, true>` and line 231 compares `Object.keys(makeContext())` to the public list plus `HOST_UNSTABLE`. The new member must be added to `CONTEXT_PUBLIC`, with a new `SETTINGS_PUBLIC` block and a type import added at the top of the test (lines 8-26), or `pnpm check` fails. `src/tests/help/mods-types.test.ts:20-45` (`STABLE_TYPES`) and `help/examples/mods/kokobrain-mod.d.ts` must gain the new `...V1` types, or that test fails.

## 5. Existing pieces to reuse

- `parseModManifest` structure and the `fail(...)` helper (`mods.logic.ts:173-223`); `HEX_COLOR_PATTERN`-style constants at 163-167 for new patterns.
- `theme.onChange` / `watchModValue` for the subscribe-and-dispose shape (`mods-host.service.ts:311-322`, `mod-watch.svelte.ts`); callback errors go to `debug(tag, ...)` with `errorText` (319).
- `createModData` queue, `logged`, `assertLive` flow (`mod-vault.service.ts:160-182`).
- Row commit-on-`change` pattern for text inputs from Auto Organize (`src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:232-246`, `commitRename`; see item-03-host.md section 3). A half-typed value must not be live and written on every keystroke: commit on `change`. Switches commit at once.
- `modsStore.upsertEntry` / `ModStatusEntry` for what the row shows (`mods.store.svelte.ts`).
- Labs layout and the `SettingItem` component (`src/lib/app/LabsSection.svelte:36-52`).

## 6. Hidden costs and risks

- **Layer rules** (`src/tests/lib/architecture/layer-rules.test.ts`, ADR-0003): all new files live in `plugins/mods/`; `LabsSection.svelte` in `app/` already imports plugins (lines 9-11). Nothing from `core/` or `features/` needs to import the new store. The d.ts and docs are outside the layers. `mods.logic.ts` additions must import nothing but types.
- **Indexing and editor-save path**: untouched under B and A (`.kokobrain/` is a dot-folder: no `applyNoteChange`, no `notifyAfterSave`, no watcher event; `docs/agents/indexing-watcher-rules.md` rules 5 and 6). Under C the write goes through the settings persistence, also not a note save. Never route settings through `ctx.vault.write`: it would run the after-save path (ADR 0036 amendment 2026-11-06).
- **Loops**: a mod that calls a settings setter from `onChange` can loop. The contract above has no setter for the mod (the user edits in Labs), so there is no loop by design. If a later setter is added, `onChange` must not fire for the mod's own set, the same lesson as item 2.
- **Races**: two quick edits in Labs are two writes. Serialize through a FIFO per mod (the `inOrder` idea) and write the whole resolved object each time; the last write wins. A reload during a write: the old instance's queued writes reject at the head after unload (as `createModData` does), but the UI store holds the value, and the new instance reads the file on its load, which can happen before the old write lands. Order the read behind the queue of the folder, or accept a stale read in this rare case (CLAUDE.md "no code for rare races"; name it in the Issue and let the owner decide).
- **Stale values after a manifest edit**: a stored key no longer declared, a type change, a removed `select` option. `resolveSettings` drops them; do not delete them from disk (a toggle back restores). Defined behavior, needs tests.
- **Prototype keys**: stored JSON can carry `__proto__` as an own key. Only declared keys are copied, and `parseModManifest` must reject those key names. Without the second, a field with key `__proto__` assigns to the prototype of the values object.
- **Security under ADR 0036**: no new trust boundary; mods already have full trust. Labels, descriptions and defaults come from the manifest and reach the DOM: render as text only (Svelte escaping), never `{@html}`. Settings are plain text in the vault: do not offer a `password` type in v1 and say in the docs not to store tokens (same sentence as `05-mod-data.md` "Plain text, not a secret store"). Do not log values with `debug()` (tokens by habit); log the key only.
- **Performance**: a small file read once per load, a write per edit. The Labs list is rendered only when the Settings panel is open. No cost on the save or index paths.
- **Disabled and errored mods**: no `settings` on their entries, so no fields. The values stay on disk. Say so in the docs.
- **Type breadth**: every extra type (select, multiline, color, path) multiplies validation, UI and tests. Recommend v1 = `boolean`, `string`, `number` only, with optional `default`. Number needs a decision on empty input (restore default) and on `min`/`max`: leave those out in v1.
- **Mod-core adoption**: a new contract member means a commit and a push in the private mods repo, then `pnpm add -D '@kokobrain/mod-core@github:...#<sha>&path:/packages/mod-core'`, lockfile check, `pnpm build` (docs/MOD-CORE.md steps 1-6). CI uses the `MODS_REPO_READ_TOKEN` secret. Order the work so the host Issue is blocked by the contract Issue.
- **Docs promise**: `05-mod-data.md` line 3 tells authors to use `loadData` "for settings". After this item, say which is for what: manifest settings are user-edited options shown in Labs; `data.json` is the mod's own state.

## 7. Docs to update (English, no emojis, no em-dashes)

- `help/documentation/28-mods.md:63-93` (manifest example, field table at 88, "Unknown keys are ignored"), plus a short section on the Labs fields.
- `help/documentation/mods/01-anatomy-and-loading.md` (fields table, validation order and messages at 66-92, the "not visible to the mod" bullet, Labs section around 395-420 and the Labs rows description).
- `help/documentation/mods/05-mod-data.md` (where the file lives, new settings file, "not noticed" rule for hand edits, the "use it for settings" sentence).
- `help/documentation/mods/13-api-reference.md` (new `ctx` member section; error message index at 248).
- `help/documentation/mods/14-cookbook.md` (optional recipe), `help/documentation/mods/16-pitfalls-checklist.md` (optional).
- `help/examples/mods/kokobrain-mod.d.ts` and `src/tests/help/mods-types.test.ts` (types list).
- `docs/adr/0036-vault-mods-trust-loader-storage.md` (amendment for the new file under option B), `docs/MOD-CORE.md` only if its process text changes (it should not).
- The workspace side (not this report): `docs/examples.md` and an example mod.

## 8. Test plan (docs/TESTING.md: real stores and `.logic.ts`; mock only Tauri and side-effect services; each suite covers happy, empty, error)

Failing tests first.

1. `src/tests/lib/plugins/mods/mods.logic.test.ts`, new `describe('settings')` inside `parseModManifest` (pattern: `ruleActions` block at 295): valid list kept; `settings: []`; not an array; item not an object; missing or empty `key`, duplicate `key`, forbidden key names; unknown `type`; missing `label`; `default` of the wrong type; unknown keys dropped; first-failure order with the existing checks. New `describe('resolveSettings')`: defaults applied, stored value kept, wrong-type value dropped, undeclared key dropped, `null`/array/primitive stored value gives defaults.
2. `src/tests/lib/plugins/mods/mods.store.test.ts`: `settings` survives `upsertEntry`; absent on error and disabled rows.
3. New `src/tests/lib/plugins/mods/mod-settings.store.test.ts` and `mod-settings.service.test.ts` (mock `call` from `#lib/contracts/ipc.js`, as `mod-vault.service.test.ts` mocks Tauri): load absent file (defaults), unreadable bytes (defaults, no throw, nothing written), write goes through the FIFO in order, write failure leaves the store untouched (CLAUDE.md "do not update stores with partial data on error"), unloaded mod rejects, `onChange` fires once per change and not after unload.
4. `src/tests/lib/plugins/mods/mods-host.service.test.ts` (real host, pattern of `rule actions` at 413-477): a mod with `settings` in its manifest gets the stored values in `ctx` before `onload` settles; reload after a manifest edit shows the new fields and drops stale ones; unload removes `onChange` subscribers; a callback error is logged, not thrown into the host; the debug log does not contain the values.
5. `src/tests/lib/plugins/mods/mod-api-contract.test.ts` and `src/tests/help/mods-types.test.ts`: add the new member and types (section 4). These fail first, which is the guard that the contract and the d.ts moved together.
6. `src/tests/lib/plugins/mods/ModsStatusList.test.ts` (jsdom, mounts the component; mock the settings service, not the stores): a loaded mod with fields shows a switch, a text input and a number input; none for error and disabled rows; switch click writes at once; input writes on `change` and not on `input`; invalid number input restores the stored value; a failed write shows `toast.error` and keeps the old value. `src/tests/lib/app/LabsSection.test.ts` needs no change unless the layout changes.
7. Rust (option B only): `src-tauri/tests/vault_file_ops_test.rs` next to the `write_mod_data` cases (creates folders, replaces content, refuses a bad id and writes nothing, read returns `None` only for NotFound), and the watcher-test line at `vault_watcher_test.rs:449` as a pattern for "no event emitted".
8. E2E: `e2e/specs/vault-mods.spec.ts` exists; optional, only if the owner wants a Labs flow. Run through `bash scripts/e2e.sh`.

Commit order (one task per commit, CLAUDE.md): contract in the mods workspace first (separate repo), then host: logic + manifest tests; storage (Rust if B) + tests; ctx wiring + conformance + d.ts; Labs UI + tests; docs and ADR amendment.

## 9. Owner decisions the Issue must carry

1. Storage: B (separate file, new Rust surface) vs C (vault settings map), versus A (rejected here). Needs the owner because it is a new IPC command.
2. Field types in v1: `boolean`, `string`, `number` only?
3. Unreadable settings file: defaults and log (recommended) vs move aside like `data.json`.
4. Contract shape of the read path and whether `onChange` exists in v1 (a mod that only reads at `onload` needs a reload on change, which the host could do by calling the existing reload; that is simpler but waits for live runs, `waitForRuns` at 776-789).

## 10. Not verified

- The exact `ctx` member name and signature: depends on the contract scouts; not decided here.
- Whether `Switch`, `Input` and number inputs in `src/lib/components/ui/` forward `aria-label` and `onchange` as `ModsStatusList.svelte` and `AutoOrganizeRuleRow.svelte` use them: seen used, their component source was not read.
- `settings.service.ts` and `settings.store.svelte.ts` were read only through grep hits (lines cited), not in full, so option C's cost is an estimate.
- Rust side was read for `vault.rs:1150-1219` and registration lines only; `write_atomic` internals are as described in the ADR.
- `help/documentation/mods/16-pitfalls-checklist.md` and the cookbook were not opened.
- No test, build or UI was run.
