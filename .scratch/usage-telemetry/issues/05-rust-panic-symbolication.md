# 05: Rust panics in Sentry show function names (owner decision needed)

**What to build:** A shipped Rust panic reaches Sentry with frames that have only instruction addresses and `<unknown>` functions: `[profile.release]` sets `strip = true` and no `debug` (`src-tauri/Cargo.toml` about line 88), and the `sentry` crate's `debug-images` feature is off (`Cargo.toml` line 72), so the event carries no `debug_meta.images` and Sentry cannot match an uploaded dSYM. Symbolication needs all three:

1. enable the `debug-images` feature (each event then lists loaded library paths, `code_file`);
2. build release with debug info into a separate dSYM (`debug = "line-tables-only"` or `1`, `split-debuginfo = "packed"`) while still stripping the shipped binary; verify that `strip = true` with split debug info still yields a usable dSYM on macOS;
3. upload the dSYM from the release workflow with `sentry-cli debug-files upload` (same `SENTRY_AUTH_TOKEN` as Issue 04).

**Owner decision:** is readable Rust panic stacks worth a slower release build, a larger CI artifact, and library paths in each event? Panics are rare in this app. Today only the panic message reaches Sentry: `sentry-panic` 0.49.3 (`src/lib.rs` about lines 106-133) sends the payload and not `info.location()`. A much cheaper alternative to dSYMs is a `PanicIntegration::add_extractor` (or a custom hook) that appends `file:line` to the message: no debug info, no upload, no library paths. Recommended: do the extractor first, and defer dSYMs until a panic arrives that its message and location cannot explain.

**Blocked by:** 04 (shares the auth token and CI wiring)

**Status:** needs-info

**Gate:** Rust + CI: `cargo test --manifest-path src-tauri/Cargo.toml`, plus a `pnpm tauri:build:fast`-style local release build showing the dSYM is produced and `dwarfdump --uuid` matches the binary.

- [ ] Owner decision recorded in Notes
- [ ] `debug-images` enabled and `PRIVACY.md` lists library paths in Rust events
- [ ] Release build produces a dSYM matching the shipped binary UUID; shipped binary stays stripped
- [ ] Release workflow uploads the dSYM when the secret exists, skips otherwise

## Notes

- Source: `raw/j23.md` (S02-F9, s6-F2, N1).
- Size: M.

## Comments
