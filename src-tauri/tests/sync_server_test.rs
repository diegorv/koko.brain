use kokobrain_lib::sync::manifest::hash_bytes;
use kokobrain_lib::sync::noise::{generate_pairing_key, handshake_initiator, parse_pairing_key, NoiseChannel};
use kokobrain_lib::sync::protocol::{FileMeta, Msg, PROTOCOL_VERSION};
use kokobrain_lib::sync::server::{start_server, ServerConfig};
use tokio::net::TcpStream;

struct TestPeer {
	_vault: tempfile::TempDir,
	psk: [u8; 32],
	port: u16,
	server: kokobrain_lib::sync::server::RunningServer,
}

async fn spawn_test_server() -> TestPeer {
	let vault = tempfile::tempdir().unwrap();
	let root = vault.path();
	std::fs::create_dir_all(root.join("Notes/sub")).unwrap();
	std::fs::write(root.join("Notes/a.md"), "alpha").unwrap();
	std::fs::write(root.join("Notes/sub/b.md"), "beta").unwrap();
	std::fs::write(root.join("Notes/big.bin"), vec![7u8; 100_000]).unwrap();
	std::fs::write(root.join("Notes/empty.md"), "").unwrap();
	std::fs::write(root.join("secret.md"), "do not serve").unwrap();
	let psk = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
	let config = ServerConfig {
		vault_path: root.to_str().unwrap().to_string(),
		device_name: "Studio".to_string(),
		psk,
		exposed_folders: vec!["Notes".to_string(), "Ghost".to_string()],
	};
	let server = start_server(config, 0).await.unwrap();
	let port = server.port;
	TestPeer { _vault: vault, psk, port, server }
}

async fn connect(peer: &TestPeer) -> NoiseChannel<TcpStream> {
	let stream = TcpStream::connect(("127.0.0.1", peer.port)).await.unwrap();
	let mut chan = handshake_initiator(stream, &peer.psk).await.unwrap();
	chan.send(&Msg::Hello { device_name: "Laptop".into(), protocol_version: PROTOCOL_VERSION })
		.await
		.unwrap();
	match chan.recv().await.unwrap() {
		Msg::HelloAck { device_name, protocol_version } => {
			assert_eq!(device_name, "Studio");
			assert_eq!(protocol_version, PROTOCOL_VERSION);
		}
		other => panic!("expected HelloAck, got {other:?}"),
	}
	chan
}

#[tokio::test]
async fn list_shares_returns_only_existing_folders() {
	let peer = spawn_test_server().await;
	let mut chan = connect(&peer).await;
	chan.send(&Msg::ListShares).await.unwrap();
	// "Ghost" is configured but missing on disk, so it is filtered out.
	assert_eq!(chan.recv().await.unwrap(), Msg::Shares { folders: vec!["Notes".to_string()] });
}

#[tokio::test]
async fn manifest_and_file_download_roundtrip() {
	let peer = spawn_test_server().await;
	let mut chan = connect(&peer).await;
	chan.send(&Msg::GetManifest { folder: "Notes".into() }).await.unwrap();
	let mut files: Vec<FileMeta> = Vec::new();
	loop {
		match chan.recv().await.unwrap() {
			Msg::ManifestPage { files: page, done } => {
				files.extend(page);
				if done {
					break;
				}
			}
			other => panic!("expected ManifestPage, got {other:?}"),
		}
	}
	let paths: Vec<&str> = files.iter().map(|f| f.rel_path.as_str()).collect();
	assert_eq!(paths, vec!["Notes/a.md", "Notes/big.bin", "Notes/empty.md", "Notes/sub/b.md"]);

	// Download the >48 KiB file: expect multiple chunks + verified hash.
	chan.send(&Msg::GetFile { rel_path: "Notes/big.bin".into() }).await.unwrap();
	let mut bytes = Vec::new();
	let mut chunks = 0;
	loop {
		match chan.recv().await.unwrap() {
			Msg::FileChunk { data } => {
				chunks += 1;
				bytes.extend_from_slice(&data);
			}
			Msg::FileEnd { sha256 } => {
				assert_eq!(sha256, hash_bytes(&bytes));
				break;
			}
			other => panic!("expected chunk/end, got {other:?}"),
		}
	}
	assert!(chunks >= 2);
	assert_eq!(bytes, vec![7u8; 100_000]);

	// Empty file: zero chunks then FileEnd.
	chan.send(&Msg::GetFile { rel_path: "Notes/empty.md".into() }).await.unwrap();
	assert_eq!(chan.recv().await.unwrap(), Msg::FileEnd { sha256: hash_bytes(b"") });
}

#[tokio::test]
async fn unshared_and_traversal_paths_are_refused() {
	let peer = spawn_test_server().await;
	let mut chan = connect(&peer).await;
	for req in [
		Msg::GetManifest { folder: "Secret".into() },
		Msg::GetFile { rel_path: "secret.md".into() },
		Msg::GetFile { rel_path: "Notes/../secret.md".into() },
		Msg::GetFile { rel_path: "/etc/passwd".into() },
	] {
		chan.send(&req).await.unwrap();
		match chan.recv().await.unwrap() {
			Msg::Error { .. } => {}
			other => panic!("expected Error for {req:?}, got {other:?}"),
		}
	}
}

#[tokio::test]
async fn wrong_psk_cannot_complete_session() {
	let peer = spawn_test_server().await;
	let wrong = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
	let stream = TcpStream::connect(("127.0.0.1", peer.port)).await.unwrap();
	// The responder detects the bad PSK on handshake message 3 and drops the
	// connection; the initiator notices no later than its first recv.
	let result = async {
		let mut chan = handshake_initiator(stream, &wrong).await?;
		chan.send(&Msg::Hello { device_name: "Laptop".into(), protocol_version: PROTOCOL_VERSION }).await?;
		chan.recv().await
	}
	.await;
	assert!(result.is_err());
}

#[tokio::test]
async fn protocol_version_mismatch_is_rejected() {
	let peer = spawn_test_server().await;
	let stream = TcpStream::connect(("127.0.0.1", peer.port)).await.unwrap();
	let mut chan = handshake_initiator(stream, &peer.psk).await.unwrap();
	chan.send(&Msg::Hello { device_name: "Laptop".into(), protocol_version: 999 }).await.unwrap();
	match chan.recv().await.unwrap() {
		Msg::Error { message } => assert!(message.contains("version")),
		other => panic!("expected Error, got {other:?}"),
	}
}

#[tokio::test]
async fn stop_closes_the_listener() {
	let peer = spawn_test_server().await;
	let port = peer.port;
	peer.server.stop();
	// Give the accept loop a moment to observe shutdown and drop the socket.
	tokio::time::sleep(std::time::Duration::from_millis(100)).await;
	assert!(TcpStream::connect(("127.0.0.1", port)).await.is_err());
}

#[tokio::test]
async fn stop_unblocks_while_a_session_is_stalled() {
	let peer = spawn_test_server().await;
	let port = peer.port;
	// A raw TCP connection that never sends bytes stalls in the handshake.
	// stop() must still take effect via the shutdown race in the accept loop.
	let _stalled = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
	tokio::time::sleep(std::time::Duration::from_millis(50)).await;
	peer.server.stop();
	tokio::time::sleep(std::time::Duration::from_millis(100)).await;
	assert!(TcpStream::connect(("127.0.0.1", port)).await.is_err());
}

// spawn_test_server()/TestPeer hardcode their vault layout (no Private/
// folder or symlink), so this test builds its own vault + server rather
// than reusing them.
#[cfg(unix)]
#[tokio::test]
async fn symlink_within_exposed_folder_is_refused() {
	use std::os::unix::fs::symlink;

	let vault = tempfile::tempdir().unwrap();
	let root = vault.path();
	std::fs::create_dir_all(root.join("Notes")).unwrap();
	std::fs::create_dir_all(root.join("Private")).unwrap();
	std::fs::write(root.join("Notes/a.md"), "alpha").unwrap();
	std::fs::write(root.join("Private/secret.md"), "top secret").unwrap();
	// Notes/leak.md resolves inside the vault but escapes the exposed
	// "Notes" folder into "Private" — the scenario from the security finding.
	symlink(root.join("Private/secret.md"), root.join("Notes/leak.md")).unwrap();

	let psk = parse_pairing_key(&generate_pairing_key().unwrap()).unwrap();
	let config = ServerConfig {
		vault_path: root.to_str().unwrap().to_string(),
		device_name: "Studio".to_string(),
		psk,
		exposed_folders: vec!["Notes".to_string()],
	};
	let server = start_server(config, 0).await.unwrap();
	let port = server.port;

	let stream = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
	let mut chan = handshake_initiator(stream, &psk).await.unwrap();
	chan.send(&Msg::Hello { device_name: "Laptop".into(), protocol_version: PROTOCOL_VERSION })
		.await
		.unwrap();
	match chan.recv().await.unwrap() {
		Msg::HelloAck { device_name, protocol_version } => {
			assert_eq!(device_name, "Studio");
			assert_eq!(protocol_version, PROTOCOL_VERSION);
		}
		other => panic!("expected HelloAck, got {other:?}"),
	}

	// The symlink must be refused — not a FileChunk/FileEnd carrying the
	// secret's bytes.
	chan.send(&Msg::GetFile { rel_path: "Notes/leak.md".into() }).await.unwrap();
	match chan.recv().await.unwrap() {
		Msg::Error { .. } => {}
		other => panic!("expected Error for symlink escape, got {other:?}"),
	}

	// Sanity: a real file inside the exposed folder still serves normally,
	// proving the tighter check didn't break normal serving.
	chan.send(&Msg::GetFile { rel_path: "Notes/a.md".into() }).await.unwrap();
	let mut bytes = Vec::new();
	loop {
		match chan.recv().await.unwrap() {
			Msg::FileChunk { data } => bytes.extend_from_slice(&data),
			Msg::FileEnd { sha256 } => {
				assert_eq!(sha256, hash_bytes(&bytes));
				break;
			}
			other => panic!("expected chunk/end, got {other:?}"),
		}
	}
	assert_eq!(bytes, b"alpha");

	server.stop();
}
