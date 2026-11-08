# s10: Known Sentry issues and decisions (as of 2026-11-05, main at 47ecf60ef)

## Summary

- Sentry is opt-in per vault, off by default, and the privacy controls are in place (default off, CSP limited to Sentry ingest, browser integrations filtered, `beforeSend` scrubbing, Rust `send_default_pii(false)`). Do not re-report these as missing.
- Sentry was moved under Settings > Advanced (ux-polish Issue 32, commit a6b28484d). That placement is settled; do not re-report it.
- Still open: `error()` forwards a non-Error string argument to Sentry unchanged (a path leak channel), the Rust `configure_sentry` tears down the live client before validating the DSN, and the DSN field reconfigures Sentry on every keystroke.
- The Rust `sentry` bump to 0.49.5 (commit 7fee3cbac, 2026-11-05) is not on HEAD; `Cargo.lock` still pins 0.49.3.
- No automated test covers the open items; the Sentry E2E case in `e2e/specs/settings.spec.ts` was reviewed but not run.

## Findings

**F1. medium. open. Privacy: `error()` sends a string argument to Sentry as the exception**
- Claim: when no `Error` is among the args, `error()` passes the last argument, which may be a string with paths or content, to `captureSentryException`. `beforeSend` strips breadcrumbs, extra, request and user, but not the exception value or message.
- Evidence: `src/lib/utils/debug.ts:31` (`args.find(arg instanceof Error) ?? args.at(-1)`); `src/lib/core/settings/sentry.service.ts:112-117` (passes the value to `Sentry.captureException`); `sentry.service.ts:28-36` (`removeSensitiveEventData` does not touch the exception). Concrete string-only call sites: `src/lib/core/vault/vault.service.ts:44` (a path string as the only argument) and `src/lib/core/trash/trash.service.ts:167` (`restorePath` in the message). Earlier audit: `.scratch/audit-2026-11-04/findings.md:494` (plausible). Tests: `src/tests/lib/utils/debug.test.ts:140` mocks `captureSentryException` and asserts only on an Error, so the string path is untested.
- Suggested fix: send only `Error` instances (or a fixed message plus the tag) from `error()`; or scrub string exception values in `beforeSend`. Add a `debug.test.ts` case where the last argument is a string.

**F2. low. open. Rust `configure_sentry` closes the live client before validating the DSN**
- Claim: a configure call with `enabled: true` and a malformed DSN unbinds and closes the existing client, then fails at parse. Rust error and panic reporting stay off until a valid call arrives.
- Evidence: `src-tauri/src/error_monitoring.rs:36-40` (unbind and `previous.close`), `:46-48` (DSN parse, after teardown). The doc comment at `:23-25` says a malformed DSN "fails safely before a Sentry client is created", which is true only for the new client. Test `src-tauri/tests/error_monitoring_test.rs:4-11` covers only the no-prior-client case. Audit: `.scratch/audit-2026-11-04/findings.md:353` (confirmed).
- Reachability: low. The frontend gates with `isValidSentryDsn` (`sentry.service.ts:41`, `:52`) and sends `enabled: false` otherwise, so the bad-DSN path is reachable only by a direct IPC call.
- Suggested fix: parse the DSN before unbinding, and add a test with an active client that asserts it survives a malformed configure.

**F3. low. open. DSN field reconfigures Sentry on every keystroke**
- Claim: `oninput` calls `updateSentry` per character. Each change closes the client (`Sentry.close(2000)`), makes an IPC call and re-inits. Calls are serialized, so there is no race, but the work churns, and the "Enter a valid Sentry Cloud DSN" message shows while typing.
- Evidence: `src/lib/core/settings/sections/SentrySection.svelte:13-24` and `:64-67`; `sentry.service.ts:39-48` (close when `activeDsn !== null`), `:94-99` (queue). Audit: `.scratch/audit-2026-11-04/findings.md:440` (plausible). Tests: `sentry.service.test.ts:144` covers reconfigure on a DSN change, not the typing sequence.
- Suggested fix: update the DSN on `onchange` or `onblur`, or debounce the input.

**F4. low. open. Auto-move error reporting on every save (caller unverified)**
- Claim: an enabled rule with an empty expression throws on each save, and the catch reports through `onError`, which may reach `error()` and Sentry once per save per rule.
- Evidence: `src/lib/features/auto-move/auto-move.logic.ts:24-31`. Audit: `.scratch/audit-2026-11-04/findings.md:146` (plausible).
- UNVERIFIED: which caller passes `onError`. `auto-move.service.ts` does not pass it in the lines I searched.
- Suggested fix: validate empty expressions when the rule is saved, or dedupe reports per rule.

**F5. low. open. Double-click on an unresolved wikilink creates a duplicate report**
- Claim: two fast clicks run `openOrCreateNote` twice. The second `create_note` fails because the file now exists, and `error()` reports it to Sentry even though the note opened.
- Evidence: `src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17-22` (no in-flight guard); `src/lib/app/editor-host.ts:124-132` (`createNote`). Audit: `.scratch/audit-2026-11-04/findings.md:315` (plausible). I did not re-trace the full `openOrCreateNote` path.

**F6. low. open. Lifecycle does not recheck the init version after Sentry configuration**
- Claim: a superseded vault init can run `startSettingsPersistence` after `configureSentry` resolves, with no version check in between.
- Evidence: `src/lib/app/lifecycle/app-lifecycle.service.ts:201` (the `initVersion` check), `:203` (`await configureSentry`), `:210` (`startSettingsPersistence`, with no check after the await). Audit: `.scratch/audit-2026-11-04/findings.md` (lifecycle entry, plausible); `.scratch/audit-2026-11-05/raw/wave1.json:187-188` (still listed as open).

**F7. low. open. Template creation failure bypasses `error()`**
- Claim: the failure goes to `console.error` and never reaches the session log or Sentry.
- Evidence: `src/lib/plugins/templates/TemplatePicker.svelte:43`. Audit: `.scratch/audit-2026-11-04/findings.md:628` (confirmed). Same pattern noted for `OneOnOnePicker.svelte:32` in the audit (not re-verified).

**F8. medium. open (unverified). Rust-side scrubbing is weaker than the browser side**
- Claim: the browser has a `beforeSend` scrubber. The Rust client has none; it relies on `send_default_pii(false)` and `max_breadcrumbs(0)`, so Rust panic messages and error strings go out as-is.
- Evidence: `src-tauri/src/error_monitoring.rs:49-55`; `src-tauri/Cargo.toml:72` (features: backtrace, contexts, panic, transport). Whether any Rust error or panic string contains note text or paths was not traced.
- UNVERIFIED: content of Rust error strings sent to Sentry.

**F9. info. not a bug. Dependency state**
- `@sentry/browser`: `package.json:46` is `^11.9.0`; commit c32040598 (2026-10-29) says "bump ... to 11.8.0".
- Rust `sentry`: `src-tauri/Cargo.lock:4703` pins `0.49.3`; `src-tauri/Cargo.toml:72` requires `0.49.2`.
- Commit 7fee3cbac ("Bump sentry from 0.49.3 to 0.49.5 in /src-tauri", 2026-11-05) is not an ancestor of HEAD and `git branch --contains` lists no local branch. UNVERIFIED where it lives (a worktree or remote branch). Do not report a stale lock on main as a bug until that is checked.

**F10. info. open. Verification gaps**
- `e2e/specs/settings.spec.ts`, including the Sentry case, was read but not run (`.scratch/ux-polish/issues/32-settings-ia-badges-build-info-sentry.md:22`, `:48`). The full vitest suite and `pnpm build` did not run for Issue 32 either.
- Rail-shell F70 (`.scratch/rail-shell-ux/review-2026-11-03.md:171`): a settings.json parse error overwrites the file, losing Sentry settings with no backup. Tracked in `.scratch/rail-shell-ux/issues/09-settings-json-parse-failure-keeps-a-backup.md`. UNVERIFIED whether that issue has landed; I did not read its status or `settings.service.ts`.

**F11. info. settled. Decisions to keep**
- Off by default and per-vault opt-in: `settings.store.svelte.ts:126-129`; lifecycle disables Sentry on vault switch and teardown (`app-lifecycle.service.ts:154`, `:585`); configures only after the vault's settings load (`:203`).
- Network allowlist: `src-tauri/tauri.conf.json:29` (`connect-src` limited to `*.ingest.sentry.io`, `*.ingest.us.sentry.io`, `*.ingest.de.sentry.io`), matching `isValidSentryDsn` in `sentry.logic.ts:2-6`, `:13-27`.
- Data filtering: `sentry.service.ts:63-83` (integration allowlist, `dataCollection` off, `frameContextLines: 0`).
- Public docs and CI guard: `PRIVACY.md:8` and `:18` describe the one optional exception; `.github/workflows/privacy.yml:56`, `:79-80` scan for `@sentry/browser` and `ingest(\.us|\.de)?\.sentry\.io`, the only allowed outbound host.
- Settings doc: `help/documentation/19-settings.md:9` and `:260-267` match the Advanced placement.
- Tests: `src/tests/lib/core/settings/sentry.service.test.ts` (7 cases, lines 21-144), `sentry.logic.test.ts`, `src-tauri/tests/error_monitoring_test.rs` (2 cases).

**F12. info. decision. Cloud telemetry was rejected in the ADR**
- `docs/adr/0015-dual-logging-frontend-rust.md:71` rejects cloud-shipped telemetry as "orthogonal and privacy-sensitive" for a local-first app, and allows an opt-in layer later. Re-evaluation triggers are at `:82`. Any usage analytics would need an ADR amendment and would conflict with `PRIVACY.md:8` ("No analytics, no tracking") unless it is local-only.

## Open questions

1. Does any real `error()` call pass a note body or note title as a string? F1 is a path leak for sure; content leakage is UNVERIFIED.
2. Which branch holds commit 7fee3cbac, and is the Rust sentry bump meant for main?
3. Who passes `onError` to `findAutoMoveRule`, and does it reach `error()`? (F4)
4. Do Rust error or panic strings include note paths or content? (F8)
5. Is the Sentry E2E case in `settings.spec.ts` green on current main? It was not run.
6. Was rail-shell Issue 09 (settings.json parse failure) landed, so that Sentry settings survive a parse error?
7. Not read: `.scratch/ux-polish/review-2026-11-04.md` and `.scratch/ux-polish/work/settings.md`, which also mention Sentry.
