VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `remote_events_test.rs::frontend_event_names` now takes every single-tab line of the `EventMap` body, drops JSDoc lines (`/**`, `*`, `*/`, `//`) and panics through `parse_event_key` on any member line it cannot read. Against the current `events.ts` (multi-line JSDoc on `app:exit-requested` and `qc:capture-detected`) all 8 keys parse. `the_event_map_parser_reads_every_key_form` covers single-, double-, unquoted and `?` keys plus a non-member. |
| 2 | minor | resolved | `editor.service.ts:409` adds `isTabDirty(tab)` to the post-read re-check. The new test "keeps keystrokes typed while the read was in flight" holds the `readTextFile` promise open, types, then resolves: without the guard `diskContent !== savedContent` and `syncExternalContentToEditor` would overwrite the buffer, so the test fails on the old code. |
| 3 | minor | resolved | `browser-mac-changes.test.ts` dirty-buffer test opens a clean Bravo tab, emits `{ paths: [ALPHA, BRAVO] }`, and asserts Bravo's content is the Mac text while Alpha keeps the browser text. The test can no longer pass with no event forwarded. |
| 4 | minor | resolved | `remote-session.ts:98` shows `toast.error(...)` in the reconnect-refresh catch; `remote-session.test.ts` "logs and toasts a failed refresh and stays connected" asserts the exact message. |
| 5 | minor | resolved | `a_session_that_never_reads_is_closed_and_unsubscribed` publishes 16 KiB payloads until `subscriber_count() == 0` (cap 20 000, well past `EVENT_QUEUE = 1024` plus any socket buffer), then asserts a client write fails within 5 s. |
| 6 | nit | resolved | `EventHub::publish` collects the sinks first and returns before `serde_json::from_str` when the list is empty. Same observable behavior; existing hub tests pass. |

## Acceptance criteria re-checked

- [met] The host forwards Rust events to connected browsers over the WebSocket through an explicit allowlist: `vault-index-updated`, `vault-files-changed`, `semantic-index-progress`. A parity test fails when an event name in the frontend event map is not classified as forwarded or never-forwarded — the allowlist is unchanged; the parity parser can no longer skip a key form silently (finding 1), and `remote_events_test` passes 9/9.
- [met] On reconnect the browser does a full refresh: drop the vault entries cache, reload the tree, and reload the open notes whose tabs are clean. Dirty tabs are never replaced — `reloadExternallyChangedTabs` now also skips a tab dirtied during the read (finding 2); a failed refresh now toasts (finding 4). `remote-session.test.ts` 16/16 and `editor.service.test.ts` 86/86 pass.
- [met] Test with a fake host: a forwarded `vault-files-changed` for an open clean note updates its rendered content; for a dirty tab the buffer is kept — the dirty-tab test now has a positive control on clean Bravo (finding 3); `browser-mac-changes.test.ts` 5/5 passes.

## Findings

None open, none new. No regressions found: no test was weakened or deleted (the only renamed test gained an assertion), and the fix diff touches only the files the six findings name, plus `review.md`'s Resolution.

## Checks run by this review

- `pnpm check`: 0 errors, 0 warnings (exit 0).
- vitest, each file on its own, all exit 0: `browser-mac-changes.test.ts` 5, `remote-session.test.ts` 16, `editor.service.test.ts` 86.
- `cargo test --test remote_events_test --test remote_ws_test` (throttled): 9 and 28 passed, exit 0.
- Not run: the full vitest suite and `pnpm build` (deliver's), the full `cargo test`, clippy. The stalled-session test's timing on CI's socket buffers is not verified here; its 20 000-event cap is large enough to overflow any default buffer.
