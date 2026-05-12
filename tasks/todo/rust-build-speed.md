# Rust build speed — trivial wins

Reduce wall-clock for `pnpm tauri build` when nothing in `src-tauri/` changed. Only trivial / low-complexity changes; no system-level installs (`sccache`, `lld`, `mold`) and no behaviour-changing defaults.

## Tasks

- [x] Task 1: Add `cargo:rerun-if-changed` directives to `src-tauri/build.rs` so the build script only re-runs when `build.rs` itself, the source tree, or `.git/HEAD` changes. Today it has none, which makes Cargo conservative about caching.
- [ ] Task 2: Add a `[profile.release-fast]` profile to `src-tauri/Cargo.toml` that drops LTO and uses `codegen-units = 16` for fast local release builds. Existing `[profile.release]` (used by CI / shipping builds) is untouched.
- [ ] Task 3: Add a `tauri:build:fast` npm script to `package.json` that runs `tauri build --no-bundle` with `--profile release-fast`. Skips the dmg / codesign / app bundling step and uses the faster profile, for local "did it still compile" loops. The default `tauri:build` (via `pnpm tauri build`) is unchanged.

## Out of scope

- `sccache` / `lld` / `mold`: system-level installs.
- Skip `pnpm build` when `src/` unchanged: medium complexity (script wrapper).
- Change `bundle.targets` default: would silently stop producing dmg for everyone.
- `cargo clean` of the 150 GB stale `target/debug`: one-shot user action, not a repo change.

## Notes

- Branch: `chore/rust-build-speed`.
- Baseline (from earlier `pnpm tauri build` run): vite client 30s + vite server 1m11s + cargo release link single-CGU dominates the rest.
