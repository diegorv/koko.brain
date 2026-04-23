//! Vault metadata indexing module.
//!
//! Owns the in-memory view of note metadata that TS-side panels consume after
//! the performance refactor (ADR 0025). Phase 1 adds the additive `NoteEntry`
//! type and extractors; Phase 2 builds `VaultIndex` on top; Phases 3+ migrate
//! consumers to the Rust-side commands. See
//! `tasks/todo/performance-architecture-refactor.md` for the full plan.

pub mod entry;
pub mod index;
pub mod parsing;

use std::sync::RwLock;

/// Tauri managed-state wrapper for the singleton `VaultIndex`. Held inside
/// an `RwLock` so reads (`get_backlinks_v2`, `get_outgoing_links_v2`, etc.)
/// can execute in parallel while writes (`scan_vault_v2`,
/// `update_note_in_index`) briefly take the exclusive lock.
///
/// Command handlers receive it as `State<'_, VaultIndexState>` and call
/// `.read()` / `.write()` at the top of the handler.
pub type VaultIndexState = RwLock<index::VaultIndex>;
