# S29: Sandboxing untrusted JS in a Tauri 2 webview

Scope: options for running vault-authored (untrusted) JavaScript in Kokobrain's Tauri 2 webview, with a modal UI and privileged calls. Read-only research. No builds, tests or installs were run.

## Answer

No single option gives both isolation and a rich UI in the current stack. The practical split is:

1. **Sandboxed `<iframe>` with `srcdoc` (no `allow-same-origin`) plus `postMessage`** is the only browser-native way to get an opaque origin with its own DOM. It fits a modal UI, but it is not a security boundary on its own. All privileged calls must be brokered by the parent over `postMessage`, and the parent must validate every request.
2. **Web Worker** isolates compute and has no DOM. It cannot render a modal. It can run the "orchestrate agents" logic, with the UI kept in the parent. Its Tauri IPC access is not verified.
3. **SES / Compartment** (Hardened JavaScript) gives a strong language-level sandbox: no ambient authority, frozen intrinsics, and no `fetch` unless endowed. It does not isolate DOM or host objects, so the UI would still need a bridge. It also does not stop resource exhaustion, and every endowment the host passes in becomes part of the trust boundary.
4. **ShadowRealm** is not usable. It is still at TC39 Stage 2.7, has no browser implementation, and Node removed its experimental support in 2026.
5. **Tauri Isolation pattern** protects Core from the frontend (supply-chain threats in the frontend bundle). It is not a mod sandbox. It is worth considering as a separate hardening step, not as the mod boundary.
6. **Per-window capabilities** can keep privileged Rust commands away from a mod surface, but on Linux and Android Tauri cannot distinguish an iframe from its window. A mod running in an iframe inside `main` therefore inherits `main`'s permissions there. The real control has to be a Rust-side allowlist of commands, not capability scoping alone.

Recommended direction for the PRD (to be decided by owner): iframe `sandbox` (no same-origin) for the mod UI and the mod's own code, a typed `postMessage` RPC to the parent, a small Rust-side command set with per-mod grants checked in Rust, and no direct `invoke` from the mod. Use a Worker or SES only for the heavy orchestration logic if needed.

## Evidence

### Repo facts (read in this session)

- `src-tauri/tauri.conf.json:14` single window array; only window labelled `main` (line 16 title "KokoBrain").
- `src-tauri/tauri.conf.json:28` CSP: `script-src 'self' 'unsafe-eval'`, `connect-src ipc: http://ipc.localhost https://api.todoist.com https://huggingface.co https://github.com ...`. There is no `frame-src`, `worker-src` or `child-src` entry, so those fall back to `default-src 'self'` under standard CSP fallback (general CSP knowledge, see MDN note below).
- `src-tauri/capabilities/default.json:5-7` capability applies only to `"windows": ["main"]`.
- `src-tauri/capabilities/default.json` grants broad filesystem access under `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**` and `$APPLOG/**` (`fs:allow-write-text-file`, `fs:allow-remove`, `fs:allow-rename`, etc.), plus `http:allow-fetch*` to `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`. Any code that runs in `main` with these permissions can use them. This is the main reason a mod must not run in `main` with direct `invoke`.
- `src-tauri/Cargo.toml:22-28, 68-70` Tauri 2 with `macos-private-api` and `protocol-asset`; plugins fs, dialog, deep-link, clipboard, global-shortcut, opener, http, updater, process.
- `src/lib/plugins/queryjs/kb-api.ts:413` `new Function('kb', 'dv', 'input', wrappedCode)` and `:552` `new Function('kb', 'dv', ...)`. Existing QueryJS blocks run user-authored JS in the main window context with a host API object (`kb`) passed in. This is the closest precedent in the repo and it has no isolation. It works today only because `'unsafe-eval'` is in the CSP (`tauri.conf.json:28`).
- `src/lib/features/rail-shell/Rail.svelte` exists (the rail button entry point). I only confirmed it exists via `ls`/`grep`, not its contents.
- `src/lib/features/rail-shell/` and `src/lib/app/AppShell.svelte` are the rail/shell files found by grep. Not read in full.
- No existing `<iframe>`, `new Worker`, `postMessage`, `ShadowRealm`, `lockdown`, `Compartment` or `srcdoc` usage in `src/lib` or `src/routes` (grep, excluding CodeMirror's unrelated `Compartment` class).
- `package.json` deps: `@tauri-apps/api ^2.12.4`, `@tauri-apps/plugin-http ^2.8.3`, `svelte ^5.57.2`. No `ses`, `@endo/*` dependency.

### Tauri docs

- Isolation pattern: https://v2.tauri.app/concept/inter-process-communication/isolation/ . Places a trusted JS app in a sandboxed `<iframe>` that intercepts all IPC messages before Core, configured via `app.security.pattern.use = "isolation"`. Encrypts with AES-GCM using a runtime key rotated each launch. Its stated purpose is defending against malicious or compromised frontend code (supply chain), not hosting third-party code. Costs: encryption overhead; ES Modules do not load in the sandboxed iframe on Windows, so scripts must be inlined. The page does not describe an origin-check mechanism.
- Capabilities: https://v2.tauri.app/security/capabilities/ . `windows` takes labels or `["*"]`. Capabilities are merged across windows and webviews. Remote URLs can be granted capabilities via `remote.urls`. The docs warn: "On Linux and Android, Tauri is unable to distinguish between requests from an embedded `<iframe>` and the window itself." They also say capabilities do not protect against overly loose scopes, flawed Rust scope checks, or WebView 0-days.
- Capability reference (`webviews`, `remote`, `local`): https://v2.tauri.app/reference/config/ . `webviews` matches child webview labels, and the docs recommend it over `windows` on multiwebview windows. `remote` is unset by default. `withGlobalTauri` defaults to `false`. The page was truncated at 100000 chars, so I did not confirm the `unstable`/multiwebview feature flag.
- CSP: https://v2.tauri.app/security/csp/ . CSP is opt-in via `tauri.conf.json`. Tauri appends nonces and hashes to the policy at build time. The page does not discuss `frame-src`, `worker-src` or `'unsafe-eval'`.

### Platform / spec sources

- MDN `<iframe sandbox>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe . Empty `sandbox` applies all restrictions. `allow-scripts` alone gives an opaque origin. Quoted: combining `allow-scripts` with `allow-same-origin` on a same-origin frame is "strongly discouraged", because the frame can remove its own `sandbox` attribute. Also: "Sandboxing is useless if the attacker can display content outside a sandboxed iframe". Popups and new tabs inherit the sandbox unless `allow-popups-to-escape-sandbox` is set. Parent-child communication is via `Window.postMessage()`.
- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP . `new Function` and `eval` are blocked unless `'unsafe-eval'` is present. "developers should avoid `unsafe-eval`." Did not confirm per-directive fallback text on this page; directive fallback in the table below is from general CSP knowledge (INFERRED).
- SES / Hardened JavaScript: https://github.com/endojs/endo/tree/master/packages/ses . `lockdown()` freezes intrinsics. `Compartment` gives a separate global with no ambient authority (no `fetch`, `Date.now` and `Math.random` disabled unless endowed). Stated threat model: a single guest has one mutable object (its `globalThis`), cannot measure time at any resolution, and cannot do I/O unless endowed. Stated limits: a guest can run forever and allocate unbounded memory; all compartments share one agent; the host is responsible for every endowment; SES "does not in itself isolate the stack" (reentrancy). The Limitations section is in `docs/lockdown.md` and was not fetched. Not stated: SES is not documented as a security boundary for DOM or host objects, and the fetched page does not say so either.
- ShadowRealm: https://github.com/tc39/proposal-shadowrealm and https://www.proposals.es/proposals/ShadowRealm . Repo README: Stage 2.7 (Stage 3 request December 2024, not reflected as passed). Stage 3 was reached in 2021 to 2023, then reverted. Node.js PR removing experimental ShadowRealm support: https://github.com/nodejs/node/pull/65650 (Aug 2026), which notes browsers have not implemented it and WPT dropped its tests (wpt#59794). proposals.es and the Agoric realms-shim README still say Stage 3 and are stale.

### Standard CSP fallback (INFERRED, not confirmed by the fetched MDN page)

- `frame-src` falls back to `child-src`, then `default-src`. So a sandboxed iframe in Kokobrain would be governed by `default-src 'self'` unless `frame-src` is added. A `srcdoc` iframe inherits the parent policy.
- `worker-src` falls back to `child-src`, then `script-src`, then `default-src`. Workers from `blob:` URLs need `blob:` in `worker-src`.
- `'unsafe-eval'` in `script-src` is inherited by workers and srcdoc frames created by the page. So a mod that calls `new Function` inside any of them is allowed by the current CSP.

## Implications for vault mods

1. **Do not run mod code in the `main` document with direct `invoke`.** The `main` capability (`default.json:5-7`) carries write access to vault and app-log paths and HTTP to a fixed allowlist. QueryJS (`kb-api.ts:413, 552`) already shows the failure mode: a `new Function` body gets whatever the host passes, so a "mod API" that hands over `kb` is a full host API.
2. **Preferred UI boundary: `<iframe sandbox="allow-scripts">` with no `allow-same-origin`**, loaded from `srcdoc` or a blob. The mod gets an opaque origin, so no `localStorage`, cookies, or DOM access into the parent. All calls go through `postMessage`. The parent validates every message against a typed schema and a per-mod grant list before doing anything privileged. Do not add `allow-same-origin` even "temporarily" (MDN warning above).
3. **Add a CSP `frame-src`/`worker-src` entry** when this is built, rather than relying on fallback. Verify that `srcdoc` and `blob:` are permitted under the chosen policy. The current policy has no `frame-src` (`tauri.conf.json:28`). Keep `'unsafe-eval'` out of the mod frame if possible, but note that it is already set for `main` and the iframe will inherit it (INFERRED). Removing `'unsafe-eval'` from `script-src` would break QueryJS (`kb-api.ts:413, 552`), so that change would need its own decision.
4. **Privileged calls must be enforced in Rust.** Capabilities cannot tell an iframe from `main` on Linux and Android (capabilities doc). If mods share the window label `main`, a capability-only scope is not enough. Options to evaluate in the PRD: (a) a single Rust command `mod_call(modId, op, args)` that checks a per-mod manifest allowlist in Rust, with no per-op `invoke` exposure to the frame; (b) a separate Tauri window or child webview for mods, labelled so that a dedicated capability grants it nothing except the mod broker command (the `webviews` field in the reference supports this, multiwebview status unverified).
5. **Orchestration (the "30 haiku, 10 opus" example) is a host-side job,** not mod code. The mod should request "run agent plan X" through the broker, and the host (Rust or a trusted TS service) runs it with its own budget and rate limits. This also keeps API keys out of the frame.
6. **Worker option:** a Worker has no DOM and cannot render the modal. It can run pure computation with a `postMessage` bridge. Whether a Worker can call Tauri IPC is NOT verified: Tauri's `invoke` is wired through `window.__TAURI_INTERNALS__`, and I did not confirm worker access. Do not assume it.
7. **SES** is worth a spike only if the mod language must be strict JavaScript with no DOM at all. It would run inside the iframe or a Worker. It adds a trusted compute base (SES lockdown must run before any untrusted code), a supply-chain dependency, and it does not solve resource exhaustion. Cost: moderate. Benefit over iframe + broker: small for the UI case, larger for pure logic.
8. **ShadowRealm:** do not plan on it. Revisit only if it reaches Stage 3 and ships in engines. The Tauri webview (WebKit on macOS) has no implementation to rely on today.
9. **Tauri Isolation pattern:** orthogonal. Could be considered for supply-chain hardening of the host bundle, but it does not sandbox mods, and it constrains script loading (no ES modules in the sandbox on Windows).
10. **Mod authoring is untrusted data.** Mod files come from the vault, so the same threat applies to any vault content shared between users. The PRD should state a trust model: a mod is code the user chose to run, and the sandbox limits blast radius, it does not vet the code.

## Open questions

1. Does the iframe inside Tauri's `tauri://localhost` (macOS) or `http://tauri.localhost` (Windows) origin behave as an opaque origin under `sandbox="allow-scripts"` without `allow-same-origin`? Needs a spike in the actual app.
2. Can a sandboxed `srcdoc` frame call `window.__TAURI_INTERNALS__.invoke` at all? If Tauri injects it into all frames, a mod could reach `invoke` directly, bypassing the broker. Must be tested. This is the most important open question.
3. Is the multiwebview / child-webview feature available in the Tauri version this repo pins (`Cargo.toml` `tauri = "2"`, lockfile version not checked), and does it need an `unstable` feature flag? The reference page was truncated before that section.
4. Exact CSP fallback chain for `frame-src`, `worker-src`, `child-src` in the target browsers (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux). Verify against MDN directive pages or a spike.
5. SES Limitations section (`docs/lockdown.md`) was not read. Needed before any SES decision.
6. Whether the owner accepts a mod trust model in which mods are user-authored, reviewed by the user, and run with a per-mod grant list rather than full sandboxing against malicious authors.
7. Whether `'unsafe-eval'` can be removed from the main CSP once QueryJS is migrated. Out of scope for mods, but it determines whether mod code running in any frame inherits eval.
8. Not checked: performance cost of `postMessage` for high-frequency UI updates; WebKit-specific bugs with `srcdoc` iframes in Tauri (no sources fetched).
