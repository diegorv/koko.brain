# Discovery: 02 embedder threads at macOS utility QoS

## Key risk, checked first: ORT workers do NOT inherit the creator's QoS
Probe on this Mac (Darwin 25.6, scratchpad, not committed): a thread sets
`QOS_CLASS_UTILITY` (0x11) via `pthread_set_qos_class_self_np`, `qos_class_self()`
reads 0x11, then spawns children. Children created by `pthread_create` with a NULL
attr, with `pthread_attr_init` + `setstacksize` (ORT's PosixThread shape), and by
`std::thread::spawn` all read 0x15 (`QOS_CLASS_DEFAULT`). So setting QoS on the
thread that runs `Embedder::load` alone would leave the 4 intra-op workers at default.
The locked `ort 2.0.0-rc.15` exposes the hook the Issue names:
`SessionBuilder::with_thread_manager<T: ThreadManager>` (`impl_options.rs:283`,
wires `SessionOptionsSetCustomCreateThreadFn`/`JoinThreadFn`; ort keeps the manager
alive in the session's extras, `impl_commit.rs:236`).

## Files that change
- `src-tauri/src/semantic/qos.rs` (new): raw `extern "C"` (no `libc` dep),
  `#[cfg(target_os = "macos")]`, no-op elsewhere:
  - `current_qos_class() -> Option<u32>` (None off macOS), `QOS_CLASS_UTILITY = 0x11`.
  - `enter_utility_qos() -> UtilityQosGuard`: lowers the current thread, restores the
    previous class on drop (skips restore when previous is UNSPECIFIED).
  - `UtilityQosThreadManager: ort ThreadManager`: `std::thread::Builder` named
    `ort-embedder`, sets utility QoS, then `work()`.
- `src-tauri/src/semantic/mod.rs:1-8`: `pub mod qos;`.
- `src-tauri/src/semantic/embedder.rs:64-66`: `.with_thread_manager(UtilityQosThreadManager)`
  on the embedder session only (reranker keeps default QoS: out of scope).
- `src-tauri/src/commands/semantic.rs`: `let _qos = enter_utility_qos();` at the top of
  the blocking closures of `init_semantic_search` (:370), `search_semantic` (:770),
  `search_hybrid` (~:920), `update_semantic_file` (:1198) and the build embed
  closure (:629). The calling thread runs part of each intra-op loop, so it needs
  utility too.

## Why a guard, not a bare set inside `ensure_embedder_loaded`
All five sites run on tokio's shared `spawn_blocking` pool. A bare set would leave that
pool thread at utility for every later unrelated blocking task (file IO for the UI).
The guard scopes it to the embedder work; a set inside `ensure_embedder_loaded` would
also end before the caller's `embed()`.

## Tests (prior art: `semantic_embedder_threads_test.rs`, `semantic_session_builder_test.rs`)
- `src-tauri/tests/semantic_qos_test.rs` (new): guard sets 0x11 and restores (macOS);
  thread manager's worker runs at 0x11 (macOS); no-op/None off macOS; builder accepts
  the manager (`session_builder(2)?.with_thread_manager(..)` is ok).

## Risks / open items (deferred by the user, recorded in the Issue)
- That ORT really spawns the session's intra-op pool through the manager is the ORT API
  contract; no automated proof without a real model (semantic-test policy).
- Query-time search latency at utility: manual check, not a gate.
