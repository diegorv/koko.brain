//! One agent turn = one `claude -p` process (ADR-0038): build its args, spawn
//! it in the vault, stream its stdout through `stream::dispatch_line` to an
//! event sink, and kill it on cancel.
//!
//! Std threads, not tokio: a run is two blocking pipe readers and a `wait`.

use super::stream::{dispatch_line, ClaudeEvent, StreamState};
use super::shell_env::{EnvVars, TurnEnv};
use super::{resolve_turn_claude, NESTED_SESSION_ENV, VERSION_TIMEOUT};
use crate::utils::logger::debug_log;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

/// How many trailing stderr lines go into the `Error` event text.
const STDERR_TAIL_LINES: usize = 20;

/// How long `finish` waits for stderr to close once claude has exited. A
/// process claude started (a stdio MCP server, a background job) can keep the
/// pipe open after claude is gone; past this, `Done` goes out without the
/// rest of the tail.
const STDERR_DRAIN_TIMEOUT: Duration = Duration::from_secs(2);

/// What the agent panel asks for one turn.
#[derive(Debug, Clone, Deserialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeTurnRequest {
	/// Absolute vault root; the process runs there.
	pub vault_path: String,
	/// The text as typed. A leading `/name` stays first so the CLI expands
	/// the skill or command.
	pub prompt: String,
	/// Session to continue (`--resume`); blank or absent starts a new one.
	#[serde(default)]
	#[ts(optional)]
	pub resume_session_id: Option<String>,
	/// Model for `--model`; blank or absent keeps the CLI default.
	#[serde(default)]
	#[ts(optional)]
	pub model: Option<String>,
	/// Vault-relative paths of the notes attached as context; may be empty.
	pub context_note_paths: Vec<String>,
	/// The Settings override for the `claude` binary; blank = auto lookup.
	pub binary_path: String,
}

/// Payload of every `claude-event`.
#[derive(Debug, Clone, PartialEq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeEventPayload {
	/// The run the event belongs to, as `claude_run_turn` returned it.
	pub run_id: String,
	/// The event.
	pub event: ClaudeEvent,
}

/// The `--append-system-prompt` text: the vault root, and the attached notes
/// when there are any. Context goes here, never in front of the prompt.
pub fn system_prompt(vault_root: &str, context_note_paths: &[String]) -> String {
	let mut text = format!(
		"You are working in the user's Kokobrain notes vault, a folder of Markdown notes at {vault_root}. \
		 Note paths are relative to that folder."
	);
	if !context_note_paths.is_empty() {
		text.push_str("\nThe user attached these notes as context; read them when the request needs them:");
		for path in context_note_paths {
			text.push_str("\n- ");
			text.push_str(path);
		}
	}
	text
}

/// The CLI args of a turn. The settings sources stay at the CLI default, so
/// skills, plugins, hooks and MCP servers load as in the terminal.
pub fn build_args(request: &ClaudeTurnRequest) -> Vec<String> {
	let mut args: Vec<String> = [
		"-p",
		&request.prompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--include-partial-messages",
		"--permission-mode",
		"bypassPermissions",
	]
	.map(str::to_string)
	.to_vec();
	if let Some(id) = non_blank(&request.resume_session_id) {
		args.extend(["--resume".to_string(), id.to_string()]);
	}
	if let Some(model) = non_blank(&request.model) {
		args.extend(["--model".to_string(), model.to_string()]);
	}
	args.extend([
		"--append-system-prompt".to_string(),
		system_prompt(&request.vault_path, &request.context_note_paths),
	]);
	args
}

/// The process of a turn: cwd = vault, exactly `env` (none of the app's own
/// variables) minus `CLAUDECODE`, stdin closed, stdout and stderr piped
/// separately, in its own process group so cancel also kills the tools it
/// started.
pub fn turn_command(binary: &Path, request: &ClaudeTurnRequest, env: &EnvVars) -> Command {
	let mut cmd = Command::new(binary);
	cmd.args(build_args(request))
		.current_dir(&request.vault_path)
		.env_clear()
		.envs(env)
		.env_remove(NESTED_SESSION_ENV)
		.stdin(Stdio::null())
		.stdout(Stdio::piped())
		.stderr(Stdio::piped());
	#[cfg(unix)]
	{
		use std::os::unix::process::CommandExt;
		cmd.process_group(0);
	}
	cmd
}

struct Run {
	vault_path: String,
	pid: u32,
	cancelled: Arc<AtomicBool>,
}

/// The running turns, keyed by run id (Tauri managed state). A run removes
/// itself when its stdout closes, before the process is reaped, so `cancel`
/// never signals a reused process group.
#[derive(Clone, Default)]
pub struct ClaudeRuns {
	runs: Arc<Mutex<HashMap<String, Run>>>,
}

impl ClaudeRuns {
	/// Kills the run's process group. No-op for an unknown or finished run.
	pub fn cancel(&self, run_id: &str) {
		let runs = self.lock();
		let Some(run) = runs.get(run_id) else { return };
		run.cancelled.store(true, Ordering::SeqCst);
		kill_group(run.pid);
	}

	/// True when no turn is running.
	pub fn is_empty(&self) -> bool {
		self.lock().is_empty()
	}

	fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<String, Run>> {
		self.runs.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
	}
}

/// Resolves the binary on `env` and starts a turn with `env`; returns its run
/// id at once while the events stream to `sink` from a background thread.
///
/// Returns an error, with nothing spawned, when the binary is refused or
/// missing, or when the vault already has a turn running. Once a run id
/// exists every outcome is an event, and `Done` is always the last one: a
/// spawn failure sends `Error` and `Done` before this returns.
pub fn run_turn_with<F>(
	runs: &ClaudeRuns,
	request: ClaudeTurnRequest,
	env: &TurnEnv,
	shell: &Path,
	candidates: &[PathBuf],
	sink: F,
) -> Result<String, String>
where
	F: Fn(ClaudeEventPayload) + Send + 'static,
{
	let binary = resolve_turn_claude(&request.binary_path, env, shell, candidates, VERSION_TIMEOUT)?;
	let run_id = uuid::Uuid::new_v4().to_string();
	let emit = {
		let run_id = run_id.clone();
		move |event: ClaudeEvent| sink(ClaudeEventPayload { run_id: run_id.clone(), event })
	};

	// The lock spans the check and the insert, so two calls for one vault
	// cannot both start.
	let mut map = runs.lock();
	if map.values().any(|run| run.vault_path == request.vault_path) {
		return Err("A Claude turn is already running for this vault".into());
	}
	let mut child = match turn_command(&binary, &request, &env.vars).spawn() {
		Ok(child) => child,
		Err(e) => {
			drop(map);
			debug_log("CLAUDE", format!("spawn of {} failed: {e}", binary.display()));
			emit(ClaudeEvent::Error { message: format!("could not start {}: {e}", binary.display()) });
			emit(ClaudeEvent::Done { exit_code: None });
			return Ok(run_id);
		}
	};
	let cancelled = Arc::new(AtomicBool::new(false));
	map.insert(
		run_id.clone(),
		Run { vault_path: request.vault_path.clone(), pid: child.id(), cancelled: cancelled.clone() },
	);
	drop(map);
	debug_log("CLAUDE", format!("run {run_id} started: pid {}", child.id()));

	let stdout = child.stdout.take().expect("stdout is piped");
	let stderr = child.stderr.take().expect("stderr is piped");
	let (stderr_tx, stderr_tail) = mpsc::channel();
	thread::spawn(move || {
		let _ = stderr_tx.send(read_stderr(stderr));
	});
	let runs = runs.clone();
	let id = run_id.clone();
	thread::spawn(move || {
		let mut state = StreamState::default();
		let mut reader = BufReader::new(stdout);
		let mut buf = Vec::new();
		loop {
			buf.clear();
			match reader.read_until(b'\n', &mut buf) {
				Ok(0) => break,
				Ok(_) => {
					for event in dispatch_line(&String::from_utf8_lossy(&buf), &mut state) {
						emit(event);
					}
				}
				Err(e) => {
					debug_log("CLAUDE", format!("run {id}: stdout read failed: {e}"));
					break;
				}
			}
		}
		runs.lock().remove(&id);
		finish(child, stderr_tail, &cancelled, state.saw_result, &id, emit);
	});
	Ok(run_id)
}

/// Reaps the process and sends the closing events: `Error` when it exited
/// non-zero with no `result` and was not cancelled, then `Done`.
fn finish(
	mut child: Child,
	stderr_tail: Receiver<VecDeque<String>>,
	cancelled: &AtomicBool,
	saw_result: bool,
	run_id: &str,
	emit: impl Fn(ClaudeEvent),
) {
	let status = child.wait();
	let stderr_tail = stderr_tail.recv_timeout(STDERR_DRAIN_TIMEOUT).unwrap_or_else(|_| {
		debug_log("CLAUDE", format!("run {run_id}: stderr still open after exit, sending Done without it"));
		VecDeque::new()
	});
	let exit_code = match &status {
		Ok(status) => {
			debug_log("CLAUDE", format!("run {run_id} exited: {status}"));
			if !status.success() && !saw_result && !cancelled.load(Ordering::SeqCst) {
				let mut message = format!("claude exited with {status}");
				if !stderr_tail.is_empty() {
					message.push_str(":\n");
					message.push_str(&Vec::from(stderr_tail).join("\n"));
				}
				emit(ClaudeEvent::Error { message });
			}
			status.code()
		}
		Err(e) => {
			emit(ClaudeEvent::Error { message: format!("could not wait for claude: {e}") });
			None
		}
	};
	emit(ClaudeEvent::Done { exit_code });
}

/// Logs every stderr line and returns the last `STDERR_TAIL_LINES`.
fn read_stderr(stderr: impl Read) -> VecDeque<String> {
	let mut tail = VecDeque::new();
	let mut reader = BufReader::new(stderr);
	let mut buf = Vec::new();
	while matches!(reader.read_until(b'\n', &mut buf), Ok(n) if n > 0) {
		let line = String::from_utf8_lossy(&buf).trim_end().to_string();
		buf.clear();
		if line.is_empty() {
			continue;
		}
		debug_log("CLAUDE", format!("stderr: {line}"));
		if tail.len() == STDERR_TAIL_LINES {
			tail.pop_front();
		}
		tail.push_back(line);
	}
	tail
}

#[cfg(unix)]
fn kill_group(pid: u32) {
	// The child leads its own group (`process_group(0)`), so its pid is the
	// group id. Callers hold the runs lock and the run is still listed, so
	// the child has not been reaped and the id cannot be reused yet.
	let Ok(pgid) = libc::pid_t::try_from(pid) else { return };
	if unsafe { libc::killpg(pgid, libc::SIGKILL) } != 0 {
		debug_log("CLAUDE", format!("killpg {pgid} failed: {}", std::io::Error::last_os_error()));
	}
}

#[cfg(not(unix))]
fn kill_group(pid: u32) {
	debug_log("CLAUDE", format!("cancel is not supported on this platform (pid {pid})"));
}

fn non_blank(value: &Option<String>) -> Option<&str> {
	value.as_deref().map(str::trim).filter(|v| !v.is_empty())
}
