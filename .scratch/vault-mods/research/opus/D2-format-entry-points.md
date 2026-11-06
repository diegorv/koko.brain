# D2: Mod format, loading and entry points (design analyst)

Lens: where mods live in the vault, the manifest, how `main.js` is loaded under the CSP, the lifecycle (discover, reload, unload), the entry-point model and the `ctx` API surface, the placement under the layer rules, and how it is tested.

Inputs: V1 to V6 (validators) and the owner decisions already in `.scratch/vault-mods/PRD.md:7-38` (full trust, off by default per vault, Settings > Labs, reload on save without restart, `manifest.json` + `main.js` with `onload(ctx)`/`onunload()`). This report designs inside those decisions. It reopens one of them (where the per-vault toggle is stored), because the code shows it cannot deliver the owner's stated goal. See Owner question 1.

Read-only. Nothing was built or run. "INFERRED" marks conclusions from reading code. "From memory" marks web-platform facts I did not check against a source this session.

## Facts re-verified in this pass

The load-bearing facts below were read in the code during this pass, not taken from the validators.

- CSP is `default-src 'self'; script-src 'self' 'unsafe-eval'; ...` with no `blob:`, `asset:` or custom scheme in `script-src` (`src-tauri/tauri.conf.json:29`).
- A non-literal `import()` anywhere in `src/lib` fails the build gate: the scanner records `spec: null` for it (`scripts/import-graph.mjs:97-100`) and `layer-rules.test.ts:61-64` expects none. ADR-0003 forbids it outright (`docs/adr/0003-four-layer-source-taxonomy.md:35`).
- QueryJS evaluates text with `new Function` (`src/lib/plugins/queryjs/kb-api.ts:413`, `:552`) and wraps in an async IIFE only when the source contains the substring `await` (`kb-api.ts:409-411`).
- Settings live in the vault at `<vault>/.kokobrain/settings.json` (`src/lib/core/settings/settings.service.ts:13-19`). Recent vaults are per machine in `localStorage` under `kokobrain:recent-vaults` (`src/lib/core/vault/vault.store.svelte.ts:3`, `:44-56`).
- `onFileChange(listener)` hands every listener the raw path batch, self-saves included, and returns an unsubscribe (`src/lib/core/filesystem/fs.watcher.ts:59-72`). `stopWatching` does not clear listeners (`fs.watcher.ts:291-304`). Self-save filtering happens later, only inside `rebuildAllIndexes` (`src/lib/app/lifecycle/watcher-handler.service.ts:44`).
- The Rust watcher collapses ancestors and keeps the deepest paths (`src-tauri/src/vault/watcher.rs:103-115`) and drops every dot-folder event (Indexing rule 5, `docs/agents/indexing-watcher-rules.md:11`).
- A watcher batch with a dotted basename and no Markdown runs the full rebuild: `filePaths` keeps any basename with a dot (`watcher-handler.service.ts:36-39`), `mdPaths` is then empty (`:52`), the incremental branch is skipped (`:56`), and `rebuildIndex`, `buildPropertyIndex` and `buildFrontmatterIconIndex` run (`:71-73`). Indexing rule 4 states the same (`indexing-watcher-rules.md:9`).
- `railRegistryStore` has four `$state.raw` lists with identity-based unregister and no action-button kind (`src/lib/features/rail-shell/rail-registry.store.svelte.ts:14-20`, `:41-70`).
- `Rail.svelte` renders `top`, `navigator`, the scrollable pinned block and `bottom` (`src/lib/features/rail-shell/Rail.svelte:87-112`). `railButton` always calls `onSelect(item.key)` (`:126`). `pinButton` already renders a string icon through `IconRenderer` with a lucide fallback (`:138-156`).
- `parseIconValuePermissive` accepts `pack:name` or a bare lucide name (`src/lib/features/file-icons/file-icons.logic.ts:41-48`). `getIconSync(pack, name)` returns `undefined` when the pack is not loaded (`src/lib/features/file-icons/file-icons.icon-data.ts:306`). `IconRenderer` sanitizes the SVG (`src/lib/features/file-icons/IconRenderer.svelte:36`).
- Vault-lifetime registrations go in `unregisterNoteChangeConsumers`, released at `initializeVault` entry (`src/lib/app/lifecycle/app-lifecycle.service.ts:160-161`) and in `teardownVault` (`:571-572`). The watcher listener is registered in Step 7 (`:486-506`), and Step 9 is a version-guarded `setTimeout` for post-open work (`:516-527`).
- `AppOverlays.svelte` mounts each picker once and passes `getBuiltInCommands()` to the palette (`src/lib/app/AppOverlays.svelte:1-18`). `SettingsPanel.svelte` lives in `app/` and already imports a plugin section (`src/lib/app/SettingsPanel.svelte:18`, `:84`).
- `SettingsSection` is a closed union (`src/lib/core/settings/settings.types.ts:331`) and the sidebar groups are `SETTINGS_SECTION_GROUPS` (`src/lib/core/settings/settings.logic.ts:217-266`). `parseSettings` merges each block explicitly (example `queryjs` at `settings.service.ts:182-184`).
- `createFile` creates through the Rust `create_note`, marks the self-save and routes through `applyNoteChange` (`src/lib/core/filesystem/fs.service.ts:198-224`). `reloadExternallyChangedTabs` skips dirty tabs (`src/lib/core/editor/editor.service.ts:423-452`, the skip at `:428`).
- E2E can seed files and simulate a watcher batch: `window.__e2e.fs.writeFile` and `window.__e2e.events.emit('vault-files-changed', { paths })` are used by existing specs (for example `e2e/specs/kanban-view.spec.ts:20`, `e2e/specs/collection-block.spec.ts:46`). The virtual scan skips dot entries the way Rust does (`e2e/mocks/virtual-fs.ts:242-243`).
- The privacy gate scans `src/**/*.{ts,svelte,js}` for `fetch(`, `new Worker(`, `script.src =`, `@tauri-apps/plugin-http`, URLs and more (`.github/workflows/privacy.yml:32-60`). `new Function` is not in the list.
- No frontend code reads the app version through `@tauri-apps/api/app` (grep of `src`, `e2e`, `vite.config.js`: no hit). The version is shown by a `BuildInfo` component (`src/lib/core/settings/sections/UpdateSection.svelte:231`), whose source I did not trace.

---

## Recommendations (with objections)

### R1. Mods folder: `_system/mods/<mod-id>/`, visible, fixed path

One folder per mod under the vault-relative path `_system/mods/`. The folder name must equal `manifest.id`.

Why:
- Reload on save is an owner requirement (`PRD.md:19-21`). A visible folder gets watcher events for free through `onFileChange` (`fs.watcher.ts:66-72`). A dot folder never does (Indexing rule 5), so `.kokobrain/mods/` would need a second Rust watcher, a poller or a manual "Reload mods" button.
- plugin-fs already grants read on `**` under both vault roots (`src-tauri/capabilities/default.json:36-81`). No capability change.
- `_system` is the existing system-folder convention (`settings.store.svelte.ts:94-97`). It keeps mod READMEs out of the note list, nav counts and inbox badge (`settings.types.ts:172-177`). QueryJS scripts are already visible `.js` files in vaults, so `.js` in the tree is not new.
- The owner can open and edit `main.js` inside Kokobrain: a `.js` opens as text (`editor.service.ts:109-113`, per V3), and its save reaches the mods listener because `onFileChange` sees self-saves.

The path is a constant (`MODS_DIR = '_system/mods'`), not derived from `templates.systemFolder`. That setting is labelled for templates and type-sidebar exclusion (`settings.types.ts:172-177`), and it can be the empty string. Tying mods to it would make mods vanish when the user edits an unrelated field.

Strongest objection: every external save of `main.js` triggers a full index rebuild (`watcher-handler.service.ts:36-73`). **Partly holds.** The cost was never measured, and `scan_vault_v2_cached` re-reads only changed files (V3), so it is a vault walk plus two TS bulk builders per save. Mitigation in the reload Issue: before the decision in `rebuildAllIndexes`, drop paths under `<vault>/_system/mods/` that are not `.md`, `.markdown` or `.view`. A batch made only of mod code then takes the existing "skip" branch. That is a narrow edit to code governed by Indexing rule 4, so the Issue must cite and re-read `docs/agents/indexing-watcher-rules.md`. Markdown in the mods folder keeps today's behaviour.

Second objection: mod files clutter the Files tree and a `README.md` there is indexed by FTS5. **Holds, accepted.** It is one folder under `_system`, and the alternative costs new Rust watcher code. See Owner question 2 if the owner prefers hidden files over reload on save.

### R2. Manifest: identity only, no entry points, no permissions

```json
{
  "id": "prd-writer",
  "name": "PRD writer",
  "version": "0.1.0",
  "description": "Turns a brief into a PRD and Issues",
  "author": "Diego",
  "minAppVersion": "4.0.0"
}
```

- Required: `id` (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 chars, equal to the folder name), `name` (non-empty), `version` (non-empty string). Optional: `description`, `author`, `minAppVersion`.
- Unknown keys are ignored, so later fields do not break older apps.
- No `permissions` field. The owner chose full trust (`PRD.md:9-11`), and V6 found that no prior art (Obsidian, VS Code, Raycast) has an enforced permission field. A declared permission that nothing enforces would mislead the reader.
- No entry points in the manifest. `onload(ctx)` registers them (owner decision, `PRD.md:35`).
- `minAppVersion` is parsed and shape-checked but not enforced in the MVP. The frontend has no app-version read today (grep above), and `@tauri-apps/api/app` is not among the nine E2E aliases (`vite.config.js:57-67`, per V5). Enforcing it needs a version source and an E2E alias, which is out of proportion for a single-author MVP.

Parsing and validation go in a pure `mods.logic.ts` (no Tauri, store or framework imports, per `pure-logic.test.ts`). Each failure names the folder and the field: "`_system/mods/foo`: manifest.json id `bar` does not match the folder name".

Objection: VS Code-style declarative `contributes` would allow lazy activation and show buttons even when `main.js` fails. **Does not hold for the MVP.** The owner chose imperative registration (`PRD.md:35`). With a handful of mods there is no startup cost worth lazy loading, and a button whose code failed to load should not appear.

### R3. Loading: read as text, evaluate with `new Function`, with a narrow `export default` rewrite

This is the only route that works under the current CSP and build gates:
- `import()` of a `blob:`, `data:` or `asset:` URL is not allowed by `script-src 'self' 'unsafe-eval'` (`tauri.conf.json:29`, INFERRED from the CSP text, not run).
- Any `import(variable)` in `src/lib` fails `layer-rules.test.ts:61-64`.
- `'unsafe-eval'` is present, and QueryJS has proved `new Function` in the shipped app (`kb-api.ts:413`, `:552`).

The owner asked for an ES module that default-exports the mod (`PRD.md:31-35`). Under `new Function`, `import` and `export` are syntax errors. So the loader does one textual rewrite and nothing else:

1. Read `main.js` with `readTextFile` from `@tauri-apps/plugin-fs`, inside a try/catch that logs and rethrows (unlike `loadExternalScript`, `queryjs.service.ts:4-6`, which has none).
2. Require exactly one match of `/^export\s+default\s+/m` and replace it with `__kokoMod.default = `. Zero or more than one match is a load error that names the file.
3. Evaluate this, where `<code>` is the result of step 2:

   ```js
   const body = `"use strict";\n${rewritten}\n//# sourceURL=kokobrain-mods/${id}/main.js`;
   const holder = {};
   new Function('__kokoMod', body)(holder);
   const mod = holder.default; // must be an object with an onload function
   ```

4. Any other `import` or `export` statement surfaces as the engine's `SyntaxError`. The loader rewords it: "`main.js`: only one `export default` is supported, no `import`. Put the mod in one file."

Effects:
- Always strict mode, with no `includes('await')` heuristic (the QueryJS wrapper changes semantics when a comment contains "await", `kb-api.ts:409-411`). Top-level `await` is not supported. `onload` may be `async`.
- `//# sourceURL` names the file in devtools stack traces (supported by WebKit for `eval`/`Function` code, from memory, not checked).
- Reload is free of module-cache problems: each load evaluates fresh text. A real ES-module loader would need cache-busting URLs, and old module records are never freed.
- The default export is an object with `onload(ctx)` and optional `onunload()`. A class author writes `export default new MyMod()`. No base class, because a mod cannot import one.
- One file per mod in the MVP, which is the fallback the PRD already names (`PRD.md:36`).

Strongest objection: a regex on source text is brittle. A line inside a template literal or comment that starts with `export default` would be rewritten. **Holds in theory, rare in practice.** The anchor is line start, the count must be exactly one, and a wrong rewrite fails loudly as a syntax or load error instead of silently misbehaving. The alternative is a real tokenizer (no parser dependency exists, and adding one for one statement is out of proportion), or authoring in `module.exports` style (rejected below because the owner asked for ESM syntax).

Second objection: "it looks like an ES module but is not one". **Holds, documented.** The authoring doc says it in its first lines. The upside is that a mod written today keeps working unchanged if a real module loader (R-later, custom scheme) ever lands.

### R4. Lifecycle: host started per vault, per-mod serialized reload, two release points

A `mods-host.service.ts` in `src/lib/plugins/mods/` owns a host instance per open vault.

- **Start.** In `initializeVault` Step 9, inside the existing version-guarded `setTimeout` (`app-lifecycle.service.ts:516-527`), so mods never delay the vault open: if mods are enabled for this vault, `startModsHost(vaultPath)`. Store its stop handle in a dedicated slot (like `unregisterCalendarDailyNote`, `:268-270`), released both at `initializeVault` entry (next to `:160-168`) and in `teardownVault` (next to `:571-574`). Stop is a no-op when nothing is loaded, because the boot path calls `teardownVault()` with no vault (`+layout.svelte:80-87`, per V3).
- **Discover.** `readDir('<vault>/_system/mods')`. A missing folder means zero mods, not an error. Each subfolder is loaded on its own, in parallel with `Promise.allSettled`, so one broken mod never blocks another (`PRD.md:21`).
- **Load one.** Parse the manifest, evaluate `main.js` (R3), build a `ctx`, then `await mod.onload(ctx)` inside try/catch. On any failure, release whatever `onload` already registered and record the error.
- **Unload one.** Abort the mod's `ctx.signal`, call `onunload()` in try/catch, then run every disposer `ctx` collected, in reverse order, even if `onunload` threw. Disposers, not the mod's own cleanup, are what remove rail buttons and actions. That is what makes reload safe (`PRD.md:35`).
- **Watch.** The host registers its own `onFileChange` listener at start and unsubscribes at stop (`stopWatching` does not clear listeners, `fs.watcher.ts:291-304`). It does not share the lifecycle's 300 ms debounce, which feeds `rebuildAllIndexes` (`app-lifecycle.service.ts:486-498`). Rust has already debounced by 500 ms.
- **Reload rule.** For each path in a batch that lies under `<vault>/_system/mods/`:
  - the path is the mods folder itself: rediscover everything;
  - the path is a mod folder (a deletion often arrives as just the folder, given ancestor collapse at `watcher.rs:103-115`), or a `manifest.json` or `main.js` directly inside one: reload that mod id;
  - anything else (README, editor backup files such as `main.js~`): ignore.
  Reload = unload, then load from disk. If the folder or `manifest.json` is gone, unload only. Reloads are serialized per mod id with the existing `serializeWithRerun` (`app-lifecycle.service.ts:486`), so a save burst cannot interleave two loads of one mod. A generation counter drops a load that finishes after a newer one started.
- **Vault switch guard.** `ctx` captures the vault path at load. Every host call checks that `vaultStore.path` still equals it and that `ctx.signal` is not aborted, and throws `Mod "<id>" is unloaded` otherwise. QueryJS captures `vaultPath` the same way but never checks it (`kb-api.ts:103`, per V1), which is the leak V1 describes.
- **Status.** A small `mods.store.svelte.ts` (`$state.raw` list of `{ id, folder, name, version, state: 'loaded' | 'error', error?: string }`) feeds Settings > Labs. A load error also shows one toast naming the folder.

Strongest objection: a synchronous infinite loop in `onload` or an action freezes the whole app, and the host cannot stop it. **Holds, accepted.** Same-realm code cannot be pre-empted. Only a Worker or iframe realm could be, and the owner ruled isolation out (`PRD.md:10-11`). The doc says so, and the recovery is to fix the file outside the app or turn mods off. Async hangs are covered by `ctx.signal` and the Stop control (R7).

Second objection: why not reuse `unregisterNoteChangeConsumers`? **Holds partly.** The host's stop is async (it awaits `onunload`), while that list holds sync closures. A dedicated slot keeps the async stop explicit, and a lifecycle test pins both release points.

### R5. Entry-point model: actions are the unit, entry points point at actions

Two registration calls, modelled on VS Code's `commands` plus `menus` split (V6):

```js
export default {
	async onload(ctx) {
		ctx.addAction({
			id: 'write-prd',
			title: 'Write a PRD from this note',
			description: 'Runs agents and writes the PRD next to the note',
			run: async (run) => { /* run.signal, later run.form(...) */ },
		});
		ctx.addRailButton({ id: 'main', title: 'PRD writer', icon: 'lucide:sparkles' });
	},
};
```

- `addRailButton({ id, title, icon, actions? })`: `actions` is a list of action ids and defaults to every action of the mod. A click opens the action picker filled with those actions. The picker opens even when there is one action, which keeps the click behaviour predictable and the tests simple. A "run directly" flag can come later.
- Later entry points reuse the same actions: a "Mod: <title>" palette command per action, a note-action-bar More-menu item, an app event. None needs a new action shape.

Rail integration (generic, not mod-aware, so `features/` never learns about plugins):
- Add a fifth list to `railRegistryStore`: `actions: RailAction[]` with `registerAction(entry)` returning the identity unregister, following `rail-registry.store.svelte.ts:41-70`. `RailAction = { id: string; label: string; icon: string; run: () => void }`, where `icon` is a string ref, not a component.
- `Rail.svelte` renders them as their own block, with its own divider, after the pinned block and before `data-rail-bottom` (`Rail.svelte:101-112`). The icon goes through `parseIconValuePermissive` + `getIconSync` + `IconRenderer`, with a lucide fallback, exactly like `pinButton` (`Rail.svelte:138-156`). The click calls `entry.run()` and never `onSelect`, so `layout.railItem` is never persisted (`app/rail-navigation.ts:23`, per V2), and `aria-current` is never set.
- Keys are `mod:<modId>:<buttonId>` on `data-rail-item`, so they cannot collide with built-in, `view:` or `type:` keys.
- The action items are kept out of `railItems()`. That keeps them out of the "Go to X" palette commands (`app/commands.ts:56-66`, per V2) and out of Settings > Layout hide/order in the MVP. Turning the mod off, or deleting its `addRailButton` line, hides it.

Picker: `ModActionPicker.svelte` plus `mod-picker.store.svelte.ts` in `plugins/mods/`, mounted once in `app/AppOverlays.svelte`, copying the OneOnOnePicker pattern (`Command.Dialog`, close on select, then await the action, toast on throw; V2 1.3). The row shows title and description. A second step for inputs (R6, `run.form`) follows TemplatePicker's two-step flow (V2 1.3).

Strongest objection: why not reuse `registerNavigator`? **Does not hold.** A navigator is a panel plus a lens, and its click persists `railItem` and opens a pane (`rail-shell.types.ts:175-186`, V2 1.2). An unknown key restores to Today (`lens.logic.ts:206`, per V2).

Second objection: many mods overflow a 48 px rail, and only the pinned block scrolls (`Rail.svelte:103-108`). **Holds at scale, not for the MVP.** A single author with a few mods will not overflow. If it does, the mod block gets the same `overflow-y-auto` treatment as pins. See Owner question 3 for placement taste.

### R6. The `ctx` API surface (contract v1)

`ctx` is a convenience and lifecycle-tracking surface, not a security boundary: with full trust a mod can reach `window.__TAURI_INTERNALS__` and every app command anyway (V1, V6). Its value is that everything registered through it is undone on unload, and that it hides Kokobrain internals that will change.

It is a hand-written, versioned contract at `src/lib/plugins/mods/contract/mod-api.v1.ts`, following the rules at the top of `contract/kb-api.v1.ts:1-27` (function-typed members, imports nothing, `.ts` not `.d.ts`, additive changes are minor), frozen by a contract test like `kb-api-contract.test.ts`.

Mod-lifetime `ctx` (given to `onload`):

| Member | MVP slice | Notes |
|---|---|---|
| `ctx.apiVersion` (`1`), `ctx.mod` (`{ id, name, version, dir }`) | 1 | `dir` is vault-relative |
| `ctx.signal` | 1 | aborted at unload or vault switch |
| `ctx.addAction(def)`, `ctx.addRailButton(def)` | 1 | each returns a disposer and is also auto-disposed |
| `ctx.register(fn)` | 1 | extra cleanup (timers, DOM listeners), Obsidian's `register` |
| `ctx.notify(message, { kind? })` | 1 | `svelte-sonner` toast, prefixed with the mod name |
| `ctx.log(...args)` | 1 | `debug('MOD:<id>', ...)`, file log when the user enabled it |
| `ctx.vault.read / list / exists / create / write` | 5 | vault-relative paths, translated to absolute at one host boundary (Indexing rule 9). `create` goes through `createFile` (`fs.service.ts:198-224`), which already routes through `applyNoteChange` (Indexing rule 6). `write` to an existing file uses plugin-fs `writeTextFile` without `markRecentSave`, so the watcher treats it like an external editor's write: open clean tabs reload and the index updates incrementally (`watcher-handler.service.ts:56-63`, `editor.service.ts:423-452`). Paths with `..` or a leading `/` are rejected (convenience, not security) |
| `ctx.workspace.openNote(path)` | 5 | opens the note the action created |

Run-lifetime `run` (given to `action.run`):

| Member | MVP slice | Notes |
|---|---|---|
| `run.signal` | 7 | aborted by Stop, by mod unload or by vault switch |
| `run.form(schema)` | 6 | declarative fields (`text`, `textarea`, `select`, `checkbox`) rendered by the host in the picker's second step; resolves to values, or `null` when the user cancels |
| `run.progress(text)` | 7 | updates the running indicator |

Reserved names, designed in other lenses and not in v1: `ctx.http`, `ctx.mcp`, `ctx.agents`, `ctx.secrets`. Each needs a new Rust broker, because webview `fetch` is blocked by `connect-src` and plugin-http is scoped to two hosts (`tauri.conf.json:29`, `default.json:223-266`, per V4), and process spawn does not exist (V4).

What to reuse from QueryJS, and what not:

| Reuse | Source |
|---|---|
| Text plus `new Function` evaluation (with strict mode, an exact wrapper and `sourceURL`) | `kb-api.ts:413`, `:552` |
| Path containment idea (reject `..`) | `kb-api.ts:526-538` |
| Structured error display (title, stack in `<details>`) for the Labs error list | `queryjs-block-widget.ts:288-328` (per V1) |
| Versioned hand-written contract plus a freeze test | `contract/kb-api.v1.ts:1-27` |

| Do NOT reuse | Why |
|---|---|
| `KBAPI` as `ctx` or as `ctx.kb` | bound to a block container, shares mutable page objects, exposes `loadScript` at runtime (V1 constraint 8). Importing it from `plugins/mods` is also a `plugin->plugin` violation (V5) |
| The `includes('await')` wrapping heuristic | changes semantics on a comment (`kb-api.ts:409-411`) |
| `queryjs-session.store` caching | keyed by absolute path, cancels nothing, leaks across vaults (V1) |
| The auto-run policy setting | mods are opt-in per vault, not per note open |
| `kb.view` / `loadExternalScript` as the loader | no try/catch (`queryjs.service.ts:4-6`) and no reload semantics |
| `error()` for mod-authored errors | forwards message and stack to Sentry when enabled (`debug.ts:27-33`, per V5). Use `debug()` plus a toast. Keep `error()` for the host's own failures |
| `read_files_batch`, `create_note` called directly with mod paths | scope-free Rust primitives (V1, V4). Go through `createFile` and plugin-fs |

Objection: a hand-written contract is overhead for a single-author API. **Partly holds.** It is one file plus one freeze test, and it is the repo's established way to stop internal refactors from breaking user scripts (ADR-0010 amendment). Without it, the first store rename breaks every mod silently.

### R7. Run model: awaited, toasted, cancellable

- Picker closes on select, the host awaits `run(run)` inside try/catch. A throw shows `toast.error('<mod name>: <action title> failed: <message>')` and a `debug()` line, never Sentry by default (V5 S22).
- Slice 7 adds the running state: one in-flight indicator per run with a Stop control that aborts `run.signal`. Mod unload and vault switch abort every run of that mod. This is a prerequisite for the HTTP, MCP and agent slices, whose calls must take `run.signal`.

Objection: closing the picker before awaiting means a long run has no visible home. **Holds until slice 7**, which is why slice 7 is ordered before any network or agent work. See Owner question 4.

### R8. Settings > Labs and the toggle

- `SettingsSection` gains `'labs'` (`settings.types.ts:331`), and `SETTINGS_SECTION_GROUPS` gets a Labs entry (`settings.logic.ts:217-266`, placed under Advanced or as its own group).
- The section component is `src/lib/app/LabsSection.svelte`, mapped in `app/SettingsPanel.svelte` like QueryjsSection (`SettingsPanel.svelte:18`, `:84`). Being in `app/`, it may import `plugins/mods` to start and stop the host live when the toggle flips, and to list mod status. Live apply is therefore cheap, and no "reopen the app" note is needed.
- Where the flag is stored: see Owner question 1. The recommendation is per machine, keyed by vault path, not in `.kokobrain/settings.json`.

### R9. Placement under the layer rules

```
src/lib/plugins/mods/
  contract/mod-api.v1.ts       # hand-written ctx contract (R6)
  mods.types.ts                # manifest and status types
  mods.logic.ts                # parse/validate manifest, rewrite+wrap source, map watcher paths to mod ids
  mods.store.svelte.ts         # per-mod status for Labs
  mods-host.service.ts         # discover, load, unload, reload, ctx factory, watcher listener
  mod-picker.store.svelte.ts   # picker isOpen + current actions
  ModActionPicker.svelte       # Command.Dialog picker, form step later
  ModsStatusList.svelte        # Labs: list of mods, errors
src/lib/features/rail-shell/   # generic RailAction kind + render (no mod knowledge)
src/lib/app/                   # LabsSection.svelte, AppOverlays mount, lifecycle wiring
```

- `plugins/` fits ADR-0003: optional, toggleable, the app works without it (V5 S21). It may import `core/`, `features/` and `utils/`. It must not import `plugins/queryjs` (`scripts/import-graph.mjs:47-51`).
- Wiring is in `app/` only (`app-lifecycle.service.ts`, `AppOverlays.svelte`, `SettingsPanel.svelte`), so `layer-baseline.json` does not grow.
- `new Function` is not a non-literal `import()`, so the import-graph scanner does not flag it (`import-graph.mjs:97-100`).

Objection: should mods be in `features/` because it will become central? **Does not hold.** `features/` cannot be toggled off and may not import plugins (V5 S21).

### R10. Testing under the repo rules

Unit (vitest, `src/tests/lib/plugins/mods/`):
- `mods.logic.test.ts` (node): valid manifest; each invalid field; id and folder mismatch; unknown keys ignored; the rewrite with zero, one and two `export default` lines; a class default; `affectedModIds` for a file, a mod folder, the mods folder itself, a README and a path outside the folder.
- `mods-host.service.test.ts` (jsdom): mock only `@tauri-apps/plugin-fs` (`readDir`, `readTextFile`), `@tauri-apps/api/event` for the watcher event, and `svelte-sonner`. Use the real `railRegistryStore`, `modsStore` and `modPickerStore` and assert on their getters: after start the rail holds `mod:hello:main`; after a watcher batch with a changed `main.js` the old button is gone and the new one is present; a mod whose `onload` throws leaves no button and records an error, while a second mod still loads; after stop the registry is empty and `ctx.signal.aborted` is true; host calls after a vault switch throw. Each suite covers happy, empty (no mods folder) and error, per `docs/TESTING.md:108-111` (per V5).
- `rail-registry.store.test.ts` and `Rail.test.ts` (both exist, `src/tests/lib/features/rail-shell/`): `registerAction` and unregister by identity; an action button calls `run`, not `onSelect`, and has no `aria-current`.
- `app-lifecycle.service.test.ts` (exists, `src/tests/lib/app/lifecycle/`): with mods enabled, `initializeVault` starts the host; `teardownVault` and a re-init entry stop it (ADR-0003:92 requires a lifecycle test per registration).
- `mod-api-contract.test.ts`: freezes the v1 member list.
- `watcher-handler.service.test.ts` (exists): a batch of only mod `.js` paths skips the full rebuild; a batch with a mod `.js` and a note still takes the right branch.

E2E (`e2e/specs/vault-mods.spec.ts`, run with `bash scripts/e2e.sh`):
- Seed through `vaultFiles` (`e2e/fixtures/test-vault.ts:166-168`, per V5) a `hello` mod under `_system/mods/` plus the enable flag. Click `[data-rail-item="mod:hello:main"]`, pick the action, assert the toast text through `[data-sonner-toast]`.
- Off by default: the same files without the flag show no button.
- Reload: `__e2e.fs.writeFile` a new `main.js`, then `__e2e.events.emit('vault-files-changed', { paths: [...] })`, and assert the new button label.
- Broken mod: a syntax error shows the folder-named error, and a second good mod still works.

Limit: E2E runs without the CSP (V5 1.6), so it cannot prove CSP compatibility. This is a real argument for `new Function`: `'unsafe-eval'` is in the production CSP and QueryJS already uses it in the shipped app. A `blob:` or custom-scheme loader would be green in E2E and could still fail in the real app.

Gate: frontend-only Issues run `pnpm check` and `pnpm vitest run` (CLAUDE.md rule 6). No `package.json` change is expected.

---

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Hidden `.kokobrain/mods/` | No watcher events (Indexing rule 5), so reload on save needs new Rust or polling. Not visible or editable in the app. Widening `is_inside_hidden_dir` would break an invariant shared with the scan (V3 constraint 5). Kept as the answer if the owner rejects visible files (Owner question 2) |
| Mods folder derived from `templates.systemFolder` | Couples mods to an unrelated setting that may be empty. Moving it would silently drop every mod |
| Real ES modules through `import(blobUrl)` | Needs `blob:` in `script-src`, a non-literal `import()` that ADR-0003 forbids in `src/lib`, and still cannot resolve relative imports |
| Real ES modules through a custom URI scheme (`kokomod://` served by Rust) | The only path to relative imports. It costs a Rust protocol handler confined to the open vault, a CSP edit (security-sensitive, `PRIVACY.md`), cache-busting on reload with module records never freed, an ADR-0003 exception, and E2E cannot exercise it on the Vite server. Revisit only if multi-file mods become a real need |
| CommonJS `module.exports = {...}` | Needs no rewrite, but contradicts the owner's stated ESM shape (`PRD.md:31-35`) and would force every mod to change if a real module loader ever lands |
| Worker or sandboxed iframe realm | The owner chose full trust. Isolation would also need an `AppManifest` (V6 constraint 1), would hit the privacy gate (`new Worker(`), and Windows/Android iframes still receive the IPC bridge (V6) |
| Manifest `permissions[]` | Nothing would enforce it under full trust. No prior art enforces one (V6) |
| Manifest-declared entry points (`contributes.rail`) | The owner chose imperative `onload` registration. Lazy activation buys nothing at this scale |
| `registerNavigator` for mod buttons | Persists `railItem`, opens a pane, unknown key restores to Today (V2) |
| Putting mod buttons into `railItems()` | Turns them into "Go to X" commands bound to `selectRailItem` (V2 constraint 3) |
| `ctx.kb` (QueryJS `KBAPI`) in v1 | Container-bound, mutable shared pages, `plugin->plugin` import (V1, V5). A read API over `getVaultEntries()` (`core/vault/vault-entries.service.ts:36`) can come later without QueryJS |
| Mod shortcuts in the MVP | Keybindings are a static array with no conflict check; a mod could shadow Cmd+S (V2 1.4) |
| `kokobrain://` deep-link or meta-bind `runMod` triggers in the MVP | Lets outside content or a shared note run vault code unattended (V2 constraint 11) |

---

## Owner questions (with recommendation)

1. **Where is the per-vault "mods on" flag stored?** The PRD says it is persisted with the vault's settings, "so opening someone else's vault runs nothing" (`PRD.md:15-16`). Those two conflict. Vault settings live inside the vault (`settings.service.ts:13-19`), so a vault someone sends you with `labs.mods: true` in its `.kokobrain/settings.json`, plus a `_system/mods/` folder, runs its mods on open. That is the PHANTOMPULSE delivery chain (V6).
   - (a) **Recommended:** a per-machine record keyed by the vault's absolute path, in `localStorage` like recent vaults (`vault.store.svelte.ts:3`, `:44-56`). Per vault, never travels with the vault, and moving a vault turns mods off (fail safe).
   - (b) In `.kokobrain/settings.json` as written. Simplest, and same exposure as QueryJS's in-vault auto-run policy (V1 constraint 2).
   Blocks the first slice, because it decides where the toggle reads and writes.

2. **Mod files visible in the vault (`_system/mods/`, reload on save) or hidden (`.kokobrain/mods/`, a "Reload mods" button instead)?** Recommended: visible. It meets the reload-on-save requirement with no new Rust, and you can edit mods in Kokobrain. The cost is a `_system/mods` folder in Files and READMEs in search. Does not block if you accept the recommendation.

3. **Where do mod buttons sit in the rail?** Recommended: their own block just above Archive, not in Settings > Layout hide/order for now (hide a button by turning off or editing the mod). The alternative is mixing them into the scrollable pinned block. Taste only. Does not block.

4. **While an action runs (from slice 7 on), where does it show?** Recommended: the picker closes, and a persistent "Running <action>" indicator with a Stop button stays until the run ends. The alternative keeps the modal open with a live log, which blocks other work in the app during a 10-minute agent run. Does not block the first slices.

5. **May errors thrown by your own mod code reach Sentry when Sentry is on?** Recommended: no. Messages and stacks can contain note text and API responses, and `beforeSend` does not scrub messages (V5). Host loader failures still go through `error()`. Does not block.

---

## Issue candidates

Thin vertical slices. Each lists its files and depends on the previous ones only where stated.

1. **Settings > Labs with a per-vault mods toggle (no loading yet).** Toggle stored per Owner question 1. Shows "No mods loaded" when on.
   - Files: `src/lib/core/settings/settings.types.ts` (section union), `src/lib/core/settings/settings.logic.ts` (group), `src/lib/app/SettingsPanel.svelte`, new `src/lib/app/LabsSection.svelte`, and either `src/lib/core/vault/vault.store.svelte.ts` (option a) or `settings.store.svelte.ts` + `settings.service.ts` parse merge line (option b). Tests next to each. Size S. Needs owner (Q1).

2. **Load one mod from `_system/mods/` and run its action from a rail button.** Discovery, manifest validation, the R3 loader, `ctx` slice-1 members, the `RailAction` registry kind and its render, the picker, start/stop wiring, the contract file, the Labs status list.
   - Files: new `src/lib/plugins/mods/{mods.types.ts, mods.logic.ts, mods.store.svelte.ts, mods-host.service.ts, mod-picker.store.svelte.ts, ModActionPicker.svelte, ModsStatusList.svelte, contract/mod-api.v1.ts}`; `src/lib/features/rail-shell/{rail-shell.types.ts, rail-registry.store.svelte.ts, Rail.svelte}`; `src/lib/app/{AppOverlays.svelte, LabsSection.svelte}`; `src/lib/app/lifecycle/app-lifecycle.service.ts`. Tests: `src/tests/lib/plugins/mods/*`, `src/tests/lib/features/rail-shell/{rail-registry.store.test.ts, Rail.test.ts}`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`; new `e2e/specs/vault-mods.spec.ts`. Size M/L (can split the rail kind off as 2a if the reviewer prefers). Depends on 1.

3. **Reload a mod on save, add and remove mods live, without a full index rebuild.** Host `onFileChange` listener, per-mod serialized reload, error isolation, and the `rebuildAllIndexes` skip for non-note files under the mods folder (cite and follow `docs/agents/indexing-watcher-rules.md` rule 4).
   - Files: `src/lib/plugins/mods/{mods-host.service.ts, mods.logic.ts}`, `src/lib/app/lifecycle/watcher-handler.service.ts`, `docs/agents/indexing-watcher-rules.md` (rule 4 text). Tests: host service, `watcher-handler.service.test.ts`, E2E reload case. Size M. Depends on 2.

4. **`ctx.vault` and `ctx.workspace.openNote`.** Vault-relative read, list, exists, create (through `createFile`) and write (plugin-fs, external-write semantics), with the unload and vault-switch guard.
   - Files: `src/lib/plugins/mods/{mods-host.service.ts, contract/mod-api.v1.ts}`, possibly a new `mods-vault.service.ts`. Tests: service suite plus an E2E action that creates a note and opens it. Size M. Depends on 2.

5. **`run.form`: a second step in the picker for inputs.** Declarative fields, values back to `run`, `null` on cancel.
   - Files: `src/lib/plugins/mods/{ModActionPicker.svelte, mod-picker.store.svelte.ts, mods.logic.ts (schema validation), contract/mod-api.v1.ts}`. Tests: component test (jsdom), logic test, E2E. Size M. Depends on 2.

6. **Running indicator, Stop and abort.** `run.signal`, `run.progress`, abort on Stop, unload and vault switch.
   - Files: `src/lib/plugins/mods/{mods-host.service.ts, mods.store.svelte.ts, new ModRunIndicator.svelte}`, mount point in `src/lib/app/` (decided by Q4). Tests: host service, component, E2E Stop case. Size M. Depends on 2. Needs owner (Q4). Prerequisite for every HTTP, MCP and agent Issue.

7. **Authoring docs and an example mod.** `help/documentation/28-mods.md` (trust warning, the "one `export default`, no `import`" rule, the `ctx` reference, the sync-loop caveat), a README index row, a `docs/FEATURES.md` bullet, `help/examples/mods-features/hello/{manifest.json, main.js}`, and a test that loads the example through `mods.logic.ts`.
   - Files as listed, plus `src/tests/help/mods-example.test.ts`. Size S. Depends on 2 (update with 4 to 6).

8. **(Post-MVP) Mod actions in the command palette.** A `$state.raw` mod-commands list read inside `getBuiltInCommands()` (`app/commands.ts`, V2 1.4), labelled "<mod name>: <action title>".
   - Files: `src/lib/app/commands.ts`, `src/lib/plugins/mods/mods-host.service.ts`. Tests: commands test, E2E. Size S. Depends on 2.

---

## Risks

- **Toggle travels with the vault** if Owner question 1 goes to (b): a received vault can turn its own mods on. QueryJS's in-vault auto-run policy has the same shape today (V1 constraint 2).
- **A synchronous infinite loop freezes the app.** Same-realm code cannot be pre-empted. Recovery is editing the file outside Kokobrain or turning mods off. If (a) is chosen in Q1, the off switch is on this machine, so it works even when the vault is read-only.
- **`export default` rewrite edge cases.** A template literal or comment line starting with `export default` is rewritten too. It fails loudly, not silently.
- **A mod `write` to a note that is dirty in a tab** is skipped by the tab reload (`editor.service.ts:428`), and the tab's next save overwrites the mod's write. Last writer wins, silently. Slice 4 should either refuse writes to dirty open tabs or document it.
- **The full-rebuild skip touches watcher code** governed by Indexing rule 4. A wrong filter could skip a real Markdown change. Mitigated by keeping `.md`, `.markdown` and `.view` paths in the decision and by the existing mixed-batch test (`src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts`).
- **E2E does not exercise the CSP.** The loader's CSP safety rests on `'unsafe-eval'` staying in `tauri.conf.json:29`. Removing it later (for example, if QueryJS were sandboxed) would break mods with E2E still green. A comment in the CSP line's owning ADR or in `PRIVACY.md` should name both users.
- **Rail overflow** with many mod buttons in a non-scrolling block.
- **Not verified:** that `//# sourceURL` names `Function` code in WKWebView devtools (from memory); the cost of the full rebuild per `.js` save (unmeasured, V3); where `BuildInfo` reads the app version (not traced); whether bits-ui's `Command.Dialog` traps global shortcuts while the picker is open (V2 gap).
