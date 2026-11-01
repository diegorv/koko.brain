# 13: Clippy clean-up, then a CI gate

**What to build:** Recount first:

`CARGO_BUILD_JOBS=2 nice -n 19 cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings > /tmp/clippy.txt 2>&1; echo $?`

Then:
- **About 60 or fewer:** fix them one module per commit (`cargo clippy --fix` where safe).
- **More than that:** add `[lints.clippy]` to src-tauri/Cargo.toml with each failing lint set to `allow`, then remove entries over time.

After either path:
- Add `clippy` to `components` in .github/actions/setup (it lists only llvm-tools today).
- Add a "Clippy" step to the ci.yml `rust` job.
- Note in rust-toolchain bump Issues that any new lints must be fixed along with the bump.

**Blocked by:** none


**Status:** resolved

**Gate:**
- `cargo test --manifest-path src-tauri/Cargo.toml`
- the clippy command above, with its exit code read separately and never through a pipe

**Source:** .github/workflows/ci.yml (rust job), .github/actions/setup/action.yml:46-52, src-tauri/Cargo.toml

- [x] Clippy exits 0 on main, with or without allow entries
- [x] The CI rust job fails on a new clippy warning
- [x] Every allow entry has a one-line reason
- [x] No behaviour change: cargo test is green, and the fixes are mechanical lint fixes only

## Notes

- **Baseline:** 42 errors as of 2026-08-19 (stale; the recount step replaces it). Clippy has never run in CI.
- **Pinned toolchain:** 1.98.0, so new lints arrive only on a manual bump.
- **Interaction with issue 29:** if the workspace exists, run clippy with `--workspace`.
- **Size:** S-M.

## Comments

- 2026-11-01, branch issue/13-clippy-clean-then-gate: clippy findings fixed mechanically across src-tauri (src + tests), reasoned allow entries where kept, and a clippy step with `-D warnings` added to the CI rust job. Tests: vitest 373 files / 9071 passed, pnpm build ok, cargo test 1141 passed / 0 failed. Reviews: round 1 CHANGES_REQUESTED (fixed in the build fix round), round 2 APPROVED with no findings.
