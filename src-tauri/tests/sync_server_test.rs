use std::net::IpAddr;
use std::time::Instant;

use noted_lib::sync::crypto::SyncKeys;
use noted_lib::sync::server::{
	read_vault_file, safe_open_file, start_server, write_vault_file, RateLimiter,
};
use tempfile::TempDir;
use tokio::time::Duration;
use zeroize::Zeroizing;

// ---------------------------------------------------------------------------
// Path traversal tests
// ---------------------------------------------------------------------------

#[test]
fn path_traversal_dotdot() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	let result = safe_open_file(vault, "../etc/passwd", false);
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("traversal"));
}

#[test]
fn path_traversal_encoded() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Even with encoded dots, the ".." check catches it
	let result = safe_open_file(vault, "notes/../../../etc/passwd", false);
	assert!(result.is_err());
}

#[test]
fn path_traversal_symlink() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Create a symlink inside the vault pointing outside
	let link_path = tmp.path().join("evil-link.md");
	std::os::unix::fs::symlink("/etc/passwd", &link_path).unwrap();

	let result = safe_open_file(vault, "evil-link.md", false);
	assert!(result.is_err());
}

#[test]
fn path_valid_inside_vault() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Create a valid file inside the vault
	let notes_dir = tmp.path().join("notes");
	std::fs::create_dir_all(&notes_dir).unwrap();
	std::fs::write(notes_dir.join("hello.md"), "# Hello").unwrap();

	let result = safe_open_file(vault, "notes/hello.md", false);
	assert!(result.is_ok());
}

#[test]
fn safe_open_file_nofollow() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Create a real file outside the vault
	let outside = TempDir::new().unwrap();
	let secret = outside.path().join("secret.txt");
	std::fs::write(&secret, "secret data").unwrap();

	// Symlink inside vault → outside file
	let link_path = tmp.path().join("linked.md");
	std::os::unix::fs::symlink(&secret, &link_path).unwrap();

	// O_NOFOLLOW should prevent opening the symlink
	let result = safe_open_file(vault, "linked.md", false);
	assert!(result.is_err());
}

// ---------------------------------------------------------------------------
// Rate limiter tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn rate_limiter_allows_under_limit() {
	let limiter = RateLimiter::new();
	let ip: IpAddr = "192.168.1.1".parse().unwrap();

	assert!(limiter.check(ip).await);
	assert!(limiter.check(ip).await);
	assert!(limiter.check(ip).await);
}

#[tokio::test]
async fn rate_limiter_blocks_over_limit() {
	let limiter = RateLimiter::new();
	let ip: IpAddr = "192.168.1.1".parse().unwrap();

	// Exhaust the limit (3 per minute)
	assert!(limiter.check(ip).await);
	assert!(limiter.check(ip).await);
	assert!(limiter.check(ip).await);
	// 4th should be blocked
	assert!(!limiter.check(ip).await);
}

#[tokio::test]
async fn rate_limiter_resets_after_minute() {
	let limiter = RateLimiter::new();
	let ip: IpAddr = "192.168.1.1".parse().unwrap();

	// Manually insert old timestamps to simulate time passing
	limiter
		.insert_test_timestamps(ip, vec![
			Instant::now() - Duration::from_secs(61),
			Instant::now() - Duration::from_secs(61),
			Instant::now() - Duration::from_secs(61),
		])
		.await;

	// Old entries should be cleaned up, allowing new attempts
	assert!(limiter.check(ip).await);
}

// ---------------------------------------------------------------------------
// File I/O tests
// ---------------------------------------------------------------------------

#[test]
fn write_vault_file_sets_mtime() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	let mtime = 1700000000u64; // 2023-11-14
	write_vault_file(vault, "test.md", b"# Test", mtime).unwrap();

	let meta = std::fs::metadata(tmp.path().join("test.md")).unwrap();
	let actual_mtime = meta
		.modified()
		.unwrap()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs();

	assert_eq!(actual_mtime, mtime);
}

#[test]
fn read_vault_file_returns_content_and_mtime() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	let content = b"# Hello World";
	let mtime = 1700000000u64;
	write_vault_file(vault, "note.md", content, mtime).unwrap();

	let (read_content, read_mtime) = read_vault_file(vault, "note.md").unwrap();
	assert_eq!(read_content, content);
	assert_eq!(read_mtime, mtime);
}

// ---------------------------------------------------------------------------
// Server lifecycle test
// ---------------------------------------------------------------------------

#[tokio::test]
async fn server_start_and_stop() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Create minimal vault structure
	let noted_dir = tmp.path().join(".noted");
	std::fs::create_dir_all(&noted_dir).unwrap();

	// Generate keys for the test
	let builder =
		snow::Builder::new("Noise_XXpsk3_25519_AESGCM_SHA256".parse().unwrap());
	let keypair = builder.generate_keypair().unwrap();

	let mut static_priv = Zeroizing::new([0u8; 32]);
	static_priv.copy_from_slice(&keypair.private);

	let sync_keys = SyncKeys {
		psk_key: Zeroizing::new([1u8; 32]),
		hmac_key: Zeroizing::new([2u8; 32]),
	};

	let server = start_server(vault.to_string(), 0, sync_keys, static_priv)
		.await
		.unwrap();

	// Server should be listening on a port
	assert_ne!(server.addr.port(), 0);

	// Stop gracefully
	server.stop().await;
}
