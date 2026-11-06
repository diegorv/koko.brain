# s4: Sentry capture coverage (what reaches Sentry)

## Summary

- Capture path that works: `error()` in `src/lib/utils/debug.ts:27-33` calls `captureSentryException` synchronously (`sentry.service.ts:112-118`) before `console.error`. Global handlers (`GlobalHandlers`, kept at `sentry.service.ts:67`) catch uncaught errors and unhandled rejections while a vault has opted in. Rust panics are captured through the `panic` feature (`src-tauri/Cargo.toml:72`, `error_monitoring.rs:62-63`).
- About 162 `error(` calls (38 `.ts`, 9 `.svelte` files) feed Sentry. About 13 `console.error(` sites in `src/lib` bypass it, and about 20 `.catch(() => {})` or empty-body `catch` sites swallow errors silently.
- The biggest blind spots: CodeMirror live-preview failures go through `reportError`/`editorLog` and never reach Sentry; Rust `Err(String)` command results are never reported (only panics are); there is no `svelte:boundary` and no `hooks.client` error handler.
- Capture only runs for a vault that opted in and after `configureSentry` (`app-lifecycle.service.ts:203`). Errors before that point, on the welcome screen, and in the vault-switch gap are not captured.
- Related privacy risk: when the last argument to `error()` is a string, Sentry uses it verbatim as the event message (`sentry.service.ts` line 31, `eventbuilder.js:82`), and `beforeSend` strips only breadcrumbs, extra, request, and user. Messages that contain paths or note text leave the machine.

## Findings

### F1: CodeMirror live-preview errors never reach Sentry
- **Severity:** high
- **Claim:** Errors in live-preview decoration handlers, click handlers, and wikilink code are logged to the console and a local log port only. They are not sent to Sentry.
- **Evidence:**
  - `src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:36-39`: `reportError` calls `console.error` and `port.log`, never `error()` or Sentry.
  - `.../live-preview/inline/inline-formatting-plugin.ts:83-91`: `try { decorate() } catch` writes `editorLog('LP-INLINE', ...)` once per handler and does not rethrow.
  - `.../live-preview/wikilink-navigation.ts:33-34, 63-64` and `.../live-preview/click-handler.ts:38` use `reportError`.
  - `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:20-21` uses `reportError`.
  - `src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:113-116` and `widgets/math-widget.ts:62-65` catch render failures, show text in the DOM, and log nothing.
- **Suggested fix:** Make `reportError` call `error()` (or `captureSentryException`) so these reach Sentry. Add a `captureSentryException` call in the `inline-formatting-plugin.ts` catch, keeping the once-per-handler throttle. Decide explicitly whether mermaid and math render failures should be reported, since they are user-content dependent and may be noisy.

### F2: Rust command errors are never reported; only panics are
- **Severity:** high
- **Claim:** The Rust side reports only panics. Commands that return `Err(String)` reach the frontend as rejected `invoke` promises. They are reported only if a frontend caller calls `error()` on them, and many do not.
- **Evidence:**
  - `src-tauri/Cargo.toml:72`: `sentry` with `features = ["backtrace", "contexts", "panic", "transport"]` and `default-features = false`. The docs.rs feature page for 0.49.2 lists `panic` as enabling `sentry-panic`, and `transport` as enabling `reqwest` plus `native-tls` (https://docs.rs/crate/sentry/0.49.2/features).
  - `src-tauri/src/error_monitoring.rs:26-66`: the only capture path is the panic integration (inherited through the bound hub, lines 60-63). There is no capture call for `Err` values.
  - `src-tauri/src/commands/sentry.rs:7-13` and the `commands/` tree (about 82 matching lines for `async fn` or `#[tauri::command]`, grep count, approximate): command errors return `Result<_, String>`.
  - `src-tauri/src/lib.rs:66, 85` and `src-tauri/src/utils/logger.rs:62`: `eprintln!` only, no Sentry.
  - `src/lib/contracts/ipc.ts:21-27`: `call()` is a bare `invoke` wrapper with no logging or capture. Failures surface only at each caller.
  - `Cargo.toml` profiles (lines 84-98) set no `panic = "abort"`, so unwinding is the default and the panic hook runs. Panic capture is therefore expected to work (not run; UNVERIFIED at runtime).
- **Suggested fix:** Add capture for command failures in one place, such as a `call()` wrapper that reports rejections with `command` as a tag. Keep the message generic, because Rust error strings may contain paths. On the Rust side, capture `Err` values from high-value commands (vault DB open, save, index build) explicitly with `sentry::capture_message` or `capture_error`, or accept the gap and document it.

### F3: Silent swallows of fire-and-forget promises
- **Severity:** high
- **Claim:** About 10 `.catch(() => {})` or equivalent sites discard rejections with no log and no capture. Several sit on user-visible paths.
- **Evidence:**
  - `src/lib/core/filesystem/fs.service.ts:169`: `loadDirectoryTree(vaultPath).catch(() => {});` (file tree load).
  - `src/lib/features/backlinks/BacklinksPanel.svelte:28-29`: `fetchBacklinksV2(path).catch(() => {});` and `fetchRelationshipBacklinks(path).catch(() => {});`.
  - `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:27`: `fetchOutgoingLinksV2(path, content).catch(() => {});`.
  - `src/lib/features/canvas/FileNode.svelte:45` and `ImageNode.svelte:35`: `.catch(() => {` with a body that is not logged (body not read, UNVERIFIED beyond the first line).
  - `src/lib/features/search/SemanticIndexStatus.svelte:48`: `.catch(() => {`.
  - `src/lib/features/event-calendar/event-calendar.service.ts:1311` and `src/lib/features/type-definitions/type-definitions.service.ts:358`: queue tails (`run.catch(() => {})`). Likely intentional, since the chain is awaited elsewhere.
  - `src/lib/utils/inflight.ts:136-138`: cache eviction on rejection. Intentional, not a bug.
  - Also in `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:689` and `src/lib/core/frontmatter/frontmatter-write.service.ts:155`, `.catch(() => true)` is used as an existence probe. Intentional.
- **Suggested fix:** For the panel fetches and the file tree load, replace `() => {}` with `(err) => error('TAG', 'msg:', err)`. Leave the queue tails and existence probes alone.

### F4: Empty or silent `catch {}` blocks on user-visible or data paths
- **Severity:** medium
- **Claim:** Several `catch {}` blocks return a default without logging. Most are benign, but a few hide real failures.
- **Evidence:**
  - `src/lib/features/type-definitions/type-definitions.service.ts:71, 151, 194, 225`: `catch {` with no `error()`. Lines 71 and 151 are not verified beyond the catch line, so they are UNVERIFIED as benign.
  - `src/lib/features/type-definitions/type-sidebar.logic.ts:536, 557`.
  - `src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:150, 164`.
  - `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:117, 125`: URL parsing helpers. Benign.
  - `src/lib/core/settings/theme.service.ts:83` uses `console.error` for a localStorage mirror. Benign.
- **Suggested fix:** Review the type-definitions and type-sidebar blocks first, since they sit on data write paths. Route any that hide a real failure through `error()`.

### F5: Direct `console.error` calls bypass Sentry
- **Severity:** medium
- **Claim:** About 13 `console.error` sites in `src/lib` do not call `error()` and so are never captured.
- **Evidence:**
  - `src/lib/features/command-palette/CommandPalette.svelte:34` ("Command ... failed").
  - `src/lib/features/tasks/TasksView.svelte:89` (Todoist sync failed).
  - `src/lib/plugins/calendar/CalendarNavigator.svelte:70` and `:81` (`.catch(console.error)`).
  - `src/lib/plugins/one-on-one/OneOnOnePicker.svelte:32` (create 1:1 note failed).
  - `src/lib/plugins/templates/TemplatePicker.svelte:43` (create from template failed).
  - `src/lib/utils/log.service.ts:72, 105, 177`: logger failures. Reporting these to Sentry would be circular, so leave them.
  - `src/lib/core/settings/sections/SentrySection.svelte:22, 38`: Sentry's own configuration failures. Also circular.
- **Suggested fix:** Convert CommandPalette, TasksView, CalendarNavigator, OneOnOnePicker and TemplatePicker to `error()`. These are user-facing create and sync failures.

### F6: No Svelte error boundary and no `handleError` hook
- **Severity:** high
- **Claim:** The app has no `svelte:boundary` and no client error hook, so render and effect errors go to the global error path, and the UI may unmount.
- **Evidence:**
  - `git grep svelte:boundary -- src` returns 0 matches.
  - `git grep handleError` returns 0 matches. `src/hooks.client.ts` does not exist (only `src/app.d.ts`).
  - Global capture still applies: `GlobalHandlers` is kept (`src/lib/core/settings/sentry.service.ts:63-70`), and it catches uncaught errors and unhandled rejections when a vault has opted in.
  - Whether an uncaught error inside a Svelte 5 component tree unmounts the whole app, and whether it surfaces to `window.onerror` in the Tauri WebView, is UNVERIFIED. This was not run.
- **Suggested fix:** Add a root `svelte:boundary` (or a `handleError`-equivalent for the app shell) that calls `error()` and shows a recoverable message. Verify the unmount behavior with a deliberate throw in a dev build before relying on it.

### F7: Capture is gated to a vault that opted in; early and between-vault errors are lost
- **Severity:** medium
- **Claim:** Nothing is sent until `configureSentry` runs in `initializeVault`. Errors earlier in startup, on the welcome screen, or during a vault switch are dropped.
- **Evidence:**
  - `src/lib/core/settings/sentry.service.ts:113`: `captureSentryException` returns when `activeDsn === null`.
  - `src/lib/app/lifecycle/app-lifecycle.service.ts:199`: `await loadSettings(vaultPath)` is not wrapped in try/catch. A throw there rejects `initializeVault` and is not captured. The `configureSentry` call comes after it, at line 203.
  - `app-lifecycle.service.ts:154` and `:585`: `void disableSentry()` runs at the start and end of the vault lifecycle. Between those points, errors are not captured.
  - `app-lifecycle.service.ts:236-239`: the vault DB open failure is reported (after configure), so this one is captured.
- **Suggested fix:** Decide whether pre-vault errors should be captured. The opt-in is per vault by design, so this may be intended. If so, document it in PRIVACY.md or the Sentry section so the owner is not surprised. The unwrapped `loadSettings` throw is a real gap; wrap it in the same way as the surrounding steps.

### F8: String last-argument becomes the Sentry message, losing context
- **Severity:** medium
- **Claim:** `captureSentryException(tag, args.find(Error) ?? args.at(-1))` sends a non-Error last argument as the message. The descriptive text in earlier arguments is dropped from the event, and `undefined` becomes the literal message `"undefined"`.
- **Evidence:**
  - `src/lib/utils/debug.ts:31`.
  - `@sentry/core@11.9.0` `build/esm/utils/eventbuilder.js:82`: `ex.message = \`${exception}\`` for non-Error values (installed at `node_modules/.pnpm/@sentry+core@11.9.0/`).
  - Rust `Err(String)` values from `invoke` are strings, so they take this path. Example: `error('LIFECYCLE', 'Failed to open vault database:', err)` at `app-lifecycle.service.ts:236` produces a message equal to the Rust string.
- **Suggested fix:** Build the event from the tag and the joined arguments. For example, `captureException(new Error(\`${tag}: ${joined}\`))` plus the `source` tag. Keep the originating Error as `cause` where one exists.

### F9: Privacy: string arguments reach Sentry verbatim
- **Severity:** medium
- **Claim:** `beforeSend` removes breadcrumbs, extra, request and user, but not the exception message or stack. Any path or note text placed in an error message is sent.
- **Evidence:**
  - `src/lib/core/settings/sentry.service.ts:28-36` (`removeSensitiveEventData`).
  - F8 above shows string arguments become the message.
  - `src-tauri/src/error_monitoring.rs:53-54`: `send_default_pii(false)` and `max_breadcrumbs(0)` are set, which is good. Rust panic messages are not filtered by `beforeSend`-equivalent logic (UNVERIFIED which panic messages carry paths).
- **Suggested fix:** Scrub absolute paths from the message in `removeSensitiveEventData` (for example, replace the vault path prefix), and make F8's fix avoid passing raw strings through.

### F10: Events in flight at quit may be lost (no flush on exit)
- **Severity:** low
- **Claim:** The only `Sentry.flush` call is in `sendSentryTestEvent`. The exit path does not flush Sentry.
- **Evidence:**
  - `src/lib/core/settings/sentry.service.ts:133` (the only flush in src).
  - `src-tauri/src/commands/app_exit.rs` and `src/lib/app/tauri-listeners.service.ts:71-74` handle the exit flush for saves, not Sentry.
  - Impact (how many events are lost, and whether the Tauri exit kills the WebView before the transport sends) is UNVERIFIED.
- **Suggested fix:** Add `Sentry.flush(2000)` to the exit flush sequence, and call Rust `sentry::Hub` close with a short timeout on `RunEvent::ExitRequested`.

### F11: Positive: capture path is synchronous, tagged and deduped
- **Severity:** info
- **Claim:** `error()` captures before logging, sets a `source` tag, and keeps `Dedupe` and `LinkedErrors`. This is sound for the paths it covers.
- **Evidence:** `debug.ts:31`; `sentry.service.ts:114-116` (`withScope`, `setTag('source', tag)`); `sentry.service.ts:63-70` (integration allowlist).
- **Suggested fix:** None.

## Open questions

1. Does an uncaught error in a Svelte 5 component tree unmount the app, and does it reach `window.onerror` in the Tauri WebView? Needs a dev-build test (F6).
2. Is pre-vault and between-vault capture (F7) intended? If the owner wants crash reports before a vault opens, the gate needs redesign.
3. Which Rust commands should report `Err` values (F2)? Vault open, save and index build are the likely candidates.
4. What do Rust panic messages contain in practice? If they include vault paths, F9 extends to the Rust side.
5. Exact counts: the `catch` clause total (about 251 grep lines) and the `error(` total (162) are grep-based and approximate. The per-file breakdown was not fully counted.
