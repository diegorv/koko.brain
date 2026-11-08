# 189: Rust panics in Sentry show function names (deferred)

**Origin:** `usage-telemetry` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Full symbolication of Rust panic stacks. A shipped panic has frames with only instruction addresses and `<unknown>` functions:
- `[profile.release]` sets `strip = true` and no `debug` (`src-tauri/Cargo.toml` about line 88);
- the `sentry` crate's `debug-images` feature is off (`Cargo.toml` line 72), so the event carries no `debug_meta.images` and Sentry cannot match an uploaded dSYM.

Symbolication needs all three of these:

1. Enable the `debug-images` feature. Each event then lists loaded library paths (`code_file`).
2. Build release with debug info into a separate dSYM (`debug = "line-tables-only"` or `1`, plus `split-debuginfo = "packed"`) while still stripping the shipped binary. Verify that `strip = true` with split debug info still yields a usable dSYM on macOS.
3. Upload the dSYM from the release workflow with `sentry-cli debug-files upload`, using the same `SENTRY_AUTH_TOKEN` as Issue 04.

**Owner decision:** are readable Rust stacks worth a slower release build, a larger CI artifact, and library paths in each event? Recommended: wait until Issue 05 (file:line in the message) has shipped and a panic arrives that its location cannot explain.

**Blocked by:** 187, 035

**Status:** needs-info

**Gate:** Rust + CI: `cargo test --manifest-path src-tauri/Cargo.toml`, plus a local release build showing that the dSYM is produced and that `dwarfdump --uuid` matches the binary.

- [ ] The owner decision is recorded in Notes.
- [ ] `debug-images` is enabled, and `PRIVACY.md` lists library paths in Rust events.
- [ ] The release build produces a dSYM whose UUID matches the shipped binary, and the shipped binary stays stripped.
- [ ] The release workflow uploads the dSYM when the secret exists and skips the upload otherwise.

## Notes

- Owner decision 2026-11-06 (survey): defer. Revisit only if a panic arrives that Issue 05's file:line cannot explain. Do not launch.
- Split from the original Issue 05 on 2026-11-06.
- Source: `raw/j23.md` (S02-F9, s6-F2, N1).
- Size: M.

## Comments
