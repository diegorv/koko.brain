# 02: Embedder threads run at macOS utility QoS

**What to build:** Even with fewer threads (ticket 01) the embedder competes with the UI and other apps at default priority. On macOS, set the calling thread to `QOS_CLASS_UTILITY` (`pthread_set_qos_class_self_np`) before the embedder session is built and before each embed run, so the scheduler favors foreground work and prefers efficiency cores. Use utility, not background: the same `EMBEDDER` serves query-time search embedding, and background QoS would make search slow.

**Key risk (verify first):** ORT creates its intra-op worker threads when the session is built (`Embedder::load`, reached from `ensure_embedder_loaded`, `src-tauri/src/commands/semantic.rs:255`). Whether those workers inherit the creating thread's QoS is unverified. The QoS must be set on the thread that runs `Embedder::load`, on every caller of `ensure_embedder_loaded` (which runs `Embedder::load` at `:276`): `init_semantic_search` (`:385`, inside the `spawn_blocking` at `:370`), `search_semantic` (`:774`), `search_hybrid` (`:935`) and `update_semantic_file` (`:1245`). Whichever caller loads first owns the worker threads, so a search can be the one that creates them. `build_semantic_index` does not load the model (it only takes `EMBEDDER.lock()` at `:630`), but its embed closure at `:629` runs inference and also gets the QoS call. If workers do not inherit, record that and close as `wontfix` with the evidence, or switch to ORT's thread-creation hooks if the locked `ort 2.0.0-rc.15` exposes them.

**Blocked by:** 01 (measure each change separately)

**Status:** ready-for-agent

**Touches:**
- `src-tauri/src/commands/semantic.rs` (modify; `ensure_embedder_loaded` :255 or its callers :385, :774, :935, :1245; embed closures :629 and :1198)
- `src-tauri/src/semantic/` (possibly a small `#[cfg(target_os = "macos")]` helper)
- `src-tauri/Cargo.toml` (modify only if `libc` is added; it is not a direct dependency today, a raw `extern "C"` declaration is the alternative)

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only)

- [ ] A macOS-only helper sets utility QoS on the current thread; no-op elsewhere; compiles on non-macOS targets
- [ ] Called on every thread that can build the embedder session (all four `ensure_embedder_loaded` callers, or inside it) and on the embed closures at :629 and :1198
- [ ] Inheritance by ORT worker threads verified on a running app (Instruments Thread States or `taskinfo`) and the result recorded in `## Comments`
- [ ] Query-time search latency checked by hand after the change (not a gate, see search latency policy)
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
