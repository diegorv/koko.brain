# Issue 12 discovery: composer reports saved only after the note is written

No `spec.md` in `.scratch/audit-2026-11-04/`; the Issue and `findings.md` are the source.

## Files that change

- `src-tauri/src/quick_capture/commands.rs:434-474`: `build_composer_note_payload` takes a `request_id` and adds `composerRequestId` to the payload; `submit_composer_capture` takes `request_id: String` (JS `requestId`). New command `report_composer_capture_result(request_id, ok)` that emits `QC_COMPOSER_CAPTURE_RESULT_EVENT` with a new `ComposerCaptureResult { request_id, ok }` (`#[ts(export)]`, camelCase). Pure `composer_capture_result(..)` not needed: the struct serialization is the tested shape.
- `src-tauri/src/events.rs`: `QC_COMPOSER_CAPTURE_RESULT_EVENT = "qc:composer-capture-result"`. `src-tauri/src/lib.rs:385`: register the command. `capabilities/composer.json`: description only (core:default already allows listen; app commands need no permission).
- `src/lib/contracts/`: `events.ts` (name + `EventMap` entry typed `ComposerCaptureResult`), `commands.ts` (`submit_composer_capture` args, new command, `COMMAND_ARGS`), `index.ts` barrel, `generated/ComposerCaptureResult.ts` (cargo test writes it).
- `src/lib/features/deep-link/deep-link.service.ts:180-211`: `executeAction` returns `Promise<boolean>` (true on success, false after the existing log + toast). Existing callers ignore the value; toast behavior unchanged.
- `src/lib/plugins/quick-capture/quick-capture.service.ts:83-103`: payload gets `composerRequestId?`; `handleDetectedCapture` computes `ok` (no vault / invalid payload = false, else `executeAction`'s value) and, only when `composerRequestId` is set, calls `report_composer_capture_result`. Queue serialization untouched.
- `src/routes/composer/+page.svelte`: listen to the result event on mount; `handleSave` generates `crypto.randomUUID()`, registers a pending waiter (3000 ms timeout) BEFORE `submit_composer_capture`, then: Rust reject -> 'failed'; reported failure -> 'failed'; timeout -> 'unknown'; success -> flash, clear draft, dismiss. Only success dismisses. Draft: `localStorage['kokobrain:composer-draft']`, read at init and in `resetForShow`, written by an `$effect` on `text`, removed on reported success; every access in try/catch.

## Tests (prior art)

- `src/tests/routes/composer-page.test.ts` "composer save" block: extend `mockSubmit` with outcomes `ok` (Rust ok + reported success via the captured `on` handler for the result event), `fail` (Rust rejects), `write-fail` (reported failure), `silent` (no reply; fake timers for the timeout). Add `localStorage.clear()` before mount. The "clears the error on the next summon" test changes: the text is now restored.
- `src/tests/lib/plugins/quick-capture/quick-capture.service.test.ts`: mock `@tauri-apps/api/core` `invoke`; assert the reported `{ requestId, ok }` args for success, write failure (`executeAction` -> false), and no report for a payload without `composerRequestId`.
- `src/tests/lib/features/deep-link/deep-link.service.test.ts` "registered actions": assert the returned boolean.
- Rust: extend `composer_note_payload_*` tests for `composerRequestId`; new test for `ComposerCaptureResult` JSON shape.

## Defaults taken

- No vault / invalid payload on a composer payload reports `ok: false` (generic "report the outcome"), so the composer shows the error at once instead of waiting for the timeout. The owner note only says no dedicated handling is needed; either way the text is kept.
- The ack carries no error string: the composer shows one generic "Could not save" message for a Rust reject and a reported failure; timeout says "Save not confirmed".
- `resetForShow` does not cancel an in-flight wait (pre-existing race, rare).
- `ESC cancels` hint kept: Esc still closes without saving; the draft restore is the safety net.

## Risks

- Tauri JS `listen` default target receives `app.emit` broadcasts (same as `qc:open-composer` today), so Rust emits the result with `app.emit`, not `emit_to`.
