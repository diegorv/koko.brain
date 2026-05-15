//! Embedded HTTP + SSE server that mirrors the Tauri IPC surface so the
//! same frontend can be loaded from a regular browser pointed at
//! `http://127.0.0.1:47823`. Mounted next to the native Tauri window —
//! both transports drive the same in-process state (vault index,
//! watcher, terminal sessions) so a write from the browser is
//! immediately visible to the Tauri window and vice versa.
//!
//! Routes:
//!   POST /api/invoke       -> body `{ cmd, args }`, returns the
//!                              command's JSON result (or 4xx/5xx + body)
//!   GET  /api/events       -> `?topic=<name>` SSE stream of every
//!                              emitted event matching that topic
//!   GET  /...              -> static fallback to the SvelteKit build
//!
//! Security: bind is `127.0.0.1` only; never `0.0.0.0`. The dispatcher
//! reuses Tauri-managed state (vault index, watcher, terminal,
//! event bus) so command-level path-traversal protection (already in
//! `read_files_batch` etc.) keeps applying.

use axum::{
	extract::{Query, State},
	http::StatusCode,
	response::{
		sse::{Event, KeepAlive, Sse},
		IntoResponse,
	},
	routing::{get, post},
	Json, Router,
};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::sync::broadcast::error::RecvError;
use tower_http::services::ServeDir;

use crate::event_bus::EventBus;

/// Loopback bind. Anyone on the LAN could otherwise read/write the user's
/// vault — never widen to `0.0.0.0` without an auth layer.
pub const BIND_ADDR: &str = "127.0.0.1:47823";

/// Shared state handed to every axum handler. Cheap to clone — `bus` is
/// `Arc`-backed via `broadcast::Sender::clone`, and `AppHandle` is itself
/// a cheap clone wrapper around the Tauri runtime.
#[derive(Clone)]
pub struct AppState {
	pub bus: EventBus,
	pub app_handle: AppHandle,
}

impl AppState {
	pub fn new(bus: EventBus, app_handle: AppHandle) -> Self {
		Self { bus, app_handle }
	}
}

/// Body of POST /api/invoke. `args` is left as a raw JSON value so the
/// per-command match arm can deserialize into its own typed struct, the
/// same way Tauri's IPC layer deserializes per-command on the other
/// transport.
#[derive(Deserialize)]
pub struct InvokeReq {
	pub cmd: String,
	#[serde(default)]
	pub args: serde_json::Value,
}

/// Wire format for `/api/invoke` errors. The frontend wrapper surfaces
/// `message` to the caller; `kind` lets the wrapper distinguish
/// "bad request" (caller bug) from "internal" (server bug) for logging.
#[derive(Serialize)]
pub struct InvokeErr {
	pub kind: &'static str,
	pub message: String,
}

/// 400 helper for deserialization failures (bad args shape).
pub fn bad_req(msg: impl Into<String>) -> (StatusCode, Json<InvokeErr>) {
	(
		StatusCode::BAD_REQUEST,
		Json(InvokeErr {
			kind: "bad_request",
			message: msg.into(),
		}),
	)
}

/// 500 helper for command body failures. The dispatcher converts the
/// command's `Result<T, String>` `Err` arm to this; the frontend wrapper
/// throws an Error with the message so callers' existing `try { invoke
/// } catch (e) { ... }` paths keep working.
pub fn internal(msg: impl Into<String>) -> (StatusCode, Json<InvokeErr>) {
	(
		StatusCode::INTERNAL_SERVER_ERROR,
		Json(InvokeErr {
			kind: "internal",
			message: msg.into(),
		}),
	)
}

/// 404 helper for unknown command names. Distinguished from `bad_req`
/// so the frontend wrapper can warn loudly — "unknown command" almost
/// always means the dispatcher hasn't been taught about a command the
/// frontend is calling.
pub fn not_found(cmd: &str) -> (StatusCode, Json<InvokeErr>) {
	(
		StatusCode::NOT_FOUND,
		Json(InvokeErr {
			kind: "not_found",
			message: format!("unknown command: {}", cmd),
		}),
	)
}

/// SSE query: `?topic=<exact event name>`. Mirrors the per-topic
/// subscription model `tauri::Manager::listen("<topic>", ...)` uses, so
/// a frontend listener stays bound to one topic per call.
#[derive(Deserialize)]
pub struct EventsQuery {
	pub topic: String,
}

/// POST /api/invoke. The big match arm lives in
/// `crate::http::dispatch::dispatch_command` so this handler stays a
/// thin transport wrapper.
async fn invoke_handler(
	State(state): State<AppState>,
	Json(req): Json<InvokeReq>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<InvokeErr>)> {
	let value = crate::http::dispatch::dispatch_command(&state, &req.cmd, req.args).await?;
	Ok(Json(value))
}

/// GET /api/events. Subscribes a fresh broadcast receiver, filters by
/// `topic`, and pipes each match as an SSE `data: <json>` message.
///
/// Lag handling: `broadcast::Receiver` returns `RecvError::Lagged(n)` if
/// the consumer falls behind the bus capacity. We log and keep going;
/// the dropped messages are lost. The Tauri side has the same
/// best-effort semantics — emit failures are logged and ignored.
async fn events_handler(
	State(state): State<AppState>,
	Query(q): Query<EventsQuery>,
) -> Sse<impl futures_util::Stream<Item = Result<Event, Infallible>>> {
	let mut rx = state.bus.subscribe();
	let topic = q.topic;
	let stream = async_stream::stream! {
		loop {
			match rx.recv().await {
				Ok((t, payload)) => {
					if t == topic {
						let ev = Event::default().data(payload.to_string());
						yield Ok(ev);
					}
				}
				Err(RecvError::Lagged(n)) => {
					eprintln!("[HTTP/SSE] lagged {} messages on topic={}", n, topic);
					continue;
				}
				Err(RecvError::Closed) => break,
			}
		}
	};
	Sse::new(stream).keep_alive(KeepAlive::default())
}

/// Resolves the directory ServeDir should hand out at the fallback
/// route. The SvelteKit static adapter writes to `<repo>/build`.
///
/// Resolution order (first hit wins):
///   1. `KOKO_FRONTEND_DIST` env var (lets a dev point at a custom build)
///   2. `<resource_dir>/build`  (release bundle — Tauri copies frontendDist here)
///   3. `<CARGO_MANIFEST_DIR>/../build`  (dev — repo-root `build/`)
///   4. CWD / `build`           (last resort)
///
/// Each candidate must contain `index.html`; in dev `resource_dir()` points
/// at `target/debug/`, and `target/debug/build/` exists as cargo's
/// build-script artifacts directory — `is_dir()` alone would accept that
/// wrong path and the SPA route would 404. Validating `index.html`
/// guarantees the candidate is actually a SvelteKit static output.
///
/// Failure to find any of these is non-fatal; the server still starts
/// and the SPA route returns 404 while `/api/*` keeps working.
pub fn is_valid_frontend_dist(p: &std::path::Path) -> bool {
	p.is_dir() && p.join("index.html").is_file()
}

pub fn resolve_frontend_dist(app_handle: &AppHandle) -> Option<PathBuf> {
	if let Ok(p) = std::env::var("KOKO_FRONTEND_DIST") {
		let path = PathBuf::from(p);
		if is_valid_frontend_dist(&path) {
			return Some(path);
		}
	}
	if let Ok(res) = app_handle.path().resource_dir() {
		let candidate = res.join("build");
		if is_valid_frontend_dist(&candidate) {
			return Some(candidate);
		}
	}
	let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("build");
	if is_valid_frontend_dist(&dev) {
		if let Ok(canon) = dev.canonicalize() {
			return Some(canon);
		}
		return Some(dev);
	}
	let cwd_build = std::env::current_dir().ok()?.join("build");
	if is_valid_frontend_dist(&cwd_build) {
		return Some(cwd_build);
	}
	None
}

/// Builds the axum router. Exposed so tests can mount it on an ephemeral
/// port without touching the BIND_ADDR constant.
pub fn build_router(state: AppState) -> Router {
	let mut router = Router::new()
		.route("/api/invoke", post(invoke_handler))
		.route("/api/events", get(events_handler));

	if let Some(dist) = resolve_frontend_dist(&state.app_handle) {
		eprintln!("[HTTP] serving frontend from {}", dist.display());
		router = router.fallback_service(ServeDir::new(dist));
	} else {
		eprintln!(
			"[HTTP] frontend dist not found — only /api/* will respond. \
			 Run `pnpm build` or set KOKO_FRONTEND_DIST to a built dist directory.",
		);
		// Without a fallback service every non-API path 404s. That's
		// fine — `/api/*` still works for the SDK/browser client.
		router = router.fallback(|| async {
			(
				StatusCode::NOT_FOUND,
				"frontend dist not configured — run `pnpm build` or set KOKO_FRONTEND_DIST",
			)
				.into_response()
		});
	}

	router.with_state(state)
}

/// Boots the HTTP server. Called once from `lib.rs::run`'s setup
/// closure. Bind failure logs and returns — losing the HTTP transport
/// must never crash the native app.
pub async fn serve(state: AppState) {
	let router = build_router(state);
	let listener = match tokio::net::TcpListener::bind(BIND_ADDR).await {
		Ok(l) => l,
		Err(err) => {
			eprintln!("[HTTP] bind failed on {}: {} — HTTP transport disabled", BIND_ADDR, err);
			return;
		}
	};
	eprintln!("[HTTP] listening on http://{}", BIND_ADDR);
	if let Err(err) = axum::serve(listener, router).await {
		eprintln!("[HTTP] server stopped with error: {}", err);
	}
}

/// Bridge task: every message emitted on the bus is forwarded to the
/// native Tauri window via `AppHandle::emit`. Without this, switching
/// emits from `app.emit(...)` to `bus.emit(...)` would break every
/// `listen('topic', ...)` in the Svelte code. Spawned once from setup.
pub async fn run_bus_to_tauri_bridge(bus: EventBus, app: AppHandle) {
	let mut rx = bus.subscribe();
	loop {
		match rx.recv().await {
			Ok((topic, payload)) => {
				if let Err(err) = tauri::Emitter::emit(&app, &topic, &payload) {
					eprintln!("[BUS->TAURI] emit failed for {}: {}", topic, err);
				}
			}
			Err(RecvError::Lagged(n)) => {
				eprintln!("[BUS->TAURI] lagged {} messages — native window may miss events", n);
			}
			Err(RecvError::Closed) => {
				eprintln!("[BUS->TAURI] bus closed — bridge exiting");
				break;
			}
		}
	}
}

pub mod dispatch;
