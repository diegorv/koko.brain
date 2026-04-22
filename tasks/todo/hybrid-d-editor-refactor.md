# Híbrido D — Refactor do Live Preview

Consolida os 11 plugins inline do live preview em 2–3 (via `HighlightStyle` nativo + `inlineFormattingPlugin` unificado com handler registry), adiciona raw mode (Cmd+K), simplifica o modelo de execução do QueryJS (primeira abertura por sessão + cache + botão Run), e depois enriquece a UX dos block widgets (tabela, code, queryjs, meta-bind, callout). Redução líquida estimada: ~1 200 linhas; −67% de regras de performance críticas; API pública preservada.

**Decisões tomadas:** escopo Fases 0–17; feature flag `experimental.newLivePreview` gateia Fases 2–11; raw mode default `false`; Cmd+K livre; `autoRunQueries: 'first-open' | 'always' | 'manual'` default `'first-open'`.

**Branch:** `claude/hybrid-d-editor-refactor-97Ecc`.

**Plano detalhado:** ver `/root/.claude/plans/a-proposta-h-brido-d-dazzling-honey.md` para contexto completo, critical paths, feature flag strategy, riscos e verification.

## Tasks

### Fase 0 — Inventário & feature flag ✅

**Decisão revisada:** baseline E2E do projeto atual está instável — pulada. Cada fase cria seus próprios testes (unit + E2E específicos) do zero como parte do commit da fase. Sem gate de "E2E suite antiga verde".

- [x] ~~Rodar `bash scripts/e2e.sh` completo~~ — pulada por instabilidade conhecida.
- [x] Inventariar classes CSS emitidas pelos 11 plugins inline em `tasks/notes/css-classes-inventory.md`.
- [x] Adicionar `experimental.newLivePreview: boolean` em settings (types + store + getter + updater + teste unit).
- [x] Adicionar seção "Experimental" em settings UI.
- [x] Refatorar `livePreviewExtensions()` para branching flag; `newInlineExtensions()` retorna `[]`. Teste unit do branching.

### Fase 1 — Raw mode (Cmd+K) ✅

- [x] `rawMode: boolean` em `EditorSettings` (types + defaults + getter + teste).
- [x] Short-circuit em `core/should-show-source.ts` + atualizar `should-show-source.test.ts`.
- [x] `toggleRawMode()` em `editor.service.ts` + keybinding Cmd+K em `global-keybindings.ts`.
- [x] E2E `e2e/specs/live-preview/raw-mode.spec.ts`.

### Fase 2 — Scaffold do novo pipeline

- [ ] Criar `new/markdown-highlight-style.ts` preservando nomes de classe do inventário.
- [ ] Criar `new/inline-formatting-plugin.ts` com handler registry (nodeType + decorate + cursor-reveal via `touched`).
- [ ] Criar `new/new-inline-extensions.ts` e cablear em `live-preview.ts` quando flag on.
- [ ] Teste unitário com handler dummy.

### Fase 3 — Aposentar `markdownStylePlugin` (113 linhas)

- [ ] Snapshot DOM confirma classes `cm-lp-bold`, `cm-lp-italic`, etc.
- [ ] Condicionar legacy: quando flag on, pular `markdownStylePlugin`.
- [ ] `inline-formatting.spec.ts` com flag on e off.

### Fase 4 — Aposentar `headingPlugin` (121 linhas)

- [ ] Mapeamentos `t.heading1..heading6` no `mdStyle`.
- [ ] `headingMarkHandler` no `inlineFormattingPlugin` cobre hide do `#` com cursor-reveal.
- [ ] Remover registro no caminho novo.
- [ ] E2E `headings.spec.ts`.

### Fase 5 — Aposentar `blockquotePlugin` (133 linhas)

- [ ] `new/blockquote-line-decoration.ts` para estilização de linha.
- [ ] Marcas `>` no handler registry com cursor-reveal.
- [ ] E2E `blockquotes-callouts.spec.ts`.

### Fase 6 — Aposentar `inlineCommentPlugin` (95 linhas)

- [ ] `commentHandler` no inlineFormattingPlugin.
- [ ] E2E `misc-features.spec.ts` (comments).

### Fase 7 — Aposentar `blockReferencePlugin` (89 linhas)

- [ ] `blockRefHandler`.
- [ ] E2E `misc-features.spec.ts` (block refs).

### Fase 8 — Aposentar `simpleWidgetPlugin` (290 linhas)

- [ ] Estender handler registry: `{ type: 'mark' | 'replace', ... }`.
- [ ] Handlers `hrHandler`, `hardBreakHandler`, `bulletHandler`, `taskMarkerHandler`.
- [ ] E2E `lists.spec.ts` + `misc-features.spec.ts`.

### Fase 9 — Aposentar `linkPlugin` (283 linhas)

- [ ] 9.a: link básico `[x](y)` — mark que esconde brackets + classe.
- [ ] 9.b: ícone de link externo (replace widget).
- [ ] 9.c: integração `wikilink-navigation.ts` (click handler).
- [ ] E2E `links.spec.ts`.

### Fase 10 — Aposentar `inlineMarksPlugin` (163 linhas)

- [ ] Handler detecta `**`, `*`, `` ` ``, `~~`, `==`.
- [ ] Integrar `shouldShowSource` via `touched`.
- [ ] Suite E2E completa `e2e/specs/live-preview/`.

### Fase 11 — Dogfood + ajustes

- [ ] Flag on em dev local, 1 semana, vault de 1 870 notas.
- [ ] Perf benchmarks: init time, scroll FPS, `LP-PROFILE` timings.
- [ ] Corrigir regressões descobertas.
- [ ] Suite E2E completa com flag on.

### Fase 11.5 — Flip da flag default

- [ ] Mudar default de `experimental.newLivePreview` para `true`.
- [ ] Release notes com instrução de como desligar.

### Fase 12 — QueryJS execution model

- [ ] `queryjs: { autoRunQueries }` em settings.
- [ ] `queryjs-session.store.svelte.ts` (`autoRunOnFirstOpen`, `resultCache` live DOM ref, `reset()`).
- [ ] Reescrever `queryjs-block-widget.ts → toDOM()`: deletar auto-await regex, clone semantics e exclusões; fluxo com cache hit + autoRun + botão Run + erro.
- [ ] Cleanup da nota no close.
- [ ] E2E `execution-model.spec.ts` (5 cenários).
- [ ] Atualizar `docs/adr/0010-queryjs-kb-api-caching.md`.

### Fase 12.5 — Cleanup do legacy

- [ ] Deletar os 11 plugins antigos.
- [ ] Deletar `legacyInlineExtensions()` e colapsar branching.
- [ ] Remover flag `experimental.newLivePreview`.
- [ ] Deletar testes antigos.
- [ ] Renomear `new/*.ts` para caminhos finais.
- [ ] Suite completa + E2E + visual regression.

### Fase 13 — Table widget UX

- [ ] Tab/Shift+Tab navega células.
- [ ] Enter cria linha.
- [ ] Botões `+` coluna/linha.
- [ ] Drag handle para reordenar.
- [ ] Paste detector TSV/Excel.
- [ ] E2E + testes parser TSV.

### Fase 14 — Code block UX

- [ ] Switcher de linguagem (dropdown).
- [ ] Shift+Tab sai do bloco.
- [ ] Tab indenta (verificar).
- [ ] E2E `code-blocks.spec.ts`.

### Fase 15 — QueryJS rendering states

- [ ] Loading state.
- [ ] Error display com stack + botão Run.
- [ ] Paginação via `kb.ui.table(..., { pageSize })`.
- [ ] E2E estende `execution-model.spec.ts`.

### Fase 16 — Meta-bind form validation

- [ ] Validação inline de tipos.
- [ ] Mensagem de erro abaixo do input.
- [ ] Aceita/rejeita save.
- [ ] E2E `meta-bind.spec.ts`.

### Fase 17 — Callout UX

- [ ] Dropdown de tipo.
- [ ] Toggle collapse UI.
- [ ] Persistir via `calloutFoldState`.
- [ ] E2E `blockquotes-callouts.spec.ts`.

## Notes

- **Feature flag:** `experimental.newLivePreview` (default `false` até Fase 11.5). Branch único em `live-preview.ts → livePreviewExtensions()`.
- **Rollback por fase:** flipar flag (runtime) ou `git revert` do commit da fase.
- **Testing gate** (CLAUDE.md Quick Ref #6): Frontend → `pnpm check` + `pnpm vitest run`. **E2E baseline pulada** — cada fase escreve specs próprios, do zero. Commit por task, formato detalhado (Context/Problem/Solution/Behavior/Files).
- **Nomes de classe CSS:** preservar exatamente (inventário na Fase 0) para não quebrar temas externos.
- **`shouldShowSource` é chamado por 22 arquivos** — short-circuit `rawMode` afeta inline E blocks (intencional).
- **Risco cache `<canvas>`:** novo `resultCache` guarda referência live (não clona); widget destruído pelo CM mas elemento sobrevive — re-entrada reinsere o mesmo node, estado preservado.
- **Fase 9 subdividida** por coupling sutil com `wikilink-navigation.ts`.
