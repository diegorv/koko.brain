# 03: A mod's rail button opens a picker of its actions

**What to build:** `ctx.addAction` and `ctx.addRailButton` (PRD P5). A mod button shows in the rail; a click opens a picker with the button's actions; picking one runs it.

```js
export default {
	onload(ctx) {
		ctx.addAction({ id: 'hello', title: 'Say hello', description: 'Shows a toast', run: async () => ctx.notify('Hello') });
		ctx.addRailButton({ id: 'main', title: 'Hello mod', icon: 'lucide:sparkles' });
	},
};
```

- **`addAction({ id, title, description?, run })`** and **`addRailButton({ id, title, icon, actions? })`**. `actions` is a list of action ids and defaults to all of the mod's actions. Both return a disposer and are auto-disposed at unload (Issue 02). A duplicate id within one mod is an error at registration, shown like a load error.
- **Rail, generic and mod-agnostic** (so `features/` learns nothing about plugins): a fifth list in `railRegistryStore`, `registerAction(entry)` returning an identity unregister, like the four lists at `src/lib/features/rail-shell/rail-registry.store.svelte.ts:14-20` and `:41-70`. Add it to `reset()` (`:73-78`) and its test. `RailAction = { key, label, icon, busy?: () => boolean, run }`, `icon` a string ref (`pack:name` or a bare lucide name). `busy` is a function because the lists are `$state.raw` and change only by replacement (Issue 06 fills it).
- **Render (PRD P6).** `Rail.svelte` renders the actions as their own block with a divider, after the pinned block and before the bottom group (`src/lib/features/rail-shell/Rail.svelte:101-112`). Parse the icon with `parseIconValuePermissive` (`src/lib/features/file-icons/file-icons.logic.ts:41-48`) and render it with `IconRenderer`, with a lucide fallback, as `pinButton` does with its resolved icon (`Rail.svelte:138-156`, which goes through `resolveIconForPath`). A pack's SVGs exist only after it is loaded (`getIconSync` returns `undefined` before, `file-icons.icon-data.ts:306`), and packs are preloaded only when notes reference them. So registering a button calls `preloadPacks([pack])` (`file-icons.icon-data.ts:316`), and the render reads `fileIconsStore.packVersion` so it updates when the pack arrives (the pattern in `src/lib/features/file-icons/icon-resolver.ts:61-85`). A click calls `entry.run()`, never `onSelect`, so `layout.railItem` is never persisted and `aria-current` is never set. Key on `data-rail-item`: `mod:<modId>:<buttonId>`. Keep these out of `railItems()`, so they are not "Go to X" palette commands (`src/lib/app/commands.ts:56-66`) and not in Settings > Layout.
- **Picker.** `src/lib/plugins/mods/ModActionPicker.svelte` plus `mod-picker.store.svelte.ts`, mounted once in `src/lib/app/AppOverlays.svelte`, following the OneOnOnePicker pattern (`src/lib/plugins/one-on-one/OneOnOnePicker.svelte`: `Command.Dialog`, close on select, then await, toast on throw). It opens even for a single action. Rows show title and description.
- **Running an action.** The host awaits `run()` in try/catch. A throw shows `toast.error('<mod name>: <action title> failed: <message>')` and a `debug()` line, never Sentry (PRD P9). Issue 06 replaces close-on-select with the run view.
- **Unload.** A mod reload or unload removes its buttons and actions; an open picker showing that mod's actions closes.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `rail-registry.store.test.ts`: `registerAction` adds; unregister by identity removes only that entry.
  - `rail-registry.store.test.ts`: `reset()` also clears actions.
  - `Rail.test.ts`: an action button renders its label, calls `run` on click, never `onSelect`, and has no `aria-current`; a `lucide:` icon in a vault where no note uses lucide renders its SVG once the pack loads (not only the fallback); an unknown icon falls back.
  - `mods-host.service.test.ts`: after load the registry holds `mod:hello:main`; after unload it is empty; a duplicate action id records an error.
  - Picker component test (jsdom, real stores): lists the actions; picking one runs it; a throwing action shows the error toast.
  - Palette: the commands list has no entry for a mod button.
  - E2E (extend `vault-mods.spec.ts`): click `[data-rail-item="mod:hello:main"]`, pick "Say hello", assert the toast text in `[data-sonner-toast]`.

## Notes

- A `registerNavigator` would be wrong: its click persists `railItem` and opens a pane, and an unknown key restores to Today (V2).
- Many mods could overflow the rail; only the pinned block scrolls (`Rail.svelte:103-108`). Not handled in the MVP.
- Not verified: whether `Command.Dialog` traps global shortcuts such as Cmd+P while open. Check by hand.
- **Size:** M.

## Comments
