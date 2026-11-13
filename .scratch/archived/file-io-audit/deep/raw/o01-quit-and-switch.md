# o01-quit-and-switch: deep-dive raw report

Worktree read: `.claude/worktrees/file-io-repro` (identical to main). No cargo, no build, no app code edited.

Upstream source fetched with curl from raw.githubusercontent.com at the versions pinned in `src-tauri/Cargo.lock`
(tao 0.37.2, muda 0.20.0, tauri 2.12.5, tauri-runtime-wry 2.12.3, tauri-plugin-process 2.4.0, tauri-plugin-fs 2.7.1):

- `tauri-apps/tao@tao-v0.37.2/src/platform_impl/macos/app_delegate.rs`, `app_state.rs`, `app.rs`
- `tauri-apps/muda@muda-v0.20.0/src/platform_impl/macos/mod.rs`, `src/items/predefined.rs`
- `tauri-apps/tauri@tauri-v2.12.5/crates/tauri/src/app.rs`
- `tauri-apps/tauri@tauri-runtime-wry-v2.12.3/crates/tauri-runtime-wry/src/lib.rs`
- `tauri-apps/plugins-workspace@process-v2.4.0/plugins/process/src/commands.rs`
- `tauri-apps/plugins-workspace@fs-v2.7.1/plugins/fs/src/commands.rs`

Three distinct bugs. Every id is assigned to exactly one.

---

## Bug A: Cmd+Q / app-menu Quit / Dock Quit / logout never run the save-on-close handler

ids: save-pipeline-1, cross-cutting-1, vault-lifecycle-1

Verdict: CONFIRMED_BY_TRACE (native side; no TS test can exercise NSApp terminate). Severity data-loss, P0.

Trace:

1. `src-tauri/src/lib.rs:195` app menu uses predefined `.quit()`.
2. muda `predefined.rs:669`: macOS Quit accelerator is `CMD_OR_CTRL + KeyQ`; muda `macos/mod.rs:944`: `PredefinedMenuItemType::Quit => Some(sel!(terminate:))`, sent to NSApp (first responder chain), no muda/Tauri callback.
3. tao `app_delegate.rs:46-88`: the delegate class registers `applicationDidFinishLaunching:`, `applicationWillTerminate:`, openURLs, continueUserActivity, shouldHandleReopen, supportsSecureRestorableState. There is NO `applicationShouldTerminate:`, so `terminate:` cannot be deferred or cancelled.
4. tao `app_delegate.rs:130-134` `application_will_terminate` -> `AppState::exit()`; `app_state.rs:271-281` emits only `Event::LoopDestroyed`, then drops the callback. No `WindowEvent::CloseRequested` for any window.
5. tauri-runtime-wry `lib.rs:4131-4133`: `LoopDestroyed => callback(RunEvent::Exit)`. `on_close_requested` (which is what reaches the JS `onCloseRequested`) is only called from `TaoWindowEvent::CloseRequested` (`lib.rs:~4253`) and `WindowMessage::Close` (`:4313`). Neither fires on terminate. No `applicationShouldTerminate`/`terminate` handling anywhere in tauri app.rs or runtime-wry (grepped).
6. App side: `lib.rs:353` `.run(tauri::generate_context!())` with no `RunEvent` closure; `lib.rs:94-99` `on_window_event` is only on the composer window (close-as-hide). No `beforeunload`/`pagehide` listener in `src/`.
7. The only flush is `src/lib/app/tauri-listeners.service.ts:51-82` (`registerCloseHandler` -> `saveAllDirtyTabs`, discard `ask`, `drainEventCalendarWrites`, `flushSettingsPersistence`), registered at `src/routes/(app)/+layout.svelte:45`. It runs only on window CloseRequested.
8. Autosave: `src/lib/core/editor/editor.service.ts:197` `debounce(saveDirtyTabs, 2000)`; `src/lib/utils/debounce.ts` is a pure trailing debounce with no maxWait, so the window is "everything since the last >=2 s typing pause" (continuous typing never saves). `onContentChange` is called on every doc change (`MarkdownEditor.svelte:124`, `editor-extensions.ts:188`).

Guards looked for and not found: no Cmd+Q keybinding in JS (grep `mod+q`/`cmd+q`), no draft/journal of unsaved buffers (localStorage only used by vault/quick-switcher/command-palette stores), no periodic save, no save on blur. File History snapshots only on successful save (`notifyAfterSave`), so it holds the old bytes, not the lost edit.

Also lost on quit (same root cause, lower impact): settings change < 500 ms old (app-owned JSON, P2-level on its own); queued event-calendar writes not drained (a write in flight on a tokio thread when `exit()` runs could be cut mid-write; ms timing, P3); failed-save tabs get no "Close anyway?" prompt.

Reachability: default settings, extremely common action (finish typing, press Cmd+Q). Logout/shutdown and Dock Quit take the same `terminate:` path. Recoverable: none (process is gone, no draft, no history snapshot of the unsaved text).

Fix sketch: in Rust, handle quit explicitly: replace predefined `.quit()` with a custom "Quit" MenuItem (Cmd+Q) whose `on_menu_event` emits an event / calls `window.close()` on the main window so the JS close handler runs (then `app.exit(0)` after `destroy()`); additionally handle `RunEvent::ExitRequested` via `.build(..).run(|app, e| ..)`. Dock Quit / logout still send `terminate:` directly, so full coverage needs an `applicationShouldTerminate:` hook (tao lacks it; would need a patch or an objc swizzle returning `NSTerminateLater`, then `replyToApplicationShouldTerminate:` after the JS flush).

---

## Bug B: "Restart to update" relaunches without saving dirty tabs or flushing settings

ids: save-pipeline-2

Verdict: CONFIRMED_BY_TEST. Severity data-loss, P2 (narrow trigger).

Trace:

1. `src/lib/core/settings/sections/UpdateSection.svelte:208-210` `restartApp()` is only `await relaunch()`; button at `:292-295`.
2. `@tauri-apps/plugin-process` `relaunch` -> plugin command `restart` -> `app.request_restart()` (fetched `process-v2.4.0/plugins/process/src/commands.rs:13-15`).
3. tauri `app.rs:633-641` `request_restart` -> `runtime_handle.request_exit(RESTART_EXIT_CODE)`; runtime-wry `lib.rs:4300-4312` `Message::RequestExit` -> `RunEvent::ExitRequested` -> `ControlFlow::ExitWithCode`. No `CloseRequested`, so the JS close handler never runs. The app registers no `RunEvent` callback either.

Test: `src/tests/repro/o01-quit-and-switch/restart-to-update-unsaved.test.ts` mounts the real `UpdateSection`, clicks Check (mocked updater invoke) then "Restart to update", and records the real `editorStore` tab's `savedContent` when `relaunch` (mocked `@tauri-apps/plugin-process`) is called.

```
FAIL  ... > saves the dirty tab before relaunching
AssertionError: expected 'old' to be 'typed just before clicking Restart' // Object.is equality
 ❯ restart-to-update-unsaved.test.ts:103:27
    expect(savedAtRelaunch).toBe(EDIT);
```

Why only P2: the Settings panel sits over the editor and the user must click Check, wait for the download, then Restart; the 2 s body autosave (and 500 ms settings debounce) normally fires long before. Loss needs a save that keeps failing (the 5 s retry loop at `editor.service.ts:183-193`, with repeated "Failed to save file." toasts) or an unusually fast path. Then the buffer is gone with no prompt. Recoverable: none for the unsaved text.

Fix sketch: in `restartApp`, `const failed = await saveAllDirtyTabs()`; if failed, `ask` like the close handler; then `await drainEventCalendarWrites(); await flushSettingsPersistence(); await relaunch()`. Better: share one `prepareForExit()` with `registerCloseHandler`.

---

## Bug C: vault switch after a failed save discards the dirty buffer with no prompt

ids: save-pipeline-6, cross-cutting-9, vault-lifecycle-6

Verdict: CONFIRMED_BY_TEST. Severity data-loss, P1.

Trace:

1. `src/lib/core/vault/vault.service.ts:18-22` `switchVault`: `await saveAllDirtyTabs()` result (failed paths) discarded, then `vaultStore.open(path)`. Callers: `openVaultDialog`, `openRecentVault` (same file), deep link `src/lib/features/deep-link/deep-link.service.ts:166`.
2. `src/routes/(app)/+layout.svelte:64-78` effect on `vaultStore.path` -> `initializeVault(path)`.
3. `src/lib/app/lifecycle/app-lifecycle.service.ts:180` safety-net `await saveAllDirtyTabs()`, result ignored again, then `:188` `teardownVault()`.
4. `teardownVault` (`:533`...) calls `resetEditor()` unconditionally; `editor.service.ts:412-417` -> `editorStore.reset()` (`editor.store.svelte.ts:165-172`) sets `tabs = []`.
5. Contrast: window close prompts (`tauri-listeners.service.ts:55-62`).

The existing test `src/tests/lib/core/vault/vault.service.switch-save.test.ts` ("switchVault still opens B when the save of a tab of A fails") enshrines step 1 but never checks the buffer afterwards; the comment at `app-lifecycle.service.ts:172-178` acknowledges the tab is "still dirty here only when that save failed". So the behavior is known, but nothing protects the text.

Test: `src/tests/repro/o01-quit-and-switch/vault-switch-failed-save.test.ts` (real `vaultStore`, `editorStore`, real `switchVault`, `saveAllDirtyTabs` and real `teardownVault`; only `@tauri-apps/*` and `svelte-sonner` mocked; every `writeTextFile` rejects with ENOSPC).

```
FAIL > does not leave vault A when a dirty tab failed to save and the user did not agree to discard it
AssertionError: expected '/vaults/B' to be '/vaults/A' // Object.is equality

FAIL > the unsaved text survives the full switch chain (switchVault -> initializeVault safety net -> teardownVault)
AssertionError: unsaved text must survive in a tab or on disk: expected false to be true
```

Reachability: needs a save that fails (read-only/locked file, permission/ACL, full disk, vault on an unplugged drive) and then a vault switch (dialog, recent vault, or a deep link to another vault). Default settings. Less common, realistic, and the user is shown only "Failed to save file." toasts, never a discard prompt. Recoverable: the File History snapshot of the last successful save holds the pre-failure bytes; the failed edits themselves are gone.

vault-lifecycle-6 sub-claim "a failed write may already have truncated the note on disk": partly refuted and not part of this bug. Fetched `fs-v2.7.1/plugins/fs/src/commands.rs:1125-1185`: `write_text_file` with no options opens with `truncate: true, create: true` and then writes, so the write is non-atomic. But permission / read-only / missing-folder errors fail at open, before truncation, leaving the file intact; with a full disk the truncation frees the old blocks first, so only a write larger than freed-plus-free space ends partial. And it happens on the failing autosave itself, whether or not the user switches vault. It belongs to the non-atomic-write finding (temp file + rename), not to this one.

Fix sketch: `switchVault` should take the failed list from `saveAllDirtyTabs()`, and when it is non-empty `ask` "Failed to save: X. Switch anyway and lose unsaved changes?" and return without `vaultStore.open` if the user declines (deep links included). Update the existing switch-save test accordingly.

---

## Not checked

- Did not run the app or reproduce Cmd+Q on a real build (Bug A is trace-only, from upstream source at the pinned versions).
- Did not check whether macOS automatic/sudden termination is enabled in Info.plist (it would only make Bug A worse).
