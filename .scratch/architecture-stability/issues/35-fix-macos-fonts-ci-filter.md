# 35: The macOS fonts CI job runs zero tests

**What to build:** CI job `rust-fonts-macos` (`.github/workflows/ci.yml:120`) filters on `commands::fonts_test::macos`. Commit 23beb215 (2026-05-25) deleted `tests/commands/fonts_test.rs` and moved those tests inline into `commands/fonts.rs`. The filter matches nothing, so the job has run 0 tests and passed ever since. The macOS-gated tests in `tests/semantic_qos_test.rs` (:13, :29, :48) and `tests/utils_fs_test.rs:410` don't run in CI either.

Change the job to run `cargo test --manifest-path src-tauri/Cargo.toml -p kokobrain --lib commands::fonts` plus `--test semantic_qos_test` and `--test utils_fs_test`. The `-p` keeps the command valid if the workspace from issue 29 ever exists.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`; then the CI run on the push

**Source:** .github/workflows/ci.yml:110-125, src-tauri/src/commands/fonts.rs, src-tauri/tests/semantic_qos_test.rs, src-tauri/tests/utils_fs_test.rs; commit 23beb215

- [ ] The CI log of the job shows a non-zero "passed" count for each of the three targets
- [ ] The job fails if a filter matches zero tests (for example, a step that checks the `running N tests` line is not 0)

## Notes

- **Re-checked at 1f4b769d:** the filter is still at ci.yml:120; the package is `kokobrain` (lib target `kokobrain_lib`), and the fonts tests sit in `commands/fonts.rs` behind `#[cfg(target_os = "macos")] mod tests`.
- **Size:** S.
