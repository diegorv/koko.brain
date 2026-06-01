# PostHog Telemetry (opt-in)

Add privacy-first, opt-in PostHog analytics to KokoBrain, modeled on the tolaria
reference integration. Client-only (`posthog-js`), EU region by default, no
autocapture, no session recording, memory-only persistence, manual events only.
A stable per-install anonymous id lives in the Tauri app-config dir (outside any
vault). Consent defaults OFF; nothing loads or phones home until the user enables
it in Settings > Privacy.

## Decisions (locked)

- Region: EU (`https://eu.i.posthog.com`) default.
- Consent: opt-in. `analyticsEnabled` defaults `false`.
- PostHog token: entered in the UI and persisted in `settings.json`
  (`posthogToken`), per the user — it is a write-only project key, not
  sensitive, and the user only tests on their own machine. The build-time
  `VITE_POSTHOG_KEY` env var stays as a fallback when the setting is empty.
- UI placement: an "Analytics" subsection inside the existing Troubleshooting
  section (enable Switch + token text input). NO separate Privacy nav section,
  so `SettingsSection` / `sectionIcons` stay untouched.
- Anonymous id: per-install, stored in `appConfigDir()/telemetry-id.json`.
- Network egress goes through the webview `fetch`/`sendBeacon` (gated by CSP
  `connect-src`), NOT the `@tauri-apps/plugin-http` plugin. posthog-js uses the
  browser network stack directly, same as tolaria.

## Tasks

- [x] Task 1: Infra/config. Add `posthog-js` dep; `.env.example`
      (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST=https://eu.i.posthog.com`); add
      `ImportMetaEnv` augmentation to `src/app.d.ts`; add EU posthog hosts to
      `tauri.conf.json` CSP (`script-src` + `connect-src`); add `$APPCONFIG`
      fs scopes to `capabilities/default.json`. Verify `pnpm check`.
- [x] Task 2: Settings flag. Add `analyticsEnabled: boolean` (default false) to
      `AppSettings`; store getter + updater; merge line in `loadSettings`. Tests.
- [x] Task 3: `telemetry.logic.ts` (pure) — `resolveTelemetryConfig(env)`,
      `isValidPosthogHost`, EU host constant. Tests.
- [x] Task 4: Settings token field. Add `posthogToken: string` (default '') to
      `AppSettings`; store getter + updater `updatePosthogToken`; merge line in
      `loadSettings`. Tests.
- [x] Task 5: `telemetry.service.ts` — per-install anon id (fs + appConfigDir),
      `getTelemetryConfig` (settings token first, env fallback), `initTelemetry`,
      `teardownTelemetry`, `trackEvent`; `product-analytics.ts` domain wrappers +
      consent events. Tests.
- [x] Task 6: Lifecycle wiring — init telemetry after `loadSettings` in
      `initializeVault` when `analyticsEnabled`; `teardownTelemetry()` in
      `teardownVault`.
- [x] Task 7: Troubleshooting UI — "Analytics" subsection in
      `TroubleshootingSection.svelte`: enable Switch (wired to init/teardown +
      opted-in/out events) + PostHog token input. Re-init on token change while
      enabled.

## Notes

- posthog-js init options (privacy-hard, mirrors tolaria): `autocapture: false`,
  `capture_pageview: false`, `persistence: 'memory'`, `disable_session_recording: true`.
- `crypto.randomUUID()` is the id generator (already used in trash/kanban logic).
- Release channel (`getBuildChannel()`) is sent as an identify super-prop.
- Logic takes env as an argument so it is testable without `import.meta`.
- Service init is idempotent (guards on existing instance); teardown is idempotent.
- Event property values restricted to `string | number` to avoid leaking note content.
