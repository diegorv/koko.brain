# 035: Rust panic events carry the panic location (file:line)

**Origin:** `usage-telemetry` Issue 05, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Today a Rust panic reaches Sentry with only its message. `sentry-panic` 0.49.3 builds the event from the payload alone and never reads `info.location()` (`~/.cargo/registry/src/index.crates.io-*/sentry-panic-0.49.3/src/lib.rs` lines 106-133; check the same file for the locked version, 0.49.5 on main). Shipped frames are unsymbolicated (`strip = true`, see Issue 11), so the event cannot tell where the panic happened. Add the location to the exception value, e.g. `called Option::unwrap() on a None value at src/vault/watcher.rs:288:14`. No debug info, no upload and no library paths are needed.

How:

1. **Extractor.** `PanicIntegration::add_extractor(|info| Some(event))` lets a closure build the whole event. Build the same event as the default (lines 117-133), with these fields:
   - exception `ty: "panic"`;
   - mechanism `panic` with `handled: Some(false)`;
   - `Level::Fatal`;
   - the stacktrace from `current_stacktrace()` (find the re-export path under `sentry::integrations::backtrace` for the locked version);
   - `value: format!("{msg} at {file}:{line}:{col}")` when `info.location()` is `Some`, else `msg`. Get `msg` from `sentry::integrations::panic::message_from_panic_info`.
2. **Wiring.** `apply_defaults` puts the default integrations *before* custom ones (`sentry-*/src/defaults.rs` about lines 47-79), and `panic_handler` uses `with_integration::<PanicIntegration>` (lib.rs line 34). A second `PanicIntegration` added with `.add_integration(...)` is probably never used. Verify how `with_integration` resolves a type (sentry-core client). If it takes the first match, set `.default_integrations(false)` in `src-tauri/src/error_monitoring.rs` (about lines 49-55) and add the same list explicitly, in the same order, for the enabled features (`backtrace`, `contexts`, `panic`):
   - `AttachStacktraceIntegration`;
   - `ContextIntegration::default()`;
   - the custom `PanicIntegration`;
   - `ProcessStacktraceIntegration`.
   Also keep the transport default.
3. Put the location formatting in a small pure function, e.g. `panic_value(msg: &str, location: Option<(&str, u32, u32)>) -> String`, so it can be unit-tested without panicking.

**Blocked by:** 034

**Blocked by (origin):** original line: "02 (same file, `error_monitoring.rs`; avoids a conflict)".

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

**Formatter** (failing first, unit test)
- [ ] `panic_value` appends ` at file:line:col` when a location exists, and returns the bare message otherwise.

**Integration** (failing first, in `src-tauri/tests/error_monitoring_test.rs` or a `#[cfg(test)]` module; enable the `sentry` `test` feature in dev-dependencies if needed)
- [ ] With the client configured, a panic inside `std::panic::catch_unwind` produces exactly one captured event (`sentry::test::with_captured_events` or a test transport).
- [ ] That event's exception value contains the test file name and a line number.
- [ ] Its mechanism is still `panic`.

**Regression**
- [ ] The existing tests still pass: a disabled client and an invalid DSN create no client.
- [ ] The OS and device contexts are still attached. Assert that the `os` context exists on the captured event, which proves `ContextIntegration` was kept.

## Notes

- Split on 2026-11-06 from the original Issue 05. The dSYM path is now Issue 11 (deferred).
- Owner approved the split on 2026-11-06 ("Sim, arruma e commit com push").
- Source: priority review 2026-11-06; `raw/j23.md` (S02-F3, N4).
- Size: S/M.

## Comments
