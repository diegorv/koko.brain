use std::sync::Mutex;
use std::time::Duration;

/// Holds the Rust Sentry client for as long as the active vault allows reporting.
pub struct SentryState {
	client: Mutex<Option<sentry::ClientInitGuard>>,
}

impl Default for SentryState {
	fn default() -> Self {
		Self {
			client: Mutex::new(None),
		}
	}
}

/// Returns whether a Rust Sentry client is active for the current process.
pub fn is_sentry_active(state: &SentryState) -> Result<bool, String> {
	let guard = state.client.lock().map_err(|error| format!("Sentry lock error: {error}"))?;
	Ok(guard.as_ref().is_some_and(sentry::ClientInitGuard::is_enabled))
}

/// Configures Rust error and panic reporting for the current vault. A malformed
/// DSN fails safely before a Sentry client is created, and disabling removes the
/// client from both current and main hubs before its transport is closed.
pub fn configure_sentry(
	state: &SentryState,
	enabled: bool,
	dsn: String,
	release: String,
) -> Result<(), String> {
	let mut client = state.client.lock().map_err(|error| format!("Sentry lock error: {error}"))?;

	// A hub retains an Arc to its bound client, so unbind before dropping the
	// guard. This makes the opt-out effective before flushing any prior event.
	sentry::Hub::main().bind_client(None);
	sentry::Hub::current().bind_client(None);
	if let Some(previous) = client.take() {
		previous.close(Some(Duration::from_millis(200)));
	}

	if !enabled {
		return Ok(());
	}

	let dsn = dsn
		.parse::<sentry::types::Dsn>()
		.map_err(|error| format!("Invalid Sentry DSN: {error}"))?;
	let initialized = sentry::init((
		dsn,
		sentry::ClientOptions::new()
			.release(release)
			.send_default_pii(false)
			.max_breadcrumbs(0),
	));
	if !initialized.is_enabled() {
		return Err("Sentry client could not be enabled".to_string());
	}

	// Tauri may execute the command on a worker thread. Binding the initialized
	// client to the main hub lets new Rust threads inherit the active client,
	// including the default Sentry panic integration.
	sentry::Hub::main().bind_client(sentry::Hub::current().client());
	*client = Some(initialized);
	Ok(())
}
