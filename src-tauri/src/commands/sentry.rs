use tauri::State;

use crate::error_monitoring::{configure_sentry as configure_client, SentryState};

/// Enables or disables Rust error and panic reporting for the active vault.
#[tauri::command]
pub fn configure_sentry(
	state: State<'_, SentryState>,
	enabled: bool,
	dsn: String,
	release: String,
) -> Result<(), String> {
	configure_client(&state, enabled, dsn, release)
}
