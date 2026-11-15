//! Tests for `commands::claude::stream`: the `claude -p --output-format
//! stream-json` line parser. `fixtures/claude/stream.ndjson` is a real capture
//! (claude 2.1.325, one turn that calls `Read` then answers, with the vault
//! path, home dir and `init` lists replaced by neutral values, and the
//! `SessionStart` hook pairs cut to one with `output`/`stdout`/`stderr`
//! emptied). It pins the parser to the 2.1.325 stream shape: a field a later
//! CLI version renames fails these tests only after a re-capture.

use kokobrain_lib::commands::claude::stream::{dispatch_line, ClaudeEvent, StreamState};
use serde_json::json;

const RECORDED: &str = include_str!("../fixtures/claude/stream.ndjson");

const SESSION: &str = "0bf03d03-7914-4ed8-ad68-068dc94c9c0f";
const TOOL_ID: &str = "toolu_01Na6FCUShnuo6KpS93GSNzv";

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
				session_id: SESSION.into(),
				model: "claude-opus-5-5".into(),
				slash_commands: vec!["code-review".into(), "hello".into(), "init".into()],
				skills: vec!["code-review".into()],
			},
			ClaudeEvent::ToolStart {
				id: TOOL_ID.into(),
				name: "Read".into(),
				input: json!({ "file_path": "/vault/notes/hello.md" }),
			},
			ClaudeEvent::ToolResult {
				id: TOOL_ID.into(),
				is_error: false,
				summary: "1\t# Hello\n2\tThe capture note says hi.\n3\t".into(),
			},
			ClaudeEvent::TextDelta { text: "The capture note says hi.".into() },
			ClaudeEvent::Result {
				session_id: SESSION.into(),
				text: "The capture note says hi.".into(),
				is_error: false,
				cost_usd: Some(0.2596148),
				num_turns: Some(2),
			},
		]
	);
	assert!(state.saw_result);
}

#[test]
fn recorded_system_events_other_than_init_are_skipped() {
	let mut others: Vec<&str> = Vec::new();
	let mut subtypes: Vec<String> = Vec::new();
	for line in RECORDED.lines() {
		let v: serde_json::Value = serde_json::from_str(line).unwrap();
		if v["type"] == "system" && v["subtype"] != "init" {
			others.push(line);
			subtypes.push(v["subtype"].as_str().unwrap_or("").to_string());
		}
	}
	for expected in ["hook_started", "hook_response", "status"] {
		assert!(subtypes.iter().any(|s| s == expected), "fixture has no system/{expected}: {subtypes:?}");
	}

	let mut state = StreamState::default();
	for line in others {
		assert_eq!(dispatch_line(line, &mut state), vec![], "{line}");
	}
	assert!(!state.saw_result);
}

#[test]
fn thinking_delta_maps_to_thinking_event() {
	let mut state = StreamState::default();
	let line = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me look."}}}"#;

	assert_eq!(dispatch_line(line, &mut state), vec![ClaudeEvent::ThinkingDelta { text: "Let me look.".into() }]);
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
				"system/hook_started",
				"system/hook_response",
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
			// No `text_delta` came for this message, so its text block is sent whole.
			ClaudeEvent::TextDelta { text: "x".into() },
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
fn init_leaves_out_the_terminal_only_slash_commands() {
	let mut state = StreamState::default();
	let line = r#"{"type":"system","subtype":"init","session_id":"s","model":"m","slash_commands":["doctor","hello","color","review"],"terminal_slash_commands":["doctor","color","focus"]}"#;

	let events = dispatch_line(line, &mut state);

	let [ClaudeEvent::Init { slash_commands, .. }] = events.as_slice() else { panic!("{events:?}") };
	assert_eq!(slash_commands, &["hello".to_string(), "review".to_string()]);
}

#[test]
fn error_result_without_text_shows_the_errors() {
	let (events, state) = dispatch_all(include_str!("../fixtures/claude/error-during-execution.ndjson"));

	assert_eq!(
		events,
		vec![ClaudeEvent::Result {
			session_id: "5f1c2a9e-0d3b-4c7e-9a61-2b8e4f6d1a07".into(),
			text: "API Error: 529 Overloaded\nRequest was aborted.".into(),
			is_error: true,
			cost_usd: Some(0.0),
			num_turns: Some(1),
		}]
	);
	assert!(state.saw_result);
}

#[test]
fn error_result_with_text_or_empty_errors() {
	let mut state = StreamState::default();
	let with_text = r#"{"type":"result","subtype":"error_during_execution","is_error":true,"result":"Prompt is too long","errors":["ignored"],"session_id":"s"}"#;
	let empty_errors = r#"{"type":"result","subtype":"error_during_execution","is_error":true,"result":"","errors":[],"session_id":"s"}"#;
	let success = r#"{"type":"result","subtype":"success","is_error":false,"result":"","session_id":"s"}"#;

	let text = |line: &str, state: &mut StreamState| match dispatch_line(line, state).as_slice() {
		[ClaudeEvent::Result { text, .. }] => text.clone(),
		other => panic!("{other:?}"),
	};
	assert_eq!(text(with_text, &mut state), "Prompt is too long");
	assert_eq!(text(empty_errors, &mut state), "error_during_execution");
	assert_eq!(text(success, &mut state), "");
}

#[test]
fn retried_response_retracts_the_text_of_the_abandoned_blocks() {
	let (events, _) = dispatch_all(include_str!("../fixtures/claude/retry.ndjson"));

	assert_eq!(
		events,
		vec![
			ClaudeEvent::TextDelta { text: "The note ".into() },
			ClaudeEvent::TextDelta { text: "says".into() },
			ClaudeEvent::TextRetracted { text: "The note says".into() },
			ClaudeEvent::TextDelta { text: "The note says hi.".into() },
			ClaudeEvent::Result {
				session_id: "5f1c2a9e-0d3b-4c7e-9a61-2b8e4f6d1a07".into(),
				text: "The note says hi.".into(),
				is_error: false,
				cost_usd: Some(0.01),
				num_turns: Some(1),
			},
		]
	);
}

#[test]
fn non_streamed_fallback_sends_its_text_and_tools() {
	let (events, _) = dispatch_all(include_str!("../fixtures/claude/non-streamed.ndjson"));

	assert_eq!(
		events,
		vec![
			ClaudeEvent::TextDelta { text: "Reading the".into() },
			ClaudeEvent::TextRetracted { text: "Reading the".into() },
			ClaudeEvent::TextDelta { text: "Reading the note.".into() },
			ClaudeEvent::ToolStart {
				id: "toolu_01Fallback".into(),
				name: "Read".into(),
				input: json!({ "file_path": "/vault/notes/hello.md" }),
			},
			ClaudeEvent::ToolResult { id: "toolu_01Fallback".into(), is_error: false, summary: "1\t# Hello".into() },
			ClaudeEvent::TextDelta { text: "It says hello.".into() },
			ClaudeEvent::Result {
				session_id: "5f1c2a9e-0d3b-4c7e-9a61-2b8e4f6d1a07".into(),
				text: "It says hello.".into(),
				is_error: false,
				cost_usd: Some(0.02),
				num_turns: Some(2),
			},
		]
	);
}

#[test]
fn abandoned_blocks_retract_from_their_index_for_the_response_they_close() {
	let start = |id: &str| format!(r#"{{"type":"stream_event","event":{{"type":"message_start","message":{{"id":"{id}"}}}}}}"#);
	let delta = |index: u32, text: &str| {
		format!(r#"{{"type":"stream_event","event":{{"type":"content_block_delta","index":{index},"delta":{{"type":"text_delta","text":"{text}"}}}}}}"#)
	};
	let stop = |id: &str, from: u32| {
		format!(r#"{{"type":"stream_event","event":{{"type":"message_stop"}},"abandoned_blocks":{{"api_message_id":"{id}","from_block_index":{from}}}}}"#)
	};
	let mut state = StreamState::default();
	for line in [start("m1"), delta(0, "kept "), delta(2, "cut "), delta(3, "too")] {
		dispatch_line(&line, &mut state);
	}

	assert_eq!(dispatch_line(&stop("m1", 2), &mut state), vec![ClaudeEvent::TextRetracted { text: "cut too".into() }]);
	// The response is closed: a second stop has nothing left to retract.
	assert_eq!(dispatch_line(&stop("m1", 0), &mut state), vec![]);
	// A stop naming another response removes nothing.
	dispatch_line(&start("m2"), &mut state);
	dispatch_line(&delta(0, "a"), &mut state);
	assert_eq!(dispatch_line(&stop("other", 0), &mut state), vec![]);
	// An index past every block streamed removes nothing.
	dispatch_line(&start("m3"), &mut state);
	dispatch_line(&delta(0, "a"), &mut state);
	assert_eq!(dispatch_line(&stop("m3", 5), &mut state), vec![]);
}

#[test]
fn streamed_text_is_not_sent_again_by_its_assistant_message() {
	let mut state = StreamState::default();
	dispatch_line(r#"{"type":"stream_event","event":{"type":"message_start","message":{"id":"m1"}}}"#, &mut state);
	dispatch_line(
		r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}}"#,
		&mut state,
	);

	let assistant = r#"{"type":"assistant","message":{"id":"m1","content":[{"type":"text","text":"Hi"}]},"parent_tool_use_id":null}"#;
	assert_eq!(dispatch_line(assistant, &mut state), vec![]);
}

#[test]
fn text_delta_with_no_known_response_does_not_hide_an_assistant_message_text() {
	let mut state = StreamState::default();
	dispatch_line(
		r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}}"#,
		&mut state,
	);

	let no_id = r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Later"}]},"parent_tool_use_id":null}"#;
	assert_eq!(dispatch_line(no_id, &mut state), vec![ClaudeEvent::TextDelta { text: "Later".into() }]);
}

#[test]
fn subagent_text_and_empty_text_blocks_are_not_sent() {
	let mut state = StreamState::default();
	let subagent = r#"{"type":"assistant","message":{"id":"m9","content":[{"type":"text","text":"inner"}]},"parent_tool_use_id":"toolu_task"}"#;
	let empty = r#"{"type":"assistant","message":{"id":"m8","content":[{"type":"text","text":""}]},"parent_tool_use_id":null}"#;

	assert_eq!(dispatch_line(subagent, &mut state), vec![]);
	assert_eq!(dispatch_line(empty, &mut state), vec![]);
}

#[test]
fn error_result_without_text_or_errors_says_its_subtype() {
	let mut state = StreamState::default();
	let line = r#"{"type":"result","subtype":"error_max_turns","is_error":true,"session_id":"s2","num_turns":9}"#;

	assert_eq!(
		dispatch_line(line, &mut state),
		vec![ClaudeEvent::Result {
			session_id: "s2".into(),
			text: "error_max_turns".into(),
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
