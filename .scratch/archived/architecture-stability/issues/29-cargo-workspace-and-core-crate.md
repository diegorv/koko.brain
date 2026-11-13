# 29 (deferred until a second Rust consumer exists): Create the Cargo workspace and the kokobrain-core crate

**What to build:**

1. **Move the code.** `git mv` vault/, db/, search/, semantic/, utils/ and history.rs into `src-tauri/crates/kokobrain-core/src/`.
2. **Core crate manifest.**
   - `publish = false`, `version = "0.0.0"`
   - no tauri, sentry, sysinfo, objc2, arboard or image
3. **`src-tauri/Cargo.toml` becomes the workspace root.**
   - `[workspace] members = [".", "crates/kokobrain-core"]` and `default-members` set to the same list
   - `[workspace.dependencies]` for crates both sides use (serde, serde_json, tokio, chrono)
   - the core dependency as `kokobrain-core = { path }`, with no features. The `semantic`/`watcher` features come later with the iOS work, which also needs cfg gates in the app's `commands::semantic` and `generate_handler!`
   - `[workspace.dependencies]` entries written as inline tables only: release.sh:117's `^version =` sed would clobber a multi-line `[workspace.dependencies.X]` table
4. **App `lib.rs`.** Add `pub use kokobrain_core::{db, history, search, semantic, utils, vault};`, so commands and tests compile unchanged. `build.rs` (clang_rt link, GIT_HASH) stays in the app.
5. **Other edits.**
   - `privacy.yml:85`: change the root to `src-tauri`
   - `parseDirectDeps` in scripts/check-outdated-cargo.mjs: iterate all workspace packages, with a vitest case
   - docs: DEV-ENVIRONMENT and the CLAUDE.md layout line

**Blocked by:** 26, 27, 28

**Status:** wontfix

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`, plus the frontend gate for the check-outdated-cargo script and its test

**Source:** src-tauri/Cargo.toml, build.rs, lib.rs, .github/workflows/privacy.yml, scripts/check-outdated-cargo.mjs, src/tests/scripts/check-outdated-cargo.test.ts, scripts/release.sh, ADR-0001; Cargo workspaces https://doc.rust-lang.org/cargo/reference/workspaces.html; Tauri project structure https://v2.tauri.app/start/project-structure/

- [ ] `cargo tree -p kokobrain-core -e normal | grep -c tauri` == 0
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml -- --list 2>/dev/null | grep -c ': test$'` is at least the pre-split count, which proves `default-members` covers core
- [ ] `git diff src-tauri/Cargo.lock` adds only the `kokobrain-core` package and edits `kokobrain`'s deps list, and `cargo metadata --locked` passes
- [ ] `pnpm tauri build` writes the bundle to `src-tauri/target/<triple>/release/bundle`, so CI paths are unchanged
- [ ] `pnpm tauri dev` rebuilds after a core file is edited, and `pnpm tauri:build:fast` succeeds
- [ ] The privacy job passes and its scan covers `crates/kokobrain-core/src`

## Notes

- **Why `src-tauri/` is the workspace root**, with core at `src-tauri/crates/kokobrain-core` and not at a repo-root `crates/`: `Cargo.lock` and `target/` stay where they are. That keeps these unchanged:
  - publish-checksums, the setup action cache, security.yml, dependabot.yml, release.sh, check-outdated-cargo
  - the CI `src-tauri/**` filters, the relay-lite rule, and the shared-target worktree config
- **Gate trap:** without `default-members`, a bare `cargo test` runs only the root package, and core silently drops out of the gate.
- **iOS:** mobile has no `ort` download-binaries, so the iOS work will need Cargo features in core. The iOS branches are 1000+ commits behind main, so this issue does not add those features speculatively.
- **Why deferred:** no Rust bug since July came from Tauri coupling, and issue 26's ratchet already keeps the domain modules Tauri-free.
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/184-cargo-workspace-kokobrain-core-crate-exists.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
