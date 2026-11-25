# 01: Replace the unmaintained `chrono` crate

**What to build:** Remove `chrono` from `src-tauri/Cargo.toml` and rewrite its six uses on a maintained crate, with every output string byte-identical to today's. `chrono` 0.4 is flagged unmaintained (RUSTSEC-2026-0543, code scanning alert #176, osv-scanner) and no fixed release exists. It is a direct dependency only: nothing else in the tree pulls it in, so this removes it from `Cargo.lock`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml` and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`.

- [ ] Pick the replacement and say why in the commit: `jiff` (0.2.x is already in `Cargo.lock`) or `time` 0.3 (already in the tree through `cookie`). Prefer the one that keeps the formats below with the least code.
- [ ] `captured_at` (`src-tauri/src/lib.rs:57`, `src-tauri/src/quick_capture/commands.rs:352`, `:479`): same string as `chrono::Utc::now().to_rfc3339()`, i.e. `YYYY-MM-DDTHH:MM:SS.fffffffff+00:00` (offset `+00:00`, not `Z`; nanosecond fraction as chrono prints it). It reaches note content through the Quick Capture `capturedAt` template variable (`src/lib/plugins/quick-capture/quick-capture.service.ts:133`, `src/lib/app/deep-link-actions.ts:191`).
- [ ] Screenshot temp name (`src-tauri/src/quick_capture/commands.rs:153-155`): same `%Y%m%dT%H%M%S%6f` stamp in UTC (`qc-shot-20261125T214828123456.png`).
- [ ] `written_at_secs` (`src-tauri/src/vault/index_cache.rs:99`): same Unix seconds as `chrono::Utc::now().timestamp()`.
- [ ] Log line time (`src-tauri/src/utils/logger.rs:61`): same local-time `%H:%M:%S%.3f`, using the system time zone.
- [ ] A unit test per format pins the exact output for a fixed instant (and, for the logger, a fixed offset), so a later swap cannot change a string silently.
- [ ] `chrono` is gone from `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`; `cargo tree --locked -i chrono --target all` prints nothing.

## Notes

- Alert #176 is dismissed as "won't fix" with a link to this Issue; it closes for good once `chrono` leaves the lockfile.
- `cargo update` re-picks unrelated windows-sys edges; restore unchanged crates' blocks to HEAD and gate with `cargo tree --locked`.
