# LAN Sync — Stage 2: Transport + Manifest + Conflitos

Canal criptografado funcional (Noise Protocol) + lógica de diff three-way completa + resolução de conflitos. Depende do Stage 1 (crypto.rs).

> Referência completa: [feature-lan-sync.md](../reference/feature-lan-sync.md)

## Tasks

- [x] Task 4: Criar `src-tauri/src/sync/noise_transport.rs` — canal Noise Protocol + testes unitários
  - `NoiseTransport` — wrapper sobre `TcpStream` com handshake `Noise_XXpsk3` completo
  - `NoiseTransport::connect(addr, psk_key, static_priv) -> Result<NoiseTransport, String>`
    - TcpStream com timeout de conexão 5s, handshake como **iniciador** via `snow::Builder`
    - `builder.psk(3, psk_key)` — PSK mode
    - Timeout de 5s para handshake completo
  - `NoiseTransport::accept(stream, psk_key, static_priv) -> Result<NoiseTransport, String>`
    - Mesmo fluxo, role **respondedor**, timeout 5s
  - `NoiseTransport::send(&mut self, msg_type: u8, payload: &[u8]) -> Result<(), String>`
    - Cifra + frame `[tipo][tamanho][payload]`, atualiza `last_activity`
  - `NoiseTransport::recv(&mut self) -> Result<(u8, Vec<u8>), String>`
    - Lê frame + decifra, valida tamanho máximo 50MB, atualiza `last_activity`
  - `NoiseTransport::last_activity(&self) -> Instant`
  - **Testes unitários:**
    - `test_noise_handshake_valid_passphrase()` — mesma passphrase → handshake OK
    - `test_noise_handshake_wrong_passphrase()` — passphrases diferentes → falha
    - `test_noise_handshake_timeout()` — peer que não responde → Err em 5s
    - `test_message_size_limit()` — payload > 50MB → Err

- [ ] Task 5: Criar `src-tauri/src/sync/manifest.rs` — manifests e diff three-way + testes unitários
  - Struct `FileEntry { path: String, sha256: String, mtime: u64 }`
  - Struct `SyncManifest { files: Vec<FileEntry>, generated_at: u64 }`
  - `is_excluded(path: &str, excluded_paths: &[String]) -> bool` — globs via `globset`
  - `build_manifest(vault_path: &str, excluded_paths: &[String]) -> Result<SyncManifest, String>`
    - Coleta 1: `.md` files via `collect_markdown_paths()` (existente)
    - Coleta 2: `.noted/` com allowlist (vault-id, settings.json) — exclui hardcoded
    - Filtra com `is_excluded()` + exclusões hardcoded
  - Enum `FileDiff`: `PullFromPeer`, `PushToPeer`, `Conflict`, `DeleteLocal`, `DeleteRemote`, `DeleteModifyConflict`, `Identical`
  - Enum `Side { Local, Remote }`
  - `diff_manifests(local, remote, baseline) -> Vec<(String, FileDiff)>`
    - Com baseline: three-way diff completo (push/pull/conflict/delete/delete-modify)
    - Sem baseline (primeiro sync): two-way (mesmo hash=skip, diferente=conflict, só um lado=pull/push)
  - **Testes unitários (15+ testes):**
    - `test_manifest_diff_identical()`, `test_manifest_diff_local_changed()`, `test_manifest_diff_remote_changed()`
    - `test_manifest_diff_both_changed()`, `test_manifest_diff_delete_local()`, `test_manifest_diff_delete_remote()`
    - `test_manifest_diff_delete_modify_conflict()`, `test_manifest_diff_both_deleted()`
    - `test_manifest_diff_no_baseline_first_sync()`, `test_manifest_diff_new_file_after_baseline()`
    - `test_is_excluded_folder()`, `test_is_excluded_glob()`, `test_is_excluded_empty_list()`
    - `test_is_excluded_hardcoded_always_applies()`
    - `test_build_manifest_excludes_sync_local_json()`, `test_build_manifest_excludes_sync_state_json()`
    - `test_build_manifest_includes_settings_json()`

- [ ] Task 6: Criar `src-tauri/src/sync/conflict.rs` — resolução de conflitos + testes unitários
  - `MAX_CONFLICTS_PER_FILE: usize = 10`
  - `conflict_filename(original_path: &str, mtime: u64) -> String`
    - Formato: `"{stem} (conflicted {YYYY-MM-DD HH-MM}){ext}"`
  - `count_existing_conflicts(vault_path, original_path) -> Result<Vec<PathBuf>, String>`
  - `enforce_conflict_limit(vault_path, original_path) -> Result<(), String>` — rotação automática
  - `resolve_conflict(vault_path, path, remote_content, remote_mtime) -> Result<String, String>`
    - Mtime como tiebreaker, mais novo fica no path original
  - `resolve_delete_modify_conflict(vault_path, path, modified_content, modified_mtime, modifier: Side) -> Result<(), String>`
    - Sempre preserva versão modificada
  - `safe_delete_file(vault_path, path) -> Result<(), String>`
    - Valida path via `validate_vault_path()` — anti path traversal
  - **Testes unitários:**
    - `test_conflict_filename()` — formato correto
    - `test_conflict_limit_enforced()` — 11o conflito remove o mais antigo
    - `test_conflict_limit_not_triggered()` — 9 conflitos → nenhum removido
    - `test_resolve_delete_modify_keeps_modified()` — versão modificada preservada
    - `test_safe_delete_validates_path()` — path traversal → Err

## Validação

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Testes de handshake Noise (passphrase certa/errada), diff three-way (todos os cenários), resolução de conflitos, path traversal protection.

## Notes

- `noise_transport.rs` testes usam loopback TCP (127.0.0.1) — sem dependência de rede real
- `manifest.rs` testes de `build_manifest` precisam de diretório temporário com arquivos `.md`
- `conflict.rs` usa `validate_vault_path()` que será definida em `server.rs` (Stage 3) — extrair como utility em `mod.rs` ou definir versão local
- `mtime` é metadado apenas — nunca usado para detecção de conflitos, apenas como tiebreaker
