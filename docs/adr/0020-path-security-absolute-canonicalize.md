---
type: ADR
id: "0020"
title: "Path security: absolute-path indexes + Rust canonicalize + starts_with traversal guard"
status: active
date: 2026-04-22
---

## Context

The frontend runs arbitrary user-authored content: wikilinks, queryjs blocks, meta-bind scripts. A compromised note or a bug in a plugin could construct paths like `../../../etc/passwd` or symlinks pointing outside the vault, then pass them to a Tauri command expecting a vault-relative path. Without a strong boundary, the Rust layer would happily read or write anywhere the app has permission.

Additionally, path strings in the frontend flow through many hands: the filesystem watcher, `scan_vault` results, wikilink resolution, the FileTree, save dispatchers, tab identifiers, index keys. If some of those layers use absolute paths and others use vault-relative paths, joining them incorrectly produces either broken indexes or a security hole.

## Decision

**Treat all paths as absolute across the frontend and enforce path-traversal protection exclusively in Rust via `canonicalize()` + `starts_with(vault_root)`.** The frontend never strips or reconstructs paths relative to the vault root; Rust never trusts a caller-provided path until it canonicalizes it and verifies it lands inside the vault.

### Frontend: absolute paths everywhere

All indexes (`noteContents`, `noteIndex`, `fileTasksIndex`, `modifiedAtMap`, `propertyIndex`), editor tabs, and store keys use **absolute paths** sourced from `FileTreeNode.path` (populated by `scan_vault` on the Rust side). There is no vault-relative path form in any store key. See ADR-0009 Indexing rule 5 and `noteIndexStore` (`src/lib/features/backlinks/note-index.store.svelte.ts`).

### Rust: validation at every entry point

Two primitives, both in `src-tauri/src/utils/fs.rs`:

1. **`validate_vault_path(vault_path) → PathBuf`** (`utils/fs.rs:6-19`). Called once per vault-scoped command. Canonicalizes the vault root (resolves symlinks and `..`) and verifies it points to a directory. Returns the canonical root for callers to compare against.

2. **Per-path `canonicalize()` + `starts_with(vault_root)`** inside `read_files_batch` (`commands/files.rs:34-57`). Every input path is canonicalized independently; if the canonical result does not start with the canonical vault root, the path is rejected with `"Path is outside vault directory"`. The command **uses the canonical path for the actual read**, not the caller's path, so the final open cannot race the validation.

Supporting properties:

- **`symlink_metadata` (`lstat`) in `scan_vault`** (`commands/vault.rs:61-69`). Atomic symlink check + metadata read; symlinks are skipped to prevent both recursion loops and silent path-traversal (a symlink inside the vault pointing outside would otherwise be followed by a later `read_to_string`). This closes the TOCTOU window between `is_symlink()` and a separate `metadata()` call.
- **Hidden-dir skip** (`vault.rs:53-55`). `.kokobrain/` and other dot directories are filtered before path emission, so the frontend never sees or remembers paths inside the app-data area. Combined with the watcher filter (ADR-0017), app-data paths cannot leak into the index.
- **MAX_DEPTH = 64** (`vault.rs:11, utils/fs.rs:4`). Caps recursion in directory traversal, belt-and-suspenders against pathological symlink or nesting attacks that survive the symlink skip.

## Alternatives considered

- **Vault-relative paths in the frontend** (with a global vault-root + join): attractive for display and for portability if the vault moves mid-session. Loses type-safety — a function taking `string` could be fed either form — and forces every Rust command to prepend the vault root, duplicating the join logic in every handler. Rejected.
- **Validate paths in a middleware layer (Tauri command guard)**: would centralize the check. Tauri 2 does not ship a built-in command-guard extension point with the ergonomics we'd want; manually wrapping every `#[tauri::command]` in a macro was not worth the complexity for the ~12 commands that take paths. Each command that accepts a path does its own `canonicalize` + `starts_with` — repetitive, but explicit.
- **Frontend-side path validation**: trivially defeatable (a compromised renderer process is the attacker). Rust-side validation is the only trustworthy boundary.
- **Block symlinks at the OS level via mount options**: not portable across macOS/Windows/Linux and not something a desktop app can enforce on a user's filesystem. `symlink_metadata` + skip is the app-level equivalent.
- **Allow symlinks but validate the canonicalized target**: useful for users who want to symlink in external folders, but enormously increases the attack surface and means the vault's effective contents aren't the folder contents. Rejected for now; if demand appears, gate behind a settings flag with a large-print warning.

## Consequences

- Every Tauri command that takes a path string must call `validate_vault_path` for the vault root and per-path `canonicalize()` + `starts_with` for any other path argument. New commands that skip this are security bugs. Reviewers should check this pattern on every PR that adds a path-taking command.
- Symlinks inside the vault are invisible to the app — they do not appear in `scan_vault` results, are never read, never written. Users who rely on symlinks must work around this with a settings flag (not currently exposed).
- Because the frontend uses absolute paths, the vault cannot be moved while open — the watcher, indexes, and tabs all hold paths tied to the original root. A vault move requires close + reopen. Acceptable trade-off; the UX of "close, move, reopen" is simple and rare.
- `read_files_batch` canonicalizes per-file on every call. For a 1 870-note build that's 1 870 `canonicalize` syscalls (~10 μs each on SSDs) — ~20 ms total, dominated by the actual reads. Not a measurable cost.
- Errors from rejected paths come back as `FileReadResult { error: Some("Path is outside vault directory") }` rather than throwing — callers must inspect per-file errors. See ADR-0018.
- Re-evaluation triggers: a legitimate use case for crossing the vault boundary appears (likely requires a user-opt-in "trusted paths" registry); Tauri adds a built-in path-scope capability system that subsumes our hand-rolled check; a penetration test finds a gap in the current validation (would prompt a targeted fix plus an update to this ADR).
