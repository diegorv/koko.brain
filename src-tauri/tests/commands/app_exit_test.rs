//! Integration tests for the `commands::app_exit` module: which
//! `RunEvent::ExitRequested` the app holds back so the frontend can run
//! `prepareForExit`, and the flag `confirm_exit` sets. The event loop wiring
//! in `lib.rs` (the Quit menu item, `prevent_exit`, the emit) needs a running
//! app and is checked by hand.

use kokobrain_lib::commands::app_exit::{exit_decision, ExitDecision, ExitFlushState};
use tauri::RESTART_EXIT_CODE;

#[test]
fn programmatic_exit_with_a_main_window_asks_the_frontend_first() {
	assert_eq!(exit_decision(Some(0), false, true), ExitDecision::AskFrontend);
}

#[test]
fn exit_after_the_frontend_flushed_goes_on() {
	assert_eq!(exit_decision(Some(0), true, true), ExitDecision::Allow);
}

#[test]
fn restart_goes_on_because_it_cannot_be_prevented() {
	// `prevent_exit` is ignored for RESTART_EXIT_CODE; Restart to update runs
	// `prepareForExit` before it calls `relaunch`.
	assert_eq!(exit_decision(Some(RESTART_EXIT_CODE), false, true), ExitDecision::Allow);
}

#[test]
fn last_window_destroyed_goes_on() {
	// `code: None` comes after the last window is gone; no frontend is left to ask.
	assert_eq!(exit_decision(None, false, true), ExitDecision::Allow);
	assert_eq!(exit_decision(None, false, false), ExitDecision::Allow);
}

#[test]
fn quit_with_the_main_window_closed_goes_on() {
	// The hidden composer keeps the app alive after the main window closed
	// (which already flushed); asking nobody would make Quit hang.
	assert_eq!(exit_decision(Some(0), false, false), ExitDecision::Allow);
}

#[test]
fn flush_state_starts_unflushed_and_stays_flushed_once_marked() {
	let state = ExitFlushState::default();
	assert!(!state.is_flushed());
	state.mark_flushed();
	assert!(state.is_flushed());
	assert_eq!(exit_decision(Some(0), state.is_flushed(), true), ExitDecision::Allow);
}
