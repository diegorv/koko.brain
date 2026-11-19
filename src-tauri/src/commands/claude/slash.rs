//! The slash menu's command list: one short `claude -p` process that answers
//! an `initialize` control request on stdin with every command's name,
//! description, argument hint and aliases, with no model call.
//!
//! The reply is the user's private setup (skill descriptions come from their
//! own files), so neither it nor any row of it is logged or put in an error.

use super::resolve_turn_claude;
use super::shell_env::{EnvVars, TurnEnv};
use super::turn::ClaudeRuns;
use super::{NESTED_SESSION_ENV, VERSION_TIMEOUT};
use serde::Serialize;
use serde_json::Value;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::thread;
use std::time::{Duration, Instant};

/// How long a request may take, reply and exit together. The reply waits for
/// the user's SessionStart hooks; a slower hook is killed with the request.
pub const SLASH_DEADLINE: Duration = Duration::from_secs(30);

/// How long stdout may stay open once the deadline killed the process group,
/// so the second kill of `ClaudeRuns::cancel` still finds the request listed.
const KILL_GRACE: Duration = Duration::from_secs(2);

/// One command of the CLI's `initialize` reply.
#[derive(Debug, Clone, PartialEq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct SlashCommandInfo {
	/// The name typed after `/`, e.g. `debug` or `plugin:skill`.
	pub name: String,
	/// What the command does, with the CLI's `(user)`, `(project)` or plugin
	/// label; empty when the CLI gives none.
	pub description: String,
	/// The arguments it takes, e.g. `[issue description]`; empty for none.
	pub argument_hint: String,
	/// Other names that run the same command; a skill's internal name is here
	/// when its frontmatter `name` differs from its folder.
	pub aliases: Vec<String>,
}

/// What one stdout line of the request is.
#[derive(Debug, PartialEq)]
pub enum InitializeLine {
	/// Not this request's reply: non-JSON, a hook line, another message, or a
	/// `control_response` to another `request_id`.
	Other,
	/// This request's reply, with its rows.
	Commands(Vec<SlashCommandInfo>),
	/// This request's reply, but an error or not in the expected shape.
	Malformed(String),
}

/// Reads one stdout line of the request whose id is `request_id`. Per row it
/// reads only `name` (required), `description` and `argumentHint` (empty when
/// missing or not a string) and `aliases` (empty when missing or not a string
/// array); other keys are ignored.
pub fn parse_initialize_line(line: &str, request_id: &str) -> InitializeLine {
	let Ok(value) = serde_json::from_str::<Value>(line.trim()) else {
		return InitializeLine::Other;
	};
	if value.get("type").and_then(Value::as_str) != Some("control_response") {
		return InitializeLine::Other;
	}
	let Some(response) = value.get("response") else {
		return InitializeLine::Other;
	};
	if response.get("request_id").and_then(Value::as_str) != Some(request_id) {
		return InitializeLine::Other;
	}
	if response.get("subtype").and_then(Value::as_str) == Some("error") {
		let message = response.get("error").and_then(Value::as_str).unwrap_or("no message");
		return InitializeLine::Malformed(format!("claude refused the initialize request: {message}"));
	}
	let Some(rows) = response.get("response").and_then(|r| r.get("commands")).and_then(Value::as_array) else {
		return InitializeLine::Malformed("the initialize reply has no commands list".into());
	};
	match rows.iter().map(parse_row).collect::<Option<Vec<_>>>() {
		Some(commands) => InitializeLine::Commands(commands),
		None => InitializeLine::Malformed("a command in the initialize reply has no name".into()),
	}
}

fn parse_row(row: &Value) -> Option<SlashCommandInfo> {
	let text = |key: &str| row.get(key).and_then(Value::as_str).unwrap_or_default().to_string();
	let aliases = row
		.get("aliases")
		.and_then(Value::as_array)
		.and_then(|items| items.iter().map(|a| a.as_str().map(str::to_string)).collect::<Option<Vec<_>>>())
		.unwrap_or_default();
	Some(SlashCommandInfo {
		name: row.get("name")?.as_str()?.to_string(),
		description: text("description"),
		argument_hint: text("argumentHint"),
		aliases,
	})
}

/// The CLI args of a request. The settings sources stay at the CLI default,
/// so the user's hooks run as in a turn; `--no-session-persistence` leaves no
/// session file behind.
pub fn slash_args() -> Vec<&'static str> {
	vec![
		"-p",
		"--input-format",
		"stream-json",
		"--output-format",
		"stream-json",
		"--verbose",
		"--no-session-persistence",
	]
}

/// The stdin line that asks for the command list.
pub fn initialize_request(request_id: &str) -> String {
	let mut line = serde_json::json!({
		"type": "control_request",
		"request_id": request_id,
		"request": { "subtype": "initialize" },
	})
	.to_string();
	line.push('\n');
	line
}

/// The process of a request: as a turn's (cwd = vault, exactly `env` minus
/// `CLAUDECODE`, its own process group), but with stdin piped for the control
/// request and stderr discarded, since nothing of it is logged.
pub fn slash_command(binary: &Path, vault_path: &str, env: &EnvVars) -> Command {
	let mut cmd = Command::new(binary);
	cmd.args(slash_args())
		.current_dir(vault_path)
		.env_clear()
		.envs(env)
		.env_remove(NESTED_SESSION_ENV)
		.stdin(Stdio::piped())
		.stdout(Stdio::piped())
		.stderr(Stdio::null());
	#[cfg(unix)]
	{
		use std::os::unix::process::CommandExt;
		cmd.process_group(0);
	}
	cmd
}

/// Resolves the binary on `env` as a turn does and asks it for its command
/// list, in `vault_path`. The process is listed in `runs` while it runs, so
/// the app's exit kills its group.
///
/// Writes one initialize request, parses stdout until its reply, then closes
/// stdin and reads stdout to EOF without parsing (hooks can print after the
/// reply). `deadline` covers the reply and the exit: past it the group is
/// killed, and the rows are returned if the reply came, an error otherwise.
pub fn slash_commands_with(
	runs: &ClaudeRuns,
	binary_path: &str,
	vault_path: &str,
	env: &TurnEnv,
	shell: &Path,
	candidates: &[PathBuf],
	deadline: Duration,
) -> Result<Vec<SlashCommandInfo>, String> {
	let binary = resolve_turn_claude(binary_path, env, shell, candidates, VERSION_TIMEOUT)?;
	let deadline_at = Instant::now() + deadline;
	let (id, mut child) = runs
		.spawn_listed(slash_command(&binary, vault_path, &env.vars))
		.map_err(|e| format!("could not start {}: {e}", binary.display()))?;

	let stdout = child.stdout.take().expect("stdout is piped");
	let (tx, lines) = mpsc::channel::<Vec<u8>>();
	thread::spawn(move || {
		let mut reader = BufReader::new(stdout);
		loop {
			let mut buf = Vec::new();
			match reader.read_until(b'\n', &mut buf) {
				Ok(n) if n > 0 && tx.send(buf).is_ok() => {}
				_ => break,
			}
		}
	});

	let request_id = uuid::Uuid::new_v4().to_string();
	let mut stdin = child.stdin.take();
	// A failed write is not an error by itself: the process has gone, and the
	// EOF that follows reports it.
	if let Some(pipe) = stdin.as_mut() {
		let _ = pipe.write_all(initialize_request(&request_id).as_bytes()).and_then(|()| pipe.flush());
	}

	let mut reply: Option<Result<Vec<SlashCommandInfo>, String>> = None;
	let mut eof = false;
	while let Some(left) = deadline_at.checked_duration_since(Instant::now()) {
		match lines.recv_timeout(left) {
			Ok(line) => {
				if reply.is_some() {
					continue;
				}
				match parse_initialize_line(&String::from_utf8_lossy(&line), &request_id) {
					InitializeLine::Other => {}
					InitializeLine::Commands(rows) => {
						reply = Some(Ok(rows));
						drop(stdin.take());
					}
					InitializeLine::Malformed(message) => {
						reply = Some(Err(message));
						break;
					}
				}
			}
			Err(RecvTimeoutError::Timeout) => break,
			Err(RecvTimeoutError::Disconnected) => {
				eof = true;
				break;
			}
		}
	}

	if !eof {
		runs.cancel(&id);
		let grace_at = Instant::now() + KILL_GRACE;
		while let Some(left) = grace_at.checked_duration_since(Instant::now()) {
			if lines.recv_timeout(left).is_err() {
				break;
			}
		}
	} else {
		// A closed stdout does not mean the process has exited. It stays listed
		// until it has, so the deadline and the app's exit can still kill it.
		#[cfg(unix)]
		{
			use super::shell_env::exited_unreaped;
			while !exited_unreaped(&child) && Instant::now() < deadline_at {
				thread::sleep(Duration::from_millis(10));
			}
			if !exited_unreaped(&child) {
				runs.cancel(&id);
			}
		}
	}
	// Removed before the reap, so a cancel never signals a reused group.
	runs.remove(&id);
	drop(stdin);
	let status = child.wait();

	match reply {
		Some(result) => result,
		None if eof => Err(match status {
			Ok(status) => format!("claude exited ({status}) without answering the initialize request"),
			Err(e) => format!("could not wait for claude: {e}"),
		}),
		None => Err(format!("claude did not answer the initialize request within {deadline:?}")),
	}
}
