//! Every Tauri event name the backend emits. Emit sites name their event
//! through one of these consts, never a string literal; the frontend mirror
//! is `EVENT_NAMES` in `src/lib/contracts/events.ts`, and
//! `src/tests/lib/contracts/events-parity.test.ts` checks the two match.

/// Emitted after every `VaultIndex` mutation with an `UpdateResult` payload.
pub const VAULT_INDEX_UPDATED_EVENT: &str = "vault-index-updated";

/// Emitted on every debounced burst of vault file changes. Payload is the
/// deduplicated, hidden-dir-filtered, ancestor-filtered list of paths.
pub const VAULT_FILES_CHANGED_EVENT: &str = "vault-files-changed";

/// Carries every `SemanticProgress` update (downloads and builds).
pub const SEMANTIC_INDEX_PROGRESS_EVENT: &str = "semantic-index-progress";

/// Carries one `DebugLogPayload` per `debug_log` call, from the log sink set
/// in `lib.rs`.
pub const TAURI_DEBUG_LOG_EVENT: &str = "tauri-debug-log";

/// Emitted with `()` when the user picks Settings in the app menu.
pub const MENU_SETTINGS_EVENT: &str = "menu:settings";

/// Emitted with `()` to the main window when Quit was requested and the
/// frontend has not flushed yet; the frontend runs `prepareForExit`, then
/// invokes `confirm_exit`.
pub const APP_EXIT_REQUESTED_EVENT: &str = "app:exit-requested";

/// Delivers a detected clipboard capture to the frontend.
pub const QC_CAPTURE_DETECTED_EVENT: &str = "qc:capture-detected";

/// Event the composer popover listens for to focus its editor after a
/// show. Carries an optional initial-text payload (empty for the
/// shortcut-summoned path).
pub const QC_OPEN_COMPOSER_EVENT: &str = "qc:open-composer";

/// Carries a `ComposerCaptureResult`: whether the main window wrote the
/// capture note of one composer submit.
pub const QC_COMPOSER_CAPTURE_RESULT_EVENT: &str = "qc:composer-capture-result";
