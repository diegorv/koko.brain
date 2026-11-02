# Deep-dive group h09-queryjs-semantic

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## feature-writers-14: queryjs scripts run unsandboxed with direct plugin-fs remove/write access and auto-run on first open
- claimed severity: security
- anchor: src/lib/plugins/queryjs/kb-api.ts:360
- scenario: A note from an untrusted vault has a queryjs block that calls __TAURI_INTERNALS__.invoke('plugin:fs|remove', {recursive:true}) on open. Files are deleted without going through Trash.
- evidence given: kb-api.ts:360 new Function; tauri.conf.json:29 'unsafe-eval'; capabilities/default.json fs:allow-remove over kokobrain-vaults/**; settings.store.svelte.ts:136 default 'first-open'. ADR 0010 :57 rejected a Worker sandbox (known trade-off).

## vault-lifecycle-7: An in-flight update_semantic_file for vault A commits A's chunks and mtime key into vault B's global DB
- claimed severity: stale-state
- anchor: src-tauri/src/commands/semantic.rs:1300
- scenario: With semantic search on, the user switches vault through a deep link right after an edit. switchVault's save fires update_semantic_file for A, and the embedding takes hundreds of ms. Meanwhile close_vault_db and open_vault_db(B) run, and the transaction commits A-relative chunks into B's kokobrain.db. B's semantic search shows a note that does not exist in B, or mixes chunks for a same-path note, until B's build_semantic_index cleans up.
- evidence given: READ: async spawn_blocking at semantic.rs:1211. Hash read :1233, embed :1260-1290, with_db_transaction :1300, update_stored_mtime :1334. Global DB slots at db/mod.rs:91-99, 110-117. Teardown close app-lifecycle.service.ts:601, open :233. Search observer search.service.ts:327. Sync commands run on the main thread, async on spawned tasks (FETCHED v2.tauri.app/develop/calling-rust).
