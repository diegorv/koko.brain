# Issue 03 discovery: a mod's rail button opens a picker of its actions

Builds on `work/02` (host `plugins/mods/mods-host.service.ts`, contract `contract/mod-api.v1.ts`).

## Files that change

- `features/rail-shell/rail-shell.types.ts`: new `RailAction { key, label, icon: string, busy?, run }`.
- `features/rail-shell/rail-registry.store.svelte.ts:14-78`: fifth `$state.raw` list `actions`, getter, `registerAction` (replace by key, identity unregister), `reset()`.
- `features/rail-shell/Rail.svelte:101-114`: actions block (`data-rail-actions-divider`, `data-rail-actions`) after the pinned block, before `data-rail-bottom`; icon via `parseIconValuePermissive` + `getIconSync`, reading `fileIconsStore.packVersion`; fallback lucide `Puzzle`. Click calls `action.run()`; no `aria-current`.
- `features/file-icons/file-icons.service.ts`: re-export `preloadPacks`, so the host loads the module that runs `setOnPacksLoaded` (`:18`).
- `plugins/mods/contract/mod-api.v1.ts`: `ModActionV1`, `ModRailButtonV1`, `ctx.addAction`, `ctx.addRailButton`; freeze test.
- New `plugins/mods/mod-picker.store.svelte.ts`: `isOpen`, `modId`, `title`, `actions`; `open`, `close`, `closeForMod`, `reset`.
- `plugins/mods/mods-host.service.ts`: actions/buttons kept per ctx (closure), disposers pushed to `runtime.disposers`; `unloadMod` closes the picker for that mod; run wrapper (try/catch, toast, `debug`).
- New `plugins/mods/ModActionPicker.svelte`, mounted in `app/AppOverlays.svelte`.
- `e2e/specs/vault-mods.spec.ts`: hello mod gains an action and a button.

## Prior art

- Registry tests `rail-registry.store.test.ts`; Rail tests `Rail.test.ts` (pin icon test at `:337`).
- Picker: `OneOnOnePicker.svelte`; component test `templates/TemplatePicker.test.ts` (portal query, `scrollIntoView` stub).
- Host tests: fs map mock in `mods-host.service.test.ts`; palette: `commands.test.ts:489-517`.

## Defaults taken

- A duplicate action or button id throws from `addAction`/`addRailButton`; uncaught in `onload`, it is the load error `_system/mods/<id>: onload failed: Mod "<id>": duplicate action id "<x>"`.
- Mod input is validated at the boundary: `id` and `title` non-empty strings, `run` a function, `icon` a string, `actions` an array of strings; otherwise throws.
- `actions` ids resolve at click time, so a button may be registered before its actions; unknown ids are skipped.
- The picker holds a snapshot of the actions taken at open; it closes when that mod unloads.
- A button with no resolvable actions opens the picker with "No actions." (opens even for one).
- A disposer called twice is a no-op; a disposed action id may be registered again.
- `preloadPacks` failures go to `debug()`; the button keeps the fallback.
- `busy` is typed but not rendered (Issue 06).

## Risks

- The icon test relies on lucide-static's dynamic import being slower than the host start's microtasks; the fallback check runs right after start.
- Not verified: whether `Command.Dialog` traps Cmd+P while open (Issue Notes, check by hand).
