## Where in code
- Host: `/Users/diegorv/Dev/pet-projects/koko/brain/src/lib/plugins/mods/mods-host.service.ts`. `createModContext` 96-371, `unloadMod` 385-406, `loadMod` 430-491, `reloadFolder` 548-569, `startModsHost` 624-649, `stopModsHost` 692-705.
- Status store: `.../mods/mods.store.svelte.ts` (states `loaded | error | disabled`, line 12; `reset` 47-49).
- Runs store: `.../mods/mods-runs.store.svelte.ts`. `start` 78-85, `log` 88-90, `reset` 119-123.
- Picker and dialogs: `.../mods/mod-picker.store.svelte.ts`, `.../mods/mod-dialogs.store.svelte.ts`, `ModActionPicker.svelte`, `ModDialogHost.svelte`. Mounted in `src/lib/app/AppOverlays.svelte:21-22`.
- Lifecycle: `src/lib/app/LabsSection.svelte:27-31` (start/stop on the Labs switch), `src/lib/app/lifecycle/app-lifecycle.service.ts:166` (stop), `:535` (start), `:584` (stop), `:637` (`modsRunsStore.reset()`).
- Rail registry: `src/lib/features/rail-shell/rail-registry.store.svelte.ts` (`registerAction` 79, `reset` 87). Read by `src/lib/features/rail-shell/Rail.svelte:192`, with `busy()` at 357 and the busy mark at 376-377.
- Contract: `.../mods/contract/mod-api.v1.ts` (`ModContextV1` about 289-329, `ModV1` 332-337).

Paths below are relative to `/Users/diegorv/Dev/pet-projects/koko/brain/` unless absolute.

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)
- Mod contributions are per-mod `Map`s and host-owned lists, not a generic registry. `addAction` writes to a per-mod `actions` map (`mods-host.service.ts:118`, 295-322). `addRailButton` calls `railRegistryStore.registerAction` (344) and returns a disposer (352-355).
- Built-ins use the same rail registry: `src/lib/plugins/calendar/calendar-rail.service.ts:26,33`, `src/lib/plugins/one-on-one/one-on-one-today.service.ts:13`, `src/lib/plugins/kanban/kanban.service.ts:28`. They register at vault open and unregister at teardown. The registry exists because `features/` may not import `plugins/` (`rail-registry.store.svelte.ts:1-6`).
- Other surfaces are hard-coded. Command palette built-ins are a static array from `getBuiltInCommands()` (`src/lib/app/commands.ts:93`), so mods cannot add palette commands. The status bar has no registry (`src/lib/core/status-bar/StatusBar.svelte`).
- Per-mod cleanup list: `ModRuntime.disposers` (`mods-host.service.ts:49-58`), run in reverse at unload (399-405).

## What mods could do
- Today: actions with a picker and optional text input; rail buttons; `ui.alert/confirm/prompt/loading`; toasts; theme read and `onChange`; vault and workspace file access; `loadData`/`saveData`; `ctx.app` live objects (`mod-app.service.ts:23-44`); `ctx.kb`.
- Missing: status bar item, palette command, editor toolbar or gutter, note context-menu item, sidebar panel.
- Real mods work around this with raw DOM. `focus-timer/src/status-chip.ts:16-17` prepends a button into `.status-bar-group`, and its own comment says this can break when the app changes. `habits/src/habits.view.ts:152-155` appends a `<dialog>` to `document.body`.

## API sketch
```ts
// additive ModContextV1 member (contract version 1)
contribute<K extends keyof ModSlotsV1>(slot: K, spec: ModSlotsV1[K]): () => void; // disposer, like addRailButton

interface ModSlotsV1 {
  'statusBar.item': { id: string; text: string; title?: string; icon?: string; onClick?: () => void };
  'command': { id: string; title: string; keywords?: string[]; run: () => void | Promise<void> };
  'sidebar.panel': { id: string; title: string; icon: string;
                     mount: (el: HTMLElement, signal: AbortSignal) => void | (() => void) }; // imperative escape hatch
}
// Host: one $state.raw registry per slot in features/ (not plugins/), keyed by id,
// unregister by identity; disposer pushed to ModRuntime.disposers; mount() wrapped in try/catch.
```

## Cost
- M for declarative slots (status bar item, palette command). Each slot needs a registry in `features/`, a host wiring, additive contract members, and tests, including the frozen-surface test `src/tests/lib/plugins/mods/mod-api-contract.test.ts`.
- M to L for the imperative `mount()` escape hatch (DOM ownership, disposal, error isolation).
- L to XL for mod-supplied Svelte components or render functions (error boundaries, a reactivity bridge, layer changes).

## Risks (hot path, reactivity, layer rule, disposal on unload, data)
- Hot path: `log()` copies up to 500 lines and replaces the `runs` array on every call (`mods-runs.store.svelte.ts:80-84, 89`). A slot fed from `log`/`progress` would re-render per call; coalesce updates.
- Reactivity: mods hold plain JS and cannot write Svelte state. Push updates by replacing an entry in a `$state.raw` array, as `registerAction` does.
- Disposal: the host tracks only disposers (`mods-host.service.ts:49-58, 399-405`). It does not know about DOM nodes. `focus-timer/src/index.ts:12` removes its chip only through its own `ctx.register`. A new slot should own its nodes.
- Failure isolation gap: `focus-timer/src/status-chip.ts:9` attaches `onClick` with `addEventListener` and no wrapper. A throw there reaches `window.onerror`, not a toast or the run view. The theme callback is wrapped (`mods-host.service.ts:187-192`), and action runs are wrapped (234-246).
- Hung run: `waitForRuns` (523-535) blocks a reload until Stop or disable. A contributed command that never settles would have the same effect if it used the run wrapper.
- Stop during async `onload`: `stopModsHost` calls `unloadMod(live, true)` (701), which runs `onunload` (391-398) while `onload` is still pending. The contract comment (`mod-api.v1.ts:333-336`) does not say this.
- Layer rule: `plugins/mods` may import `features/` and `core/`. The slot registries must live in `features/` or `core/`, not `plugins/`.
- Data: contributions are in memory and cleared on stop (692-705). Enablement is per machine in localStorage (`mods-enabled.store.svelte.ts:12-19`). Mod data is in `.kokobrain/mods/<id>/` (`mods.logic.ts:11`).

## What breaks if a mod's render function throws inside a Svelte component
- No such function exists. `ModV1` has only `onload` and `onunload` (`mod-api.v1.ts:334, 336`). Mod code never runs during a Svelte render today. The one host callback that runs in render is Rail's `busy()` (`Rail.svelte:357`), which is host code.
- Hypothetically, Svelte 5.57.3 (`package.json:101`; `node_modules/svelte` 5.57.3) bubbles a render error up to the nearest boundary (`node_modules/svelte/src/internal/client/error-handling.js:22-60`). `src` has no `svelte:boundary` (grep returns none), so the error would reach the root.
- A generic API must catch in the mount wrapper and show a host error state, as the theme callback does (`mods-host.service.ts:187-192`).

## Bugs or complexity removed (say none if none)
- No host bugs confirmed in this read.
- Candidate dead code: `railRegistryStore.reset()` (`rail-registry.store.svelte.ts:87`) has no non-test caller (grep). Not removed; a caller trace is needed first.
- Minor: `folderEpochs` (75) and `toastedErrors` (85) are not cleared in `stopModsHost`. `toastedErrors` suppresses a repeat error toast for the same vault, folder and message after a reopen (420-421). Harmless but surprising.

## Could not verify
- No tests were run and the app was not run (read-only task).
- Root-level behavior after an uncaught Svelte render error: only the bubbling code was read.
- Whether habits' appended `<dialog>` is removed on unload: not traced.
- `help/documentation/28-mods.md` was checked only at grepped lines (17, 112, 170, 191, 195-196, 293-294), not read in full.
- Why earlier haiku attempts failed: I have no access to other workflow runs.