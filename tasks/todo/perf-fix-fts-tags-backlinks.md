# Perf fix: FTS startup queue + tag thrash + backlinks redundancy

Three regressions identified in log analysis after vault grew to 4527 notes / 13637 tree nodes / 3948 unique tags. Full design in `/Users/diegorv/.claude/plans/planeje-um-fix-unified-ritchie.md`.

## Tasks

- [x] Fix A: separar conexão SQLite para FTS rebuild — `src-tauri/src/db/mod.rs` + `src-tauri/src/commands/search_index.rs`. Adicionar `FTS_DB: Mutex<Option<Connection>>` paralelo a `DB`, helpers `with_fts_db` e `with_fts_db_transaction`, `busy_timeout=5000` em ambas conexões. Trocar todos os 5 call-sites em `search_index.rs` (linhas 58, 95, 112, 127, 133) para os helpers FTS. Rodar `cargo test --manifest-path src-tauri/Cargo.toml`. Commit.
- [x] Fix B: debounce + dedup em buildTagIndex — `src/lib/features/tags/tags.service.ts` adiciona `scheduleTagIndexRebuild()` com debounce 300ms + flag `isBuilding`/`pendingRebuild` (padrão do `buildIndex` em `backlinks.service.ts:36-58`). `TagsPanel.svelte:55-60` chama `scheduleTagIndexRebuild()` em vez de `buildTagIndex()`. Lifecycle inicial continua com `buildTagIndex()` direto. Novos testes em `src/tests/features/tags/`. Rodar `pnpm check` + `pnpm vitest run`. Commit.
- [ ] Fix C: stale-aware fetch em backlinks + outgoing-links — `src/lib/features/backlinks/backlinks.service.ts` adiciona `lastFetchedVersion: Map<string, number>`. Snapshot `vaultStore.vaultIndexVersion` no início do fetch, grava após sucesso, short-circuit se versão atual === última gravada. Mesma lógica em outgoing-links e em `computeUnlinkedMentionsForFile`. `resetBacklinks` limpa o mapa. Novos testes. Rodar `pnpm check` + `pnpm vitest run`. Commit.
- [ ] Validação end-to-end: cold start em vault grande, burst-save de 5 arquivos, conferir log: `FTS BEGIN` e `enter get_backlinks_v2` podem se sobrepor; `fetchBacklinksV2` <200ms primeira abertura; exatamente 1 `buildTagIndex completed` por janela de 300ms em burst; `fetchBacklinksV2` ≤ 2× por save burst.

## Notes

- Scope confirmed by user: A + B + C. Out of scope (separate plans): `loadDirectoryTree` Rust port, memory creep 195→331MB.
- Order matters: A first (biggest startup win, Rust-only), then B (tag thrash, TS-only), then C (backlinks refinement, TS-only). Each is independently committed and verifiable.
- SQLite WAL mode allows 1 writer + N readers on same db file — second connection (FTS) is safe. `busy_timeout=5000` covers degenerate concurrent-write case (history INSERT during FTS rebuild).
