//! `GET /v1/asset/<rel>` on the loopback server (`remote::server`,
//! `remote::asset`): vault files for `<img>`, `<audio>`, `<video>` and PDF,
//! through the containment rule (`remote::dispatch::asset_path`). A raw TCP
//! client drives the real server over a temp vault.

use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpStream};
use std::sync::Arc;
use std::time::Duration;

use kokobrain_lib::remote::access::Route;
use kokobrain_lib::remote::asset::{asset_type, is_cross_site};
use kokobrain_lib::remote::csp::browser_csp;
use kokobrain_lib::remote::dispatch::asset_path;
use kokobrain_lib::remote::host::VaultRootCell;
use kokobrain_lib::remote::rpc::RpcHost;
use kokobrain_lib::remote::server::{AssetLookup, RemoteServer, ServedAsset};
use serde_json::Value;
use tempfile::TempDir;

const PNG: &[u8] = b"\x89PNG\r\n\x1a\nfake";

fn bundle() -> AssetLookup {
	let mut files: HashMap<String, ServedAsset> = HashMap::new();
	files.insert("index.html".into(), ServedAsset { bytes: b"<html></html>".to_vec(), mime_type: "text/html".into() });
	Arc::new(move |path: &str| files.get(path).cloned())
}

fn host(root: Option<String>) -> Arc<RpcHost> {
	let cell = Arc::new(VaultRootCell::default());
	cell.set(root);
	Arc::new(RpcHost {
		server_version: "0.0.0".into(),
		vault_root: cell,
		index_version: Arc::new(|| 0),
		events: Arc::default(),
		dispatch: Arc::new(|_, _| Ok(Value::Null)),
	})
}

struct Fixture {
	dir: TempDir,
	server: RemoteServer,
}

impl Fixture {
	fn new() -> Self {
		let dir = TempDir::new().unwrap();
		let p = dir.path();
		fs::write(p.join("img.png"), PNG).unwrap();
		fs::create_dir(p.join("media")).unwrap();
		fs::write(p.join("media/clip one.mp4"), b"video").unwrap();
		fs::write(p.join("doc.pdf"), b"%PDF-1.7").unwrap();
		fs::write(p.join("page.html"), b"<script>alert(1)</script>").unwrap();
		fs::write(p.join("pic.svg"), b"<svg onload=\"alert(1)\"/>").unwrap();
		fs::write(p.join("note.md"), b"# Note").unwrap();
		fs::create_dir(p.join(".kokobrain")).unwrap();
		fs::write(p.join(".kokobrain/settings.json"), br#"{"todoist":{"apiToken":"secret"}}"#).unwrap();
		fs::write(p.join(".kokobrain/kokobrain.db"), b"db").unwrap();
		fs::create_dir(p.join(".git")).unwrap();
		fs::write(p.join(".git/config"), b"[remote]").unwrap();
		let root = p.to_string_lossy().to_string();
		let server = RemoteServer::start_with_rpc(0, bundle(), Some(host(Some(root)))).unwrap();
		Self { dir, server }
	}

	fn root(&self) -> String {
		self.dir.path().to_string_lossy().to_string()
	}

	fn get(&self, target: &str) -> Reply {
		self.get_with(target, "")
	}

	fn get_with(&self, target: &str, extra: &str) -> Reply {
		let port = self.server.port();
		send(port, &format!("GET {target} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n{extra}\r\n"))
	}
}

struct Reply {
	status: u16,
	headers: HashMap<String, String>,
	body: Vec<u8>,
}

impl Reply {
	fn header(&self, name: &str) -> Option<&str> {
		self.headers.get(name).map(String::as_str)
	}
}

fn send(port: u16, raw: &str) -> Reply {
	let mut stream = TcpStream::connect((Ipv4Addr::LOCALHOST, port)).expect("connect");
	stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
	stream.write_all(raw.as_bytes()).unwrap();
	let mut buf = Vec::new();
	stream.read_to_end(&mut buf).unwrap();
	let split = buf.windows(4).position(|w| w == b"\r\n\r\n").expect("header end");
	let head = String::from_utf8(buf[..split].to_vec()).unwrap();
	let body = buf[split + 4..].to_vec();
	let mut lines = head.split("\r\n");
	let status: u16 = lines.next().unwrap().split(' ').nth(1).unwrap().parse().unwrap();
	let headers = lines
		.filter_map(|l| l.split_once(':'))
		.map(|(k, v)| (k.trim().to_ascii_lowercase(), v.trim().to_string()))
		.collect();
	Reply { status, headers, body }
}

// ── serving ─────────────────────────────────────────────────────────────

#[test]
fn an_image_is_served_inline_with_its_type() {
	let f = Fixture::new();
	let reply = f.get("/v1/asset/img.png");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.body, PNG);
	assert_eq!(reply.header("content-type"), Some("image/png"));
	assert_eq!(reply.header("x-content-type-options"), Some("nosniff"));
	assert_eq!(reply.header("content-disposition"), None);
	assert_eq!(reply.header("content-security-policy"), None);
}

#[test]
fn a_percent_encoded_path_in_a_folder_is_decoded() {
	let f = Fixture::new();
	let reply = f.get("/v1/asset/media/clip%20one.mp4?t=1");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.body, b"video");
	assert_eq!(reply.header("content-type"), Some("video/mp4"));
}

#[test]
fn a_pdf_is_served_inline() {
	let f = Fixture::new();
	let reply = f.get("/v1/asset/doc.pdf");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.header("content-type"), Some("application/pdf"));
	assert_eq!(reply.header("content-disposition"), None);
}

#[test]
fn an_html_asset_gets_the_sandbox_and_attachment_headers() {
	let f = Fixture::new();
	let reply = f.get("/v1/asset/page.html");
	assert_eq!(reply.status, 200);
	assert_eq!(reply.header("content-security-policy"), Some("sandbox"));
	assert_eq!(reply.header("content-disposition"), Some("attachment"));
	assert_eq!(reply.header("x-content-type-options"), Some("nosniff"));
	assert_eq!(reply.header("content-type"), Some("application/octet-stream"));
}

#[test]
fn svg_and_text_are_not_inline() {
	let f = Fixture::new();
	for target in ["/v1/asset/pic.svg", "/v1/asset/note.md"] {
		let reply = f.get(target);
		assert_eq!(reply.status, 200, "{target}");
		assert_eq!(reply.header("content-security-policy"), Some("sandbox"), "{target}");
		assert_eq!(reply.header("content-disposition"), Some("attachment"), "{target}");
		assert_eq!(reply.header("content-type"), Some("application/octet-stream"), "{target}");
	}
}

#[test]
fn head_returns_the_headers_without_the_body() {
	let f = Fixture::new();
	let port = f.server.port();
	let reply = send(port, &format!("HEAD /v1/asset/img.png HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert_eq!(reply.status, 200);
	assert_eq!(reply.header("content-type"), Some("image/png"));
	assert_eq!(reply.header("content-length"), Some(PNG.len().to_string().as_str()));
	assert!(reply.body.is_empty());
}

#[test]
fn head_on_a_folder_is_not_found() {
	let f = Fixture::new();
	let port = f.server.port();
	let reply = send(port, &format!("HEAD /v1/asset/media HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert_eq!(reply.status, 404);
}

#[test]
fn a_missing_file_is_not_found() {
	let f = Fixture::new();
	assert_eq!(f.get("/v1/asset/nope.png").status, 404);
}

// ── containment ─────────────────────────────────────────────────────────

#[test]
fn kokobrain_files_are_refused_in_any_spelling() {
	let f = Fixture::new();
	for target in [
		"/v1/asset/.kokobrain/settings.json",
		"/v1/asset/.kokobrain/kokobrain.db",
		"/v1/asset/.KokoBrain/settings.json",
		"/v1/asset/%2Ekokobrain/settings.json",
		"/v1/asset/.kokobrain",
	] {
		let reply = f.get(target);
		assert_eq!(reply.status, 403, "{target}");
		assert!(reply.body.is_empty(), "{target}");
	}
}

#[test]
fn dot_folders_and_parent_segments_are_refused() {
	let f = Fixture::new();
	for target in [
		"/v1/asset/.git/config",
		"/v1/asset/../etc/passwd",
		"/v1/asset/media/../img.png",
		"/v1/asset/%2E%2E/x.png",
		"/v1/asset//etc/passwd",
		"/v1/asset/",
	] {
		assert_eq!(f.get(target).status, 403, "{target}");
	}
}

#[cfg(unix)]
#[test]
fn a_link_out_of_the_vault_is_refused() {
	let f = Fixture::new();
	let outside = TempDir::new().unwrap();
	fs::write(outside.path().join("secret.png"), b"secret").unwrap();
	std::os::unix::fs::symlink(outside.path().join("secret.png"), f.dir.path().join("leak.png")).unwrap();
	std::os::unix::fs::symlink(f.dir.path().join(".kokobrain/settings.json"), f.dir.path().join("s.png")).unwrap();
	assert_eq!(f.get("/v1/asset/leak.png").status, 403);
	assert_eq!(f.get("/v1/asset/s.png").status, 403);
}

#[test]
fn asset_path_refuses_what_the_endpoint_refuses() {
	let f = Fixture::new();
	let root = f.root();
	assert!(asset_path(&root, &format!("{root}/img.png")).is_ok());
	assert!(asset_path(&root, &format!("{root}/.kokobrain/settings.json")).is_err());
	assert!(asset_path(&root, &format!("{root}/.git/config")).is_err());
	assert!(asset_path(&root, &root).is_err());
	assert!(asset_path(&root, "/etc/passwd").is_err());
}

#[test]
fn no_vault_open_is_not_found() {
	let server = RemoteServer::start_with_rpc(0, bundle(), Some(host(None))).unwrap();
	let port = server.port();
	let reply = send(port, &format!("GET /v1/asset/img.png HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert_eq!(reply.status, 404);
}

#[test]
fn without_a_session_host_assets_are_not_found() {
	let server = RemoteServer::start(0, bundle()).unwrap();
	let port = server.port();
	let reply = send(port, &format!("GET /v1/asset/img.png HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n"));
	assert_eq!(reply.status, 404);
	assert!(reply.body.is_empty(), "no index.html fallback for assets");
}

// ── who may ask ─────────────────────────────────────────────────────────

#[test]
fn a_cross_site_request_is_refused() {
	let f = Fixture::new();
	for site in ["cross-site", "same-site", "none"] {
		let reply = f.get_with("/v1/asset/img.png", &format!("Sec-Fetch-Site: {site}\r\n"));
		assert_eq!(reply.status, 403, "{site}");
		assert!(reply.body.is_empty(), "{site}");
	}
	let ok = f.get_with("/v1/asset/img.png", "Sec-Fetch-Site: same-origin\r\n");
	assert_eq!(ok.status, 200);
}

#[test]
fn a_cross_site_request_for_a_missing_file_looks_the_same_as_for_a_present_one() {
	let f = Fixture::new();
	let present = f.get_with("/v1/asset/img.png", "Sec-Fetch-Site: cross-site\r\n");
	let missing = f.get_with("/v1/asset/nope.png", "Sec-Fetch-Site: cross-site\r\n");
	assert_eq!(present.status, missing.status);
	assert_eq!(present.body, missing.body);
}

#[test]
fn a_foreign_origin_is_refused() {
	let f = Fixture::new();
	let reply = f.get_with("/v1/asset/img.png", "Origin: https://evil.example\r\n");
	assert_eq!(reply.status, 403);
	let port = f.server.port();
	let ok = f.get_with("/v1/asset/img.png", &format!("Origin: http://127.0.0.1:{port}\r\n"));
	assert_eq!(ok.status, 200);
}

#[test]
fn a_proxied_request_needs_the_owner_login() {
	let dir = TempDir::new().unwrap();
	fs::write(dir.path().join("img.png"), PNG).unwrap();
	let route = Route { port: 0, tailnet_host: Some("mac.tail.ts.net".into()), owner_login: Some("me@x".into()) };
	let rpc = host(Some(dir.path().to_string_lossy().to_string()));
	let server = RemoteServer::start_routed(route, bundle(), Some(rpc)).unwrap();
	let port = server.port();
	let req = |login: &str| {
		send(
			port,
			&format!("GET /v1/asset/img.png HTTP/1.1\r\nHost: mac.tail.ts.net:{port}\r\n{login}Sec-Fetch-Site: same-origin\r\n\r\n"),
		)
	};
	assert_eq!(req("").status, 403);
	assert_eq!(req("Tailscale-User-Login: other@x\r\n").status, 403);
	assert_eq!(req("Tailscale-User-Login: me@x\r\n").status, 200);
}

// ── pure rules ──────────────────────────────────────────────────────────

#[test]
fn only_raster_images_audio_video_and_pdf_are_inline() {
	for (name, mime) in [
		("a.PNG", "image/png"),
		("a.jpg", "image/jpeg"),
		("a.jpeg", "image/jpeg"),
		("a.gif", "image/gif"),
		("a.webp", "image/webp"),
		("a.avif", "image/avif"),
		("a.bmp", "image/bmp"),
		("a.ico", "image/x-icon"),
		("a.mp3", "audio/mpeg"),
		("a.wav", "audio/wav"),
		("a.m4a", "audio/mp4"),
		("a.ogg", "audio/ogg"),
		("a.flac", "audio/flac"),
		("a.mp4", "video/mp4"),
		("a.webm", "video/webm"),
		("a.mov", "video/quicktime"),
		("a.pdf", "application/pdf"),
	] {
		assert_eq!(asset_type(name), (mime, true), "{name}");
	}
	for name in ["a.svg", "a.html", "a.htm", "a.xhtml", "a.md", "a.js", "a", "png", "a.png.html"] {
		assert_eq!(asset_type(name), ("application/octet-stream", false), "{name}");
	}
}

#[test]
fn cross_site_is_any_fetch_site_other_than_same_origin() {
	let head = |v: &str| format!("GET / HTTP/1.1\r\nHost: h\r\nSec-Fetch-Site: {v}");
	assert!(!is_cross_site("GET / HTTP/1.1\r\nHost: h"));
	assert!(!is_cross_site(&head("same-origin")));
	assert!(is_cross_site(&head("cross-site")));
	assert!(is_cross_site(&head("same-site")));
	assert!(is_cross_site(&head("none")));
	assert!(is_cross_site("GET / HTTP/1.1\r\nSec-Fetch-Site: same-origin\r\nSec-Fetch-Site: cross-site"));
}

#[test]
fn the_page_csp_lets_same_origin_assets_into_images_media_and_frames_only() {
	let csp = browser_csp("<html></html>");
	let directive = |name: &str| {
		csp.split(';').map(str::trim).find(|d| d.split(' ').next() == Some(name)).map(str::to_string)
	};
	// `/v1/asset/` is same-origin: images by `img-src 'self'`; media and
	// frames fall back to `default-src 'self'`, as on the desktop.
	assert_eq!(directive("default-src").as_deref(), Some("default-src 'self'"));
	assert!(directive("img-src").unwrap().contains("'self'"), "{csp}");
	assert_eq!(directive("media-src"), None, "{csp}");
	assert_eq!(directive("frame-src"), None, "{csp}");
	assert_eq!(directive("child-src"), None, "{csp}");
	// Plugins stay off: no desktop embed uses `<object>` / `<embed>`.
	assert_eq!(directive("object-src").as_deref(), Some("object-src 'none'"));
}
