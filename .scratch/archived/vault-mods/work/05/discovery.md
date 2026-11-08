# Issue 05 discovery: action input, `ctx.vault`, `ctx.workspace`, `ctx.app`, `ctx.kb`

Builds on `work/03` (picker store, `ModActionPicker.svelte`, `createModContext`).

## Files that change

- `plugins/mods/mods.logic.ts`: `assertVaultPath(path)` (pure, throws `Invalid vault path "<path>"`).
- `plugins/mods/contract/mod-api.v1.ts`: `ModActionInputV1`, `ModActionV1.input`, `run(input)`, `ModVaultEntryV1`, `ModVaultV1`, `ModWorkspaceV1`, `ctx.vault`, `ctx.workspace`; freeze test.
- New `plugins/mods/mod-vault.service.ts`: `createModVault(vaultPath, assertLive)` and `createModWorkspace(...)`; plugin-fs + `call('create_folder' | 'create_note')`, `markRecentSave`, `applyNoteChange`, `addToTree`, `syncExternalContentToEditor`, `notifyAfterSave`, `openFileInEditor`.
- `plugins/mods/mods-host.service.ts:56-165`: `ModContext extends ModContextV1` with getters `app` and `kb`; `MOD_APP` const (one list); `vault`, `workspace`; action `input` validated and copied; `runAction(action, input)`.
- `plugins/mods/mod-picker.store.svelte.ts`: `ModPickerAction.input`, `run(input)`, `inputAction` + `askInput(action)`, cleared by open/close/closeForMod/reset.
- `plugins/mods/ModActionPicker.svelte`: second step with one `<input data-mod-input>` (TemplatePicker shape).
- `scripts/import-graph.mjs:47` `PLUGIN_ALLOWLIST` gains `plugins/mods -> plugins/queryjs` (owner decision in the Issue); ADR-0003 line 32 lists it. No baseline entry.
- `e2e/specs/vault-mods.spec.ts`: hello mod gains "New idea note".

## Prior art

- Host tests: `mods-host.service.test.ts` (fs map mock). New `mod-vault.service.test.ts` builds ctx with `createModContext` (as `mod-api-contract.test.ts:59`), mocks plugin-fs over an in-memory map and `@tauri-apps/api/core` invoke (create_note rejects without create_folder of its parent).
- kb: `queryjs-block-widget.test.ts:340-360` (invoke mock, `invalidateVaultEntries`, `collectionStore.setPropertyIndex`, `entryV2` fixture).
- Picker: `ModActionPicker.test.ts`.

## Defaults taken

- Enter runs `run(text)` with the text as typed, empty included (the Issue says `''` is a valid input); Escape closes via the dialog.
- Errors from plugin-fs propagate unwrapped; `runAction` already toasts and logs them.
- `create`/`write` re-check the live guard after each await before touching stores; a switch mid-call leaves the file in vault A and the store untouched.
- `write` checks existence first (clean message), then the dirty tab with no await before `writeTextFile(..., { create: false })`.
- `content` must be a string (mods are untyped), else `Mod "<id>": vault.<op> needs string content`.
- `list` keeps `readDir` order; `list('')` is the vault root; other paths go through `assertVaultPath`.
- The freeze test lists `app` and `kb` as unstable host members next to the contract ones.

## Risks

- Importing `KBAPI` pulls queryjs (and its charts module) into the host's import graph.
- E2E mock `create_note` creates parents itself, so only the unit test covers the missing-folder case.
