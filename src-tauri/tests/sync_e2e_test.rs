use kokobrain_lib::sync::engine::{list_remote_shares, run_sync, PeerTarget};
use kokobrain_lib::sync::noise::{generate_pairing_key, parse_pairing_key};
use kokobrain_lib::sync::server::{start_server, RunningServer, ServerConfig};

struct Pair {
	server_vault: tempfile::TempDir,
	client_vault: tempfile::TempDir,
	target: PeerTarget,
	_server: RunningServer,
}

async fn setup(exposed: Vec<&str>) -> Pair {
	let server_vault = tempfile::tempdir().unwrap();
	let client_vault = tempfile::tempdir().unwrap();
	let key = generate_pairing_key().unwrap();
	let config = ServerConfig {
		vault_path: server_vault.path().to_str().unwrap().to_string(),
		device_name: "Studio".to_string(),
		psk: parse_pairing_key(&key).unwrap(),
		exposed_folders: exposed.into_iter().map(String::from).collect(),
	};
	let server = start_server(config, 0).await.unwrap();
	let target = PeerTarget {
		address: format!("127.0.0.1:{}", server.port),
		pairing_key: key,
		local_device_name: "Laptop".to_string(),
	};
	Pair { server_vault, client_vault, target, _server: server }
}

fn write(vault: &tempfile::TempDir, rel: &str, content: &str) {
	let path = vault.path().join(rel);
	std::fs::create_dir_all(path.parent().unwrap()).unwrap();
	std::fs::write(path, content).unwrap();
}

fn read(vault: &tempfile::TempDir, rel: &str) -> Option<String> {
	std::fs::read_to_string(vault.path().join(rel)).ok()
}

#[tokio::test]
async fn lists_remote_shares() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/a.md", "alpha");
	assert_eq!(list_remote_shares(&pair.target).await.unwrap(), vec!["Notes".to_string()]);
}

#[tokio::test]
async fn fresh_pull_downloads_everything_and_second_pull_skips() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/a.md", "alpha");
	write(&pair.server_vault, "Notes/sub/b.md", "beta");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];

	let s1 = run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!((s1.downloaded, s1.conflicts), (2, 0));
	assert!(s1.errors.is_empty());
	assert_eq!(read(&pair.client_vault, "Notes/a.md").unwrap(), "alpha");
	assert_eq!(read(&pair.client_vault, "Notes/sub/b.md").unwrap(), "beta");

	let s2 = run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!((s2.downloaded, s2.skipped), (0, 2));
}

#[tokio::test]
async fn remote_change_downloads_and_local_change_is_kept() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/remote.md", "r1");
	write(&pair.server_vault, "Notes/local.md", "l1");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];
	run_sync(vault, &pair.target, &subs).await.unwrap();

	// Only remote changed -> new version downloaded.
	write(&pair.server_vault, "Notes/remote.md", "r2");
	// Only local changed -> kept as-is.
	write(&pair.client_vault, "Notes/local.md", "l2");
	let s = run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!(s.downloaded, 1);
	assert_eq!(read(&pair.client_vault, "Notes/remote.md").unwrap(), "r2");
	assert_eq!(read(&pair.client_vault, "Notes/local.md").unwrap(), "l2");
}

#[tokio::test]
async fn both_changed_keeps_local_and_writes_one_conflict_copy() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/n.md", "base");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];
	run_sync(vault, &pair.target, &subs).await.unwrap();

	write(&pair.server_vault, "Notes/n.md", "remote edit");
	write(&pair.client_vault, "Notes/n.md", "local edit");
	let s1 = run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!(s1.conflicts, 1);
	assert_eq!(read(&pair.client_vault, "Notes/n.md").unwrap(), "local edit");
	let copies: Vec<_> = std::fs::read_dir(pair.client_vault.path().join("Notes"))
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
		.filter(|n| n.contains("conflict from Studio"))
		.collect();
	assert_eq!(copies.len(), 1);
	assert_eq!(
		read(&pair.client_vault, &format!("Notes/{}", copies[0])).unwrap(),
		"remote edit"
	);

	// Same divergence on a second run: no duplicate copy.
	let s2 = run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!(s2.conflicts, 0);
	let copies2 = std::fs::read_dir(pair.client_vault.path().join("Notes"))
		.unwrap()
		.filter(|e| e.as_ref().unwrap().file_name().to_string_lossy().contains("conflict from Studio"))
		.count();
	assert_eq!(copies2, 1);
}

#[tokio::test]
async fn deletions_do_not_propagate_and_local_only_files_survive() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/keep.md", "kept");
	write(&pair.server_vault, "Notes/gone.md", "going");
	let vault = pair.client_vault.path().to_str().unwrap();
	let subs = vec!["Notes".to_string()];
	run_sync(vault, &pair.target, &subs).await.unwrap();

	std::fs::remove_file(pair.server_vault.path().join("Notes/gone.md")).unwrap();
	write(&pair.client_vault, "Notes/mine.md", "local only");
	run_sync(vault, &pair.target, &subs).await.unwrap();
	assert_eq!(read(&pair.client_vault, "Notes/gone.md").unwrap(), "going");
	assert_eq!(read(&pair.client_vault, "Notes/mine.md").unwrap(), "local only");
}

#[tokio::test]
async fn unexposed_subscription_is_reported_as_skipped_folder() {
	let pair = setup(vec!["Notes"]).await;
	write(&pair.server_vault, "Notes/a.md", "alpha");
	let vault = pair.client_vault.path().to_str().unwrap();
	let s = run_sync(vault, &pair.target, &["Notes".to_string(), "Private".to_string()])
		.await
		.unwrap();
	assert_eq!(s.skipped_folders, vec!["Private".to_string()]);
}

#[tokio::test]
async fn corrupted_transfer_writes_nothing() {
	use kokobrain_lib::sync::noise::handshake_responder;
	use kokobrain_lib::sync::protocol::{FileMeta, Msg, PROTOCOL_VERSION};
	use tokio::net::TcpListener;

	let key = generate_pairing_key().unwrap();
	let psk = parse_pairing_key(&key).unwrap();
	let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
	let port = listener.local_addr().unwrap().port();

	// Fake peer that serves a manifest, then a FileEnd hash that does not
	// match the bytes it sent. The engine must reject the transfer BEFORE
	// writing anything into the vault.
	tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		let mut chan = handshake_responder(stream, &psk).await.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::Hello { .. }));
		chan.send(&Msg::HelloAck { device_name: "Evil".into(), protocol_version: PROTOCOL_VERSION })
			.await
			.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::ListShares));
		chan.send(&Msg::Shares { folders: vec!["Notes".into()] }).await.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::GetManifest { .. }));
		chan.send(&Msg::ManifestPage {
			files: vec![FileMeta { rel_path: "Notes/x.md".into(), size: 4, sha256: "aaaa".into() }],
			done: true,
		})
		.await
		.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::GetFile { .. }));
		chan.send(&Msg::FileChunk { data: b"data".to_vec() }).await.unwrap();
		chan.send(&Msg::FileEnd { sha256: "deadbeef".into() }).await.unwrap();
		// Keep the channel open until the client hangs up.
		let _ = chan.recv().await;
	});

	let vault = tempfile::tempdir().unwrap();
	let target = PeerTarget {
		address: format!("127.0.0.1:{port}"),
		pairing_key: key,
		local_device_name: "Laptop".to_string(),
	};
	let s = run_sync(vault.path().to_str().unwrap(), &target, &["Notes".to_string()])
		.await
		.unwrap();
	assert_eq!(s.downloaded, 0);
	assert_eq!(s.errors.len(), 1);
	assert!(s.errors[0].contains("hash mismatch"), "got: {:?}", s.errors);
	assert!(!vault.path().join("Notes/x.md").exists());
}

#[tokio::test]
async fn malicious_manifest_path_is_rejected_and_session_survives() {
	use kokobrain_lib::sync::noise::handshake_responder;
	use kokobrain_lib::sync::protocol::{FileMeta, Msg, PROTOCOL_VERSION};
	use tokio::net::TcpListener;

	let key = generate_pairing_key().unwrap();
	let psk = parse_pairing_key(&key).unwrap();
	let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
	let port = listener.local_addr().unwrap().port();

	// Fake peer that advertises a manifest containing both a normal file and
	// a path-traversal entry, serves the normal file, and replies with a
	// clean per-file Msg::Error for anything else. The engine must reject
	// the traversal path before ever requesting it, and the recoverable
	// Msg::Error reply must not abort the session.
	tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		let mut chan = handshake_responder(stream, &psk).await.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::Hello { .. }));
		chan.send(&Msg::HelloAck { device_name: "Evil".into(), protocol_version: PROTOCOL_VERSION })
			.await
			.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::ListShares));
		chan.send(&Msg::Shares { folders: vec!["Notes".into()] }).await.unwrap();
		assert!(matches!(chan.recv().await.unwrap(), Msg::GetManifest { .. }));
		chan.send(&Msg::ManifestPage {
			files: vec![
				FileMeta { rel_path: "Notes/a.md".into(), size: 5, sha256: "unused".into() },
				FileMeta { rel_path: "Notes/../evil.md".into(), size: 4, sha256: "unused".into() },
			],
			done: true,
		})
		.await
		.unwrap();
		loop {
			match chan.recv().await {
				Ok(Msg::GetFile { rel_path }) if rel_path == "Notes/a.md" => {
					chan.send(&Msg::FileChunk { data: b"alpha".to_vec() }).await.unwrap();
					let sha256 = kokobrain_lib::sync::manifest::hash_bytes(b"alpha");
					chan.send(&Msg::FileEnd { sha256 }).await.unwrap();
				}
				Ok(Msg::GetFile { .. }) => {
					chan.send(&Msg::Error { message: "no such file".into() }).await.unwrap();
				}
				_ => break,
			}
		}
	});

	let vault = tempfile::tempdir().unwrap();
	let target = PeerTarget {
		address: format!("127.0.0.1:{port}"),
		pairing_key: key,
		local_device_name: "Laptop".to_string(),
	};
	let s = run_sync(vault.path().to_str().unwrap(), &target, &["Notes".to_string()]).await.unwrap();

	assert_eq!(s.downloaded, 1);
	assert_eq!(read(&vault, "Notes/a.md").as_deref(), Some("alpha"));
	assert!(
		s.errors.iter().any(|e| e.contains("rejected remote path") && e.contains("Notes/../evil.md")),
		"got: {:?}",
		s.errors
	);
	// The traversal entry must never reach a GetFile request, so nothing is
	// written for it anywhere: neither at the resolved escape target...
	assert!(!vault.path().join("evil.md").exists());
	// ...nor inside the exposed folder itself. "Notes/" must contain only the
	// legitimately downloaded file.
	let notes_entries: Vec<String> = std::fs::read_dir(vault.path().join("Notes"))
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
		.collect();
	assert_eq!(notes_entries, vec!["a.md".to_string()]);
}

#[tokio::test]
async fn wrong_pairing_key_fails_with_handshake_error() {
	let pair = setup(vec!["Notes"]).await;
	let bad = PeerTarget {
		address: pair.target.address.clone(),
		pairing_key: generate_pairing_key().unwrap(),
		local_device_name: "Laptop".to_string(),
	};
	let err = run_sync(pair.client_vault.path().to_str().unwrap(), &bad, &["Notes".to_string()])
		.await
		.unwrap_err();
	assert!(err.contains("handshake") || err.contains("pairing"), "got: {err}");
}

#[tokio::test]
async fn unreachable_peer_fails_fast_with_clear_error() {
	let target = PeerTarget {
		// Port 1 on localhost is essentially never listening.
		address: "127.0.0.1:1".to_string(),
		pairing_key: generate_pairing_key().unwrap(),
		local_device_name: "Laptop".to_string(),
	};
	let vault = tempfile::tempdir().unwrap();
	let err = run_sync(vault.path().to_str().unwrap(), &target, &["Notes".to_string()])
		.await
		.unwrap_err();
	assert!(err.contains("127.0.0.1:1"), "got: {err}");
}
