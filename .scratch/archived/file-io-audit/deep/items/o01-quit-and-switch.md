# Deep-dive group o01-quit-and-switch

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## save-pipeline-1: Cmd+Q / Dock Quit / logout bypasses the save-on-close handler; pending and failed-save edits are lost without a prompt
- claimed severity: data-loss
- anchor: src-tauri/src/lib.rs:195
- scenario: Type in a note and press Cmd+Q within 2 s, or quit while that note's save keeps failing. The JS onCloseRequested handler never runs, so the edit never reaches disk, there is no 'Close anyway?' prompt, and the last settings change (500 ms debounce) and history snapshot are lost too.
- evidence given: READ: lib.rs:195 predefined .quit(); lib.rs:353 .run(generate_context!()) with no RunEvent callback; the only save-on-quit is tauri-listeners.service.ts:50-71 (onCloseRequested), registered at +layout.svelte:45; the autosave is a 2 s trailing debounce at editor.service.ts:197. FETCHED: muda maps Quit to sel!(terminate:); tao app_delegate.rs implements applicationWillTerminate -> AppState::exit, and app_state.rs exit() emits only Event::LoopDestroyed, never CloseRequested. Not run.

## cross-cutting-1: Cmd+Q / app-menu Quit skips the save-on-close handler; pending and failed-save edits are lost with no prompt
- claimed severity: data-loss
- anchor: src/lib/app/tauri-listeners.service.ts:51
- scenario: Type in a note and press Cmd+Q within 2 s, or quit while a save keeps failing. The window CloseRequested handler never runs, so there is no saveAllDirtyTabs, no 'Close anyway?' prompt and no settings flush. The text is lost.
- evidence given: READ: predefined quit item at src-tauri/src/lib.rs:195. No RunEvent callback at lib.rs:353. The only save-on-quit is onCloseRequested at tauri-listeners.service.ts:51-75. FETCHED: tao app_delegate.rs has no applicationShouldTerminate:. tao app_state.rs AppState::exit sends only LoopDestroyed, never CloseRequested, and cannot cancel. Also reported as SP-1 in review-save-pipeline.md.

## vault-lifecycle-1: Cmd+Q, Dock Quit and Restart-to-update skip the onCloseRequested save handler, so unsaved edits and pending settings are lost with no prompt
- claimed severity: data-loss
- anchor: src/lib/app/tauri-listeners.service.ts:50
- scenario: The user types in a note and presses Cmd+Q within 2 s, before the debounced autosave fires. The process terminates and the edits are gone. A tab whose save keeps failing is also discarded with no 'Close anyway?' prompt, and the 500 ms settings debounce is dropped. 'Restart to update' does the same thing through relaunch().
- evidence given: READ: the only flush is onCloseRequested (tauri-listeners.service.ts:50-82). The app menu uses predefined .quit() (src-tauri/src/lib.rs:195). There is no RunEvent handler (lib.rs:353) and no other flush (focus listener :306-325). Autosave waits 2000 ms (editor.service.ts:197). Restart is UpdateSection.svelte:208-210. FETCHED: muda maps Quit to sel!(terminate:) with no target. tao v0.37.2 app_delegate.rs has no applicationShouldTerminate:, and applicationWillTerminate: only calls AppState::exit(). tauri v2.12.5 AppHandle::restart on the main thread skips the events and restarts directly. Not run.

## save-pipeline-2: 'Restart to update' relaunches without saving dirty tabs or flushing settings
- claimed severity: data-loss
- anchor: src/lib/core/settings/sections/UpdateSection.svelte:208
- scenario: A note has an unsaved edit (save failing, or under 2 s old). In Settings > Update the user clicks Restart. The app relaunches and the buffer and any settings change from the last 500 ms are lost with no prompt.
- evidence given: READ: UpdateSection.svelte:208-210 restartApp() just awaits relaunch(), with no saveAllDirtyTabs or flushSettingsPersistence. FETCHED tauri crates/tauri/src/app.rs: restart either calls process::restart directly (main thread) or goes through request_exit(RESTART_EXIT_CODE) -> RunEvent::ExitRequested/Exit; no CloseRequested is emitted, so tauri-listeners.service.ts:50-71 never runs.

## save-pipeline-6: Vault switch after a failed save: teardown's resetEditor discards the dirty buffer after one toast
- claimed severity: data-loss
- anchor: src/lib/core/vault/vault.service.ts:19
- scenario: A note cannot be written (read-only, disk full, folder gone). The user switches vault. A 'Failed to save' toast appears, the safety-net retry fails as well, and teardown wipes every tab, so the unsaved text is destroyed. Window close asks first in the same situation; the vault switch does not.
- evidence given: READ: vault.service.ts:19 ignores the failed list; app-lifecycle.service.ts:180 ignores it again; app-lifecycle.service.ts:622 resetEditor -> editor.store.svelte.ts:165-167 tabs=[].

## cross-cutting-9: Vault switch after a failed save discards the dirty buffer at teardown with no prompt
- claimed severity: data-loss
- anchor: src/lib/core/vault/vault.service.ts:18
- scenario: A save fails in vault A (disk full, ACL). The user switches to vault B. The save is retried once, then resetEditor drops the buffer, with no 'discard?' prompt like the close handler has.
- evidence given: READ: switchVault ignores the failed paths (vault.service.ts:18-21). The retry is at app-lifecycle.service.ts:180, teardownVault calls resetEditor at :622, and editorStore.reset at editor.service.ts:412-417.

## vault-lifecycle-6: Failed saves are discarded on a vault switch, and a failed write may already have truncated the note on disk
- claimed severity: data-loss
- anchor: src/lib/core/vault/vault.service.ts:19
- scenario: The disk is full: an autosave fails with a toast, and the user follows a deep link to another vault. switchVault ignores the failed list, and teardown drops the tab. The note on disk is not the old version: the truncate-in-place write left it empty or partial. The last good content survives only as the file-history snapshot of the previous save.
- evidence given: READ: vault.service.ts:19 ignores the result. The safety net app-lifecycle.service.ts:180 also ignores it. resetEditor :622 calls editor.service.ts:412-417. The quit path prompts instead (tauri-listeners.service.ts:55-62). Snapshot per successful save: file-history.service.ts:110-124. INFER: truncation from the fetched truncate:true.
