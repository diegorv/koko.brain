# Issue 14 discovery: `ctx.ui` dialogs and `ctx.theme` colors

Builds on `work/03` (picker), `work/05` (IME Enter rule in `ModActionPicker.svelte:72`) and `work/06` (run view). Same host shape: `ctx` members built in `createModContext` (`mods-host.service.ts:94`), cleanups through `disposable` (`:103`), unload in `unloadMod` (`:297`).

## Files that change

- `plugins/mods/contract/mod-api.v1.ts`: `ModUiV1 { alert, confirm, prompt, loading }` with option types; `ModThemeV1 { current, onChange }`, `ModThemeStateV1 { mode, colors }`, `ModThemeColorsV1` (the 20 listed tokens); `ModContextV1.ui` and `.theme`.
- New `plugins/mods/mod-dialogs.store.svelte.ts`: `$state.raw` queue of `{ id, modId, modName, kind, ... }`. `open(modId, modName, spec)` returns `{ id, result }`; `answer(id, value)`, `dismiss(id)` (settles with the kind's cancel value: alert `undefined`, confirm `false`, prompt `null`, loading `true` = cancelled), `closeForMod(modId)`, `reset()`. Getters `current` (head), `dialogs`.
- New `plugins/mods/ModDialogHost.svelte`: one `Dialog.Root` per current dialog (`{#key id}`), caption with the mod name, Title / Description, `Button`, `Input` (a `<textarea>` with input classes for `multiline`: there is no textarea in `components/ui`). Loading: no close button, Esc and outside click ignored.
- New `plugins/mods/mod-theme.svelte.ts` (runes need `.svelte.ts`; precedent `core/settings/settings-persistence.svelte.ts`): `MOD_THEME_TOKENS` (token -> CSS var), `readModTheme()`, `watchModTheme(cb)` via `$effect.root` on `appliedThemeStore.revision` + `isDark`, skipping the first run.
- `mods-host.service.ts`: `ui` and `theme` in `createModContext`; `unloadMod` calls `modDialogsStore.closeForMod(id)`.
- `app/AppOverlays.svelte:20`: mount `ModDialogHost` after `ModActionPicker`.
- `src/app.css`: `--card-foreground` in `:root` and `.dark`, set like `--popover-foreground`.
- Docs: `help/documentation/28-mods.md` (ctx.ui, ctx.theme, Your own UI and packages), `help/documentation/26-theming.md` (Global table is the mod contract).
- E2E `e2e/specs/vault-mods.spec.ts`: a mod action that confirms, prompts and creates a note.

## Tests (prior art)

- Store: `mod-picker.store.test.ts`. Component: `ModActionPicker.test.ts` (real host, mocked fs and toast). Host: `mods-host.service.test.ts` (globals, `__modCtx`). Contract: `mod-api-contract.test.ts`. New `mod-theme.test.ts` (current, onChange, freeze against `app.css`).

## Defaults taken

- The contract list is the Issue's 20 tokens; `tabBar` from the Global table is left out (a region token, not in the Issue's list). `26-theming.md` says so.
- `colors` values are `getComputedStyle(...).getPropertyValue(var).trim()`: any CSS color syntax the theme uses (`oklch(...)`, `#...`), not converted to hex.
- `ctx.ui` functions are async: bad arguments and calls after unload reject (like `ctx.vault`). `ctx.theme.current` / `onChange` throw synchronously (like `ctx.app`).
- `loading` starts the task at once, even when its dialog waits in the queue; the dialog closes as soon as Cancel or unload aborts the signal, and the promise follows the task.
- Confirm: the confirm button gets focus on open; Enter anywhere in the dialog confirms except on another button.

## Risks

- Two bits-ui dialogs open at once (picker run view + mod dialog): Esc and outside clicks must reach only the top one; a component test mounts both.
