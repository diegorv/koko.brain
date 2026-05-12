//! LAN P2P vault sync module.
//!
//! Provides end-to-end encrypted folder synchronization between Kokobrain
//! vaults on the same local network. See `tasks/todo/lan-sync.md` for the
//! incremental implementation plan.

pub mod discovery;
pub mod identity;
pub mod pairing;
pub mod protocol;
pub mod rename_detect;
pub mod shares;
pub mod state_db;
pub mod sync_engine;
pub mod transport;
pub mod wordlist;
