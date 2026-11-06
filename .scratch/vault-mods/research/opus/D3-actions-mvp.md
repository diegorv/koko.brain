# D3: Actions and MVP cut (design analyst, opus)

Lens: how each action kind (vault files, HTTP, MCP, LLM agents) can work in this Tauri app, how long-running actions behave (progress, cancel, output into a note), and the smallest MVP sliced into Issues.

Inputs: V1 to V6 (validators), the owner decisions already recorded in `.scratch/vault-mods/PRD.md:7-38`, and my own reads of the code (cited below). INFERRED marks conclusions not checked against code or a primary source. Read-only: nothing was built or run.

## 0. Starting point: what the owner already decided

`PRD.md:9-11` sets **full trust**: a mod runs in the main webview with the app's own powers, with no sandbox, no consent and no permission list. That decision shapes everything below:

- Every host primitive I propose (`ctx.http`, `ctx.exec`, ...) is reachable by **all** main-webview JS, not just by mods. App commands are not ACL-gated (`src-tauri/build.rs:23` has no app manifest, V1:50, V6:14), and `window.__TAURI_INTERNALS__.invoke` is in the realm (V1:14). QueryJS auto-runs vault JS on note open by default (`settings.store.svelte.ts:141`, V1:19). So a new native capability is a capability of **every vault's QueryJS**, whatever the mods toggle says. Gating inside `ctx` is hygiene, not a boundary. I state that once here and do not repeat it per action.
- The mods toggle is per vault (`PRD.md:13-17`), and settings live inside the vault at `<vault>/.kokobrain/settings.json` (`src/lib/core/settings/settings.service.ts:13-19`). See Owner question Q6: as written, a received vault whose `settings.json` has the flag on runs its mods, which contradicts the PRD's own goal ("opening someone else's vault runs nothing", `PRD.md:16`).

## 1. Recommendations (with objections)

### R1. Action shape: the mod's code is the action. The host provides a few capability objects plus a Run.

```js
// main.js (shape only; exact names are the PRD's call)
export default {
  onload(ctx) {
    ctx.addRailButton({ title: 'Agents', icon: 'lucide:bot' });
    ctx.addAction({
      id: 'prd', title: 'Idea to PRD', input: { placeholder: 'Describe the idea' },
      async run(input, run) {   // run: { signal, log(text), progress(done, total, label) }
        const idea = input.trim();
        await ctx.vault.create('Projects/PRD.md', `# PRD\n\n${idea}`);
      },
    });
  },
};
```

- The host APIs are `ctx.vault`, `ctx.notice`, then `ctx.http` and `ctx.exec` in later slices. There is no `ctx.llm` and no `ctx.mcp` in the MVP. LLM and MCP are things a mod **does** with `ctx.http` or `ctx.exec`, plus example mods. That keeps the host surface to four primitives and lets "plain JS mods" do the orchestration, which is the point of the feature.
- **Objection:** the owner may expect "orchestrate agents" to be a built-in host action, not mod code. **Does it hold?** Partly. A built-in agent runner would have to fix a model mix, a fan-out shape and an output format, and those are exactly what the owner wants to vary per mod ("30 haiku and 10 opus"). An example mod gives the same experience without freezing a host API too early. If the example mod turns out to be 300 lines of boilerplate, promote a helper later.

### R2. Vault files (`ctx.vault`): no new native surface; reuse the app's existing write owners.

- `read(rel)` and `list(relFolder)`: plugin-fs `readTextFile`/`readDir`, the same as the QueryJS loader (`src/lib/plugins/queryjs/queryjs.service.ts:1-6`, with the try/catch that file lacks, V5:105).
- `create(rel, content)`: call `createFile` in `src/lib/core/filesystem/fs.service.ts:198-224`. It writes through Rust `create_note`, marks the self-save, calls `applyNoteChange` and patches the tree. That is the path Indexing rule 6 requires (`docs/agents/indexing-watcher-rules.md:13`).
- `write(rel, content)` (overwrite): copy the rewrite pattern in `src/lib/core/filesystem/link-updater.service.ts:50-72` and `src/lib/features/type-definitions/type-definitions.service.ts:429-439`: `writeTextFile`, `syncExternalContentToEditor(path, content, true, 'none')`, `markRecentSave`, `applyNoteChange({kind:'upsert', source:'save', ...})`. Without the sync, an open tab with the note would keep the old text and its next autosave would overwrite the mod's output (INFERRED from the reason `link-updater.service.ts:59-66` gives).
- `open(rel)`: `openFileInEditor` (`src/lib/core/editor/editor.service.ts:99`).
- Paths are vault-relative at the mod boundary and converted to absolute in one host function (Indexing rule 9, `indexing-watcher-rules.md:25`). That function rejects `..` the way `kb-api.ts:526-538` does. Each `ctx.vault` captures `vaultStore.path` at load and refuses to write once the open vault differs (V1 constraint 6). This blocks a run started in vault A from writing into vault B after a switch.
- **Objection:** "under full trust, why not hand the mod `writeTextFile` directly?" **Does it hold?** No. The containment check is hygiene, but the index and tab bookkeeping is correctness: a raw write leaves `VaultIndex`, FTS5 and open tabs stale until the watcher fires, and the watcher skips self-saves (V3 constraint 7).

### R3. HTTP (`ctx.http.fetch`): use plugin-http with a widened capability scope for the MVP. Defer the Rust proxy until secrets are needed.

The facts:
- The webview `fetch` is blocked by `connect-src` (`src-tauri/tauri.conf.json:29`). plugin-http is scoped to Todoist and the theme repo (`src-tauri/capabilities/default.json:224-266`).
- plugin-http 2.8.3 already does what long actions need. It honors an `AbortSignal` (`node_modules/@tauri-apps/plugin-http/dist-js/index.js:48-57, 114-122`) and streams response bodies as a `ReadableStream` (`:136, :161`), which is enough to read SSE from the Anthropic API or a Streamable-HTTP MCP server.
- **Gap I found:** `http:allow-fetch-cancel` is not granted (`default.json` has only `allow-fetch`, `-send`, `-read-body`, `-cancel-body` at `:224, :235, :246, :257`). The JS abort calls `plugin:http|fetch_cancel` and swallows the error (`index.js:114`). Today an abort before the response headers arrive is denied by the ACL and silently does not cancel the Rust request (INFERRED from the ACL rule for plugin commands, V1:50). The MVP must add that permission.
- The proposal: add `https://**` plus `http://localhost:*` / `http://127.0.0.1:*` (local MCP servers) to the four `http:allow-fetch*` permissions, add `http:allow-fetch-cancel`, and give mods `ctx.http.fetch(url, init)`, a wrapper over plugin-http that merges the run's `signal`. The exact scope-pattern syntax was not verified against the plugin-http 2.8.3 docs; check it in the Issue.
- **Objection 1 (strongest):** this widens egress for every main-webview script, QueryJS in any opened vault included, and ADR-0035 scoped plugin-http on purpose (`docs/adr/0035-remote-theme-catalog.md`, "Trust boundary" and "Fetch from the webview" alternative). **Does it hold?** Partly. The marginal gain for hostile JS is POST bodies and readable responses. Exfiltration by GET is already open through `img-src https:` (V1:44) and `opener:default` (V1:56), and any-file read already exists through `read_files_batch` (V1:53). It is still a real widening and contradicts a recorded ADR, so it needs an owner sign-off and a new ADR (Q2).
- **Objection 2:** a Rust proxy (`reqwest` is already a dependency, `src-tauri/Cargo.toml:65`) could inject API keys in Rust bound to one host, so a key would never be readable by webview JS. **Does it hold?** Yes, and that is the right end state once keys exist. It costs a new command, a ts-rs DTO, a streaming `Channel`, cancel bookkeeping, an E2E handler (`e2e/mocks/tauri-core.ts`, V5:77) and Rust tests. Under the recommended LLM path (R5) the MVP holds no keys, so it is not needed yet.
- **Privacy gate:** the wrapper file imports `@tauri-apps/plugin-http`. The CI scan fails on that import and on `fetch(` unless the line is annotated `privacy-ok` (`.github/workflows/privacy.yml:36-57`), and `PRIVACY.md` must list it.

### R4. MCP: no host MCP client in the MVP. Cover it two ways, without new host code.

- **Streamable HTTP servers:** a mod calls them over `ctx.http.fetch` (JSON-RPC POST, SSE body readable as a stream, R3). The protocol split is real: 2026-07-28 is stateless (no `initialize`, no `Mcp-Session-Id`, a mandatory `server/discover`), while servers on 2025-11-25 or older need the handshake (V6:32-33). A hand-rolled call for one known server is about 30 lines. A general client is not. Ship an example mod for one server, not a `ctx.mcp` API.
- **stdio servers:** the client must spawn and own the process (V6:70). The SDK's stdio transport is Node-only (V6:34). The cheapest route is indirect: the agent path (R5) runs `claude -p --mcp-config <file> --strict-mcp-config`, and Claude Code spawns the stdio servers itself (flags per V6:38). A first-class `ctx.mcp` (bundling `@modelcontextprotocol/client` 2.4.0, a new dependency, with custom-`fetch` support unverified, V6:69) and long-lived stdin/stdout through `ctx.exec` come after the MVP.
- **Objection:** "call an MCP server" is one of the owner's four named actions, and the MVP would ship it only as an example. **Does it hold?** Weakly. An example mod proves the action works end to end. A host API would lock in a choice between two protocol generations before the owner has used any of it.

### R5. LLM agents: spawn the `claude` CLI from Rust (`ctx.exec`) for the MVP, gated by a spike. The Messages API with a key comes later.

There are three candidate engines (V6:71-76):

| | A. Messages API over `ctx.http` + user key | B. `claude -p` via a Rust spawn command | C. Agent SDK sidecar |
|---|---|---|---|
| New native surface | a scope widening only (R3) | spawn/stream/kill commands | Node/Bun/Deno packaging |
| Auth | API key, which needs a per-machine secret store (none exists, V4:63) | the owner's existing Claude login (non-bare) | same as B |
| Agents with tools, subagents, MCP | none; the mod must write the tool loop | built in (`--agents` with a per-agent `model`, `--mcp-config`, `--allowedTools`) | built in |
| Budget cap | the mod counts tokens | `--max-budget-usd`, a client-side estimate | `maxBudgetUsd` |
| Cancel | `AbortSignal` (plugin-http) | kill the child process | kill the sidecar |

- **Recommendation: B.** The owner's example ("30 haiku + 10 opus write a PRD with Issues") is this research workflow's own shape. B reuses the engine the owner already runs, needs no key storage, and fan-out is plain JS in the mod: a promise pool of `claude -p --model haiku --output-format json` jobs, then opus jobs over their outputs, then `ctx.vault.create` for the PRD and each Issue.
- The `ctx.exec` primitive:
  - **Rust side:** `mod_exec_start { program, args, cwd, stdin? } -> runId`. It streams stdout and stderr lines and the exit code over a `tauri::ipc::Channel`. No app command uses `Channel` today (grep of `src-tauri/src`), so this is a first; the updater plugin uses one from JS (`src/lib/contracts/ipc.ts:16-18`). The alternative is a typed event like `semantic-index-progress` (`src/lib/contracts/events.ts:19,38`, `src-tauri/src/commands/semantic.rs:411-416`).
  - `mod_exec_kill { runId }`. The children are held in managed state (the pattern at `src-tauri/src/lib.rs:319-324`) and are all killed on vault teardown and on `RunEvent::ExitRequested` (`lib.rs:393`).
  - **Frontend:** `ctx.exec.run(program, args, { cwd, stdin, onLine, signal }) -> { code, stdout, stderr }`, where `signal` aborts by calling kill.
  - The only process spawn in the app today is the blocking `osascript` call (`src-tauri/src/quick_capture/source.rs:243-259`), which streams nothing and cannot be cancelled. The tokio `process` feature is not in the explicit list (`Cargo.toml:67`), so the Issue adds it or uses `std::process` with reader threads (whether another dependency already enables it through feature unification is unverified).
- **Program resolution:** a GUI app launched from Finder gets a minimal PATH (V4:100, INFERRED). Mods name a program key (`'claude'`). The host maps it to an absolute path the owner entered once in Settings > Labs, stored per machine (`localStorage` is already per machine, as recent vaults show: `src/lib/core/vault/vault.store.svelte.ts:3,43-55`). This fixes PATH and keeps vault content from naming arbitrary binaries through the mod API. It is not a boundary: any JS can call the Rust command directly (section 0).
- **Hazards the example mod must handle:**
  - A non-bare `claude -p` loads the cwd's `.claude/settings.json` hooks and `.mcp.json` with no trust prompt (V6:40,76). Run with `cwd` set to an empty app temp dir and pass the vault with `--add-dir`. Whether `--add-dir` directories also load `.claude/` settings is **unverified**.
  - Non-bare runs also load the owner's user-level `~/.claude` hooks and plugins in each of 40 runs. That is slower and may have side effects, such as memory hooks writing observations (INFERRED).
- **Objection 1 (strongest):** B depends on an external CLI and on undocumented behavior: whether OAuth works from a GUI-spawned process (keychain access), subscription rate limits under 10+ concurrent runs, and memory per Claude Code process. None of it is in the docs read (V6:95). **Does it hold?** Yes. That is why Issue 07 is a throwaway spike before Issue 08, with A as the fallback if the spike fails.
- **Objection 2:** a spawn command makes immediate code execution a one-call capability for every vault's QueryJS. **Does it hold?** Yes, as a matter of degree. `create_note` can already create `~/Library/LaunchAgents/x.plist` (V4:36), so code execution is already reachable, but only on the next login. The owner should accept this explicitly (Q3).
- **Rejected for the MVP but kept as plan B:** A (Messages API). It is the right path for "no Claude Code installed", for ZDR-free text generation, and for deterministic cost. It needs a per-machine secret store (the keychain crate is not verified, V4:114) and ideally the R3 Rust proxy with host-bound keys.

### R6. Long-running actions: a Run with signal, log and progress, shown inside the mod dialog; a busy badge on the rail button; abort on teardown.

- **Today's picker pattern** closes before it awaits (`src/lib/plugins/one-on-one/OneOnOnePicker.svelte:26-35`), so results can only come back as toasts. No progress or cancel UI exists anywhere (V2:139).
- **Flow:** pick an action, enter optional text input (the two-step shape of `src/lib/plugins/templates/TemplatePicker.svelte:18-113`), then the dialog switches to a run view: log lines (capped), `progress(done, total, label)`, Stop and Close. Close hides the view and the run continues. While a run is live, the rail button shows a busy badge, and clicking it reopens the run view. Stop calls `AbortController.abort()`. `ctx.http` and `ctx.exec` honor the signal; mod code must check `run.signal.aborted` between steps.
- **Outcome:** done, failed or cancelled. A failure shows the error inline with the stack in a `<details>` (the `queryjs-block-widget.ts:288-328` precedent) plus a toast naming the mod and action. Diagnostics go through `debug('MODS', ...)`, not `error()`, so mod text does not reach Sentry (V5:102).
- **Output into a note:** no special API. The mod calls `ctx.vault.create/write` and optionally `ctx.vault.open`. The run log is in-memory only in the MVP.
- **Teardown:** `teardownVault` aborts every live run, kills every child (`mod_exec_kill_all`), runs each mod's `onunload` and drops its registrations. Wire it next to `queryjsSessionStore.reset()` (`src/lib/app/lifecycle/app-lifecycle.service.ts:622`) and the vault-lifetime list (`:247-264`, drained at `:571-572`). V3:116 notes that teardown also runs at boot with nothing loaded, so it must be a no-op then.
- **Objection:** a status-bar indicator would be more discoverable than a rail badge. **Does it hold?** Not for the MVP. `core/status-bar/` cannot import `plugins/mods` (ADR-0003 `core->plugins`, V5:14), so it would need a registration port first. The rail button belongs to the mod's own registration (a features-level registry), so the badge needs no new layer edge.
- **Known limit:** mod JS runs on the main thread with no timeout (V1:17). An `await`-based orchestrator is fine. A synchronous loop freezes the app. Document it and do not try to fix it in the MVP.

### R7. The MVP cut

- **Walking skeleton (proves the concept end to end, no new native surface):** Issues 01, 02 and 03. A mod in the vault, a Labs toggle, a rail button, a picker with input, and an action that writes a note.
- **MVP (what the owner asked for):** the skeleton, plus 04 hot reload (`PRD.md:19-21` requires it), 05 runs with progress and cancel, 06 HTTP, 07 the spike, 08 `ctx.exec`, 09 the agent example mod and 10 the docs and ADR.
- **After the MVP:** a secret store with the Messages API, a Rust HTTP proxy with host-bound keys, a `ctx.mcp` helper, long-lived `ctx.exec` with stdin (stdio MCP), command-palette and note-action-bar entry points, and mod shortcuts.
- **Objection:** "the skeleton is too thin to be worth shipping alone." **Does it hold?** It is not meant to ship alone. It retires the loader, lifecycle, rail and modal risks before any native work, and each later Issue adds one capability on top.

## 2. Rejected alternatives

- **Widening the CSP `connect-src` so that webview `fetch` works.** This changes the policy for every script in the webview. Remote servers would then apply CORS to Origin-bearing requests, which plugin-http requests avoid (`src/lib/features/tasks/tauri-fetch-adapter.ts:7`). ADR-0035 rejected the same move for themes.
- **The Agent SDK sidecar (C).** It needs a Node, Bun or Deno host shipped next to the app (V6:36). The engine is the same as B, with packaging, signing and update cost on top.
- **`tauri-plugin-shell` for spawning.** It needs a new plugin, a new JS package, a new E2E alias (`vite.config.js:57-67`, V5:141) and a static `cmd` scope in `default.json`. The scope does not fit a per-machine path for `claude`. A custom command of similar size fits the typed `call()` and `CommandMap` rule (`raw-invoke.test.ts`, V5:23) and the `Channel`. Caveat: the plugin already solves kill and stdin. If Issue 08 grows past its size estimate, revisit this.
- **A generic `run(cmdline)` through `sh -c`.** It is a shell by another name (V4:97), and quoting bugs become injection bugs. `ctx.exec` takes a program key and an argv array only.
- **A host `ctx.mcp` client in the MVP.** It needs a new SDK dependency, the protocol-generation split and unverified custom-`fetch` support (V6:69, :92-93). Deferred.
- **A built-in `ctx.llm.run({model, prompt})`.** It fixes the model, auth and output contracts before any use. It is deferred until two mods duplicate the same helper.
- **Schema-driven forms in the action modal.** One optional text input covers the owner's examples (an idea, a URL). Fields, selects and file pickers come later.
- **A status-bar progress surface.** It needs a `core->plugins` port (R6).
- **Reusing `KBAPI` as `ctx`.** A `plugin->plugin` import is forbidden (V5:99), and KBAPI is bound to a block container (V1:117).
- **An iframe or Worker sandbox.** Out of scope by owner decision (`PRD.md:10-11`), and not a boundary on Windows anyway (V6:31).

## 3. Owner questions (only what research cannot settle)

- **Q1. Which LLM engine does the MVP ship?** Options: (a) the `claude` CLI spawned from Rust, using your Claude login, with agents, tools and MCP built in; (b) the Anthropic Messages API with an API key stored per machine, where the mod builds its own agent loop; (c) both. **Recommended: (a)**, conditional on the Issue 07 spike passing, with (b) as the fallback. Research cannot answer this because it is cost, billing and taste (subscription versus pay-per-token, and dependence on an installed CLI). Blocks the MVP: yes, it decides Issues 07-09.
- **Q2. HTTP egress for mods:** (a) widen the static plugin-http scope to any https host plus localhost (small, but every vault's QueryJS gains it too); (b) a Rust proxy command with keys bound to hosts (larger, and keys never reach webview JS). **Recommended: (a) for the MVP, recorded in an ADR that supersedes ADR-0035's scope note; move to (b) when the first API key arrives.** This is risk appetite. Blocks the MVP: yes, for Issue 06.
- **Q3. Do you accept a process-spawn command in the app, knowing any webview JS (QueryJS included) can call it while app commands have no ACL?** Options: (a) yes, with a per-machine program allowlist that is hygiene, not a boundary; (b) yes, but only after adding an `AppManifest` ACL (a cross-cutting change, V6:53); (c) no, and use Q1(b) instead. **Recommended: (a).** This is risk appetite. Blocks the MVP: yes, if Q1 is (a).
- **Q4. Where do mods live?** (a) a visible `_system/mods/`: hot reload through the existing watcher, editable in-app, needs an Indexing-rules edit so a `.js` save does not force a full index rebuild (`src/lib/app/lifecycle/watcher-handler.service.ts:33-73`); (b) a hidden `.kokobrain/mods/`: invisible, no watcher events (`vault/watcher.rs:71-79,211`), reload needs a command or a new watcher. **Recommended: (a).** This is taste (visible clutter versus in-app editing). Blocks the MVP: yes, for Issues 01 and 04.
- **Q5. Module syntax.** `PRD.md:31,35` says "ES module, default export". `export` is a syntax error under `new Function`, the only loading route that works without a CSP change and an ADR-0003 amendment (V3:156, V5:100). Options: (a) the loader accepts exactly one top-level `export default` and rewrites it to `return`, and any other `import`/`export` gives a clear error; (b) CommonJS `module.exports = {...}`; (c) real ES modules through a CSP plus ADR-0003 change. **Recommended: (a)**, because it keeps the PRD's syntax at no policy cost. Blocks the MVP: yes, for Issue 01.
- **Q6. Where does the "mods on" flag live?** The PRD puts it in the vault's settings (`PRD.md:15`), but then a vault received with that flag set runs its mods on first open, which defeats `PRD.md:16`. Options: (a) per machine, keyed by vault path (in `localStorage`); (b) in `<vault>/.kokobrain/settings.json` as written. **Recommended: (a).** This changes a recorded decision, so it needs your call. Blocks the MVP: yes, for Issue 01.
- **Q7. Where is the MVP done line?** (a) the walking skeleton, Issues 01-03; (b) 01-06, no agents; (c) 01-10. **Recommended: (c)**, delivered in order, with a stop to reassess after 03 and after the 07 spike. This is product scope. Does not block starting.

## 4. Issue candidates (thin vertical slices, in order)

Paths are real today unless marked (new). Each Issue carries its own vitest coverage under `src/tests/lib/plugins/mods/` (new) plus an E2E where noted. The gate follows CLAUDE.md rule 6.

1. **01 Labs toggle and mod discovery list** (M). Adds a Settings > Labs section with the per-vault mods toggle (storage per Q6). While on, it scans the mods folder (per Q4), parses `manifest.json`, loads `main.js` (per Q5), calls `onload(ctx)`, and lists loaded mods and per-mod load errors in Labs. Loading is live on toggle, and teardown runs `onunload`.
   - Files: `src/lib/core/settings/settings.types.ts:331` (`SettingsSection`), `settings.logic.ts:217` (`SETTINGS_SECTION_GROUPS`), `settings.service.ts:82-196` (parse merge, if Q6(b)), `src/lib/app/SettingsPanel.svelte`, `src/lib/app/lifecycle/app-lifecycle.service.ts:247-264,571-572,622`, and new `src/lib/plugins/mods/{mods.logic.ts, mods.service.ts, mods.store.svelte.ts, ModsLabsSection.svelte}`.
   - Tests: manifest and loader logic in node; the service with mocked plugin-fs; a lifecycle registration test (ADR-0003:92); E2E seeding a mod through `vaultFiles` (`e2e/fixtures/test-vault.ts:166-168`).
2. **02 Rail action button and mod action picker** (M). `ctx.addRailButton`, `ctx.addAction`, `ctx.notice`. A new rail registration kind whose click opens the picker and never calls `selectRailItem` (`src/lib/app/rail-navigation.ts:14-24`). Icons are `pack:name` strings. Mod buttons stay out of the "Go to" commands.
   - Files: `src/lib/features/rail-shell/{rail-registry.store.svelte.ts:14-70, rail-shell.types.ts:175-186, rail-items.logic.ts:5-60, Rail.svelte:116-128}`, `src/lib/app/commands.ts:56-66`, `src/lib/app/AppOverlays.svelte`, new `src/lib/plugins/mods/ModActionPicker.svelte` and a picker store, new `e2e/specs/mods.spec.ts`.
   - Depends on 01.
3. **03 `ctx.vault` and the input step: an action writes a note** (M). `read`/`list`/`create`/`write`/`open` with vault-relative paths and the vault-switch guard, plus the two-step picker with one optional text input.
   - Files: reuses `src/lib/core/filesystem/fs.service.ts:198-224` and the `link-updater.service.ts:50-72` rewrite pattern, `src/lib/core/filesystem/note-change.service.ts:193`, `src/lib/plugins/templates/TemplatePicker.svelte` (pattern), new `src/lib/plugins/mods/mods-vault.service.ts`.
   - E2E: click, type input, assert the note's rendered content.
   - Depends on 02. This completes the walking skeleton.
4. **04 Hot reload on mod file save** (S-M). Subscribe to `onFileChange` (`src/lib/core/filesystem/fs.watcher.ts:67-72`), filter to the mods prefix, and reload just that mod. Skip `rebuildAllIndexes` for a batch made only of mods-folder paths (`src/lib/app/lifecycle/watcher-handler.service.ts:33-73`), and update `docs/agents/indexing-watcher-rules.md` rule 4.
   - Depends on 01, and on Q4(a).
5. **05 Runs: progress, log, Stop, busy badge, abort on teardown** (M). A run store, the run view in the mod dialog, `run.signal/log/progress`, and teardown abort at `app-lifecycle.service.ts:622`.
   - Tests: an abort mid-run leaves the store `cancelled` and no write happens after a vault switch.
   - Depends on 02.
6. **06 `ctx.http.fetch` (plugin-http, widened scope, cancel)** (S-M). Changes the scope and adds `http:allow-fetch-cancel` in `src-tauri/capabilities/default.json:223-266`. Adds a wrapper in new `src/lib/plugins/mods/mods-http.service.ts` (`privacy-ok`), a `PRIVACY.md` row, and `e2e/mocks/tauri-http.ts` routing per URL. Ships an example "Fetch URL into note" mod and an MCP Streamable-HTTP example mod.
   - Needs a manual check in the real app, because E2E has no CSP or ACL (V5:104).
   - Depends on 05 and Q2.
7. **07 Spike: `claude -p` from the GUI app** (S, throwaway branch). Verifies PATH resolution, OAuth from a Finder-launched process, 10 concurrent haiku runs (rate limit, RSS), whether `--add-dir` loads that directory's `.claude/`, user-hook side effects, and `--output-format json` cost fields.
   - Output: a findings note in `.scratch/vault-mods/`. Decides Q1.
   - Depends on Q1.
8. **08 `ctx.exec`: spawn, stream and kill in Rust** (L). Adds `mod_exec_start`, `mod_exec_kill` and `mod_exec_kill_all` (new `src-tauri/src/commands/mod_exec.rs`), registered at `src-tauri/src/lib.rs:325-389`, with managed state, kill on `RunEvent::ExitRequested` (`lib.rs:393`), ts-rs DTOs in `src/lib/contracts/generated/`, `CommandMap`, an E2E `HANDLERS` entry (`e2e/mocks/tauri-core.ts`), and the Labs per-machine program allowlist.
   - Tests: Rust integration tests under `src-tauri/tests/` (spawn `echo`, kill `sleep`); a vitest for the wrapper with `@tauri-apps/api/core` mocked.
   - Depends on 05, 07 and Q3.
9. **09 Example agent mod: idea to PRD + Issues** (M). A pool of haiku `claude -p` jobs, then opus synthesis, writing `PRD.md` and the Issues into a vault folder, with `--max-budget-usd`, progress and Stop.
   - Lives in `help/examples/mods/` (new), scoped per `help/examples/SCOPING.md`.
   - Depends on 03, 05 and 08.
10. **10 Docs and ADR** (S). New `help/documentation/28-mods.md` (trust warning, the `ctx` reference, the action kinds, the main-thread caveat), a `help/documentation/README.md` row, a `docs/FEATURES.md` "Power user" bullet, and ADR-0036: the mods trust model, the HTTP scope (superseding ADR-0035's scope note) and the spawn command.
    - Depends on 06 and 08 for content. Ship the pieces with each Issue if preferred.

## 5. Risks

1. **New native capabilities reach every vault's QueryJS.** App commands have no ACL (V6:14) and QueryJS auto-runs (`settings.store.svelte.ts:141`). After 06 and 08, opening any vault whose notes contain `queryjs` blocks can make arbitrary HTTP requests and spawn allowlisted programs, whatever the mods toggle says. The only real fix is an `AppManifest` ACL plus fixing `read_files_batch`/`create_note` containment (V1 constraint 9). That is out of the MVP and must be written down in ADR-0036.
2. **A received vault can switch mods on** if the flag lives in its `settings.json` (Q6).
3. **External CLI dependency:** the `claude` install location, login state, CLI flag changes (`--bare` is slated to become the default for `-p`, V6:39) and subscription rate limits. Only the spike retires these.
4. **Cost:** 10 opus runs per click. `--max-budget-usd` is a client-side estimate (V6:38,95). The example mod should print the reported `total_cost_usd` per job in the run log.
5. **Resources:** dozens of Node-based child processes (RSS unknown, INFERRED as large). The example mod must use a small concurrency pool, not 40 at once. Streaming `stream-json` from many children could flood IPC; prefer `--output-format json` for worker jobs.
6. **Orphaned children** if the app crashes rather than exits. Kill on teardown and on `ExitRequested` covers clean paths only. Spawning in a process group and killing the group is advisable (INFERRED; not checked on macOS).
7. **Main-thread freezes:** synchronous mod code blocks the UI with no timeout (V1:17).
8. **Index churn:** with a visible folder and no filter, every `.js` save runs a full rebuild (`watcher-handler.service.ts:52-73`). Issue 04 must land with or before regular mod editing.
9. **Test blind spots:** E2E runs in Chromium with no CSP, no ACL, a stub HTTP mock and no real spawn (V5:104, :139-142). Issues 06 and 08 need a manual pass in `pnpm tauri dev` with the exact steps written in the Issue.
10. **Cross-platform:** `bundle.targets` is `"all"` (`tauri.conf.json:63`). Spawn semantics (`claude.cmd` on Windows) and PATH differ. Declare the MVP macOS-first in the PRD.
11. **MCP protocol split:** hand-rolled example mods will break on servers of the other generation (V6:64). That is acceptable for examples, not for a host API.
12. **Unverified plugin-http behavior:** whether it sends an `Origin` header (which matters for the Anthropic CORS rule and for MCP Origin validation, V6:94), and the exact scope-pattern syntax for "any https". Check both in Issue 06.
