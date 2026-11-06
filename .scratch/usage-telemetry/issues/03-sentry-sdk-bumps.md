# 03: Bump @sentry/browser and the sentry crate

**What to build:** Routine dependency bumps, following the repo's dependency policy (newest same-line version past quarantine, one commit per package).

- `@sentry/browser` is `^11.9.0` (`package.json` line 46). On 2026-11-05, 11.10.0 (published 2026-10-28) is past the 5-day `minimumReleaseAge` (`pnpm-workspace.yaml` line 11) and 11.11.0 was published that day. Take the newest version past quarantine on the day this runs.
- The `sentry` crate resolves 0.49.3 (`src-tauri/Cargo.lock`); 0.49.5 waits in the Dependabot branch `dependabot/cargo/src-tauri/sentry-0.49.5`. MSRV 1.89, CI pins rustc 1.98.0. Keep `default-features = false` and the feature list in `src-tauri/Cargo.toml` line 72, and raise its `version = "0.49.2"` requirement to the new version so the manifest matches the lock.
- After the JS bump, re-check that every `dataCollection` key and integration name used in `src/lib/core/settings/sentry.service.ts` (about lines 63-83) still exists in the new types; the integration allowlist test in `sentry.service.test.ts` checks the real defaults.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** JS bump: `pnpm check` + `pnpm vitest run` + `pnpm build`. Crate bump: `cargo test --manifest-path src-tauri/Cargo.toml` + `cargo tree --locked` check that no unrelated edges moved.

- [ ] `@sentry/browser` at the newest version past quarantine, lockfile updated, gate green
- [ ] `sentry` crate at 0.49.5 (or newer same-line past cooldown), only sentry-* edges changed in `Cargo.lock`
- [ ] One commit per package

## Notes

- Source: `raw/j23.md` (S20-1, S20-2), `raw/j06.md`.
- Dependency bumps skip the pre-commit adversarial reviewer (owner rule).
- Size: XS.

## Comments
