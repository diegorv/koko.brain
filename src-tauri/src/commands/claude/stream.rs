//! Parser for the stdout of `claude -p --output-format stream-json --verbose
//! --include-partial-messages`: one JSON object per line, turned into the
//! normalized `ClaudeEvent`s the agent panel renders.
//!
//! Unknown types and non-JSON lines produce no event, so additions to the CLI
//! format do not break a turn (ADR-0038, Consequences).

use crate::utils::logger::debug_log;
use serde::Serialize;
use serde_json::Value;

/// Longest `ToolResult.summary`, in chars, to keep events small.
pub const TOOL_RESULT_SUMMARY_CHARS: usize = 500;

/// One event of an agent turn, sent to the frontend on `claude-event`.
#[derive(Debug, Clone, PartialEq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum ClaudeEvent {
	/// The session started (`system/init`).
	Init {
		/// Session id; pass it as `resumeSessionId` for a follow-up turn.
		session_id: String,
		/// Model the CLI picked.
		model: String,
		/// Slash commands the panel offers, without the terminal-only ones.
		slash_commands: Vec<String>,
		/// Skills the CLI loaded.
		skills: Vec<String>,
	},
	/// A chunk of assistant text.
	TextDelta {
		/// The chunk.
		text: String,
	},
	/// A chunk of the assistant's thinking.
	ThinkingDelta {
		/// The chunk.
		text: String,
	},
	/// A tool call, with its complete input.
	ToolStart {
		/// Tool use id; the matching `ToolResult` carries the same id.
		id: String,
		/// Tool name, e.g. `Read` or `Bash`.
		name: String,
		/// The tool input as the model sent it.
		input: Value,
	},
	/// A tool call finished.
	ToolResult {
		/// Id of the `ToolStart` this result belongs to.
		id: String,
		/// True when the tool reported an error.
		is_error: bool,
		/// The first 500 chars of the result text.
		summary: String,
	},
	/// The turn's final result.
	Result {
		/// Session id to resume.
		session_id: String,
		/// Final answer text; empty when the CLI sent none.
		text: String,
		/// True when the turn ended in an error (e.g. max turns).
		is_error: bool,
		/// Cost of the turn in USD, when reported.
		cost_usd: Option<f64>,
		/// Number of model turns, when reported.
		num_turns: Option<u32>,
	},
	/// The run failed: spawn error, or a non-zero exit without a result.
	Error {
		/// What went wrong, with the CLI's stderr when there is some.
		message: String,
	},
	/// Always the last event of a run.
	Done {
		/// Process exit code; `null` when it was killed or never started.
		exit_code: Option<i32>,
	},
}

/// What the parser remembers across the lines of one run.
#[derive(Debug, Default)]
pub struct StreamState {
	/// True once a `result` line was seen.
	pub saw_result: bool,
}

/// Turns one stdout line into zero or more events.
pub fn dispatch_line(line: &str, state: &mut StreamState) -> Vec<ClaudeEvent> {
	let line = line.trim();
	if line.is_empty() {
		return Vec::new();
	}
	let value: Value = match serde_json::from_str(line) {
		Ok(value @ Value::Object(_)) => value,
		_ => {
			debug_log("CLAUDE", format!("skipped non-JSON stdout line: {line}"));
			return Vec::new();
		}
	};
	match value["type"].as_str() {
		Some("system") if value["subtype"] == "init" => vec![init_event(&value)],
		Some("stream_event") => delta_event(&value["event"]).into_iter().collect(),
		Some("assistant") => tool_starts(&value),
		Some("user") => tool_results(&value),
		Some("result") => {
			state.saw_result = true;
			vec![ClaudeEvent::Result {
				session_id: str_field(&value, "session_id"),
				text: str_field(&value, "result"),
				is_error: value["is_error"].as_bool().unwrap_or(false),
				cost_usd: value["total_cost_usd"].as_f64(),
				num_turns: value["num_turns"].as_u64().and_then(|n| u32::try_from(n).ok()),
			}]
		}
		_ => Vec::new(),
	}
}

fn init_event(value: &Value) -> ClaudeEvent {
	let terminal = strings(&value["terminal_slash_commands"]);
	ClaudeEvent::Init {
		session_id: str_field(value, "session_id"),
		model: str_field(value, "model"),
		slash_commands: strings(&value["slash_commands"])
			.into_iter()
			.filter(|c| !terminal.contains(c))
			.collect(),
		skills: strings(&value["skills"]),
	}
}

/// Text and thinking deltas. Partial tool input (`input_json_delta`) is left
/// out: `ToolStart` comes from the full `assistant` message.
fn delta_event(event: &Value) -> Option<ClaudeEvent> {
	if event["type"] != "content_block_delta" {
		return None;
	}
	let delta = &event["delta"];
	match delta["type"].as_str()? {
		"text_delta" => Some(ClaudeEvent::TextDelta { text: delta["text"].as_str()?.to_string() }),
		"thinking_delta" => Some(ClaudeEvent::ThinkingDelta { text: delta["thinking"].as_str()?.to_string() }),
		_ => None,
	}
}

fn tool_starts(value: &Value) -> Vec<ClaudeEvent> {
	content_blocks(value, "tool_use")
		.map(|block| ClaudeEvent::ToolStart {
			id: str_field(block, "id"),
			name: str_field(block, "name"),
			input: block["input"].clone(),
		})
		.collect()
}

fn tool_results(value: &Value) -> Vec<ClaudeEvent> {
	content_blocks(value, "tool_result")
		.map(|block| ClaudeEvent::ToolResult {
			id: str_field(block, "tool_use_id"),
			is_error: block["is_error"].as_bool().unwrap_or(false),
			summary: result_text(&block["content"]).chars().take(TOOL_RESULT_SUMMARY_CHARS).collect(),
		})
		.collect()
}

/// The blocks of `message.content` with the given `type`. A string content
/// (a plain user message) has none.
fn content_blocks<'a>(value: &'a Value, kind: &'a str) -> impl Iterator<Item = &'a Value> {
	value["message"]["content"]
		.as_array()
		.into_iter()
		.flatten()
		.filter(move |block| block["type"] == kind)
}

/// A tool result's content: a string, or blocks whose text parts are joined
/// with newlines (images and other blocks are left out).
fn result_text(content: &Value) -> String {
	match content {
		Value::String(text) => text.clone(),
		Value::Array(blocks) => blocks
			.iter()
			.filter(|b| b["type"] == "text")
			.filter_map(|b| b["text"].as_str())
			.collect::<Vec<_>>()
			.join("\n"),
		_ => String::new(),
	}
}

fn str_field(value: &Value, key: &str) -> String {
	value[key].as_str().unwrap_or_default().to_string()
}

fn strings(value: &Value) -> Vec<String> {
	value
		.as_array()
		.into_iter()
		.flatten()
		.filter_map(|v| v.as_str().map(str::to_string))
		.collect()
}
