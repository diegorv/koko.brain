//! Tests for `commands::claude::stream`: the `claude -p --output-format
//! stream-json` line parser. `fixtures/claude/stream.ndjson` holds one line of
//! every type the CLI prints (spec, Verified CLI behavior).

use kokobrain_lib::commands::claude::stream::{dispatch_line, ClaudeEvent, StreamState};
use serde_json::json;

const RECORDED: &str = include_str!("../fixtures/claude/stream.ndjson");

fn dispatch_all(text: &str) -> (Vec<ClaudeEvent>, StreamState) {
	let mut state = StreamState::default();
	let events = text.lines().flat_map(|line| dispatch_line(line, &mut state)).collect();
	(events, state)
}

#[test]
fn recorded_stream_maps_to_events_in_order() {
	let (events, state) = dispatch_all(RECORDED);

	assert_eq!(
		events,
		vec![
			ClaudeEvent::Init {
				session_id: "sess-1".into(),
				model: "claude-opus-5-5".into(),
				slash_commands: vec!["hello".into(), "review".into()],
				skills: vec!["tdd".into(), "grilling".into()],
			},
			ClaudeEvent::ThinkingDelta { text: "Let me look.".into() },
			ClaudeEvent::TextDelta { text: "I'll read ".into() },
			ClaudeEvent::TextDelta { text: "the note.".into() },
			ClaudeEvent::ToolStart {
				id: "toolu_1".into(),
				name: "Read".into(),
				input: json!({ "file_path": "notes/a.md" }),
			},
			ClaudeEvent::ToolResult { id: "toolu_1".into(), is_error: false, summary: "# A\nhello".into() },
			ClaudeEvent::TextDelta { text: "Done.".into() },
			ClaudeEvent::Result {
				session_id: "sess-1".into(),
				text: "Done.".into(),
				is_error: false,
				cost_usd: Some(0.0123),
				num_turns: Some(2),
			},
		]
	);
	assert!(state.saw_result);
}

#[test]
fn each_recorded_line_type_is_handled() {
	// Lines that carry nothing for the panel map to no event.
	let silent: Vec<&str> = RECORDED
		.lines()
		.filter(|line| {
			let mut state = StreamState::default();
			dispatch_line(line, &mut state).is_empty()
		})
		.collect();
	let kinds: Vec<String> = silent
		.iter()
		.map(|line| {
			let v: serde_json::Value = serde_json::from_str(line).unwrap();
			let inner = v["event"]["type"].as_str().or(v["subtype"].as_str()).unwrap_or("");
			format!("{}/{}", v["type"].as_str().unwrap(), inner)
		})
		.collect();
	for kind in &kinds {
		assert!(
			[
				"system/status",
				"stream_event/message_start",
				"stream_event/content_block_start",
				"stream_event/content_block_delta",
				"stream_event/content_block_stop",
				"stream_event/message_delta",
				"stream_event/message_stop",
				"assistant/",
			]
			.contains(&kind.as_str()),
			"unexpected silent line kind {kind}"
		);
	}
}

#[test]
fn tool_start_comes_from_the_assistant_message_not_partial_json() {
	let mut state = StreamState::default();
	let partial = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\"file_path\":"}}}"#;
	let start = r#"{"type":"stream_event","event":{"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_1","name":"Read","input":{}}}}"#;

	assert!(dispatch_line(start, &mut state).is_empty());
	assert!(dispatch_line(partial, &mut state).is_empty());

	let assistant = r#"{"type":"assistant","message":{"content":[{"type":"text","text":"x"},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}},{"type":"tool_use","id":"t2","name":"Edit","input":{"file_path":"a.md","old_string":"a","new_string":"b"}}]}}"#;
	assert_eq!(
		dispatch_line(assistant, &mut state),
		vec![
			ClaudeEvent::ToolStart { id: "t1".into(), name: "Bash".into(), input: json!({ "command": "ls" }) },
			ClaudeEvent::ToolStart {
				id: "t2".into(),
				name: "Edit".into(),
				input: json!({ "file_path": "a.md", "old_string": "a", "new_string": "b" }),
			},
		]
	);
}

#[test]
fn tool_result_with_block_content_and_error_is_summarized() {
	let mut state = StreamState::default();
	let line = r#"{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t9","is_error":true,"content":[{"type":"text","text":"line one"},{"type":"image","source":{}},{"type":"text","text":"line two"}]}]}}"#;

	assert_eq!(
		dispatch_line(line, &mut state),
		vec![ClaudeEvent::ToolResult { id: "t9".into(), is_error: true, summary: "line one\nline two".into() }]
	);
}

#[test]
fn tool_result_summary_keeps_the_first_500_chars() {
	let mut state = StreamState::default();
	// Multi-byte chars prove the cut counts chars, not bytes.
	let content = "é".repeat(600);
	let line = json!({
		"type": "user",
		"message": { "content": [{ "type": "tool_result", "tool_use_id": "t1", "content": content }] }
	})
	.to_string();

	let events = dispatch_line(&line, &mut state);

	let ClaudeEvent::ToolResult { summary, .. } = &events[0] else { panic!("{events:?}") };
	assert_eq!(summary.chars().count(), 500);
	assert!(summary.chars().all(|c| c == 'é'));
}

#[test]
fn user_text_message_without_tool_result_is_ignored() {
	let mut state = StreamState::default();
	let line = r#"{"type":"user","message":{"role":"user","content":"plain text"}}"#;

	assert!(dispatch_line(line, &mut state).is_empty());
}

#[test]
fn init_without_terminal_commands_keeps_every_slash_command() {
	let mut state = StreamState::default();
	let line = r#"{"type":"system","subtype":"init","session_id":"s","model":"m","slash_commands":["a","b"]}"#;

	assert_eq!(
		dispatch_line(line, &mut state),
		vec![ClaudeEvent::Init {
			session_id: "s".into(),
			model: "m".into(),
			slash_commands: vec!["a".into(), "b".into()],
			skills: vec![],
		}]
	);
}

#[test]
fn error_result_without_text_or_cost() {
	let mut state = StreamState::default();
	let line = r#"{"type":"result","subtype":"error_max_turns","is_error":true,"session_id":"s2","num_turns":9}"#;

	assert_eq!(
		dispatch_line(line, &mut state),
		vec![ClaudeEvent::Result {
			session_id: "s2".into(),
			text: String::new(),
			is_error: true,
			cost_usd: None,
			num_turns: Some(9),
		}]
	);
	assert!(state.saw_result);
}

#[test]
fn non_json_line_is_skipped() {
	let mut state = StreamState::default();

	assert!(dispatch_line("Warning: something on stdout", &mut state).is_empty());
	assert!(dispatch_line("", &mut state).is_empty());
	assert!(dispatch_line("   ", &mut state).is_empty());
	assert!(dispatch_line("[1, 2]", &mut state).is_empty());
	assert!(!state.saw_result);
}

#[test]
fn unknown_type_is_ignored() {
	let mut state = StreamState::default();

	assert!(dispatch_line(r#"{"type":"rate_limit","retry_in":3}"#, &mut state).is_empty());
	assert!(dispatch_line(r#"{"type":"system","subtype":"compact_boundary"}"#, &mut state).is_empty());
	assert!(dispatch_line(r#"{"no_type":true}"#, &mut state).is_empty());
}

#[test]
fn events_serialize_with_a_type_tag_and_camel_case_fields() {
	let value = serde_json::to_value(ClaudeEvent::ToolResult {
		id: "t".into(),
		is_error: true,
		summary: "s".into(),
	})
	.unwrap();
	assert_eq!(value, json!({ "type": "ToolResult", "id": "t", "isError": true, "summary": "s" }));

	let value = serde_json::to_value(ClaudeEvent::Done { exit_code: None }).unwrap();
	assert_eq!(value, json!({ "type": "Done", "exitCode": null }));

	let value = serde_json::to_value(ClaudeEvent::Result {
		session_id: "s".into(),
		text: "t".into(),
		is_error: false,
		cost_usd: Some(0.5),
		num_turns: Some(1),
	})
	.unwrap();
	assert_eq!(
		value,
		json!({ "type": "Result", "sessionId": "s", "text": "t", "isError": false, "costUsd": 0.5, "numTurns": 1 })
	);
}
