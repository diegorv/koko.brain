# 01: Preview channel in the app: version, settings, updater endpoint, downgrade

**What to build:** `preview` as a third release channel in the app: the build version and build info for `KOKO_RELEASE_CHANNEL=preview`, the `updates.channel` option in Settings > Update, the updater endpoint, and an in-app downgrade from a preview build to Nightly or Stable. Plus the ADR for the channel and the help text.

**Blocked by:** none

**Files:** src/lib/utils/build-info.js,src/lib/utils/app-channel.ts,src/lib/core/settings/,src-tauri/src/commands/update_channel.rs,src/tests/,src-tauri/tests/,help/documentation/19-settings.md,docs/adr/

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`.

- [ ] Failing tests first for each behaviour below (`src/tests/lib/utils/build-info.test.ts` and the Settings/Update tests next to the existing nightly cases; Rust unit tests next to `endpoint_for_channel_nightly`).
- [ ] `resolveVersion` with `channel: 'preview'` gives `X.Y.(Z+1)-preview.<count>.<sha>` on a stable base and `X.Y.Z-beta.N.preview.<count>.<sha>` on a prerelease base, the nightly rules with another identifier. A test asserts the order under semver: stable `X.Y.Z` < nightly < preview < next stable `X.Y.(Z+1)`, for the same count and for different counts. `formatBuildInfo` drops the sha segment for preview as for nightly. `parseReleaseChannel` accepts `preview` case-insensitively; unknown values still become `stable`.
- [ ] `ReleaseChannel` is `'stable' | 'nightly' | 'preview'`, `updates.channel` parses `preview`, and a fresh preview build defaults to it (`getBuildChannel`). Any label helper in `app-channel.ts` covers it.
- [ ] `update_channel.rs`: `PREVIEW_ENDPOINT` = `https://github.com/diegorv/koko.brain/releases/download/preview/latest.json`, `endpoint_for_channel("preview")` returns it, unknown values still fall back to stable; tests mirror the nightly ones (host, path).
- [ ] Settings > Update lists **Preview** ("Built from main plus features under test. May be unstable.") after Nightly.
- [ ] Downgrade: the in-app downgrade appears whenever the installed build's channel ranks above the chosen one (preview > nightly > stable), with the chosen channel's name in the button and the confirm text ("Install Nightly (downgrade)" on a preview build set to Nightly; "Install Stable (downgrade)" on a preview or nightly build set to Stable), and calls `checkForUpdates({ allowDowngrades: true, forceChannel: <chosen> })`. The nightly -> stable case keeps its current text and behaviour. Component tests for the three cases and for the cases where it must not show.
- [ ] `help/documentation/19-settings.md`, Update section: the Preview channel, its version format, that it sorts above Nightly (so going back needs the downgrade button), and that settings keys only preview code knows are dropped when a Stable or Nightly build saves the vault.
- [ ] New ADR `docs/adr/0039-preview-release-channel.md` with the decisions in `.scratch/preview-channel/spec.md` (name and version order, automatic merge of main, accepted settings loss, initial content), linked from `docs/adr/README.md`; ADR-0024's channel re-evaluation trigger points to it.

## Notes

- Decisions and current code: `.scratch/preview-channel/spec.md`.
- No workflow change here: Issue 02 adds `preview.yml`. Until then no preview build exists, and choosing Preview in Settings finds no `latest.json` (the existing "check failed" path; do not special-case it).
