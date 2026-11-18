# Preview channel: a third update channel for features not approved for main

**Status:** ready-for-agent (Issues 01-02)

## Goal

Test work that is not approved for `main` through the in-app updater, on the owner's own machine, without merging it. Today there are two channels: **Stable** (tags `X.Y.Z`, `release.yml`, GitHub's "latest" release) and **Nightly** (every push to `main`, `nightly.yml`, fixed pre-release tag `nightly`). A third channel, **Preview**, builds from a long-lived `preview` branch that holds `main` plus the feature branches under test.

## Decisions (owner, 2026-11-15)

| Topic | Decision |
|---|---|
| Name and version | `preview`. Version `X.Y.(Z+1)-preview.<count>.<sha>`, the nightly scheme with another identifier. Semver compares prerelease identifiers as strings, so `preview` sorts above `nightly` (p > n) and both below the next stable `X.Y.(Z+1)`. Switching Nightly to Preview updates by itself; Preview to Nightly or Stable needs the in-app downgrade. |
| Keeping up with main | Automatic: every push to `main` merges `main` into `preview` and builds it. A merge conflict fails the workflow with a clear message; a person resolves it on the branch. |
| Settings written by preview-only code | Accepted loss: `saveSettings` (`src/lib/core/settings/settings.service.ts:278-280`) writes only the keys the build knows, so opening the vault in a Stable or Nightly build drops settings keys that only a preview build knows. No core change. |
| Content at start | `main` plus `mvp-claude` (the Claude Code agent panel, PR #247), so the owner can test it through the updater before deciding the PR. |

## How it works today (main, 2026-11-15)

- `src/lib/utils/build-info.js`: `resolveVersion` (stable: package version; nightly: patch + 1 and `-nightly.<count>.<sha>`, or `.nightly.<count>.<sha>` on a prerelease base), `formatBuildInfo`, `parseReleaseChannel` (unknown values become `stable`). `vite.config.js:25` reads `KOKO_RELEASE_CHANNEL` into `__APP_CHANNEL__`.
- `src/lib/core/settings/settings.types.ts:313-337`: `ReleaseChannel = 'stable' | 'nightly'`, `updates.channel`, defaulting to the build's channel (`getBuildChannel`, `src/lib/utils/app-channel.ts`; `settings.service.ts:192,245`).
- `src-tauri/src/commands/update_channel.rs`: `STABLE_ENDPOINT`, `NIGHTLY_ENDPOINT`, `endpoint_for_channel` (unknown values fall back to stable), `allow_downgrades` replaces the semver comparator with `!=`.
- `src/lib/core/settings/sections/UpdateSection.svelte`: channel options (`:45-52`) and the "Install Stable (downgrade)" flow, shown only when `__APP_CHANNEL__ === 'nightly'` and the chosen channel is `stable` (`:114-123`, `:193-212`, `:287-292`).
- `.github/workflows/nightly.yml`: guard job (canonical repo, skips release-flow commits), build job on `macos-latest` with its own Rust cache key and `CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16`, version from `resolveVersion` with `COMMIT_COUNT=$(git rev-list --count "${BASE_VERSION}..HEAD")`, tauri-action into the fixed tag, checksums, stale-asset pruning, `latest.json` verification. Concurrency group `nightly`, never cancelled.
- `help/documentation/19-settings.md:325-340`: the Update section, including the note that the updater never downgrades.
- ADR-0024 (auto-update) lists "canary + stable channels" as a re-evaluation trigger.
- `.github/workflows/privacy.yml:113` already allows `github.com/diegorv/koko.brain/releases`.

## Constraints

- A push made with `GITHUB_TOKEN` does not start other workflows, except `workflow_dispatch` and `repository_dispatch` (GitHub Actions docs, "Triggering a workflow from a workflow"). The merge job pushes `preview` with `GITHUB_TOKEN`, so the same workflow must build after merging, or dispatch the build explicitly.
- The preview build uses the same signing and updater keys as the other channels.
- `preview` only grows (merges, never a reset or force-push), so the commit count keeps preview versions in order. Rebuilding the branch from scratch would lower the count and stop the updater from offering newer builds.
- After PR #247 is squash-merged into `main`, the next `main` -> `preview` merge applies the same changes a second time under other commits; git usually resolves identical changes, but this is the first place a conflict may show.
- No CI runs on `preview` besides the build; what lands there was tested on its own branch.

## Later (not v1)

Preserving unknown settings keys across channels; a script that rebuilds `preview` from `main` plus a list of branches; preview builds for other platforms.

## Issues

| # | Issue | Blocked by | Status |
|---|---|---|---|
| [01](issues/01-preview-channel-in-the-app.md) | Preview channel in the app: version, settings, updater endpoint, downgrade | none | ready-for-agent |
| [02](issues/02-preview-workflow-and-branch-sync.md) | Preview build workflow and automatic merge of main | 01 | ready-for-agent |
