# 02: Sentry events carry an environment, the test button stops claiming delivery, and the copy says what is sent

**What to build:** Four small fixes to the existing Sentry integration.

1. **Environment on both sides.** JS events always say `production` (the SDK default) and a `pnpm tauri dev` build shares the stable release name (`src/lib/core/settings/sentry.service.ts` about lines 19-22 take only the version token of `__BUILD_INFO__`), so dev noise lands in the production issue stream. Rust picks `development`/`production` from debug assertions. Compute one value in the frontend: `import.meta.env.DEV ? 'development' : __APP_CHANNEL__` (`vite.config.js` about line 94 defines `__APP_CHANNEL__`). Pass it to `Sentry.init({ environment })` and to the `configure_sentry` command as a new `environment: String` arg (`src-tauri/src/commands/sentry.rs`, `src-tauri/src/error_monitoring.rs` about lines 49-55 `.environment(...)`; contract in `src/lib/contracts/commands.ts` about lines 158 and 259).
2. **Honest test button.** `sendSentryTestEvent` returns `'sent'` when `Sentry.flush(2000)` resolves true (`sentry.service.ts` about line 133), but flush also resolves true on a 4xx, offline, a 429 or a CSP block. Rename the result to what it means (the event left the queue) and change the UI text in `src/lib/core/settings/sections/SentrySection.svelte` (about line 80) and `help/documentation/19-settings.md` (about line 268) to say "Test event handed to Sentry. Check your project's Issues page to confirm it arrived." Do not build a custom transport.
3. **Bare host rejected.** `isValidSentryDsn` accepts `https://key@ingest.sentry.io/1` (`src/lib/core/settings/sentry.logic.ts` about line 17), but the CSP only allows `*.ingest.sentry.io` (`src-tauri/tauri.conf.json` line 29), so every browser event would be blocked. Require a subdomain.
4. **Copy.** The section says it reports "unhandled errors" (`SentrySection.svelte` about line 50, `19-settings.md` about line 266), but every `error()` call is sent (`src/lib/utils/debug.ts` line 31). Say "errors the app logs, including handled ones, with their messages (which can contain note paths)".

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] Failing first, `src/tests/lib/core/settings/sentry.logic.test.ts`: a bare `ingest.sentry.io`, `ingest.us.sentry.io` and `ingest.de.sentry.io` DSN is invalid; `o1.ingest.sentry.io` stays valid
- [ ] Failing first, `src/tests/lib/core/settings/sentry.service.test.ts`: `Sentry.init` receives `environment`, and `configure_sentry` is invoked with the same `environment` (assert the IPC args, not only that it was called)
- [ ] Failing first, `src-tauri/tests/error_monitoring_test.rs`: configuring with an environment keeps the client enabled and the client options carry that environment (use the `sentry` `test` feature or inspect `Hub::current().client().options()`)
- [ ] The test-button result text no longer says "sent"; a render or E2E assertion checks the new wording
- [ ] `ipc-parity.test.ts` stays green with the new arg
- [ ] Settings copy and `19-settings.md` updated

## Notes

- Source: `.scratch/usage-telemetry/findings-2026-11-05.md` A.3-A.6; `raw/j21.md` (s1-F6/F7, M1), `raw/j22.md` (s7-F4, s7-F9, s8-F7).
- Owner is the sole recipient of events: paths and hostname in events are acceptable, do not add scrubbers (memory `telemetry-sole-user-note-names-ok`).
- Out of scope: event volume from repeated `error()` calls (Issue 09), source maps (Issue 04), Rust symbols (Issue 05).
- Size: S/M.

## Comments
