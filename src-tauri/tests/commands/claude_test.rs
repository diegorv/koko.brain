//! Integration tests for `commands::claude` binary detection.
//!
//! Every test passes its own env, shell and candidate list, so the developer's
//! real `claude` install and login shell never take part. Fake binaries are
//! `/bin/sh` scripts written into a temp dir.

#![cfg(unix)]

use kokobrain_lib::commands::claude::shell_env::{capture_with, child_env, clean_base, EnvVars, ShellEnv, TurnEnv, SYSTEM_PATH};
use kokobrain_lib::commands::claude::{
	claude_status_with, default_candidates, resolve_claude, shell_from_env, status_env, version_command, ClaudeStatus,
};
use std::ffi::OsString;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tempfile::TempDir;

const TIMEOUT: Duration = Duration::from_secs(5);

/// A captured env with only the system PATH: `claude` is not on it, so the
/// lookup goes to the candidates without running the login shell.
fn system_env() -> TurnEnv {
	TurnEnv { vars: EnvVars::from([("PATH".into(), SYSTEM_PATH.into())]), captured: true }
}

/// The fallback env (the capture failed), with only the system PATH: the
/// lookup asks the login shell, then the candidates.
fn fallback_env() -> TurnEnv {
	TurnEnv { captured: false, ..system_env() }
}

/// Writes `body` as a `/bin/sh` script at `dir/name` with the given mode.
fn script(dir: &Path, name: &str, body: &str, mode: u32) -> PathBuf {
	let path = dir.join(name);
	fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
	fs::set_permissions(&path, fs::Permissions::from_mode(mode)).unwrap();
	path
}

/// A login shell whose `command -v claude` finds nothing.
fn failing_shell(dir: &Path) -> PathBuf {
	script(dir, "fake-shell-none", "exit 1", 0o755)
}

fn fake_claude(dir: &Path) -> PathBuf {
	script(dir, "claude", "echo '2.1.325 (Claude Code)'\necho 'second line'", 0o755)
}

fn path_str(path: &Path) -> String {
	path.to_string_lossy().into_owned()
}

#[test]
fn override_path_wins_and_reports_the_first_version_line() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());
	// A candidate that would also match proves the override is checked first.
	let other = script(dir.path(), "other-claude", "echo 'other'", 0o755);

	let status = claude_status_with(&path_str(&claude), &system_env(), &failing_shell(dir.path()), &[other], TIMEOUT);

	assert_eq!(
		status,
		ClaudeStatus {
			installed: true,
			path: Some(path_str(&claude)),
			version: Some("2.1.325 (Claude Code)".into()),
			error: None,
		}
	);
}

#[test]
fn status_finds_claude_on_the_login_shell_path_and_runs_it_with_that_env() {
	let dir = TempDir::new().unwrap();
	let home = TempDir::new().unwrap();
	let bin = TempDir::new().unwrap();
	// Only on the PATH an rc file sets, and answers only with a variable that
	// rc file exports, like an nvm-installed `#!/usr/bin/env node` launcher.
	let claude = script(
		bin.path(),
		"claude",
		"[ \"$KOKO_FROM_RC\" = yes ] || { echo 'KOKO_FROM_RC unset' >&2; exit 7; }\necho '2.1.325 (Claude Code)'",
		0o755,
	);
	let shell = script(
		dir.path(),
		"fake-login-shell",
		&format!("export PATH='{}':\"$PATH\"\nexport KOKO_FROM_RC=yes\nexec /bin/sh -c \"$4\"", path_str(bin.path())),
		0o755,
	);
	let mut base = clean_base(std::env::vars_os());
	base.insert("HOME".into(), home.path().into());
	let env = TurnEnv { vars: child_env(&capture_with(&shell, &base, TIMEOUT).unwrap()), captured: true };

	let status = claude_status_with("", &env, &failing_shell(dir.path()), &[], TIMEOUT);

	assert_eq!(
		status,
		ClaudeStatus {
			installed: true,
			path: Some(path_str(&claude)),
			version: Some("2.1.325 (Claude Code)".into()),
			error: None,
		}
	);
}

#[test]
fn override_runs_with_the_turn_env_and_not_the_app_env() {
	let dir = TempDir::new().unwrap();
	// Set only in this test process, as a dev launch from a terminal would.
	std::env::set_var("KOKO_TEST_APP_ONLY_STATUS", "leaked");
	let claude = script(dir.path(), "claude", "echo \"$KOKO_ENV_VAR|${KOKO_TEST_APP_ONLY_STATUS:-absent}\"", 0o755);
	let mut env = system_env();
	env.vars.insert("KOKO_ENV_VAR".into(), "from-env".into());

	let status = claude_status_with(&path_str(&claude), &env, &failing_shell(dir.path()), &[], TIMEOUT);

	assert_eq!(status.version.as_deref(), Some("from-env|absent"));
}

/// A cache whose capture counts its calls and returns the call number as `N`.
fn counting_cache() -> (ShellEnv, Arc<AtomicUsize>) {
	let calls = Arc::new(AtomicUsize::new(0));
	let counter = calls.clone();
	let cache = ShellEnv::new(move || {
		let n = counter.fetch_add(1, Ordering::SeqCst) + 1;
		Ok(EnvVars::from([("N".into(), n.to_string().into())]))
	});
	(cache, calls)
}

#[test]
fn status_env_captures_again_only_when_asked() {
	let (cache, calls) = counting_cache();
	let base = EnvVars::new();

	let first = status_env(&cache, false, &base);
	let second = status_env(&cache, false, &base);
	assert_eq!(calls.load(Ordering::SeqCst), 1, "a status check without refresh must not capture again");
	assert_eq!(first, second);
	assert!(first.captured);

	let refreshed = status_env(&cache, true, &base);
	assert_eq!(calls.load(Ordering::SeqCst), 2);
	assert_eq!(refreshed.vars.get(&OsString::from("N")), Some(&OsString::from("2")));
}

#[test]
fn status_env_uses_the_fallback_when_the_capture_failed() {
	let cache = ShellEnv::new(|| Err("timeout".into()));
	let base = EnvVars::from([("HOME".into(), "/nonexistent-home".into())]);

	let env = status_env(&cache, false, &base);

	assert!(!env.captured);
	assert_eq!(env.vars.get(&OsString::from("HOME")), Some(&OsString::from("/nonexistent-home")));
}

#[test]
fn login_shell_lookup_takes_the_last_absolute_line() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());
	// Login rc files may print before `command -v` does.
	let shell = script(
		dir.path(),
		"fake-shell",
		&format!("echo 'welcome back'\necho '{}'", path_str(&claude)),
		0o755,
	);

	let status = claude_status_with("", &fallback_env(), &shell, &[], TIMEOUT);

	assert!(status.installed, "{status:?}");
	assert_eq!(status.path, Some(path_str(&claude)));
	assert_eq!(status.version.as_deref(), Some("2.1.325 (Claude Code)"));
}

#[test]
fn login_shell_alias_output_falls_through_to_candidates() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());
	let shell = script(dir.path(), "fake-shell", "echo 'alias claude=/somewhere/claude'", 0o755);

	let status = claude_status_with("", &fallback_env(), &shell, std::slice::from_ref(&claude), TIMEOUT);

	assert_eq!(status.path, Some(path_str(&claude)));
	assert!(status.installed);
}

#[test]
fn candidates_use_the_first_executable_one() {
	let dir = TempDir::new().unwrap();
	let missing = dir.path().join("nope/claude");
	let not_exec = script(dir.path(), "plain", "echo 'plain'", 0o644);
	let claude = fake_claude(dir.path());

	let status = claude_status_with(
		"   ",
		&system_env(),
		&failing_shell(dir.path()),
		&[missing, not_exec, claude.clone()],
		TIMEOUT,
	);

	assert_eq!(status.path, Some(path_str(&claude)));
	assert!(status.installed);
}

#[test]
fn missing_everywhere_reports_not_found() {
	let dir = TempDir::new().unwrap();

	let status = claude_status_with(
		"",
		&system_env(),
		&failing_shell(dir.path()),
		&[dir.path().join("claude")],
		TIMEOUT,
	);

	assert!(!status.installed);
	assert_eq!(status.path, None);
	assert_eq!(status.version, None);
	assert!(status.error.unwrap().contains("not found"));
}

#[test]
fn missing_login_shell_binary_is_not_an_error() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());

	let status = claude_status_with("", &fallback_env(), &dir.path().join("no-shell"), std::slice::from_ref(&claude), TIMEOUT);

	assert_eq!(status.path, Some(path_str(&claude)));
	assert!(status.installed);
}

#[test]
fn non_executable_override_says_so_without_fallback() {
	let dir = TempDir::new().unwrap();
	let plain = script(dir.path(), "claude", "echo '1.0.0'", 0o644);
	let fallback = script(dir.path(), "fallback", "echo '9.9.9'", 0o755);

	let status = claude_status_with(&path_str(&plain), &system_env(), &failing_shell(dir.path()), &[fallback], TIMEOUT);

	assert!(!status.installed);
	assert_eq!(status.path, Some(path_str(&plain)));
	assert_eq!(status.version, None);
	assert!(status.error.unwrap().contains("not an executable file"));
}

#[test]
fn override_not_named_claude_is_refused_and_never_run() {
	let dir = TempDir::new().unwrap();
	let marker = dir.path().join("ran");
	let sh = script(dir.path(), "sh", &format!("touch '{}'\necho '1.0.0'", path_str(&marker)), 0o755);
	let fallback = fake_claude(dir.path());

	let status = claude_status_with(&path_str(&sh), &system_env(), &failing_shell(dir.path()), &[fallback], TIMEOUT);

	assert!(!status.installed);
	assert_eq!(status.path, Some(path_str(&sh)));
	assert_eq!(status.version, None);
	assert!(status.error.unwrap().contains("named claude"));
	assert!(!marker.exists(), "the refused override must not be run");
}

#[test]
fn override_symlink_named_claude_is_accepted() {
	// The native installer links `~/.local/bin/claude` to `versions/<version>`.
	let dir = TempDir::new().unwrap();
	fs::create_dir(dir.path().join("versions")).unwrap();
	let target = script(&dir.path().join("versions"), "2.1.325", "echo '2.1.325 (Claude Code)'", 0o755);
	let link = dir.path().join("claude");
	std::os::unix::fs::symlink(&target, &link).unwrap();

	let status = claude_status_with(&path_str(&link), &system_env(), &failing_shell(dir.path()), &[], TIMEOUT);

	assert!(status.installed, "{status:?}");
	assert_eq!(status.version.as_deref(), Some("2.1.325 (Claude Code)"));
}

#[test]
fn resolve_returns_the_override_in_its_canonical_directory() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());

	let resolved = resolve_claude(&path_str(&claude), &failing_shell(dir.path()), &[], TIMEOUT).unwrap();

	assert_eq!(resolved, fs::canonicalize(dir.path()).unwrap().join("claude"));
}

#[test]
fn resolve_refuses_an_override_not_named_claude() {
	let dir = TempDir::new().unwrap();
	let sh = script(dir.path(), "sh", "echo '1.0.0'", 0o755);

	let error = resolve_claude(&path_str(&sh), &failing_shell(dir.path()), &[], TIMEOUT).unwrap_err();

	assert!(error.contains("named claude"), "{error}");
}

#[test]
fn resolve_refuses_a_relative_override() {
	let dir = TempDir::new().unwrap();

	let error = resolve_claude("claude", &failing_shell(dir.path()), &[], TIMEOUT).unwrap_err();

	assert!(error.contains("must be an absolute path"), "{error}");
}

#[test]
fn resolve_refuses_an_override_that_is_not_absolute() {
	let dir = TempDir::new().unwrap();
	// A candidate that would answer: a refused override has no fallback.
	fake_claude(dir.path());

	for relative in ["./claude", "bin/claude", "~/.local/bin/claude"] {
		let error = resolve_claude(relative, &failing_shell(dir.path()), std::slice::from_ref(&dir.path().join("claude")), TIMEOUT)
			.unwrap_err();

		assert!(error.contains("must be an absolute path"), "{relative}: {error}");
		assert!(error.contains("~ is not expanded"), "{relative}: {error}");
		assert!(error.contains(relative), "{relative}: {error}");
	}
}

#[test]
fn resolve_without_override_uses_the_candidates() {
	let dir = TempDir::new().unwrap();
	let claude = fake_claude(dir.path());

	let resolved = resolve_claude("", &failing_shell(dir.path()), std::slice::from_ref(&claude), TIMEOUT).unwrap();

	assert_eq!(resolved, claude);
}

#[test]
fn override_that_does_not_exist_says_so() {
	let dir = TempDir::new().unwrap();
	let missing = dir.path().join("missing-claude");

	let status = claude_status_with(&path_str(&missing), &system_env(), &failing_shell(dir.path()), &[], TIMEOUT);

	assert!(!status.installed);
	assert!(status.error.unwrap().contains("not an executable file"));
}

#[test]
fn override_that_is_a_directory_says_so() {
	let dir = TempDir::new().unwrap();

	let status = claude_status_with(&path_str(dir.path()), &system_env(), &failing_shell(dir.path()), &[], TIMEOUT);

	assert!(!status.installed);
	assert!(status.error.unwrap().contains("not an executable file"));
}

#[test]
fn hanging_version_times_out() {
	let dir = TempDir::new().unwrap();
	// `exec` so the kill reaches the sleeping process, not only its parent shell.
	let claude = script(dir.path(), "claude", "exec sleep 30", 0o755);

	let started = Instant::now();
	let status = claude_status_with(
		&path_str(&claude),
		&system_env(),
		&failing_shell(dir.path()),
		&[],
		Duration::from_millis(300),
	);

	assert!(started.elapsed() < Duration::from_secs(5), "{:?}", started.elapsed());
	assert!(!status.installed);
	assert_eq!(status.path, Some(path_str(&claude)));
	assert!(status.error.unwrap().contains("timed out"));
}

#[test]
fn failing_version_reports_the_exit_status() {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", "echo 'boom' >&2\nexit 3", 0o755);

	let status = claude_status_with(&path_str(&claude), &system_env(), &failing_shell(dir.path()), &[], TIMEOUT);

	assert!(!status.installed);
	assert_eq!(status.path, Some(path_str(&claude)));
	let error = status.error.unwrap();
	assert!(error.contains("boom"), "{error}");
}

#[test]
fn empty_version_output_is_an_error() {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", "exit 0", 0o755);

	let status = claude_status_with(&path_str(&claude), &system_env(), &failing_shell(dir.path()), &[], TIMEOUT);

	assert!(!status.installed);
	assert!(status.error.is_some());
}

#[test]
fn version_command_uses_the_given_env_without_claudecode() {
	let env = EnvVars::from([("PATH".into(), "/custom/bin".into()), ("CLAUDECODE".into(), "1".into())]);
	let cmd = version_command(Path::new("/usr/local/bin/claude"), &env);

	let args: Vec<_> = cmd.get_args().collect();
	assert_eq!(args, ["--version"]);
	let envs: Vec<_> = cmd.get_envs().collect();
	assert!(envs.contains(&("PATH".as_ref(), Some("/custom/bin".as_ref()))), "{envs:?}");
	// The env is cleared first, so removing CLAUDECODE drops it from the list.
	assert!(
		envs.iter().all(|(key, value)| *key != "CLAUDECODE" || value.is_none()),
		"CLAUDECODE must be removed from the child env: {envs:?}"
	);
}

#[test]
fn default_candidates_follow_the_documented_order() {
	let home = Path::new("/Users/someone");

	assert_eq!(
		default_candidates(Some(home)),
		vec![
			PathBuf::from("/Users/someone/.local/bin/claude"),
			PathBuf::from("/Users/someone/.claude/local/claude"),
			PathBuf::from("/opt/homebrew/bin/claude"),
			PathBuf::from("/usr/local/bin/claude"),
		]
	);
	assert_eq!(
		default_candidates(None),
		vec![PathBuf::from("/opt/homebrew/bin/claude"), PathBuf::from("/usr/local/bin/claude")]
	);
}

#[test]
fn login_shell_uses_shell_env_and_falls_back_to_zsh() {
	assert_eq!(shell_from_env(Some(OsString::from("/opt/homebrew/bin/fish"))), PathBuf::from("/opt/homebrew/bin/fish"));
	assert_eq!(shell_from_env(Some(OsString::new())), PathBuf::from("/bin/zsh"));
	assert_eq!(shell_from_env(None), PathBuf::from("/bin/zsh"));
}

#[test]
fn claude_status_serializes_with_camel_case_keys() {
	let status = ClaudeStatus {
		installed: false,
		path: None,
		version: None,
		error: Some("not found".into()),
	};

	let value = serde_json::to_value(&status).unwrap();
	assert_eq!(value["installed"], false);
	assert!(value["path"].is_null());
	assert!(value["version"].is_null());
	assert_eq!(value["error"], "not found");
}
