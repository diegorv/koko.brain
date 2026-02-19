# LAN Sync — Stage 3: Rede + Engine + Commands

Stack de rede completo (servidor, discovery, cliente) + engine orquestrador + Tauri commands. Backend 100% funcional. Depende dos Stages 1-2.

> Referência completa: [feature-lan-sync.md](../reference/feature-lan-sync.md)

## Tasks

- [x] Task 7: Criar `src-tauri/src/sync/server.rs` — servidor TCP/Noise + testes unitários
  - **Constantes:** `MAX_CONCURRENT_CONNECTIONS = 10`, `MAX_HANDSHAKES_PER_IP_PER_MIN = 3`, `HANDSHAKE_TIMEOUT = 5s`, `IDLE_TIMEOUT = 60s`
  - Struct `SyncServer { addr, cancel_token: CancellationToken, handle: JoinHandle }`
  - Struct `SyncServerState { vault_path, sync_keys, static_priv: Zeroizing }`
  - Struct `RateLimiter { attempts: Arc<Mutex<HashMap<IpAddr, Vec<Instant>>>> }`
  - `validate_vault_path(vault_root, requested) -> Result<PathBuf, String>` — canonicalize + starts_with + anti-symlink
  - `safe_open_file(vault_root, requested, write) -> Result<File, String>` — O_NOFOLLOW + fstat (TOCTOU-safe)
  - `start_server(vault_path, port, sync_keys, static_priv) -> Result<SyncServer, String>`
    - TcpListener + CancellationToken + Semaphore + RateLimiter
    - Loop: accept → rate limit → handshake → message loop (manifest/file/delete/uuid handlers)
    - Path validation DEPOIS do handshake (conexão não autenticada nunca lê FS)
  - **Testes unitários:**
    - `test_path_traversal_dotdot()`, `test_path_traversal_encoded()`, `test_path_traversal_symlink()`
    - `test_path_valid_inside_vault()`
    - `test_safe_open_file_nofollow()` — symlink → falha atomicamente
    - `test_rate_limiter_allows_under_limit()`, `test_rate_limiter_blocks_over_limit()`, `test_rate_limiter_resets_after_minute()`

- [x] Task 8: Criar `src-tauri/src/sync/discovery.rs` — mDNS P2P
  - Struct `SyncPeer { id, name, ip, port }`
  - Struct `DiscoveryCandidate { ip, port, name }` — candidato não autenticado
  - Struct `DiscoveryHandle { cancel_token, candidates_rx }`
  - Enum `DiscoveryEvent { Found(DiscoveryCandidate), Lost(String) }`
  - `start_discovery(vault_uuid, port) -> Result<DiscoveryHandle, String>`
    - Registra `_noted._tcp` com TXT `vault={hash}` (hash truncado, não UUID real)
    - Escuta peers, filtra por vault hash, emite candidatos via channel
    - **Apenas descobre** — engine autentica

- [ ] Task 9: Criar `src-tauri/src/sync/client.rs` — cliente de sync
  - Struct `SyncSession` — wrapper sobre NoiseTransport para um ciclo completo
  - `SyncClient { peer, sync_keys, static_priv, vault_path }`
  - `open_session() -> Result<SyncSession, String>` — handshake + vault_uuid_exchange
  - `fetch_manifest(session) -> Result<SyncManifest, String>` — + verifica HMAC
  - `fetch_file(session, path) -> Result<(Vec<u8>, u64), String>`
  - `push_file(session, path, content, mtime) -> Result<(), String>`
  - `delete_file(session, path) -> Result<(), String>`

- [ ] Task 10: Criar `src-tauri/src/sync/engine.rs` — orquestrador principal + testes unitários
  - Struct `SyncEngine` com: vault_path, sync_keys, static_priv, server, discovery, peers, peers_syncing, sync_state (incl. baseline_manifests), status, retry_backoff, last_trigger
  - `SyncStatus` enum: `Idle`, `Syncing { peer_id, files_done, files_total }`, `Error(String)`
  - `RetryState { attempts, next_retry }` — backoff: 5s → 15s → 30s → 60s
  - `start(vault_path, port, passphrase, app_handle) -> Result<SyncEngine, String>`
    - Valida passphrase → vault UUID → keypair → master_key → sync_keys → sync_state → excluded_paths → server → discovery → main loop
  - `authenticate_candidate(candidate) -> Result<SyncPeer, String>` — Noise + UUID exchange
  - `sync_with_peer(peer_id) -> Result<SyncStats, String>`
    - Backoff check → peer lock → session → fetch manifest + HMAC → three-way diff → process diffs → save baseline → update last_sync
  - `trigger_sync()` — debounce 2s + sync all peers
  - `stop()` — graceful shutdown, keys zeradas via Drop
  - `reload_excluded_paths()` — relê sync-local.json sem restart
  - **Testes unitários:**
    - `test_verify_file_integrity_valid()`, `test_verify_file_integrity_tampered()`
    - `test_sync_lock_prevents_concurrent_sync()`
    - `test_retry_backoff_exponential()`, `test_retry_backoff_resets_on_success()`
    - `test_trigger_sync_debounce()`
    - `test_delete_propagation_via_baseline()`
    - `test_settings_conflict_emits_event()`
    - `test_baseline_saved_after_sync()`

- [ ] Task 11: Criar `src-tauri/src/commands/sync.rs` — Tauri commands
  - **Estado:** `Arc<Mutex<Option<SyncEngine>>>` registrado via `app.manage()`
  - Commands de passphrase: `generate_sync_passphrase`, `save_sync_passphrase`, `has_sync_passphrase`, `delete_sync_passphrase`, `change_sync_passphrase`, `reset_sync`
  - Commands de config local: `get_sync_local_config`, `save_sync_local_config`
  - Commands de engine: `start_sync`, `stop_sync`, `get_sync_peers`, `trigger_sync`, `get_sync_status`

- [ ] Task 12: Registrar módulo sync e commands em `src-tauri/src/lib.rs`
  - `mod sync;` na lista de módulos
  - Registrar `Arc<Mutex<Option<SyncEngine>>>` como Tauri State em `setup()`
  - Adicionar todos os 13 commands em `tauri::generate_handler![]`

- [ ] Task 12.1: Verificar/atualizar capabilities Tauri em `src-tauri/capabilities/default.json`
  - Verificar se Rust backend precisa de capabilities para TCP/mDNS (provavelmente não — sandbox restringe webview, não processo Rust)
  - Se necessário: adicionar permissões para TCP bind/connect e mDNS multicast

## Validação

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Teste manual: dois `pnpm tauri dev` no mesmo Mac → inserir mesma passphrase → peers se descobrem → sync funciona.

## Notes

- Etapa mais densa (6-7 tasks) porque server ↔ client ↔ engine são interdependentes
- `discovery.rs` não tem testes unitários (difícil mockar mDNS) — testado via integração no Stage 5
- Engine emite eventos Tauri (`sync:peer-discovered`, `sync:progress`, etc.) — testáveis com listeners mock
- `validate_vault_path()` e `safe_open_file()` usados em server.rs mas podem ser extraídos para `mod.rs` se conflict.rs precisar (Stage 2)
