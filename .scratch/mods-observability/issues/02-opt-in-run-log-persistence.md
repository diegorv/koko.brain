# 02: Preserve run.log messages locally with explicit consent

**What to build:** A user can explicitly enable local persistence of mod-authored run messages to investigate partial failures after the run view is closed, replaced or cleared. Each saved entry identifies its run using Issue 01's identity convention. The existing run view and run.log(text) API remain compatible.

**Blocked by:** 01: Trace host-managed mod execution in the local session log.

**Status:** ready-for-agent

## Content policy

Full run-message persistence is off by default and requires a separate explicit opt-in in Troubleshooting, in addition to frontend file logging. The existing debug-file switch alone is not consent to persist previously UI-only run text. Explain that messages may contain note text, paths, prompts, API responses or secrets, and that users should inspect log files before sharing them. This is intentionally opt-in raw text, not supposedly safe automatic redaction.

Turning the option off stops future persistence; it does not erase messages already written. Existing ctx.log and caught-error diagnostics are outside this new option's scope, so do not describe the entire log file as content-free when the option is off.

## Acceptance criteria

- [ ] Write a failing integration test through the real run facade, real stores and existing buffered writer, mocking only external boundaries. Verify actual serialized file output as well as the unchanged run-view state.
- [ ] Add a persisted boolean setting and a clearly labeled Troubleshooting control with the sensitivity warning. Missing or invalid stored values do not opt the user in. Cover default, enabled round-trip and turning the option off.
- [ ] Persist accepted run.log entries only when both this opt-in and frontend file logging are enabled and a log session is active. Never copy earlier in-memory entries retroactively when the option is enabled.
- [ ] Each persisted entry carries Issue 01's session/run identity, mod/action identity, timestamp and per-run ordering information. Interleaved runs never borrow each other's identity. Do not infer run identity for shared ctx.log calls.
- [ ] Preserve empty strings and multiline message content as encoded data within a correlated record, not unprefixed physical log lines that can impersonate lifecycle events. Keep the public single-string log signature unchanged; do not invent severity classification from message text.
- [ ] The UI still retains its existing last-500-entry behavior, including replacement/reset and ignored output after termination. Closing the view does not stop a live run's persistence. Completed-run replacement or store reset does not remove already-written messages from the session file.
- [ ] Calls after completion or cancellation do not produce persisted entries, matching the run store's accepted-output behavior. Enabling persistence does not reopen a previously closed run view or change when the lazy view appears.
- [ ] With the option off, unique sensitive markers passed only to run.log remain absent from persisted output while lifecycle diagnostics still work. With it on, assert that those markers appear only in the intended correlated message records. Cover concurrent runs, empty/multiline text and late calls.
- [ ] Use the existing local buffered writer and failure behavior. Logging must not change the action's result, propagate a file-write failure into the action, or send run text to Sentry. Do not add a separate historical-run database, recovery mechanism or log-file retention system.
- [ ] Update Settings and mod documentation with the two required switches, sensitivity warning, existing log-file location/retention behavior and best-effort buffering. Explicitly state that persistence is not crash-proof and turning it off does not delete existing content.
- [ ] Add UI coverage for the opt-in and a mod run whose displayed message also reaches the enabled diagnostic sink; verify the disabled case does not persist it.

## Scope and constraints

The host owns run-message persistence; stores remain reactive state. Changes outside mods are limited to the existing Settings model, persistence and UI, plus tests and documentation. No changes to individual external mods, automatic text sanitization, new logging levels, Rust or IPC are required.

This recovers messages a mod actually emits. It cannot recover an unlogged reason, prove that file changes were correct, or explain custom UI decisions that never reach the host.

## Verification

Frontend gate: `pnpm check` and `pnpm vitest run`, plus affected Settings and mods E2E coverage through the repository's E2E wrapper. Test the real serialization/flush boundary rather than only asserting that a debug helper was called.
