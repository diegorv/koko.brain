---
type: ADR
id: "0011"
title: "SQLite with FTS5 and WAL mode for local search, history, and semantic storage"
status: active
date: 2026-04-22
---

## Context

Three subsystems need durable local storage:

- **Full-text search** — instant queries over note bodies with ranking, snippets, and fuzzy term expansion.
- **File history** — snapshots of every file on save, deduplicated by content hash, queryable by path + time for diff/restore.
- **Semantic search** — vector embeddings per chunk, cached by content hash to avoid re-embedding unchanged content (see ADR-0012).

All three need to be embedded (no separate server), fast on local SSDs, and survive crashes. They share the same process and vault; keeping them in one database keeps the schema together and reduces FD pressure.

Early iterations used in-memory data structures for history and search. Both lost state on crash, neither scaled past a few thousand files, and snippets/ranking had to be implemented by hand.

## Decision

**Use SQLite via `rusqlite` (bundled, no system dependency), with FTS5 for full-text search, BM25 ranking, content-hash deduplication in history, and WAL mode for concurrent reads.** The database lives in the vault under `.kokobrain/` (path resolution in `src-tauri/src/db/mod.rs`).

Schema (`src-tauri/src/db/schema.rs:6-55`):

- `snapshots(id, file_path, content, hash, size, created_at)` with indexes on `(file_path, created_at DESC)` and `(file_path, hash)` — the latter enables insert-only-if-changed dedup.
- `notes_fts` FTS5 virtual table with columns `path, title, content, headings, tags` — content-storing (not external-content) to support `snippet()`.
- `notes_fts_vocab` FTS5 vocab table for fuzzy term expansion.
- `chunks(key, source_path, content, heading, line_start, line_end, content_hash, embedding, embedded_at)` with indexes on `source_path` and `content_hash` — the second index is the fast lookup for the content-hash skip in ADR-0012.
- `semantic_meta(key, value)` — model version tracking so a model swap invalidates old embeddings.

WAL mode (`src-tauri/src/db/mod.rs:29-31`): every connection sets `journal_mode = WAL` via `pragma_update`. WAL enables concurrent reads during writes (important because the file watcher can be indexing while the UI queries for search), and survives crashes without corrupting the database.

Repository layers (`src-tauri/src/db/`):

- `fts_repo.rs` — FTS5 writes + search queries.
- `history_repo.rs` — snapshot insert + queries; writes use `INSERT ... WHERE NOT EXISTS (dedup by hash)`.
- `semantic_repo.rs` — chunk CRUD, content-hash lookup, model metadata.

Commands (`src-tauri/src/commands/`): `search.rs`, `search_index.rs`, `history.rs`, `semantic.rs`, `db.rs` wrap each repo behind `#[tauri::command]` handlers the TypeScript side calls via `invoke`.

## Alternatives considered

- **Custom file-based formats** (newline-delimited JSON snapshots, a hand-rolled inverted index): maximum control, significant implementation cost for ranking/snippets/vocab. Rejected — FTS5 ships all of this.
- **LMDB / RocksDB**: fast KV but no SQL + FTS. Would require building search on top. Rejected.
- **DuckDB**: columnar OLAP engine; overkill for the write-heavy snapshots path and no native FTS. Rejected.
- **Three separate databases (search, history, semantic)**: cleaner separation but three sets of migrations, three connection pools, and three files to track. Rejected — one DB is simpler and the tables don't interact with each other's row locks.
- **Skip WAL (default rollback journal)**: default is simpler but blocks readers during writes; with an active file watcher, UI search queries would stall while indexing. Rejected.
- **Store DB outside the vault**: breaks the "vault is portable — copy the folder, everything works" property. Rejected.

## Consequences

- The DB file lives inside the user's vault under `.kokobrain/`. Users who sync vaults across machines (iCloud, Syncthing, Git) should exclude this subfolder or accept that re-indexing is cheaper than syncing the DB. A single shared `.kokobrain/` across sync providers can produce WAL corruption; documented as a known caveat.
- Every table is tested — `src-tauri/tests/db_schema_test.rs`, `db_history_repo_test.rs`, `db_semantic_repo_test.rs`, `search_fts_test.rs`, `search_fts_logic_test.rs`. Rust changes that touch `src-tauri/src/db/` must pass `cargo test --manifest-path src-tauri/Cargo.toml`.
- FTS5 content-storing mode doubles storage cost vs external-content mode. For a typical note vault (<500 MB of markdown), the FTS5 index stays well under 2 GB.
- Schema migrations today are "add `IF NOT EXISTS` and hope" — must be replaced with a real migration ledger before the schema grows more complex.
- WAL requires two extra files next to the DB (`*-wal`, `*-shm`). Backup scripts that copy only the `.sqlite` file silently miss uncheckpointed writes; the app calls a checkpoint on clean shutdown.
- Re-evaluation triggers: vault-size growth pushes FTS5 storage past tolerable limits; a need for cross-vault search arises (would force DB out of vault); migration pain from `IF NOT EXISTS`-only schema becomes blocking.
