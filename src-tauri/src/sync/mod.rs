//! Peer-to-peer vault sync over Noise-encrypted TCP.
//!
//! Pull-only model: "Sync now" on machine A connects to machine B and writes
//! only to A's disk. The listener side is strictly read-only. See
//! docs/superpowers/specs/2026-07-03-p2p-sync-design.md.

pub mod protocol;
pub mod noise;
pub mod state;
pub mod manifest;
pub mod decision;
pub mod server;
pub mod engine;
