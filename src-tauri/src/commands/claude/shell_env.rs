//! The environment `claude` runs with: the user's login interactive shell
//! environment, captured once per app run, so the CLI, its Bash tool, hooks
//! and stdio MCP servers see the PATH and exported variables of a terminal.
//! An app started from Finder gets almost none of them, and the app's own env
//! never reaches the child (a dev launch from a terminal or a Claude Code
//! session would pass `CLAUDE_CODE_*`, `ANTHROPIC_*`, `npm_*` along).
//!
//! The capture starts from a clean base env, runs in its own session so a
//! kill reaches every process the rc files started, and has a hard deadline.
//! Research: `.scratch/claude-code-integration/research/login-shell-env/`.

use crate::utils::logger::debug_log;
use std::collections::BTreeMap;
use std::ffi::OsString;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// Environment variables, name to value. Values are kept as bytes, so a
/// non-UTF-8 or multi-line value survives the round trip.
pub type EnvVars = BTreeMap<OsString, OsString>;

/// How long the login shell may take to print its environment.
pub const CAPTURE_TIMEOUT: Duration = Duration::from_secs(10);

/// The PATH of a macOS GUI app, used as the capture's starting PATH.
pub const SYSTEM_PATH: &str = "/usr/bin:/bin:/usr/sbin:/sbin";

/// Login shell used when `$SHELL` is not an absolute path to an executable.
const FALLBACK_SHELL: &str = "/bin/zsh";

/// Most stdout the capture reads; an rc file that loops printing stops here.
const STDOUT_CAP: usize = 4 * 1024 * 1024;

/// How long the shell may take to exit after printing the END marker before
/// its session is killed.
const EXIT_GRACE: Duration = Duration::from_secs(1);

/// App variables the capture starts from, when the app has them (plus
/// `LANG` and `LC_*`).
const BASE_NAMES: [&str; 7] = ["HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "SSH_AUTH_SOCK", "__CF_USER_TEXT_ENCODING"];

/// Set for the capture only, so rc files can tell it apart from a terminal
/// (`KOKOBRAIN_RESOLVING_ENVIRONMENT`) and skip oh-my-zsh's update prompt
/// and tmux autostart.
const INJECTED: [(&str, &str); 4] = [
	("KOKOBRAIN_RESOLVING_ENVIRONMENT", "1"),
	("DISABLE_AUTO_UPDATE", "true"),
	("ZSH_TMUX_AUTOSTART", "false"),
	("ZSH_TMUX_AUTOSTARTED", "true"),
];

/// Variables of the shell itself, or of the app's own Claude Code session,
/// that the child must not inherit.
const SHELL_LOCAL: [&str; 5] = ["PWD", "OLDPWD", "SHLVL", "_", "CLAUDECODE"];

/// Directories the fallback PATH adds, in order, when they exist. `~/` is
/// the base env's `HOME`.
const FALLBACK_DIRS: [&str; 9] = [
	"~/.local/bin",
	"/opt/homebrew/bin",
	"/opt/homebrew/sbin",
	"/usr/local/bin",
	"~/.local/share/mise/shims",
	"~/.asdf/shims",
	"~/.volta/bin",
	"~/.bun/bin",
	"~/.npm-global/bin",
];

/// The env a turn runs `claude` with.
#[derive(Debug, Clone, PartialEq)]
pub struct TurnEnv {
	/// The variables, applied after `env_clear`.
	pub vars: EnvVars,
	/// True when `vars` came from the login shell; false for the fallback,
	/// where the binary lookup still asks the login shell.
	pub captured: bool,
}

/// The clean base env, picked from the app's variables: [`BASE_NAMES`],
/// `LANG` and `LC_*` when present, and `PATH` set to [`SYSTEM_PATH`].
pub fn clean_base(app_vars: impl IntoIterator<Item = (OsString, OsString)>) -> EnvVars {
	let mut base: EnvVars = app_vars
		.into_iter()
		.filter(|(name, _)| {
			let name = name.to_string_lossy();
			BASE_NAMES.contains(&name.as_ref()) || name == "LANG" || name.starts_with("LC_")
		})
		.collect();
	base.insert("PATH".into(), SYSTEM_PATH.into());
	base
}

/// The shell to capture with: `$SHELL` when it is an absolute path to an
/// executable file, else `/bin/zsh`.
pub fn capture_shell(shell: Option<OsString>) -> PathBuf {
	let shell = super::shell_from_env(shell);
	if shell.is_absolute() && super::is_executable_file(&shell) {
		shell
	} else {
		PathBuf::from(FALLBACK_SHELL)
	}
}

/// The variables between the START and END markers of `stdout`, as printed
/// by `env -0`: NUL-separated records, each split at its first `=`. Records
/// with no `=` or an empty name are skipped. `None` when a marker is missing.
pub fn parse(stdout: &[u8], nonce: &str) -> Option<EnvVars> {
	let start = marker(nonce, "START");
	let end = marker(nonce, "END");
	let mut start_record = start.into_bytes();
	start_record.push(0);
	let after_start = find(stdout, &start_record)? + start_record.len();

	let mut vars = EnvVars::new();
	for record in stdout[after_start..].split(|&b| b == 0) {
		if record == end.as_bytes() {
			return Some(vars);
		}
		let Some(eq) = record.iter().position(|&b| b == b'=') else { continue };
		if eq == 0 {
			continue;
		}
		vars.insert(bytes_to_os(record[..eq].to_vec()), bytes_to_os(record[eq + 1..].to_vec()));
	}
	None
}

/// The env `claude` gets: the captured env minus [`SHELL_LOCAL`] and every
/// variable the capture injected.
pub fn child_env(captured: &EnvVars) -> EnvVars {
	captured
		.iter()
		.filter(|(name, _)| {
			let name = name.to_string_lossy();
			!SHELL_LOCAL.contains(&name.as_ref()) && !INJECTED.iter().any(|(injected, _)| *injected == name)
		})
		.map(|(name, value)| (name.clone(), value.clone()))
		.collect()
}

/// The env used when the capture failed: `base` with `PATH` set to the
/// [`FALLBACK_DIRS`] that `is_dir` accepts, then the system dirs. A `~/`
/// entry is left out when `base` has no `HOME`.
pub fn fallback_env(base: &EnvVars, is_dir: impl Fn(&Path) -> bool) -> EnvVars {
	let home = base.get(&OsString::from("HOME")).map(PathBuf::from);
	let mut dirs: Vec<PathBuf> = FALLBACK_DIRS
		.iter()
		.filter_map(|dir| match dir.strip_prefix("~/") {
			Some(rest) => home.as_ref().map(|home| home.join(rest)),
			None => Some(PathBuf::from(dir)),
		})
		.filter(|dir| is_dir(dir))
		.collect();
	dirs.extend(std::env::split_paths(SYSTEM_PATH));
	let mut env = base.clone();
	if let Ok(path) = std::env::join_paths(dirs) {
		env.insert("PATH".into(), path);
	}
	env
}

/// The env for a turn: the captured child env, or the fallback built from
/// `base` when the capture failed.
pub fn turn_env(captured: Result<Arc<EnvVars>, String>, base: &EnvVars) -> TurnEnv {
	match captured {
		Ok(vars) => TurnEnv { vars: (*vars).clone(), captured: true },
		Err(_) => TurnEnv { vars: fallback_env(base, Path::is_dir), captured: false },
	}
}

/// Runs `shell -l -i -c` with `base` plus the injected variables and returns
/// every variable it prints, or why it could not. A valid record set is
/// accepted whatever the shell's exit status.
///
/// The shell runs in `$HOME` (from `base`) in a new session, with stdin and
/// stderr closed: draining stderr would block for as long as a background
/// job an rc file started keeps it open. On `timeout` the whole session is
/// killed and reaped. After the END marker the shell gets [`EXIT_GRACE`] to
/// exit, then its session is killed either way, so background jobs the rc
/// files started do not outlive the capture.
#[cfg(unix)]
pub fn capture_with(shell: &Path, base: &EnvVars, timeout: Duration) -> Result<EnvVars, String> {
	let started = Instant::now();
	let result = run_capture(shell, base, timeout);
	let ms = started.elapsed().as_millis();
	match &result {
		Ok(vars) => debug_log("CLAUDE", format!("shell env: ok, {} vars in {ms} ms", vars.len())),
		Err(e) => debug_log("CLAUDE", format!("shell env: {e} ({ms} ms)")),
	}
	result
}

/// The capture needs `setsid` and `killpg`; elsewhere it always fails and
/// turns use the fallback env.
#[cfg(not(unix))]
pub fn capture_with(_shell: &Path, _base: &EnvVars, _timeout: Duration) -> Result<EnvVars, String> {
	Err("capture is not supported on this platform".into())
}

/// The login shell env of this machine, for the cache: the app's `$SHELL`
/// and clean base, the real deadline, and the child env of the result.
pub fn capture_for_turns() -> Result<EnvVars, String> {
	let base = clean_base(std::env::vars_os());
	capture_with(&capture_shell(std::env::var_os("SHELL")), &base, CAPTURE_TIMEOUT).map(|vars| child_env(&vars))
}

type CaptureFn = dyn Fn() -> Result<EnvVars, String> + Send + Sync;
type CachedCapture = Option<Result<Arc<EnvVars>, String>>;

/// The cached capture (Tauri managed state): one result, success or failure,
/// for the app run. The lock is held during a capture, so concurrent callers
/// share it.
#[derive(Clone)]
pub struct ShellEnv {
	slot: Arc<Mutex<CachedCapture>>,
	/// True while a capture runs, so `refresh` can tell a capture apart from
	/// a `get` that only clones the cached result under the lock.
	capturing: Arc<AtomicBool>,
	capture: Arc<CaptureFn>,
}

impl Default for ShellEnv {
	fn default() -> Self {
		Self::new(capture_for_turns)
	}
}

impl ShellEnv {
	/// A cache that fills itself with `capture`.
	pub fn new(capture: impl Fn() -> Result<EnvVars, String> + Send + Sync + 'static) -> Self {
		Self { slot: Arc::default(), capturing: Arc::default(), capture: Arc::new(capture) }
	}

	/// The cached result, capturing first when there is none. Blocks while
	/// a capture runs.
	pub fn get(&self) -> Result<Arc<EnvVars>, String> {
		let mut slot = self.lock();
		if slot.is_none() {
			*slot = Some(self.run());
		}
		slot.clone().expect("filled above")
	}

	/// Captures again on the calling thread and caches the result, except that
	/// a failed capture never replaces a cached success: turns keep the env
	/// with the user's MCP servers and hooks when an rc file times out once.
	/// Skipped when a capture is already running; a `get` after it waits for
	/// that capture.
	pub fn refresh(&self) {
		if self.capturing.load(Ordering::SeqCst) {
			return;
		}
		let mut slot = self.lock();
		let fresh = self.run();
		if fresh.is_ok() || !matches!(*slot, Some(Ok(_))) {
			*slot = Some(fresh);
		}
	}

	fn lock(&self) -> std::sync::MutexGuard<'_, CachedCapture> {
		self.slot.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
	}

	/// Runs the capture with `capturing` set. Called with the lock held.
	fn run(&self) -> Result<Arc<EnvVars>, String> {
		self.capturing.store(true, Ordering::SeqCst);
		let result = (self.capture)().map(Arc::new);
		self.capturing.store(false, Ordering::SeqCst);
		result
	}
}

#[cfg(unix)]
fn run_capture(shell: &Path, base: &EnvVars, timeout: Duration) -> Result<EnvVars, String> {
	let nonce = uuid::Uuid::new_v4().simple().to_string();
	let mut child = capture_command(shell, base, &nonce).spawn().map_err(|e| format!("spawn error: {e}"))?;
	let mut stdout = child.stdout.take().expect("stdout is piped");
	let end = marker(&nonce, "END").into_bytes();

	let (tx, rx) = mpsc::channel();
	thread::spawn(move || {
		let _ = tx.send(read_until_end(&mut stdout, &end));
	});
	let Ok((bytes, capped)) = rx.recv_timeout(timeout) else {
		kill_session(&mut child);
		return Err(format!("timeout after {timeout:?}"));
	};
	reap(&mut child);
	if capped {
		return Err("output over 4 MiB".into());
	}
	parse(&bytes, &nonce).ok_or_else(|| "no markers".into())
}

/// The capture process. Never `{cmd:?}`: `Command`'s Debug prints its env.
#[cfg(unix)]
fn capture_command(shell: &Path, base: &EnvVars, nonce: &str) -> Command {
	use std::os::unix::process::CommandExt;
	let script = format!(
		"/usr/bin/printf '%s\\0' {}; /usr/bin/env -0; /usr/bin/printf '%s\\0' {}",
		marker(nonce, "START"),
		marker(nonce, "END")
	);
	let home = base.get(&OsString::from("HOME")).map(PathBuf::from).unwrap_or_else(|| PathBuf::from("/"));
	let mut cmd = Command::new(shell);
	cmd.args(["-l", "-i", "-c", &script])
		.env_clear()
		.envs(base)
		.envs(INJECTED)
		.current_dir(home)
		.stdin(Stdio::null())
		.stdout(Stdio::piped())
		.stderr(Stdio::null());
	// A new session detaches the shell from any terminal and makes its pid
	// the group id `killpg` targets. `process_group` must not be set as well:
	// `setsid` fails with EPERM in a process that already leads a group.
	unsafe {
		cmd.pre_exec(|| if libc::setsid() == -1 { Err(std::io::Error::last_os_error()) } else { Ok(()) });
	}
	cmd
}

/// Reads until the END record, EOF or [`STDOUT_CAP`]; returns the bytes and
/// whether the cap was hit.
fn read_until_end(stdout: &mut impl Read, end: &[u8]) -> (Vec<u8>, bool) {
	let mut bytes = Vec::new();
	let mut chunk = [0u8; 64 * 1024];
	loop {
		let n = match stdout.read(&mut chunk) {
			Ok(0) | Err(_) => return (bytes, false),
			Ok(n) => n,
		};
		let searched_from = bytes.len().saturating_sub(end.len());
		bytes.extend_from_slice(&chunk[..n]);
		if find(&bytes[searched_from..], end).is_some() {
			return (bytes, false);
		}
		if bytes.len() >= STDOUT_CAP {
			return (bytes, true);
		}
	}
}

/// Waits up to [`EXIT_GRACE`] for the shell to exit, then kills its session
/// whether it exited or not.
#[cfg(unix)]
fn reap(child: &mut Child) {
	let deadline = Instant::now() + EXIT_GRACE;
	while Instant::now() < deadline && !exited_unreaped(child) {
		thread::sleep(Duration::from_millis(10));
	}
	kill_session(child);
}

/// True once the shell has exited, without reaping it (`WNOWAIT`): an
/// unreaped shell keeps its pid, so the session's group id stays reserved
/// for the `killpg` that follows.
#[cfg(unix)]
pub(super) fn exited_unreaped(child: &Child) -> bool {
	// SAFETY: `info` is a valid, zeroed siginfo_t; `si_pid` stays 0 when the
	// child has not exited yet (WNOHANG).
	unsafe {
		let mut info: libc::siginfo_t = std::mem::zeroed();
		if libc::waitid(libc::P_PID, child.id(), &mut info, libc::WEXITED | libc::WNOHANG | libc::WNOWAIT) != 0 {
			return true;
		}
		info.si_pid() != 0
	}
}

/// Kills the shell's session group and reaps the shell. Only called before
/// the shell is reaped, so the group id cannot have been reused.
#[cfg(unix)]
fn kill_session(child: &mut Child) {
	if let Ok(pgid) = libc::pid_t::try_from(child.id()) {
		unsafe {
			libc::killpg(pgid, libc::SIGKILL);
		}
	}
	let _ = child.wait();
}

/// The marker record printed before (`which` = `START`) or after (`END`)
/// the variables; the per-run `nonce` keeps rc output from forging one.
pub fn marker(nonce: &str, which: &str) -> String {
	format!("__KOKOBRAIN_ENV_{which}_{nonce}__")
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
	haystack.windows(needle.len()).position(|window| window == needle)
}

#[cfg(unix)]
fn bytes_to_os(bytes: Vec<u8>) -> OsString {
	use std::os::unix::ffi::OsStringExt;
	OsString::from_vec(bytes)
}

#[cfg(not(unix))]
fn bytes_to_os(bytes: Vec<u8>) -> OsString {
	String::from_utf8_lossy(&bytes).into_owned().into()
}
