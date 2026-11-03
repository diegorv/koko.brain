VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `src-tauri/src/utils/main_heartbeat.rs:102-111`: the test poster calls `task()` inline when `delay.is_zero()` and spawns a thread only for the late closure. Inline is safe: the closure sends on an unbounded `mpsc::channel` before `run_heartbeat` reaches `rx.recv()` (lines 37-43), so there is no deadlock. The false-stall source (spawn latency on a punctual tick) is gone. The 3 `main_heartbeat` tests pass. |
| 2 | minor | resolved | `src/lib/contracts/ipc.ts:66-71`: the `takeQueueWait` JSDoc names the FIFO drift, its two causes and its bound `MAX_PENDING_PER_COMMAND` (the constant exists, line 39, enforced at line 48). The finding offered the docs-only fix as an option. Not adding an age cutoff is a sound call: it would also drop real long waits. |
| 3 | nit | rejection stands | The Issue, item 4, asks for a buffer flushed every N ms or N lines and on teardown. A `pagehide` flush is outside that scope. |
| 4 | nit | rejection stands | `set_enabled` (`main_heartbeat.rs:57-80`) is glue around a thread and the global `RUNNING`. `run_heartbeat` returns only when the poster fails or the closure is dropped, which happens when the event loop is gone. |
| 5 | nit | resolved | `e2e/mocks/tauri-core.ts:384-386,490`: a dedicated `handleSetMainThreadHeartbeat` returns null, the same behavior as before. |

## Acceptance criteria re-checked

- [met] Rust test: the main-thread heartbeat reports a stall when the main closure is delayed past the threshold (inject the clock or the poster) — the fix changed only the injected test poster. `reports_a_stall_when_the_main_closure_runs_late` still delays the 2nd closure 200 ms on a spawned thread and asserts exactly one report >= 200 ms. The punctual ticks now run inline, so the test is less flaky and no weaker. `cargo test --lib main_heartbeat`: exit 0, 3 passed.
- [met] The queue-wait line appears for a mocked `invoke` with a known enter time — the fix changed only a JSDoc in `ipc.ts`. `src/tests/lib/contracts/` and `src/tests/lib/utils/debug.test.ts`: exit 0, 63 passed.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/contracts/ src/tests/lib/utils/debug.test.ts`: exit 0 (5 files, 63 tests).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib main_heartbeat` (CARGO_BUILD_JOBS=2, nice 19): exit 0 (3 passed).
- The fix diff (`6855f47d..HEAD`) touches only the heartbeat test module, one JSDoc, the E2E mock and the review file. No test was weakened or deleted. There is no scope creep. No change to `layer-baseline.json`, `BASELINE_SIZE` or the composition roots. No `#[ts(export)]` type changed, so the bindings are unaffected.
- Not run: the full suite, `pnpm build`, the full `cargo test`, E2E (all deliver's).

## Findings

1. nit — `src-tauri/src/utils/main_heartbeat.rs:87-89` — The `run_with_delays` doc comment still says the poster "runs each closure `delays[i]` late on another thread". Since the fix, only the late closures run on another thread. Fix: "runs each closure `delays[i]` late (inline when zero, else on another thread)".
