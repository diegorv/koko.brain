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
