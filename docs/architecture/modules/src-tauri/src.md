---
summary: "Tauri crate root: builder setup, plugin and command registration, app menu, global shortcuts, composer window, exit flow and the canonical event names."
---

## Responsibility

Owns the crate root: the public module declarations (lib.rs), the binary entry point (main.rs), and the Tauri builder that wires the plugins, managed state, setup hook, app menu, generate_handler! command list and exit-request handling. It also owns the list of backend event names (events.rs), the lifecycle of the Rust Sentry client (error_monitoring.rs), the construction of the hidden composer window and the global-shortcut dispatch. It does not own command bodies, which live in commands and quick_capture, and it holds no domain logic, which lives in the sibling modules.

## Key files

- `src-tauri/src/lib.rs`: Tauri builder: setup hook, menu, plugins, managed state, generate_handler! list, global shortcut dispatch, composer window and exit-request handling.
- `src-tauri/src/events.rs`: Every backend event name as a *_EVENT const; emit sites use these consts.
- `src-tauri/src/error_monitoring.rs`: SentryState, is_sentry_active and configure_sentry: creates or tears down the Rust Sentry client.
- `src-tauri/src/main.rs`: Binary entry point; calls kokobrain_lib::run().
- `src-tauri/src/commands/app_exit.rs`: ExitFlushState, MAIN_WINDOW_LABEL, exit_decision and the confirm_exit command that the exit flow in lib.rs relies on.
- `src/lib/contracts/events.ts`: Frontend mirror of the event names and payload types, checked against events.rs by events-parity.test.ts.
- `src/lib/contracts/commands.ts`: Frontend CommandMap of invoke command names, argument shapes and results, checked against generate_handler! by ipc-parity.test.ts.

## State

- Tauri managed state registered in lib.rs: VaultIndexState, VaultWatcherState, SentryState, PrevFrontmostPid, LastCaptureSignature, ExitFlushState.
- The Sentry client guard held inside SentryState (error_monitoring.rs).
- The composer popover window, built hidden during setup under COMPOSER_WINDOW_LABEL (lib.rs).
- OS-level global shortcut registrations, activated in the setup hook (lib.rs).
- The log sink installed with utils::logger::set_log_sink in the setup hook (lib.rs).

## Collaborators

- `src-tauri/src/commands`: Holds the command handler modules listed in generate_handler! in lib.rs, plus ExitFlushState, MAIN_WINDOW_LABEL and exit_decision used by the exit flow.
- `src-tauri/src/quick_capture`: Supplies COMPOSER_WINDOW_LABEL, capture_clipboard_now_with, show_composer, SystemClipboard, the shortcut registry, source context lookup and the composer commands used by lib.rs, and the managed state types PrevFrontmostPid and LastCaptureSignature.
- `src-tauri/src/vault`: Supplies VaultIndexState and VaultWatcherState, which lib.rs manages.
- `src-tauri/src/db`: dispatch_shortcut in lib.rs calls db::is_open() so both global shortcuts do nothing without an open vault.
- `src-tauri/src/utils`: lib.rs installs the debug log sink from utils::logger and builds DebugLogPayload events in it.
- `src/lib/contracts`: Frontend mirrors of the event names (events.ts) and command typing (commands.ts) that must match this crate; ts-rs bindings are written to its generated folder.
- `src/lib/app`: tauri-listeners.service.ts listens for menu:settings and app:exit-requested and answers the exit request by invoking confirm_exit.
- `src-tauri/tests`: Integration tests import kokobrain_lib modules directly.
- `event:menu:settings`: Emitted from the menu handler in lib.rs when Settings is chosen.
- `event:app:exit-requested`: Emitted to the main window from on_exit_requested in lib.rs when a programmatic exit is held back.
- `event:tauri-debug-log`: Emitted from the log sink installed in lib.rs for every enabled debug_log call.
- `IPC:confirm_exit`: Registered in lib.rs, implemented in commands/app_exit.rs; marks the flush done and exits.

## Subfolders

- `src-tauri/src/commands`: Tauri command handler modules, one per IPC area.
- `src-tauri/src/db`: Vault SQLite connections, schema and per-domain repositories.
- `src-tauri/src/quick_capture`: Clipboard capture, shortcut intents, source app lookup and composer commands.
- `src-tauri/src/search`: Pure retrieval logic: RRF fusion, hybrid rerank pool, fuzzy expansion, FTS text helpers, eval metrics.
- `src-tauri/src/semantic`: Chunking, ONNX embedder and reranker, model files, quantization, result filtering, update planning.
- `src-tauri/src/utils`: Atomic file writes, vault path helpers and collectors, debug logger, main-thread heartbeat, resource sampling.
- `src-tauri/src/vault`: Note parsing, VaultIndex with reverse indexes, task-line edits, snapshot cache, file watcher.

## Gotchas

- Emit sites must name events through the consts in src-tauri/src/events.rs, never string literals. The frontend mirror in src/lib/contracts/events.ts is checked against events.rs by src/tests/lib/contracts/events-parity.test.ts.
- A command is callable from the webview only when it appears in the generate_handler! list in lib.rs. The typed entry in src/lib/contracts/commands.ts is a separate list; src/tests/lib/contracts/ipc-parity.test.ts parses generate_handler! and checks names, optionality and types against it, so a new command needs both.
- Global shortcuts are not registered on the plugin builder. They are registered inside the setup hook after build_composer_window, so an early hotkey cannot reach a missing composer window (lib.rs).
- dispatch_shortcut returns early when db::is_open() is false, so both hotkeys do nothing without an open vault (lib.rs).
- dispatch_shortcut runs its own lock-and-emit loop around capture_clipboard_now_with instead of calling the capture_clipboard_now command, and it ignores emit errors where the command propagates them, so emit behavior changes must be made in both places (lib.rs, quick_capture/commands.rs).
- The Quit menu item calls app.exit(0) instead of the predefined quit, because the predefined item skips the cancellable exit event. on_exit_requested holds a programmatic exit until the frontend invokes confirm_exit, except when exit_decision allows it (no exit code, the restart code, already flushed, or no main window). Dock Quit and logout bypass this flow (lib.rs, commands/app_exit.rs).
- The composer window intercepts CloseRequested and hides itself, so it survives shortcut summons (lib.rs intercept_close_as_hide). On macOS it is also set to move to the active Space.
- Sentry is initialized with send_default_pii(false) and max_breadcrumbs(0). Reconfiguring first unbinds the client from both hubs and closes the previous one, and a disabled configuration leaves no client (error_monitoring.rs).
- The crate library is named kokobrain_lib (src-tauri/Cargo.toml), and integration tests in src-tauri/tests import its public modules, so renaming a public module breaks them.
