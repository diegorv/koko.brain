# Discovery: Tauri v3 alpha and its impact on KokoBrain

Status: discovery; upgrade prepared on branch `update-tauri-to-v3` (owner
decision 2026-09-15: stage the upgrade on a branch with exact alpha pins and a
draft PR, do not merge while v3 is alpha)
Source: research workflow run 2026-09-15 (7 dimensions, each researched and
then adversarially verified by a separate agent, plus a completeness critic).
Inputs: the GitHub release notes of every v3 alpha crate/package, shallow
clones of the `v3` branches of `tauri-apps/tauri` (HEAD `f44d111`, identical
to the alpha.1 tags), `tauri-apps/plugins-workspace` and `tauri-apps/tauri-docs`,
and this repo at `23d9a584`. Nothing was compiled during the discovery; every
"compiles" or "fails to compile" verdict below comes from reading source and
`cfg` gates.

Upstream paths below are relative to those clones (`tauri/`, `plugins/`,
`docs/`). Project paths are repo-relative.

## Upstream state on 2026-09-15

- `tauri` 3.0.0-alpha.0 (2026-09-13) and 3.0.0-alpha.1 (2026-09-15).
  `tauri-build` 3.0.0-alpha.0, `tauri-runtime-wry` 3.0.0-alpha.1. All nine
  plugin crates the app uses are 3.0.0-alpha.0 on crates.io, and the eight npm
  plugin packages it uses (global-shortcut is Rust-only here) are
  3.0.0-alpha.0 on npm `next`. `@tauri-apps/api` 3.0.0-alpha.0 (2026-09-12),
  `@tauri-apps/cli` 3.0.0-alpha.1. npm `latest` is still 2.x for every package.
- The official guide says: "Tauri 3.0 is in alpha. Its APIs may still change
  before the stable release" and "Keep production apps on 2.x"
  (`docs/src/content/docs/start/migrate/from-tauri-2.mdx:13-17`).
- No upstream source gives a v3 beta/stable date or a v2 end-of-life date.
  v2 is still maintained: the tauri default branch `dev` is 2.11.x with pending
  minor-level change files (MSRV 1.90, unstable crates locked to minor
  versions); the plugins-workspace default branch is `v2`.
- `tauri migrate` has no 2 -> 3 path (`tauri/crates/tauri-cli/src/migrate/mod.rs:48-67`
  handles v1 and v2 pre-releases only). The open PR #16023 says migration CLI
  support will be a separate PR.
- Headline change (PR #15985): the webview runtime is no longer built into
  `tauri`. Apps depend on `tauri-runtime-wry` (system webview) or the new
  `tauri-runtime-cef` (bundled Chromium) and select it with
  `tauri::Builder::runtime`. Most generic types (`App`, `AppHandle`,
  `Builder`, `Webview`, `WebviewWindow`, `Window`, `Context`) now default to
  the type-erased `tauri::DynRuntime`; the menu wrapper types (`Menu<R>`, ...)
  have no default and must name the runtime. Other themes: `gtk3`/`gtk4`
  features, ksni tray on Linux, a smaller embedded ACL, runtime-resolved dev
  resources, MSRV 1.95.

## Required changes (wry runtime)

| # | Change | Where | Why it matters |
|---|--------|-------|----------------|
| 1 | Call `.runtime(tauri_runtime_wry::Wry::default())` on the builder | `src-tauri/src/lib.rs:251` | `Builder::default()` is `Builder<DynRuntime>`; without attrs `DynRuntime::new` returns `RuntimeNotConfigured` (`tauri/crates/tauri-runtime/src/dynamic.rs:2745-2750`) and `.expect(...)` at `lib.rs:339` panics on every launch. `cargo test`, `pnpm check/vitest/build` all still pass: `cargo test` compiles `run()`, but no test constructs or launches a tauri `App`. |
| 2 | `Menu<tauri::Wry>` becomes `Menu<tauri::DynRuntime>` | `src-tauri/src/lib.rs:150` | `tauri::Wry` was removed (`tauri/crates/tauri/src/lib.rs:203-229`) and the macro-generated `Menu<R>` has no default runtime (`tauri/crates/tauri/src/menu/mod.rs:115`). The only compile break in `src-tauri/src/**`. |
| 3 | Add `tauri-runtime-wry` with `macos-private-api`, and KEEP `macos-private-api` + `protocol-asset` on `tauri` | `src-tauri/Cargo.toml:22` | The runtime crate must enable the feature (`tauri/crates/tauri-runtime-wry/Cargo.toml:71-75` forwards it). The guide's snippet drops it from `tauri`, but `tauri_build::build()` runs `manifest::check` (`tauri/crates/tauri-build/src/lib.rs:685`, `manifest.rs:42-58`) against `macOSPrivateApi: true` and `assetProtocol.enable` (`src-tauri/tauri.conf.json:13,31`) and fails the build. The CLI manifest rewrite never touches the runtime crate (`tauri/crates/tauri-cli/src/interface/rust/manifest.rs:459-490`). |
| 4 | Bump all nine `tauri-plugin-*` crates to 3.0.0-alpha.0 | `src-tauri/Cargo.toml:23-28,60-62` | `tauri` declares `links = "Tauri"`, so tauri 2 and 3 cannot coexist in one graph. Each plugin changelog says only "Update to tauri 3.0 alpha"; the Rust APIs the app calls (global-shortcut `with_handler`/`register_multiple`, `UpdaterExt::updater_builder`) are unchanged. Cargo.lock shows no other crate depending on tauri. |
| 5 | Bump `@tauri-apps/api`, `@tauri-apps/cli` and every `@tauri-apps/plugin-*` together | `package.json:43-51,84` | The CLI pairs `tauri` with npm `@tauri-apps/api` and each plugin crate with its npm package (`tauri/crates/tauri-cli/src/info/plugins.rs:34-68`). A major or minor mismatch fails `tauri build` unless `--ignore-version-mismatches` is passed (`build.rs:157-163`) and logs an error on `tauri dev` (`dev.rs:142-146`). |

Clean-ups caused by the migration: the doc comments at
`src-tauri/tests/utils_logger_test.rs:7-11` and
`src-tauri/tests/vault_watcher_test.rs:181` still say `AppHandle<Wry>`.

## Verified non-impacts

- `@tauri-apps/api` 3.0.0-alpha.0 has the same export lists and exports map as
  2.11.1 for every submodule the app imports (core, event, window,
  webviewWindow, path; `mocks` was checked too but is not imported). All 153
  import statements (148 static in 106 files, 5 dynamic `import()`) and the 60
  test files that `vi.mock('@tauri-apps/...')` are unaffected. Additive only:
  `Resource[Symbol.asyncDispose]`, `Image.rgba()` return type,
  `WindowOptions.noRedirectionBitmap`.
- Plugins: no Rust public API, config struct, JS guest API (except an http
  cleanup fix) or `permissions/default.toml` changed. Every permission
  identifier in `src-tauri/capabilities/default.json` and `composer.json`
  still resolves. The only removed identifiers
  (`global-shortcut:allow-register-all` / `deny-register-all`) are not used.
- `tauri.conf.json`: no key the app uses was removed or renamed. The only new
  v3 key is `bundle > cef`. Deep-link scheme registration on macOS still flows
  from `plugins.deep-link.desktop` into `CFBundleURLTypes`.
- Web origin on wry/macOS stays `tauri://localhost`, asset URLs stay
  `asset://localhost`, IPC stays `ipc://localhost`. The CSP, the asset protocol
  scope and `convertFileSrc` keep working, and the three localStorage keys
  (recent vaults, recent files, recent commands) are not orphaned.
- Bundler (`.app`/`.dmg`), `tauri-macos-sign`, updater signing env vars and the
  minisign format: v3 differs from v2 only by edition-2024 formatting and
  CEF-only branches. `tauri build --no-bundle -- --profile release-fast` still
  parses the same way.
- MSRV 1.95 is below the CI pin (rustc 1.98.0). Linux CI: `tauri-runtime-wry`
  enables `tauri/gtk3` itself; the existing apt packages still apply.
- E2E runs Playwright against Vite with aliased Tauri mocks; tauri-driver is not
  involved. `src-tauri/tests` uses no `tauri::test`/MockRuntime.
- No community plugins, no third-party crate or npm package depending on tauri.

## Updater: can a v2 install update to a v3 build?

Yes, from source: `src/` and `guest-js/` of `tauri-plugin-updater`
3.0.0-alpha.0 are byte-identical to `updater-v2.11.0`; outside them only the
CHANGELOG, version fields, autogenerated permission files and test manifests
changed (`gh api repos/tauri-apps/plugins-workspace/compare/updater-v2.11.0...v3`).
`latest.json` is written by tauri-action with the same shape, the
`.app.tar.gz` and `.sig` come from unchanged bundler/minisign paths, and the
pubkey in `tauri.conf.json` stays. Not exercised end to end.

## Risks and traps

1. **Nightly auto-ship.** `nightly.yml:27-39` builds every push to `main` and
   republishes the nightly `latest.json` without waiting for CI
   (`nightly.yml:166-169`). Merging the upgrade ships an alpha framework to
   nightly users. Keep it on the branch: `[skip nightly]` only skips the push
   whose head commit carries it (`nightly.yml:101,127`); every later push to
   `main` would still ship the alpha.
2. **Open PR #16023 on the v3 branch** renames `plugin::Builder::js_init_script`
   to `initialization_script` with no alias. The published opener and dialog
   3.0.0-alpha.0 still call the old name
   (`plugins/plugins/opener/src/lib.rs:236`, `plugins/plugins/dialog/src/lib.rs:200`)
   and accept any later `3.0.0-alpha.N` of tauri. The same PR removes
   `Runtime::run_iteration` and changes `Error::CreateWindow` in
   `tauri-runtime`, which alpha.1 `tauri` and `tauri-runtime-wry` still use,
   and touches `tauri-utils` and `tauri-macros`. The published
   `tauri` 3.0.0-alpha.1 depends on `tauri-runtime`, `tauri-utils`,
   `tauri-macros` (and the workspace on `tauri-codegen`) with `~3.0.0-alpha.0`,
   which also accepts later alphas. So exact `=` pins on the direct
   dependencies do not stop the break by themselves: the committed
   `Cargo.lock` is the real guard, and a bare `cargo update` on the branch
   must be avoided until upstream republishes. The same PR makes `UnlistenFn`
   return `Promise<void>` and folds `core:channel:default` into
   `core:default`; neither needs action here.
3. **tauri-action v1.0.0** predates v3 and declares no support. Its macOS path
   depends only on artifact paths and config keys that did not change, but it
   has not been tried.
4. **CEF is out.** It changes the origin to `http://tauri.localhost` (orphaning
   localStorage and with it deep-link vault resolution), puts the Chromium
   profile under `~/Library/Caches/com.diegorv.kokobrain/cef`, which is inside
   the app's own asset protocol scope (`tauri.conf.json:42`), downloads ~1 GB
   at build time and grows the bundle and updater payloads. It also
   contradicts ADR-0001's small-bundle rationale.
5. **Transitive runtime behavior** (wry 0.56, tao, muda 0.20): macOS
   `transparent`/`fullscreen` flags now always on in wry, the traffic-light
   inset is re-applied after title change or fullscreen exit, and menu
   accelerators distinguish physical keys from logical characters. Runtime
   changes, not compile breaks; covered by the QA checklist below.
6. **Duplicate `@tauri-apps/api`.** The plugin-* 3.0.0-alpha.0 npm packages
   still depend on `@tauri-apps/api ^2.11.0`, so installing api 3 alpha keeps a
   2.x copy for the plugins. Expected to interoperate: both copies use the same
   `__TAURI_INTERNALS__` / `__TAURI_TO_IPC_KEY__` protocol (read, not run).
   Class identity differs between the copies (`instanceof` on
   `Resource`/`Channel`). If that bites, a pnpm override for
   `@tauri-apps/api` collapses the copies.
7. **Dependabot asymmetry.** `.github/dependabot.yml` exempts `@tauri-apps/*`
   from the npm cooldown but gives cargo a 14-day cooldown with no tauri
   exemption, so npm bumps can land ahead of the crates. Within 3.0.x the CLI
   check still passes; it matters at a minor bump.
8. **gtk-rs 0.18 is not solved by v3.** wry still pulls gtk 0.18, so
   `RUSTSEC-2024-0429` stays ignored and
   `.scratch/tauri-gtk-rs-018-bump/issues/01-tauri-off-gtk-rs-018.md` stays
   blocked on upstream.

## Corrections made during verification

- A researcher claimed a missing `macos-private-api` on `tauri-runtime-wry`
  renders the composer opaque silently. Refuted by reading the `cfg` gates:
  `WindowBuilder::transparent` is a required trait method gated on
  `any(not(target_os = "macos"), feature = "macos-private-api")`
  (`tauri/crates/tauri-runtime/src/window.rs:369-375`), and
  `tauri-runtime-wry` implements it only under its own feature
  (`tauri/crates/tauri-runtime-wry/src/lib.rs:1186-1187`). The combination
  should fail to compile (E0046) inside `tauri-runtime-wry` on macOS targets;
  the Linux `cargo test` job would not catch it.
- A researcher said `@tauri-apps/api` could stay on ^2.11.1 because its
  contents are identical. Refuted by the CLI version-mismatch check (item 5).
- The guide's "move `macos-private-api` to the runtime crate" snippet is wrong
  for any app with `macOSPrivateApi: true` (item 3).

## ADR impact

ADR-0001 lists "Tauri 2 ships a breaking v3" as a re-evaluation trigger
(`docs/adr/0001-tauri-svelte-sveltekit-stack.md:45`). The measured cost on the
wry path is small, so the stack decision stands. Record an amendment (v3 on
`tauri-runtime-wry`, CEF rejected) when the upgrade is merged.

## Manual QA checklist for the branch

No automated gate launches the app. Before merging:

- App launches from `pnpm tauri dev` without `RuntimeNotConfigured`.
- Composer popover: transparent, close button hides instead of destroying,
  summons onto the active Space via the global shortcut.
- Menu: About panel shows version and git hash; `Cmd+,` opens Settings, also on
  a non-US keyboard layout.
- Traffic lights keep their position after entering and leaving fullscreen.
- Images in live preview load through `convertFileSrc`.
- Recent vaults/files survive the upgrade; `kokobrain://` deep links resolve.
- Updater channel check (stable and nightly) returns without error.
