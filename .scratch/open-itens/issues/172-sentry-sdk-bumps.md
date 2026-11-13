# 172: Bump @sentry/browser

**Origin:** `usage-telemetry` Issue 03, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** A routine dependency bump, following the repo's dependency policy: the newest same-line version past quarantine, in one commit.

- `@sentry/browser` is `^11.9.0` (`package.json` line 46; resolved 11.9.0 in `pnpm-lock.yaml` about line 82).
- On 2026-11-06, 11.10.0 (published 2026-10-28) is past the 5-day `minimumReleaseAge` (`pnpm-workspace.yaml` line 11, `7200` minutes). 11.11.0 was published 2026-11-05 and clears quarantine on 2026-11-10.
- Take the newest version past quarantine on the day this runs.
- After the bump, re-check that every `dataCollection` key and integration name used in `src/lib/core/settings/sentry.service.ts` (about lines 63-83) still exists in the new types. The integration allowlist test in `sentry.service.test.ts` checks the real defaults.

The Rust half is done: the `sentry` crate resolves 0.49.5 on main (`src-tauri/Cargo.lock` line 4703, Dependabot #239). Raising the `version = "0.49.2"` requirement in `src-tauri/Cargo.toml` line 72 is cosmetic. Fold it into the next Rust change that touches that file, not here.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] `@sentry/browser` is at the newest version past quarantine, with the lockfile updated and the gate green.

## Notes

- Source: `raw/j23.md` (S20-1), `raw/j06.md`, priority review 2026-11-06.
- Dependency bumps skip the pre-commit adversarial reviewer (owner rule). Small enough to do by hand on main instead of through relay.
- Size: XS.

## Comments
