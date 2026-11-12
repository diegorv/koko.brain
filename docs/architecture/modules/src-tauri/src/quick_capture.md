---
summary: "Rust side of quick capture: clipboard read, kind detection, shortcut intents, source app lookup and the composer commands."
---

## Responsibility

Owns the OS clipboard adapter (clipboard.rs), the pure mapping from a clipboard snapshot to capture inputs (kind_detect.rs), the global-shortcut intent registry (shortcuts.rs), the frontmost-app and browser-tab context lookup (source.rs), and the Tauri commands that turn a clipboard read or composer text into qc:capture-detected events, show and hide the composer, relay the composer result and import staged images (commands.rs). It does not write notes or open the database: the frontend listener turns each payload into a note action for the active vault. The OS hotkey binding, the composer window construction and the invoke-handler registration live in src-tauri/src/lib.rs.

## Key files

- `src-tauri/src/quick_capture/commands.rs`: Tauri commands, capture_clipboard_now_with (shared by the command and the shortcut), dedup signature, staged shot handling, show_composer, submit and result relay.
- `src-tauri/src/quick_capture/kind_detect.rs`: Pure decide(): ClipboardSnapshot to CaptureInput values.
- `src-tauri/src/quick_capture/clipboard.rs`: Clipboard trait, the arboard-backed SystemClipboard (files, then image, then text) and FakeClipboard for tests.
- `src-tauri/src/quick_capture/source.rs`: PrevFrontmostPid, frontmost bundle id lookup, previous-app reactivation and Chrome and Safari tab URL and title through osascript.
- `src-tauri/src/quick_capture/shortcuts.rs`: ShortcutId enum and default_registry() accelerator table.
- `src-tauri/src/lib.rs`: Registers the shortcuts, builds the composer window, dispatches shortcuts and registers these commands.
- `src/lib/plugins/quick-capture/quick-capture.service.ts`: Frontend consumer of qc:capture-detected that answers composer captures with report_composer_capture_result.
- `src/routes/composer/+page.svelte`: Composer popover UI that submits text, dismisses the popover and listens for the open and result events.

## State

- LastCaptureSignature: Tauri-managed Mutex<Option<String>> holding the last captured dedup signature; in memory only (commands.rs).
- PrevFrontmostPid: Tauri-managed AtomicI32 holding the PID of the app that was frontmost when the composer was summoned, -1 when none (source.rs).
- Staged clipboard images written to the OS temp directory as qc-shot-<timestamp>.<ext> until import_staged_shot copies them into the vault (commands.rs).
- No database and no persistent settings.

## Collaborators

- `src-tauri/src`: lib.rs parses default_registry() accelerators, registers them after build_composer_window, dispatches them, registers the commands and manages PrevFrontmostPid and LastCaptureSignature.
- `src-tauri/src/utils`: import_staged_shot uses utils::fs::validate_vault_path to confine destinations to the vault, and utils::logger::debug_log logs a failed temp-file removal.
- `src/lib/plugins/quick-capture`: Frontend counterpart that turns qc:capture-detected payloads into note actions and reports composer results.
- `src/routes/composer`: Composer popover route that invokes submit_composer_capture and dismiss_composer and listens for qc:open-composer and qc:composer-capture-result.
- `src/lib/app`: deep-link-actions.ts invokes import_staged_shot to move a staged shot into the vault before writing the note.
- `src/lib/features/deep-link`: Capture payload field names follow the CaptureAction shape in deep-link.types.ts (commands.rs capture_input_to_payload).
- `src/lib/contracts`: events.ts and commands.ts mirror the names and argument shapes; ComposerCaptureResult is exported by ts-rs into the generated folder.
- `IPC:capture_clipboard_now`: Reads the clipboard and emits qc:capture-detected for each detected input.
- `IPC:open_composer`: Shows the composer window through show_composer.
- `IPC:dismiss_composer`: Hides the composer and reactivates the previously frontmost app.
- `IPC:submit_composer_capture`: Receives composer text and emits qc:capture-detected with the source context of the recorded app.
- `IPC:report_composer_capture_result`: Relays the main window's write outcome to the composer as qc:composer-capture-result.
- `IPC:import_staged_shot`: Copies a staged temp shot into a vault folder without overwriting.
- `event:qc:capture-detected`: Emitted for each detected input by the clipboard shortcut, capture_clipboard_now and submit_composer_capture.
- `event:qc:open-composer`: Emitted by show_composer so the composer route resets its focus state.
- `event:qc:composer-capture-result`: Emitted by report_composer_capture_result with a ComposerCaptureResult.

## Gotchas

- The clipboard shortcut and the capture_clipboard_now command both use capture_clipboard_now_with, but the shortcut handler in lib.rs runs its own emit loop. Changes to emit behavior must be made in both places.
- Shortcut dispatch returns early when db::is_open() is false, so neither hotkey does anything without an open vault (lib.rs).
- Accelerators are registered in the setup hook after the composer window exists, not through the plugin builder, to avoid an early hotkey finding no window (lib.rs).
- Clipboard image bytes are written to the OS temp directory and the payload is marked staged. The temp file is the only copy until the frontend calls import_staged_shot.
- import_staged_shot refuses a source that is not a qc-shot-* file directly inside the temp dir and a destination that does not resolve to a directory inside the vault. It never overwrites (a taken name gets a numeric suffix) and removes the temp file only after a successful copy.
- Dedup is in-memory and compares only the last capture. Image bytes have no signature, so they never dedup and they clear the anchor. Text, notes, links, files and path-based shots are compared by content, URL or path.
- SystemClipboard reads files first, then image, then text, so a Finder copy yields file paths and not the thumbnail.
- Source context is populated on macOS only. Browser tab URL and title for Chrome and Safari come from osascript, which can trigger the Apple Events permission prompt (source.rs).
- submit_composer_capture reads the recorded PID with peek and dismiss_composer consumes it with take, so only dismiss restores focus to the previous app.
- After the composer is shown, focus is retried at 150 ms and 280 ms to work around a Space-move race (commands.rs schedule_refocus_after_space_move).
- ComposerCaptureResult has #[ts(export)], so changing its shape or doc comments requires cargo test to regenerate src/lib/contracts/generated. The qc:capture-detected payload is built with json! and has no generated type.
- FakeClipboard is at module scope, not cfg(test), so integration tests in src-tauri/tests can reach it.
