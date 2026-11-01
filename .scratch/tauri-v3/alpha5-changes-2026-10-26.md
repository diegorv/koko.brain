# Tauri 3 alpha.5 bump: what changed and what is untested

Record of the bump from the 2026-09-15 alphas to the 2026-10-14 alphas on
branch `update-tauri-to-v3` (commit `5b29278e`). Plan: `plan-2026-09-15.md`,
Task 5.

## Versions

| Side | Package | Before | After |
|------|---------|--------|-------|
| Rust | `tauri` | `=3.0.0-alpha.1` | `=3.0.0-alpha.5` |
| Rust | `tauri-runtime-wry` | `=3.0.0-alpha.1` | `=3.0.0-alpha.5` |
| Rust | `tauri-build` | `=3.0.0-alpha.0` | `=3.0.0-alpha.4` |
| Rust | `tauri-plugin-*` (9 crates) | `=3.0.0-alpha.0` | `=3.0.0-alpha.3` (dialog `alpha.4`) |
| Rust | transitive `tauri-runtime`, `tauri-utils`, `tauri-codegen`, `tauri-macros`, `tauri-plugin` | `3.0.0-alpha.0` | `3.0.0-alpha.4` |
| npm | `@tauri-apps/cli` | `3.0.0-alpha.1` | `3.0.0-alpha.5` |
| npm | `@tauri-apps/api` + 8 plugins | `3.0.0-alpha.0` | `3.0.0-alpha.3` (plugin-dialog `alpha.4`) |

Bump every tauri crate together. A partial `cargo update -p` fails to
resolve, and a bare `cargo update` lets the transitive crates drift on their
own.

## Breaking changes absorbed

1. **`macos-private-api` cargo feature removed** from both `tauri` and
   `tauri-runtime-wry`. Cargo fails with "depends on `tauri` with feature
   `macos-private-api` but `tauri` does not have that feature".
   Fix: drop the feature from both entries in `src-tauri/Cargo.toml`. In
   alpha.5, `tauri-runtime-wry` calls `with_transparent` without a feature
   gate.

2. **`app.macOSPrivateApi` config key removed.** `tauri-build` fails with
   "unknown field `macOSPrivateApi`".
   Fix: delete the key from `src-tauri/tauri.conf.json`.

3. **tauri-plugin-fs dropped `read_text_file` / `write_text_file`.** The
   capability check fails with "Permission fs:allow-read-text-file not
   found". The JS `readTextFile` / `writeTextFile` helpers are now thin
   wrappers over `readFile` / `writeFile` (UTF-8 decode/encode), so they
   invoke `read_file` / `write_file`.
   Fix: rename `fs:allow-read-text-file` -> `fs:allow-read-file` and
   `fs:allow-write-text-file` -> `fs:allow-write-file` in
   `src-tauri/capabilities/default.json`, with unchanged path scopes. The app
   call sites did not change.

4. **tauri-plugin-opener renamed `revealItemInDir` -> `revealItemsInDir`**
   (it takes `string | string[]`). `pnpm check` fails on the missing export.
   Fix: `src/lib/core/filesystem/fs.service.ts` and its test. The
   `opener:default` permission already includes `allow-reveal-items-in-dir`.

## Verified

- `cargo test --manifest-path src-tauri/Cargo.toml`: 26 suites ok
- `pnpm check`: 0 errors
- `pnpm vitest run`: 6620 passed
- `pnpm build`: ok

None of these gates launches the app. Runtime behavior is unverified.

## Not tested (manual QA, `pnpm tauri dev`)

- [ ] **Transparent composer window** (quick capture popover, ADR-0028). It
  was the reason for `macos-private-api`. Confirm it is still transparent now
  that the feature and config key are gone.
- [ ] **File read/write under the renamed fs permissions.** Open, edit, save
  and create notes in a vault under `$HOME/kokobrain-vaults` and
  `$DOCUMENT/kokobrain-vaults`. Also check settings, trash and
  `.kokobrain/` files, and log writes under `$APPLOG`.
- [ ] **Reveal in Finder** (file explorer context menu), which now goes
  through `revealItemsInDir`.
- [ ] **App menu** (`build_menu`, `Menu<DynRuntime>`).
- [ ] **Global shortcuts** (tauri-plugin-global-shortcut alpha.3).
- [ ] **Updater** check/download (tauri-plugin-updater alpha.3). No release
  channel serves Tauri 3 builds, so use the `tauri-v3-alpha` pre-release
  bundle.
- [ ] **Deep links** (`kokobrain://`) and the **clipboard / dialog / http /
  process** plugins.
- [ ] **Signed release build** from `tauri-alpha-release.yml` on the pushed
  commit: confirm it builds, signs and notarizes.

## Docs left stale on purpose

These still describe `macos-private-api` and are updated with plan Task 6
(re-pin to the stable release):

- `discovery-tauri-v3-2026-09-15.md`, item 3 and the notes near the end
- `docs/adr/0028-quick-capture-merge-into-kokobrain.md`, line 58
