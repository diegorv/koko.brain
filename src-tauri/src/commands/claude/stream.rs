//! Parser for the stdout of `claude -p --output-format stream-json --verbose
//! --include-partial-messages`: one JSON object per line, turned into the
//! normalized `ClaudeEvent`s the agent panel renders.
//!
//! Unknown types and non-JSON lines produce no event, so additions to the CLI
//! format do not break a turn (ADR-0038, Consequences).

use crate::utils::logger::debug_log;
use serde::Serialize;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};

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
	/// Text already sent as `TextDelta` that the CLI abandoned (its stream
	/// failed, stalled or ended early, then it retried or re-sent the request):
	/// remove it from the end of the reply.
	TextRetracted {
		/// The abandoned text, exactly as its `TextDelta`s sent it.
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
		/// Final answer text. For an error with no text: its `errors` joined
		/// with newlines, or else its `subtype`. Empty when the CLI sent none.
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
	/// API id of the response whose `message_start` came last, until its
	/// `message_stop`.
	open_message: Option<String>,
	/// Text streamed for each block of the open response, by block index.
	block_text: BTreeMap<u64, String>,
	/// API ids of the responses that streamed a `text_delta`. Their text
	/// reached the panel as deltas; any other response's text comes only in
	/// its `assistant` messages.
	streamed: HashSet<String>,
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
		Some("stream_event") => stream_event(&value, state).into_iter().collect(),
		Some("assistant") => assistant_events(&value, state),
		Some("user") => tool_results(&value),
		Some("result") => {
			state.saw_result = true;
			vec![ClaudeEvent::Result {
				session_id: str_field(&value, "session_id"),
				text: result_message(&value),
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

/// The text of a `result`; an error without one says why it failed.
fn result_message(value: &Value) -> String {
	let text = str_field(value, "result");
	if !text.is_empty() || value["is_error"] != true {
		return text;
	}
	let errors = strings(&value["errors"]);
	if errors.is_empty() { str_field(value, "subtype") } else { errors.join("\n") }
}

/// Text and thinking deltas, and the retraction of abandoned text. Partial
/// tool input (`input_json_delta`) is left out: `ToolStart` comes from the
/// full `assistant` message.
fn stream_event(line: &Value, state: &mut StreamState) -> Option<ClaudeEvent> {
	let event = &line["event"];
	match event["type"].as_str()? {
		"message_start" => {
			state.open_message = Some(str_field(&event["message"], "id"));
			state.block_text.clear();
			None
		}
		"content_block_delta" => {
			let delta = &event["delta"];
			match delta["type"].as_str()? {
				"text_delta" => {
					let text = delta["text"].as_str()?.to_string();
					// `api_message_id` names the response when its `message_start` was missed.
					let id = state.open_message.clone().or_else(|| line["api_message_id"].as_str().map(str::to_string));
					// With no id the response is unknown; recording "" would hide the text of an id-less assistant message.
					if let Some(id) = id.filter(|id| !id.is_empty()) {
						state.streamed.insert(id);
					}
					if state.open_message.is_some() {
						let index = event["index"].as_u64().unwrap_or_default();
						state.block_text.entry(index).or_default().push_str(&text);
					}
					Some(ClaudeEvent::TextDelta { text })
				}
				"thinking_delta" => Some(ClaudeEvent::ThinkingDelta { text: delta["thinking"].as_str()?.to_string() }),
				_ => None,
			}
		}
		"message_stop" => retracted_text(&line["abandoned_blocks"], state),
		_ => None,
	}
}

/// Closes the open response. When the CLI marked its blocks from
/// `from_block_index` on as abandoned (they never get an `assistant`
/// message), the text they streamed is retracted. `abandoned_blocks` sits on
/// the line, beside `event` (claude 2.1.325).
fn retracted_text(abandoned: &Value, state: &mut StreamState) -> Option<ClaudeEvent> {
	let open = state.open_message.take();
	let blocks = std::mem::take(&mut state.block_text);
	let from = abandoned["from_block_index"].as_u64()?;
	if open.as_deref() != abandoned["api_message_id"].as_str() {
		return None;
	}
	let text: String = blocks.range(from..).map(|(_, text)| text.as_str()).collect();
	(!text.is_empty()).then_some(ClaudeEvent::TextRetracted { text })
}

/// The `tool_use` blocks of an `assistant` message as `ToolStart`s, and its
/// `text` blocks as `TextDelta`s when the response streamed no text: a
/// request the CLI re-sent without streaming has only these messages. A
/// subagent's messages (`parent_tool_use_id` set) are not the reply.
fn assistant_events(value: &Value, state: &StreamState) -> Vec<ClaudeEvent> {
	let send_text = value["parent_tool_use_id"].is_null()
		&& !state.streamed.contains(value["message"]["id"].as_str().unwrap_or_default());
	value["message"]["content"]
		.as_array()
		.into_iter()
		.flatten()
		.filter_map(|block| match block["type"].as_str()? {
			"tool_use" => Some(ClaudeEvent::ToolStart {
				id: str_field(block, "id"),
				name: str_field(block, "name"),
				input: block["input"].clone(),
			}),
			"text" if send_text => {
				let text = block["text"].as_str().filter(|t| !t.is_empty())?;
				Some(ClaudeEvent::TextDelta { text: text.to_string() })
			}
			_ => None,
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
