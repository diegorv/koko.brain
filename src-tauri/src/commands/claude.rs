//! The user's `claude` CLI (Claude Code): detection for the Settings status,
//! and the agent panel's turns (ADR-0038). `stream` parses a turn's stdout,
//! `turn` spawns and cancels it, `shell_env` captures the login shell
//! environment a turn runs with.
//!
//! A macOS app launched from Finder does not inherit the login shell PATH, so
//! the status check and a turn both search the captured login shell PATH (or,
//! when the capture failed, ask the login shell) before trying the known
//! install paths, and run `claude` with that env.
//! Processes are spawned with `std::process::Command`; the app does not use
//! `tauri-plugin-shell`.

pub mod shell_env;
pub mod stream;
pub mod turn;

use crate::events::CLAUDE_EVENT;
use crate::utils::logger::debug_log;
use serde::Serialize;
use shell_env::{clean_base, turn_env, EnvVars, ShellEnv, TurnEnv};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tauri::Emitter;
use turn::{run_turn_with, ClaudeRuns, ClaudeTurnRequest};

/// How long `claude --version` and the login-shell lookup may run.
pub const VERSION_TIMEOUT: Duration = Duration::from_secs(5);

/// Login shell used when `$SHELL` is unset or empty (the macOS default).
const FALLBACK_SHELL: &str = "/bin/zsh";

/// Env var Claude Code sets in its own sessions; a child `claude` that sees it
/// refuses to start as a nested session.
const NESTED_SESSION_ENV: &str = "CLAUDECODE";

/// Result of looking for the `claude` binary.
#[derive(Debug, PartialEq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
	/// True only when a binary was found and answered `claude --version`.
	pub installed: bool,
	/// The binary that was found or the override that was checked; `null`
	/// when nothing was found.
	pub path: Option<String>,
	/// First line of `claude --version`, e.g. `2.1.325 (Claude Code)`.
	pub version: Option<String>,
	/// Why the binary is not usable; `null` when `installed` is true.
	pub error: Option<String>,
}

/// The known install locations, in lookup order. The two home-relative
/// entries are left out when `home` is unknown.
pub fn default_candidates(home: Option<&Path>) -> Vec<PathBuf> {
	let mut out = Vec::new();
	if let Some(home) = home {
		out.push(home.join(".local/bin/claude"));
		out.push(home.join(".claude/local/claude"));
	}
	out.push(PathBuf::from("/opt/homebrew/bin/claude"));
	out.push(PathBuf::from("/usr/local/bin/claude"));
	out
}

/// The user's login shell: `$SHELL`, else `/bin/zsh`.
pub fn login_shell() -> PathBuf {
	shell_from_env(std::env::var_os("SHELL"))
}

/// The login shell for a given `$SHELL` value: the value when non-empty,
/// else `/bin/zsh`.
pub fn shell_from_env(shell: Option<OsString>) -> PathBuf {
	match shell {
		Some(shell) if !shell.is_empty() => PathBuf::from(shell),
		_ => PathBuf::from(FALLBACK_SHELL),
	}
}

/// The `claude --version` command, run with `env` only (as a turn is), minus
/// the nested-session env var.
pub fn version_command(binary: &Path, env: &EnvVars) -> Command {
	let mut cmd = Command::new(binary);
	cmd.arg("--version").env_clear().envs(env).env_remove(NESTED_SESSION_ENV);
	cmd
}

/// The env a status check uses: the cached login shell capture (capturing
/// first when there is none), recaptured first when `refresh` is true, or
/// the fallback built from `base` when the capture failed. Only the Settings
/// section asks for a refresh, so the panel's check on mount never reruns
/// the login shell.
pub fn status_env(shell_env: &ShellEnv, refresh: bool, base: &EnvVars) -> TurnEnv {
	if refresh {
		shell_env.refresh();
	}
	turn_env(shell_env.get(), base)
}

/// Looks for `claude` with [`resolve_turn_claude`] on `env` and asks it for
/// its version with that env, so the status reports the binary a turn would
/// run. A refused override is reported without running anything.
pub fn claude_status_with(
	override_path: &str,
	env: &TurnEnv,
	shell: &Path,
	candidates: &[PathBuf],
	timeout: Duration,
) -> ClaudeStatus {
	let override_path = override_path.trim();
	let binary = match resolve_turn_claude(override_path, env, shell, candidates, timeout) {
		Ok(binary) => binary,
		Err(error) => {
			return ClaudeStatus {
				installed: false,
				path: (!override_path.is_empty()).then(|| override_path.to_string()),
				version: None,
				error: Some(error),
			}
		}
	};

	// An override is reported as typed; a found binary by where it was found.
	let path = Some(if override_path.is_empty() {
		binary.to_string_lossy().into_owned()
	} else {
		override_path.to_string()
	});
	match read_version(&binary, &env.vars, timeout) {
		Ok(version) => ClaudeStatus { installed: true, path, version: Some(version), error: None },
		Err(error) => ClaudeStatus { installed: false, path, version: None, error: Some(error) },
	}
}

/// The `claude` binary for the fallback env, and the override check of
/// [`resolve_turn_claude`], so no command ever spawns a path the renderer
/// sent unchecked.
///
/// Order: `override_path` when non-blank, then `shell -lc 'command -v claude'`,
/// then the first executable of `candidates`. An override must be an absolute
/// path to an executable file named `claude`, with no fallback when it is not:
/// the commands that take it can then only run a `claude` binary, never a
/// generic one such as `/bin/sh`. A relative path would resolve against the
/// app's cwd and `~` is not expanded, so both are refused. The directory is
/// canonicalized but the file name is kept, because the native installer's
/// `~/.local/bin/claude` is a symlink to `versions/<version>`.
pub fn resolve_claude(
	override_path: &str,
	shell: &Path,
	candidates: &[PathBuf],
	timeout: Duration,
) -> Result<PathBuf, String> {
	let override_path = override_path.trim();
	if override_path.is_empty() {
		return lookup_login_shell(shell, timeout)
			.or_else(|| first_executable(candidates))
			.ok_or_else(|| "claude was not found on the login shell PATH or in the known install locations".into());
	}
	let path = Path::new(override_path);
	if !path.is_absolute() {
		return Err(format!(
			"The override path must be an absolute path to a file named claude (~ is not expanded): {override_path}"
		));
	}
	let canonical = match (path.parent(), path.file_name()) {
		(Some(parent), Some(name)) => std::fs::canonicalize(parent).ok().map(|dir| (dir.join(name), name)),
		_ => None,
	};
	match canonical {
		Some((binary, name)) if is_executable_file(&binary) => {
			if name == "claude" {
				Ok(binary)
			} else {
				Err(format!("The override path is not an executable file named claude: {override_path}"))
			}
		}
		_ => Err(format!("The override path is not an executable file: {override_path}")),
	}
}

/// The `claude` binary for a turn run with `env`. Order: `override_path` as
/// in [`resolve_claude`], then a file named `claude` in an absolute directory
/// of the env's `PATH`, then, for a captured env, the first executable of
/// `candidates`, or, for the fallback env, [`resolve_claude`]'s login-shell
/// lookup and candidates. A captured env therefore runs no extra shell.
pub fn resolve_turn_claude(
	override_path: &str,
	env: &TurnEnv,
	shell: &Path,
	candidates: &[PathBuf],
	timeout: Duration,
) -> Result<PathBuf, String> {
	if !override_path.trim().is_empty() {
		return resolve_claude(override_path, shell, candidates, timeout);
	}
	let on_path = env.vars.get(&OsString::from("PATH")).and_then(|path| {
		std::env::split_paths(path)
			.filter(|dir| dir.is_absolute())
			.map(|dir| dir.join("claude"))
			.find(|binary| is_executable_file(binary))
	});
	match on_path {
		Some(binary) => Ok(binary),
		None if env.captured => first_executable(candidates)
			.ok_or_else(|| "claude was not found on the login shell PATH or in the known install locations".into()),
		None => resolve_claude("", shell, candidates, timeout),
	}
}

/// Checks the Settings override, or finds `claude` the way a turn does, and
/// reports its version. Runs off the async runtime because it waits for the
/// login shell environment capture (up to its deadline), and `--version`
/// blocks for up to `VERSION_TIMEOUT`.
///
/// `refresh_env` recaptures the login shell environment first, so opening the
/// Claude Code settings or "Check again" picks up rc file edits; a failed
/// recapture keeps the last good one. The panel passes false.
#[tauri::command]
pub async fn claude_status(
	shell_env: tauri::State<'_, ShellEnv>,
	binary_path: String,
	refresh_env: bool,
) -> Result<ClaudeStatus, String> {
	let shell_env = shell_env.inner().clone();
	tokio::task::spawn_blocking(move || {
		let env = status_env(&shell_env, refresh_env, &clean_base(std::env::vars_os()));
		let home = std::env::var_os("HOME").map(PathBuf::from);
		claude_status_with(&binary_path, &env, &login_shell(), &default_candidates(home.as_deref()), VERSION_TIMEOUT)
	})
	.await
	.map_err(|e| format!("claude_status task failed: {e}"))
}

/// Starts an agent turn and returns its run id; events arrive on
/// `claude-event` as `{ runId, event }`, ending with `Done`. Fails, with
/// nothing spawned, when the binary is refused or missing or the vault
/// already has a turn running. Runs off the async runtime because it waits
/// for the login shell environment capture (up to its deadline) before
/// spawning, so `claude` and its MCP servers never start with the app's env.
#[tauri::command]
pub async fn claude_run_turn(
	app: tauri::AppHandle,
	runs: tauri::State<'_, ClaudeRuns>,
	shell_env: tauri::State<'_, ShellEnv>,
	request: ClaudeTurnRequest,
) -> Result<String, String> {
	let runs = runs.inner().clone();
	let shell_env = shell_env.inner().clone();
	tokio::task::spawn_blocking(move || {
		let env = turn_env(shell_env.get(), &clean_base(std::env::vars_os()));
		let home = std::env::var_os("HOME").map(PathBuf::from);
		let candidates = default_candidates(home.as_deref());
		run_turn_with(&runs, request, &env, &login_shell(), &candidates, move |payload| {
			if let Err(e) = app.emit(CLAUDE_EVENT, &payload) {
				debug_log("CLAUDE", format!("emit failed: {e}"));
			}
		})
	})
	.await
	.map_err(|e| format!("claude_run_turn task failed: {e}"))?
}

/// Kills a running turn and its process group. No-op for an unknown or
/// finished run.
#[tauri::command]
pub fn claude_cancel_turn(runs: tauri::State<'_, ClaudeRuns>, run_id: String) {
	runs.cancel(&run_id);
}

/// Asks the login shell for `claude`. Takes the last non-empty stdout line,
/// since rc files may print first, and keeps it only when it is an absolute
/// path to an executable file (an alias or function prints something else).
fn lookup_login_shell(shell: &Path, timeout: Duration) -> Option<PathBuf> {
	let mut cmd = Command::new(shell);
	cmd.args(["-lc", "command -v claude"]).env_remove(NESTED_SESSION_ENV);
	let output = run_with_timeout(cmd, timeout).ok()?;
	if !output.status.success() {
		return None;
	}
	let stdout = String::from_utf8_lossy(&output.stdout);
	let line = stdout.lines().map(str::trim).rfind(|l| !l.is_empty())?;
	let path = PathBuf::from(line);
	(path.is_absolute() && is_executable_file(&path)).then_some(path)
}

fn first_executable(candidates: &[PathBuf]) -> Option<PathBuf> {
	candidates.iter().find(|p| is_executable_file(p)).cloned()
}

fn read_version(binary: &Path, env: &EnvVars, timeout: Duration) -> Result<String, String> {
	let output = run_with_timeout(version_command(binary, env), timeout)?;
	if !output.status.success() {
		let stderr = String::from_utf8_lossy(&output.stderr);
		return Err(format!("`claude --version` failed ({}): {}", output.status, stderr.trim()));
	}
	String::from_utf8_lossy(&output.stdout)
		.lines()
		.next()
		.map(str::trim)
		.filter(|l| !l.is_empty())
		.map(str::to_string)
		.ok_or_else(|| "`claude --version` printed nothing".to_string())
}

/// Runs `cmd` to completion, killing it once `timeout` passes. Output is
/// read after exit, which suits the few lines `--version` and `command -v`
/// print.
///
/// Known limit: the timeout covers the child only. If it leaves a background
/// process holding the stdout/stderr pipe (e.g. a login rc file that starts a
/// daemon), `wait_with_output` blocks until that process closes the pipe.
fn run_with_timeout(mut cmd: Command, timeout: Duration) -> Result<Output, String> {
	let mut child = cmd
		.stdin(Stdio::null())
		.stdout(Stdio::piped())
		.stderr(Stdio::piped())
		.spawn()
		.map_err(|e| format!("could not start {:?}: {e}", cmd.get_program()))?;
	let deadline = Instant::now() + timeout;
	loop {
		match child.try_wait() {
			Ok(Some(_)) => {
				return child
					.wait_with_output()
					.map_err(|e| format!("could not read the output of {:?}: {e}", cmd.get_program()))
			}
			Ok(None) if Instant::now() >= deadline => {
				let _ = child.kill();
				let _ = child.wait();
				return Err(format!("{:?} timed out after {timeout:?}", cmd.get_program()));
			}
			Ok(None) => thread::sleep(Duration::from_millis(20)),
			Err(e) => return Err(format!("could not wait for {:?}: {e}", cmd.get_program())),
		}
	}
}

#[cfg(unix)]
fn is_executable_file(path: &Path) -> bool {
	use std::os::unix::fs::PermissionsExt;
	std::fs::metadata(path).is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
}

#[cfg(not(unix))]
fn is_executable_file(path: &Path) -> bool {
	std::fs::metadata(path).is_ok_and(|m| m.is_file())
}
