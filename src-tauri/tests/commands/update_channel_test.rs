//! Integration tests for `commands::update_channel`.
//!
//! `check_for_update_on_channel` itself cannot run without a Tauri runtime
//! (it needs a live `Webview` for the updater builder + resource table); the
//! channel-to-endpoint mapping it relies on is covered by the module's
//! inline `#[cfg(test)]` tests. What remains testable here is the IPC wire
//! shape of `UpdateMetadata` — the struct the frontend's update-check flow
//! deserializes (`rid`, `currentVersion`, `version`, `body`). A silent serde
//! rename would only surface as a broken Settings > Updates panel at
//! runtime, so we lock the JSON key casing.

use kokobrain_lib::commands::update_channel::UpdateMetadata;

#[test]
fn update_metadata_serializes_with_camel_case_keys() {
	let meta = UpdateMetadata {
		rid: 7,
		current_version: "2.11.5".to_string(),
		version: "2.12.0".to_string(),
		body: Some("Release notes".to_string()),
	};

	let value = serde_json::to_value(&meta).unwrap();
	assert_eq!(value["rid"], 7);
	assert_eq!(value["currentVersion"], "2.11.5");
	assert_eq!(value["version"], "2.12.0");
	assert_eq!(value["body"], "Release notes");
	// The snake_case spelling must NOT leak over IPC.
	assert!(value.get("current_version").is_none());
}

#[test]
fn update_metadata_serializes_null_body_when_release_has_no_notes() {
	let meta = UpdateMetadata {
		rid: 1,
		current_version: "1.0.0".to_string(),
		version: "1.0.1".to_string(),
		body: None,
	};

	let value = serde_json::to_value(&meta).unwrap();
	// `body` has no skip attribute — the frontend receives an explicit null.
	assert!(value.as_object().unwrap().contains_key("body"));
	assert!(value["body"].is_null());
}

#[test]
fn no_update_available_serializes_as_json_null() {
	// `check_for_update_on_channel` returns `Ok(None)` when the app is up to
	// date; the TS caller narrows `UpdateMetadata | null` with `if (update)`,
	// so the None arm must reach the wire as a literal JSON null.
	let value = serde_json::to_value(Option::<UpdateMetadata>::None).unwrap();
	assert!(value.is_null());
}
