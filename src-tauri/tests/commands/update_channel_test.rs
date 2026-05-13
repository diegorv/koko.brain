use kokobrain_lib::commands::update_channel::{
	endpoint_for_channel, NIGHTLY_ENDPOINT, STABLE_ENDPOINT,
};
use url::Url;

#[test]
fn endpoint_for_channel_nightly() {
	assert_eq!(endpoint_for_channel("nightly"), NIGHTLY_ENDPOINT);
}

#[test]
fn endpoint_for_channel_stable() {
	assert_eq!(endpoint_for_channel("stable"), STABLE_ENDPOINT);
}

#[test]
fn endpoint_for_channel_unknown_falls_back_to_stable() {
	assert_eq!(endpoint_for_channel(""), STABLE_ENDPOINT);
	assert_eq!(endpoint_for_channel("beta"), STABLE_ENDPOINT);
	// Case-sensitive on the Rust side — the JS side normalises channel
	// names before they reach this command, so an uppercase value here
	// represents an unexpected leak and should default to stable.
	assert_eq!(endpoint_for_channel("NIGHTLY"), STABLE_ENDPOINT);
}

#[test]
fn endpoints_are_valid_urls() {
	// Catches typos / missing scheme in the constants at test time rather
	// than first runtime invocation in production.
	assert!(Url::parse(STABLE_ENDPOINT).is_ok());
	assert!(Url::parse(NIGHTLY_ENDPOINT).is_ok());
}

#[test]
fn endpoints_target_expected_github_paths() {
	let stable = Url::parse(STABLE_ENDPOINT).unwrap();
	assert_eq!(stable.host_str(), Some("github.com"));
	assert!(stable.path().ends_with("/latest.json"));
	assert!(stable.path().contains("/releases/latest/download/"));

	let nightly = Url::parse(NIGHTLY_ENDPOINT).unwrap();
	assert_eq!(nightly.host_str(), Some("github.com"));
	assert!(nightly.path().ends_with("/latest.json"));
	assert!(nightly.path().contains("/releases/download/nightly/"));
}
