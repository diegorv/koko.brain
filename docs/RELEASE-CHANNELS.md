# Release Channels

Kokobrain ships on three channels: **Stable**, **Nightly** and **Preview**. Pick the one that matches your tolerance for breakage.

## Quick reference

| Channel | Cadence | GitHub release tag | DMG URL pattern | `latest.json` URL |
|---|---|---|---|---|
| **Stable** | Manual, ~every few weeks. Tagged `X.Y.Z` and built by `release.yml`. | `X.Y.Z` | `releases/download/X.Y.Z/KokoBrain_<version>_aarch64.dmg` | `releases/latest/download/latest.json` |
| **Pre-release** (no updater channel) | Manual, `scripts/release.sh --pre alpha\|beta\|rc`. Tagged `X.Y.Z-beta.N` and built by `release.yml` as a GitHub Pre-release. | `X.Y.Z-beta.N` | `releases/download/X.Y.Z-beta.N/KokoBrain_<version>_aarch64.dmg` | none: `releases/latest` skips pre-releases, so Stable keeps serving the last stable |
| **Nightly** | Every accepted push to `main`. Tagged `nightly` (single fixed tag, assets rotate). Built by `nightly.yml`. | `nightly` | `releases/download/nightly/KokoBrain_<version>_aarch64.dmg` | `releases/download/nightly/latest.json` |
| **Preview** | Every accepted push to `main` (merged into the `preview` branch first) and every push to `preview`. Tagged `preview` (single fixed tag, assets rotate). Built by `preview.yml`. | `preview` | `releases/download/preview/KokoBrain_<version>_aarch64.dmg` | `releases/download/preview/latest.json` |

All channels are signed with the same Apple Developer cert and the same Tauri auto-update private key. No new install warning, no new signing config to trust.

## Switching channels from inside the app

Settings → **Update** → **Release channel** dropdown.

- The selection persists per vault in `.kokobrain/settings.json` under `updates.channel`.
- The badge next to "Current version" shows which channel the **build itself** belongs to (informational; comes from `__APP_CHANNEL__` baked at build time). A run from the Vite dev server (`pnpm tauri dev`) shows **DEV** instead.
- The dropdown controls which channel the **auto-updater follows** when you click "Check for updates". The two can diverge — a Nightly build can be set to track Stable for updates, and vice versa.

## Auto-check on launch

Settings → **Update** → **Auto-check on launch** toggle (off by default).

When enabled, the app silently checks the configured channel's `latest.json` shortly after the vault loads. If a newer version is available, a toast prompts you to open Settings → Update to install. The check fires on every vault open while the toggle is on — no throttle. The cost is a single HTTP request to a GitHub release-asset CDN per launch, and a Nightly user (where new builds publish multiple times a day) needs the check to actually fire on every launch.

The "Check for updates" row shows how recently the app asked GitHub for a newer version ("never" if no check has run yet). Manual clicks on its button also update the same timestamp.

## Version-string semantics

- Stable: the version from `package.json`, e.g. `2.8.0`.
- Nightly: `<next-patch>-nightly.<commitCount>.<sha>`, e.g. `2.8.1-nightly.12.34158e03` for the 12th commit after stable `2.8.0`.
- Preview: `<next-patch>-preview.<commitCount>.<sha>`, the nightly scheme with another identifier, e.g. `2.8.1-preview.15.9a1b2c3d`. The count is taken on the `preview` branch.

The `commitCount` is `git rev-list --count <stable-tag>..HEAD`: how far the build is past the stable it starts from. It is a numeric semver prerelease identifier, so consecutive nightlies compare numerically and sort monotonically; it restarts at the next stable, whose base is one patch higher. The `sha` follows for visibility.

Semver ranks `X.Y.Z-pre` below `X.Y.Z`, so a nightly sits between the stable it builds on and the next stable: `2.8.0 < 2.8.1-nightly.12 < 2.8.1`. A nightly user is therefore offered the next stable as an ordinary update (any `minor` or `major` release is higher still).

Semver compares prerelease identifiers as strings before the count, and `preview` sorts above `nightly`, so for the same base the order is **Stable < Nightly < Preview**: `2.8.0 < 2.8.1-nightly.40 < 2.8.1-preview.3 < 2.8.1`. Switching from Nightly to Preview updates on the next check; going the other way is a downgrade (see below).

When `package.json` holds a pre-release (`4.0.0-beta.1`), the nightly appends to it instead of bumping the patch: `4.0.0-beta.1.nightly.12.<sha>` (a preview build gives `4.0.0-beta.1.preview.12.<sha>`). The commit count restarts at every tag, so the base has to stay in the version for the order to hold: `4.0.0-beta.1.nightly.40 < 4.0.0-beta.2 < 4.0.0-beta.2.nightly.3 < 4.0.0-rc.1 < 4.0.0`. `resolveVersion` in `src/lib/utils/build-info.js` is the one implementation; `nightly.yml` and `preview.yml` call it.

## Pre-releases (alpha, beta, rc)

A pre-release tag (`X.Y.Z-alpha.N`, `X.Y.Z-beta.N`, `X.Y.Z-rc.N`) goes through the same `release.yml` gates and signing as a stable tag, but is published as a GitHub **Pre-release**. GitHub's `releases/latest` never resolves to a pre-release, so the Stable channel and the nightly "Install Stable" downgrade keep pointing at the last stable while a major version is in beta.

`scripts/release.sh` drives the series: `major --pre beta` (`3.0.12 → 4.0.0-beta.1`), `--pre beta` (`→ beta.2`), `--pre rc` (`→ rc.1`), then a plain run finalizes (`→ 4.0.0`). The release notes of a stable tag list everything since the previous stable, its pre-releases included. Pruning keeps the last four stable and the last four pre-release tags apart, so a run of betas never deletes the last stable.

There is no updater channel for pre-releases. To follow a major version in progress, use the Nightly channel: once a pre-release is tagged, every nightly builds on it. To go back to the last stable, set the channel to Stable on a Nightly build and use "Install Stable", or download the stable DMG from the Releases page.

## Moving to a lower channel

The auto-updater only installs a version higher than the installed one, so switching the channel toggle to a channel that ranks lower (Preview to Nightly or Stable, Nightly to Stable) does not by itself reinstall anything: the installed version is semver-greater than what the lower channel's `latest.json` serves.

When the installed build's channel ranks above the selected one, Settings → **Update** shows an **Install <channel> (downgrade)** button (**Install Nightly (downgrade)** or **Install Stable (downgrade)**). After a confirmation dialog it installs the latest build of the selected channel in-app, with the version comparison relaxed for that one install. Any build can move to any lower channel this way.

A **Releases page** button next to it opens the selected channel's GitHub release; downloading the DMG from there and reinstalling stays the fallback if the in-app install fails. Your vault is untouched either way. Settings keys that only a Preview build knows are dropped the first time a Stable or Nightly build saves the vault's settings.

## Picking a channel

- **Use Stable** for everyday note-taking. Tagged builds, the full CI matrix (frontend + rust forced via `force_all: true`), Playwright E2E, the gitleaks scan, the Security audits and the Privacy scan as hard gates, slower cadence, fewer regressions.
- **Use Nightly** if you want the latest fixes or are testing a feature that just merged. Every push to `main` that changes code queues a build; a running build always finishes, and during a burst only the newest pending push is built, so the published nightly may skip intermediate commits. Every push to `main` runs CI with the normal paths-filter (a docs-only commit doesn't re-run frontend tests) plus the full E2E suite in `main-checks.yml`, but neither gates the nightly build: a red check is signal for the maintainer, and the nightly DMG still publishes. The next stable tag-push re-runs both against the exact release SHA, there as hard gates.
- **Use Preview** to test features that are not approved for `main` yet. It is Nightly plus the branches merged into `preview`, with no CI of its own: what lands there was tested on its own branch.

Nightly is built and signed by the same workflow infrastructure as Stable, so the binaries themselves are equally trustworthy. The difference is review surface and gate coverage — Nightly ships before the change has accumulated days of real-world use, and publishes even when CI or E2E goes red on the post-merge SHA.

## The preview branch

`preview` is a long-lived branch: `main` plus the feature branches under test. A feature branch joins it by hand (`git fetch origin && git checkout -B preview origin/preview && git merge --no-ff <branch> && git push origin HEAD:refs/heads/preview`), which starts a preview build. A branch that changes `.github/workflows/` cannot ride on `preview`: the sync pushes with `GITHUB_TOKEN`, which GitHub refuses when the pushed workflow files match no branch tip, so every later sync would fail.

On every push to `main`, the `sync` job of `preview.yml` merges `main` into `preview` (`--no-ff`, as `github-actions[bot]`, subject `Merge main <sha> into preview`) and pushes it, then the `build-macos` job of the same run builds that head. A push made with `GITHUB_TOKEN` starts no new workflow run, so the build has to live in the same run. When `main` is already in `preview`, the push is skipped and the build still runs on the current head.

On a merge conflict the sync job aborts the merge and fails with a `::error::` naming the files and the commands to resolve it by hand: `git fetch origin && git checkout -B preview origin/preview && git merge origin/main`, fix, commit, `git push origin HEAD:refs/heads/preview`. No build runs until then.

GitHub keeps only the newest pending run in the `preview` concurrency group. When a push to `preview` or a manual run replaces a pending run from a push to `main`, that sync never happens and `preview` lags `main` until the next push to `main`.

`preview` only grows: the workflow never force-pushes, rebases or resets it. The commit count in the version is taken on this branch, so rebuilding it from scratch would lower the count and the updater would stop offering newer builds. The `preview` tag shares the branch's name, so check the branch out from `origin/preview` (a bare `git checkout preview` without a local branch detaches at the tag, the last built head) and push it with the explicit `refs/heads/preview` refspec.

The release body lists the merges on `preview`'s first-parent line whose branch is not in `main` (`scripts/preview-branch.sh merged`). A branch later squash-merged into `main` stays listed, since its merge commit on `preview` is not in `main`.

## What gets built on which channel

`release.yml` invokes `ci.yml` and `e2e.yml` via `workflow_call` as gates, with `force_all: true` so the paths-filter cannot short-circuit a tagged build. `nightly.yml` invokes neither: `main-checks.yml` runs both on the same push with the default paths-filter, and `build-macos` needs nothing but `guard`. The build steps differ in:

- `nightly.yml` patches `src-tauri/tauri.conf.json#version` in-place with the nightly version string before running `tauri-action`. The patch is job-scoped and never committed. `package.json` stays at the base version on purpose — `build-info.js` appends the nightly suffix itself.
- `nightly.yml` sets `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16`, so the nightly binary is built with parallel codegen; stable keeps the release profile's `codegen-units = 1`.
- `nightly.yml` exports `KOKO_RELEASE_CHANNEL=nightly` so Vite injects `__APP_CHANNEL__='nightly'` and the channel pill in the UI reads "NIGHTLY".
- `nightly.yml` keeps the `nightly` release in place across runs: `tauri-action` reuses it, overwrites the same-named assets, and the previous version's leftovers are pruned by id only after the build succeeds. A broken build therefore leaves the last good nightly downloadable instead of a 404.
- `nightly.yml` publishes with `prerelease: true` so the release entry is labelled "Pre-release" on the Releases page, and re-asserts that flag after each run (the reuse path only updates name and body).

When `chore: bump version` lands on `main` before a stable tag push, `nightly.yml` short-circuits in its `guard` job to avoid duplicating the work `release.yml` is about to do for the same SHA.

`preview.yml` copies `nightly.yml`'s build steps with `KOKO_RELEASE_CHANNEL=preview`, the tag `preview`, its own Rust cache key (`macos-preview-aarch64`) and the version from `resolveVersion(..., channel: 'preview')`. Its `guard` skips the same release-flow commits on `main` (sync and build both); a push to `preview` or a manual run always builds the `preview` head. Concurrency group `preview`, never cancelled.

## Verifying a download

Each release (Stable, Nightly and Preview) ships a `checksums-sha256.txt` file alongside the DMG. After downloading:

```bash
shasum -a 256 KokoBrain_*.dmg
```

Compare the output against the corresponding line in `checksums-sha256.txt`.

## Related docs

- [GitHub Workflows](../GITHUB-WORKFLOW.md) — the full `release.yml` and `nightly.yml` job graphs.
- `.github/workflows/preview.yml` and `scripts/preview-branch.sh`: the preview sync and build.
- [Commit Conventions](COMMITS.md) — including the `chore: bump version` convention that triggers Stable releases.
