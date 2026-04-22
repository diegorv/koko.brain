---
type: ADR
id: "0019"
title: "App data lives inside the vault at .kokobrain/"
status: active
date: 2026-04-22
---

## Context

A note-taking app needs persistent artifacts that are not notes: the SQLite database (FTS5 index, file-history snapshots, semantic chunk embeddings), the ONNX model files (~542 MB for BGE-M3), and assorted cached metadata. Those artifacts have to live somewhere durable.

Two broad options exist:

- **OS-standard app data directory** (`~/Library/Application Support/com.diegorv.kokobrain/` on macOS, `~/.local/share/...` on Linux, `%APPDATA%\...` on Windows). Conventional; survives vault moves.
- **Inside the vault** under a dot-prefixed folder.

The product promise is "your vault is a folder of markdown files — copy it and everything works." That promise is meaningful only if the vault carries its own context. An index built against a specific vault is useless in a system-level directory when the vault moves to a different machine — rebuild takes minutes, costs 542 MB of model re-download, and loses the file-history snapshots entirely.

The cost is conflict with sync engines: iCloud, Syncthing, Dropbox, and Git all replicate folder contents verbatim. A 550 MB model file or a WAL-backed SQLite database inside a synced folder creates either huge sync payloads, frequent merge conflicts, or outright corruption.

## Decision

**Store all app-owned per-vault data inside the vault at `.kokobrain/`**, with per-vault scope, and document the sync conflict explicitly. The dot prefix ensures file watchers and `scan_vault` ignore the directory.

Current layout:

```
<vault>/
  .kokobrain/
    kokobrain.db            # SQLite DB (FTS5 + history + semantic) — see ADR-0011
    kokobrain.db-wal        # WAL journal
    kokobrain.db-shm        # shared-memory file
    models/
      bge-m3/
        model.onnx          # ~542 MB ONNX model (see ADR-0012)
        tokenizer.json
```

Anchors in code:

- `src-tauri/src/db/mod.rs:18-23` — `let db_path = vault_path.join(".kokobrain").join("kokobrain.db");` followed by `create_dir_all(".kokobrain/")`.
- `src-tauri/src/semantic/model.rs:32-38` — models directory resolved as `{vault_path}/.kokobrain/models/{MODEL_NAME}/`.
- `src-tauri/src/commands/vault.rs:29,53-55` — `scan_vault` skips dot-prefixed entries, so the `.kokobrain/` folder never appears in the frontend's file tree.
- `src/lib/core/filesystem/fs.watcher.ts:22-33` — the watcher silently drops events from any dot-prefixed directory.

## Alternatives considered

- **OS-standard app data directory** (per `appDataDir()`/`appLocalDataDir()`): survives vault moves better in theory, but means "copy the folder" no longer brings the indexes with it. The user sees a fresh rebuild on every new machine. Rejected — portability is a stronger requirement than sync-safety for the target user.
- **Split: DB inside, large binaries outside**: the model file is the main sync pain; moving only the model to `appLocalDataDir()` keeps the DB portable. Considered; the model is still vault-specific because embeddings are keyed to this vault's chunk hashes, and split state gets confusing fast. Kept everything in one place for simplicity; re-evaluate if sync complaints become common.
- **Encrypt / compress `.kokobrain/`**: doesn't solve the sync-conflict problem; just makes debugging harder.
- **Make the location configurable per-vault**: adds a settings surface and a "where's my data" support question for every user. Rejected — one rule, one place.
- **Use a single global DB keyed by vault path**: loses portability even more, and a single global DB corruption knocks out every vault.

## Consequences

- The "copy the folder" experience is real: a vault dropped onto a new machine opens instantly with full FTS5 search, file history, and semantic search (once the model downloads, if missing — see ADR-0012).
- Sync engines will happily replicate the 550 MB model across machines. Users should exclude `.kokobrain/` from cloud sync. This is documented in README; a future ADR may formalize a "vault sync hygiene" guide or a config helper that writes `.gitignore` / `.syncignore` entries on first open.
- Sharing a single `.kokobrain/` across simultaneously-running instances (e.g., two machines with iCloud replicating WAL files mid-write) **will corrupt the database.** The app does not coordinate cross-machine writes.
- Any Rust command that walks the vault must respect the hidden-dir convention or use an explicit path to the model/DB. `scan_vault`, `read_files_batch`, the file watcher, and the markdown file collectors all do; new commands must too.
- The bundle-ID-based macOS Keychain service (see ADR-0013) lives in the OS keychain, not in `.kokobrain/` — keys must not be written to the vault because the vault is (often) synced.
- Re-evaluation triggers: enough users report sync conflicts or accidental 550 MB iCloud bills that portability is no longer the net win; a second app or extension needs the same data (would push toward a shared location); Tauri ships a per-vault app-data API that gives us portability without sync cost.
