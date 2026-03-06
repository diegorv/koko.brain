# LAN Sync — Stage 4: Frontend (Settings + Service + Lifecycle)

UI completa de configuração + serviço de sync + integração no ciclo de vida do app. Depende do Stage 3 (backend funcional).

> Referência completa: [feature-lan-sync.md](../reference/feature-lan-sync.md)

## Tasks

- [x] Task 13: Adicionar `SyncSettings` em `src/lib/core/settings/settings.types.ts`
  ```typescript
  export interface SyncSettings {
    enabled: boolean;
    port: number;            // padrão: 39782
    intervalMinutes: number; // padrão: 5
  }
  ```
  - Adicionar `sync: SyncSettings` em `AppSettings`
  - Adicionar `'sync'` em `SettingsSection` type
  - **Nota:** `excludedPaths` em `sync-local.json` (não em settings), passphrase no Keychain

- [x] Task 14: Adicionar `sync` ao store e defaults em `src/lib/core/settings/settings.store.svelte.ts`
  - Default: `sync: { enabled: false, port: 39782, intervalMinutes: 5 }`
  - Getter: `get sync() { return settings.sync; }`
  - Updater: `updateSync(value: Partial<SyncSettings>) { ... }`

- [x] Task 15: Atualizar `loadSettings()` em `src/lib/core/settings/settings.service.ts`
  - Merge de `SyncSettings` no bloco de merge profundo

- [x] Task 16: Criar `src/lib/features/sync/sync.store.svelte.ts` — estado de runtime
  - `SyncPeer { id, name, ip, port }`
  - `SyncStatusInfo { state: 'idle'|'syncing'|'error', peerId?, filesTotal?, filesDone?, error?, lastSyncAt? }`
  - Getters: `peers`, `status`, `isRunning`, `excludedPaths`
  - Setters: `setPeers`, `addPeer`, `removePeer`, `setStatus`, `setRunning`, `setExcludedPaths`, `reset`

- [x] Task 17: Criar `src/lib/features/sync/sync.service.ts` — serviço de sync
  - `generatePassphrase()` → `invoke('generate_sync_passphrase')`
  - `savePassphrase(vaultPath, passphrase)` → `invoke('save_sync_passphrase')`
  - `hasPassphrase(vaultPath)` → `invoke('has_sync_passphrase')`
  - `deletePassphrase(vaultPath)` → `invoke('delete_sync_passphrase')`
  - `loadSyncLocalConfig(vaultPath)` → `invoke('get_sync_local_config')` → store
  - `saveSyncLocalConfig(vaultPath, paths)` → `invoke('save_sync_local_config')` → store
  - `initSync(vaultPath)` — verifica enabled + passphrase → start_sync → registra listeners de eventos Tauri + watcher com debounce 2s
  - `teardownSync()` — stop_sync → remove listeners → reset store
  - `changePassphrase(vaultPath, newPassphrase)` → invoke + toast
  - `resetSync(vaultPath)` → invoke + reset store + toast
  - `triggerSync()` → `invoke('trigger_sync')`

- [x] Task 18: Criar `src/lib/core/settings/sections/SyncSection.svelte` — UI de settings
  - Toggle Enable Sync (desabilitado sem passphrase)
  - Passphrase: 3 inputs de 5 chars com auto-focus, paste distribution, show/hide
  - Botão [Generate] (Rust CSPRNG)
  - Excluded paths: lista editável + [+ Add] + [✕] remove (persiste em sync-local.json)
  - Sync interval selector
  - Port input
  - Connected Peers list (de syncStore.peers)
  - Botão [Sync Now]
  - Danger Zone: [Change Passphrase] + [Reset Sync] com confirmações

- [x] Task 19: Registrar `SyncSection` no `SettingsDialog.svelte`
  - Import + `case 'sync'` + ícone `RefreshCw` do lucide-svelte

- [x] Task 20: Adicionar seção `'sync'` em `settings.logic.ts`
  - Novo grupo `'Sync'` com `{ id: 'sync', label: 'Sync' }` após grupo 'Tools'

- [x] Task 21: Integrar sync no ciclo de vida em `app-lifecycle.service.ts`
  - `initializeVault()`: `await initSync(vaultPath)` após `await initTodoist()`
  - `teardownVault()`: `await teardownSync()` com os outros resets

## Validação

```bash
pnpm check
pnpm vitest run
```

Teste manual: abrir Settings → seção Sync → gerar passphrase → ativar → peers aparecem → sync funciona via UI.

## Notes

- Passphrase nunca é lida de volta do Keychain para a UI — campos sempre vazios ao abrir
- Indicador visual `✓ Passphrase saved` / `⚠ Not configured` baseado em `hasPassphrase()`
- `excludedPaths` persiste em `sync-local.json` (nunca sincronizado), não em `settings.json`
- Watcher de sync reutiliza o file watcher existente do app (sem criar segundo watcher)
- Debounce duplo: 2s no frontend (antes de invoke) + 2s no engine Rust
