use kokobrain_lib::error_monitoring::{configure_sentry, is_sentry_active, SentryState};

#[test]
fn invalid_dsn_never_enables_rust_error_monitoring() {
	let state = SentryState::default();

	let result = configure_sentry(&state, true, "not a dsn".to_string(), "test".to_string());

	assert!(result.is_err(), "invalid configuration must return an error");
	assert!(!is_sentry_active(&state).expect("state should remain readable"));
}

#[test]
fn disabled_rust_error_monitoring_starts_without_a_client() {
	let state = SentryState::default();

	configure_sentry(&state, false, String::new(), "test".to_string())
		.expect("explicit opt-out should succeed");

	assert!(!is_sentry_active(&state).expect("state should remain readable"));
}
