# Release Channels

Kokobrain ships on two channels: **Stable** and **Nightly**. Pick the one that matches your tolerance for breakage.

## Quick reference

| Channel | Cadence | GitHub release tag | DMG URL pattern | `latest.json` URL |
|---|---|---|---|---|
| **Stable** | Manual, ~every few weeks. Tagged `X.Y.Z` and built by `release.yml`. | `X.Y.Z` | `releases/download/X.Y.Z/KokoBrain_<version>_aarch64.dmg` | `releases/latest/download/latest.json` |
| **Nightly** | Every accepted push to `main`. Tagged `nightly` (single fixed tag, assets rotate). Built by `nightly.yml`. | `nightly` | `releases/download/nightly/KokoBrain_<version>_aarch64.dmg` | `releases/download/nightly/latest.json` |

Both channels are signed with the same Apple Developer cert and the same Tauri auto-update private key. No new install warning, no new signing config to trust.

## Switching channels from inside the app

Settings → **Update** → **Release channel** dropdown.

- The selection persists per vault in `.kokobrain/settings.json` under `updates.channel`.
- The badge next to "Current version" shows which channel the **build itself** belongs to (informational; comes from `__APP_CHANNEL__` baked at build time).
- The dropdown controls which channel the **auto-updater follows** when you click "Check for updates". The two can diverge — a Nightly build can be set to track Stable for updates, and vice versa.

## Auto-check on launch

Settings → **Update** → **Auto-check on launch** toggle (off by default).

When enabled, the app silently checks the configured channel's `latest.json` shortly after the vault loads. If a newer version is available, a toast prompts you to open Settings → Update to install. The check fires on every vault open while the toggle is on — no throttle. The cost is a single HTTP request to a GitHub release-asset CDN per launch, and a Nightly user (where new builds publish multiple times a day) needs the check to actually fire on every launch.

The "Last checked" row in the same section shows how recently the app asked GitHub for a newer version (or "Never" if no check has run yet). Manual clicks on "Check for updates" also update the same timestamp.

## Version-string semantics

- Stable: the version from `package.json`, e.g. `2.8.0`.
- Nightly: `<base>-nightly.<commitCount>.<sha>`, e.g. `2.8.0-nightly.1234.34158e03`.

The `commitCount` is `git rev-list --count HEAD` from the build commit. It is a numeric semver prerelease identifier, so consecutive nightlies compare numerically and sort monotonically. The `sha` follows for visibility.

By design, a Nightly version is semver-greater than the same-base Stable version (a prerelease identifier like `-nightly.1234` makes it semver-less than the bare `X.Y.Z`, but the commit count ensures nightlies sort monotonically among themselves). This is the one-way-update invariant explained below.

## One-way update rule

**The auto-updater never downgrades. Switching the channel toggle from Nightly to Stable does not reinstall a Stable build.**

Why: the installed Nightly carries version `2.9.0-nightly.1234.<sha>` (minor+1 from stable `2.8.0`), which is semver-greater than `2.8.0`. When the auto-updater fetches Stable's `latest.json` and compares, it sees the local version as already newer and reports "you are up to date" — even though you are actually still on Nightly.

To genuinely move back to Stable: download the Stable DMG from [GitHub Releases](https://github.com/diegorv/koko.brain/releases/latest) and reinstall manually. macOS will replace the app in-place; your `.kokobrain/settings.json` and vault contents are untouched.

Why this design: the alternative — letting the updater downgrade on channel switch — would silently overwrite a build the user might still be testing, with no way to roll forward again from Stable back to Nightly inside the app. The reinstall step makes the decision explicit.

## Picking a channel

- **Use Stable** for everyday note-taking. Tagged builds, the full CI matrix (frontend + rust forced via `force_all: true`) plus Playwright E2E as hard gates, slower cadence, fewer regressions.
- **Use Nightly** if you want the latest fixes or are testing a feature that just merged. Every accepted commit on `main` ships. Nightly runs CI with the normal paths-filter (a docs-only commit doesn't re-run frontend tests) plus the full E2E suite, but neither gates the build: a red check is signal for the maintainer, and the nightly DMG still publishes. The next stable tag-push re-runs both against the exact release SHA, there as hard gates.

Nightly is built and signed by the same workflow infrastructure as Stable, so the binaries themselves are equally trustworthy. The difference is review surface and gate coverage — Nightly ships before the change has accumulated days of real-world use, and publishes even when CI or E2E goes red on the post-merge SHA.

## What gets built on which channel

Both workflows invoke `ci.yml` via `workflow_call`. Release sets `force_all: true` so the paths-filter cannot short-circuit a tagged build; nightly leaves it default so a workflow- or docs-only commit can skip the unaffected jobs. Both workflows also invoke `e2e.yml`, but only `release.yml` treats it (and `ci.yml`) as a gate: in `nightly.yml` `build-macos` needs nothing but `guard`, so the checks run alongside the build instead of before it. The build steps differ in:

- `nightly.yml` patches `package.json#version` and `src-tauri/tauri.conf.json#version` in-place with the nightly version string before running `tauri-action`. The patch is job-scoped and never committed.
- `nightly.yml` exports `KOKO_RELEASE_CHANNEL=nightly` so Vite injects `__APP_CHANNEL__='nightly'` and the channel pill in the UI reads "NIGHTLY".
- `nightly.yml` deletes the prior `nightly` release with `gh release delete --cleanup-tag` before each run so `tauri-action` can recreate it cleanly.
- `nightly.yml` publishes with `prerelease: true` so the release entry is labelled "Pre-release" on the Releases page.

When `chore: bump version` lands on `main` before a stable tag push, `nightly.yml` short-circuits in its `guard` job to avoid duplicating the work `release.yml` is about to do for the same SHA.

## Verifying a download

Each release (Stable and Nightly) ships a `checksums-sha256.txt` file alongside the DMG. After downloading:

```bash
shasum -a 256 KokoBrain_*.dmg
```

Compare the output against the corresponding line in `checksums-sha256.txt`.

## Related docs

- [GitHub Workflows](../GITHUB-WORKFLOW.md) — the full `release.yml` and `nightly.yml` job graphs.
- [Commit Conventions](COMMITS.md) — including the `chore: bump version` convention that triggers Stable releases.
