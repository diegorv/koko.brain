VERDICT: CHANGES_REQUESTED

# Review: 02 embedder threads at macOS utility QoS

Reviewed `git diff main...HEAD` (base 0ace4d20, head 1c92d3a1). The diff is Rust only
(`src-tauri/`), so `pnpm check` was not run. No PRD or plan file exists for
`embedder-burst-cpu`; the Issue is the spec.

## Test verdict rests on
Run by the reviewer (CARGO_BUILD_JOBS=2, nice 19), all green, no compiler warnings:
- `src-tauri/tests/semantic_qos_test.rs` (new): 5 passed
- `src-tauri/tests/semantic_session_builder_test.rs`: 2 passed
- `src-tauri/tests/semantic_embedder_threads_test.rs`: 3 passed
- `src-tauri/tests/semantic_commands_test.rs`: 43 passed
- `src-tauri/tests/semantic_reranker_test.rs`: 4 passed

Plus a temporary probe (scratch test file in the worktree, deleted right after the run,
never committed): a hand-encoded 61-byte ONNX model (one `Add` node) committed with
`session_builder(4).with_thread_manager(<wrapper around UtilityQosThreadManager>)
.commit_from_memory(..)`. Result: ORT created exactly 3 intra-op workers through the
manager at commit time, and each read `qos_class_self() == 0x11` (utility). This
verifies the Issue's key risk end to end with ORT itself, and shows it does NOT need
the real BGE-M3 model (see finding 1).

Also read the locked `ort-2.0.0-rc.15` source: `SessionBuilder::with_thread_manager`
(`session/builder/impl_options.rs:283`) wires `SessionOptionsSetCustomCreateThreadFn` /
`JoinThreadFn`; the manager `Arc` is kept in the session extras (`impl_commit.rs:236`);
`thread_create` (`environment.rs:359`) wraps `create` in `catch_unwind` and returns a
null handle on error. `ort_environment()` builds no global thread pool, so the
session-level hook is the one that applies.

## Acceptance criteria
- [x] **macOS-only helper sets utility QoS; no-op elsewhere; compiles on non-macOS.**
  Met. `src-tauri/src/semantic/qos.rs`: raw `extern "C"` for
  `pthread_set_qos_class_self_np(u32, i32)` and `qos_class_self()` (signatures match
  `<pthread/qos.h>`; `QOS_CLASS_UTILITY = 0x11` is correct), all under
  `#[cfg(target_os = "macos")]`; `current_qos_class()` returns `None` and
  `enter_utility_qos()` is inert off macOS. `qos_is_a_no_op_off_macos` covers the
  non-macOS path (only compiled there); the build report claims an `aarch64-apple-ios`
  compile, which I did not re-run, but the cfg structure is sound by reading.
- [x] **Called on every thread that can build the session and on the embed closures.**
  Met. Guard at `commands/semantic.rs:387` (`init_semantic_search`), `:779`
  (`search_semantic`), `:945` (`search_hybrid`), `:1257` (`update_semantic_file`, which
  also covers the `:1198` closure's embed), and `:633` (`build_semantic_index` embed
  closure). `grep` shows no other caller of `ensure_embedder_loaded` or `Embedder::load`.
  Every guard lives inside a `spawn_blocking` closure with no `.await` while held, so
  the restore always runs on the thread that was lowered. Early `?` returns drop the
  guard. More importantly, the creation of the workers no longer depends on the caller's
  QoS at all: `embedder.rs:69-71` attaches `UtilityQosThreadManager`.
- [x] **Inheritance by ORT worker threads.** Met, and better than the criterion asked:
  discovery's probe showed macOS threads do not inherit QoS, so the build switched to
  the ORT thread-creation hook the Issue allowed. The reviewer probe above confirms ORT
  routes all intra-op workers of a real session through the manager. The open item in
  `## Comments` is therefore stale (finding 1).
- [ ] **Query-time search latency by hand.** Open item, deferred by the user; correctly
  recorded in `## Comments`. Not a gate.
- [ ] **Gate green; one commit in the full CLAUDE.md format.** Not yet: the gate is
  deliver's job. The source commit 1d57a0ad has Context, Problem, Solution, Behavior,
  Tests and Files; its Files line ranges are accurate to within a line. Its Behavior
  and Tests paragraphs repeat the "needs a real model" claim (finding 1).

## Findings

1. **Medium, `src-tauri/tests/semantic_qos_test.rs:6-8` (and `src-tauri/src/semantic/embedder.rs:67-71`).**
   The mechanism the whole Issue hinges on (ORT spawns the session's intra-op pool
   through `UtilityQosThreadManager`, and those workers run at utility) is left as an
   untested open item with the reason "needs a real model". That is wrong: a tiny
   in-memory ONNX model commits in a test and proves it (reviewer probe: 3 workers via
   the manager, all at 0x11). Also, the attach in `Embedder::load` is untested, so a
   later edit that drops `.with_thread_manager(..)` silently reverts the feature.
   Fix: extract the embedder's builder chain into a small function (for example
   `pub fn embedder_session_builder(num_threads) -> Result<SessionBuilder, String>` that
   returns `session_builder(num_threads)?.with_thread_manager(UtilityQosThreadManager)`),
   use it in `Embedder::load`, and add a test that commits a hand-encoded tiny model
   (`commit_from_memory`) from that builder with 4 threads and asserts, on macOS, that
   ORT created 3 workers at `QOS_CLASS_UTILITY` (wrap the manager or record from inside
   the worker; the probe used a delegating `ThreadManager` that records
   `current_qos_class()` before calling `work()`). The probe's model bytes (ir_version 7,
   opset 13, graph `y = Add(x, x)`, float `[1]`) are:
   `8,7,66,4,10,0,16,13,58,53,10,14,10,1,120,10,1,120,18,1,121,34,3,65,100,100,18,1,103,90,15,10,1,120,18,10,10,8,8,1,18,4,10,2,8,1,98,15,10,1,121,18,10,10,8,8,1,18,4,10,2,8,1`.
   Then drop open item (1) from the Issue's `## Comments` and the EXCLUDED note, and do
   not repeat the "needs a real model" claim in the closing commit.

2. **Low, `src-tauri/src/semantic/qos.rs:55-58`.** `UtilityQosGuard` is `Send` (it only
   holds `Option<u32>`), so nothing stops a future caller from holding it across an
   `.await` in an async command. The guard would then lower a tokio worker thread and,
   after the task migrates, "restore" a different thread to the first thread's class.
   Today every guard is inside `spawn_blocking` with no await, so this is latent.
   Fix: add `_not_send: std::marker::PhantomData<*const ()>` to the guard so the
   compiler rejects that misuse, and say so in its doc comment.

3. **Low, `src-tauri/src/semantic/qos.rs:78-82`.** A failed restore in `Drop` is ignored
   silently: if `pthread_set_qos_class_self_np(previous)` fails, the shared
   `spawn_blocking` pool thread stays at utility for unrelated later work, which is
   exactly the leak the guard exists to prevent, and nothing records it. Fix: when the
   restore returns false, `debug_log("SEMANTIC", ..)` the failure (Drop cannot
   propagate an error).

## Checked, no finding
- No scope creep: reranker untouched (its session keeps default QoS, consistent with
  discovery), no `Cargo.toml` change, no frontend change.
- Error handling: `with_thread_manager` failure is mapped and propagated from
  `Embedder::load`; a failing `create` makes ORT fail the session build, which surfaces
  as `Failed to load model`, not a silent default-QoS pool.
- Mutex contention: a default-QoS waiter on `EMBEDDER.lock()` (for example the sync
  `shutdown_semantic`) now waits on a utility holder. Darwin `pthread_mutex` resolves
  priority inversion for a known owner, and the wait existed before this change, so no
  finding; worth watching in the manual latency check.
- Style: tabs throughout, doc comments on every public item, English.

## Resolution
All three findings accepted and fixed; none rejected.
1. `embedder_session_builder(num_threads)` (`src-tauri/src/semantic/embedder.rs`) now owns the
   `session_builder` + `UtilityQosThreadManager` chain and `Embedder::load` uses it. New
   `src-tauri/tests/semantic_embedder_qos_session_test.rs` commits the reviewer's 61-byte Add model from
   `embedder_session_builder(4)` and asserts, via the process-wide `qos::utility_workers_started()`
   counter (own test binary so nothing else bumps it), that 3 workers reached utility on macOS (0
   elsewhere). Mutation check: removing `.with_thread_manager(..)` makes it fail with 0 vs 3. The
   EXCLUDED note and open item (1) are gone.
2. `UtilityQosGuard` carries `PhantomData<*const ()>` and is `!Send`; the doc comment says why.
3. `Drop` now `debug_log("SEMANTIC", ..)`s when restoring the previous class fails.
