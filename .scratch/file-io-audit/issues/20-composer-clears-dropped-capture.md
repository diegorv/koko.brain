# 20 Composer shows Saved and clears its text when the main window drops the capture

Status: needs-triage
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: feature-writers-7

**How a user hits it.** The app opens no vault at launch (the welcome page needs a click), while the composer global shortcut is registered at app setup. So capturing right after launch, before picking a vault, drops the text. A capture write error does the same. The only feedback is a toast in the main window.

**Recoverable from.** none. The composer text was the only copy, and it is cleared on the next show.

**Root cause.** src/routes/composer/+page.svelte:40-58 (dismiss after success or catch; resetForShow clears text) and src-tauri/src/quick_capture/commands.rs:363 (emit without ack)

**Evidence.** handleSave dismisses after both resolve and reject (:36-49). resetForShow sets text='' (:52-58). submit_composer_capture returns app.emit's Result. Upstream tauri AppManager::emit returns Ok(()) with no listeners (fetched raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri/src/manager/mod.rs). handleDetectedCapture toasts and returns with no vault (quick-capture.service.ts:85-91). executeAction catches write errors and toasts in the main window (deep-link.service.ts:203-206). The test covers the IPC-reject path. The no-vault and write-error paths are proven by trace, because the composer gets no ack.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/composer-clears-unsaved-capture.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
1 failed: AssertionError: expected '' to be 'An idea I will not remember tomorrow'
```

**Fix sketch.** Ack the capture back to the composer: main emits success or failure, or Rust awaits the result. Keep or restore the text on failure, and refuse to dismiss when no vault is open.
