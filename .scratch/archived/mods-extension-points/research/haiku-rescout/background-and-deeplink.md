## Where in code

- Contract, the only surface mods see: `src/lib/plugins/mods/contract/mod-api.v1.ts`. `ModContextV1` is at lines 289-329: `register`, `notify`, `log`, `addAction`, `addRailButton`, `vault`, `workspace`, `ui`, `theme`, `loadData`/`saveData`, plus unstable `app` and `kb`. There is no timer, schedule, event, deep-link, menu, status-bar or command-palette member.
- Host, which builds `ctx`: `src/lib/plugins/mods/mods-host.service.ts`. `createModContext` is at :96. `runAction` (run view, toast on failure) is at :204-247. `openPicker` is at :256-275. `addAction` is at :295 and `addRailButton` at :323. `loadMod` is at :430-491. `startModsHost` is at :624-649. `enableMod` and `disableMod` are at :656 and :668. `stopModsHost` is at :692.
- Rail button wiring: `mods-host.service.ts:344` calls `railRegistryStore.registerAction`. The store is `src/lib/features/rail-shell/rail-registry.store.svelte.ts:79-84`, a `$state.raw` list deduped by `key`.
- Run state: `src/lib/plugins/mods/mods-runs.store.svelte.ts`. Runs are keyed by rail `buttonKey` (:23). `start` (:78), `log` (:88), `progress` (:93) and `reset` (:119).
- Context members that reach the app: `src/lib/plugins/mods/mod-app.service.ts:23-53` (`MOD_APP`). It imports plugins (:11-17) under an allowlist. `MOD_APP` does not expose `addAfterSaveObserver`.
- Vault and workspace: `src/lib/plugins/mods/mod-vault.service.ts:71-112` (`create`/`write`), `:204-225` (`openNote`).
- Enable state: `src/lib/plugins/mods/mods-enabled.store.svelte.ts:16-25`. It is a localStorage key per vault path, not a vault file.
- Lifecycle callers: `src/lib/app/lifecycle/app-lifecycle.service.ts:513` (`executePendingAction`, step 8), `:525-538` (`startModsHost` in `setTimeout(0)`), `:584` and `:637` (teardown).
- Labs toggle: `src/lib/app/LabsSection.svelte:27-31`. Status list: `src/lib/plugins/mods/ModsStatusList.svelte:32-36`.
- Deep links: `src/lib/features/deep-link/deep-link.service.ts`:
  - serialized queue `:25-36`
  - handler registry `:39-76`. `RegisteredDeepLinkActionType` is `'daily' | 'capture'` at :39.
  - listener `:85-115`, mounted from `src/routes/(app)/+layout.svelte:58-59`
  - `resolveAndDispatch` `:153-174` (stores a pending action on vault switch)
  - `executeAction` switch `:182-216`
  - `executePendingAction` `:353-365`
- URI parsing: `src/lib/features/deep-link/deep-link.logic.ts:25` (`VALID_ACTIONS`) and `:44-135`. Types are in `deep-link.types.ts:2` and the union at :170.
- Registration of plugin-owned actions: `src/lib/app/deep-link-actions.ts:232-240` (`daily`, `capture`). `src/lib/app/boot.ts:54` calls it.
- Save hook that exists in core: `src/lib/core/editor/editor.hooks.ts:52` (`addAfterSaveObserver`) and `:67` (`notifyAfterSave`).
- URI scheme: `src-tauri/tauri.conf.json:50-52` registers `kokobrain`.
- Docs: `help/documentation/28-mods.md:106-113` (lifecycle) and `:515-523` (limits).

## Existing seam (a registry or store, or hard-coded? how do built-ins add to it?)

- Mods already have a registry seam. `ctx.addAction` and `ctx.addRailButton` write into per-mod maps. Rail buttons go into the app-wide `railRegistryStore` (`mods-host.service.ts:344`), the same store built-ins use. Built-ins register through `registerAction` (`rail-registry.store.svelte.ts:79`), so a mod button is a rail button with a `mod:<id>:<button>` key.
- Deep links are a registry, but a closed one. `registerDeepLinkAction` (`deep-link.service.ts:56`) accepts only `'daily' | 'capture'` (:39). `deep-link-actions.ts` in the app layer is where plugin code plugs in. The layer rule allows `plugins/` to call `features/` registration, so mods-host could register a new type without a feature-to-plugin import.
- Command palette, menus, status bar and Today sections have no mod seam. The rail registry has `registerTodaySection` and `registerNavigator`, but `ModContextV1` does not expose them. `ctx.app` could reach them with no compatibility promise.
- Startup work is possible today. `onload` runs for each mod at every vault open, after `initializeVault` step 8 and in the `setTimeout(0)` at `app-lifecycle.service.ts:535`.
- Timers and background work have no host API. A mod has to call `setInterval` or `setTimeout` itself and clear it through `ctx.register` or `ctx.signal`.

## What mods could do

Today:
- Run once at vault open (in `onload`), including async work.
- Add rail buttons and actions. Their runs show in the run view with progress, log and Stop.
- Read and write vault files, open notes, use dialogs and theme, and keep per-mod data in `.kokobrain/mods/<id>/data.json`.
- Subscribe to editor and store internals through `ctx.app`, which is unstable.

Possible with small additions:
- Interval or scheduled work in a mod, with an API that stops it at unload (`ctx.every` or `ctx.schedule`).
- Background runs with no button: start a run from `onload` or a timer and show it in the run view, reusing `modsRunsStore.start` with a synthetic `buttonKey`.
- `kokobrain://mod?vault=X&mod=<id>&action=<action>&input=<text>` to run a mod action. Only actions a mod marks as deep-link-able should run.
- Save and open-note triggers through a `ctx` method that wraps `addAfterSaveObserver`. `editor.hooks.ts` is core, so `plugins/` may import it.
- New entry points (command palette, menu, status bar item, Today section) each need a registry that core or features exposes. I did not read those registries, so their cost is a guess.

## API sketch

```ts
// Additive members of ModContextV1 (contract v1 minor bump)
interface ModContextV1 {
  every(ms: number, task: (signal: AbortSignal) => unknown): () => void;   // cleared at unload
  background(label: string, task: (run: ModRunV1) => unknown): void;     // shows in run view, no button
  onAfterSave(fn: (path: string) => void): () => void;                   // wraps addAfterSaveObserver
}
interface ModActionV1 {
  // ...existing fields
  deepLink?: boolean;   // only then may kokobrain://mod run this action
}
// deep-link.types.ts: add 'mod' to DeepLinkActionType and a ModAction { mod, action, input? }
// deep-link.service.ts: RegisteredDeepLinkActionType += 'mod'; mods-host registers the handler
```

## Cost (S, M, L or XL, and why)

- Startup work: S. Already works via `onload`. Only docs and a recipe.
- Timers (`ctx.every`): S to M. A wrapper over `setInterval` that uses `runtime.disposers` (mods-host.service.ts:105-116) and `ctx.signal`. Tests need fake timers.
- Background run view: M. Reuse `modsRunsStore`, but the run view is keyed by `buttonKey` and `modPickerStore.showRun` (:223), so a synthetic key must be checked against the picker.
- Deep link to a mod action: M. Parser, type union, handler registration, and a cold-start ordering fix (see Risks). Needs a deep-link test and a mods-host test.
- Save and open-note triggers: S to M. Wrapper plus disposal test.
- Scheduled jobs that persist across launches: L. Needs a scheduler, a persisted store and a Rust or file-backed clock. Not verified against any existing scheduler in the repo.
- Command palette or menu entry points: M each, pending the registry check.

## Risks (hot path, reactivity, layer rule, disposal on unload, data)

- Hot path, run logging: `modsRunsStore.log` copies up to 500 lines per call (`mods-runs.store.svelte.ts:46-52`, :88-90), and `progress` copies the runs array. A background job that logs in a tight loop is O(n × 500) on the main thread. Batch or throttle logs before adding a background API.
- Main thread: mods run on the app's main thread, and Stop cannot end a synchronous loop (`28-mods.md:515-517`). Background work can freeze the app at vault open.
- Reactivity: rail buttons read `railRegistryStore.actions` (`$state.raw`), so a mod's reload swaps entries by identity. A registry entry for a background job must follow the same identity rule (see the comment at `rail-registry.store.svelte.ts:8-10`).
- Startup ordering for deep links: `executePendingAction` runs at `app-lifecycle.service.ts:513`, but `startModsHost` runs in `setTimeout(0)` at :535. A cold-start `kokobrain://mod?...` link therefore runs before the mod is loaded. `executeAction` would then fail with the generic toast "Failed to execute deep link action: mod" (`deep-link.service.ts:213`). The fix has to run mod actions after the host has loaded, for example by awaiting a host-ready promise inside the mod handler.
- Layer rule: the deep-link feature must not import plugins (ADR-0003, per `rail-registry.store.svelte.ts:3-6`). Register from `mods-host.service.ts` and keep mod code out of `features/deep-link/`. Baseline debt does not cover this.
- Disposal on unload: `ctx.signal` aborts and cleanups run at unload (`28-mods.md:108`). A raw `setInterval` the mod forgets to clear keeps calling `ctx` functions, which then throw `Mod "<id>" is unloaded` as uncaught errors. Helpers must clear their own timers.
- Security and data: a URI can start arbitrary mod code, which has full trust and can call `ctx.vault.write` (`mod-vault.service.ts:94-112`). Existing deep links already create and overwrite notes, but a mod action can do anything the mod does. Keep deep-link triggering opt-in per action (`deepLink: true`). Do not pass URI text as code. Treat the `input` parameter as untrusted data.
- Dot-folder data: `.kokobrain/mods/<id>/data.json` is skipped by the watcher and index (`indexing-watcher-rules.md` rule 5). Background jobs that write notes must follow rule 6 and go through `ctx.vault` so `applyNoteChange` runs.

## Bugs or complexity removed (say none if none)

- None verified. The duplicate `registerAction` / `unregister` identity pattern in the rail store is intentional, per its own comment.

## Could not verify

- Command palette, menu, status bar and Today-section registries: I did not read them, so their seam and cost are unverified.
- The real mods in `/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods/<id>/src` were not read.
- Whether an uncaught error from a mod's timer reaches the run view or a toast. `grep` found no `window.onerror` or `unhandledrejection` handler in `src/lib` or `src/routes`. I did not check `src/app` or the Tauri entry points.
- Whether a scheduler or background job exists anywhere in the Rust side (`src-tauri/`).
- Test suite status: I listed `src/tests/lib/plugins/mods/` but did not run anything, per READ-ONLY.
- I cannot see earlier haiku sub-agent runs or their failures. This report is one read-only pass by one agent, so the "plan" status the user asked about is outside what I can check.