---
type: ADR
id: "0018"
title: "Batch IPC: scan_vault and read_files_batch over per-file invokes"
status: active
date: 2026-04-22
---

## Context

Every IPC call across the Tauri bridge serializes arguments, crosses a process boundary, and deserializes the result. The fixed per-call overhead is small — single-digit milliseconds — but gets multiplied by the number of files in indexing and startup paths.

On a 1 870-note vault, the naive approach — "list files, then for each file, `invoke('read_file', …)`" — costs 1 870 × (IPC round-trip) + 1 870 × (serialize/deserialize a String) + 1 870 × (per-call overhead). Even at 3 ms per round-trip that's >5 s, all of it in a tight JS loop that cannot parallelize (the JS side is single-threaded and `Promise.all` over `invoke` still serializes through the bridge).

The initial vault scan, the backlinks index build, the semantic index build, and the FTS5 rebuild all need to pull many files at once. A per-file IPC model was never viable for those paths.

## Decision

**Expose batch IPC commands that move per-item work into Rust, where the filesystem is actually touched, and return an array of results in a single round-trip.** Two canonical batch commands carry the bulk of the workload:

### `scan_vault(path, sortBy) → Vec<FileNode>`

Single IPC call returns the **full recursive tree** with metadata (name, path, isDirectory, children, modifiedAt, createdAt). Implemented in `src-tauri/src/commands/vault.rs:31-42`.

Key properties:

- Recursive in Rust (`scan_dir` at `vault.rs:44-...`) with `MAX_DEPTH = 64` to prevent symlink loops.
- Uses `symlink_metadata` (`lstat`) for atomic symlink check + metadata read, closing the TOCTOU window between `is_symlink()` and `metadata()` — `vault.rs:61-63`.
- Drops dot-prefixed entries unconditionally (`vault.rs:53-55`) so `.kokobrain/`, `.git/`, etc. never cross the IPC bridge.
- Per-level sort: directories first, then by `sort_by` strategy (name, mtime, ctime).

### `read_files_batch(vaultPath, paths) → Vec<FileReadResult>`

Single IPC call reads N files. Implemented in `src-tauri/src/commands/files.rs:23-78`.

Key properties:

- Per-file `canonicalize` + `starts_with(vault_root)` check — rejects paths escaping the vault (see ADR-0020).
- **Per-file errors captured in the result**, not batch failures — a single bad path returns one `FileReadResult { content: None, error: Some(…) }` and the rest succeed (`files.rs:40-57`).
- Uses the canonical path (not the caller-provided path) for the actual `read_to_string`, which also prevents TOCTOU races between validation and open.

Similar batch patterns exist elsewhere: `search_semantic` returns all matches for a query; `build_semantic_index` walks the whole vault and embeds everything in one call; `save_snapshot` is per-file but called at a naturally bounded rate (once per save).

## Alternatives considered

- **Per-file `read_file(path) -> String`**: simplest API; prohibitive at scale (see Context). Rejected.
- **Stream results via Tauri events instead of Result**: good for progress UI but complicates the consumer (must match events to requests). We instead report progress via `appendLog`/`debug_log` and return the full result on completion. For operations that take >5 s (semantic index build), dedicated progress events are used.
- **A single generic `exec_command(name, args)`**: hides the contract in a string and loses type safety. Rejected — we want each batch command to be a typed, documented Tauri command.
- **Parallelize per-file reads on the Rust side with Rayon**: tried; filesystem I/O is mostly syscall-bound and the speedup was modest (<2×) on typical SSDs, while complexity increased. Current reads are sequential in `read_files_batch` (`files.rs:37`).
- **Keep the index fully in Rust and never transmit file contents to JS**: architecturally cleanest but requires re-implementing the entire indexing + wikilink resolution + tag extraction + property extraction stack in Rust. Accepted as a future direction; for now, the index lives in JS because the query/transform logic does.

## Consequences

- The IPC contract is stable around these two commands. Consumers that need the whole vault (backlinks, semantic, search) call `scan_vault` once, then `read_files_batch` once, not 1 870 times. Full-vault index build completes in ~500 ms on a 1 870-note vault rather than minutes.
- `FileReadResult` with nullable `content` + `error` is the pattern for partial-success batches. New batch commands should follow the same shape.
- Memory cost: a batched read materializes the full result array in Rust and again on the JS side. For typical markdown vaults (<500 MB of text), this fits comfortably; for a hypothetical binary-heavy vault, the call would OOM. Acceptable constraint — binaries aren't the target use case.
- The `scan_vault` result silently excludes hidden dirs; any feature that needs to see (for example) `.kokobrain/models/` must use a dedicated Rust command, not try to coax `scan_vault` into returning them.
- Re-evaluation triggers: vaults grow past ~10 000 notes and the single-shot batch becomes memory-bound (would force chunked batches or streaming); we move more logic into Rust and the batch commands become coarser (e.g., `index_vault` returns parsed wikilinks directly); Tauri adds a streaming IPC primitive that makes per-file reasonable again.
