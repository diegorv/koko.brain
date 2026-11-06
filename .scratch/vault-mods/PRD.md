# Vault mods

User-authored mods in plain JavaScript that live in the vault, not in Kokobrain. A mod declares entry points. The first entry point is a rail button that opens a modal where the user picks an action, and the action does something: read or write vault files, call an HTTP API or an MCP server, or orchestrate LLM agents (the owner's example: "use 30 haiku and 10 opus and write a PRD with Issues for an MVP").

Research: `research/` (2026-11-05). 30 Haiku scouts, 6 Opus validators that refuted them against the code (`research/opus/V*.md`) and 3 Opus design analysts (`research/opus/D1-security.md`, `D2-format-entry-points.md`, `D3-actions-mvp.md`). Some scouts returned no report; their validator answered the question from the code. Nothing was built or run, so each Issue starts with a failing test.

## Owner decisions (2026-11-05)

**Trust**
- Only the owner writes mods. In the MVP a mod has full trust: it runs in the main webview with the app's own powers. No sandbox, no per-mod consent, no permission list in the manifest.
- Isolation and consent are out of scope. Later, if vaults are ever shared or cloned.

**Off by default, per vault**
- Mods are off by default. While off, the mods folder is not scanned or loaded and no mod button shows in the rail.
- The toggle lives in a new **Settings > Labs** section, the home for experimental features from now on.
- The toggle is **per vault** and persisted. Turning it on in one vault does not enable mods in another.
- Flipping the toggle may require reopening the app, if that is simpler than loading or unloading mods live. Settings then says so next to the toggle. Applying it live is allowed, not required.

**Editing a mod needs no restart**
- With mods on, saving a change to a mod's JavaScript or manifest reloads that mod without restarting the app: its old entry points and buttons go away, and the new code's take their place. A mod added or deleted while the app runs appears or disappears the same way.
- A mod whose new code fails to load shows a clear error, and the other mods keep working.

**An organized mod structure, simpler than Obsidian's for now**

Modeled on [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) (read 2026-11-05: `manifest.json`, `main.js` built from `src/main.ts`, optional `styles.css`, a `Plugin` class with `onload`/`onunload` whose `addRibbonIcon`/`addCommand`/`registerDomEvent` registrations are removed on unload).

```
_system/mods/
  <mod-id>/
    manifest.json   # id, name, version, description, author; minAppVersion optional
    main.js         # plain JavaScript, one `export default`, no build step
```

- One folder per mod. The folder name equals `manifest.id`. A folder without a valid `manifest.json` and `main.js` is skipped with an error that names it.
- `main.js` default-exports a mod with `onload(ctx)` and an optional `onunload()`. Everything registered through `ctx` is removed automatically on unload. That is what makes a reload without a restart safe.
- Plain JavaScript, no bundler and no TypeScript in the MVP.
- Later, not MVP: `styles.css`, per-mod `data.json` settings (Obsidian's `loadData`/`saveData`), a settings tab per mod, TypeScript typings for `ctx`, multi-file mods.

## Design decisions (taken while the owner was away)

The Issues are written against these. **P1 and P3 were confirmed by the owner on 2026-11-06.** The others were presented as cheap to change later and stand as accepted defaults; changing one is a normal follow-up Issue (the `ctx` contract is v1 with no users outside this vault). Each follows the analysts' recommendation, except P4, which keeps the owner's main-webview decision against D1's Worker proposal.

| # | Decision | Why | Alternative |
|---|---|---|---|
| P1 | The "mods on" flag is stored **per machine, keyed by the vault's absolute path**, in `localStorage` like recent vaults (`core/vault/vault.store.svelte.ts:4`), not in `<vault>/.kokobrain/settings.json` | It is still per vault and persisted. Vault settings live inside the vault (`core/settings/settings.service.ts:13-19`), so a vault copied from elsewhere with the flag on would run its mods on open. Moving a vault turns its mods off | In `settings.json`: one less store, and the flag travels with the vault |
| P2 | Mods live in a **visible `_system/mods/`**, a fixed path that ignores the `templates.systemFolder` setting | `_system` is the existing system folder (`settings.store.svelte.ts:94-97`). The setting is labelled for templates and may be empty; tying mods to it would drop every mod when it changes. The Rust watcher drops dot-folder events (Indexing rule 5), so a hidden `.kokobrain/mods/` would need new Rust or polling to reload on save. Mods can be edited in Kokobrain | Hidden `.kokobrain/mods/` with a "Reload mods" button |
| P3 | **Loader:** read `main.js` as text, rewrite its single top-level `export default` and evaluate it with `new Function`, like QueryJS (`plugins/queryjs/kb-api.ts:413`). Any other `import`/`export` is a load error. One file per mod | The CSP is `script-src 'self' 'unsafe-eval'` (`src-tauri/tauri.conf.json:29`): `import()` of `blob:`/`asset:` is blocked, and a non-literal `import()` fails `layer-rules.test.ts` (ADR-0003). `'unsafe-eval'` is already shipped. Reload has no module-cache problem | A custom URI scheme served by Rust for real ES modules with relative imports: CSP edit, ADR-0003 exception, no E2E coverage |
| P4 | **Runtime: main webview**, as decided. A synchronous infinite loop in a mod freezes the app; the docs say so | Owner decision. The analyst on security (D1 R3) recommended a Web Worker for clean unload, real cancel and no UI freeze. Recorded under Later | Worker with a message broker, after a CSP spike |
| P5 | **Entry model:** `ctx.addAction({ id, title, description, run })` and `ctx.addRailButton({ id, title, icon, actions? })`. A click opens a picker with the button's actions, even if there is one. Later entry points (palette, note action bar) reuse the same actions | Modeled on VS Code's commands plus menus split. A rail navigator does not fit: its click persists `railItem` and opens a pane (`features/rail-shell/rail-shell.types.ts:175-186`) | Manifest-declared entry points |
| P6 | **Rail placement:** mod buttons are their own block above the bottom group, kept out of `railItems()`, so they are not "Go to X" commands and not in Settings > Layout | `railItems()` feeds the palette's Go to commands (`app/commands.ts:56-66`) | Mixed into the pinned block |
| P7 | **Long runs:** after picking, the picker becomes a run view (log, progress, Stop, Close). Close hides it and the run continues; the rail button shows a busy mark and reopens it. Vault teardown aborts every run | `core/status-bar/` cannot import `plugins/` (ADR-0003); the rail button is the mod's own registration | Picker closes; a separate running indicator |
| P8 | **Input:** an action may declare one optional text input, shown as a second picker step. Forms with fields come later | Covers the owner's examples (an idea, a URL) | Declarative forms in the MVP |
| P9 | Mod errors the host catches go to a toast and `debug('MOD:<id>', ...)`, not to Sentry; uncaught ones are dropped in Sentry's `beforeSend` by their `kokobrain-mods/` sourceURL or a host tag (Issue 12). Host failures still use `error()` | Mod error text can carry note content and API responses; `beforeSend` does not scrub messages | Same as any app error |
| P10 | **A reload waits for live runs.** Saving a mod while one of its actions runs does not abort the run: the reload waits until the mod's runs end, then loads the newest code once. Turning mods off, deleting the mod and closing the vault still abort | A mod edited in Kokobrain reloads on every 2 s autosave (`core/editor/editor.service.ts:227`); aborting would kill a paid agent run mid-edit | Reload aborts the run |

## Owner decisions needed (blocking the actions after the skeleton)

These change native surface or a recorded ADR. Issues 08, 10, 11 and 13 are `needs-info` until they are answered; 09 (the spike) is `ready-for-human`. Ask them in this order: 5, then 1 and 2 together with the spike, then 4, then 3 (it gates only 08, unless the spike fails).

1. **LLM engine.** (a) Spawn the `claude` CLI from Rust: it uses the owner's existing login and has agents, per-agent models, MCP and a budget flag built in. (b) The Anthropic Messages API with a key stored per machine; the mod writes its own agent loop. **Recommended: (a)**, if the spike (Issue 09) passes, with (b) as the fallback.
2. **Process spawn command shape**, if (a). D3 proposes a generic `ctx.exec(programKey, argv)` with a per-machine program allowlist. D1 proposes a typed `mods_run_agent` whose `claude` argv is built in Rust (cwd outside the vault, `--setting-sources user`, `--strict-mcp-config`, Bash off by default, `--max-budget-usd`). App commands have no ACL (`src-tauri/build.rs:23`), so either is callable by any webview JS, QueryJS included. **Recommended: D1's typed command**: same cost, the program path and spend ceiling live in Rust-side machine config, and the mod API cannot name a program. It is not a boundary: without an ACL any webview JS can call the config setter too.
3. **HTTP egress.** (a) Widen the plugin-http capability scope to any `https://` host plus localhost and add `http:allow-fetch-cancel`; small, but it reverses ADR-0035's deliberate scope and applies to all webview JS. (b) A Rust `reqwest` command with timeout and size cap; no capability change, and keys can later stay in Rust. **Recommended: (b)** (D1), as the more durable boundary; (a) if speed matters more.
4. **Agent spend and tools.** A per-machine spend ceiling per run, and Bash off unless a machine setting allows it? **Recommended: yes to both.** `--max-budget-usd` is a client-side estimate and "spend can pass the cap" (CLI reference, read 2026-11-05).
5. **MVP done line.** (a) Walking skeleton, Issues 01 to 05. (b) Also 06, 07 and 12 (no network, no agents). (c) Everything, through 08. **Recommended: (c)**, with a stop to reassess after 05 and after the spike.

## Order

Reviewed on 2026-11-06 (one Opus reviewer): the agent path, the owner's main motivation, should not wait behind work it does not need, and the spike should run first because its outcome decides which Issues are on that path.

1. **Now:** the owner answers decisions 5, 1, 2 and 4, and runs the spike (09) in parallel with 01. Most of the spike runs from a terminal; only the keychain-login question needs a Finder-launched build.
2. **01, 02**, then the owner checks in the real app that the hello mod loads and that `sourceURL` shows in WKWebView stacks (it sizes Issue 12).
3. **03, 05, 04**, in that order: the rail button, then the first real value (an action writes a note), then reload on save, which the owner needs before writing and testing mods day to day. **10** (Rust agent runner) runs in parallel once decisions 1, 2 and 4 and the spike are in: it shares no files with this chain. One cargo build at a time.
4. **06**, then **13** (`ctx.agents.run`) and **12** (Sentry), then **11**, the idea-to-PRD mod. 12 and 13 both touch the host file; run them in parallel only if a merge conflict is acceptable.
5. **07** (docs and ADR, written once against the finished API), then **08** (HTTP and the MCP example). If the spike fails and the Messages API wins, 08 moves up before 10.

With a shorter MVP (decision 5 (a) or (b)), stop after step 3 or after 06, 12 and 07.

The `Blocked by` lines encode real dependencies plus one serialization: 03, 05, 04 and 06 all edit `mods-host.service.ts`, so they chain in that order. Launch by number, never with `--all`: relay-lite reads `needs-info` and `ready-for-human` as `todo`.

## Owner checks after delivery

E2E runs in Chromium without the CSP or the Tauri ACL, so these need one look in the real app (`pnpm tauri dev` or a build):

- After 02: the hello mod loads and shows its toast (the loader under `script-src 'self' 'unsafe-eval'`), and a mod that throws from a `setTimeout` shows `kokobrain-mods/<id>/main.js` in the error's stack in WKWebView devtools. If it does not, Issue 12 relies on the host tag alone.
- After 12: with Sentry on, that thrown error sends no Sentry event.

## Later (not MVP, no Issue yet)

- More entry points: command palette ("<mod>: <action>"), note action bar, app events. Not deep links or meta-bind buttons: those let outside content run vault code.
- A Web Worker runtime (D1 R3). A first-class `ctx.mcp` client and stdio MCP servers. A per-machine secret store, then the Messages API.
- Mod keybindings (the keybinding list is static with no conflict check, so a mod could shadow Cmd+S).
- Vault trust for QueryJS: today it auto-runs vault code on note open, and the vault's own `settings.json` picks the policy (D1 R2).

## Found on the way (outside this feature)

- Several Rust file commands take any path: `read_files_batch` checks containment against a root the caller passes (`src-tauri/src/commands/files.rs:23-31`), `create_note`/`create_folder` check only "absolute, no `..`" (`src-tauri/src/commands/vault.rs:958-1022`), `toggle_task_status_inner` checks nothing (`vault.rs:760-787`). Harmless while the owner is the only author; worth a hardening Issue if vaults are ever shared (D1 R8).
- `canvas-image.service.ts:35` calls `readFile` with no `fs:allow-read-file` grant, and its `blob:` URL is not in `img-src`, so canvas images may be broken (V1, INFERRED, not run).
- `PRIVACY.md` says Chart.js loads from a CDN in `dv-ui.ts`. That file does not exist; Chart.js is bundled (`plugins/queryjs/kb-ui.ts:917-919`) (V3).
- The CLAUDE.md structure listing and `docs/adr/0003-four-layer-source-taxonomy.md:65` name `core/keybindings` and `core/app-lifecycle`, which do not exist (`utils/keybindings.ts`, `app/lifecycle/`) (V2).
