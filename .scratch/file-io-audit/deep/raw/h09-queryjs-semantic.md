# h09-queryjs-semantic: deep-dive raw report

Worktree read: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro (identical to main, HEAD 0ba80e6a).
No cargo or build run. No app code edited. No vitest repro written (reasons in each bug).

## Bug 1: queryjs blocks run arbitrary JS with Tauri IPC access and auto-run on first open

ids_covered: feature-writers-14
verdict: CONFIRMED_BY_TRACE
severity: security (delete/overwrite of vault files, no Trash)
priority: P1 (accepted trade-off per ADR 0010, so the fix is an owner product decision, not a patch)

Trace:
- Note body runs through `runQueryjsBlock`: `src/lib/plugins/queryjs/kb-api.ts:469` does `new Function('kb', 'dv', ...)` on the block text. External `kb.view()` scripts go through `kb-api.ts:360` (`new Function`) after `loadExternalScript` (`queryjs.service.ts:4`, `readTextFile`).
- No sandbox: `src-tauri/tauri.conf.json:29` CSP has `script-src 'self' 'unsafe-eval'`; `connect-src` includes `ipc:`. `new Function` code shares the app origin.
- Tauri core script (fetched https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri/scripts/core.js) defines `invoke(cmd, payload)` forwarding to `window.__TAURI_INTERNALS__.ipc`. So a block can call `window.__TAURI_INTERNALS__.invoke('plugin:fs|remove', {...})` directly.
- Capability `src-tauri/capabilities/default.json`: `fs:allow-remove`, `fs:allow-write-text-file`, `fs:allow-rename` scoped to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**`. Capabilities are per window (fetched https://v2.tauri.app/security/capabilities/), so any JS in the bundled page gets these grants.
- Default policy: `src/lib/core/settings/settings.store.svelte.ts:136` `autoRunQueries: 'first-open'`. `queryjs-block-widget.ts:~190-200` runs `runQueryjsBlock` automatically on first render.
- KBAPI itself exposes no delete method (grep found none), so the risk is raw IPC, not an API misuse.

Reachability: needs a note authored by someone else (shared/downloaded/synced vault) that contains a queryjs block. Default settings auto-run it on first open in a session. Not reachable by a user's own normal typing or actions. Blast radius is large: a recursive remove bypasses Trash.

Recoverable: none from the app (plugin remove is hard delete). Only external backup or git.

Refutation attempts that failed: no guard in KBAPI, loader, or widget; no CSP restriction on IPC; `resolveScriptPath` (kb-api.ts:443) only blocks `..`, which does not limit the raw invoke. ADR 0010 (docs/adr/0010-queryjs-kb-api-caching.md) rejected a Worker sandbox as a known trade-off; help/documentation/13-queryjs.md says nothing about untrusted notes.

Not verified: the Rust-side scope check inside the fs plugin (I did not fetch the plugin source). The claim's `plugin:fs|remove` argument shape was not checked.

Test: none. A "correct behavior" test (block cannot reach fs remove) would fail by design under the accepted architecture, and a test that only sets a stub global proves nothing about the real runtime.

## Bug 2: in-flight update_semantic_file commits into the next vault's global DB when the vault switches

ids_covered: vault-lifecycle-7
verdict: CONFIRMED_BY_TRACE
severity: stale-state (derived semantic index; note files are untouched)
priority: P2 by the stale-index rule, but the reachability is narrow (see below)

Trace:
1. Save path: `src/lib/core/editor/editor.hooks.ts:81` `void applyNoteChange({kind:'upsert', source:'save', ...})` (no vaultPath, so this call skips the semantic leg). The semantic write comes from the after-save observer `src/lib/features/search/search.service.ts:327` `call('update_semantic_file', {filePath: relativePath, content, vaultPath})`, fired without await.
2. Vault switch: `src/lib/core/vault/vault.service.ts:18-21` `switchVault` awaits `saveAllDirtyTabs()` and `drainPendingWrites()` only. Neither waits for the update_semantic_file IPC. Then `vaultStore.open(path)`.
3. Teardown: `src/lib/app/lifecycle/app-lifecycle.service.ts:601` `call('close_vault_db')` (fire-and-forget). Step 2 `:233` `await call('open_vault_db', {vaultPath})` opens B.
4. Rust: `src-tauri/src/commands/semantic.rs:1211` `update_semantic_file` is async (spawn_blocking, per the fetched docs: async commands run on a spawned task). It reads hashes via `with_db` (global slot), embeds (~hundreds of ms, longer if the embedder must reload), then `with_db_transaction("semantic update file")` around line 1300, and `update_stored_mtime` (line 1333 call, body at 1351-1373 uses `db::with_db`). The global slots `src-tauri/src/db/mod.rs` (DB at ~line 20, `with_db`/`with_db_transaction` at ~lines 120-160) are read at lock time with no vault identity check. If open_vault_db(B) happened before the commit, A-relative chunks and the A-file mtime land in B's kokobrain.db.

Consequence in B: chunks keyed by the same vault-relative path (for example `notes/a.md`) carry A's content; `search_semantic` reads them via the in-memory cache (invalidated at the end of the update), so B's semantic results can show A's text for B's same-path note. Note bytes are not touched.

Self-heal: `app-lifecycle.service.ts:92` `SEMANTIC_INIT_DEFER_MS = 3000`, and `:450-464` run `initSemanticSearch` then `buildSemanticIndex` on every open when `semanticSearchEnabled`. `build_semantic_index` phase 1 (`semantic.rs:517-523`) re-reads any file whose mtime differs from the stored one, so B's `notes/a.md` is re-embedded; phase 4 `cleanup_orphaned_chunks` (`semantic.rs:1394`) drops rows for paths that do not exist in B. A's own DB is repaired on A's next build (its stored mtime was written to B, so A sees a change).

Limits:
- Self-heal needs `semanticSearchEnabled` in B. If it is off, the rows persist invisibly until a build runs (enabling semantic triggers a build).
- The race needs the embed to outlast close + loadSettings + open_vault_db(B), i.e. a save followed by a vault switch within the embed time. The realistic trigger: typing (dirty tab, inside the 2 s debounce) then switching vault or following a deep link; switchVault's saveAllDirtyTabs then fires the save right before the switch.
- If close_vault_db runs before the transaction takes the lock, `with_db` returns "Database not open" and nothing is written (no corruption).

Sibling not in the claim: `update_search_index_file` (`src-tauri/src/commands/search_index.rs:195-220`) uses `with_fts_db_transaction` on the same pattern, so the FTS leg can receive A's row too. Its stored mtime comes from A's file stat, so B's reconcile at open should re-read it. Not verified beyond the trace.

Test: none. The Rust path needs cargo (forbidden here). A TS test that asserts switchVault waits for the semantic IPC would need heavy editor-store and invoke mocking, and it would only prove the missing await, not the DB corruption.

## Summary

| id | bug | verdict | severity | priority |
|---|---|---|---|---|
| feature-writers-14 | queryjs raw IPC delete/write, default first-open | CONFIRMED_BY_TRACE | security | P1 (accepted trade-off) |
| vault-lifecycle-7 | semantic update commits into next vault's DB | CONFIRMED_BY_TRACE | stale-state | P2 (narrow race, self-heals on open) |

Not checked: the fs plugin's Rust-side scope enforcement, actual embed timing on a real machine, and whether the FTS sibling self-heals in practice.
