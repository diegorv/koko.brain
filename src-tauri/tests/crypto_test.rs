use kokobrain_lib::commands::crypto::{lock_encryption, restore_from_recovery_key, vault_account};
use kokobrain_lib::security::crypto::{
	decrypt, encrypt, generate_key, key_to_recovery_key, recovery_key_to_key,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

// --- vault_account ---

#[test]
fn vault_account_deterministic() {
	let a = vault_account("/Users/me/vault");
	let b = vault_account("/Users/me/vault");
	assert_eq!(a, b);
}

#[test]
fn vault_account_different_paths_differ() {
	let a = vault_account("/vault/one");
	let b = vault_account("/vault/two");
	assert_ne!(a, b);
}

#[test]
fn vault_account_format() {
	let account = vault_account("/some/vault");
	assert!(account.starts_with("vault-"), "should start with 'vault-'");
	let hex_part = &account["vault-".len()..];
	assert_eq!(hex_part.len(), 16, "hex part should be 16 chars (8 bytes)");
	assert!(
		hex_part.chars().all(|c| c.is_ascii_hexdigit()),
		"should be valid hex"
	);
}

#[test]
fn vault_account_empty_path() {
	let account = vault_account("");
	assert!(account.starts_with("vault-"));
}

// --- lock_encryption ---

#[test]
fn lock_encryption_returns_ok() {
	let result = lock_encryption();
	assert!(result.is_ok());
}

#[test]
fn lock_encryption_idempotent() {
	// Calling lock twice should not fail
	let _ = lock_encryption();
	let result = lock_encryption();
	assert!(result.is_ok(), "locking when already empty should succeed");
}

// --- restore_from_recovery_key ---

#[test]
fn restore_from_recovery_key_invalid_base64() {
	let result = restore_from_recovery_key(
		"/test/vault".to_string(),
		"not-valid-base64!!!".to_string(),
	);
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("Invalid recovery key"));
}

#[test]
fn restore_from_recovery_key_wrong_length() {
	let short = BASE64.encode([0u8; 16]);
	let result = restore_from_recovery_key("/test/vault".to_string(), short);
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("expected 32 bytes"));
}

#[test]
fn restore_from_recovery_key_empty_string() {
	let result = restore_from_recovery_key("/test/vault".to_string(), String::new());
	assert!(result.is_err());
}

// --- recovery key encoding/decoding ---

#[test]
fn recovery_key_roundtrip() {
	let key = generate_key();
	let recovery = key_to_recovery_key(&key);
	let restored = recovery_key_to_key(&recovery).unwrap();
	assert_eq!(key, restored);
}

#[test]
fn recovery_key_is_base64() {
	let key = generate_key();
	let recovery = key_to_recovery_key(&key);
	// Base64 of 32 bytes = 44 characters (with padding)
	assert_eq!(recovery.len(), 44);
	assert!(recovery.ends_with('='));
}

#[test]
fn recovery_key_trims_whitespace() {
	let key = generate_key();
	let recovery = key_to_recovery_key(&key);
	let padded = format!("  {recovery}  \n");
	let restored = recovery_key_to_key(&padded).unwrap();
	assert_eq!(key, restored);
}

#[test]
fn recovery_key_invalid_base64() {
	let result = recovery_key_to_key("not-valid-base64!!!");
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("Invalid recovery key"));
}

#[test]
fn recovery_key_wrong_length() {
	// 16 bytes instead of 32
	let short_key = BASE64.encode([0u8; 16]);
	let result = recovery_key_to_key(&short_key);
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("expected 32 bytes"));
}

#[test]
fn recovery_key_empty_string() {
	let result = recovery_key_to_key("");
	assert!(result.is_err());
}

#[test]
fn recovery_key_can_decrypt() {
	let key = generate_key();
	let plaintext = "secret note content";
	let payload = encrypt(plaintext, &key).unwrap();

	// Encode to recovery key, decode back, and use to decrypt
	let recovery = key_to_recovery_key(&key);
	let restored_key = recovery_key_to_key(&recovery).unwrap();
	let decrypted = decrypt(&payload, &restored_key).unwrap();
	assert_eq!(decrypted, plaintext);
}
