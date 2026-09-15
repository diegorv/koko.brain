//! Boundary tests for `ModelManager::download_model` (`src/semantic/model.rs`).
//!
//! EXCLUDED: real HuggingFace model downloads (~571MB) and any ONNX inference.
//! These tests cover the download orchestration boundary only: zero-download
//! models (the loop body — including the `(idx + 1) / total_files` divisions
//! on lines 124/130 — never executes, so no NaN can reach `on_progress`), the
//! skip-existing fast path (which exercises the line 124 division with a real
//! divisor), and the streaming success/error paths against a one-shot loopback
//! HTTP server.

use kokobrain_lib::semantic::model::{ManagedModel, ModelManager, BGE_M3_EMBEDDER};
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tempfile::tempdir;

/// A managed model with zero downloads and zero required files.
static EMPTY_MODEL: ManagedModel = ManagedModel {
	name: "empty-model",
	downloads: &[],
	files: &[],
	embedding_dimensions: None,
};

/// Serves one GET for `expected_path`, ignoring unrelated localhost probes.
/// Connections and the server lifetime are bounded so a failed test cannot
/// leave the fixture blocked indefinitely. Returns the loopback base URL.
fn spawn_one_shot_server(
	status_line: &'static str,
	body: &'static [u8],
	expected_path: &'static str,
) -> String {
	let listener = TcpListener::bind("127.0.0.1:0").expect("bind loopback");
	let addr = listener.local_addr().expect("local addr");
	listener.set_nonblocking(true).expect("nonblocking listener");
	std::thread::spawn(move || {
		let deadline = Instant::now() + Duration::from_secs(10);
		'connections: while Instant::now() < deadline {
			let mut stream = match listener.accept() {
				Ok((stream, _)) => stream,
				Err(err) if err.kind() == ErrorKind::WouldBlock => {
					std::thread::sleep(Duration::from_millis(10));
					continue;
				}
				Err(err) if err.kind() == ErrorKind::Interrupted => continue,
				Err(err) => panic!("accept loopback request: {err}"),
			};
			stream.set_nonblocking(false).expect("blocking connection");

			let mut request = Vec::new();
			let mut buf = [0u8; 1024];
			loop {
				let remaining = deadline.saturating_duration_since(Instant::now());
				if remaining.is_zero() {
					break 'connections;
				}
				stream
					.set_read_timeout(Some(remaining.min(Duration::from_secs(1))))
					.expect("request read timeout");
				match stream.read(&mut buf) {
					Ok(0) => continue 'connections,
					Ok(n) => request.extend_from_slice(&buf[..n]),
					Err(err) if err.kind() == ErrorKind::Interrupted => continue,
					Err(_) => continue 'connections,
				}
				if request.len() > 8192 {
					continue 'connections;
				}
				if request.windows(4).any(|bytes| bytes == b"\r\n\r\n") {
					break;
				}
			}

			let request = String::from_utf8_lossy(&request);
			let mut request_line = request.lines().next().unwrap_or_default().split_whitespace();
			let expected = request_line.next() == Some("GET")
				&& request_line.next() == Some(expected_path);
			let remaining = deadline.saturating_duration_since(Instant::now());
			if remaining.is_zero() {
				break;
			}
			stream
				.set_write_timeout(Some(remaining.min(Duration::from_secs(1))))
				.expect("response write timeout");
			if !expected {
				// Local service discovery may send HEAD / before the test's GET.
				let _ = stream.write_all(b"HTTP/1.1 204 No Content\r\nconnection: close\r\n\r\n");
				continue;
			}
			let header = format!(
				"HTTP/1.1 {}\r\ncontent-length: {}\r\nconnection: close\r\n\r\n",
				status_line,
				body.len()
			);
			stream.write_all(header.as_bytes()).expect("write response headers");
			stream.write_all(body).expect("write response body");
			return;
		}
		panic!("timed out waiting for GET {expected_path}");
	});
	format!("http://{}", addr)
}

#[test]
fn loopback_server_ignores_probe_and_waits_for_complete_get_headers() {
	let base = spawn_one_shot_server("200 OK", b"fixture-body", "/fixture.bin");
	let addr = base.strip_prefix("http://").unwrap();

	// A HEAD probe must not consume the one download.
	let mut probe = TcpStream::connect(addr).expect("connect HEAD probe");
	probe.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
	probe.write_all(b"HEAD / HTTP/1.1\r\nHost: localhost\r\n\r\n").unwrap();
	let mut response = Vec::new();
	probe.read_to_end(&mut response).expect("read probe response");
	drop(probe);

	let mut download = TcpStream::connect(addr).expect("connect expected GET after probe");
	download.set_read_timeout(Some(Duration::from_millis(50))).unwrap();
	download.write_all(b"GET /fixture.bin HTTP/1.1\r\n").unwrap();
	let early_response = download.read(&mut [0u8; 1]);
	assert!(
		matches!(early_response, Err(ref err) if matches!(err.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut)),
		"server must wait for complete headers, got {early_response:?}"
	);
	download.write_all(b"Host: localhost\r\n\r\n").unwrap();
	download.set_read_timeout(Some(Duration::from_secs(2))).unwrap();
	response.clear();
	download.read_to_end(&mut response).expect("read download response");
	assert!(response.starts_with(b"HTTP/1.1 200 OK\r\n"));
	assert!(response.ends_with(b"\r\n\r\nfixture-body"));
}

/// Builds a `&'static ManagedModel` with a single download pointing at `url`.
/// `ModelManager::new` requires `'static` references, so test models with
/// runtime-known URLs (ephemeral ports) are leaked — fine for tests.
fn leaked_model(name: &'static str, url: String, file: &'static str) -> &'static ManagedModel {
	let url: &'static str = Box::leak(url.into_boxed_str());
	let downloads: &'static [(&'static str, &'static str)] =
		Box::leak(vec![(url, file)].into_boxed_slice());
	let files: &'static [&'static str] = Box::leak(vec![file].into_boxed_slice());
	Box::leak(Box::new(ManagedModel {
		name,
		downloads,
		files,
		embedding_dimensions: None,
	}))
}

// --- zero downloads ---

#[tokio::test]
async fn download_model_with_zero_downloads_succeeds() {
	let tmp = tempdir().unwrap();
	let mgr = ModelManager::new(tmp.path(), &EMPTY_MODEL);

	let progress: Mutex<Vec<f32>> = Mutex::new(Vec::new());
	let result = mgr
		.download_model(|p| progress.lock().unwrap().push(p))
		.await;

	let path = result.expect("zero-download model should succeed");
	assert_eq!(path, tmp.path().join(".kokobrain/models/empty-model"));
	assert!(path.is_dir(), "models dir should be created even with no downloads");

	// The per-file loop never runs, so the only progress callback is the
	// final 1.0 — no division by zero, no NaN ever reaches the callback.
	let values = progress.lock().unwrap().clone();
	assert_eq!(values, vec![1.0]);
	assert!(values.iter().all(|v| v.is_finite()), "no NaN/inf progress values");
}

#[test]
fn is_model_available_is_vacuously_true_for_zero_required_files() {
	// `files.iter().all(...)` on an empty slice is true — a model that
	// requires no files is trivially "available" without any download.
	let tmp = tempdir().unwrap();
	let mgr = ModelManager::new(tmp.path(), &EMPTY_MODEL);
	assert!(mgr.is_model_available());
}

// --- skip-existing fast path ---

#[tokio::test]
async fn download_model_skips_existing_files_and_reports_progress() {
	let tmp = tempdir().unwrap();
	let model_dir = tmp.path().join(".kokobrain/models/bge-m3");
	std::fs::create_dir_all(&model_dir).unwrap();
	std::fs::write(model_dir.join("model.onnx"), b"fake-onnx").unwrap();
	std::fs::write(model_dir.join("tokenizer.json"), b"{}").unwrap();

	let mgr = ModelManager::new(tmp.path(), &BGE_M3_EMBEDDER);
	let progress: Mutex<Vec<f32>> = Mutex::new(Vec::new());
	let result = mgr
		.download_model(|p| progress.lock().unwrap().push(p))
		.await;

	assert_eq!(result.expect("should succeed without network"), model_dir);

	// Skip path: (idx + 1) / total_files for each of the 2 files, then the
	// final 1.0 — pins the line 124 division with a real divisor.
	let values = progress.lock().unwrap().clone();
	assert_eq!(values, vec![0.5, 1.0, 1.0]);

	// Existing files must be left untouched.
	assert_eq!(std::fs::read(model_dir.join("model.onnx")).unwrap(), b"fake-onnx");
	assert_eq!(std::fs::read(model_dir.join("tokenizer.json")).unwrap(), b"{}");
}

// --- streaming download success ---

#[tokio::test]
async fn download_model_streams_file_from_server_and_renames_temp() {
	let body: &'static [u8] = b"fake-model-bytes";
	let base = spawn_one_shot_server("200 OK", body, "/model.bin");
	let model = leaked_model("local-ok", format!("{}/model.bin", base), "model.bin");

	let tmp = tempdir().unwrap();
	let mgr = ModelManager::new(tmp.path(), model);
	let progress: Mutex<Vec<f32>> = Mutex::new(Vec::new());
	let result = mgr
		.download_model(|p| progress.lock().unwrap().push(p))
		.await;

	let model_dir = result.expect("local download should succeed");
	let dest = model_dir.join("model.bin");
	assert_eq!(std::fs::read(&dest).unwrap(), body, "downloaded bytes match served body");
	assert!(
		!model_dir.join("model.tmp").exists(),
		"temp file must be renamed away on success"
	);
	assert!(mgr.is_model_available(), "model becomes available after download");

	let values = progress.lock().unwrap().clone();
	assert_eq!(values.last().copied(), Some(1.0), "progress must end at 1.0");
	assert!(
		values.iter().all(|v| (0.0..=1.0).contains(v)),
		"all progress values within [0, 1], got {:?}",
		values
	);
}

// --- download error path ---

#[tokio::test]
async fn download_model_propagates_http_error_status() {
	let base = spawn_one_shot_server("404 Not Found", b"", "/missing.bin");
	let model = leaked_model("local-404", format!("{}/missing.bin", base), "missing.bin");

	let tmp = tempdir().unwrap();
	let mgr = ModelManager::new(tmp.path(), model);
	let err = mgr
		.download_model(|_| {})
		.await
		.expect_err("404 must fail the download");

	assert!(
		err.contains("Download failed with status"),
		"error should carry the HTTP status, got: {err}"
	);
	let dest = tmp
		.path()
		.join(".kokobrain/models/local-404")
		.join("missing.bin");
	assert!(!dest.exists(), "no partial file should be left behind");
	assert!(!mgr.is_model_available());
}
