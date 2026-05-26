---
type: ADR
id: "0024"
title: "Auto-update via tauri-plugin-updater with GitHub Releases + minisign signatures"
status: active
date: 2026-04-22
---

## Context

A desktop app ships fixes and features at a rapid cadence. Forcing users to visit a website, download a build, move it to Applications, and re-open is enough friction to leave real users on months-old releases — precisely when we need feedback on current code.

A self-updater must satisfy four constraints:

- **Authenticated**: a compromised release server (or a MITM) must not be able to ship a trojan that users silently accept. Binary-level signatures are the minimum bar.
- **Zero-infrastructure**: we don't run a release server. Binaries are built in CI and hosted somewhere already paid-for.
- **User-controlled**: the user decides whether to check, download, and install; the app never auto-applies updates without consent.
- **Cross-platform ready**: macOS ships first; Windows/Linux bundles should share the same update path when they arrive.

## Decision

**Adopt `tauri-plugin-updater` with GitHub Releases as the endpoint and a minisign keypair for signature verification.** The public key is embedded in `tauri.conf.json`; the private key lives outside the repo and signs release artifacts in the release workflow. Checking for updates is surfaced in Settings; no automatic background checks.

### Configuration (`src-tauri/tauri.conf.json:36-42`)

```json
"updater": {
  "endpoints": [
    "https://github.com/diegorv/koko.brain/releases/latest/download/latest.json"
  ],
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDI4QjY2RTJEMDYxRDI3MTkKUldRWkp4MEdMVzYyS0hSdjk4MG9JM0doQndZenVYTnArYWJ0TkRzcVcwNDVlbVVkc1JMYlBhQmwK"
}
```

Plus `"createUpdaterArtifacts": true` in `bundle` (triggers Tauri's updater artifact generation during `tauri build`).

### Dependencies

- **Rust**: `tauri-plugin-updater = "2.10.0"` (`src-tauri/Cargo.toml:59`).
- **TypeScript**: `@tauri-apps/plugin-updater ^2.10.1` (`package.json:60`).

### User-facing surface (`src/lib/core/settings/sections/UpdateSection.svelte:3`)

```typescript
import { check } from '@tauri-apps/plugin-updater';
```

The Settings pane offers a "Check for updates" button. On click: `check()` returns an `Update | null`; if non-null, the UI shows version + release notes and asks the user to confirm download + install.

### Release process

- `scripts/release.sh` bumps `package.json` / `Cargo.toml` / `tauri.conf.json` versions and tags a release with plain semver (see `scripts/release.sh`).
- CI (`.github/workflows/release.yml`) builds signed bundles and produces `latest.json` as the update manifest consumed by the endpoint URL above.
- Every release tag carries the minisign signatures that `tauri-plugin-updater` verifies against the embedded `pubkey` before applying the update.

## Alternatives considered

- **No updater at all, manual downloads only**: realistic for a beta hidden among friends; unacceptable for actual users providing feedback. Rejected.
- **Sparkle (macOS) / Squirrel / Omaha**: proven updater frameworks with mature infrastructure. None of them integrate naturally with Tauri's cross-platform bundle format; reusing Tauri's updater keeps Windows/Linux parity trivial when we get there.
- **Run our own update server (Cloudflare Workers, S3, etc.)**: more control over phased rollouts, download analytics, geographic routing. Prohibitive operational cost for a solo-dev project. GitHub Releases is free, highly available, and its CDN is good enough.
- **Homebrew cask as the primary distribution**: great for CLI-first macOS users, terrible for the rest. Can still be added later alongside the built-in updater.
- **Auto-apply updates in the background**: convenience vs. control. We chose control — updates interrupt the user's workflow only on explicit check.
- **Use SSH / GPG signatures instead of minisign**: minisign is what Tauri's updater speaks out of the box; no reason to invent a second signing pipeline.

## Consequences

- The private minisign key is the single most valuable secret the project holds. Losing it means we cannot ship future updates to already-installed apps (they will refuse unsigned / wrongly-signed bundles). Compromising it means an attacker can push arbitrary code to every installed instance. Key handling is documented in the release runbook (outside this repo).
- `latest.json` at `github.com/diegorv/koko.brain/releases/latest/download/` is fetched from the user's machine; GitHub outages briefly break "check for updates." Acceptable — users can still use the app; they just can't upgrade during the window.
- Rollback requires publishing a new release with a lower version tag, or serving a custom `latest.json` — either is manual. We don't have a release-channel feature (canary vs stable) today; all users on the updater endpoint get the latest tagged build.
- No telemetry on update adoption. We don't know how many users are on which version without asking them. An opt-in version beacon is a future possibility and out of scope here.
- `createUpdaterArtifacts: true` must stay on in `tauri.conf.json` — accidentally disabling it produces releases that the updater cannot consume.
- Nightly versions use minor+1 from the stable base (e.g. `2.9.0-nightly.1234.abc` for stable `2.8.0`) so the prerelease is always semver-greater than the current stable, preventing the auto-updater from downgrading nightly users.
- Re-evaluation triggers: canary + stable channels (would require either a second endpoint or a channel-aware `latest.json` generator); GitHub Releases stops being an acceptable host (rate limits, repo policy changes); user count grows to where we need staged rollouts / percentage-based distribution.
