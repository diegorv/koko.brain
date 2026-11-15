# Issue 01 discovery: Preview channel in the app

## Files that change

- `src/lib/utils/build-info.js:6` `ReleaseChannel` typedef; `:43-54` `resolveVersion` (preview branch, nightly rules with `preview`); `:70-71` `formatBuildInfo` sha segment; `:85-89` `parseReleaseChannel`; `:104-107` `channelLabel` (PREVIEW).
- `src/app.d.ts:12` `__APP_CHANNEL__` type gains `'preview'`.
- `src/lib/core/settings/settings.types.ts:313-325` `ReleaseChannel` and its JSDoc.
- `src/lib/utils/app-channel.ts`: no label helper there; `getBuildChannel` returns the define as-is, so only its JSDoc changes (the label helper is `channelLabel` in build-info.js).
- `src/lib/core/settings/BuildInfo.svelte:29-33` badge class for `preview` (needed once the define type includes it).
- `src/lib/core/settings/sections/UpdateSection.svelte:44-53` third option; `:113-124` `needsManualReinstall` becomes a rank comparison; `:192-213` confirm text and `forceChannel` from the chosen channel; `:280-293` row label, description, button, Releases link.
- `src-tauri/src/commands/update_channel.rs:28-45` `PREVIEW_ENDPOINT` + match arm; tests at `:139-181`.
- `help/documentation/19-settings.md:325-342` Update section.
- New `docs/adr/0039-preview-release-channel.md`; row in `docs/adr/README.md`; ADR-0024 `:73` trigger points to 0039.

## Plan

1. build-info.js test-first in `src/tests/lib/utils/build-info.test.ts` (copy the nightly cases; semver order test for stable < nightly < preview < next stable, same and different counts).
2. Types: `ReleaseChannel`, `__APP_CHANNEL__`, BuildInfo badge (`bg-type-purple/20 text-type-purple`), tests in `BuildInfo.test.ts`, `settings.service.test.ts` (`updates.channel` describe: preview default on a fresh preview build, saved `preview` kept), `app-channel.test.ts`.
3. Rust: `PREVIEW_ENDPOINT`, tests mirroring nightly (host, path `/releases/download/preview/`).
4. UpdateSection: rank `stable 0 < nightly 1 < preview 2`; downgrade row when `rank(__APP_CHANNEL__) > rank(chosen)`. Texts built from labels so nightly -> stable stays byte-identical. New `src/tests/lib/core/settings/UpdateSection.downgrade.test.ts` (sets `__APP_CHANNEL__` per test; the `$derived` reads the global at render): preview->nightly, preview->stable, nightly->stable (button, confirm text via `ask` mock, `check_for_update_on_channel` args), and hidden for stable build, same channel, and upward choices. Layout test gains Preview option order.
5. Docs: help + ADR.

## Defaults taken

- Downgrade loss text: a preview build adds "the features under test that are not on main yet"; a Stable target adds the existing "changes since the last Stable tag" sentence. On a preview build the confirm says settings only Preview knows are dropped (spec: accepted loss) instead of "settings are unaffected".
- Releases page fallback link: Stable target keeps `releases/latest`; Nightly target opens `releases/tag/nightly`.
- Preview badge color: `type-purple` (stable success, nightly warning, dev primary are taken).
- `updates.channel` is loaded without validation today (`settings.service.ts:192`), so `preview` already parses; a test pins it.

## Risks

- Rust doc comments edited are not on `#[ts(export)]` types; bindings should not change (check `git status` after cargo test).
- Choosing Preview before Issue 02 ships hits the existing "check failed" path; not special-cased (Issue Notes).
