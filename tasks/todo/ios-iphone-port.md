# Kokobrain no iOS (iPhone)

Port do app Tauri 2 + Svelte 5 (hoje só macOS) para rodar no iPhone (iPad fica de graça como
superset do layout iPhone). Decisões de escopo: alvo iPhone apenas; vault em pasta interna no
diretório Documents do app, exposta no app Files (`UIFileSharingEnabled` +
`LSSupportsOpeningDocumentsInPlace`) e sincronizável por iCloud; v1 = abrir/navegar/ler/editar
texto (operações de arquivo depois); cortado no iOS: busca semântica (ONNX), quick capture,
file watcher nativo.

Estratégia de gating: Rust usa `#[cfg(desktop)]`/`#[cfg(mobile)]` (aliases do Tauri 2) e
`#[cfg(target_os = "macos")]` só onde for específico do macOS; deps só-desktop em
`[target.'cfg(desktop)'.dependencies]`. Frontend usa `@tauri-apps/plugin-os` `platform()` via
um novo `src/lib/utils/platform.ts`.

NOTA DE AMBIENTE: build/verificação iOS (`tauri ios init`, Xcode, simulador, assinatura) só
roda em macOS. As tarefas de Fase 0/6 e a verificação no simulador devem ser executadas em um Mac.

## Tasks

### Fase 0 — Scaffolding mobile e compilar para iOS (requer macOS)
- [ ] `pnpm tauri ios init` (gera `src-tauri/gen/apple`); versionar o projeto gerado
- [ ] Adicionar targets `aarch64-apple-ios` e `aarch64-apple-ios-sim`; meta: `cargo build --target aarch64-apple-ios-sim` compilar
- [ ] `tauri.conf.json`: isolar settings só-macOS (`macOSPrivateApi`, `trafficLightPosition`, `titleBarStyle`, window size fixo) e adicionar config mobile

### Fase 1 — Gating de dependências (Cargo.toml)
- [ ] Mover `notify`, `ort`, `tokenizers`, `arboard`, `tauri-plugin-global-shortcut`, `tauri-plugin-process`, `tauri-plugin-updater`, `image` (se só quick-capture) para `[target.'cfg(desktop)'.dependencies]` ou feature-gate

### Fase 2 — Stub/desativar features cortadas (Rust + frontend)
- [ ] Semantic: `#[cfg(desktop)]` em `src-tauri/src/semantic/*` e `commands/semantic.rs`; registrar handlers só no desktop em `lib.rs`; manter FTS (`commands/search_index.rs`)
- [ ] Quick capture: `#[cfg(desktop)]` em `src-tauri/src/quick_capture/*` e registro do `global-shortcut` em `lib.rs`
- [ ] Watcher: `#[cfg(desktop)]` em `vault/watcher.rs` e `start_vault_watcher`; expor `rescan_vault` para pull-to-refresh no iOS
- [ ] Frontend: guardar com `isIOS()` as chamadas semantic/hybrid em `search.service.ts` (cair para FTS), `plugins/quick-capture/*`, `watcher-handler.service.ts`, e relaunch (process) no Settings

### Fase 3 — Acesso à vault no iOS (pasta interna + Files/iCloud)
- [ ] Info.plist: `UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`; entitlement/keys de iCloud (spike)
- [ ] Resolver root da vault via API de path do Tauri (Documents); notas em `<Documents>/vaults/<nome>/`
- [ ] `vault.service.ts`: em iOS não usar `open({directory:true})`; UI mobile de criar/abrir vault dentro de Documents
- [ ] Ajustar `assetProtocol.scope` (`tauri.conf.json`) e `capabilities/*.json` para caminhos iOS

### Fase 4 — Layout responsivo single-pane (iPhone)
- [ ] Criar `src/lib/utils/platform.ts` (`isMobile`/`isIOS`) + breakpoint mobile no Tailwind
- [ ] `AppShell.svelte`: em mobile, trocar `PaneGroup` de 4 painéis por visão única + drawer/bottom-nav; remover drag-resize e `data-tauri-drag-region`
- [ ] `+layout.svelte`: viewport meta + `env(safe-area-inset-*)`

### Fase 5 — Touch e navegação sem teclado
- [ ] Affordances de UI para command palette, quick switcher, nova nota, troca de aba, settings (substituir Cmd+X de `global-keybindings.ts`)
- [ ] Fallback de long-press para o menu de contexto do editor (`MarkdownEditor.svelte`)
- [ ] CodeMirror: tratar teclado virtual com `visualViewport`; trocar `mousedown` por `pointerdown` no clique de wikilink

### Fase 6 — Build/distribuição (requer macOS)
- [ ] `pnpm tauri ios dev` (simulador) e `pnpm tauri ios build`
- [ ] CI: `cargo build --target aarch64-apple-ios-sim` como gate
- [ ] Signing/provisioning + TestFlight

## Notes

- Funciona em iOS sem mudança: FTS5, SQLite bundled, chunking/parsing markdown, CodeMirror 6,
  plugins `fs`/`dialog`/`http`/`deep-link`/`opener`/`clipboard-manager`, `tokio`/`reqwest`/`image`/`chrono`/`serde`.
- `objc2*` já está em `[target.'cfg(target_os = "macos")'.dependencies]`; `commands/fonts.rs` (CoreText) já retorna vazio fora do macOS.
- Cada tarefa = um commit, com testes antes: Rust `cargo test --manifest-path src-tauri/Cargo.toml`; frontend `pnpm check` + `pnpm vitest run`.
- Riscos/spikes: maturidade do Tauri iOS (validar cedo no simulador); entitlements/timing de iCloud
  (v1 pode entregar Files/UIFileSharing primeiro); teclado virtual do WebKit em device real;
  garantir que desativar semantic no frontend cai limpo para FTS sem quebrar o hybrid.
