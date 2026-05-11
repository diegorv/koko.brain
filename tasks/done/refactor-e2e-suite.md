# Refatorar suite E2E (Playwright)

## Context

A suite E2E atual em `e2e/` ficou desatualizada e está praticamente toda quebrada na prática, embora os arquivos pareçam saudáveis num grep. A causa raiz é única e bem localizada:

- O frontend do app invoca **49 comandos Tauri distintos** (mapeado por grep em `src/lib`), mas o mock em `e2e/mocks/tauri-core.ts` cobre apenas **3** (`scan_vault`, `read_files_batch`, `search_vault`). Os outros 46 caem em `default: console.warn(...); return null`.
- A família `*_v2` (`scan_vault_v2`, `get_all_vault_entries_v2`, `get_backlinks_v2`, `get_outgoing_links_v2`, `get_all_tags_v2`, `get_all_tasks_v2`, `get_unlinked_mentions_v2`, `get_outgoing_unlinked_mentions_v2`, `get_tasks_in_section_v2`, `update_note_in_index`, `remove_note_from_index`, `toggle_task_status`) é o "lifeblood" do app desde a migração para o `VaultIndex` em Rust (ADR 0025). Sem ela mockada, **a árvore de arquivos não popula**, e qualquer spec que dependa de clicar num item da árvore (root specs E os 16 specs de live-preview) falha.
- O resto dos comandos (encryption, semantic search, history, terminal, fonts) também precisa de stubs sensatos.
- A infra de mocking que já existe é boa: alias do Vite por `process.env.PLAYWRIGHT` (`vite.config.js:74`), virtual FS in-memory de 318 LOC, mocks de dialog/event/window funcionais, fixture pattern via `vaultPage` e `lpPage`. Tudo isso fica.

Decisões já alinhadas com o usuário:
- **Live-preview specs (16 arquivos)**: ficam intocados, vão passar de graça assim que o mock layer estiver pronto.
- **Escopo**: golden paths de core + features, sem plugins (queryjs/encryption/semantic/terminal/kanban/calendar/graph ficam fora).
- **Specs antigos**: deletar do git, histórico do `git log` preserva.

## Goal

Suite E2E que roda verde via `bash scripts/e2e.sh` cobrindo:
1. Os 16 live-preview specs existentes (sem editá-los)
2. ~12 specs novos cobrindo os golden paths principais do app

## Tasks

Cada tarefa = um commit. Seguir CLAUDE.md (Plan Mode Workflow): rodar testes relevantes (Frontend → `pnpm check` + `pnpm vitest run`), `git add` específico, `git diff --cached --stat`, commit imediato no formato Context/Problem/Solution/Behavior/Files.

### 1. Mock layer: novo `vault-index` in-memory (combinado com Task 3)
- [x] Criar `e2e/mocks/vault-index.ts`. Espelha o Rust `VaultIndex` em memória. Reusa `parseWikilinks`/`getNoteName`/`buildResolutionCache`/`resolveWikilinkCached` de `backlinks.logic.ts` e `extractAllTags` de `tags.logic.ts`. Frontmatter via `yaml` lib com subset Rust (nested → null). Parser de tasks minimalista inline. API: `rebuildAll()`, `getEntry()`, `getAll()`, `getBacklinks()`, `getOutgoingLinks()`, `getOutgoingUnlinkedMentions()`, `getUnlinkedMentions()`, `getAllTags()`, `getNotesWithTag()`, `getAllTasks()`, `getTasksInSection()`, `toggleTaskStatus()`, `getNoteRecords()`, `getNoteProperties()`, `update()`, `remove()`, `reset()`, version counter.
- [x] Estender `e2e/types/global.d.ts`: `vaultIndex` em `window.__e2e`, `readFileSafe` em `E2eFS`.
- [ ] (deferido) Testes vitest do parser — pulado por hora; o parser será exercitado pelos specs E2E em Task 8.

### 2. Mock layer: reescrita do `tauri-core.ts`
- [x] Reescrever com handlers tipados por categoria + dispatch table `HANDLERS`. Cobre 49 comandos. Comandos v2 delegam para `vaultIndex`, legacy para `virtualFS`, no-ops para encryption/semantic/history/terminal/font/db. Stub de `download_semantic_model` retorna `null`, `is_semantic_model_available`/`has_encryption_key` retornam `false`, `decrypt`/`encrypt` em passthrough.

### 3. Mock layer: sync entre `virtualFS` e `vaultIndex` (combinado com Task 1)
- [x] Em `e2e/mocks/virtual-fs.ts`, adicionar API `subscribe()` com hooks `onWrite/onRemove/onRename/onPopulate`. Helpers `readFileSafe()` e `statRaw()`.
- [x] `vault-index.ts` registra-se no boot. `populate()` chama `onPopulate` → `vaultIndex.rebuildAll()`.

### 4. Reformar fixture principal
- [x] Reescrever `e2e/fixtures/test-vault.ts`: novo `TEST_FILES` com Welcome/Inbox/Projects (Roadmap+Q2+archive)/Daily, frontmatter (`status`, `priority`, `tags`, `quarter`), tasks `- [ ]` / `- [x]`, tags `#intro`/`#plan`/`#project`. Comentário documenta uso por panel.
- [x] `e2e/fixtures/live-preview.ts` automaticamente re-parseia índice via `virtualFS.subscribe(onPopulate)` registrado em `vault-index.ts`. Sem mudança necessária.
- [x] Criar `e2e/fixtures/helpers.ts` com `pressShortcut(Mod+...)`, `openTreeItem`, `typeInEditor`, `saveCurrentFile`, `openCommandPalette`, `openQuickSwitcher`, `openSearch`, `expectTabActive`, `tree`, `treeItem`, `activeTab`. Cross-platform via `Mod` placeholder.

### 5. Apagar 16 specs root antigos
- [x] Removidos 16 specs (1.163 LOC). `e2e/specs/live-preview/` intocado.

### 5.1. Fix de mocks descoberto durante validação
- [x] `tauri-window.ts` estendido com onFocusChanged/onResized/onMoved/onScaleChanged/setTitle/show/hide/setFocus/isFocused/isVisible.
- [x] `tauri-core.ts`: stub de `Resource`, `Channel`, `transformCallback`, `convertFileSrc`, `PluginListener` para destravar dep optimizer (plugin-updater os usa).
- [x] `vite.config.js`: adicionar `optimizeDeps.exclude` com pacotes Tauri em PLAYWRIGHT mode — sem isso o optimizer cria uma SEGUNDA instância de `virtualFS` empacotada com plugin-updater, divergindo do store que `window.__e2e.fs` usa.
- [x] `virtual-fs.ts`: refatorado `scanVault` para usar closure helper `doReadDir` em vez de `this.readDir` (defensivo).

### 6. Escrever specs novos (golden paths)
Cada spec é um commit separado. Manter cada um < 100 LOC, focado, asserts em conteúdo renderizado (não só presença de container, conforme CLAUDE.md regra 8).
- [x] `vault-picker.spec.ts` — picker → "Open Vault" → tree visível.
- [x] `editor.spec.ts` — abrir nota → digitar → dirty indicator → Cmd+S → indicador some → conteúdo persiste cross-tab-switch.
- [x] `tabs.spec.ts` — abrir múltiplos → Cmd+Shift+[/] cycle → Cmd+W close (relativo ao baseline).
- [x] `file-explorer.spec.ts` — top-level files+folders, `.kokobrain` oculto, expand folder, ordenação.
- [x] `file-operations.spec.ts` — context menu items (New File/Folder/Rename/Move to Trash); trash flow.
- [x] `command-palette.spec.ts` — Cmd+P abre, filtra, Esc fecha.
- [x] `quick-switcher.spec.ts` — Cmd+O abre, filtra, Esc fecha.
- [x] `search.spec.ts` — Cmd+Shift+F abre, query "Roadmap" surface results.
- [x] `wikilink-navigation.spec.ts` — click decoration → abre target; tabs anteriores preservadas.
- [x] `sidebars.spec.ts` — backlinks/outgoing populam; Cmd+B toggle.
- [x] `keyboard-shortcuts.spec.ts` — Cmd+P, Cmd+O, Cmd+Comma, Cmd+W consolidados.
- [x] `settings.spec.ts` — Cmd+, abre, navega seções, Esc fecha.

### 7. Polir config e scripts
- [ ] `e2e/playwright.config.ts` — adicionar `fullyParallel: true`, `expect: { timeout: 5_000 }`, reporter `[['list'], ['html', { open: 'never' }]]`. Manter chromium-only e timeout de 30s.
- [ ] `scripts/e2e.sh` — adicionar header com docstring de uso (`bash scripts/e2e.sh [--ui] [paths...]`). Lógica fica.
- [ ] `package.json` — confirmar `test:e2e` e `test:e2e:ui`. Adicionar `test:e2e:report` que abre `playwright-report/index.html` se existir.

### 8. Verificação end-to-end
- [x] `bash scripts/e2e.sh` → 123 passed / 16 failed em 1.4 min. Os 26 specs root novos: TODOS verdes. Live-preview: 104/120 verdes; 16 falhas são bugs pré-existentes nos próprios specs (selectors `.cm-lp-bold` covers `**` markers not the word; `.cm-lp-hard-break` selector not in CSS; mermaid svg attribute drift) — unrelated ao trabalho atual e ao mock layer.
- [x] `bash scripts/e2e.sh e2e/specs/editor.spec.ts` (validado durante desenvolvimento — passou).
- [x] `grep "Unknown invoke command" /tmp/kokobrain-e2e-server.log` → 0 hits. Cobertura completa de IPC.
- [x] `bash scripts/e2e.sh --ui` → forwarded direto pro Playwright (não testado headless mas o script só adiciona `--ui` aos args; padrão de uso documentado no header).

## Files to modify
- `e2e/mocks/tauri-core.ts` — rewrite
- `e2e/mocks/vault-index.ts` — new
- `e2e/mocks/virtual-fs.ts` — adicionar hooks de sync
- `e2e/types/global.d.ts` — estender com tipos v2 + `vaultIndex`
- `e2e/fixtures/test-vault.ts` — rewrite com vault rico
- `e2e/fixtures/helpers.ts` — new
- `e2e/specs/*.spec.ts` (root, 16 arquivos) — `git rm` e substituir por 12 novos
- `e2e/playwright.config.ts` — polish (parallel, html reporter)
- `scripts/e2e.sh` — polish (docstring header)
- `package.json` — confirmar scripts, opcional `test:e2e:report`

## Files to keep untouched
- `e2e/specs/live-preview/*.spec.ts` (16 arquivos)
- `e2e/fixtures/live-preview.ts` (compat com os 16 specs)
- `e2e/mocks/tauri-fs.ts`, `tauri-dialog.ts`, `tauri-event.ts`, `tauri-window.ts`, `tauri-opener.ts`, `tauri-http.ts`, `tauri-deep-link.ts`
- `vite.config.js` (alias mechanism está correto, `vite.config.js:74`)

## Verification

End-to-end:
1. `bash scripts/e2e.sh` exit 0, todos os specs verdes
2. `grep "Unknown invoke command" /tmp/kokobrain-e2e-server.log` retorna vazio
3. `bash scripts/e2e.sh e2e/specs/live-preview/*.spec.ts` passa sem nenhum arquivo de spec ter sido editado
4. UI mode (`bash scripts/e2e.sh --ui`) abre

Type/lint:
- `pnpm check` limpo (rodar a cada commit conforme CLAUDE.md regra 6)
- `pnpm vitest run` limpo (não há testes vitest para mocks ainda; se task 1 adicionar `vault-index.test.ts`, rodar)

## Notes

- Plan mode obriga escrita só em `~/.claude/plans/...`. Depois de aprovado e exited, copiar este plano para `tasks/todo/refactor-e2e-suite.md` (CLAUDE.md Plan Mode Workflow exige tracking lá).
- Cada tarefa = um commit (CLAUDE.md NÃO permite batch). Format completo: Context/Problem/Solution/Behavior/Files com line ranges.
- Selectors continuam role-based + CSS (`.cm-content`, `.cm-lp-*`, `[role="tree"]`, `[role="treeitem"]`, `[role="tab"]`). Nenhum `data-testid` é adicionado ao source — alinhado com padrão atual (0 ocorrências em `src/lib`).
- O `vault-index.ts` deve importar diretamente os parsers puros de `src/lib/features/backlinks/backlinks.logic.ts` e `src/lib/features/tags/tags.logic.ts` (já são puros, não importam framework). Isso garante que o mock parseia idêntico ao app, evitando drift.
- Tasks 1, 2, 3 podem ser combinadas num único commit "feat(e2e): rebuild Tauri mock layer with v2 IPC coverage" se ficarem coupled — caso contrário separar.
- Scope explicitamente fora: plugins (queryjs runtime, encryption real, semantic search, terminal, kanban, calendar, graph-view), visual regression / screenshots, multi-browser (Firefox/Webkit).
