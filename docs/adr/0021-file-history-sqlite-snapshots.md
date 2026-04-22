---
type: ADR
id: "0021"
title: "File history as SQLite snapshots with SHA-256 deduplication (not git)"
status: active
date: 2026-04-22
---

## Context

Users lose work. They delete a paragraph by mistake, a sync conflict overwrites a note, auto-move shuffles a file into the wrong place. The app needs a per-file, per-time rollback mechanism with:

- Full content for every historical state, not just diffs (so restores are always possible even if earlier snapshots are corrupted).
- Automatic capture (no "remember to commit" burden on the user).
- Per-note navigation and preview (the UI should show "five minutes ago", "yesterday", "last week" without shelling out).
- Bounded storage growth — saving the same file unchanged 100 times should cost nothing.
- Independence from the user's own git workflow — users may or may not use git for their vault, and the app cannot depend on either state.

Git is the obvious comparison: distributed, well-understood, excellent at diff/log/blame. But coupling the app to git introduces a hard dependency (git binary, repo init, user.email config, `.git/` folder inside vaults that may already be gitignored or conflicting with the user's own repo). It also doesn't answer "show me this file's history" without shelling out to git and parsing output per navigation.

## Decision

**Snapshot every save into a SQLite `snapshots` table, deduplicate by SHA-256 hash against the most recent snapshot, and compute diffs on demand with the `similar` crate.** The history subsystem lives entirely in Rust and is decoupled from git.

### Data model (`src-tauri/src/db/schema.rs:9-21`)

```sql
CREATE TABLE snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path   TEXT NOT NULL,
    content     TEXT NOT NULL,   -- full file contents, not a diff
    hash        TEXT NOT NULL,   -- SHA-256 of content
    size        INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
);
CREATE INDEX idx_snapshots_path   ON snapshots(file_path, created_at DESC);
CREATE INDEX idx_snapshots_dedup  ON snapshots(file_path, hash);
```

### Commands (`src-tauri/src/commands/history.rs`)

- **`save_snapshot(file_path, content) → bool`** (`history.rs:37-57`). Hashes content with SHA-256, queries `find_latest_hash(file_path)`, and inserts a new row only if the hash differs. Returns `true` on insert, `false` on dedup.
- **`get_file_history(file_path) → Vec<SnapshotInfo>`** — lists all snapshots for a file, newest first.
- **`get_snapshot_content(snapshot_id) → String`** — fetches a specific snapshot's full text.
- **`compute_diff(old_content, new_content) → Vec<DiffLine>`** — pure computation via `TextDiff::from_lines` from the `similar` crate (`Cargo.toml:41`). No DB access.

### Storage scale

At ~10 KB average note size, dedup eliminates ~90% of redundant saves (save-without-change is the dominant case when users toggle tabs or trigger auto-saves). A user writing 50 new snapshot-worthy versions per day across 1 800 notes would accumulate ~500 MB/year of history. Bounded by user behavior, but not pruned by default; retention is a future feature.

## Alternatives considered

- **Git integration** (shell out to `git add` + `git commit` on save, or libgit2 via `git2` crate): leverages existing infrastructure, diff/log/blame are free. Costs: requires git in user PATH, introduces `.git/` or `.kokobrain/.git/` inside the vault with all its conflict potential, commit messages need a policy, and "show history" requires parsing `git log --follow --patch`. Users who version-control their vault themselves now have two git repos or one complicated one. Rejected — too much coupling for a background feature.
- **Unified diff storage** (store deltas instead of full content): smaller on disk, but reconstructing a snapshot requires walking from a checkpoint and applying diffs in order; any corrupted intermediate blocks every later snapshot. We already dedupe by hash, which gets most of the benefit with none of the fragility.
- **Filesystem-based snapshots** (`.kokobrain/history/<file>/<timestamp>.md`): human-readable outside the app, but explodes the file count (1 000 snapshots × 1 800 notes = 1.8 M small files), thrashes the filesystem, and makes the file watcher's life harder. Rejected.
- **Background compression (zstd on content)**: plausible optimization; deferred until storage growth is a real user complaint. SQLite stores TEXT contiguously and the VACUUM/WAL cycle already compresses somewhat.
- **User-visible UI for "commit message" per snapshot**: overkill; users want time-based navigation ("15 minutes ago"), not curated checkpoints. The timestamp is the identifier.

## Consequences

- Every successful save triggers `save_snapshot`. Cost is one SHA-256 (fast, content-bound — ~1 ms for a 10 KB note) plus a single `SELECT hash` + possible `INSERT`. The insert is bypassed on no-op saves (dedup path).
- Diff computation is on-demand and pure (`compute_diff`); the UI requests it when the user opens the history panel. No eager diffing at save time.
- Snapshots survive file moves/renames **only if the caller saves a new snapshot under the new path**. The current implementation keys on `file_path`; a rename leaves the old file's history stranded under the old path. This is a known limitation; a future ADR may introduce a rename-aware history (e.g., `file_id` column populated from inode or a per-vault stable ID).
- There is no per-file retention policy today. A prolific user will see their `kokobrain.db` grow linearly over months. Acceptable at the current stage; retention (e.g., "keep every save for 30 days, then one per day, then one per week") is a follow-up.
- Because history is in the same SQLite DB as FTS5 + semantic (ADR-0011), losing the DB loses all history. The DB lives inside `.kokobrain/` (ADR-0019) — users who exclude `.kokobrain/` from backup lose history with it. Document prominently.
- Re-evaluation triggers: users regularly hit rename history loss (would promote the `file_id` rename tracking); storage growth becomes a support issue (would ship retention); a credible git-integration story appears (compatibility layer that writes both); third-party tools want to read the history (would expose an export).
