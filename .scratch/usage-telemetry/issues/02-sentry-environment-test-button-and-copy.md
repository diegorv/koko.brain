# 02: Sentry events carry an environment, the test button stops claiming delivery, and the copy says what is sent

**What to build:** Four small fixes to the existing Sentry integration.

1. **Environment on both sides.**
   - Today JS events always say `production` (the SDK default), and a `pnpm tauri dev` build shares the stable release name: `src/lib/core/settings/sentry.service.ts` (about lines 19-22) takes only the version token of `__BUILD_INFO__`. Dev noise therefore lands in the production issue stream. Rust picks `development` or `production` from debug assertions.
   - Add a pure `sentryEnvironment(isDev: boolean, channel: string): string` to `sentry.logic.ts`. It returns `'development'` when `isDev`, otherwise the channel.
   - In the service, call it with `import.meta.env.DEV` and `getBuildChannel()` from `#lib/utils/app-channel.js`. Do not read the bare `__APP_CHANNEL__`: Vitest does not inject Vite's `define`, so a bare read throws a ReferenceError (`src/lib/utils/app-channel.ts` about lines 6-9).
   - Pass the result to `Sentry.init({ environment })`, and to the `configure_sentry` command as a new `environment: String` arg:
     - `src-tauri/src/commands/sentry.rs`;
     - `src-tauri/src/error_monitoring.rs` about lines 49-55: `.environment(...)`;
     - the contract in `src/lib/contracts/commands.ts`, about lines 158 and 259.
   - Rust events change from `production` to `stable` or `nightly`. That splits the existing Sentry history, and this is intended.
2. **Honest test button.**
   - `sendSentryTestEvent` returns `'sent'` when `Sentry.flush(2000)` resolves true (`sentry.service.ts` about line 133). In SDK 11.9.0, flush also resolves true on a 4xx, offline, a 429 or a CSP block: `promisebuffer.js:29` uses `allSettled(...).then(() => true)`.
   - Rename the result to what it means: the event left the queue.
   - Change the result text in `src/lib/core/settings/sections/SentrySection.svelte` (about lines 31-35; `'Test event sent. ...'` is at about line 32) to: "Test event handed to Sentry. Check your project's Issues page to confirm it arrived."
   - Change the item description (about line 80) and `help/documentation/19-settings.md` (about line 268) so they no longer promise confirmation.
   - Do not build a custom transport.
3. **Bare host rejected.**
   - `isValidSentryDsn` accepts `https://key@ingest.sentry.io/1` (`src/lib/core/settings/sentry.logic.ts` about line 17).
   - The CSP only allows `*.ingest.sentry.io` (`src-tauri/tauri.conf.json` line 29), so every browser event from such a DSN would be blocked.
   - Require a subdomain.
4. **Copy.**
   - The section says it reports "unhandled errors" (`SentrySection.svelte` about line 50, `19-settings.md` about line 266), but every `error()` call is sent (`src/lib/utils/debug.ts` line 31).
   - Change it to: "errors the app logs, including handled ones, with their messages (which can contain note paths)".

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`.

- [ ] **Bare-host DSN** (failing first, `src/tests/lib/core/settings/sentry.logic.test.ts`): a bare `ingest.sentry.io`, `ingest.us.sentry.io` or `ingest.de.sentry.io` DSN is invalid; `o1.ingest.sentry.io` stays valid.
- [ ] **`sentryEnvironment`** (failing first, `sentry.logic.test.ts`): dev gives `'development'`; non-dev gives the channel.
- [ ] **Environment wiring** (failing first, `src/tests/lib/core/settings/sentry.service.test.ts`):
  - with `vi.stubEnv('DEV', false)` and `globalThis.__APP_CHANNEL__ = 'nightly'`, `Sentry.init` receives `environment: 'nightly'` and `configure_sentry` receives the same value;
  - update the three exact-object `toHaveBeenCalledWith('configure_sentry', {...})` assertions (about lines 32, 44 and 58).
- [ ] **Rust** (failing first, `src-tauri/tests/error_monitoring_test.rs`):
  - configuring with an environment keeps the client enabled, and the client options carry that environment (inspect `Hub::current().client().options()`);
  - update the existing callers (about lines 7 and 17).
- [ ] **Test-button wording** (component test that mocks `sentry.service`; an E2E check would need a real network flush): the text no longer says "sent".
- [ ] **IPC parity:** `ipc-parity.test.ts` stays green with the new arg.
- [ ] **Docs:** the Settings copy and `19-settings.md` are updated.

## Notes

- Source: `.scratch/usage-telemetry/findings-2026-11-05.md` A.3-A.6; `raw/j21.md` (s1-F6/F7, M1), `raw/j22.md` (s7-F4, s7-F9, s8-F7); review 2026-11-06.
- Owner is the sole recipient of events: paths and hostname in events are acceptable, do not add scrubbers (memory `telemetry-sole-user-note-names-ok`).
- Out of scope: event volume from repeated `error()` calls (Issue 09), source maps (Issue 04), panic location (Issue 05, after this one), Rust symbols (Issue 11).
- Size: S/M.

## Comments
