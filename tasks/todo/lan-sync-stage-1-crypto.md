# LAN Sync — Stage 1: Crypto + Identidade

Fundação criptográfica completa e testável sem dependência de rede. Inclui derivação de chaves (Argon2id + HKDF), geração de passphrase, HMAC de manifest, vault identity, e persistência de sync state/config.

> Referência completa: [feature-lan-sync.md](../reference/feature-lan-sync.md)

## Tasks

- [x] Task 1: Adicionar dependências Rust para sync no `Cargo.toml`
  - `mdns-sd = "0.12"` — descoberta P2P via mDNS
  - `snow = "0.9"` — Noise Protocol (`Noise_XXpsk3_25519_AESGCM_SHA256`), PSK mode + keypair generation
  - `argon2 = "0.5"` — derivação de chave memory-hard (Argon2id)
  - `hkdf = "0.12"` — HKDF-SHA256 para key separation (derivar `psk_key` e `hmac_key` de `master_key`)
  - `hmac = "0.12"` — HMAC-SHA256 para assinar manifests
  - `subtle = "2"` — comparação de HMAC em tempo constante (anti timing-attack)
  - `globset = "0.4"` — matching de globs para `excludedPaths`
  - `tokio-util = { version = "0.7", features = ["sync"] }` — `CancellationToken` para shutdown graceful
  - `tracing = "0.1"` — logging estruturado para debug de sync P2P
  - Atualizar features do `tokio`: adicionar `"net"`, `"sync"`, `"time"`
  - **Nota:** `aes-gcm`, `sha2`, `rand`, `base64`, `uuid`, `zeroize`, `reqwest`, `tokio` já presentes

- [x] Task 2: Criar `src-tauri/src/sync/mod.rs` — declaração do módulo sync
  - Declarar submódulos: `crypto`, `manifest`, `server`, `discovery`, `client`, `engine`, `conflict`, `noise_transport`
  - Exportar tipos públicos: `SyncEngine`, `SyncStatus`, `SyncPeer`

- [x] Task 3: Criar `src-tauri/src/sync/crypto.rs` — criptografia e identidade de sync + testes unitários
  - `PROTOCOL_VERSION: u8 = 1`
  - Struct `SyncKeys { psk_key: Zeroizing<[u8; 32]>, hmac_key: Zeroizing<[u8; 32]> }`
  - `derive_master_key(passphrase: &str, canonical_vault_uuid: &str) -> Zeroizing<[u8; 32]>`
    - Argon2id com `m=64MB, t=3, p=1`, `salt = SHA-256(canonical_vault_uuid)`
  - `derive_sync_keys(master_key: &[u8; 32]) -> SyncKeys`
    - `psk_key = HKDF-SHA256(master_key, salt=None, info="noted-sync-psk")`
    - `hmac_key = HKDF-SHA256(master_key, salt=None, info="noted-sync-hmac")`
  - `validate_passphrase(passphrase: &str) -> Result<(), String>` — mínimo 15 chars
  - `generate_passphrase() -> String` — 15 chars via CSPRNG, charset: `A-Za-z0-9!@#$%&*`
  - `sign_manifest(hmac_key: &[u8; 32], manifest_bytes: &[u8]) -> [u8; 32]`
  - `verify_manifest(hmac_key: &[u8; 32], manifest_bytes: &[u8], mac: &[u8; 32], generated_at: u64) -> bool`
    - Verifica com `subtle::ConstantTimeEq`, rejeita `generated_at` > 15 min
  - `read_or_create_vault_id(vault_path: &str) -> Result<String, String>`
  - `hash_vault_id_for_mdns(vault_id: &str) -> String` — `SHA256(vault_id)[0..8]` hex
  - `get_canonical_vault_uuid(vault_path: &str) -> Result<String, String>`
  - `get_or_create_sync_id_key(canonical_vault_uuid: &str) -> Result<Zeroizing<[u8; 32]>, String>` — Keychain
  - `load_or_generate_static_keypair(vault_path: &str, canonical_vault_uuid: &str) -> Result<([u8; 32], Zeroizing<[u8; 32]>), String>`
    - Pub em plaintext, priv cifrada com AES-256-GCM via Keychain
  - `load_sync_state(vault_path: &str) -> Result<SyncState, String>`
  - `save_sync_state(vault_path: &str, state: &SyncState) -> Result<(), String>`
  - `load_sync_local_config(vault_path: &str) -> Result<SyncLocalConfig, String>`
  - `save_sync_local_config(vault_path: &str, config: &SyncLocalConfig) -> Result<(), String>`
  - **Testes unitários** (16+ testes):
    - `test_derive_master_key_deterministic()` — mesma passphrase + UUID → mesma chave
    - `test_derive_master_key_different_inputs()` — passphrase diferente → chave diferente
    - `test_master_key_is_zeroizing()` — key zerada após drop
    - `test_generate_passphrase_length()` — sempre 15 chars
    - `test_generate_passphrase_charset()` — apenas chars do charset
    - `test_generate_passphrase_randomness()` — duas chamadas → passphrases diferentes
    - `test_sign_manifest_deterministic()` — mesma chave + manifest → mesmo HMAC
    - `test_verify_manifest_valid()` — HMAC correto → true
    - `test_verify_manifest_tampered()` — manifest alterado → false
    - `test_verify_manifest_replay_rejected()` — `generated_at` > 15 min → false
    - `test_derive_sync_keys_deterministic()` — mesma master_key → mesmas keys
    - `test_derive_sync_keys_different_from_master()` — keys ≠ master_key
    - `test_derive_sync_keys_psk_differs_from_hmac()` — psk_key ≠ hmac_key
    - `test_hash_vault_id_for_mdns_length()` — sempre 16 chars hex
    - `test_hash_vault_id_for_mdns_deterministic()` — mesmo UUID → mesmo hash
    - `test_hash_vault_id_for_mdns_different_uuids()` — UUIDs diferentes → hashes diferentes

## Validação

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Todos os testes unitários de crypto passam. Zero dependência de rede ou UI.

## Notes

- Submódulos em `mod.rs` podem ficar apenas declarados (sem implementação) — compilam como módulos vazios
- `security-framework` crate (macOS Keychain) já presente no projeto para a encryption key do vault
- Keychain accounts de sync usam prefixo diferente (`noted-sync-pass:*`, `noted-sync-id:*`) para evitar conflito com `vault-{hash}`
