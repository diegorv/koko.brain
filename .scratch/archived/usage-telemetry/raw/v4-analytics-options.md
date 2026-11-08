# V4 validator: third-party usage-analytics options

Area: vendors, privacy, cost, Tauri fit, supply-chain policy. Checked 2026-11-05 (local) / 2026-11-06 UTC against repo files (file:line), vendor source code, registry APIs (crates.io, npm, GitHub API) and official docs. Nothing under `src/` or `src-tauri/` was edited.

## Scout s14 (Aptabase)

| id | verdict | severity | evidence |
|---|---|---|---|
| A1 version / Tauri 2 | CONFIRMED (one detail refuted) | info | crates.io API: 1.3.0 on 2026-10-16, 1.0.0 on 2025-03-27, 0.5.1 on 2024-02-04, MIT. Cargo.toml has `rust-version = "1.85.0"`, and the deps include `tauri ^2.11.5`. npm `@aptabase/tauri` 0.7.0 was published 2026-10-16T14:19Z with deps `tslib`, `@tauri-apps/api ^2.10.1`, and it has an attestation. The "three-year gap" is REFUTED: the gap ran 2024-02 to 2025-03 (13 months). The 1.x publisher is `cristipufu` (0.x was `goenning`). |
| A2 per-event data | CONFIRMED | medium | `client.rs` sends `timestamp, sessionId, eventName, systemProps{isDebug, osName, osVersion, locale, engineName, engineVersion, appVersion, sdkVersion}, props`. `sys.rs:21-27` has six fields and no device model. The README says "does not automatically track any events". |
| A3 no device id; session in memory, 4 h | CONFIRMED, but incomplete | medium | `client.rs:17` `SESSION_TIMEOUT` 4 h; `new_session_id` = epoch*1e8+rand. The docs conflict (device model listed) is real: aptabase.com/docs lists "Device model". Missed: the docs also say the server derives "a daily-rotated anonymous hash" from the IP. That is a server-side pseudonymous identifier the client source cannot show. |
| A4 self-host | CONFIRMED; license now verified | medium | `config.rs:26,43-45`: an `SH` key requires `host`. If the host is missing or the key is invalid, `app_key` becomes `""` and tracking is off (config tests :101-108). Server license: GitHub API for `aptabase/aptabase` reports AGPL-3.0 (no longer UNVERIFIED). Missed: `aptabase/self-hosting` was last pushed 2024-07-05 and is stale. |
| A5 pricing / EU | CONFIRMED | low | Official docs: free up to 20,000 events/month, paid from $10/month for 200k up to $450/month for 50M, analytics paused at quota, EU in Germany, US in Virginia. Missed: "Analytics data is retained for up to 5 years". This is the best retention of the hosted options. |
| A6 key at construction | CONFIRMED | high (design) | `lib.rs:62` `Builder::new(app_key: &str)`, `lib.rs:111` `Config::new` in setup. No env read. A per-vault key would need Rust to read it before `.plugin()`, and a key change needs a restart. Kokobrain's Sentry is per-vault and re-configurable at runtime (`src/lib/core/settings/sentry.service.ts:50-58`), so Aptabase cannot copy that UX. |
| A7 delivery | PARTLY REFUTED | low | Flush intervals are confirmed: 60 s release, 2 s debug (`config.rs:21,24`). "Lost on quit" is wrong: `lib.rs:148-151` calls `flush_blocking()` on `RunEvent::Exit`. Only a crash or kill loses the queue. |
| A8 privacy conflict | CONFIRMED | high | `PRIVACY.md:8` says "No analytics, no tracking ... Sentry error reporting is the sole optional exception". `docs/adr/0015-dual-logging-frontend-rust.md:71` says opt-in cloud telemetry "could be added ... later". `docs/adr/0001-tauri-svelte-sveltekit-stack.md:22` says telemetry "must not require an internet round-trip". "Per-vault opt-in" conflicts with A6 (process-wide key). |

## Scout s15 (PostHog)

| id | verdict | severity | evidence |
|---|---|---|---|
| F1 autocapture default on | CONFIRMED | high | Config page: `autocapture` true, `mask_all_text` false, `capture_dead_clicks` true, `rageclick` true. `capture_copied_text` sits inside the autocapture config object, not at the top level. |
| F2 replay must be off | CONFIRMED (config part) | high | `disable_session_recording` default false. Masking wording not re-fetched: UNVERIFIED. |
| F3 default props | UNVERIFIED | medium | `property_denylist` and `before_send` exist. The default-property list was not checked by the scout or by me. |
| F4 persistent id | CONFIRMED | high | `persistence` default `localStorage+cookie`, `memory` allowed. `cookieless_mode` `always`/`on_reject` uses "a privacy-preserving hash generated on PostHog's servers". |
| F5 no manual-only switch | CONFIRMED | medium | `opt_out_capturing_by_default` default false. Missed: `capture_heatmaps`, `capture_performance` and `capture_exceptions` default `undefined` and "fall back to the project's remote setting". A project-side toggle can turn on capture the code never asked for unless each is set to `false`. |
| F6 Tauri v2 issue #1760 | CONFIRMED | high | GitHub API: opened 2025-02-22 and closed "completed" by the reporter `konsalex` 2025-02-23. Two later comments from other users (2025-07) still report it. No maintainer reply. |
| F7 third-party Tauri plugins | CONFIRMED (metadata now checked) | low | crates.io: `tauri-plugin-posthog` 0.2.4 (2025-09-25, ~23k downloads, no repository field); `tauri-plugin-better-posthog` 0.1.6 (2026-03-09, ~9.6k, repo niusia-ua). Both MIT, single-maintainer, low adoption. |
| F8 CSP blocks PostHog | CONFIRMED | high | `src-tauri/tauri.conf.json:29` `connect-src` has no posthog host. Missed: `script-src 'self'` also blocks posthog-js lazy-loading extension scripts from its assets host, if any feature needs them. |
| F9 EU Frankfurt | CONFIRMED (host) | low | `https://eu.i.posthog.com` on the config page. Frankfurt not re-fetched. |
| F10 pricing | UNVERIFIED | low | posthog.com/pricing fetch returned only navigation for me as well. Third-party figures stay unverified. |
| F11 bundle size | UNVERIFIED | low | Not re-checked. Registry `dist.unpackedSize` for 1.447.1 is 28.2 MB (package, not bundle). |
| F12 posthog-rs 0.14 | REFUTED (version) | info | crates.io: `posthog-rs` max_version **0.31.1** (2026-11-05), ~2.8M downloads, repo `github.com/posthog/posthog-rs` (official), MIT. |
| F13 runtime key/host | CONFIRMED | info | `api_host` is an init option. Unlike Aptabase, posthog-js can be re-inited per vault at runtime. |
| F14 self-host | CONFIRMED | medium | posthog.com/docs/self-host: "officially unsupported", MIT hobby Compose, "4 vCPU, 16GB RAM, and more than 30GB storage", "All paid-plan features are Cloud-only". |

## Scout s16 (Sentry for usage)

| id | verdict | severity | evidence |
|---|---|---|---|
| F1 Logs GA, JS API, default on from 10.71.0 | CONFIRMED; fix REFUTED | medium | Docs: "supported in ... 9.41.0", "enabled by default in version 10.71.0". In installed `@sentry/core` 11.9.0 the `enableLogs` option does not exist (absent from `build/types/types/options.d.ts`). `_INTERNAL_captureLog` (`logs/internal.js:36-111`) has no enable gate. Telling the owner to "set `enableLogs: true`" is a no-op in v11, and a type error in an object literal. |
| F2 Application Metrics | CONFIRMED; JS API now verified | info | `metrics/public-api.js`: `count(name, value = 1, options)`, `gauge`, `distribution`. Exposed as `Sentry.metrics.count`. `beforeSendMetric` is at `options.d.ts:500`. Pricing: Developer includes **5GB** Application Metrics, +$0.50/GB. |
| F3 spans wrong tool | CONFIRMED (reasoning) | low | Spans are sampled. Kokobrain also filters out tracing integrations (`sentry.service.ts:63-70`). |
| F4 Explore lookback 7/14/30 | CONFIRMED | info | Logs query window Developer 7 / Team 14 / Business 30 days (docs per search result). This is distinct from storage retention, below. |
| F5 quotas, 30-day lookback | CONFIRMED | medium | sentry.io/pricing: Developer 5k errors, 5M spans, 5GB logs, 5GB metrics, 1 user, "30-day lookback", 10 custom dashboards. Team $29 monthly / $26 annual, "Up to 90-day lookback". |
| F6 PAYG on Developer | CONFIRMED as inference; overage now official | low | The pricing page itself shows "Logs (+$0.50/GB additional)" and "Application Metrics (+$0.50/GB additional)". Developer shows "No" for spend controls. |
| F7 retention undocumented | REFUTED | high (changes the conclusion) | docs.sentry.io/security-legal-pii/security/data-retention-periods/: Logs **30 days on every plan**, Application Metrics **30 days on every plan**, Errors 30/90/90. The fix "use Team for 90 days" is wrong for logs and metrics. Sentry cannot hold more than 30 days of usage data on any plan. |
| F8 conflicting secondary sources | CONFIRMED | low | Developer is 5k errors per the official page. |
| F9 usage = analytics | CONFIRMED | high | `PRIVACY.md:18` also says "logs, metrics ... are disabled". In v11 that holds only because no code calls `Sentry.logger`/`Sentry.metrics` (grep of `src` found none) and the console integration is filtered out (`sentry.service.ts:63-70`). |
| F10 local counter | CONFIRMED (reasoning), strengthened by F7 | info | See missed finding M1. |

## Scout s17 (other vendors)

| id | verdict | severity | evidence |
|---|---|---|---|
| F1 privacy promise | CONFIRMED | high | `PRIVACY.md:3,8,10-18`. |
| F2 scanner and CSP | PARTLY REFUTED | high | The CSP part is right (`tauri.conf.json:29`). The scanner part is wrong in the other direction: see M2. A URL literal does not fail the scan today, so "add the host to `known:`" is not what keeps it honest. |
| F3 local counter | CONFIRMED | medium | `src/lib/utils/log.service.ts:79-80`: `appendLog` writes whenever a session is active. No existing usage-count store found (grep for frecency/usageCount/useCount in `src/lib`: none). See M1 for a precedent. |
| F4 Plausible | CONFIRMED; CE gap resolved | info | Events API: `domain`, `name`, `url` required; props max 30; always 202. Missed: **User-Agent is required, and UA + IP compute the visitor `user_id`**. A Rust sender with no UA, or a server IP, breaks counting or trips bot filtering. CE has the endpoint: `lib/plausible_web/router.ex:414` `post "/event", Api.ExternalController, :event` in the open-source repo (AGPL-3.0 per GitHub API). |
| F5 Umami | CONFIRMED; gap resolved | info | MIT (GitHub API). `src/app/api/send/route.ts:124-127`: the website must exist (`fetchWebsite`). `:143` returns `{beep:'boop'}` silently when `isbot(userAgent)`. `:162` session id = `uuid(sourceId, ip, userAgent, salt, distinctId)`, a pseudonymous hash. |
| F6 TelemetryDeck | CONFIRMED (hosted only) | info | GitHub API lists all 25 org repos: SDKs, `TelemetryViewer` (MIT, the dashboard app), `druid` fork. No ingest server. Free tier: per a search summary of the official plans page (the SPA did not render for fetch), **50k events/month, 3 months retention, daily ingestion**. The 100k figure is older. 3-month retention is the weakest fit for "over time". |
| F7 OpenPanel | CONFIRMED (license) | info | GitHub API: AGPL-3.0, active (pushed 2026-11-05). Section 7 wording, infrastructure and free tier: UNVERIFIED. |
| F8 Countly | CONFIRMED as ambiguous | info | GitHub API license `NOASSERTION` for countly-server, which matches the scout's "modified" wording. |
| Ranking | CONFIRMED with one change | - | Local first, Umami/Plausible self-host next. TelemetryDeck should drop below OpenPanel for this question because of its 3-month free retention. |

## Scout s19 (supply-chain fit)

| id | verdict | severity | evidence |
|---|---|---|---|
| F1 scanner blind to package names | CONFIRMED | high | `.github/workflows/privacy.yml:37-57`: no posthog/aptabase pattern. Rust root is `src-tauri/src` (`:85`), so `Cargo.toml` is never read. An import line `import posthog from 'posthog-js'` matches no pattern (tested against the skip/pattern list). |
| F2 Aptabase HTTP in Rust | CONFIRMED | high | crates.io deps: `reqwest ^0.13.4`, `tokio`, `os_info`, `sys-locale`, `rand ^0.10`, `futures`, `time`. Rust traffic bypasses the webview CSP. Permission question resolved: the README says to add `aptabase:allow-track-event` to the ACL (and `allow-track-error` for errors). No `default.toml`, so JS calls fail without it. |
| F3 static CSP vs user host | CONFIRMED (line ref wrong) | high | `tauri.conf.json:29` is static. The HTTP scopes are `src-tauri/capabilities/default.json:224-263` (the file has 270 lines, so ":235-274" is off). `allow-fetch` lists only todoist and the themes host. |
| F4 escape hatches | CONFIRMED, understated | high | `privacy-ok` count: 12 (grep). The bigger hole is M2. |
| F5 PostHog defaults and deps | CONFIRMED | high | Registry 1.447.1 deps match, including `web-vitals-soft-navs: npm:web-vitals@6.2.1` alias. License `(Apache-2.0 AND MIT)`. |
| F6 Sentry Logs via `enableLogs` | REFUTED (mechanism) | medium | No `enableLogs` in 11.9.0; logs send whenever `Sentry.logger.*` is called with a client (see s16 F1). `package.json:46` `^11.9.0`, installed 11.9.0. No `Sentry.logger`/`beforeSendLog` in `src` (grep). |
| F7 quarantine | PARTLY REFUTED | medium | `minimumReleaseAge: 7200` is at `pnpm-workspace.yaml:11`, not :7. **It is pnpm-only.** For crates there is only the Dependabot cooldown (`docs/adr/0014-supply-chain-pnpm-quarantine.md:76,103-104`). The CI quarantine job checks `pnpm-workspace.yaml` (`security.yml:55-81`). A hand-added `tauri-plugin-aptabase` has no age gate. Timestamp question resolved: 1.447.1 is `2026-11-06T00:07Z` because UTC is already 2026-11-06 (timezone, not an anomaly). Missed: posthog-js shipped 54 versions in the last 30 days (5 on 2026-11-05 alone), so the 5-day window always lags and Dependabot churn will be constant. `@aptabase/tauri` is not covered by the `@tauri-apps/*` exclude (`pnpm-workspace.yaml:18`). |
| F8 policy changes; privacy.yml not on every PR | CONFIRMED | medium | `privacy.yml:3-16` triggers on push to main, dispatch and `workflow_call`. `pr.yml:90-94` calls it only when `needs.changes.outputs.privacy == 'true'` (path filter). `PRIVACY.md:20` "runs on every push and pull request" is inaccurate. |
| F9 Aptabase scope; self-host UNVERIFIED | PARTLY REFUTED | info | Docs fields confirmed. Self-host is verified in code (`config.rs:43-45` `SH` + host) and in the AGPL server repo. Only the docs page omits it. |
| F10 local counters | CONFIRMED | info | `docs/adr/0015-dual-logging-frontend-rust.md:20`, `log.service.ts:79-80`. |
| OQ4 reqwest already in lock | CONFIRMED | info | `src-tauri/Cargo.lock` has reqwest 0.12.28 and 0.13.5. The app's `reqwest = "0.13"` (`src-tauri/Cargo.toml:65`) unifies, so the plugin adds little. `sys-locale` and `futures` are new. |

## Findings the scouts missed

- **M1 (info, design-relevant). A content-safe local usage trail already exists.** `src/lib/utils/log.service.ts:145,192-215` logs `[NAV] click "<aria-label>"` on every pointerdown while the opt-in heartbeat runs. It deliberately never uses element text ("inside the editor that is the note body", :204-205). This is a precedent for local-only, label-based feature counting. Caveat (not verified): some aria-labels may embed note names.
- **M2 (high, privacy CI). The privacy scanner skips every line that contains a URL.** The skip rule `:\s*//` (`.github/workflows/privacy.yml:69`) is applied to the whole `file:line:content` match (`.github/actions/scan-external-calls/action.yml:84-95`). `://` in any URL matches it. Tested with BSD grep and ugrep: `await fetch('https://evil.org/c')` on one line is "skipped", and so is `posthog.init(k, { api_host: 'https://eu.i.posthog.com' })`. The `https?://` pattern (`:57`, `:100`) is therefore inert, and single-line `fetch('https://…')` calls pass. Any vendor plan that relies on "privacy CI will catch it" is wrong today. This belongs to the Part A/CI area: file it as its own Issue.
- **M3 (high, decision). Sentry cannot answer "over time".** Logs and Application Metrics retention is 30 days on every plan (Sentry data-retention table). Upgrading does not help.
- **M4 (medium). Aptabase 1.3.0 also does crash and error reporting.** `lib.rs:93` `with_crash_reporting`, a panic hook (`:117-141`), and `track_error`. This overlaps Kokobrain's Sentry opt-in (`src-tauri/src/error_monitoring.rs` per `PRIVACY.md:18`). If adopted, keep it off, or two crash reporters will fight over the panic hook.
- **M5 (low). Aptabase's reqwest has `default-features = false` and no TLS feature** (plugin Cargo.toml line 21: `json, charset, http2, system-proxy`). HTTPS works in Kokobrain only through feature unification with the app's default-feature `reqwest 0.13` (`src-tauri/Cargo.toml:65`). Not tested.
- **M6 (medium). Retention ranking for "usage over time".** Aptabase hosted: up to 5 years. TelemetryDeck free: 3 months. Sentry logs/metrics: 30 days. PostHog: UNVERIFIED. Self-hosted Umami/Plausible: unlimited (owner's disk). Local counter: unlimited.

## Verdict for this area

The facts favor a **local-only feature counter** as the default answer. It needs no vendor, CSP change, PRIVACY.md change or supply-chain exposure, and it has no retention limit. Sentry fails the "over time" requirement (30-day hard cap on logs and metrics, M3). PostHog is the worst fit: autocapture and remote-config defaults, an open Tauri v2 delivery report, about 54 releases a month against a 5-day quarantine, and a heavy package. If the owner wants a hosted dashboard anyway, **Aptabase EU** is the strongest vendor: MIT plugin, manual events only, 5-year retention, 20k events/month free. It costs a process-wide app key (no per-vault runtime toggle without a restart), an ACL permission, a PRIVACY.md rewrite, and a duplicate crash reporter to disable. **Self-hosted Umami** is the fallback when the owner wants the data off third-party clouds. Whatever is chosen, fix M2 first: the privacy scanner does not catch URL-bearing network calls today.

Unverified: PostHog pricing and default properties, TelemetryDeck plan details (search summary only), OpenPanel and Countly license terms, and every payload claim beyond reading the source (no request was captured).
