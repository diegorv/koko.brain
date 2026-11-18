---
type: ADR
id: "0039"
title: "Preview release channel: main plus features under test, sorting above Nightly"
status: active
date: 2026-11-15
---

## Context

The in-app updater follows one of two channels: **Stable** (tags `X.Y.Z`, `release.yml`, GitHub's "latest" release) and **Nightly** (every push to `main`, `nightly.yml`, the fixed pre-release tag `nightly`). The owner wants to test work that is not approved for `main`, such as the Claude Code agent panel (PR #247), through the updater on their own machine without merging it. ADR-0024 named more channels as a re-evaluation trigger; Nightly already took the route of a second endpoint per channel, so a third channel follows it.

## Decision

**A third channel, `preview`, builds a long-lived `preview` branch that holds `main` plus the feature branches under test. Its version is the nightly scheme with another identifier, `X.Y.(Z+1)-preview.<count>.<sha>` (`X.Y.Z-beta.N.preview.<count>.<sha>` on a prerelease base), published against a fixed `preview` pre-release tag at `releases/download/preview/latest.json`.**

- **Version order.** Semver compares prerelease identifiers as strings before the count, so `preview` sorts above `nightly` (p > n) for every count, and both sort below the next stable `X.Y.(Z+1)`: stable < nightly < preview < next stable. Switching from Nightly to Preview updates by itself; going from Preview to Nightly or Stable uses the in-app downgrade in Settings > Update, which now appears whenever the installed build's channel ranks above the chosen one.
- **Keeping up with main.** Automatic: every push to `main` merges `main` into `preview` and builds it. A merge conflict fails the workflow with a clear message and a person resolves it on the branch. `preview` only grows (merges, never a reset or force-push), so the commit count keeps preview versions in order.
- **Settings written by preview-only code.** Accepted loss: `saveSettings` writes only the keys the running build knows, so opening the vault in a Stable or Nightly build drops settings keys that only a preview build knows. No core change; the downgrade confirm and the help page say so.
- **Initial content.** `main` plus `mvp-claude` (PR #247), so the owner can test the agent panel through the updater before deciding the PR.

## Options considered

- **Preview channel with its own identifier and endpoint** (chosen): reuses the nightly version scheme, signing keys and updater code path; the only new runtime piece is one endpoint and one more rank in the downgrade check.
- **Merge features into `main` behind settings flags**: puts unapproved code on the Nightly and later Stable channels, which is what the owner wants to avoid.
- **Install a locally built DMG**: no updater, so every test round is a manual build and reinstall, and the build is not signed by CI.
- **Name the channel `beta` or `canary`**: `beta` collides with the prerelease tags `X.Y.Z-beta.N`; `canary` sorts below `nightly` (c < n), so going from Nightly to the feature build would need the downgrade every time.

## Consequences

- Choosing Preview before a preview build is published finds no `latest.json` and shows the existing "check failed" state.
- After a feature branch is squash-merged into `main`, the next `main` -> `preview` merge applies the same changes again under other commits; this is the first place a merge conflict may show.
- Rebuilding `preview` from scratch would lower the commit count and stop the updater from offering newer preview builds, so the branch is never reset.
- Later, not in v1: preserving unknown settings keys across channels, a script that rebuilds `preview` from `main` plus a list of branches, preview builds for other platforms.
