# D1: Trust and security model for vault mods

Design analyst, lens: trust and security. Date: 2026-11-05. Read-only.

Inputs: V1 to V6 (opus validators), the haiku scouts where needed, and `.scratch/vault-mods/PRD.md`, which already records owner decisions (2026-11-05): full trust, main webview, no sandbox, no consent, no permission list; off by default; per-vault toggle "persisted with that vault's settings"; hot reload on save.

This report does not reopen the owner's full-trust choice for its own sake. It tests the owner's stated guarantees against the code and keeps only the recommendations that a guarantee or a requirement in the PRD actually needs.

## 0. Facts this report rests on (re-read by me)

- CSP, whole line: `src-tauri/tauri.conf.json:29`. `script-src 'self' 'unsafe-eval'`, `img-src ... https:`, `connect-src` limited to ipc, Todoist, HuggingFace, GitHub and Sentry ingest. There is no `frame-src`, `worker-src`, `pattern`, `withGlobalTauri`, `freezePrototype` or `devCsp` key in the file (grep, no hits).
- `src-tauri/build.rs:23` is a bare `tauri_build::build()` with no app manifest. That means app commands get no ACL check from local webviews. This is from V1's read of the tauri 2.12.5 source and V6's read of the Tauri capabilities doc. I did not re-read the Tauri source.
- The IPC bridge is a page global that the app itself needs: `node_modules/@tauri-apps/api/core.js:340-341` calls `window.__TAURI_INTERNALS__.invoke`.
- Scope-free Rust file primitives:
  - `read_files_batch` checks containment against a root that the caller passes (`src-tauri/src/commands/files.rs:23-31,49`). `validate_vault_path` accepts any existing directory (`src-tauri/src/utils/fs.rs:59-67`).
  - `ensure_safe_write_path` checks only "absolute, no `..`" (`src-tauri/src/commands/vault.rs:958-971`). It is used by `create_note` and `create_folder` (`:984-1022`).
  - `toggle_task_status_inner` reads and rewrites any path with no check (`vault.rs:760-787`).
- No Rust state records the open vault. `lib.rs:319-324` manages `VaultIndexState`, `VaultWatcherState`, `SentryState`, `PrevFrontmostPid`, `LastCaptureSignature` and `ExitFlushState`. `VaultIndex` holds entries and path maps, not a root (`src-tauri/src/vault/index.rs:262-270`). The DB opens at a path the caller passes (`src-tauri/src/db/mod.rs:29-35`).
- Vault-supplied code already auto-runs:
  - The default policy is `autoRunQueries: 'first-open'` (`src/lib/core/settings/settings.store.svelte.ts:140-142`), applied at `src/lib/plugins/queryjs/queryjs-block-widget.ts:136-150`.
  - The policy is read from the vault itself. `settings.json` sits in `<vault>/.kokobrain/` (`src/lib/core/settings/settings.service.ts:13-24`), and `parseSettings` spreads `parsed.queryjs` (`:182-184`), so a vault can set `'always'`.
  - QueryJS runs code through `new Function` in the main realm (`src/lib/plugins/queryjs/kb-api.ts:413,553`), and the user docs say "runs without a sandbox" (`help/documentation/13-queryjs.md:1119`).
- The main window may create webviews (`core:webview:allow-create-webview-window`) and has `opener:default` (`src-tauri/capabilities/default.json:16,23`).
- Deep links switch only to vaults the app already knows (`src/lib/features/deep-link/deep-link.service.ts:153-174`), and the action set is closed (`deep-link.logic.ts:25`).
- Recent vaults are stored per machine in `localStorage` (`src/lib/core/vault/vault.store.svelte.ts:43-55`). This is the precedent for per-machine state that does not travel with the vault.
- `sha2` and `reqwest` are already Rust dependencies, and so is `tauri-plugin-dialog` (`src-tauri/Cargo.toml`, grep).
- Sentry, when enabled, keeps `GlobalHandlers` (`src/lib/core/settings/sentry.service.ts:62-69`).
- The privacy CI gate fails on `new Worker(`, `fetch(`, `@tauri-apps/plugin-http` and URLs in `src/` (`.github/workflows/privacy.yml:30-60`).
- ADR-0035 rejected widening `connect-src` because the change would apply "for every script in the webview" (`docs/adr/0035-remote-theme-catalog.md`, Alternatives).
- `claude` CLI (https://code.claude.com/docs/en/cli-reference, fetched 2026-11-05):
  - `--add-dir` "doesn't discover most `.claude/` configuration from these directories".
  - `--setting-sources` takes `user`, `project` and `local`.
  - `--strict-mcp-config` uses only the servers given in `--mcp-config`.
  - `--tools` restricts the built-in tools (`""` disables all of them).
  - `--max-budget-usd` is checked against a client-side estimate, and "spend can pass the cap".
  - Under `--bare`, "Skills in a directory you pass with `--add-dir` still load".

## 1. The threat model, stated plainly

| # | Threat | Today | What mods change |
|---|---|---|---|
| T1 | A cloned, zipped or copied vault ships hostile code | Already exploitable: QueryJS auto-runs on note open, with full IPC (arbitrary file read through `read_files_batch`, file creation anywhere through `create_note`) | Adds a second loader. Worse: the vault can also turn mods on, because the PRD's toggle lives in the vault's own `settings.json` |
| T2 | The owner's own mod (often LLM-written) has a bug | n/a | In the main realm, one wrong call corrupts the index, history or settings: `save_snapshot`, `cleanup_history` with retention 0, `propagate_type_rename`, `scan_vault_v2` replacing `VaultIndex` (V4 table) |
| T3 | Prompt injection through content a mod fetches (HTTP, MCP, agent output) | n/a | Agent or HTTP output written into the vault can contain a `queryjs` block, which auto-runs in the main realm on note open. Data becomes code |
| T4 | Exfiltration of notes | Already open: `img-src https:` (GET to any host), `opener:default` (opens any https URL) | A generic Rust HTTP command adds POST to any host for every main-realm script |
| T5 | New native power (process spawn, arbitrary HTTP) leaks to all main-realm code | n/a | Every new `#[tauri::command]` is callable by QueryJS in any vault and by the composer window, because no app manifest exists (`build.rs:23`) |
| T6 | Runaway cost or a hung app | n/a | "30 haiku + 10 opus" with no cancel. A synchronous loop in the main realm freezes the UI, and nothing can abort it (V1: no timeout or abort anywhere) |

A per-mod permission manifest checked in JS does nothing against T1, T3 or T5. That matches the owner's decision to leave it out. What matters is where the trust bit lives and what the new Rust commands accept.

## 2. Recommendations (with objections)

### R1. The "mods on" bit, and vault trust, must live per machine, not in the vault (blocking)

The PRD says the toggle is "persisted with that vault's settings ... so opening someone else's vault runs nothing". The code makes that false. The settings file is `<vault>/.kokobrain/settings.json` (`settings.service.ts:13-24`). It travels with `git clone`, a zip or a folder copy. ADR-0019's advice to exclude `.kokobrain/` from sync (`docs/adr/0019-kokobrain-in-vault-data-dir.md:58`) is a suggestion, and a shared vault is under the sender's control. A hostile vault simply ships `"mods": {"enabled": true}`.

Recommendation:
- Store "mods enabled for vault <canonical path>" per machine. `localStorage` follows the recent-vaults precedent (`vault.store.svelte.ts:43-55`).
- Show the toggle in Settings > Labs as the PRD wants, but read and write the per-machine record.
- A vault opened at a new path starts off.

- **Strongest objection:** the owner wanted the toggle "with that vault's settings", and moving it per machine means re-enabling mods on a second machine. **Does it hold?** Partly. It costs one click per machine and per path, and the owner has said he does not sync (memory: owner feature usage). The PRD's own safety sentence cannot be true otherwise, so the guarantee wins.
- **Second objection:** `localStorage` is writable by main-realm JS, so QueryJS in a hostile vault could flip it. **Does it hold?** Only if QueryJS runs in untrusted vaults. That is R2.

### R2. Put QueryJS behind the same per-machine gate: untrusted vaults run no vault code

Without this, R1 guards the smaller door. QueryJS auto-runs on open (`queryjs-block-widget.ts:136-150`), and the vault picks its own policy (`settings.service.ts:182-184`). A minimal Restricted Mode, close to Obsidian's and to VS Code Workspace Trust (V6):
- A vault not in the per-machine trusted list treats `autoRunQueries` as `'manual'`, whatever its `settings.json` says.
- Mods stay off in that vault.
- A one-time banner or prompt offers "Trust this vault".
- Vaults the owner has already opened can be grandfathered in once, using the recent-vaults list.

This one gate makes the owner's full-trust model coherent: full trust inside vaults this machine has trusted, and no vault code anywhere else. It also makes T5 manageable, because the only main-realm code that can call new Rust commands is code from a trusted vault.

- **Objection:** this changes existing QueryJS behavior and is outside the mods scope. **Does it hold?** Partly. It is an owner decision (Q3). Without it, every mod-specific gate can be bypassed by a `queryjs` block, and the documentation must say so.
- **Objection:** the owner is the only author, so this is paranoia. **Does it hold?** Not fully. T1 needs only one cloned vault, for example a template vault from GitHub. The gate is cheap and the failure it prevents is silent and total.

### R3. Run mod code in a dedicated Web Worker, as a lifecycle container rather than a security promise

The owner chose the main webview. I recommend a Worker because of the PRD's own requirements, not for sandbox purity:
- **"Reload without restart is safe."** In the main realm, anything a mod does outside `ctx` survives unload: a `setInterval`, a `document` listener, a patched `window.fetch`, a patched `__TAURI_INTERNALS__.invoke`. `worker.terminate()` removes all of it, so a guaranteed clean unload comes for free.
- **Cancelling an agent fan-out.** Terminating the worker is a real abort. The main realm has none (V1: no timeout or abort exists).
- **No UI freeze.** A busy loop in a mod does not block the editor.
- **T2.** The worker has no `__TAURI_INTERNALS__` and no IPC key (INFERRED: Tauri init scripts are injected into frames, not workers; must be checked by the spike). A buggy mod cannot call `cleanup_history` or `scan_vault_v2`.
- **Nothing in the MVP needs the DOM.** V1 constraint 7 and V2 §3 already put the modal in a host Svelte component driven by data the mod returns. HTTP, MCP and agents cannot run from the webview anyway (CSP plus no spawn), so they need host or Rust brokers in every option.

Mod API shape: `ctx` methods post messages to a host broker in the main realm. The broker calls existing services (vault read and write through `applyNoteChange`, `src/lib/core/filesystem/note-change.service.ts:193`) and the new Rust commands. The mod format can stay "`main.js` default-exports `{ onload, onunload }`": the host rewrites `export default` into a `return` before `new Function` inside the worker (`'unsafe-eval'` is needed and already present). A non-literal `import()` stays out of `src/lib` (ADR-0003:35).

- **Strongest objection:** the owner decided "main webview, full trust", and this is scope creep. **Does it hold?** It is the owner's call (Q1). The incremental cost is small: one worker file, a message protocol and a spike. The brokers are needed either way, because HTTP and process spawn need Rust. The PRD's hot-reload safety requirement cannot be met in the main realm except by convention.
- **Objection:** the worker's CSP is unknown. If Tauri serves the worker script without a CSP header, the worker has no CSP, and it could `fetch` or `import()` any host. That is less egress control than the main realm has. **Does it hold?** Yes, until it is checked. The spike (Issue 1) must prove that the worker inherits a policy (a `blob:` worker inherits its creator's CSP under CSP3; that needs `worker-src blob:` added to `tauri.conf.json:29`), or the design falls back to the main realm with R4 to R7 still in force.
- **Objection:** a worker gives no protection against T1 while QueryJS runs in the main realm. **Does it hold?** Yes, and that is why R2 is separate. R3's value is T2, T6 and clean reloads, not T1.

### R4. New native powers are Rust commands with argv and policy built in Rust, never a generic `run` or `fetch`

T5 is the one risk that a "trusted mods" decision cannot defer. Every new command is reachable from all main-realm code and from the composer (`lib.rs:135-145` loads the same bundle).

- **Agent runs (`mods_run_agent`):**
  - Rust builds the `claude` argv from a typed request: prompt, `agents` JSON and budget.
  - The executable path is a per-machine setting, never read from the vault. Otherwise a vault could make "claude" point at `/bin/sh`.
  - cwd is an app-owned empty directory outside the vault, with `--add-dir <vault>`, `--setting-sources user`, `--strict-mcp-config --mcp-config <file Rust writes>`, `--output-format stream-json` and `--max-budget-usd`.
  - `--tools` excludes Bash unless the request opts in and the per-machine setting allows it.
  - Stream stdout over a typed `on()` event (`event-listen.test.ts`), and kill the process on Stop and on `teardownVault`.
  - This blocks the PHANTOMPULSE-shaped chain V6 found: a non-bare `-p` run with cwd set to the vault loads vault `.claude/settings.json` hooks and `.mcp.json` with no trust dialog.
- **HTTP (`mods_http_request`):** reqwest (`Cargo.toml`) with a timeout and a response size cap. No CSP or `http:allow-fetch` widening (ADR-0035). Under full trust there is no host allow-list in the MVP; R2 is what keeps it away from untrusted vaults.
- **MCP stdio, later:** server definitions (command and args) live in per-machine settings, as in Claude Desktop's config. A mod refers to them by id only. A vault can never name a process to spawn.

- **Objection:** "full trust" means the mod could do anything anyway, so why constrain argv? **Does it hold?** No. The constraint does not target the mod. It targets T3 and T5: LLM output and untrusted-vault QueryJS calling the same command. Building argv in Rust costs the same as passing a string through.
- **Objection:** `--setting-sources user` drops the owner's project-level Claude settings. **Does it hold?** Weakly. The owner can pass `agents` JSON explicitly. A vault's `.claude/` is exactly the input to exclude.

### R5. The host broker enforces a write deny-list, even under full trust

Mod and agent writes go through the broker (`ctx.vault.write`, relative paths only) and are refused for:
- `.kokobrain/**`: it holds settings, which carry the QueryJS policy, the Todoist token and the Sentry DSN (V4).
- the mods folder itself;
- `.claude/**` and `.mcp.json`;
- `.git/**`.

For agents, the same paths go into `--disallowedTools` edit rules (permission rule syntax per the CLI reference; exact path patterns not verified).

This closes the cheap escalations: mod or agent output re-enabling auto-run, rewriting another mod, or planting Claude hooks.

- **Objection:** it is bypassable. An agent with Bash, or a mod in the main realm, can write anywhere. **Does it hold?** Yes for main-realm mods and Bash-enabled agents. That is why R3 and the Bash-off default matter. Against the worker and the default agent tool set, the list is enforced.
- **Not closed:** writing a note that contains a `queryjs` block (T3). Filtering content for code fences is fragile (`~~~queryjs`, includes). It is recorded as a risk, and R2's gate does not help inside a trusted vault. Q3 offers `'manual'` as the mitigation.

### R6. Keep mod errors out of Sentry

Run every mod call inside the broker's `try/catch`. Render errors inline or as a toast, and log with `debug('MODS', ...)`. Call `preventDefault()` on the worker's `error` event so it never reaches `GlobalHandlers` (`sentry.service.ts:66`). Mod error text can contain note content or API responses. This follows the QueryJS precedent (V5 §1.4).

- **Objection:** the owner loses telemetry on mod bugs. **Does it hold?** No. These are the user's own scripts, and the inline error is the right feedback.

### R7. No external trigger runs a mod

No `mod` deep-link action and no meta-bind `runMod` in the MVP (V2 constraint 11). Any web page can open `kokobrain://` (`deep-link.service.ts:153-174`).

### R8. Fix the scope-free Rust file commands, as a separate hardening Issue, not an MVP blocker

`read_files_batch`, `create_note`, `create_folder`, `toggle_task_status` and `scan_vault` should check paths against a Rust-held open-vault root. V1 calls this a prerequisite for any isolation claim. I disagree on the scope:
- Under R3, mod code has no IPC, so these holes do not widen what a mod can do.
- Under R2, untrusted vault code does not run.

The holes still matter for T2 (a buggy trusted QueryJS script or a main-realm mod) and for any future sharing story. The root would be set by the frontend at vault open, so hostile main-realm code could re-point it. This fixes accidents, not hostile code.

## 3. Rejected alternatives

- **Main realm through `new Function`, the QueryJS model, as the recommended runtime.** It is the simplest option. It fails the PRD's own reload-safety requirement except by convention, it cannot cancel, a busy loop freezes the UI, and every mod bug can reach all 63 app commands. It stays acceptable if the owner insists (Q1), and R1, R2 and R4 to R7 still apply.
- **Sandboxed iframe without `allow-same-origin`.**
  - Opaque origin: `'self'` in an inherited CSP will not load the bootstrap script (INFERRED).
  - On Windows and Android, Tauri injects `__TAURI_INTERNALS__` and the invoke key into every frame, sandboxed `srcdoc` included (wry PR #1874, open as of 2026-10; V6), and `bundle.targets` is `"all"` (`tauri.conf.json:63`).
  - The only gain over a worker is the DOM, which the MVP does not need. Revisit for later custom-panel entry points, macOS only.
- **SES `lockdown()` and Compartments.** Lockdown freezes intrinsics for the whole realm, including Svelte and CodeMirror (compatibility unknown). It runs on the main thread, gives no CPU bound, and is a new dependency. All of the cost, without solving T6.
- **A separate Tauri webview plus `AppManifest::commands`.** This is the real boundary long term. It needs explicit command permissions for all 63 commands in the `main` and `composer` windows, a cross-cutting change (V6 refutation 3), and it is overkill while only the owner writes mods. It becomes the path if vaults are ever shared.
- **Tauri isolation pattern.** From memory, not verified: it validates IPC messages through an isolated iframe for the app's own frontend. Mod code that runs in the main frame is not isolated by it.
- **Widening `connect-src` or `http:allow-fetch*` for mod HTTP.** It applies to every main-realm script, QueryJS included, and repeats exactly what ADR-0035 rejected.
- **`tauri-plugin-shell`.** It is a JS-side spawn surface, and the docs warn that a loose validator around `sh -c` is a shell (V4). A Rust command with argv built in Rust is narrower and testable.
- **A per-mod permission manifest in the MVP.** Without a broker that the mod cannot bypass, it is decorative. The owner already excluded it. With R3 it can be added later without re-architecting.
- **Consent per mod content hash in the MVP.** The owner edits mods constantly with hot reload, so a prompt on every save would train click-through. Per-machine vault trust (R1, R2) addresses the real delivery vector. Adopt hash consent together with sharing.
- **The Messages API straight from the webview.** It needs the `anthropic-dangerous-direct-browser-access` header, a key in the webview and a CSP change, and it provides no agent loop (V6).
- **A hidden `.kokobrain/mods/` as a security measure.** Hiding code from the user reduces transparency. PHANTOMPULSE paired its payload with a "Hider" plugin. ADR-0019 also tells users to keep `.kokobrain/` out of sync, which conflicts with "mods live in the vault". Placement belongs to another lens. From this lens, a visible folder is mildly better.

## 4. Owner questions (only what research cannot answer)

1. **Runtime: dedicated Worker or main webview?** Recommended: a Worker (R3), for clean hot reload, real cancel and no UI freeze. Main webview stays possible with R1, R2 and R4 to R7. This is a taste and scope call against the 2026-11-05 decision. Blocks the MVP.
2. **Where does the per-vault "mods on" bit live?** Recommended: per machine (`localStorage`, keyed by canonical vault path), shown in Settings > Labs. In the vault's `settings.json`, the PRD's "opening someone else's vault runs nothing" is false. This trades portability of the toggle against safety, which is the owner's call. Blocks the MVP.
3. **Should QueryJS join the gate: untrusted vaults behave as `'manual'`, with a one-time "Trust this vault"?** Recommended: yes, with already-opened vaults grandfathered. Optionally also default `autoRunQueries` to `'manual'` for notes that mods or agents wrote (T3). It changes existing behavior. Not an MVP blocker, but the mods safety claim is incomplete without it.
4. **Agent runs: a per-machine spend ceiling per run, and Bash on or off by default?** Recommended: a ceiling set in Settings (per machine) that caps any request, and Bash off unless that machine setting allows it. Risk appetite and money. Blocks the agent slice only.
5. **Secrets in the MVP: do HTTP actions need API tokens now?** Recommended: no. The MVP agent path uses the user's `claude` login. Add a per-machine secret store (OS keychain, new crate) when a real token-bearing action arrives. ADR-0019:61 forbids keys in the vault. Product scope. Does not block the MVP.

## 5. Issue candidates (thin slices)

1. **Spike: worker mod host under the real Tauri CSP (macOS).** Load a worker from the bundle and as `blob:`. Check in `pnpm tauri dev`:
   - `typeof __TAURI_INTERNALS__ === 'undefined'`;
   - `fetch('https://example.com')` is blocked;
   - `fetch('ipc://localhost/read_files_batch')` without the invoke key is rejected;
   - `import('https://...')` is blocked;
   - `new Function` works;
   - `terminate()` stops a busy loop.

   Output: a findings note plus the minimal CSP delta (likely `worker-src 'self' blob:`). Files: `src-tauri/tauri.conf.json:29`, `.github/workflows/privacy.yml:30-60`, `PRIVACY.md`. Size S. E2E cannot prove any of this, because E2E runs with no CSP (V5 §1.6).
2. **Per-machine vault trust and the mods toggle.** Trusted-vault list plus "mods enabled" per canonical vault path in `localStorage`. Settings > Labs toggle. Mods off and no loader run for untrusted vaults. Files: `src/lib/core/vault/vault.store.svelte.ts:43-55` (precedent), a new `src/lib/plugins/mods/mods-trust.store.svelte.ts` and `mods-trust.logic.ts`, `src/lib/core/settings/settings.types.ts:331` (section union), `src/lib/core/settings/settings.logic.ts:217`, `src/lib/app/lifecycle/app-lifecycle.service.ts:247-264`. Size S. Needs Q2.
3. **QueryJS restricted mode for untrusted vaults.** The effective policy is `'manual'` when the vault is untrusted. Add a trust banner. Files: `src/lib/plugins/queryjs/queryjs-block-widget.ts:136-150`, `src/lib/core/settings/settings.service.ts:182-184`, tests in `src/tests/lib/plugins/queryjs/`. Size S. Depends on 2. Needs Q3.
4. **Mod host broker with confined vault I/O.** The worker gets `ctx.vault.read` and `ctx.vault.write` (relative paths, the R5 deny-list, writes through `applyNoteChange`). Errors stay inline or in a toast, never in Sentry. Files: new `src/lib/plugins/mods/mod-host.worker.ts`, `mods-broker.logic.ts` (path normalization and deny-list, pure), `mods-broker.service.ts`, `src/lib/core/filesystem/note-change.service.ts:193`. Size M. Depends on 1. Needs Q1.
5. **Rust agent broker `mods_run_agent`.** argv built in Rust, a per-machine `claude` path, cwd outside the vault plus `--add-dir`, `--setting-sources user`, `--strict-mcp-config`, `--tools` without Bash by default, `--max-budget-usd` capped by the machine ceiling, `stream-json` over typed events, kill on Stop and on teardown. Files: new `src-tauri/src/commands/mods_agent.rs`, `src-tauri/src/lib.rs:325-389`, `src/lib/contracts/ipc.ts`, `e2e/mocks/tauri-core.ts` (`HANDLERS`), `src/lib/app/lifecycle/app-lifecycle.service.ts:538-653` (teardown kill). Size M. Depends on 2 and 4. Needs Q4.
6. **Rust HTTP broker `mods_http_request`.** reqwest with a timeout, a size cap and a redirect policy. No CSP or capability change. Files: new `src-tauri/src/commands/mods_http.rs`, `src-tauri/src/lib.rs:325-389`, `src/lib/contracts/ipc.ts`, `e2e/mocks/tauri-core.ts`. Size S. Depends on 2 and 4.
7. **Hardening (independent): confine the scope-free file commands to the open vault root.** Files: `src-tauri/src/commands/files.rs:23-49`, `src-tauri/src/commands/vault.rs:760-787,958-1022`, `src-tauri/src/utils/fs.rs:59-67`, Rust-held root state next to `src-tauri/src/lib.rs:319-324`. Size M. No dependency.
8. **Docs: a "Trust and security" section in `help/documentation/28-mods.md`.** State what mods can do, the QueryJS caveat, the untrusted-vault behavior and that the spend cap is an estimate. Size S. Depends on 2 and 4.

## 6. Risks

- **T3 is not closed by any option:** LLM or HTTP output, then a vault write, then a `queryjs` block that auto-runs in the main realm with full IPC. The mitigations are partial (Q3, the R5 deny-list). Say so in the docs.
- **Exfiltration stays possible regardless of mods:** `img-src https:` and `opener:default` already leak to any host. No PRD sentence may claim "mods cannot exfiltrate".
- **Worker CSP unknown:** if the spike finds that the worker has no policy, the worker realm has wider egress than the main realm. In that case, do not ship the worker without a fix.
- **The spend cap is soft:** `--max-budget-usd` uses a client-side estimate and "spend can pass the cap". Concurrency for 40 subagents is undocumented (V6).
- **`--add-dir` is not airtight:** it skips "most", not all, `.claude/` config. Skills in an added dir load under `--bare`, and maybe without it (not verified). With Bash off, a planted skill cannot execute code by itself (INFERRED).
- **The macOS GUI PATH** may not resolve `claude`. The per-machine absolute path setting covers this (V4, INFERRED).
- **CI cannot see any of this:** E2E has no CSP and mocks HTTP as `{}` (V5 §1.6). Security properties need a manual checklist in each slice.
- **Windows builds:** the worker choice is platform-neutral. Any later iframe entry point is not, until wry #1874 lands.
- **Confused deputy:** any trusted-vault main-realm code (QueryJS) can call the new Rust commands with any arguments. That is accepted under full trust, and R2 bounds it to trusted vaults.
- **Unverified:** the 63-command count (V1 and V4; my rough count of handler lines at `lib.rs:325-389` agrees), the claim that app commands are not ACL-gated (validators' source reads, not mine), and the worker facts (all INFERRED, Issue 1).
