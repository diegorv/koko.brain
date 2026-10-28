//! Pins how the Rust frontmatter parser treats every key the event
//! calendar reads (`date`, `start`, `end`, `all_day`, `location`,
//! `event_color`, `event_title`, `end_date`, `type`).
//!
//! The TS projection and its issue rules (calendar ticket 07) are written
//! against these shapes: day and time values stay strings, numbers and
//! booleans are typed, quotes are stripped, an inline ` #` comment is NOT
//! stripped, nested maps become null, `type` is aliased to `_type` and
//! `is_a` only uppercases the first character, and of the calendar's own
//! keys only `color` is aliased. A parser change that breaks any of these
//! must fail here before it silently breaks the calendar.

use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::parsing::parse_frontmatter;
use serde_json::{json, Value};

/// Parses `body` wrapped in `---` delimiters and returns the value at `key`.
fn parse_key(body: &str, key: &str) -> Option<Value> {
	parse_frontmatter(&format!("---\n{body}\n---\n")).get(key).cloned()
}

/// Builds a `NoteEntry` for a note with the given frontmatter body.
fn entry(body: &str) -> NoteEntry {
	NoteEntry::from_content(
		"/vault/Events/Standup.md".to_string(),
		&format!("---\n{body}\n---\nBody\n"),
		0,
	)
}

#[test]
fn day_key_stays_a_string() {
	assert_eq!(parse_key("date: 2026-11-10", "date"), Some(json!("2026-11-10")));
}

#[test]
fn time_parses_to_the_same_string_quoted_or_bare() {
	assert_eq!(parse_key("start: 09:30", "start"), Some(json!("09:30")));
	assert_eq!(parse_key("start: \"09:30\"", "start"), Some(json!("09:30")));
}

#[test]
fn integer_and_boolean_values_are_typed() {
	assert_eq!(parse_key("start: 570", "start"), Some(json!(570)));
	assert_eq!(parse_key("all_day: true", "all_day"), Some(Value::Bool(true)));
}

#[test]
fn empty_value_is_null_and_quoted_empty_is_an_empty_string() {
	// A bare `start:` takes the parser's empty-value branch and is recorded
	// as null, whether another key follows or the block ends. Only an
	// explicitly quoted empty value yields `""`. Ticket 07 treats both
	// shapes (and a missing key) as absent.
	assert_eq!(parse_key("start:\nend: 10:00", "start"), Some(Value::Null));
	assert_eq!(parse_key("start:", "start"), Some(Value::Null));
	assert_eq!(parse_key("start: \"\"", "start"), Some(json!("")));
}

#[test]
fn malformed_times_and_datetimes_stay_strings() {
	assert_eq!(parse_key("start: 9:30 AM", "start"), Some(json!("9:30 AM")));
	assert_eq!(parse_key("end: 2026-11-12", "end"), Some(json!("2026-11-12")));
	assert_eq!(
		parse_key("start: 2026-11-10T09:30", "start"),
		Some(json!("2026-11-10T09:30"))
	);
}

#[test]
fn quotes_are_stripped_so_a_hash_inside_them_survives() {
	assert_eq!(
		parse_key("location: \"Room #4\"", "location"),
		Some(json!("Room #4"))
	);
}

#[test]
fn inline_comment_is_kept_in_the_value() {
	assert_eq!(
		parse_key("start: 09:30 # standup", "start"),
		Some(json!("09:30 # standup"))
	);
}

#[test]
fn nested_map_value_is_null_and_siblings_survive() {
	let map = parse_frontmatter("---\nstart:\n  hour: 9\n  minute: 30\ndate: 2026-11-10\n---\n");
	assert_eq!(map.get("start"), Some(&Value::Null));
	assert_eq!(map.get("date"), Some(&json!("2026-11-10")));
}

#[test]
fn type_is_aliased_and_is_a_capitalizes_the_first_letter() {
	let e = entry("type: event");
	assert_eq!(e.frontmatter.get("_type"), Some(&json!("event")));
	assert!(!e.frontmatter.contains_key("type"));
	assert_eq!(e.is_a.as_deref(), Some("Event"));
}

#[test]
fn is_a_keeps_the_rest_of_the_casing() {
	let e = entry("_type: EVENT");
	assert_eq!(e.is_a.as_deref(), Some("EVENT"));
}

#[test]
fn only_color_is_aliased_among_calendar_keys() {
	let map = parse_frontmatter(
		"---\ncolor: blue\nevent_color: red\nevent_title: Sync\nlocation: Office\nend_date: 2026-11-12\n---\n",
	);
	assert_eq!(map.get("_color"), Some(&json!("blue")));
	assert!(!map.contains_key("color"));
	assert_eq!(map.get("event_color"), Some(&json!("red")));
	assert_eq!(map.get("event_title"), Some(&json!("Sync")));
	assert_eq!(map.get("location"), Some(&json!("Office")));
	assert_eq!(map.get("end_date"), Some(&json!("2026-11-12")));
	assert!(!map.contains_key("_event_color"));
	assert!(!map.contains_key("_event_title"));
	assert!(!map.contains_key("_location"));
	assert!(!map.contains_key("_end_date"));
}

#[test]
fn quoted_title_with_colon_is_kept_whole() {
	assert_eq!(
		parse_key("event_title: \"1:1 with manager\"", "event_title"),
		Some(json!("1:1 with manager"))
	);
}
