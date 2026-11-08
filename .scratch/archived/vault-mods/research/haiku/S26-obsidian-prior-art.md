# S26: Obsidian prior art for vault-hosted JavaScript mods

## Answer

Obsidian community plugins, Templater user scripts, QuickAdd user scripts and CustomJS all run plain JavaScript with the same power as the app. None of them sandbox the code. The trust model is a single on/off switch (Restricted Mode) plus a manual review by the user, and Obsidian's own docs say plugins inherit the app's access to files, network and processes. The one historical incident of note (PHANTOMPULSE, reported April 2026) did not break Obsidian. It abused a real community plugin (Shell Commands) that an attacker configured inside a shared vault, and it needed the victim to switch on community plugin sync. The lesson for vault mods: a mod stored in the vault is code, and any vault that can be shared or synced can deliver it.

Kokobrain already has a close analogue: the `queryjs` plugin runs vault-authored JavaScript through `new Function` in the renderer, and the app's CSP allows `'unsafe-eval'`. That is the same execution model these prior-art tools use, with no sandbox and no consent step found.

## Evidence

### Obsidian: trust model (official)
- Restricted Mode is the default: "By default, Obsidian runs in Restricted Mode to prevent third-party code execution. Only disable Restricted mode if you trust the authors of the plugins that you install." Source: https://obsidian.md/help/plugin-security
- Installed plugins stay in the vault while Restricted Mode is on but are ignored. Same source.
- No per-plugin permissions: "Due to technical limitations, Obsidian cannot reliably restrict plugins to specific permissions or access levels. This means that plugins will inherit Obsidian's access levels." Same source.
- Stated capabilities: community plugins "can access files on your computer", "can connect to internet", and "can install additional programs". Same source.
- Vetting is automated and per version: Obsidian "automatically scans every plugin version for security vulnerabilities, code quality issues, and malware", shown as a safety scorecard; manual review continues for popular, featured and flagged plugins. Same source. The docs also tell users to audit sensitive-data plugins themselves. The scanning claim comes from the vendor and was not independently verified.
- Plugin shape: `manifest.json` plus `main.js` (plus `styles.css`), downloaded from the GitHub release whose tag matches the manifest `version`; `isDesktopOnly` marks plugins that use Node/Electron APIs. Sources: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin , https://docs.obsidian.md/Reference/TypeScript+API/PluginManifest , https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
- Vendor-side work in progress: a forum request asks Obsidian to verify build provenance for plugins, because trust rests on the author's account not being compromised. Source: https://forum.obsidian.md/t/verify-and-surface-build-provenance-for-community-plugins-trust-badges-now-provenance-drift-protection-on-updates-later/116923 (feature request, not shipped as far as the search showed).
- Community criticism: a Hacker News thread (Sept 2025) calls the plugin model poor. Commenters argue that real sandboxing would make plugins useless. Source: https://news.ycombinator.com/item?id=45308131 (opinion, used only for context).

### Templater (user scripts)
- Scripts live in a folder set in Templater settings; "Templater will load all JavaScript (`.js` files) scripts in the `Scripts` folder." Function name = file name. Scripts must use CommonJS and export a function or an object whose keys are all functions. Source: https://silentvoid13.github.io/Templater/user-functions/script-user-functions.html
- Globals such as `app` and `moment` are visible in a script. The template-scoped `tp` and `tR` are not, unless the template passes `tp` in as an argument: `<% tp.user.<fn>(tp) %>`. Same source.
- The page says nothing about security, trust or risk. Source: same page.
- Vault access is through the global `app` (`tp.app.vault` is preferred inside templates). Source: https://github.com/julianobarbosa/claude-code-skills/blob/main/skills/obsidian-vault-management-skill/references/templater.md (secondary; the search summary, not fetched in full).

### QuickAdd (user scripts)
- Each script exports one async function that receives `params`: `app`, `quickAddApi`, `variables` (shared between steps), `obsidian`, `abort`, and `settings` only in the object-export form. Source: https://quickadd.obsidian.guide/docs/UserScripts/ and https://quickadd.obsidian.guide/docs/QuickAddAPI/
- Scripts must sit inside the vault, not in `.obsidian` or any dot-folder, because Obsidian's index may skip hidden folders. Source: https://quickadd.obsidian.guide/docs/UserScripts/
- Allowed forms: a `.js` file, or the first ```js block in a `.md` note. Other extensions are refused (QuickAdd 2.30.0+ stops the macro with a notice). Same source.
- Shared modules load via `require` and "executes the target file with full Node/Electron access (filesystem, network, and more) the moment it loads". The docs say to `require` only modules you wrote or trust. `require` exists only on desktop. Same source.
- Secrets are local to the app profile and must be re-entered on each device; they are not synced in `data.json`. Same source.
- Cancel path: a user cancel rejects with `MacroAbortError`, which stops the macro unless the script catches it. Source: https://quickadd.obsidian.guide/docs/UserScripts/ (search summary).

### CustomJS (third-party)
- Modules are classes loaded from files or folders. They are exposed on a global `customJS` object (`customJS.state`, `customJS.obsidian`, `customJS.app`), and there is a ready-wait helper `cJS`. Sources: https://www.obsidianstats.com/plugins/customjs , https://forum.obsidian.md/t/guide-to-develop-and-execute-modular-javascript-in-obsidian/88339 (secondary search summaries).
- The latest release in the search summaries is 1.0.21, dated 2024-06-07 (secondary, not checked against the GitHub releases page). Treat its maintenance status as unverified.
- Mobile sync needs unknown file types allowed in sync settings. Source: https://www.obsidianstats.com/plugins/customjs (secondary).
- The search for "qJS" or "queryjs" as an Obsidian plugin found nothing. The `queryjs` name in this repo is Kokobrain's own plugin (see below), not a third-party one.

### Historical incident: PHANTOMPULSE via Shell Commands (April 2026)
- Elastic Security Labs, published 2026-04-14, REF6598: attackers posed as a VC firm, moved victims from LinkedIn to Telegram, and gave them credentials to an attacker-controlled cloud vault described as the firm's "management database". Source: https://www.elastic.co/security-labs/threat-command/phantom-in-the-vault
- The vault carried a Shell Commands config (`.obsidian/plugins/obsidian-shellcommands/data.json`) with startup triggers that ran PowerShell (Windows) or `osascript` (macOS) payloads. Hider was set to hide every UI element. Same source.
- Execution needed the victim to act. Elastic: the attacker "cannot remotely force the installation or enablement of a community plugin via vault sync alone". The victim had to log in, open the remote vault, and turn on community plugin sync (the "Active community plugin list" and "Installed community plugins" toggles, off by default). Same source.
- Detection advice: alert on shells spawned by Obsidian; watch `.obsidian/plugins/` changes; keep Restricted Mode on. Same source.
- Other reporting of the same campaign (CybersecurityNews, GBHackers, CyberPress, SOC Prime, Penligent) repeats Elastic. Not used as separate evidence.

### Kokobrain: existing code that runs vault JavaScript (cited from files read)
- `src/lib/plugins/queryjs/kb-api.ts:404`: `loadScript(fullPath)` loads a vault script; `:409-411` wraps it in an async IIFE if it contains `await`; `:413` runs `new Function('kb', 'dv', 'input', wrappedCode)`. No sandbox, no iframe, no worker.
- `src/lib/plugins/queryjs/kb-api.ts:552`: `runQueryjsBlock` runs `\`\`\`queryjs` block bodies the same way, with `new Function('kb', 'dv', ...)`.
- `src/lib/plugins/queryjs/kb-api.ts:68`, `:96`, `:105`: `loadScript` is injected through options, so the loader is swappable.
- `src-tauri/tauri.conf.json:29`: CSP has `script-src 'self' 'unsafe-eval'`, which is what allows `new Function`. Without it, the current queryjs model would fail.
- `src-tauri/capabilities/default.json` (around lines 37-46): filesystem read and write are scoped to `$DOCUMENT/kokobrain-vaults/**` and `.kokobrain`. Read and write grants are present (fs:allow-read-text-file, fs:allow-write-text-file, fs:allow-remove, and others).
- `src-tauri/capabilities/default.json` (around lines 224-231): `http:allow-fetch` is limited to `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`. So a mod calling an arbitrary HTTP API or MCP server would need new capability grants.
- Rail extension point already exists: `src/lib/features/rail-shell/rail-registry.store.svelte.ts:41` `registerNavigator(entry)`, `:49` `registerLensProvider(entry)`; the `RailNavigator` type is at `src/lib/features/rail-shell/rail-shell.types.ts:175`. `docs/adr/0003-four-layer-source-taxonomy.md:91` says `plugins/` may import from `core/`, `features/`, `utils/`, so a mod loader in `plugins/` could register a rail button this way.
- Not found: any consent or trust prompt for executing vault code, any restricted-mode equivalent, and any sandbox (grep for `sandbox`, `iframe`, `Worker`, `vm.` in `src/lib/plugins/queryjs` returned only iframe comments in the widget files).

## Implications for vault mods

1. The security boundary is the trust decision, not a sandbox. Prior art (Obsidian, Templater, QuickAdd, CustomJS) gives mods full app power and relies on a one-time user decision. A vault mod MVP should copy that explicitly: a per-vault "run mods" consent, default off, shown with the list of mods and their declared capabilities. Naming this as the MVP trust model is a choice the owner should confirm.
2. Consent should cover the vault, not just a mod. The PHANTOMPULSE chain works because a shared vault can carry the payload and sync can deliver it later. Kokobrain should ask again when a mod file changes or a new mod appears in a synced vault (INFERRED: this is the control that would have stopped the campaign).
3. Declared capabilities help but do not enforce. Obsidian says it cannot restrict plugins to permissions. If the mod runs in the same `new Function` context as queryjs, it can call `invoke()` on any allowed Tauri command. An honest MVP would either route all mod I/O through a small API object the app controls (INFERRED: this is advisory, not a boundary), or run mods in a sandboxed iframe with `postMessage` (INFERRED: needs a CSP change, and the iframe has no Tauri access by default).
4. The CSP `'unsafe-eval'` is a standing risk. Removing it is not possible while queryjs uses `new Function`. The mod runtime should be a separate, documented exception rather than a reuse of queryjs.
5. Mods should not be able to read the vault secret store or `.kokobrain` settings unless they declare it. Obsidian keeps secrets per device (QuickAdd docs); Kokobrain should do the same for MCP tokens and LLM keys (INFERRED design choice).
6. The "use 30 haiku and 10 opus" example is a capability (LLM and agent orchestration) that Obsidian's prior art does not model. That needs its own consent and cost control, separate from file access.

## Open questions

- Owner: is the MVP trust model "one consent per vault, default off", or per-mod consent? Is the sandbox (iframe or worker) in scope for the MVP, or a later phase?
- Does the owner want mods to run in the existing queryjs-style renderer context (fast, no isolation) or in a separate iframe (isolation, more work, `postMessage` API)?
- Which capabilities should be gated: vault read and write, HTTP, MCP stdio processes, LLM spend? Each needs a Tauri capability grant (default.json currently allows only two HTTP URLs).
- Should Kokobrain verify mod provenance (hash pinning, signatures) the way Obsidian's forum request asks? Not researched beyond the request.
- CustomJS maintenance status and GitHub release dates were not checked against primary sources.
- Not checked: how Obsidian's Electron `main.js` loader enforces Restricted Mode internally. The docs state the behavior but not the mechanism.
- Not checked: any Obsidian community-directory malicious-plugin incident beyond the shell-commands campaign. The searches did not surface one.
