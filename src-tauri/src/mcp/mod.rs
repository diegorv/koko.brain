//! MCP (Model Context Protocol) server for Claude Code.
//!
//! Hosts an in-process HTTP MCP endpoint on `127.0.0.1:3737` while the
//! Kokobrain app is running. Exposes Kokobrain's hybrid vault search
//! so Claude Code (and any other MCP-speaking client) can query the
//! vault directly. Reading the returned note paths is intentionally
//! delegated to the client — Claude Code already runs in the vault
//! directory and can use its own `Read` tool with vault-relative
//! paths.
//!
//! Lifetime: started during `tauri::Builder::setup()` via
//! `tauri::async_runtime::spawn`. The server lives as long as the
//! tokio runtime owned by Tauri does; when the app exits the port
//! closes and the server stops. Bind failures are logged and the rest
//! of the app continues — losing MCP must never crash Kokobrain.
//!
//! Logging: bind lifecycle events (success / failure / server-stop)
//! print directly to stderr via `eprintln!`. They land on the
//! terminal `pnpm tauri dev` is running in, which is the only
//! diagnostic surface that matters for "did the MCP server come
//! up". Routing them through the frontend log-file pipeline was
//! attempted via a `force_log` helper but `mcp::start` runs inside
//! `tauri::Builder::setup()`, before the frontend subscribes to
//! `tauri-debug-log`, so the emits dropped. Per-tool call logs
//! still route through `debug_log("MCP", ...)` — those fire long
//! after boot, by which time the listener is up.

pub mod tools;

use rmcp::transport::streamable_http_server::{
	session::local::LocalSessionManager, StreamableHttpServerConfig, StreamableHttpService,
};
use tauri::AppHandle;

use tools::KokoMcp;

/// Loopback bind address for the MCP server. Fixed (not configurable
/// via settings) to keep the surface small; edit if it collides with
/// another local service.
const BIND_ADDRESS: &str = "127.0.0.1:3737";

/// HTTP path the MCP transport is mounted at. Claude Code config:
/// `"url": "http://127.0.0.1:3737/mcp"`.
const MCP_PATH: &str = "/mcp";

/// Starts the MCP HTTP server. Binds `127.0.0.1:3737` and serves until
/// the tokio runtime stops. On bind failure logs the error and returns
/// without panicking. Tools are registered via the `KokoMcp` impl in
/// `tools.rs`.
pub async fn start(_app: AppHandle) {
	// No explicit CancellationToken: the server runs as long as the
	// Tauri-owned tokio runtime does, and process exit drops the
	// runtime. Wiring an external cancel signal would only matter
	// if we ever wanted to stop MCP while keeping the app open --
	// not in scope today.
	let service = StreamableHttpService::new(
		|| Ok::<_, std::io::Error>(KokoMcp::new()),
		LocalSessionManager::default().into(),
		StreamableHttpServerConfig::default(),
	);

	let router = axum::Router::new().nest_service(MCP_PATH, service);

	let listener = match tokio::net::TcpListener::bind(BIND_ADDRESS).await {
		Ok(l) => l,
		Err(err) => {
			eprintln!("[MCP] bind failed: {err} — MCP disabled this session");
			return;
		}
	};

	eprintln!("[MCP] listening on {BIND_ADDRESS}{MCP_PATH}");

	if let Err(err) = axum::serve(listener, router).await {
		eprintln!("[MCP] server stopped with error: {err}");
	}
}
