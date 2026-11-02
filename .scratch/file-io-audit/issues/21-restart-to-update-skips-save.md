# 21 Restart to update relaunches without saving dirty tabs or flushing settings

Status: needs-triage
Priority: P2
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o01-quit-and-switch (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: save-pipeline-2

**How a user hits it.** Narrow. The user must open Settings > Update, click Check, wait for the download, then click Restart. The 2 s body autosave and 500 ms settings debounce normally fire long before that. Loss needs a save that keeps failing (5 s retry loop with repeated toasts) or an unusually fast path. Then the buffer is dropped with no prompt.

**Recoverable from.** none for the unsaved text. File History holds the last successful save only.

**Root cause.** src/lib/core/settings/sections/UpdateSection.svelte:208-210 restartApp() only awaits relaunch()

**Evidence.** UpdateSection.svelte:208-210 and button :292-295. Fetched plugins-workspace process-v2.4.0 commands.rs:13-15 restart -> app.request_restart(). Fetched tauri-v2.12.5 app.rs:633-641 request_restart -> request_exit(RESTART_EXIT_CODE). Fetched tauri-runtime-wry-v2.12.3 lib.rs:4300-4312 RequestExit -> RunEvent::ExitRequested -> ControlFlow::ExitWithCode, with no CloseRequested, so registerCloseHandler never runs. The app has no RunEvent callback.

**Limits found while trying to refute.** Downgraded from data-loss P0/P1 to P2. In normal use the autosave fires during the update download, so loss needs an ongoing save failure or an unusually fast click.

**Repro test.** `.scratch/file-io-audit/repro/o01-quit-and-switch/restart-to-update-unsaved.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL > saves the dirty tab before relaunching: AssertionError: expected 'old' to be 'typed just before clicking Restart' (restart-to-update-unsaved.test.ts:103 expect(savedAtRelaunch).toBe(EDIT)). relaunch was called once, with the real editorStore tab still unsaved.
```

**Fix sketch.** In restartApp: const failed = await saveAllDirtyTabs(); if failed, ask like the close handler and return on cancel; then await drainEventCalendarWrites(); await flushSettingsPersistence(); await relaunch(). Ideally share one prepareForExit() with registerCloseHandler.
