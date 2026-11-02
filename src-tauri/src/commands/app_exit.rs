//! Quit goes through the frontend's `prepareForExit` (save dirty tabs, ask
//! before discarding failed saves, drain pending writes, flush settings)
//! before the process ends. `lib.rs` holds back a programmatic exit with
//! `prevent_exit` and emits `APP_EXIT_REQUESTED_EVENT`; the frontend answers
//! with `confirm_exit` once the flush is done.
//!
//! Dock Quit and logout do not pass through here: tao handles them in
//! `applicationWillTerminate`, which emits `RunEvent::Exit` only and cannot
//! be cancelled.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, State, RESTART_EXIT_CODE};

/// Label of the main window, the one whose frontend runs `prepareForExit`.
pub const MAIN_WINDOW_LABEL: &str = "main";

/// Whether the frontend already ran `prepareForExit` for the exit under way.
#[derive(Default)]
pub struct ExitFlushState(AtomicBool);

impl ExitFlushState {
	/// Records that the frontend flushed, so the next exit request goes on.
	pub fn mark_flushed(&self) {
		self.0.store(true, Ordering::SeqCst);
	}

	/// True once `mark_flushed` ran.
	pub fn is_flushed(&self) -> bool {
		self.0.load(Ordering::SeqCst)
	}
}

/// What `RunEvent::ExitRequested` does.
#[derive(Debug, PartialEq, Eq)]
pub enum ExitDecision {
	/// Let the exit go on.
	Allow,
	/// Call `prevent_exit` and ask the main window to run `prepareForExit`.
	AskFrontend,
}

/// Decides one `RunEvent::ExitRequested`.
///
/// - `code: None` means the last window was destroyed: no frontend is left to ask.
/// - `RESTART_EXIT_CODE` cannot be prevented; Restart to update flushes before it relaunches.
/// - Without a main window (closed, the hidden composer keeps the app alive)
///   nobody would answer, and the window close already flushed.
pub fn exit_decision(code: Option<i32>, flushed: bool, has_main_window: bool) -> ExitDecision {
	match code {
		Some(code) if code != RESTART_EXIT_CODE && !flushed && has_main_window => {
			ExitDecision::AskFrontend
		}
		_ => ExitDecision::Allow,
	}
}

/// Called by the frontend once `prepareForExit` returned true: marks the
/// flush done and exits with code 0.
#[tauri::command]
pub fn confirm_exit(app: AppHandle, state: State<'_, ExitFlushState>) {
	state.mark_flushed();
	app.exit(0);
}
