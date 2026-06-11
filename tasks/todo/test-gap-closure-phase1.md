# Test Gap Closure - Phase 1

> **Para workers agênticos:** lotes F1-F4/R1-R4 podem ser escritos por subagentes paralelos (arquivos de teste novos/disjuntos); tarefas B1-B11 são sequenciais, TDD, um commit cada. Spec aprovado: `docs/superpowers/specs/2026-06-11-test-gap-closure-phase1-design.md`. Origem: auditoria `.scratch/audit-2026-06-10/findings.md`.

**Goal:** Fechar os gaps de teste de alto valor da auditoria de 2026-06-10 (services, stores, logic, Rust) e corrigir, com teste de regressão junto, os defeitos confirmados que impedem um teste correto de passar.

**Arquitetura:** 8 lotes paralelos só-teste (sem tocar em src), revisão + suíte completa + 1 commit por lote; depois 11 tarefas bug+teste sequenciais (red-green, 1 commit cada). Achados de perf/arquitetura ficam FORA (já cobertos por `tasks/todo/performance-architecture-refactor.md` e `tasks/todo/perf-persistent-vault-index.md`).

**Stack:** vitest + jsdom (frontend), cargo test + tempfile (Rust). Regras: `docs/TESTING.md` (nunca mockar stores/.logic.ts; happy + vazio/nulo + erro; todo getter testado; assert em estado real). Commits: `docs/COMMITS.md`.

## Regras de execução

1. Cada agente de lote DEVE primeiro verificar se o gap ainda existe (ler o arquivo de teste atual); se já coberto, pular e anotar. A varredura tem descrições contraditórias em alguns itens.
2. Lotes não tocam em `src/lib/` nem `src-tauri/src/` — só criam/estendem testes. Se um teste correto falhar revelando bug não listado, NÃO "ajustar o teste para passar": reportar e deixar de fora do commit.
3. Exemplares a espelhar: services → `src/tests/lib/features/backlinks/backlinks.service.test.ts`; stores → `src/tests/lib/core/editor/editor.store.test.ts` (getters); logic → qualquer `.logic.test.ts` vizinho; Rust → `src-tauri/tests/vault_index_test.rs` e `src-tauri/tests/commands/vault_test.rs`.
4. Caminhos semantic que exigem modelo ONNX real: testar até a fronteira (chunker, filtering, repos com SQLite em memória/tempdir); documentar exclusão no próprio arquivo de teste.
5. Antes de cada commit: `git diff --cached --stat` e suíte relevante verde (regra 6 do CLAUDE.md).

## Tasks — Lotes paralelos (só testes)

- [x] **Lote F1 - core (settings, layout, wikilink logic, trash, vault, zoom, editor store)**
  - `src/lib/core/editor/editor.store.svelte.ts` — Getter `activeTab` edge case when activeIndex is out of bounds (should return null, covered via tests but no specific edge case test). Store reset behavior during vault switch not explicitly tested.
  - `src/lib/core/layout/tauri-listeners.service.ts` — registerVaultIndexUpdatedListener fan-out (full entries fetch + refreshTypeDefinitions + conditional loadDirectoryTree) has no test for event bursts or for the cancelled-flag race between unlisten and the in-flight invok
  - `src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts` — matchFilesForWikilink has test coverage (line 110-151 in completion.logic.test.ts), but error handling for null files array not tested. Empty/null edge cases partially covered.
  - `src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts` — No test file for WIKILINK_DECORATION_RE, findWikilinkRanges, findWikilinkInfoAtPosition functions | findWikilinkRanges and findWikilinkInfoAtPosition are fully tested (decoration.logic.test.ts lines 7-204). No gaps detec
  - `src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts` — HEADING_RE, BLOCK_ID_RE, findHeadingPosition, findBlockIdPosition not tested | findHeadingPosition and findBlockIdPosition have comprehensive tests (navigation.logic.test.ts lines 7-118). CRLF line ending support tested 
  - `src/lib/core/settings/settings-panel.store.svelte.ts` — Test file exists (settings-panel.store.test.ts), getters and setters should be fully covered.
  - `src/lib/core/settings/settings.logic.ts` — Test file exists (settings.logic.test.ts) with comprehensive coverage of clamp functions, isValidFolderName, and SETTINGS_SECTION_GROUPS.
  - `src/lib/core/settings/settings.service.ts` — Test file exists but should verify error recovery paths (loadSettings fallback to defaults, saveSettings error handling), directory creation, and applyHeadingTypography. | applyHeadingTypography() exported function is ca
  - `src/lib/core/settings/update-check.service.ts` — maybeAutoCheckForUpdates() — the main exported async function that invokes Tauri commands, updates store, saves settings, and shows toasts. Only shouldAutoCheckNow is tested.
  - `src/lib/core/trash/trash.store.svelte.ts` — Complete coverage exists. All getters (items, loading, count, isEmpty) and all methods (setItems, setLoading, addItem, removeItem, clear) have test cases.
  - `src/lib/core/vault/vault.service.ts` — Complete coverage exists. openVaultDialog, openRecentVault, and closeVault all have corresponding test cases.
  - `src/lib/core/zoom/zoom.service.ts` — Complete coverage exists. zoomIn, zoomOut, and resetZoom all have test cases covering boundaries and state transitions.
  - `src/tests/lib/core/settings/update-check.service.test.ts` — maybeAutoCheckForUpdates não testado (função async pública)
  - Verificar: `pnpm check && pnpm vitest run` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [x] **Lote F2 - features A (collection, properties logic/services, search, tags, type-definitions)**
  - `src/lib/features/collection/collection.logic.ts` — Tests exist but do not verify all exported functions. Functions like `buildPropertyIndex`, `formatCellValue`, `getPropertyValue`, `evaluateFilter`, and `executeQuery` are tested, but check that all getters/computed prope
  - `src/lib/features/collection/collection.store.svelte.ts` — Store has getters for propertyIndex and isIndexReady, but no test verifies these getters are reactive or recompute correctly.
  - `src/lib/features/collection/expression/methods.logic.ts` — Test file exists (methods.test.ts) but need to verify all exported methods are tested. File is 300+ lines with many method registries for string, number, date, array operations that should each have tests.
  - `src/lib/features/properties/lifecycle-filter.service.ts` — No test file. Exports refreshArchivedPaths which calls Tauri invoke and updates store. | No test file exists. Should test refreshArchivedPaths with both provided entries and Tauri IPC path, plus error handling. | No test
  - `src/lib/features/properties/lifecycle.service.ts` — No test file. Exports setOrganized, setArchived, setFavorite which call syncExternalContentToEditor. | No test file exists. Should test setOrganized, setArchived, setFavorite functions with store/editor interactions. | N
  - `src/lib/features/properties/properties.logic.ts` — No test coverage for yaml-quoting.logic integration. The serializePropertyValue and serializeProperties functions rely on yaml.Document but don't test edge cases like backslash+quote sequences in values.
  - `src/lib/features/search/search.service.ts` — No tests for error cases where vaultPath is null/empty and affects FTS tag filtering (line 220 path concatenation bug).
  - `src/lib/features/tags/tag-colors.logic.ts` — getContrastTextColor() is not tested. Need tests covering light background (brightness > 150 -> dark text), dark background (brightness <= 150 -> white text), and edge cases (pure black, pure white).
  - `src/lib/features/tags/tags.service.ts` — Functions openTagsTab(), closeTagsTab(), and toggleTagsTab() are not tested. These functions modify editorStore.tabs and manage the TAGS_VIRTUAL_PATH tab.
  - `src/lib/features/type-definitions/type-definitions.service.ts` — refreshTypeDefinitions (exported line 21) is not tested; no test file imports or covers this function
  - `src/lib/features/type-definitions/type-definitions.store.svelte.ts` — Store getter getTypeMetadata (lines 17-19) is tested on line 43-53 of the test file. No gaps detected. | Store getter sortedTypes (lines 22-24) is tested on lines 55-75 of the test file. No gaps detected.
  - `src/tests/lib/features/search/search.service.test.ts` — No test feeds a 'downloading-reranker' phase through the semantic-index-progress listener; the throttle/phase-transition logic is only exercised with the three phases the TS union declares.
  - Verificar: `pnpm check && pnpm vitest run` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote F3 - features B (auto-move, backlinks, bookmarks, canvas, file-history, file-icons, quick-switcher, todoist)**
  - `src/lib/features/auto-move/auto-move.service.ts` — mkdir failure case not tested; implementation has try/catch but saveAutoMoveConfig test doesn't verify mkdir rejection handling
  - `src/lib/features/backlinks/backlinks.logic.ts` — parseWikilinks: missing test cases for wikilinks with spaces around pipe/hash (e.g. '[[note | alias ]]', '[[note# heading ]]')
  - `src/lib/features/bookmarks/bookmarks.service.ts` — mkdir failure case not tested in loadBookmarks/saveBookmarks; toggleBookmarkForPath and updateBookmarkPathsAfterMove error paths (silent swallow) not tested
  - `src/lib/features/canvas/canvas-image.logic.ts` — resolveImageSrc() - async function handling external URLs and local Tauri file reads with Blob creation, not tested
  - `src/lib/features/file-history/file-history.service.ts` — restoreSnapshot: no test for the case where editorStore.editorView becomes null between check and dispatch
  - `src/lib/features/file-icons/file-icons.store.svelte.ts` — packVersion getter/bump are tested indirectly in service tests, but no dedicated store test verifies packVersion state and reactivity.
  - `src/lib/features/quick-switcher/quick-switcher.service.ts` — No test file. Exports resetQuickSwitcher (minimal function). | No test file. resetQuickSwitcher() is only tested indirectly via store tests; a dedicated service test is missing. | No test file; mocked out in app-lifecycl
  - `src/lib/features/tasks/todoist.service.ts` — loadProjects: Missing tests for success path, error handling, cache behavior (forceRefresh flag), loading state transitions | loadSections: Missing tests for success path, error handling, loading state transitions, proje
  - Verificar: `pnpm check && pnpm vitest run` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote F4 - plugins (calendar, kanban, one-on-one, quick-capture)**
  - `src/lib/plugins/calendar/calendar.service.ts` — openCalendarFile(filePath: string) is exported but not tested. Should verify it correctly delegates to openFileInEditor and handles errors appropriately.
  - `src/lib/plugins/kanban/kanban.logic.ts` — No tests for negative edge cases in moveItem: toIndex clamping near 0 (e.g., toIndex=-1 should clamp to 0); interaction with empty source lane; or target lane not found | No tests for parseCardSegments with consecutive m
  - `src/lib/plugins/kanban/kanban.service.ts` — loadLinkedFileContent race condition not tested: no test for out-of-order Promise resolution where rapid card edits cause stale data to overwrite fresh data. | Function `createKanbanFile` is tested but does not verify th
  - `src/lib/plugins/kanban/kanban.store.svelte.ts` — No tests for store getters (lanes, archive, settings) to verify they return the same reference across consecutive calls vs. creating new references each time
  - `src/lib/plugins/one-on-one/one-on-one.logic.ts` — No tests for buildOneOnOneVariables when periodicNotesSettings has missing or empty daily.format field; edge case where buildWikilinkPath could fail silently
  - `src/lib/plugins/one-on-one/one-on-one.service.ts` — No tests for createOneOnOneNote error propagation when openOrCreateNote rejects; line 214 tests rejection but does not verify the exact error message or stack is preserved | No tests for loadPeople behavior when readDir 
  - `src/lib/plugins/quick-capture/quick-capture.service.ts` — registerQuickCaptureListener function is not tested; no test coverage for event listener registration, queue serialization, or cleanup behavior
  - Verificar: `pnpm check && pnpm vitest run` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote R1 - rust/commands (db, debug, fonts, search, semantic, update_channel, vault *_v2, lib.rs)**
  - `src-tauri/src/commands/db.rs` — Minimal coverage. Only 584B file but `open_vault_db` command is tested in vault_test.rs. No dedicated db_test coverage for the thin wrapper itself. | close_vault_db has 0 test references (open_vault_db is integration-tes
  - `src-tauri/src/commands/debug.rs` — No test file found. This command module has 1.3K - likely small but should have integration tests for any debug/tracing commands
  - `src-tauri/src/commands/fonts.rs` — No test file found. Font handling command with 3.0K of code - should verify font discovery and path handling
  - `src-tauri/src/commands/search.rs` — search_vault (lines 16-29): Full-text search command with directory recursion, symlink handling, and file size limits. Has E2E tests but no isolated unit tests in test suite.
  - `src-tauri/src/commands/semantic.rs` — update_semantic_file (lines 910-1038): Complex async fn with mtime tracking, hash dedup, chunk embedding, and transaction management. Not covered by unit tests. | search_semantic (lines 619-729): Embedding-based search w
  - `src-tauri/src/commands/update_channel.rs` — check_for_update_on_channel (lines 86-127): Async command with Tauri updater integration, version comparator override. Cannot be unit tested (requires Tauri runtime), but parameter validation could have tests. | No test 
  - `src-tauri/src/commands/vault.rs` — No tests for TOCTOU race in create_note; concurrent access with same path. No tests for non-atomic crash safety of file writes at lines 344, 682, 897. No tests for propagate_type_rename error recovery when partial file r
  - `src-tauri/src/lib.rs` — App wiring / Tauri command registration, no tests. Low value (verified only at compile time).
  - `src-tauri/tests/commands/vault_test.rs` — Dead-but-registered commands (get_notes_with_tag_v2, get_tasks_in_path_v2, query_notes_by_property, get_property_values, get_note_properties, get_search_index_stats) have Rust-side tests but no TS consumer or contract te
  - Verificar: `cargo test --manifest-path src-tauri/Cargo.toml` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote R2 - rust db + search (fts_repo, db/mod, text_search)**
  - `src-tauri/src/db/fts_repo.rs` — No direct tests for insert_entry/delete_entry/search_match/expand_vocab_terms; only indirect coverage via search_index::search_fts calls in search_fts_test.rs.
  - `src-tauri/src/db/mod.rs` — is_open(): no test for poisoned lock behavior. No test distinguishing 'database closed' vs 'lock poisoned' case.
  - `src-tauri/src/search/text_search.rs` — No integration tests in src-tauri/tests/ for full text search across vault files; unit tests exist in-file but integration coverage is missing
  - Verificar: `cargo test --manifest-path src-tauri/Cargo.toml` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote R3 - rust semantic (chunker, model, reranker)**
  - `src-tauri/src/semantic/chunker.rs` — No explicit tests for unwrap() safety on line 292 merge_short_sections; guard condition !merged.is_empty() prevents panic but no dedicated test
  - `src-tauri/src/semantic/model.rs` — No tests for ManagedModel with zero downloads; division by zero on lines 124, 130 not tested
  - `src-tauri/src/semantic/reranker.rs` — No inline tests and no integration test references for load/rerank/with_batch_size. Only semantic/ module with zero coverage.
  - Verificar: `cargo test --manifest-path src-tauri/Cargo.toml` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).
- [ ] **Lote R4 - rust vault/utils/quick_capture (watcher, aliases, task, fs, logger, main)**
  - `src-tauri/src/main.rs` — Binary entry point, no tests. Low value.
  - `src-tauri/src/quick_capture/commands.rs` — No integration tests in src-tauri/tests/ covering the full capture_clipboard_now or submit_composer_capture Tauri command paths with actual app state
  - `src-tauri/src/utils/fs.rs` — `validate_vault_path()` function has no test coverage. Missing: error cases (non-existent path, non-directory path, permission denied) | `collect_markdown_paths_with_metadata()` function has no test coverage. The `_with_
  - `src-tauri/src/utils/logger.rs` — `debug_log()` function has no true functional test. Test `debug_log_enabled_without_app_handle_does_not_panic` only verifies no panic when APP_HANDLE is unset; doesn't verify stderr output or event emission
  - `src-tauri/src/vault/aliases.rs` — No test for edge case: empty key or numeric-only key passed to `canonicalize_key()`. Tests cover all known aliases but not unknown keys beyond the "pass-through" category
  - `src-tauri/src/vault/task.rs` — `TaskPriority` impl and `Task` struct fields (checked, status, indent, metadata) have no targeted tests for edge cases like indent=0, very large line_number, or empty metadata
  - `src-tauri/src/vault/watcher.rs` — `start_vault_watcher()` Tauri command has no test (vault_watcher_test.rs only tests `start_watcher_inner`). Missing: app handle integration, race conditions between start/stop, multiple start calls on same state
  - `src-tauri/tests/search_fts_test.rs` — Missing test for expand_fuzzy_terms with empty input or very long terms that exceed reasonable distance thresholds
  - `src-tauri/tests/vault_index_test.rs` — lookup_notes_with_tag: test verifies both '#work' and 'work' return length 1 but doesn't check if they return identical entries; should add assertion comparing result[0].path or result[0].title
  - `src-tauri/tests/vault_watcher_test.rs` — No tests for watcher behavior when system is under load or when recv_emit times out; current tests all expect successful emit within 3s timeout
  - Verificar: `cargo test --manifest-path src-tauri/Cargo.toml` verde + revisão do diff. Commit único do lote (formato COMMITS.md, scope `tests`).

## Tasks — Bug + teste de regressão (sequencial, TDD, 1 commit cada)

- [ ] **B1 properties.service: canonicalizar chaves em upsert/updateProperty** — `src/lib/features/properties/properties.service.ts:53-77`, `properties.logic.ts:343`. Hazard latente (callers atuais passam chave exata; commit 4a0831b endureceu rename/addNew mas pulou estes dois). RED: em `src/tests/lib/features/properties/properties.service.test.ts`, casos alias-vs-canônico (ex. upsert `color` quando store tem `_color`) espelhando os testes de renameProperty (155-168). GREEN: canonicalizar via mesmo helper de aliases antes do match (find e updatePropertyValue).
- [ ] **B2 editor.service: resetEditor cancela os DOIS timers de auto-save** — `src/lib/core/editor/editor.service.ts:398-402`. Contrato do doc-comment (:393) violado: só `debouncedSave` é cancelado; `debouncedSaveFrontmatter` (:177) fica armado (mitigado hoje pelo único caller, teardownVault, que salva antes). RED: teste que arma o timer de frontmatter, chama resetEditor, avança fake timers e asserta que NENHUM save dispara. GREEN: cancelar ambos.
- [ ] **B3 app-lifecycle: teardownVault invoca shutdown_semantic** — `src/lib/core/app-lifecycle/app-lifecycle.service.ts:350-435` (achado HIGH). `SEARCH_CACHE` (semantic.rs:55) é estático de processo consultado ANTES do DB; trocar para vault já indexado serve chunks do vault ANTERIOR. RED: em `app-lifecycle.service.test.ts`, asserta que teardown chama `shutdown_semantic` (mock Tauri) na ordem correta (após saves, antes do reset de stores). GREEN: adicionar invoke com try/catch + log (erro não pode abortar teardown). Inclui o gap pendente do arquivo de teste (race de troca rápida de vault com initVersion).
- [ ] **B4 type-sidebar.logic: remover cláusula morta em matchesSelection** — `src/lib/features/type-definitions/type-sidebar.logic.ts:165` e cláusula idêntica em :191. `!entry.isA && entry.isA !== 'Type'`: segunda cláusula nunca altera o resultado (provado na auditoria; rastrear callers conforme regra do CLAUDE.md antes de remover). RED não se aplica (sem mudança de comportamento): adicionar testes que fixam o comportamento atual de matchesSelection/countSubFilters ANTES, remover a cláusula, testes continuam verdes.
- [ ] **B5 deep-link.service: serializar dispatch (TOCTOU append/prepend) + testes de registerDeepLinkListener** — `src/lib/features/deep-link/deep-link.service.ts:211-244, 40-56`. Dois deep links concorrentes no mesmo arquivo perdem conteúdo (read-modify-write sem serialização; o próprio comentário :335-338 documenta a premissa). RED: teste com dois handleDeepLinkUrl concorrentes de append no mesmo path (mock fs com delay) assertando que os DOIS conteúdos sobrevivem. GREEN: fila de dispatch (promise chain) por vault ou global. Cobrir também registerDeepLinkListener (gap sem teste).
- [ ] **B6 watcher-handler: fallback de path relativo não pode vazar path absoluto** — `src/lib/core/app-lifecycle/watcher-handler.service.ts:113-115, 131, 138, 155`. Path canonicalizado (symlink) que não compartilha prefixo com vaultPath cai no fallback e entra absoluto nas chaves vault-relative do FTS (linhas duplas em search.service.ts:220). RED: teste com vaultPath simbólico vs path canonicalizado assertando a chave relativa correta (ou skip explícito + log). GREEN: resolver via canonicalize do vaultPath uma vez no registro do handler, ou descartar com warning paths sem prefixo. Inclui o gap pendente do arquivo de teste (vault path nulo; >threshold deletes).
- [ ] **B7 semantic_repo: parar de dropar erros silenciosamente** — `src-tauri/src/db/semantic_repo.rs:142, 233-237` (e `get_stored_mtimes` :56, mesmo padrão). Observabilidade: irmãos no mesmo arquivo logam linhas corrompidas (171-177, 191-197, 301-307); estes usam `.filter_map(|r| r.ok())` mudos. RED: teste inserindo linha com tipo corrompido e assertando o log/contagem de skip (padrão dos testes-irmãos). GREEN: logar como os irmãos.
- [ ] **B8 vault/index.rs: remove_entry adiciona path promovido ao affected set** — `src-tauri/src/vault/index.rs:1046-1091`. Bloco de promoção muta `backlinks[surviving_path]` (1074-1082) sem inserir em `affected` (contrato documentado em :32-36). RED: teste em `src-tauri/tests/vault_index_test.rs` que remove nota com twin promovível e asserta surviving_path ∈ affected. GREEN: insert no bloco de promoção.
- [ ] **B9 embedder: mean pooling não pode panicar com saída 2D** — `src-tauri/src/semantic/embedder.rs:198-205, 246-248, 276-278`. Fallback para não-3D faz validate_dimensions sempre passar e mean_pool indexa assumindo 3D → panic (vira JoinError dentro de spawn_blocking; sem crash, mas busca quebra silenciosamente). RED: teste unitário de mean_pool_f32 com tensor 2D [batch, hidden] (puro ndarray, sem modelo) assertando Err em vez de panic. GREEN: validar ndim==3 de verdade e retornar Err nos demais casos.
- [ ] **B10 commands/vault.rs: writes atômicos (temp+rename)** — `src-tauri/src/commands/vault.rs:344 (propagate_type_rename_inner), 682 (toggle_task_status_inner), 897 (create_note)`. `std::fs::write` trunca in-place; crash entre truncate e write deixa nota vazia/parcial (sem snapshot de file-history para arquivos não editados na sessão). RED: teste de helper `write_atomic` (escreve temp no mesmo dir + rename) + testes existentes continuam verdes. GREEN: helper em utils/fs.rs aplicado aos 3 sites.
- [ ] **B11 commands/semantic.rs: rejeitar embedding bytes malformados** — `src-tauri/src/commands/semantic.rs:94-98`. `chunks_exact(4)` dropa resto silenciosamente; o próprio teste de auditoria do repo (semantic_repo.rs:675-714) documenta como finding #12 conhecido. RED: ativar/estender esse teste assertando skip-com-log (len % 4 != 0 ou len/4 != dim esperado → ignora chunk e loga). GREEN: validação no deserialize.

## Tasks — Encerramento

- [ ] Atualizar `.scratch/audit-2026-06-10/findings.md` marcando os achados resolvidos por B1-B11 (nota "fixed em <commit>")
- [ ] Mover este plano para `tasks/done/` com nota de resultado (arquivos cobertos, exclusões ONNX documentadas)

## Notes

- Adiados conscientemente (decisão de design pendente, ficam no backlog da auditoria): TOCTOU de toggle_task_status e create_note (estratégia de locking), saveDirtyTabs retry ilimitado (questão de comportamento pretendido), superfície IPC morta em lib.rs (questão de limpeza), perf/arquitetura (planos existentes).
- Fase 2 (extensões CodeMirror, 126 gaps) e Fase 3 (componentes Svelte, 168 gaps + decisão de infra) terão planos próprios com gate do usuário.
