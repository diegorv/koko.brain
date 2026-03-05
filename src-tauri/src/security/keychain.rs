/// Keychain error types for user-friendly error handling.
#[derive(Debug)]
pub enum KeychainError {
	/// No key found for this account
	NotFound,
	/// User canceled the Touch ID / authentication prompt
	UserCanceled,
	/// Internal error with a description
	Internal(String),
}

impl std::fmt::Display for KeychainError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			KeychainError::NotFound => write!(f, "Key not found in Keychain"),
			KeychainError::UserCanceled => write!(f, "Authentication canceled by user"),
			KeychainError::Internal(msg) => write!(f, "Keychain error: {msg}"),
		}
	}
}

/// Keychain service identifier — must match `identifier` in `tauri.conf.json`.
const SERVICE: &str = "com.diegorv.kokobrain";

/// macOS Keychain implementation using security-framework crate.
#[cfg(target_os = "macos")]
mod platform {
	use super::*;
	use security_framework::item::{ItemClass, ItemSearchOptions, Limit, SearchResult};
	use security_framework::passwords::{delete_generic_password, set_generic_password};
	use zeroize::Zeroizing;

	/// Stores a 32-byte encryption key in the macOS Keychain.
	pub fn store_key(account: &str, key: &[u8; 32]) -> Result<(), KeychainError> {
		// Delete existing key first (update not supported directly)
		let _ = delete_generic_password(SERVICE, account);

		set_generic_password(SERVICE, account, key)
			.map_err(|e| KeychainError::Internal(format!("Failed to store key: {e}")))?;

		Ok(())
	}

	/// Retrieves a 32-byte encryption key from the macOS Keychain.
	pub fn retrieve_key(account: &str) -> Result<[u8; 32], KeychainError> {
		let mut search = ItemSearchOptions::new();
		search
			.class(ItemClass::generic_password())
			.service(SERVICE)
			.account(account)
			.load_data(true)
			.limit(Limit::Max(1));

		let results = search.search().map_err(|e| {
			let code = e.code();
			if code == -128 || code == -25293 {
				KeychainError::UserCanceled
			} else if code == -25300 {
				KeychainError::NotFound
			} else {
				KeychainError::Internal(format!("Search failed (code {code}): {e}"))
			}
		})?;

		// Wrap in Zeroizing so raw key bytes are zeroed when this Vec is dropped
		let data = Zeroizing::new(
			results
				.into_iter()
				.next()
				.and_then(|r| match r {
					SearchResult::Data(d) => Some(d),
					_ => None,
				})
				.ok_or(KeychainError::NotFound)?,
		);

		if data.len() != 32 {
			return Err(KeychainError::Internal(format!(
				"Invalid key length: expected 32, got {}",
				data.len()
			)));
		}

		let mut key = [0u8; 32];
		key.copy_from_slice(&data);
		Ok(key)
	}

	/// Checks if a key exists for the given account without triggering authentication.
	pub fn has_key(account: &str) -> bool {
		let mut search = ItemSearchOptions::new();
		search
			.class(ItemClass::generic_password())
			.service(SERVICE)
			.account(account)
			.load_data(false)
			.limit(Limit::Max(1));

		search.search().is_ok()
	}
}

/// Stub implementation for non-macOS platforms.
#[cfg(not(target_os = "macos"))]
mod platform {
	use super::*;

	pub fn store_key(_account: &str, _key: &[u8; 32]) -> Result<(), KeychainError> {
		Err(KeychainError::Internal(
			"Keychain is only available on macOS".to_string(),
		))
	}

	pub fn retrieve_key(_account: &str) -> Result<[u8; 32], KeychainError> {
		Err(KeychainError::Internal(
			"Keychain is only available on macOS".to_string(),
		))
	}

	pub fn has_key(_account: &str) -> bool {
		false
	}
}

// Re-export platform functions at module level
pub use platform::*;
