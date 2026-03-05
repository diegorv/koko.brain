use aes_gcm::{
	aead::{Aead, KeyInit},
	Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;

/// Encrypted file payload stored as JSON on disk.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct EncryptedPayload {
	/// Format version (currently "1.0")
	pub kokobrain_encrypted: String,
	/// Base64-encoded 12-byte initialization vector
	pub iv: String,
	/// Base64-encoded AES-256-GCM ciphertext (includes 16-byte auth tag)
	pub data: String,
}

/// Encrypts plaintext using AES-256-GCM with a random 12-byte IV.
/// Returns the encrypted payload containing base64-encoded IV and ciphertext.
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<EncryptedPayload, String> {
	let cipher = Aes256Gcm::new_from_slice(key)
		.map_err(|e| format!("Failed to create cipher: {e}"))?;

	let mut iv_bytes = [0u8; 12];
	rand::thread_rng().fill_bytes(&mut iv_bytes);
	let nonce = Nonce::from_slice(&iv_bytes);

	let ciphertext = cipher
		.encrypt(nonce, plaintext.as_bytes())
		.map_err(|e| format!("Encryption failed: {e}"))?;

	Ok(EncryptedPayload {
		kokobrain_encrypted: "1.0".to_string(),
		iv: BASE64.encode(iv_bytes),
		data: BASE64.encode(ciphertext),
	})
}

/// Decrypts an encrypted payload using AES-256-GCM.
/// Returns the original plaintext string.
pub fn decrypt(payload: &EncryptedPayload, key: &[u8; 32]) -> Result<String, String> {
	let cipher = Aes256Gcm::new_from_slice(key)
		.map_err(|e| format!("Failed to create cipher: {e}"))?;

	let iv_bytes = BASE64
		.decode(&payload.iv)
		.map_err(|e| format!("Invalid IV base64: {e}"))?;
	if iv_bytes.len() != 12 {
		return Err(format!("Invalid IV length: expected 12, got {}", iv_bytes.len()));
	}
	let nonce = Nonce::from_slice(&iv_bytes);

	let ciphertext = BASE64
		.decode(&payload.data)
		.map_err(|e| format!("Invalid data base64: {e}"))?;

	let plaintext_bytes = cipher
		.decrypt(nonce, ciphertext.as_ref())
		.map_err(|_| "Decryption failed: wrong key or corrupted data".to_string())?;

	String::from_utf8(plaintext_bytes)
		.map_err(|e| format!("Decrypted content is not valid UTF-8: {e}"))
}

/// Generates a cryptographically secure random 256-bit key.
pub fn generate_key() -> [u8; 32] {
	let mut key = [0u8; 32];
	rand::thread_rng().fill_bytes(&mut key);
	key
}

/// Encodes a 32-byte AES key as a base64 recovery key string.
pub fn key_to_recovery_key(key: &[u8; 32]) -> String {
	BASE64.encode(key)
}

/// Decodes a base64 recovery key string back to a 32-byte AES key.
/// Trims whitespace before decoding. Returns error if invalid base64 or wrong length.
pub fn recovery_key_to_key(recovery_key: &str) -> Result<[u8; 32], String> {
	let trimmed = recovery_key.trim();
	let bytes = BASE64
		.decode(trimmed)
		.map_err(|e| format!("Invalid recovery key: {e}"))?;
	if bytes.len() != 32 {
		return Err(format!(
			"Invalid recovery key length: expected 32 bytes, got {}",
			bytes.len()
		));
	}
	let mut key = [0u8; 32];
	key.copy_from_slice(&bytes);
	Ok(key)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn encrypt_decrypt_roundtrip() {
		let key = generate_key();
		let plaintext = "Hello, encrypted world!";
		let payload = encrypt(plaintext, &key).unwrap();
		let decrypted = decrypt(&payload, &key).unwrap();
		assert_eq!(decrypted, plaintext);
	}

	#[test]
	fn wrong_key_fails_decryption() {
		let key1 = generate_key();
		let key2 = generate_key();
		let payload = encrypt("secret", &key1).unwrap();
		let result = decrypt(&payload, &key2);
		assert!(result.is_err());
	}

	#[test]
	fn empty_content_roundtrip() {
		let key = generate_key();
		let payload = encrypt("", &key).unwrap();
		let decrypted = decrypt(&payload, &key).unwrap();
		assert_eq!(decrypted, "");
	}

	#[test]
	fn large_content_roundtrip() {
		let key = generate_key();
		let plaintext = "x".repeat(1_000_000); // 1MB
		let payload = encrypt(&plaintext, &key).unwrap();
		let decrypted = decrypt(&payload, &key).unwrap();
		assert_eq!(decrypted, plaintext);
	}

	#[test]
	fn unicode_content_roundtrip() {
		let key = generate_key();
		let plaintext = "日本語テスト 🔐 Ñoño café";
		let payload = encrypt(plaintext, &key).unwrap();
		let decrypted = decrypt(&payload, &key).unwrap();
		assert_eq!(decrypted, plaintext);
	}

	#[test]
	fn corrupted_data_fails() {
		let key = generate_key();
		let mut payload = encrypt("test", &key).unwrap();
		payload.data = BASE64.encode(b"corrupted garbage data");
		let result = decrypt(&payload, &key);
		assert!(result.is_err());
	}

	#[test]
	fn invalid_base64_iv_fails() {
		let key = generate_key();
		let mut payload = encrypt("test", &key).unwrap();
		payload.iv = "not-valid-base64!!!".to_string();
		let result = decrypt(&payload, &key);
		assert!(result.is_err());
	}

	#[test]
	fn different_ivs_produce_different_ciphertext() {
		let key = generate_key();
		let payload1 = encrypt("same content", &key).unwrap();
		let payload2 = encrypt("same content", &key).unwrap();
		assert_ne!(payload1.iv, payload2.iv);
		assert_ne!(payload1.data, payload2.data);
	}

	#[test]
	fn payload_version_is_1_0() {
		let key = generate_key();
		let payload = encrypt("test", &key).unwrap();
		assert_eq!(payload.kokobrain_encrypted, "1.0");
	}
}
