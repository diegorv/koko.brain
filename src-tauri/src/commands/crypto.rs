use crate::security::crypto::{self, EncryptedPayload};
use crate::security::keychain;
use crate::utils::logger::debug_log;
use sha2::{Digest, Sha256};
use std::fmt::Write;
use std::sync::Mutex;
use zeroize::Zeroizing;

/// In-memory cache for the vault encryption key.
/// Avoids repeated Touch ID prompts during a single session.
/// Stores `(vault_path, key)` to prevent cross-vault key misuse.
/// Uses `Zeroizing` to ensure key bytes are zeroed on drop.
static CACHED_KEY: Mutex<Option<(String, Zeroizing<[u8; 32]>)>> = Mutex::new(None);

/// Derives a deterministic Keychain account name from the vault path.
pub fn vault_account(vault_path: &str) -> String {
	let hash = Sha256::digest(vault_path.as_bytes());
	let mut hex = String::with_capacity(16);
	for byte in &hash[..8] {
		let _ = write!(hex, "{byte:02x}");
	}
	format!("vault-{hex}")
}

/// Returns the cached key, or prompts Touch ID then retrieves from Keychain.
/// Uses `Zeroizing` wrapper so key bytes are zeroed when dropped from the stack.
fn get_or_retrieve_key(vault_path: &str) -> Result<Zeroizing<[u8; 32]>, String> {
	let mut cache = CACHED_KEY.lock().map_err(|e| format!("Lock error: {e}"))?;
	if let Some((ref cached_path, ref key)) = *cache {
		if cached_path == vault_path {
			debug_log("CRYPTO", "Key cache hit");
			return Ok(Zeroizing::new(**key));
		}
		// Different vault — invalidate stale cache (Zeroizing zeros on drop)
		debug_log("CRYPTO", "Key cache miss — vault changed, clearing stale key");
		*cache = None;
	}

	debug_log("CRYPTO", "Key cache miss — prompting biometric");
	// Prompt Touch ID before accessing the encryption key
	crate::security::biometric::prompt_biometric("Access encryption key for KokoBrain")?;

	let account = vault_account(vault_path);
	let key = Zeroizing::new(keychain::retrieve_key(&account).map_err(|e| match e {
		keychain::KeychainError::UserCanceled => "canceled".to_string(),
		keychain::KeychainError::NotFound => "No encryption key found for this vault".to_string(),
		keychain::KeychainError::Internal(msg) => msg,
	})?);

	*cache = Some((vault_path.to_string(), Zeroizing::new(*key)));
	Ok(key)
}

/// Encrypts content using the vault's encryption key.
/// Returns the encrypted payload (version, IV, ciphertext).
#[tauri::command]
pub fn encrypt_content(content: String, vault_path: String) -> Result<EncryptedPayload, String> {
	debug_log("CRYPTO", format!("Encrypting content ({} bytes)", content.len()));
	let key = get_or_retrieve_key(&vault_path)?;
	crypto::encrypt(&content, &*key)
}

/// Decrypts content using the vault's encryption key.
/// Takes IV and data as separate base64 strings (from the parsed JSON payload).
#[tauri::command]
pub fn decrypt_content(iv: String, data: String, vault_path: String) -> Result<String, String> {
	debug_log("CRYPTO", "Decrypting content");
	let key = get_or_retrieve_key(&vault_path)?;
	let payload = EncryptedPayload {
		kokobrain_encrypted: "1.0".to_string(),
		iv,
		data,
	};
	crypto::decrypt(&payload, &*key)
}

/// Generates a new encryption key and stores it in the Keychain.
/// Call this when encrypting a file for the first time in a vault.
#[tauri::command]
pub fn initialize_encryption(vault_path: String) -> Result<(), String> {
	debug_log("CRYPTO", "Initializing encryption for vault");
	let account = vault_account(&vault_path);
	let key = Zeroizing::new(crypto::generate_key());

	keychain::store_key(&account, &*key).map_err(|e| format!("{e}"))?;

	let mut cache = CACHED_KEY.lock().map_err(|e| format!("Lock error: {e}"))?;
	*cache = Some((vault_path, key));

	Ok(())
}

/// Atomically ensures an encryption key exists for this vault.
/// If the key is already cached in memory, returns `Ok(None)`.
/// If the key exists in the Keychain, prompts biometric, retrieves it, caches it, returns `Ok(None)`.
/// If no key exists, prompts biometric, generates a new key, stores it, caches it,
/// and returns `Ok(Some(recovery_key))` — the base64-encoded key for user backup.
/// This replaces the two-step `has_encryption_key` + `initialize_encryption` flow
/// to prevent race conditions and ensure biometric auth on key creation.
#[tauri::command]
pub fn ensure_encryption_key(vault_path: String) -> Result<Option<String>, String> {
	let mut cache = CACHED_KEY.lock().map_err(|e| format!("Lock error: {e}"))?;

	// 1. Check in-memory cache
	if let Some((ref cached_path, _)) = *cache {
		if cached_path == &vault_path {
			debug_log("CRYPTO", "ensure_encryption_key: cache hit");
			return Ok(None);
		}
		// Different vault — clear stale cache
		*cache = None;
	}

	let account = vault_account(&vault_path);

	if keychain::has_key(&account) {
		// 2. Key exists in Keychain — prompt biometric, retrieve, cache
		debug_log("CRYPTO", "ensure_encryption_key: key exists, prompting biometric");
		crate::security::biometric::prompt_biometric("Access encryption key for KokoBrain")
			.map_err(|e| {
				if e == "canceled" { e } else { format!("Biometric auth failed: {e}") }
			})?;

		let key = Zeroizing::new(keychain::retrieve_key(&account).map_err(|e| match e {
			keychain::KeychainError::UserCanceled => "canceled".to_string(),
			keychain::KeychainError::NotFound => "Key disappeared from Keychain".to_string(),
			keychain::KeychainError::Internal(msg) => msg,
		})?);

		*cache = Some((vault_path, Zeroizing::new(*key)));
		Ok(None)
	} else {
		// 3. No key exists — prompt biometric, generate, store, cache
		debug_log("CRYPTO", "ensure_encryption_key: no key found, prompting biometric for creation");
		crate::security::biometric::prompt_biometric("Create encryption key for Kokobrain")
			.map_err(|e| {
				if e == "canceled" { e } else { format!("Biometric auth failed: {e}") }
			})?;

		let key = Zeroizing::new(crypto::generate_key());
		keychain::store_key(&account, &*key).map_err(|e| format!("{e}"))?;

		let recovery_key = crypto::key_to_recovery_key(&*key);
		*cache = Some((vault_path, key));
		debug_log("CRYPTO", "ensure_encryption_key: new key created and cached");
		Ok(Some(recovery_key))
	}
}

/// Checks whether an encryption key exists in the Keychain for this vault.
/// Does NOT trigger Touch ID — only checks existence.
#[tauri::command]
pub fn has_encryption_key(vault_path: String) -> Result<bool, String> {
	let account = vault_account(&vault_path);
	let exists = keychain::has_key(&account);
	debug_log("CRYPTO", format!("Key check: {}", exists));
	Ok(exists)
}

/// Returns the vault's encryption key as a base64-encoded recovery key.
/// Requires biometric authentication. The recovery key can be used to
/// restore encryption on a different machine via `restore_from_recovery_key`.
#[tauri::command]
pub fn get_recovery_key(vault_path: String) -> Result<String, String> {
	debug_log("CRYPTO", "Retrieving recovery key (requires biometric)");
	let key = get_or_retrieve_key(&vault_path)?;
	Ok(crypto::key_to_recovery_key(&*key))
}

/// Restores an encryption key from a base64-encoded recovery key.
/// Decodes the recovery key, validates it, stores it in the Keychain,
/// and caches it in memory. Used when migrating to a new machine.
#[tauri::command]
pub fn restore_from_recovery_key(vault_path: String, recovery_key: String) -> Result<(), String> {
	debug_log("CRYPTO", "Restoring encryption key from recovery key");
	let key = Zeroizing::new(crypto::recovery_key_to_key(&recovery_key)?);
	let account = vault_account(&vault_path);

	keychain::store_key(&account, &*key).map_err(|e| format!("{e}"))?;

	let mut cache = CACHED_KEY.lock().map_err(|e| format!("Lock error: {e}"))?;
	*cache = Some((vault_path, key));

	debug_log("CRYPTO", "Recovery key restored and cached");
	Ok(())
}

/// Clears the in-memory key cache.
/// The `Zeroizing` wrapper automatically zeros key bytes on drop.
/// The next encrypt/decrypt operation will require Touch ID again.
#[tauri::command]
pub fn lock_encryption() -> Result<(), String> {
	debug_log("CRYPTO", "Locking encryption (clearing cache)");
	let mut cache = CACHED_KEY.lock().map_err(|e| format!("Lock error: {e}"))?;
	// Zeroizing<[u8; 32]> zeros the key bytes automatically when dropped
	*cache = None;
	Ok(())
}