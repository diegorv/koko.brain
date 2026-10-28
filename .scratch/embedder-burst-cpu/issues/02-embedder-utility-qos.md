# 02: Embedder threads run at macOS utility QoS

**What to build:** Even with fewer threads (ticket 01) the embedder competes with the UI and other apps at default priority. On macOS, set the calling thread to `QOS_CLASS_UTILITY` (`pthread_set_qos_class_self_np`) before the embedder session is built and before each embed run, so the scheduler favors foreground work and prefers efficiency cores. Use utility, not background: the same `EMBEDDER` serves query-time search embedding, and background QoS would make search slow.

**Key risk (verify first):** ORT creates its intra-op worker threads when the session is built (`Embedder::load`, reached from `ensure_embedder_loaded`, `src-tauri/src/commands/semantic.rs:255`). Whether those workers inherit the creating thread's QoS is unverified. The QoS must be set on the thread that runs `Embedder::load`, on every caller of `ensure_embedder_loaded` (which runs `Embedder::load` at `:276`): `init_semantic_search` (`:385`, inside the `spawn_blocking` at `:370`), `search_semantic` (`:774`), `search_hybrid` (`:935`) and `update_semantic_file` (`:1245`). Whichever caller loads first owns the worker threads, so a search can be the one that creates them. `build_semantic_index` does not load the model (it only takes `EMBEDDER.lock()` at `:630`), but its embed closure at `:629` runs inference and also gets the QoS call. If workers do not inherit, record that and close as `wontfix` with the evidence, or switch to ORT's thread-creation hooks if the locked `ort 2.0.0-rc.15` exposes them.

**Blocked by:** None (01 is merged; the user deferred all measurements on 2026-10-28)

**Status:** ready-for-agent

**Touches:**
- `src-tauri/src/commands/semantic.rs` (modify; `ensure_embedder_loaded` :255 or its callers :385, :774, :935, :1245; embed closures :629 and :1198)
- `src-tauri/src/semantic/` (possibly a small `#[cfg(target_os = "macos")]` helper)
- `src-tauri/Cargo.toml` (modify only if `libc` is added; it is not a direct dependency today, a raw `extern "C"` declaration is the alternative)

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only)

- [ ] A macOS-only helper sets utility QoS on the current thread; no-op elsewhere; compiles on non-macOS targets
- [ ] Called on every thread that can build the embedder session (all four `ensure_embedder_loaded` callers, or inside it) and on the embed closures at :629 and :1198
- [ ] Inheritance by ORT worker threads: if it cannot be verified without a running app, record it as an open item in `## Comments` (deferred by the user) and deliver; do not block on it
- [ ] Query-time search latency check by hand: open item, deferred by the user (not a gate)
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
- 2026-10-28 12:34 — discovery — probe shows pthread/std threads do not inherit QoS; plan: utility guard on the 5 embed call sites + ort ThreadManager for intra-op workers — 0ace4d20
- 2026-10-28 12:41 — implement — qos.rs: scoped utility guard on all 5 embedder sites + ORT ThreadManager starting intra-op workers at utility (probe: macOS threads do not inherit QoS); targeted cargo tests 66/66 pass — 1d57a0ad
- 2026-10-28 12:41 (open item, deferred by the user): query-time search latency at utility QoS: manual check, not a gate.
- 2026-10-28 12:44 — review — CHANGES_REQUESTED: 1 medium (ORT-routes-workers-through-manager is testable with a tiny in-memory ONNX model, reviewer probe saw 3 workers at utility; extract and test the embedder builder), 2 low (guard should be !Send; log a failed QoS restore) — 1c92d3a1
- 2026-10-28 12:57 — fix — embedder_session_builder extracted and tested with a tiny in-memory ONNX model (3 intra-op workers at utility; fails with 0 when the manager is removed); guard made !Send; failed QoS restore logged; former open item (1) closed — pending
