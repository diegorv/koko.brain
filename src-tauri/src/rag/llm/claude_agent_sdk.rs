//! Provider that runs the user's local `claude` CLI as a subprocess and
//! streams text deltas back through the standard `LlmProvider` interface.
//!
//! Authentication piggybacks on whatever the user already has set up for
//! Claude Code: OAuth-backed Pro/Max subscription, an `ANTHROPIC_API_KEY`
//! env var, or a long-lived token. We never read or store credentials — the
//! CLI handles all of that on its own.
//!
//! ## Why a subprocess and not the HTTP API?
//!
//! Anthropic's HTTP API requires an API key (paid). The `claude` CLI is the
//! only sanctioned entry point for using a personal subscription
//! programmatically, and the CLI is the official surface of the Claude
//! Agent SDK runtime. Shelling out to it sidesteps the API key requirement
//! at the cost of an extra process boundary (~200 ms overhead per call).
//!
//! ## Output parsing
//!
//! We launch the CLI with `--output-format stream-json --include-partial-messages`,
//! which emits Anthropic-API-style streaming events wrapped in a `stream_event`
//! envelope. We filter for `content_block_delta` events whose delta type is
//! `text_delta`, deliberately dropping `thinking_delta` chunks so the user
//! only sees the final answer text. A `result` event with `is_error: true`
//! is surfaced as a stream error.

use crate::rag::config::ClaudeConfig;
use crate::rag::llm::prompt::{build_user_message, SYSTEM_PROMPT};
use crate::rag::llm::{LlmProvider, TokenStream};
use crate::rag::retrieval::RetrievedChunk;
use async_trait::async_trait;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio_stream::wrappers::UnboundedReceiverStream;

const DEFAULT_BINARY: &str = "claude";

/// Claude provider backed by the local `claude` CLI subprocess.
pub struct ClaudeAgentSdkProvider {
	binary_path: String,
	model: String,
	effort: Option<String>,
}

impl ClaudeAgentSdkProvider {
	pub fn new(model: &str, config: &ClaudeConfig) -> Self {
		Self {
			binary_path: config
				.binary_path
				.clone()
				.unwrap_or_else(|| DEFAULT_BINARY.to_string()),
			model: model.to_string(),
			effort: config.effort.clone(),
		}
	}

	/// Builds the `claude` command with all the flags that make it behave as
	/// a pure chat-completion client: no tools, no slash commands, no session
	/// persistence, no settings discovery, and our RAG system prompt instead
	/// of the default Claude Code one.
	fn build_command(&self, cwd: &std::path::Path) -> Command {
		let mut cmd = Command::new(&self.binary_path);
		cmd.arg("--print")
			.arg("--output-format")
			.arg("stream-json")
			.arg("--include-partial-messages")
			.arg("--verbose")
			.arg("--no-session-persistence")
			.arg("--disable-slash-commands")
			.arg("--exclude-dynamic-system-prompt-sections")
			.arg("--setting-sources")
			.arg("user")
			.arg("--system-prompt")
			.arg(SYSTEM_PROMPT)
			.arg("--model")
			.arg(&self.model)
			.arg("--tools")
			.arg("");
		if let Some(effort) = &self.effort {
			cmd.arg("--effort").arg(effort);
		}
		cmd.current_dir(cwd)
			.stdin(Stdio::piped())
			.stdout(Stdio::piped())
			.stderr(Stdio::piped());
		cmd
	}
}

#[async_trait]
impl LlmProvider for ClaudeAgentSdkProvider {
	async fn chat_stream(
		&self,
		query: &str,
		chunks: &[RetrievedChunk],
	) -> Result<TokenStream, String> {
		let user_text = build_user_message(query, chunks);
		// Spawn from the OS temp dir so CLAUDE.md auto-discovery has nothing
		// to find and we don't accidentally pull project context into the
		// system prompt.
		let cwd = std::env::temp_dir();

		let mut cmd = self.build_command(&cwd);
		let mut child = cmd.spawn().map_err(|e| {
			format!(
				"Failed to spawn `{}`: {e}. Install Claude Code (https://claude.com/claude-code) \
				 and ensure it is on PATH, or set `llm.claude.binary_path` in rag.toml.",
				self.binary_path
			)
		})?;

		let mut stdin = child
			.stdin
			.take()
			.ok_or_else(|| "Failed to capture claude stdin".to_string())?;
		stdin
			.write_all(user_text.as_bytes())
			.await
			.map_err(|e| format!("Failed to write prompt to claude stdin: {e}"))?;
		drop(stdin); // Closes the pipe so the CLI knows the prompt is complete.

		let stdout = child
			.stdout
			.take()
			.ok_or_else(|| "Failed to capture claude stdout".to_string())?;
		let stderr = child
			.stderr
			.take()
			.ok_or_else(|| "Failed to capture claude stderr".to_string())?;

		let (tx, rx) = mpsc::unbounded_channel::<Result<String, String>>();
		let tx_stdout = tx.clone();
		let tx_wait = tx;

		// Drain stderr fully into a String. The handle lets the wait task
		// await complete drainage before formatting the final error — the
		// kernel pipe can still hold data after `child.wait()` returns.
		let stderr_handle = tokio::spawn(async move {
			let mut reader = BufReader::new(stderr).lines();
			let mut collected = String::new();
			while let Ok(Some(line)) = reader.next_line().await {
				collected.push_str(&line);
				collected.push('\n');
			}
			collected
		});

		// Parse stdout line-by-line and emit each text delta.
		tokio::spawn(async move {
			let mut reader = BufReader::new(stdout).lines();
			while let Ok(Some(line)) = reader.next_line().await {
				if let Some(result) = parse_stream_json_line(&line) {
					if tx_stdout.send(result).is_err() {
						break;
					}
				}
			}
		});

		// Surface non-zero exit codes (with any accumulated stderr) as the
		// stream's final error.
		tokio::spawn(async move {
			match child.wait().await {
				Ok(status) if status.success() => {
					// Successful run still drains stderr to avoid leaking
					// the task, but we don't surface its content.
					let _ = stderr_handle.await;
				}
				Ok(status) => {
					let stderr_text = stderr_handle.await.unwrap_or_default();
					let suffix = if stderr_text.trim().is_empty() {
						String::new()
					} else {
						format!(" Stderr: {}", stderr_text.trim())
					};
					let _ = tx_wait
						.send(Err(format!("claude CLI exited with {status}.{suffix}")));
				}
				Err(e) => {
					let _ = stderr_handle.await;
					let _ = tx_wait.send(Err(format!("Failed to await claude child: {e}")));
				}
			}
		});

		Ok(Box::pin(UnboundedReceiverStream::new(rx)))
	}
}

/// Parses one line of `--output-format stream-json` into either a text
/// delta, a propagated error, or `None` for events we don't care about
/// (system init, rate-limit info, thinking deltas, hook lifecycle, …).
fn parse_stream_json_line(line: &str) -> Option<Result<String, String>> {
	let trimmed = line.trim();
	if trimmed.is_empty() {
		return None;
	}
	let v: serde_json::Value = serde_json::from_str(trimmed).ok()?;
	let t = v.get("type")?.as_str()?;

	match t {
		"stream_event" => {
			let event = v.get("event")?;
			if event.get("type")?.as_str()? != "content_block_delta" {
				return None;
			}
			let delta = event.get("delta")?;
			if delta.get("type")?.as_str()? != "text_delta" {
				return None;
			}
			let text = delta.get("text")?.as_str()?;
			Some(Ok(text.to_string()))
		}
		"result" => {
			let is_error = v
				.get("is_error")
				.and_then(serde_json::Value::as_bool)
				.unwrap_or(false);
			if !is_error {
				return None;
			}
			let detail = v
				.get("api_error_status")
				.and_then(serde_json::Value::as_str)
				.or_else(|| v.get("result").and_then(serde_json::Value::as_str))
				.unwrap_or("unknown");
			Some(Err(format!("claude CLI reported error: {detail}")))
		}
		_ => None,
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn parser_extracts_text_delta() {
		let line = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"hello"}}}"#;
		assert_eq!(parse_stream_json_line(line), Some(Ok("hello".to_string())));
	}

	#[test]
	fn parser_skips_thinking_delta() {
		let line = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"reasoning here"}}}"#;
		assert_eq!(parse_stream_json_line(line), None);
	}

	#[test]
	fn parser_skips_signature_delta() {
		let line = r#"{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"sig"}}}"#;
		assert_eq!(parse_stream_json_line(line), None);
	}

	#[test]
	fn parser_skips_system_init_and_rate_limit() {
		assert_eq!(
			parse_stream_json_line(r#"{"type":"system","subtype":"init","session_id":"abc"}"#),
			None
		);
		assert_eq!(
			parse_stream_json_line(r#"{"type":"rate_limit_event","rate_limit_info":{}}"#),
			None
		);
	}

	#[test]
	fn parser_skips_message_start_stop() {
		let start = r#"{"type":"stream_event","event":{"type":"message_start","message":{}}}"#;
		let stop = r#"{"type":"stream_event","event":{"type":"message_stop"}}"#;
		assert_eq!(parse_stream_json_line(start), None);
		assert_eq!(parse_stream_json_line(stop), None);
	}

	#[test]
	fn parser_returns_none_on_successful_result() {
		let line = r#"{"type":"result","subtype":"success","is_error":false,"result":"ok"}"#;
		assert_eq!(parse_stream_json_line(line), None);
	}

	#[test]
	fn parser_returns_error_on_error_result() {
		let line = r#"{"type":"result","subtype":"error","is_error":true,"api_error_status":"rate_limited"}"#;
		match parse_stream_json_line(line) {
			Some(Err(msg)) => assert!(msg.contains("rate_limited"), "got: {msg}"),
			other => panic!("expected Err, got {other:?}"),
		}
	}

	#[test]
	fn parser_ignores_blank_and_garbage_lines() {
		assert_eq!(parse_stream_json_line(""), None);
		assert_eq!(parse_stream_json_line("   "), None);
		assert_eq!(parse_stream_json_line("not json"), None);
		assert_eq!(parse_stream_json_line("{}"), None);
	}

	#[test]
	fn build_command_includes_required_flags() {
		let provider = ClaudeAgentSdkProvider::new("sonnet", &ClaudeConfig::default());
		let cmd = provider.build_command(std::path::Path::new("/tmp"));
		let std_cmd = cmd.as_std();
		let args: Vec<String> = std_cmd
			.get_args()
			.map(|s| s.to_string_lossy().into_owned())
			.collect();
		assert!(args.contains(&"--print".to_string()));
		assert!(args.contains(&"stream-json".to_string()));
		assert!(args.contains(&"--include-partial-messages".to_string()));
		assert!(args.contains(&"--no-session-persistence".to_string()));
		assert!(args.contains(&"--system-prompt".to_string()));
		assert!(args.contains(&"--model".to_string()));
		assert!(args.contains(&"sonnet".to_string()));
		assert!(args.contains(&"--tools".to_string()));
	}

	#[test]
	fn build_command_omits_effort_when_unset() {
		let provider = ClaudeAgentSdkProvider::new("haiku", &ClaudeConfig::default());
		let cmd = provider.build_command(std::path::Path::new("/tmp"));
		let std_cmd = cmd.as_std();
		let args: Vec<String> = std_cmd
			.get_args()
			.map(|s| s.to_string_lossy().into_owned())
			.collect();
		assert!(!args.contains(&"--effort".to_string()));
	}

	#[test]
	fn build_command_includes_effort_when_set() {
		let config = ClaudeConfig {
			binary_path: None,
			effort: Some("low".to_string()),
		};
		let provider = ClaudeAgentSdkProvider::new("sonnet", &config);
		let cmd = provider.build_command(std::path::Path::new("/tmp"));
		let std_cmd = cmd.as_std();
		let args: Vec<String> = std_cmd
			.get_args()
			.map(|s| s.to_string_lossy().into_owned())
			.collect();
		assert!(args.contains(&"--effort".to_string()));
		assert!(args.contains(&"low".to_string()));
	}

	#[test]
	fn build_command_respects_custom_binary_path() {
		let config = ClaudeConfig {
			binary_path: Some("/opt/custom/claude".to_string()),
			effort: None,
		};
		let provider = ClaudeAgentSdkProvider::new("sonnet", &config);
		let cmd = provider.build_command(std::path::Path::new("/tmp"));
		let std_cmd = cmd.as_std();
		assert_eq!(std_cmd.get_program().to_string_lossy(), "/opt/custom/claude");
	}
}
