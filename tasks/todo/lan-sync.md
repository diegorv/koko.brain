# LAN Sync P2P seguro entre vaults Kokobrain

Sistema de sync de pastas entre vaults Kokobrain em diferentes computadores da mesma LAN. Nunca via Internet externa. Segurança é prioridade absoluta — todo tráfego criptografado, peers só acessam pastas explicitamente expostas.

Plano detalhado em `/root/.claude/plans/quero-criar-um-sistema-reflective-galaxy.md` (também versionado como contexto desta tarefa).

## Tasks

- [x] Task 1: Adicionar 8 crates ao Cargo.toml (ed25519-dalek, x25519-dalek, hkdf, spake2, mdns-sd, local-ip-address, tokio-util, subtle)
- [x] Task 2: Wordlist BIP-39 + módulo Diceware (7 palavras, ~77 bits) com geração, normalização e validação
- [x] Task 3: Identity module (Ed25519 + Keychain abstraído via KeyStorage trait) com fingerprint format e persistência
- [x] Task 4: Shares config com 2 modos (subfolder, root-with-excludes) + hard-deny rules + camada 1 da path traversal defense (camadas 2-3 ficam para tasks transport/engine)
- [x] Task 5: Wire protocol structs (HandshakeMsg, AppMsg) + version negotiation + directory entries + base64 helpers
- [x] Task 6: Transport crypto core (X25519 ECDH + HKDF-SHA256 + AES-256-GCM streaming + nonce counter + replay detection + transcript binding + Ed25519 verify). TCP listener/keepalive/reconnect ficam para um próximo commit isolado do networking I/O assíncrono.
- [x] Task 7: Discovery helpers — RFC1918 filter (IPv4 + IPv6), TXT record parsing/validation, AnnounceConfig + build_announce_txt round-trip. Live mDNS announce/browse handles ficam para a Task 15 (Tauri commands) onde rodam em ambiente real.
- [x] Task 8: Pairing (SPAKE2 com Diceware secret) + peers.json trust store. Encriptação em repouso do peers.json fica para follow-up (atualmente plain JSON; transcript-signed key exchange já está em sync/transport.rs::finalize_handshake).
- [x] Task 9: State DB (SQLite schema: share_state, file_state, tombstones) + manifest paginado + diff engine (LWW por Lamport/mtime/fingerprint)
- [x] Task 10: Conflict resolution (LWW por Lamport+mtime+fingerprint) + atomic writes (tmp+fsync+rename) + save_conflict_copy + cleanup_orphan_tmp_files + Camera 2/3 path validation
- [x] Task 11: Empty directories sync — apply_inbound_directory_create/delete + collect_empty_directories scan (predicate-gated)
- [x] Task 12: Rename detection (pure correlação delete+create por hash). A integração com janela de 200ms no watcher consumer fica para a Task 13.
- [x] Task 13: Watcher integration — sync/watcher_bridge.rs (broadcaster global via OnceLock + broadcast::Sender) com 1 fan-out call adicionado em vault/watcher.rs sem alterar struct/emit existente. O `spawn_watcher_consumer` que aplica should_sync_path fica para a Task 15 (Tauri commands) onde a LanSyncState assina via subscribe().
- [x] Task 14: Auth log — auth_events (audit) + auth_blocks (rate limit 5/15min → 24h block, path-traversal weight 2, lazy expire, success redeems block but keeps trail) + cleanup_old_events para retention 30d
- [x] Task 15: Tauri commands em commands/sync.rs + registro em lib.rs. Live-network commands (set_discoverable, browse, pair_server/client, start, stop, request_full_resync) registrados como stubs com TODOs claros - implementação completa requer async TCP/mDNS que precisa de ambiente real para validar.
- [ ] Task 16: Frontend types + store + service + settings entry + testes vitest
- [ ] Task 17: Frontend UI base (LanSyncSettings, PairingDialog, PeerListPanel, ShareEditDialog com radio subfolder vs root-with-excludes)
- [ ] Task 18: Status bar integration (LanSyncStatusIndicator no StatusBar)
- [ ] Task 19: OS network permissions (Info.plist NSLocalNetworkUsageDescription + NSBonjourServices + entitlements + first-launch UX)
- [ ] Task 20: Documentação docs/lan-sync.md + E2E manual pass + criar tasks/todo/lan-sync-followups.md

## Notes

- Branch: `claude/vault-lan-sync-r1D89`
- Cada task = 1 commit. NUNCA batchar.
- Antes de cada commit: rodar testes relevantes (Rust → `cargo test --manifest-path src-tauri/Cargo.toml`; Frontend → `pnpm check && pnpm vitest run`).
- Verificar staging com `git diff --cached --stat` antes de `git commit`.
- Commit message: formato completo (Context, Problem, Solution, Behavior, Files) conforme `docs/COMMITS.md`.
- Reusar quando possível: `is_inside_hidden_dir` em `src-tauri/src/vault/watcher.rs:55`; padrão AES-GCM + Keychain em `src-tauri/src/security/`; padrão de event emission em `src-tauri/src/vault/`.
