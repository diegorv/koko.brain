use aes_gcm::{
	aead::{Aead, KeyInit},
	Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use zeroize::Zeroizing;

use crate::security::keychain;
use crate::utils::logger::debug_log;

/// Current protocol version for the sync wire format.
pub const PROTOCOL_VERSION: u8 = 1;

/// Minimum passphrase length (characters).
const MIN_PASSPHRASE_LEN: usize = 15;

/// Maximum age of a manifest's `generated_at` timestamp (seconds).
const MAX_MANIFEST_AGE_SECS: u64 = 15 * 60;

/// Character set used for passphrase generation.
pub const PASSPHRASE_CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";

/// Derived key pair for sync operations (PSK for Noise handshake + HMAC for manifest signing).
pub struct SyncKeys {
	/// Pre-shared key for the Noise protocol handshake.
	pub psk_key: Zeroizing<[u8; 32]>,
	/// Key for HMAC-SHA256 manifest signing.
	pub hmac_key: Zeroizing<[u8; 32]>,
}

/// Persisted sync state per vault (stored in `.noted/sync-state.json`).
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
pub struct SyncState {
	/// UUID agreed upon between peers for deriving the master key.
	pub canonical_vault_uuid: Option<String>,
	/// Timestamp of the last successful sync, keyed by peer ID.
	#[serde(default)]
	pub last_sync: std::collections::HashMap<String, u64>,
	/// Baseline manifest from the last successful sync per peer.
	#[serde(default)]
	pub baseline_manifests: std::collections::HashMap<String, serde_json::Value>,
}

/// Local sync configuration per vault (stored in `.noted/sync-local.json`, never synced).
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct SyncLocalConfig {
	/// Glob patterns for paths allowed to sync on this machine (allowlist).
	#[serde(default)]
	pub allowed_paths: Vec<String>,
	/// TCP port for the sync server (default: 39782).
	#[serde(default = "default_port")]
	pub port: u16,
	/// Sync interval in seconds (default: 300 = 5 min).
	#[serde(default = "default_interval")]
	pub interval_secs: u64,
}

fn default_port() -> u16 {
	39782
}

fn default_interval() -> u64 {
	300
}

impl Default for SyncLocalConfig {
	fn default() -> Self {
		Self {
			allowed_paths: Vec::new(),
			port: default_port(),
			interval_secs: default_interval(),
		}
	}
}

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/// Derives a 32-byte master key from a passphrase and canonical vault UUID using Argon2id.
///
/// Parameters: `m=64MB, t=3, p=1`, `salt = SHA-256(canonical_vault_uuid)`.
pub fn derive_master_key(passphrase: &str, canonical_vault_uuid: &str) -> Result<Zeroizing<[u8; 32]>, String> {
	debug_log("SYNC:CRYPTO", "Deriving master key via Argon2id (m=64MB, t=3)…");
	let salt = Sha256::digest(canonical_vault_uuid.as_bytes());

	let params = argon2::Params::new(64 * 1024, 3, 1, Some(32))
		.map_err(|e| format!("Invalid Argon2 params: {e}"))?;
	let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

	let mut key = Zeroizing::new([0u8; 32]);
	argon2
		.hash_password_into(passphrase.as_bytes(), &salt, key.as_mut())
		.map_err(|e| format!("Argon2id derivation failed: {e}"))?;

	Ok(key)
}

/// Derives separate PSK and HMAC keys from a master key via HKDF-SHA256.
///
/// - `psk_key  = HKDF(master_key, salt=None, info="noted-sync-psk")`
/// - `hmac_key = HKDF(master_key, salt=None, info="noted-sync-hmac")`
pub fn derive_sync_keys(master_key: &[u8; 32]) -> Result<SyncKeys, String> {
	let hk = Hkdf::<Sha256>::new(None, master_key);

	let mut psk_key = Zeroizing::new([0u8; 32]);
	hk.expand(b"noted-sync-psk", psk_key.as_mut())
		.map_err(|e| format!("HKDF expand (psk) failed: {e}"))?;

	let mut hmac_key = Zeroizing::new([0u8; 32]);
	hk.expand(b"noted-sync-hmac", hmac_key.as_mut())
		.map_err(|e| format!("HKDF expand (hmac) failed: {e}"))?;

	Ok(SyncKeys { psk_key, hmac_key })
}

// ---------------------------------------------------------------------------
// Passphrase
// ---------------------------------------------------------------------------

/// Validates that a passphrase meets the minimum length requirement (character count, not bytes).
pub fn validate_passphrase(passphrase: &str) -> Result<(), String> {
	let char_count = passphrase.chars().count();
	if char_count < MIN_PASSPHRASE_LEN {
		return Err(format!(
			"Passphrase must be at least {MIN_PASSPHRASE_LEN} characters, got {char_count}",
		));
	}
	Ok(())
}

/// Generates a 15-character passphrase from CSPRNG using `A-Za-z0-9!@#$%&*`.
pub fn generate_passphrase() -> String {
	let mut rng = rand::thread_rng();
	let mut passphrase = String::with_capacity(MIN_PASSPHRASE_LEN);
	for _ in 0..MIN_PASSPHRASE_LEN {
		let idx = (rng.next_u32() as usize) % PASSPHRASE_CHARSET.len();
		passphrase.push(PASSPHRASE_CHARSET[idx] as char);
	}
	passphrase
}

// ---------------------------------------------------------------------------
// Manifest HMAC
// ---------------------------------------------------------------------------

/// Signs manifest bytes with HMAC-SHA256, returning a 32-byte MAC.
pub fn sign_manifest(hmac_key: &[u8; 32], manifest_bytes: &[u8]) -> [u8; 32] {
	let mut mac =
		<Hmac<Sha256> as Mac>::new_from_slice(hmac_key).expect("HMAC key length is always 32");
	mac.update(manifest_bytes);
	let result = mac.finalize().into_bytes();
	result.into()
}

/// Verifies a manifest HMAC in constant time and rejects manifests older than 15 minutes.
///
/// - `generated_at`: unix timestamp (seconds) embedded in the manifest.
pub fn verify_manifest(
	hmac_key: &[u8; 32],
	manifest_bytes: &[u8],
	mac: &[u8; 32],
	generated_at: u64,
) -> bool {
	// Check freshness — reject manifests older than 15 min or from the future
	let now = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_secs();

	// Allow up to 60 seconds of clock skew for future timestamps
	const MAX_CLOCK_SKEW_SECS: u64 = 60;
	if generated_at > now + MAX_CLOCK_SKEW_SECS {
		return false;
	}
	if now.saturating_sub(generated_at) > MAX_MANIFEST_AGE_SECS {
		return false;
	}

	let expected = sign_manifest(hmac_key, manifest_bytes);
	expected.ct_eq(mac).into()
}

// ---------------------------------------------------------------------------
// Vault identity
// ---------------------------------------------------------------------------

/// Reads or creates the vault identity file (`.noted/vault-id`).
///
/// Returns the UUID v4 string stored inside the file. Creates the file with a
/// fresh UUID if it doesn't exist.
pub fn read_or_create_vault_id(vault_path: &str) -> Result<String, String> {
	let noted_dir = std::path::Path::new(vault_path).join(".noted");
	std::fs::create_dir_all(&noted_dir)
		.map_err(|e| format!("Failed to create .noted dir: {e}"))?;

	let id_path = noted_dir.join("vault-id");
	if id_path.exists() {
		let content = std::fs::read_to_string(&id_path)
			.map_err(|e| format!("Failed to read vault-id: {e}"))?;
		let trimmed = content.trim().to_string();
		if !trimmed.is_empty() {
			debug_log("SYNC:CRYPTO", format!("Loaded vault ID: {trimmed}"));
			return Ok(trimmed);
		}
	}

	let new_id = uuid::Uuid::new_v4().to_string();
	std::fs::write(&id_path, &new_id)
		.map_err(|e| format!("Failed to write vault-id: {e}"))?;
	debug_log("SYNC:CRYPTO", format!("Created new vault ID: {new_id}"));
	Ok(new_id)
}

/// Hashes a vault UUID for mDNS TXT records: `SHA256(vault_id)[0..8]` as 16 hex chars.
pub fn hash_vault_id_for_mdns(vault_id: &str) -> String {
	let hash = Sha256::digest(vault_id.as_bytes());
	hex_encode(&hash[..8])
}

/// Returns the canonical vault UUID from `sync-state.json`, falling back to the
/// vault's own `vault-id` file if no canonical UUID has been established.
pub fn get_canonical_vault_uuid(vault_path: &str) -> Result<String, String> {
	let state = load_sync_state(vault_path)?;
	if let Some(uuid) = state.canonical_vault_uuid {
		return Ok(uuid);
	}
	read_or_create_vault_id(vault_path)
}

// ---------------------------------------------------------------------------
// Keychain-backed keys
// ---------------------------------------------------------------------------

/// Gets or creates the 32-byte sync-identity encryption key in the Keychain.
///
/// Account: `noted-sync-id:{SHA256(canonical_vault_uuid)[0..8] hex}`.
pub fn get_or_create_sync_id_key(canonical_vault_uuid: &str) -> Result<Zeroizing<[u8; 32]>, String> {
	let vault_hash = hash_vault_id_for_mdns(canonical_vault_uuid);
	let account = format!("noted-sync-id:{vault_hash}");

	match keychain::retrieve_key(&account) {
		Ok(key) => Ok(Zeroizing::new(key)),
		Err(keychain::KeychainError::NotFound) => {
			let mut key = [0u8; 32];
			rand::thread_rng().fill_bytes(&mut key);
			keychain::store_key(&account, &key)
				.map_err(|e| format!("Failed to store sync-id key: {e}"))?;
			Ok(Zeroizing::new(key))
		}
		Err(e) => Err(format!("Failed to retrieve sync-id key: {e}")),
	}
}

/// Loads or generates the static X25519 keypair for Noise Protocol handshakes.
///
/// - Public key stored in plaintext at `.noted/sync-identity`
/// - Private key encrypted with AES-256-GCM using the Keychain-backed sync-id key
///
/// Returns `(public_key, private_key)`.
pub fn load_or_generate_static_keypair(
	vault_path: &str,
	canonical_vault_uuid: &str,
) -> Result<([u8; 32], Zeroizing<[u8; 32]>), String> {
	let noted_dir = std::path::Path::new(vault_path).join(".noted");
	std::fs::create_dir_all(&noted_dir)
		.map_err(|e| format!("Failed to create .noted dir: {e}"))?;

	let identity_path = noted_dir.join("sync-identity");

	if identity_path.exists() {
		// Load existing keypair
		debug_log("SYNC:CRYPTO", "Loading existing static keypair from sync-identity");
		let data = std::fs::read_to_string(&identity_path)
			.map_err(|e| format!("Failed to read sync-identity: {e}"))?;
		let stored: StoredKeypair = serde_json::from_str(&data)
			.map_err(|e| format!("Failed to parse sync-identity: {e}"))?;

		let pub_key_bytes = BASE64
			.decode(&stored.public_key)
			.map_err(|e| format!("Invalid public key base64: {e}"))?;
		if pub_key_bytes.len() != 32 {
			return Err(format!("Invalid public key length: {}", pub_key_bytes.len()));
		}

		let enc_key = get_or_create_sync_id_key(canonical_vault_uuid)?;
		let priv_key = decrypt_private_key(&stored.encrypted_private_key, &enc_key)?;

		let mut pub_arr = [0u8; 32];
		pub_arr.copy_from_slice(&pub_key_bytes);

		Ok((pub_arr, priv_key))
	} else {
		// Generate new keypair via snow
		debug_log("SYNC:CRYPTO", "Generating new static X25519 keypair for Noise");
		let builder = snow::Builder::new("Noise_XXpsk3_25519_AESGCM_SHA256".parse().unwrap());
		let keypair = builder
			.generate_keypair()
			.map_err(|e| format!("Failed to generate keypair: {e}"))?;

		let mut priv_arr = Zeroizing::new([0u8; 32]);
		priv_arr.copy_from_slice(&keypair.private);
		let mut pub_arr = [0u8; 32];
		pub_arr.copy_from_slice(&keypair.public);

		let enc_key = get_or_create_sync_id_key(canonical_vault_uuid)?;
		let encrypted_priv = encrypt_private_key(&priv_arr, &enc_key)?;

		let stored = StoredKeypair {
			public_key: BASE64.encode(pub_arr),
			encrypted_private_key: encrypted_priv,
		};
		let json = serde_json::to_string_pretty(&stored)
			.map_err(|e| format!("Failed to serialize sync-identity: {e}"))?;
		std::fs::write(&identity_path, json)
			.map_err(|e| format!("Failed to write sync-identity: {e}"))?;
		debug_log("SYNC:CRYPTO", "New static keypair saved to sync-identity");

		Ok((pub_arr, priv_arr))
	}
}

// ---------------------------------------------------------------------------
// Sync state & config persistence
// ---------------------------------------------------------------------------

/// Loads sync state from `.noted/sync-state.json`, returning default if absent.
pub fn load_sync_state(vault_path: &str) -> Result<SyncState, String> {
	let path = std::path::Path::new(vault_path)
		.join(".noted")
		.join("sync-state.json");

	if !path.exists() {
		return Ok(SyncState::default());
	}

	let data = std::fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read sync-state.json: {e}"))?;
	serde_json::from_str(&data).map_err(|e| format!("Failed to parse sync-state.json: {e}"))
}

/// Saves sync state to `.noted/sync-state.json`.
pub fn save_sync_state(vault_path: &str, state: &SyncState) -> Result<(), String> {
	let noted_dir = std::path::Path::new(vault_path).join(".noted");
	std::fs::create_dir_all(&noted_dir)
		.map_err(|e| format!("Failed to create .noted dir: {e}"))?;

	let path = noted_dir.join("sync-state.json");
	let json = serde_json::to_string_pretty(state)
		.map_err(|e| format!("Failed to serialize sync state: {e}"))?;
	std::fs::write(&path, json).map_err(|e| format!("Failed to write sync-state.json: {e}"))
}

/// Retention period for stale peers: 30 days in seconds.
pub const STALE_PEER_RETENTION_SECS: u64 = 30 * 24 * 3600;

/// Prunes baseline manifests and last_sync entries for peers not seen
/// within the retention period.
///
/// Also removes orphaned baseline entries that have no corresponding
/// `last_sync` timestamp (e.g., from interrupted syncs or peer ID changes).
pub fn prune_stale_peers(state: &mut SyncState, retention_secs: u64) {
	let now = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_secs();

	// Collect peers whose last_sync is older than retention period
	let stale_peers: Vec<String> = state
		.last_sync
		.iter()
		.filter(|(_, &ts)| now.saturating_sub(ts) > retention_secs)
		.map(|(id, _)| id.clone())
		.collect();

	for peer_id in &stale_peers {
		state.baseline_manifests.remove(peer_id);
		state.last_sync.remove(peer_id);
	}

	// Remove orphaned baselines (present in baseline_manifests but not in last_sync)
	let orphaned: Vec<String> = state
		.baseline_manifests
		.keys()
		.filter(|id| !state.last_sync.contains_key(*id))
		.cloned()
		.collect();
	for peer_id in &orphaned {
		state.baseline_manifests.remove(peer_id);
	}
}

/// Loads local sync config from `.noted/sync-local.json`, returning default if absent.
pub fn load_sync_local_config(vault_path: &str) -> Result<SyncLocalConfig, String> {
	let path = std::path::Path::new(vault_path)
		.join(".noted")
		.join("sync-local.json");

	if !path.exists() {
		return Ok(SyncLocalConfig::default());
	}

	let data = std::fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read sync-local.json: {e}"))?;
	serde_json::from_str(&data).map_err(|e| format!("Failed to parse sync-local.json: {e}"))
}

/// Saves local sync config to `.noted/sync-local.json`.
pub fn save_sync_local_config(vault_path: &str, config: &SyncLocalConfig) -> Result<(), String> {
	let noted_dir = std::path::Path::new(vault_path).join(".noted");
	std::fs::create_dir_all(&noted_dir)
		.map_err(|e| format!("Failed to create .noted dir: {e}"))?;

	let path = noted_dir.join("sync-local.json");
	let json = serde_json::to_string_pretty(config)
		.map_err(|e| format!("Failed to serialize sync config: {e}"))?;
	std::fs::write(&path, json).map_err(|e| format!("Failed to write sync-local.json: {e}"))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// On-disk format for the static keypair.
#[derive(serde::Serialize, serde::Deserialize)]
struct StoredKeypair {
	public_key: String,
	encrypted_private_key: EncryptedBlob,
}

/// AES-256-GCM encrypted blob (base64-encoded IV + ciphertext).
#[derive(serde::Serialize, serde::Deserialize)]
struct EncryptedBlob {
	iv: String,
	data: String,
}

/// Encrypts a 32-byte private key with AES-256-GCM.
fn encrypt_private_key(priv_key: &[u8; 32], enc_key: &[u8; 32]) -> Result<EncryptedBlob, String> {
	let cipher =
		Aes256Gcm::new_from_slice(enc_key).map_err(|e| format!("Failed to create cipher: {e}"))?;

	let mut iv_bytes = [0u8; 12];
	rand::thread_rng().fill_bytes(&mut iv_bytes);
	let nonce = Nonce::from_slice(&iv_bytes);

	let ciphertext = cipher
		.encrypt(nonce, priv_key.as_ref())
		.map_err(|e| format!("Failed to encrypt private key: {e}"))?;

	Ok(EncryptedBlob {
		iv: BASE64.encode(iv_bytes),
		data: BASE64.encode(ciphertext),
	})
}

/// Decrypts an AES-256-GCM encrypted blob back to a 32-byte private key.
fn decrypt_private_key(blob: &EncryptedBlob, enc_key: &[u8; 32]) -> Result<Zeroizing<[u8; 32]>, String> {
	let cipher =
		Aes256Gcm::new_from_slice(enc_key).map_err(|e| format!("Failed to create cipher: {e}"))?;

	let iv_bytes = BASE64
		.decode(&blob.iv)
		.map_err(|e| format!("Invalid IV base64: {e}"))?;
	if iv_bytes.len() != 12 {
		return Err(format!("Invalid IV length: expected 12, got {}", iv_bytes.len()));
	}
	let nonce = Nonce::from_slice(&iv_bytes);

	let ciphertext = BASE64
		.decode(&blob.data)
		.map_err(|e| format!("Invalid data base64: {e}"))?;

	let plaintext = cipher
		.decrypt(nonce, ciphertext.as_ref())
		.map_err(|_| "Failed to decrypt private key: wrong key or corrupted data".to_string())?;

	if plaintext.len() != 32 {
		return Err(format!(
			"Invalid private key length: expected 32, got {}",
			plaintext.len()
		));
	}

	let mut key = Zeroizing::new([0u8; 32]);
	key.copy_from_slice(&plaintext);
	Ok(key)
}

// ---------------------------------------------------------------------------
// Passphrase Keychain storage
// ---------------------------------------------------------------------------

/// Derives the Keychain account name for the sync passphrase.
///
/// Account: `noted-sync-pass:{SHA256(canonical_vault_uuid)[0..8] hex}`.
fn passphrase_account(vault_path: &str) -> Result<String, String> {
	let uuid = get_canonical_vault_uuid(vault_path)?;
	let hash = hash_vault_id_for_mdns(&uuid);
	Ok(format!("noted-sync-pass:{hash}"))
}

/// Saves a sync passphrase to the Keychain.
pub fn save_passphrase(vault_path: &str, passphrase: &str) -> Result<(), String> {
	validate_passphrase(passphrase)?;
	let account = passphrase_account(vault_path)?;
	keychain::store_bytes(&account, passphrase.as_bytes())
		.map_err(|e| format!("Failed to save passphrase: {e}"))?;
	debug_log("SYNC:CRYPTO", "Passphrase saved to Keychain");
	Ok(())
}

/// Loads the sync passphrase from the Keychain.
pub fn load_passphrase(vault_path: &str) -> Result<String, String> {
	let account = passphrase_account(vault_path)?;
	let bytes = keychain::retrieve_bytes(&account).map_err(|e| match e {
		keychain::KeychainError::NotFound => "No sync passphrase found for this vault".to_string(),
		keychain::KeychainError::UserCanceled => "canceled".to_string(),
		keychain::KeychainError::Internal(msg) => msg,
	})?;
	String::from_utf8(bytes).map_err(|e| format!("Invalid passphrase encoding: {e}"))
}

/// Checks whether a sync passphrase exists in the Keychain.
pub fn has_passphrase(vault_path: &str) -> Result<bool, String> {
	let account = passphrase_account(vault_path)?;
	Ok(keychain::has_key(&account))
}

/// Deletes the sync passphrase from the Keychain.
pub fn delete_passphrase(vault_path: &str) -> Result<(), String> {
	let account = passphrase_account(vault_path)?;
	keychain::delete_key(&account).map_err(|e| format!("Failed to delete passphrase: {e}"))?;
	debug_log("SYNC:CRYPTO", "Passphrase deleted from Keychain");
	Ok(())
}

/// Deletes the sync-identity encryption key from the Keychain.
pub fn delete_sync_id_key(vault_path: &str) -> Result<(), String> {
	let uuid = get_canonical_vault_uuid(vault_path)?;
	let hash = hash_vault_id_for_mdns(&uuid);
	let account = format!("noted-sync-id:{hash}");
	keychain::delete_key(&account).map_err(|e| format!("Failed to delete sync-id key: {e}"))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Encodes a byte slice as lowercase hex string.
fn hex_encode(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{b:02x}")).collect()
}

