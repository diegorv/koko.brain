# 40: QueryJS blocks run with full IPC and fs access and auto-run on first open

**Status:** wontfix

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

## A deep link or capture plants an auto-running queryjs block in the user's own vault

- Verdict: CONFIRMED_BY_TRACE (editor-data-safety audit priority P1, severity security)
- Claims covered: 

**Re-triage note.** The downgrade above rests on "Needs a note authored by someone else" and "Not reachable through the user's own normal typing or actions". That premise does not hold: any page, Shortcut or snippet that can fire a `kokobrain://` URL can write a queryjs fence into a note of the user's own, locally created vault, and the default policy runs it on first render. The Priority line needs re-triage by the owner, and a fix scoped only to foreign or non-locally-created vaults does not cover this vector.

**How a user hits it.** A web page fires `kokobrain://new?vault=<name>&name=Inbox/x&content=<text with a queryjs fence>`, or `clipboard=true` with clipboard text it set earlier. The vault name is the folder name from the recent-vaults list (deep-link.service.ts:137-143), easy to guess. After the browser's confirmation to open the app (per the audit scenario; browser behavior, not verified here), the note is created and opened, live preview renders the block, and 'first-open' (settings.store.svelte.ts:136) executes it at once with raw IPC access, e.g. `plugin:fs|remove` on the vault. With `silent=true`, or through a `capture` deep link, the block is written without opening and runs the first time the user opens the note. A block with a synchronous loop (`while(true){}`) freezes the webview instead: pending autosaves in every other tab never fire and the user must force-quit. The first-open markers are an in-memory Set (queryjs-session.store.svelte.ts:38) that is dropped on tab close (invalidatePath) and on restart, so the freeze returns every time the note is reopened.

**Root cause.** src/lib/features/deep-link/deep-link.logic.ts:80-99 (`new` takes `content` and `clipboard` from the URL); src/lib/features/deep-link/deep-link.service.ts:214-224 (resolveContent reads the clipboard) and :326-340 (non-silent create goes through openOrCreateNote with the URL content as `inlineTemplate`, which create_note writes and openFileInEditor opens, src/lib/core/note-creator/note-creator.service.ts:79-128); src/lib/plugins/queryjs/queryjs-block-widget.ts:105-119 (cache miss + 'first-open' + unmarked file executes with no origin check); src/lib/plugins/queryjs/kb-api.ts:469 (`new Function` on the block text in the app origin).

**Fix sketch.** A note's queryjs blocks must not auto-run when the note was created or written by a deep link or a capture, or more generally when the block's content hash has not been trusted by the user in this vault (persisted per vault, not in memory). Such blocks render the ▶ Run prompt. Alternatives the owner may prefer: default autoRunQueries to 'manual', or a one-time trust prompt per block hash. A watchdog or worker for the synchronous-loop freeze needs the sandbox ADR 0010 rejected; at minimum, a block that froze must not auto-run again on reopen.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] A note created by `kokobrain://new?...&content=<queryjs fence>` (with and without `silent=true`), or by `clipboard=true` with a fence in the clipboard, does not execute the block on open under the default 'first-open' policy; it shows ▶ Run
- [ ] A note written by a `capture` deep link behaves the same
- [ ] Whatever marks a block as trusted survives a restart and a tab close, so an untrusted block does not auto-run on any later open

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G1 (.scratch/editor-data-safety/audit-2026-11-02.md; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). No repro test was written for G1 under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/; the first criterion above is the red test to write.
- Verified at the current main: deep-link.logic.ts:80-99; deep-link.service.ts:256-260 (content resolved), :327-340 (silent write or openOrCreateNote); settings.store.svelte.ts:135-137 default 'first-open'; queryjs-block-widget.ts:106-119; queryjs-session.store.svelte.ts:38 and :93-98 (markAutoRun into an in-memory Set), cleared on tab close by queryjs-ports.ts:16; kb-api.ts:469; tauri.conf.json:29 CSP keeps 'unsafe-eval'; capabilities/default.json:83 and :138 grant fs:allow-write-text-file and fs:allow-remove. Capture write: src/lib/app/deep-link-actions.ts:173-176. The browser prompt and the end-to-end IPC call are from the audit scenario and were not run.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/133-queryjs-blocks-written-deep-link-capture-do.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
