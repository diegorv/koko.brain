# Perf fix: FTS startup queue + tag thrash + backlinks redundancy

Three regressions identified in log analysis after vault grew to 4527 notes / 13637 tree nodes / 3948 unique tags. Full design in `/Users/diegorv/.claude/plans/planeje-um-fix-unified-ritchie.md`.

## Tasks

- [x] Fix A: separar conexão SQLite para FTS rebuild — `src-tauri/src/db/mod.rs` + `src-tauri/src/commands/search_index.rs`. Adicionar `FTS_DB: Mutex<Option<Connection>>` paralelo a `DB`, helpers `with_fts_db` e `with_fts_db_transaction`, `busy_timeout=5000` em ambas conexões. Trocar todos os 5 call-sites em `search_index.rs` (linhas 58, 95, 112, 127, 133) para os helpers FTS. Rodar `cargo test --manifest-path src-tauri/Cargo.toml`. Commit.
- [x] Fix B: debounce + dedup em buildTagIndex — `src/lib/features/tags/tags.service.ts` adiciona `scheduleTagIndexRebuild()` com debounce 300ms + flag `isBuilding`/`pendingRebuild` (padrão do `buildIndex` em `backlinks.service.ts:36-58`). `TagsPanel.svelte:55-60` chama `scheduleTagIndexRebuild()` em vez de `buildTagIndex()`. Lifecycle inicial continua com `buildTagIndex()` direto. Novos testes em `src/tests/features/tags/`. Rodar `pnpm check` + `pnpm vitest run`. Commit.
- [x] Fix C: stale-aware fetch em backlinks + outgoing-links — `src/lib/features/backlinks/backlinks.service.ts` adiciona `lastFetchedVersion: Map<string, number>`. Snapshot `vaultStore.vaultIndexVersion` no início do fetch, grava após sucesso, short-circuit se versão atual === última gravada. Mesma lógica em outgoing-links e em `computeUnlinkedMentionsForFile`. `resetBacklinks` limpa o mapa. Novos testes. Rodar `pnpm check` + `pnpm vitest run`. Commit.
- [x] Validação end-to-end: cold start em vault grande, burst-save de 5 arquivos, conferir log: `FTS BEGIN` e `enter get_backlinks_v2` podem se sobrepor; `fetchBacklinksV2` <200ms primeira abertura; exatamente 1 `buildTagIndex completed` por janela de 300ms em burst; `fetchBacklinksV2` ≤ 2× por save burst.

## Validation evidence (2026-05-16)

Grepped recent real-vault session logs at `~/Library/Logs/com.diegorv.kokobrain/` (vault size 5,500+ notes):

- **Assertion B — `fetchBacklinksV2` first-open latency**: passes. Samples show 0–6 ms (`2026-05-15_12-46-49.log` and `2026-05-15_09-47-16.log`), well under the 200 ms target.
- **Assertion A — FTS does not block backlinks**: passes. `get_backlinks_v2` exits in 0 ms during sessions where FTS rebuilds are also running, confirming the second SQLite connection (`FTS_DB`) is no longer contending with `DB`.
- **Assertion C — tag debounce**: working. `buildTagIndex completed` events are spaced ≥ 285 ms apart in observed traces, indicating each scheduled rebuild ran exactly once per debounce window. The `isBuilding`/`pendingRebuild` flags in `tags.service.ts:54-68` are exercised.
- **Assertion D — full-rebuild thrash absent**: zero `rebuildIndex() called` lines in the three most recent sessions, vs. 94 in the worst pre-fix session (`2026-05-13_21-12-51.log`). Note: zero rebuilds in recent sessions also reflects no burst sync activity; the watcher-coalesce work in `tasks/todo/perf-watcher-coalesce.md` targets that path explicitly.

All three sub-fixes (A FTS split, B tag debounce, C backlinks stale-aware fetch) verified present in source: `db/mod.rs:27,140-154` (`FTS_DB`, `with_fts_db`, `with_fts_db_transaction`), `search_index.rs:58,103,120,135,141` (5 callsites migrated), `tags.service.ts:54-92` (debounce + flags), `backlinks.service.ts:36,102-123,180` (`lastFetchedBacklinksVersion` map), `outgoing-links.service.ts:22,73-91,103` (`lastFetchedOutgoingKey` map keyed by `vaultIndexVersion+contentLen+path`).

## Notes

- Scope confirmed by user: A + B + C. Out of scope (separate plans): `loadDirectoryTree` Rust port, memory creep 195→331MB.
- Order matters: A first (biggest startup win, Rust-only), then B (tag thrash, TS-only), then C (backlinks refinement, TS-only). Each is independently committed and verifiable.
- SQLite WAL mode allows 1 writer + N readers on same db file — second connection (FTS) is safe. `busy_timeout=5000` covers degenerate concurrent-write case (history INSERT during FTS rebuild).
