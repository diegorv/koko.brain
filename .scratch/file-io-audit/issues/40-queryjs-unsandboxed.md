# 40: QueryJS blocks run with full IPC and fs access and auto-run on first open

Status: needs-triage

**Blocked by:** none
Priority: P2
Severity: security
Source: file I/O audit, deep-dive group(s) h09-queryjs-semantic (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: graded P1 by the deep dive. Downgraded to P2: QueryJS runs scripts the owner writes in their own vault by design; the risk is a vault or snippet from someone else. Treat as hardening (confirm before auto-run, or a narrower API).

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P1, severity security)
- Claims covered: feature-writers-14

**How a user hits it.** Needs a note authored by someone else (shared, downloaded or synced vault) containing a queryjs block. Default autoRunQueries 'first-open' runs it on first render. Not reachable through the user's own normal typing or actions. Accepted trade-off per ADR 0010, so the fix is an owner product decision.

**Recoverable from.** None inside the app: plugin fs remove is a hard delete with no Trash. Recoverable only from external backup or git.

**Root cause.** src/lib/plugins/queryjs/kb-api.ts:469 (runQueryjsBlock, new Function on block text); kb-api.ts:360 (external kb.view scripts, new Function); src/lib/core/settings/settings.store.svelte.ts:136 (default 'first-open'); src-tauri/tauri.conf.json:29 (script-src 'unsafe-eval'); src-tauri/capabilities/default.json (fs:allow-remove, fs:allow-write-text-file scoped to kokobrain-vaults/**)

**Evidence.** new Function code runs in the app origin. Tauri core script (fetched tauri-apps/tauri dev crates/tauri/scripts/core.js) defines invoke(cmd, payload) forwarding to __TAURI_INTERNALS__.ipc, so a block can call the raw plugin:fs|remove command. Capabilities are per window (fetched v2.tauri.app/security/capabilities). No guard in KBAPI, loader (queryjs.service.ts:4) or widget (queryjs-block-widget.ts ~190-200). resolveScriptPath (kb-api.ts:443) only rejects '..' and does not limit raw invoke. ADR 0010 explicitly rejected a Worker sandbox. Not verified: Rust-side fs scope enforcement inside the plugin.

**Fix sketch.** Owner decision, not a patch: for example require per-vault opt-in before queryjs runs in a vault not created locally, or switch default autoRunQueries to 'manual' for foreign vaults. A real fix needs a sandbox, which ADR 0010 rejected.
