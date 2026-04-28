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

pub mod entry;
