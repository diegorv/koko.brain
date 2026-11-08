## Where in code
- Palette UI: `src/lib/features/command-palette/CommandPalette.svelte:1-72`. It is a `Command.Dialog` with `shouldFilter={false}` (line 43), a `Command.Input` bound to `searchQuery` (line 47), and keyed items `{#each ... (command.id)}` (line 51). `executeCommand` (lines 27-37) records the recent id, closes the palette, then awaits `command.action()`. A throw shows `toast.error("Command "<label>" failed.")`.
- Ranking: `command-palette.logic.ts:4-44`, `filterAndRankCommands`. Fuzzy match runs on `cmd.label` only (line 24). Recents come first on an empty query (lines 9-18), and recent ids are boosted when scores are close (lines 35-37).
- Type: `command-palette.types.ts:1-7`. `AppCommand` = `{ id, label, category, shortcut?, action: () => void | Promise<void> }`. There is no `keywords`, `when`, icon, description, or argument.
- Store: `command-palette.store.svelte.ts`. `isOpen`, plus `recentCommandIds` persisted to localStorage key `kokobrain:recent-commands`, capped at 20 (lines 1-2, 42-46).
- Registry: `src/lib/app/commands.ts:93-374`, `getBuiltInCommands()`. It is one hard-coded array literal, plus two spread helpers: `railGoToCommands()` (lines 56-66) and `openViewCommands()` (lines 73-85).
- Mount: `src/lib/app/AppOverlays.svelte:18`, `<CommandPalette commands={getBuiltInCommands()} />`.
- Open shortcut: `src/lib/app/global-keybindings.ts:62-67`, Cmd+P calls `commandPaletteStore.toggle()`.
- Teardown: `command-palette.service.ts:4-5` resets the store only. It is called from `src/lib/app/lifecycle/app-lifecycle.service.ts:659`. The command list has no disposal.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- The palette has no registry. Its list is whatever array `getBuiltInCommands()` returns.
- Built-ins are added by editing `commands.ts`. `app/` is the composition root and may import features and plugins (its header comment says so, lines 87-92).
- Dynamic groups are reactive by read-inside-builder. `railGoToCommands` reads `railRegistryStore.navigators` and `settingsStore.layout` (lines 57-59). `openViewCommands` reads `typeDefinitionsStore.entriesByPath` and `fsStore.fileTree` (lines 74-75). The comment at lines 50-54 says the prop expression re-runs when those change. I did not verify that Svelte re-evaluates this prop as the comment says.
- Mods already have two seams, neither reaches the palette:
  - `ctx.addAction` stores into a per-mod plain `Map` (`src/lib/plugins/mods/mods-host.service.ts:118`, set at line 318, delete via disposer at line 320). It is listed only by the rail button's picker (`openPicker`, lines 250-275).
  - `ctx.addRailButton` (lines 323-357) registers into `railRegistryStore.registerAction` (`src/lib/features/rail-shell/rail-registry.store.svelte.ts:79-84`). Only `Rail.svelte:192` reads `railRegistryStore.actions`.
- `railGoToCommands` reads `navigators` only, so mod rail buttons get no "Go to" command.
- Mod picker (`src/lib/plugins/mods/ModActionPicker.svelte`) is a separate dialog. It has its own input step (lines 150-164) and run view (lines 102-149). Rows use `keywords` (line 172), which the palette does not use.

## What mods could do
- Today: nothing in the palette. The mod contract has no palette member (`src/lib/plugins/mods/contract/mod-api.v1.ts:289-329`, `ModContextV1`). A grep for `palette` in `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods` (`.ts`, `.js`, `.svelte`) returned no matches.
- Mods can reach palette-like entry points only indirectly. The `hotkeys` mod binds its own `window` keydown listener (`hotkeys/src/index.ts:18-19`) and also lists its actions in a rail picker (line 21). Mod actions are never in the palette.
- Possible once a seam exists: a mod action (or a "Go to" style entry) listed by label in Cmd+P, with recents, shortcut label (if any), and category.

## API sketch
Additive to the contract, so no `apiVersion` bump is needed under the rule at `mod-api.v1.ts:14-16`:
```ts
export interface ModActionV1 {            // existing: id, title, description?, input?, run
  /** Also lists the action in the command palette */
  palette?: {
    /** Group label in the palette row; defaults to the mod name */
    category?: string;
    /** Evaluated when the palette list is built; hidden when false */
    when?: () => boolean;
  };
}
```
Host side: a `paletteCommands` `$state.raw` registry (features layer, like `railRegistryStore`). `addAction` pushes `{ id: "mod:<modId>:<actionId>", label: title, category, action: () => runAction(...) }` and returns the disposer that `unloadMod` already runs (`mods-host.service.ts` ~395-420 `disposers`). `getBuiltInCommands()` (or a second prop) spreads the registry.

## Cost
M. Registry store and wiring are small and follow the `railRegistryStore` pattern. Tests needed: store, host registration and unregister on unload, logic for `when` and id collisions. It becomes L if the palette must take text input (see below) or show the mod run view.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Input: the palette has no argument step. `Command.Input` (line 47) is a label filter only. `AppCommand.action` takes no arguments (types line 6). An action with `input` would need a second step in the palette, and that step would duplicate `ModActionPicker`'s input logic (lines 150-164).
- Run view: `executeCommand` closes the palette before awaiting the action (lines 28-30). A mod action run from the palette must still go through `runAction` (`mods-host.service.ts:~200-245`) to get progress, log, Stop, and error toasts. A bare `action` would lose them.
- Layer rule: `features/command-palette` cannot import `plugins/mods` (CLAUDE.md layer table). Registration must flow through a features-level store, with `app/commands.ts` as the bridge. The text-input step cannot import `ModActionPicker` from `plugins/`.
- Reactivity: `mods-host` `actions` is a plain `Map` (line 118). A palette fed from it would not update when a mod loads. Use a `$state.raw` registry, as `rail-registry.store` does.
- Hot path: `filterAndRankCommands` runs on each keystroke over all commands (`CommandPalette.svelte:16-18`). `getBuiltInCommands()` also walks the whole file tree on each rebuild (`commands.ts:75` via `collectViewFiles`). Mod entries add little to this. I did not measure it.
- Ids: `{#each ... (command.id)}` is keyed on id (line 51). Mod ids must be prefixed (`mod:<modId>:<id>`) so two mods do not collide. I did not run a duplicate-key case to confirm the failure mode.
- Disposal: `resetCommandPalette` (line 659) clears only isOpen and recents. A registry must be emptied at vault teardown and per mod on unload. `unloadMod` already runs `live.disposers` (in reverse) and calls `modPickerStore.closeForMod`.
- Recents: stored by id in localStorage. Stale mod ids are dropped at render (`command-palette.logic.ts:12-13`), so they are harmless. Renamed ids will lose their recent rank.
- Data: none. Labels are shown as text, not HTML (`CommandPalette.svelte:58`).

## Bugs or complexity removed (say none if none)
- None found in the palette path. Not run.

## Could not verify
- That Svelte re-runs the `commands={getBuiltInCommands()}` prop when the read stores change. I relied on the comment at `commands.ts:50-54`. No test read.
- Contents of `src/tests/lib/features/command-palette/CommandPalette.test.ts` beyond its describe names, `src/tests/lib/app/commands.new-commands.test.ts`, and the frozen contract test `src/tests/lib/plugins/mods/mod-api-contract.test.ts` (referenced at `mod-api.v1.ts:17`, not opened).
- `help/documentation/28-mods.md` was only grepped for "palette" and "command" (no hits in the first lines). The rest was not read.
- Duplicate-key behavior in the keyed `#each` (line 51), and the palette's cost with many mod actions.
- I have no view of the haiku sub-agent runs or the plan's status referred to in the request. This report covers only the command palette surface.