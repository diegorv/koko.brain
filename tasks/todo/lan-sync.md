# LAN Sync P2P seguro entre vaults Kokobrain

Sistema de sync de pastas entre vaults Kokobrain em diferentes computadores da mesma LAN. Nunca via Internet externa. Segurança é prioridade absoluta — todo tráfego criptografado, peers só acessam pastas explicitamente expostas.

Plano detalhado em `/root/.claude/plans/quero-criar-um-sistema-reflective-galaxy.md` (também versionado como contexto desta tarefa).

## Tasks

- [x] Task 1: Adicionar 8 crates ao Cargo.toml (ed25519-dalek, x25519-dalek, hkdf, spake2, mdns-sd, local-ip-address, tokio-util, subtle)
- [x] Task 2: Wordlist BIP-39 + módulo Diceware (7 palavras, ~77 bits) com geração, normalização e validação
- [x] Task 3: Identity module (Ed25519 + Keychain abstraído via KeyStorage trait) com fingerprint format e persistência
- [ ] Task 4: Shares config com 2 modos (subfolder, root-with-excludes) + hard-deny rules + 3 camadas de path traversal defense
- [ ] Task 5: Wire protocol structs (HandshakeMsg, AppMsg) + version negotiation + directory entries
- [ ] Task 6: Transport layer (TCP + LengthDelimitedCodec + handshake X25519 + AES-256-GCM streaming + keepalive Ping/Pong + idle timeout + reconnect backoff)
- [ ] Task 7: Discovery (mDNS-SD opt-in + RFC1918 filter + IPv6 link-local)
- [ ] Task 8: Pairing (SPAKE2 com Diceware secret + signed transcript binding + peers.json criptografado)
- [ ] Task 9: State DB (SQLite schema) + manifest paginado + diff engine
- [ ] Task 10: Conflict resolution (LWW por Lamport+mtime) + Lamport clock + atomic writes (tmp+fsync+rename)
- [ ] Task 11: Empty directories sync (ManifestEntry com kind file|directory)
- [ ] Task 12: Rename detection (correlação delete+create por hash em janela 200ms)
- [ ] Task 13: Watcher integration (broadcaster em vault/watcher.rs sem remover emit existente; spawn_watcher_consumer aplica should_sync_path)
- [ ] Task 14: Auth log (auth_events audit + auth_blocks rate limit 5/15min → 24h block; retention 30d)
- [ ] Task 15: Tauri commands em commands/sync.rs + registro em lib.rs
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
