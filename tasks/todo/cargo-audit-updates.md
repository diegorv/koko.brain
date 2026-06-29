# Cargo audit dependency updates

Fix the actionable advisory from `cargo audit` (run in `src-tauri/`). One change
per commit: update, run the Rust test suite (`cargo test --manifest-path
src-tauri/Cargo.toml`), commit only if green. Work happens directly on `main`.

## Tasks

- [x] Task 1: Update `quinn-proto` to >=0.11.15 (RUSTSEC-2026-0185, high, remote memory exhaustion) via `cargo update -p quinn-proto`. Transitive via reqwest (tauri-plugin-http), semver-compatible 0.11.x bump.
- [ ] Task 2: Re-run `cargo audit`, confirm only the unfixable gtk-rs warnings remain, move this file to tasks/done/

## Notes

- The 19 warnings are all "gtk-rs GTK3 bindings - no longer maintained" (atk, gdk, gdkx11, gtk, pango, etc.), transitive via tauri -> wry -> webkit2gtk/gtk. These are unmaintained notices, not vulnerabilities, with no upstream replacement while Tauri targets GTK3. Out of our control; leave as-is.
- Test gate: Rust only -> `cargo test --manifest-path src-tauri/Cargo.toml`.
- No `minimumReleaseAge` equivalent for cargo in this repo, so no quarantine concern.
