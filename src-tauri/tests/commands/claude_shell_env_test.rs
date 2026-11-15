//! Tests for `commands::claude::shell_env`: the pure parse and env builders,
//! captures against fake login shells (`/bin/sh` scripts that receive
//! `-l -i -c <script>` and run `$4`) with short deadlines, and the cache.
//! The developer's real login shell never runs.

#![cfg(unix)]

use kokobrain_lib::commands::claude::shell_env::{
	capture_shell, capture_with, child_env, clean_base, fallback_env, marker, parse, turn_env, EnvVars, ShellEnv,
	SYSTEM_PATH,
};
use std::ffi::OsString;
use std::fs;
use std::os::unix::ffi::OsStringExt;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tempfile::TempDir;

const DEADLINE: Duration = Duration::from_secs(5);
/// Deadline for the hang test, long enough for the fake shell to start: a
/// freshly written script can take most of a second to exec on macOS while
/// other tests exec theirs.
const SLOW_START_DEADLINE: Duration = Duration::from_secs(3);
/// Runs the capture script the way a login shell would.
const RUN_SCRIPT: &str = "exec /bin/sh -c \"$4\"";

fn script(dir: &Path, name: &str, body: &str) -> PathBuf {
	let path = dir.join(name);
	fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
	fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
	path
}

fn os(s: &str) -> OsString {
	OsString::from(s)
}

fn vars(pairs: &[(&str, &str)]) -> EnvVars {
	pairs.iter().map(|(k, v)| (os(k), os(v))).collect()
}

/// A clean base with `HOME` at `home`.
fn base(home: &Path) -> EnvVars {
	EnvVars::from([(os("HOME"), home.into()), (os("PATH"), os(SYSTEM_PATH))])
}

fn get<'a>(env: &'a EnvVars, name: &str) -> Option<&'a OsString> {
	env.get(&os(name))
}

/// True while `pid` exists, zombies included.
fn alive(pid: i32) -> bool {
	unsafe { libc::kill(pid, 0) == 0 }
}

fn read_pid(path: &Path) -> i32 {
	let deadline = Instant::now() + DEADLINE;
	loop {
		if let Ok(text) = fs::read_to_string(path) {
			if let Ok(pid) = text.trim().parse() {
				return pid;
			}
		}
		assert!(Instant::now() < deadline, "no pid in {}", path.display());
		thread::sleep(Duration::from_millis(10));
	}
}

fn wait_gone(pid: i32) {
	let deadline = Instant::now() + DEADLINE;
	while alive(pid) {
		assert!(Instant::now() < deadline, "pid {pid} still alive");
		thread::sleep(Duration::from_millis(20));
	}
}

// --- parse -----------------------------------------------------------------------

fn framed(nonce: &str, before: &[u8], records: &[&[u8]]) -> Vec<u8> {
	let mut out = before.to_vec();
	out.extend_from_slice(marker(nonce, "START").as_bytes());
	out.push(0);
	for record in records {
		out.extend_from_slice(record);
		out.push(0);
	}
	out.extend_from_slice(marker(nonce, "END").as_bytes());
	out.push(0);
	out
}

#[test]
fn parse_reads_records_between_the_markers_and_skips_noise() {
	let bytes = framed("n1", b"welcome back\nlast login: today\n", &[b"A=1", b"B=x=y", b"EMPTY="]);

	assert_eq!(parse(&bytes, "n1"), Some(vars(&[("A", "1"), ("B", "x=y"), ("EMPTY", "")])));
}

#[test]
fn parse_keeps_newlines_and_non_utf8_bytes() {
	let bytes = framed("n1", b"", &[b"MULTI=line one\nline two", b"RAW=\xff\xfe"]);

	let env = parse(&bytes, "n1").unwrap();

	assert_eq!(get(&env, "MULTI"), Some(&os("line one\nline two")));
	assert_eq!(get(&env, "RAW"), Some(&OsString::from_vec(vec![0xff, 0xfe])));
}

#[test]
fn parse_skips_records_without_a_name() {
	let bytes = framed("n1", b"", &[b"no equals sign", b"=value", b"OK=1"]);

	assert_eq!(parse(&bytes, "n1"), Some(vars(&[("OK", "1")])));
}

#[test]
fn parse_accepts_an_empty_env() {
	assert_eq!(parse(&framed("n1", b"", &[]), "n1"), Some(EnvVars::new()));
}

#[test]
fn parse_is_none_when_a_marker_is_missing() {
	let full = framed("n1", b"", &[b"A=1"]);
	let end = marker("n1", "END");
	let without_end = &full[..full.len() - end.len() - 1];

	assert_eq!(parse(without_end, "n1"), None);
	assert_eq!(parse(b"A=1\0", "n1"), None);
	assert_eq!(parse(&[], "n1"), None);
	// Markers of another run do not count.
	assert_eq!(parse(&full, "other"), None);
}

// --- env builders ------------------------------------------------------------------

#[test]
fn clean_base_keeps_only_the_base_names_and_sets_the_system_path() {
	let app = vars(&[
		("HOME", "/Users/me"),
		("USER", "me"),
		("LOGNAME", "me"),
		("SHELL", "/bin/zsh"),
		("TMPDIR", "/tmp/x"),
		("SSH_AUTH_SOCK", "/tmp/agent"),
		("__CF_USER_TEXT_ENCODING", "0x1F5:0x0:0x0"),
		("LANG", "en_US.UTF-8"),
		("LC_CTYPE", "UTF-8"),
		("PATH", "/repo/node_modules/.bin:/usr/bin"),
		("CLAUDE_CODE_ENTRYPOINT", "cli"),
		("ANTHROPIC_AUTH_TOKEN", "secret"),
		("npm_config_user_agent", "pnpm"),
		("TERM_SESSION_ID", "w0t0p0"),
	]);

	let base = clean_base(app.clone());

	let mut expected = app;
	for dropped in ["CLAUDE_CODE_ENTRYPOINT", "ANTHROPIC_AUTH_TOKEN", "npm_config_user_agent", "TERM_SESSION_ID"] {
		expected.remove(&os(dropped));
	}
	expected.insert(os("PATH"), os(SYSTEM_PATH));
	assert_eq!(base, expected);
}

#[test]
fn clean_base_of_an_empty_env_has_only_the_path() {
	assert_eq!(clean_base(EnvVars::new()), vars(&[("PATH", SYSTEM_PATH)]));
}

#[test]
fn child_env_drops_shell_locals_and_injected_names() {
	let captured = vars(&[
		("PATH", "/a:/b"),
		("NVM_DIR", "/n"),
		("PWD", "/Users/me"),
		("OLDPWD", "/"),
		("SHLVL", "1"),
		("_", "/usr/bin/env"),
		("CLAUDECODE", "1"),
		("KOKOBRAIN_RESOLVING_ENVIRONMENT", "1"),
		("DISABLE_AUTO_UPDATE", "true"),
		("ZSH_TMUX_AUTOSTART", "false"),
		("ZSH_TMUX_AUTOSTARTED", "true"),
	]);

	assert_eq!(child_env(&captured), vars(&[("PATH", "/a:/b"), ("NVM_DIR", "/n")]));
}

#[test]
fn fallback_keeps_only_existing_dirs_before_the_system_path() {
	let base = vars(&[("HOME", "/Users/me"), ("USER", "me"), ("PATH", SYSTEM_PATH)]);
	let existing = ["/Users/me/.local/bin", "/usr/local/bin", "/Users/me/.local/share/mise/shims"];

	let env = fallback_env(&base, |dir| existing.iter().any(|e| Path::new(e) == dir));

	assert_eq!(
		get(&env, "PATH"),
		Some(&os(&format!(
			"/Users/me/.local/bin:/usr/local/bin:/Users/me/.local/share/mise/shims:{SYSTEM_PATH}"
		)))
	);
	assert_eq!(get(&env, "USER"), Some(&os("me")));
}

#[test]
fn fallback_without_home_or_dirs_is_the_system_path() {
	let env = fallback_env(&EnvVars::new(), |dir| dir.starts_with("~") || dir.is_relative());

	assert_eq!(env, vars(&[("PATH", SYSTEM_PATH)]));
}

#[test]
fn turn_env_uses_the_capture_or_the_fallback() {
	let captured = Arc::new(vars(&[("PATH", "/captured")]));

	let ok = turn_env(Ok(captured.clone()), &EnvVars::new());
	assert!(ok.captured);
	assert_eq!(ok.vars, *captured);

	let failed = turn_env(Err("timeout".into()), &vars(&[("USER", "me")]));
	assert!(!failed.captured);
	assert_eq!(get(&failed.vars, "USER"), Some(&os("me")));
	assert!(get(&failed.vars, "PATH").unwrap().to_string_lossy().ends_with(SYSTEM_PATH));
}

#[test]
fn capture_shell_takes_an_absolute_executable_shell_only() {
	let dir = TempDir::new().unwrap();
	let shell = script(dir.path(), "myshell", "exit 0");
	let not_exec = dir.path().join("plain");
	fs::write(&not_exec, "x").unwrap();

	assert_eq!(capture_shell(Some(shell.clone().into())), shell);
	assert_eq!(capture_shell(Some(not_exec.into())), PathBuf::from("/bin/zsh"));
	assert_eq!(capture_shell(Some(os("zsh"))), PathBuf::from("/bin/zsh"));
	assert_eq!(capture_shell(Some(os(""))), PathBuf::from("/bin/zsh"));
	assert_eq!(capture_shell(None), PathBuf::from("/bin/zsh"));
}

// --- capture against fake shells -----------------------------------------------------

#[test]
fn capture_runs_a_login_interactive_shell_in_home_from_the_clean_base() {
	let dir = TempDir::new().unwrap();
	let home = TempDir::new().unwrap();
	let seen = dir.path().join("seen");
	// Set only in this test process: it must not reach the capture.
	std::env::set_var("KOKO_TEST_APP_ONLY_CAPTURE", "leaked");
	let shell = script(
		dir.path(),
		"fake-shell",
		&format!(
			"echo \"$1 $2 $3\" > '{seen}'\npwd >> '{seen}'\necho 'motd noise'\nprintf 'more noise\\0'\nexport FROM_RC=yes\n{RUN_SCRIPT}",
			seen = seen.display()
		),
	);
	let mut base = clean_base(std::env::vars_os());
	base.insert(os("HOME"), home.path().into());

	let env = capture_with(&shell, &base, DEADLINE).unwrap();

	assert_eq!(get(&env, "FROM_RC"), Some(&os("yes")));
	assert_eq!(get(&env, "HOME"), Some(&home.path().into()));
	assert_eq!(get(&env, "PATH"), Some(&os(SYSTEM_PATH)));
	assert_eq!(get(&env, "KOKOBRAIN_RESOLVING_ENVIRONMENT"), Some(&os("1")));
	assert_eq!(get(&env, "ZSH_TMUX_AUTOSTARTED"), Some(&os("true")));
	assert_eq!(get(&env, "KOKO_TEST_APP_ONLY_CAPTURE"), None);
	assert_eq!(get(&child_env(&env), "KOKOBRAIN_RESOLVING_ENVIRONMENT"), None);
	let seen = fs::read_to_string(&seen).unwrap();
	let mut lines = seen.lines();
	assert_eq!(lines.next(), Some("-l -i -c"));
	assert_eq!(fs::canonicalize(lines.next().unwrap()).unwrap(), fs::canonicalize(home.path()).unwrap());
}

#[test]
fn capture_accepts_valid_output_from_a_shell_that_exits_1() {
	let dir = TempDir::new().unwrap();
	let shell = script(dir.path(), "fake-shell", "export FROM_RC=yes\n/bin/sh -c \"$4\"\nexit 1");

	let env = capture_with(&shell, &base(dir.path()), DEADLINE).unwrap();

	assert_eq!(get(&env, "FROM_RC"), Some(&os("yes")));
}

#[test]
fn hanging_shell_is_killed_with_its_children_at_the_deadline() {
	let dir = TempDir::new().unwrap();
	let shell_pid = dir.path().join("shell-pid");
	let job_pid = dir.path().join("job-pid");
	let shell = script(
		dir.path(),
		"fake-shell",
		&format!("echo $$ > '{}'\nsleep 30 &\necho $! > '{}'\nwait", shell_pid.display(), job_pid.display()),
	);

	let started = Instant::now();
	let error = capture_with(&shell, &base(dir.path()), SLOW_START_DEADLINE).unwrap_err();

	assert!(error.contains("timeout"), "{error}");
	assert!(started.elapsed() < SLOW_START_DEADLINE * 2, "took {:?}", started.elapsed());
	// The shell was reaped (no zombie left) and its background job killed.
	assert!(!alive(read_pid(&shell_pid)), "the shell is still alive or a zombie");
	wait_gone(read_pid(&job_pid));
}

#[test]
fn background_job_holding_stdout_does_not_hold_the_capture() {
	let dir = TempDir::new().unwrap();
	// The job inherits stdout (and stderr) and outlives the shell by 8 s.
	let shell = script(dir.path(), "fake-shell", "sleep 8 &\nexport FROM_RC=yes\n/bin/sh -c \"$4\"\nexit 0");

	let started = Instant::now();
	let env = capture_with(&shell, &base(dir.path()), Duration::from_secs(10)).unwrap();

	// Well under the job's 8 s; the margin is the fake shell's start-up.
	assert!(started.elapsed() < Duration::from_secs(4), "took {:?}", started.elapsed());
	assert_eq!(get(&env, "FROM_RC"), Some(&os("yes")));
}

#[test]
fn shell_that_lingers_after_the_end_marker_is_killed_after_the_grace() {
	let dir = TempDir::new().unwrap();
	let shell_pid = dir.path().join("shell-pid");
	// No `exec`: the shell itself stays alive after printing the env.
	let shell = script(
		dir.path(),
		"fake-shell",
		&format!("echo $$ > '{}'\nexport FROM_RC=yes\n/bin/sh -c \"$4\"\nsleep 30", shell_pid.display()),
	);

	let started = Instant::now();
	let env = capture_with(&shell, &base(dir.path()), Duration::from_secs(10)).unwrap();

	assert!(started.elapsed() < Duration::from_secs(4), "took {:?}", started.elapsed());
	assert_eq!(get(&env, "FROM_RC"), Some(&os("yes")));
	// Killed and reaped: no zombie left.
	assert!(!alive(read_pid(&shell_pid)), "the shell is still alive or a zombie");
}

#[test]
fn background_job_of_a_shell_that_exits_is_killed() {
	let dir = TempDir::new().unwrap();
	let job_pid = dir.path().join("job-pid");
	let shell = script(
		dir.path(),
		"fake-shell",
		&format!("sleep 30 >/dev/null 2>&1 &\necho $! > '{}'\n/bin/sh -c \"$4\"\nexit 0", job_pid.display()),
	);

	capture_with(&shell, &base(dir.path()), DEADLINE).unwrap();

	wait_gone(read_pid(&job_pid));
}

#[test]
fn shell_that_never_prints_the_end_marker_fails() {
	let dir = TempDir::new().unwrap();
	let shell = script(dir.path(), "fake-shell", "echo 'no env here'\nexit 0");

	let error = capture_with(&shell, &base(dir.path()), DEADLINE).unwrap_err();

	assert!(error.contains("no markers"), "{error}");
}

#[test]
fn endless_output_stops_at_the_cap() {
	let dir = TempDir::new().unwrap();
	let shell = script(dir.path(), "fake-shell", "exec yes");

	let started = Instant::now();
	let error = capture_with(&shell, &base(dir.path()), Duration::from_secs(10)).unwrap_err();

	assert!(error.contains("4 MiB"), "{error}");
	assert!(started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
}

#[test]
fn missing_shell_is_a_spawn_error() {
	let dir = TempDir::new().unwrap();

	let error = capture_with(&dir.path().join("no-such-shell"), &base(dir.path()), DEADLINE).unwrap_err();

	assert!(error.contains("spawn error"), "{error}");
}

// --- cache -------------------------------------------------------------------------

/// A cache whose capture counts its calls, sleeps `delay` and returns the
/// call number as `N`.
fn counting_cache(delay: Duration, fail: bool) -> (ShellEnv, Arc<AtomicUsize>) {
	let calls = Arc::new(AtomicUsize::new(0));
	let counter = calls.clone();
	let cache = ShellEnv::new(move || {
		let n = counter.fetch_add(1, Ordering::SeqCst) + 1;
		thread::sleep(delay);
		if fail {
			Err(format!("failure {n}"))
		} else {
			Ok(vars(&[("N", &n.to_string())]))
		}
	});
	(cache, calls)
}

#[test]
fn get_captures_once_and_shares_the_result() {
	let (cache, calls) = counting_cache(Duration::from_millis(200), false);

	let other = cache.clone();
	let concurrent = thread::spawn(move || other.get());
	let first = cache.get().unwrap();
	let second = concurrent.join().unwrap().unwrap();

	assert_eq!(calls.load(Ordering::SeqCst), 1);
	assert_eq!(first, second);
	assert_eq!(cache.get().unwrap(), first);
}

#[test]
fn a_failure_is_cached_too() {
	let (cache, calls) = counting_cache(Duration::ZERO, true);

	assert_eq!(cache.get(), Err("failure 1".into()));
	assert_eq!(cache.get(), Err("failure 1".into()));
	assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[test]
fn refresh_replaces_the_cached_result() {
	let (cache, calls) = counting_cache(Duration::ZERO, false);
	assert_eq!(get(&cache.get().unwrap(), "N"), Some(&os("1")));

	cache.refresh().join().unwrap();

	assert_eq!(calls.load(Ordering::SeqCst), 2);
	assert_eq!(get(&cache.get().unwrap(), "N"), Some(&os("2")));
}

#[test]
fn refresh_on_an_empty_cache_fills_it() {
	let (cache, calls) = counting_cache(Duration::ZERO, false);

	cache.refresh().join().unwrap();

	assert_eq!(get(&cache.get().unwrap(), "N"), Some(&os("1")));
	assert_eq!(calls.load(Ordering::SeqCst), 1);
}

#[test]
fn refresh_while_a_capture_runs_is_skipped() {
	let (cache, calls) = counting_cache(Duration::from_millis(500), false);
	let other = cache.clone();
	let running = thread::spawn(move || other.get());
	while calls.load(Ordering::SeqCst) == 0 {
		thread::sleep(Duration::from_millis(5));
	}

	let started = Instant::now();
	cache.refresh().join().unwrap();

	assert!(started.elapsed() < Duration::from_millis(300), "refresh waited {:?}", started.elapsed());
	assert_eq!(get(&running.join().unwrap().unwrap(), "N"), Some(&os("1")));
	assert_eq!(calls.load(Ordering::SeqCst), 1);
}
