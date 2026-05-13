# Release channels: stable + nightly

Introduce a second release channel (`nightly`) alongside the existing tag-driven `stable` channel. Nightly builds are produced on every push to `main`, published to a fixed GitHub release tag (`nightly`) as a pre-release. The desktop app exposes the channel in the UI, lets the user switch which channel the auto-updater follows, and clearly labels nightly builds so users can tell them apart from official releases.

## Goals

1. Nightly DMG produced on every push to `main` (no cron, no schedule limits — open-source repo).
2. Single fixed pre-release tag `nightly` with assets overwritten on each push (`--clobber`), one entry that always reads "Nightly".
3. Stable releases continue working exactly as today (tag `X.Y.Z-alpha` → `release.yml`).
4. Build differentiates channel in `__BUILD_INFO__` and exposes a runtime constant `__APP_CHANNEL__` (`'stable' | 'nightly'`).
5. Settings UI ("Update" section) lets the user pick which channel the in-app updater follows, with clear warnings about the implications of switching.
6. UI surfaces the active channel in: settings (Update section), Troubleshooting (Build row), and the welcome/blank `+page.svelte` build-info footer.

## Non-goals

- Windows/Linux builds (still macOS aarch64 only).
- Separate code-signing identities or bundle identifiers per channel (one Apple cert, same `com.diegorv.kokobrain` identifier).
- Migration tooling between channels (switching channel = manual re-download if the user wants a clean state; the in-app updater handles the actual binary swap on next check).
- Rollback / "pin to version X" tooling.

## Architecture decisions

### Why fixed tag `nightly` (not per-commit tags)
- One GitHub release entry, always at the top, labeled "Nightly". Mirrors OrcaSlicer's pattern.
- `latest.json` URL is stable: `releases/download/nightly/latest.json`.
- `gh release upload --clobber` rotates assets in place; no tag bloat.

### Why runtime endpoint switch (not separate Tauri builds per channel)
- The user's setting must affect which channel they receive updates from. If endpoints were baked at build time, a nightly user could never "downgrade" to stable through the in-app updater.
- Tauri 2's `plugin-updater` (JS side) reads endpoints from `tauri.conf.json` at build time and the JS `check()` API has no `endpoints` override. We add a thin Rust command `check_for_update_on_channel(channel)` that constructs the Updater with the right endpoint, mirroring the behavior of the existing JS `check()` but parameterized.
- Stable + nightly builds ship the same Rust command; setting persists in `AppSettings.updates.channel` and is passed to the command.

### Version string in nightly builds
- Stable: `2.0.19-alpha` (from `package.json`, controlled by `chore: bump version` commits).
- Nightly: `2.0.19-alpha-nightly.<short-sha>` so the updater can distinguish nightly from stable by semver. Tauri's updater compares versions semver-style; the `-nightly.<sha>` prerelease tag sorts after `-alpha` correctly. This ALSO means a nightly user with `2.0.19-alpha-nightly.abc` will NOT be offered a "downgrade" to stable `2.0.19-alpha` by mistake (the nightly is semver-greater). Switching nightly→stable requires manual reinstall.

### Updater signing
- Same `TAURI_SIGNING_PRIVATE_KEY` for both channels. The public key in `tauri.conf.json` validates both. No new secrets needed.

## Tasks

- [x] Task 1: Wire build-time channel into the frontend
  - Add `process.env.KOKO_RELEASE_CHANNEL` reading in `vite.config.js`, defaulting to `'stable'`.
  - Define `__APP_CHANNEL__` (`'stable' | 'nightly'`) alongside `__BUILD_INFO__`.
  - Update `src/app.d.ts` with the new ambient declaration.
  - For nightly builds, compute the version as `${pkg.version}-nightly.<commitCount>.<sha>` (commit count is required so consecutive nightlies sort monotonically under semver; raw shas sort lexically and would break the auto-updater).
  - Helper extracted to `src/lib/utils/build-info.js` (kept as `.js` so vite.config.js can `import` it at config-load time without a TS transpile pass). Tests in `src/tests/lib/utils/build-info.test.ts`.

- [x] Task 2: Add `updates.channel` to `AppSettings`
  - Extended `settings.types.ts` with `ReleaseChannel` + `UpdateSettings { channel: ReleaseChannel }` and `updates: UpdateSettings` on `AppSettings`.
  - `DEFAULT_SETTINGS.updates.channel = 'stable'`. The build-channel default for fresh installs is applied at load time (see service change), not on the static constant — keeps tests of `DEFAULT_SETTINGS` deterministic.
  - Added `settingsStore.updateChannel(channel)` setter + `get updates()` getter.
  - `settings.service.ts` `loadSettings()` honours `parsed.updates?.channel` when present, otherwise falls back to `getBuildChannel()` (new helper at `src/lib/utils/app-channel.ts` reading `__APP_CHANNEL__` safely). All four load paths covered: fresh install, empty file, missing-`updates` block on existing file, parse/read error.
  - Tests: extended `src/tests/lib/core/settings/settings.store.test.ts` (3 new tests) and `src/tests/lib/core/settings/settings.service.test.ts` (5 new tests covering build-channel fallback + explicit-channel preservation).

- [x] Task 3: Render channel in `Troubleshooting` and `+page.svelte` build-info footer
  - Added `channelLabel(channel)` helper to `src/lib/utils/build-info.js` (returns `'STABLE'` / `'NIGHTLY'`) with tests.
  - `TroubleshootingSection.svelte` and `+page.svelte` now render a small pill badge before `__BUILD_INFO__`. Badge styling diverges per channel: amber tint for nightly, muted neutral for stable. The badge label is uppercased so it reads as a tag rather than prose (matches GitHub "Latest"/"Pre-release" convention).
  - No shared Svelte component extracted — inline span in both locations. CLAUDE.md prefers extraction only when complexity justifies it; Task 6 will add a third callsite in `UpdateSection.svelte` but the markup stays trivial so DRY isn't urgent.
  - Tests: 2 new tests on `channelLabel`. Svelte component rendering is not part of this project's vitest setup (no `@testing-library/svelte` dependency), so the visual badge is covered by manual smoke and E2E rather than a unit test.

- [x] Task 4: Rust command `check_for_update_on_channel`
  - New module `src-tauri/src/commands/update_channel.rs` with:
    - `endpoint_for_channel(channel: &str) -> &'static str` pure helper (unknown channel → stable, matches frontend `parseReleaseChannel` policy).
    - `pub const STABLE_ENDPOINT` / `pub const NIGHTLY_ENDPOINT` constants (exposed so tests can assert against them).
    - `check_for_update_on_channel(webview, channel)` Tauri command — builds the Updater via `webview.updater_builder().endpoints(vec![url])`, runs `.check()`, stores the resulting `Update` in `webview.resources_table()`, returns `UpdateMetadata { rid, currentVersion, version, body }`.
  - Registered in `commands/mod.rs` and `lib.rs` invoke_handler.
  - Added `url = "2"` to `src-tauri/Cargo.toml` (UpdaterBuilder's `endpoints()` signature requires `Vec<url::Url>` and the plugin does not re-export the type).
  - Tests at `src-tauri/tests/commands/update_channel_test.rs` (5 tests): nightly maps to nightly URL, stable maps to stable URL, unknown values fall back to stable, both URLs parse, both target the expected GitHub release paths. Network round-trip not unit-tested.

- [x] Task 5: ~~Rust command for "download and install on channel"~~ — **NOT NEEDED**
  - The `Update` object stored in the webview's resource table by `check_for_update_on_channel` (Task 4) already carries the per-channel bundle download URL inside it (`Update.download_url`, populated from the channel's `latest.json`).
  - The built-in `plugin:updater|download_and_install` command (registered by `tauri_plugin_updater::Builder::new().build()` in `lib.rs:91`) accepts a `rid` and reads the Update from the same resource table — it does not need to know the channel because the URL is already baked in.
  - Task 6 (frontend) will call `invoke('plugin:updater|download_and_install', { rid, onEvent })` directly. No additional Rust command required, no duplicate code path.

- [ ] Task 6: Rewrite `UpdateSection.svelte` to use the new commands
  - Replace `import { check } from '@tauri-apps/plugin-updater'` with `invoke('check_for_update_on_channel', { channel })`.
  - Add a `Channel` setting row with a `Select` (stable / nightly) bound to `settingsStore.updates.channel`. Calling the setter writes to settings.json.
  - Add an informational note under the toggle explaining the version semantics ("Nightly builds use version format `X.Y.Z-nightly.<sha>`. Switching from nightly to stable requires a manual reinstall — the auto-updater won't downgrade.").
  - Subscribe to a Tauri event for progress; cleanup on unmount.
  - Show the active channel as a badge near the current version.
  - Tests: `src/tests/update-section.test.ts` (create) — mock `invoke` + the event listener; assert the channel setting drives which channel is passed to `invoke`; assert progress events update the UI.

- [ ] Task 7: GitHub Actions — `nightly.yml`
  - New workflow at `.github/workflows/nightly.yml`:
    - Triggers: `push: { branches: [main] }` + `workflow_dispatch`.
    - `concurrency: { group: nightly, cancel-in-progress: true }` so a fast push supersedes the previous run.
    - `validate` step: trivial (always on main). Skip the `validate` job entirely.
    - `ci` + `e2e` jobs: reuse `./.github/workflows/ci.yml` + `e2e.yml` (same pattern as `release.yml`). Both must pass before build.
    - `build-macos` step:
      - Same `actions/checkout` + `setup` action as release.yml.
      - Compute nightly version: `NIGHTLY_VERSION="${PKG_VERSION}-nightly.${SHORT_SHA}"`.
      - Patch `src-tauri/tauri.conf.json` `version` field in-place (`jq` or `sed`) before the Tauri build runs. Restore at end of job (job-scoped, no commit). This is the cleanest way to bake the nightly version into the bundle's `Info.plist` and the generated `latest.json`.
      - Set `KOKO_RELEASE_CHANNEL=nightly` env var so vite's build-info code picks it up.
      - `tauri-apps/tauri-action` with:
        - `tagName: nightly`
        - `releaseName: 'Nightly Build'`
        - `releaseBody:` (templated) include "Built from main @ ${SHORT_SHA}", commit subject, link to compare with previous nightly, and a warning that nightly is unstable.
        - `releaseDraft: false`
        - `prerelease: true`
      - Before the action runs, delete the previous nightly release's assets via `gh release delete-asset` (loop) OR rely on the action's overwrite behavior — verify which works in practice.
      - Generate SHA-256 checksums same as release.yml.
      - Upload checksums with `gh release upload nightly checksums-sha256.txt --clobber`.
    - Use the same secrets (`APPLE_*`, `TAURI_SIGNING_*`, `GITHUB_TOKEN`) as `release.yml`.
  - Test by running `workflow_dispatch` manually after the first commit and verifying:
    - Single `nightly` release exists with pre-release flag set.
    - Assets are replaced (not appended) on subsequent runs.
    - `latest.json` URL `https://github.com/diegorv/koko.brain/releases/download/nightly/latest.json` is reachable.

- [ ] Task 8: Update release notes / docs
  - Update `docs/` (the README or a relevant section, no new file unless content justifies one) with:
    - The two channels, their cadence, where to download each.
    - The version-string semantics and the one-way-update rule (nightly → stable requires reinstall).
    - The setting toggle and what it does.
  - This is the ONLY task that touches markdown/docs. Keep it concise — one paragraph per topic.

- [ ] Task 9: Smoke-test end-to-end
  - Local: build a nightly bundle via `KOKO_RELEASE_CHANNEL=nightly pnpm tauri:build:fast`. Confirm `__BUILD_INFO__` shows the nightly version.
  - CI: trigger `nightly.yml` via `workflow_dispatch` on a feature branch first (gate any push-to-main trigger behind a one-line `if: github.repository == 'diegorv/koko.brain'` to prevent accidental fork-side runs).
  - In the app: install nightly DMG, verify Settings → Update shows `nightly` channel by default for nightly builds (Task 1 sets the default via the build-time channel, overriding `DEFAULT_SETTINGS` for nightly builds).
  - Switch channel in settings, click "Check for updates", verify the request goes to the right URL (inspect via the existing log infra — `appendLog('UPDATER', endpoint)` in the Rust command).

## Notes

### Endpoint format reminder
Tauri's `latest.json` schema (we don't generate it — `tauri-action` does):
```json
{
  "version": "2.0.19-alpha",
  "notes": "...",
  "pub_date": "2026-05-13T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/.../KokoBrain.app.tar.gz"
    }
  }
}
```

For the nightly channel, `tauri-action` writes the same file under the `nightly` release. Both files exist independently.

### Default channel on nightly builds
A user who downloaded a nightly DMG should see `nightly` as the default channel in settings, not `stable`. Two options:

- **Option A (recommended):** Override `DEFAULT_SETTINGS.updates.channel` at runtime: if `__APP_CHANNEL__ === 'nightly'`, set `'nightly'` as the default.
- **Option B:** Hard-code in settings store load.

Task 2 implements Option A — the default is computed once on first launch when no settings file exists, then persists.

### Concurrency on main pushes
`concurrency: nightly, cancel-in-progress: true` means rapid pushes only build the latest commit. The in-flight build is cancelled. Acceptable trade-off — saves CI minutes (free for open-source but still wastes wall-clock and emits cancelled-build emails).

### Risk: `nightly` tag deletion
If a maintainer manually deletes the `nightly` release/tag, the next `nightly.yml` run must re-create it. The `tauri-action` does this automatically when the tag doesn't exist. Verify in Task 7 smoke-test.

### Risk: stale `latest.json` cache
GitHub's CDN caches release-asset URLs for ~5 minutes. After a fresh nightly publish, an in-app `Check for updates` within that window may still return the prior version. Acceptable. Document in release notes if needed.

### Out-of-scope follow-ups
- Add a separate "beta" channel (would slot in identically — bump the channel union).
- Surface "last checked" / "auto-check on launch" toggles in the UI.
- Add CI signing of the `checksums-sha256.txt` file with GPG.
