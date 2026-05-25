//! Vault metadata module.
//!
//! Owns the canonical per-note metadata view (`NoteEntry`) and parsing
//! primitives that mirror the TS extractors in
//! `src/lib/features/{backlinks,tags,properties}/*.logic.ts`. The Rust
//! `VaultIndex` (Phase 2+) uses these to maintain a single source of truth
//! for vault metadata, replacing the per-feature TS stores.
//!
//! See ADR 0025 (`docs/adr/0025-rust-vault-index.md`) for the migration
//! plan; the per-task breakdown lives in
//! `tasks/todo/performance-architecture-refactor.md`.

pub mod aliases;
pub mod entry;
pub mod index;
pub mod parsing;
pub mod task;
pub mod watcher;

/// Tauri-managed wrapper around `VaultIndex`. Wires up via
/// `.manage(VaultIndexState::default())` in `lib.rs`; commands receive it
/// as `State<'_, VaultIndexState>` and acquire `read()` / `write()` for
/// the duration of their work.
pub type VaultIndexState = std::sync::RwLock<index::VaultIndex>;

/// Frontend event name emitted by `update_note_in_index` (Phase 2.6) and
/// the upcoming Phase 9 watcher orchestrator. Consumers subscribe via
/// `listen('vault-index-updated', ...)` and receive an
/// `UpdateResult`-shaped payload.
pub const VAULT_INDEX_UPDATED_EVENT: &str = "vault-index-updated";
