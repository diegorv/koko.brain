# S02: Rust Sentry client audit

## Summary

- Panic capture is installed by default (default integrations on, `panic` feature enabled). The `panic` hook is process-wide and captures only panics; no Rust `Result` error is ever sent.
- Real leak: the `contexts` feature is enabled and `ContextIntegration` sets `server_name` to the machine hostname on every client init. Nothing in `configure_sentry` overrides it, and `send_default_pii(false)` does not gate it. Every event carries the hostname (for example the owner's Mac name).
- No `before_send` on the Rust client. Panic message text goes out verbatim. Frontend scrubbing (`removeSensitiveEventData`) does not touch the Rust path.
- Good: `send_default_pii(false)`, `max_breadcrumbs(0)`, debug images off, release-health/logs/metrics off, invalid DSN rejected before init, disable path unbinds and closes the transport.
- Reconfigure has one real gap: threads that touched the hub before a reconfigure keep a snapshot of the old client, so panics on those threads are dropped after switching to a new client. Low to medium impact, since only panics are sent.

## Findings

### S02-F1
- **Severity:** high
- **Claim:** Every Rust event carries the machine hostname as `server_name`, because `ContextIntegration` fills it in when the options leave it unset, and `configure_sentry` never sets it. `send_default_pii(false)` does not prevent this.
- **Evidence:**
  - `src-tauri/Cargo.toml:72`: `sentry` features include `contexts`, with `default-features = false`.
  - `src-tauri/src/error_monitoring.rs:49-54`: `ClientOptions::new().release(..).send_default_pii(false).max_breadcrumbs(0)`. No `server_name`.
  - `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/sentry-contexts-0.49.3/src/integration.rs:74-77`: `if options.server_name.is_none() { options.server_name = server_name().map(Cow::Owned); }`
  - `sentry-contexts-0.49.3/src/utils.rs:112-115`: `server_name()` returns `hostname::get()`.
  - `sentry-core-0.49.3/src/client/mod.rs:186-188`: `integration.setup(&mut options)` runs in client construction.
  - `sentry-core-0.49.3/src/client/mod.rs:360-362`: `event.server_name` is copied from options when the event has none, so it is sent.
  - `sentry-contexts-0.49.3/src/lib.rs:4`: crate doc says it sets `server_name` "if it is not" already set.
  - docs.rs `sentry` 0.49.3 `ClientOptions`: `send_default_pii` is documented as covering HTTP headers and user IPs in HTTP server integrations, not `server_name`. The `server_name` page gives no default, so the hostname fill-in is documented only in the crate source, not on docs.rs.
  - The frontend `removeSensitiveEventData` (`src/lib/core/settings/sentry.service.ts:28-36`) clears breadcrumbs, extra, request, user. It does not clear `server_name`, and it runs on the JS path, not the Rust one.
- **Suggested fix:** Set `server_name` explicitly in `configure_sentry` to a fixed non-identifying value (for example `Some("")` or a constant), so `ContextIntegration::setup` skips the hostname fill-in. Verify with a test that builds a client and asserts `client.options().server_name` is not the hostname. Alternatively, drop the `contexts` feature and accept the loss of os/rust/device contexts. Verify the chosen value does not produce an odd Sentry UI entry.

### S02-F2
- **Severity:** medium
- **Claim:** No `before_send` is set on the Rust client. Panic messages (`exception.value`) are sent verbatim, and the frontend scrubber does not cover this path.
- **Evidence:**
  - `src-tauri/src/error_monitoring.rs:49-54`: no `before_send`.
  - `sentry-panic-0.49.3/src/lib.rs` (`event_from_panic_info`): `value: Some(msg.to_string())`, where `msg` is the panic payload string.
  - Frontend scrubber scope: `src/lib/core/settings/sentry.service.ts:28-36`.
- **Suggested fix:** Add a `before_send` that drops or redacts `exception[].value` and frame `abs_path` containing the home directory, and clears `server_name` as a second line of defense. Pair it with an audit of `panic!`/`expect`/`unwrap` messages formatted with note paths or content (see Open questions).

### S02-F3
- **Severity:** info (positive)
- **Claim:** Panic integration is installed. Default integrations are on (`default_integrations: true`) and the `panic` feature is enabled, so `PanicIntegration::setup` installs a process-wide hook once (guarded by `Once`) that captures the panic and flushes synchronously.
- **Evidence:**
  - `src-tauri/Cargo.toml:72`: `panic` in features.
  - `sentry-0.49.3/src/defaults.rs:51-70`: `PanicIntegration` added when `feature = "panic"` and `opts.default_integrations`.
  - `sentry-panic-0.49.3/src/lib.rs` (`setup`): `INIT.call_once(|| panic::set_hook(...))`.
  - `sentry-panic-0.49.3/src/lib.rs` (`panic_handler`): `hub.capture_event(...)` then `client.flush(None)`.
- **Suggested fix:** None. Keep the feature.

### S02-F4
- **Severity:** info (gap)
- **Claim:** Rust `Result` errors are never captured. The only capture path is the panic hook. The doc comments say "error and panic reporting", which overstates what happens.
- **Evidence:**
  - `grep -rn 'capture_error\|capture_message\|capture_event' src-tauri/src src-tauri/tests`: no matches.
  - `src-tauri/src/error_monitoring.rs:23-25`: doc says "Configures Rust error and panic reporting".
  - `src-tauri/src/commands/sentry.rs:5`: doc says "Enables or disables Rust error and panic reporting".
- **Suggested fix:** Either correct the doc comments to "panic reporting", or add explicit `sentry::capture_error` at the boundaries that already log errors (for example `debug_log` callers) if error reporting is wanted. The second option is new behavior and needs a decision, since it increases what leaves the machine.

### S02-F5
- **Severity:** low (positive)
- **Claim:** Telemetry-relevant defaults are constrained. `send_default_pii(false)` (matches the docs.rs default). `max_breadcrumbs(0)`. Debug images are off: the `debug-images` feature is not listed, so the debug-meta image list (with home-directory paths) is not attached. `release-health`, `logs`, `metrics` are off (no session or log attributes). `default-features = false` drops `debug-images`.
- **Evidence:**
  - `src-tauri/Cargo.toml:72`.
  - `error_monitoring.rs:53-54`.
  - `sentry-0.49.3/src/defaults.rs:31-43` lists the default integrations gated by feature flags.
- **Suggested fix:** None. Note that these would silently come back if the `sentry` dependency line is changed to default features.

### S02-F6
- **Severity:** medium
- **Claim:** Reconfigure does not reach threads that already resolved their thread-local hub. Each non-initial thread snapshots `PROCESS_HUB` through `Hub::new_from_top` at its first hub access. After a reconfigure to a new client, those threads still hold the old `Arc<Client>`. The old client is closed, so panics on those threads are dropped.
- **Evidence:**
  - `sentry-core-0.49.3/src/hub_impl.rs:22-26`: `THREAD_HUB` is `Hub::new_from_top(&PROCESS_HUB.hub)` on first use.
  - `sentry-core-0.49.3/src/hub_impl.rs:155-156`: `Hub::current()` returns the thread-local clone.
  - `src-tauri/src/error_monitoring.rs:36-37`: unbinds only `Hub::main()` and the calling thread's `Hub::current()`.
  - `error_monitoring.rs:60-63`: comment says "new Rust threads inherit the active client". True only for threads whose first hub access happens after the bind.
  - Old-client shutdown empties the shared transport slot, so the stale client sends nothing: `sentry-core-0.49.3/src/client/mod.rs:520-528`, `src/client/envelope_sender.rs:209-216`. So the disable path is effective, and only the enable-after-reconfigure path loses events.
- **Suggested fix:** Keep one long-lived client and gate sending with a process-wide `AtomicBool` checked in `before_send` (return `None` when disabled). This avoids replacing the client at all. The DSN and release are still fixed at init, so a DSN change would still need a new client. Alternatively, document the limitation. Add a test that reconfigures and panics on a pre-existing thread.

### S02-F7
- **Severity:** low
- **Claim:** No flush on app exit. `SentryState` is Tauri managed state and is not dropped on process exit, so a queued non-panic event would not be flushed. Panics flush synchronously in the hook, so this matters only for queued non-panic events, which do not exist today (see S02-F4). The reconfigure close also waits only 200 ms and drops whatever is still queued.
- **Evidence:**
  - `src-tauri/src/lib.rs:321` (`manage(SentryState::default())`), and no `close`/`flush` on exit in `lib.rs:392-396`.
  - `error_monitoring.rs:38-40`: `close(Some(Duration::from_millis(200)))`.
  - `sentry-0.49.3/src/init.rs:13-14`: the guard's `must_use` doc says dropping the guard flushes and shuts down the transport. The guard is never dropped on exit.
- **Suggested fix:** None needed for panics. If events beyond panics are added, flush in the exit path (`RunEvent::Exit`) with a bounded timeout.

### S02-F8
- **Severity:** info
- **Claim:** Release and environment. Release is `kokobrain@<version>` from `__BUILD_INFO__`, passed from the frontend. Environment is not set, so the SDK default applies: `development` in debug builds, `production` in release, unless `SENTRY_ENVIRONMENT` is set.
- **Evidence:**
  - `src/lib/core/settings/sentry.service.ts:19-22` (release), `:50-60` (passed to `configure_sentry`).
  - `sentry-0.49.3/src/defaults.rs:86-100` (environment default and `SENTRY_ENVIRONMENT`).
  - `error_monitoring.rs:49-54`: no `environment` set.
- **Suggested fix:** Set `environment` explicitly (for example `"production"` for shipped builds, `"development"` for `pnpm tauri dev`) so the value does not depend on build profile or env vars. Low priority.

### S02-F9
- **Severity:** info
- **Claim:** Stack frame paths. `abs_path` comes from the binary's debug info (`sentry-backtrace-0.49.3/src/process.rs:89`). Symbols are stripped in release (`src-tauri/Cargo.toml:88`), so shipped frames may lack paths. Dev builds still carry `/Users/...` paths. The shipped case is UNVERIFIED: I did not build or inspect a release binary.
- **Evidence:** the file references above.
- **Suggested fix:** Verify on a built release artifact (`strings` or a test panic) before deciding whether a `before_send` path scrub is needed. Path remapping (`--remap-path-prefix`) is an option if paths do leak. UNVERIFIED.

### S02-F10
- **Severity:** low
- **Claim:** Test coverage is thin. `src-tauri/tests/error_monitoring_test.rs` covers only "invalid DSN returns error" and "disabled starts with no client". Nothing covers the enabled path, `server_name`, `before_send`, panic capture, or the reconfigure path.
- **Evidence:** `src-tauri/tests/error_monitoring_test.rs:1-21`.
- **Suggested fix:** Add tests that use a `sentry::test::TestTransport` (the `test` feature is not enabled in Cargo.toml, so this needs a feature change or a `transport` shim, UNVERIFIED how the test-only transport is exposed in 0.49.3). Assert the captured event has no hostname `server_name` and that a panic produces one event.

### S02-F11
- **Severity:** info
- **Claim:** Version pinning. `Cargo.toml` requires `sentry = "0.49.2"`; `Cargo.lock` resolves `0.49.3`. The local registry source matches the lock (0.49.3), so the audit above reads the exact resolved code.
- **Evidence:** `src-tauri/Cargo.toml:72`; `src-tauri/Cargo.lock:4702-4704`.
- **Suggested fix:** None.

## Open questions

1. Does the Sentry project store client IP addresses? `send_default_pii(false)` stops the SDK from adding the user IP, but server-side IP storage is a project setting. Not checked. Verify in the Sentry project settings.
2. Do any `panic!`, `expect`, or `unwrap` messages format note paths or note content? Not audited. Affects S02-F2 severity.
3. Does a shipped release binary contain frame paths (S02-F9)? Needs a build.
4. Does `server_name = Some("")` cause problems at Sentry ingest, or should a fixed constant be used? UNVERIFIED.
5. docs.rs `ContextIntegration` page does not name the cargo feature that enables it, and does not mention the hostname fill-in. Source at `sentry-contexts-0.49.3/src/integration.rs:74-77` is the evidence used.
