# LAN Sync — Stage 5: Testes de Integração + Status Bar

Cobertura de testes end-to-end (Rust + frontend) + indicador visual de sync na status bar. Depende dos Stages 1-4.

> Referência completa: [feature-lan-sync.md](../reference/feature-lan-sync.md)

## Tasks

- [x] Task 22: Criar `src-tauri/tests/sync_integration_test.rs` — testes de integração Rust
  - **Nota:** testes unitários estão nos módulos (Stages 1-3). Este arquivo contém testes de **integração** entre múltiplos módulos.
  - `test_full_sync_cycle_two_peers()` — dois SyncEngines locais sincronizam um `.md` via loopback
  - `test_delete_propagation_two_peers()` — delete em peer A → sync → deletado em peer B
  - `test_delete_modify_conflict_keeps_modified()` — A deleta, B modifica → modificado preservado
  - `test_three_way_diff_no_false_conflicts()` — só A modifica → sem conflito (baseline detecta)
  - `test_idle_timeout()` — conexão sem mensagens por 60s → fechada
  - `test_vault_id_never_overwritten()` — receptor com vault-id → sync não sobrescreve
  - `test_baseline_persists_across_restarts()` — baseline em sync-state.json → sobrevive restart

- [x] Task 23: Criar `src/lib/core/status-bar/SyncStatus.svelte` — indicador de sync na status bar
  - Lê `syncStore.isRunning`, `syncStore.status`, `syncStore.peers`
  - Estados:
    - Sync desativado → não renderiza
    - Ativo, sem peers → `↕ No peers` (muted)
    - Ativo, peer(s), idle → `↕ Synced` (verde)
    - Syncing → `↕ Syncing…` (spin animado)
    - Erro → `↕ Sync error` (vermelho, tooltip com mensagem)
  - Clique abre SettingsDialog na seção 'sync'
  - Ícone: `RefreshCw` do lucide-svelte
  - Integrar no `AppShell.svelte` no slot `right` do `StatusBar`

- [x] Task 24: Criar `src/tests/sync.service.test.ts` e `src/tests/sync-status.test.ts` — testes frontend
  - Mock de `invoke` do Tauri
  - **sync.service.test.ts:**
    - `initSync` com `enabled: false` → não chama `invoke('start_sync')`
    - `initSync` com `enabled: true` + passphrase → chama `invoke('start_sync')`
    - `loadSyncLocalConfig` → invoke + store update
    - `saveSyncLocalConfig` → invoke + store update
    - `syncStore` getters: `peers`, `status`, `isRunning`, `excludedPaths`
    - `addPeer()` / `removePeer()` funcionam
    - `teardownSync()` → invoke + reset store
    - `changePassphrase()` → invoke + toast
    - `resetSync()` → invoke + reset + toast
  - **sync-status.test.ts:**
    - `isRunning=false` → não renderiza
    - `isRunning=true` + `peers=[]` → "No peers"
    - `isRunning=true` + peers + idle → "Synced"

## Validação

```bash
cargo test --manifest-path src-tauri/Cargo.toml
pnpm check
pnpm vitest run
```

Todos os testes passam. Status bar reflete estado real do sync.

## Notes

- Testes de integração Rust precisam de diretórios temporários como vaults simulados
- Testes de integração usam loopback (127.0.0.1) — sem dependência de rede real
- `SyncStatus.svelte` é componente leve — sem lógica de negócio, apenas leitura de store
- Após completar todos os stages: mover `feature-lan-sync.md` de `tasks/reference/` para `tasks/done/`
