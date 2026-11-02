//! The vault the desktop app has open, as browser sessions see it.

use std::sync::{Arc, Condvar, Mutex, OnceLock};
use std::time::Duration;

/// The open vault root plus a generation that bumps on every change, so a
/// session can tell "the desktop switched vaults" from "nothing happened".
#[derive(Default)]
pub struct VaultRootCell {
	state: Mutex<(Option<String>, u64)>,
	changed: Condvar,
}

impl VaultRootCell {
	/// Records the desktop's open vault (`None` when it closed it). Setting
	/// the same value again is not a change.
	pub fn set(&self, root: Option<String>) {
		let mut guard = match self.state.lock() {
			Ok(g) => g,
			Err(poisoned) => poisoned.into_inner(),
		};
		if guard.0 == root {
			return;
		}
		guard.0 = root;
		guard.1 += 1;
		self.changed.notify_all();
	}

	/// The current root and its generation.
	pub fn get(&self) -> (Option<String>, u64) {
		match self.state.lock() {
			Ok(g) => g.clone(),
			Err(poisoned) => poisoned.into_inner().clone(),
		}
	}

	/// Waits up to `timeout` for a generation other than `seen`. Returns the
	/// new root and generation, or `None` on timeout.
	pub fn wait_change(&self, seen: u64, timeout: Duration) -> Option<(Option<String>, u64)> {
		let guard = match self.state.lock() {
			Ok(g) => g,
			Err(poisoned) => poisoned.into_inner(),
		};
		let (guard, _) = match self.changed.wait_timeout_while(guard, timeout, |s| s.1 == seen) {
			Ok(r) => r,
			Err(poisoned) => poisoned.into_inner(),
		};
		(guard.1 != seen).then(|| guard.clone())
	}
}

/// The process-wide cell the desktop's `open_vault_db` / `close_vault_db`
/// write and the loopback server reads.
pub fn desktop_vault_root() -> Arc<VaultRootCell> {
	static CELL: OnceLock<Arc<VaultRootCell>> = OnceLock::new();
	CELL.get_or_init(|| Arc::new(VaultRootCell::default())).clone()
}
