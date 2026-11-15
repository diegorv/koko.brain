//! Tests for `commands::claude::turn`: the args and system prompt builders,
//! and whole runs against fake `claude` scripts in a temp dir. The resolver
//! gets a failing login shell and no candidates, so the developer's real
//! `claude` never runs.

#![cfg(unix)]

use kokobrain_lib::commands::claude::shell_env::{capture_with, child_env, clean_base, EnvVars, TurnEnv, SYSTEM_PATH};
use kokobrain_lib::commands::claude::stream::{dispatch_line, ClaudeEvent, StreamState};
use kokobrain_lib::commands::claude::turn::{
	build_args, run_turn_with, system_prompt, turn_command, ClaudeEventPayload, ClaudeRuns, ClaudeTurnRequest,
};
use std::ffi::OsString;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver};
use std::time::Duration;
use tempfile::TempDir;

const RECORDED: &str = include_str!("../fixtures/claude/stream.ndjson");
const WAIT: Duration = Duration::from_secs(10);

fn script(dir: &Path, name: &str, body: &str) -> PathBuf {
	let path = dir.join(name);
	fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
	fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
	path
}

fn path_str(path: &Path) -> String {
	path.to_string_lossy().into_owned()
}

fn request(vault: &Path, binary: &Path) -> ClaudeTurnRequest {
	ClaudeTurnRequest {
		vault_path: path_str(vault),
		prompt: "hello".into(),
		resume_session_id: None,
		model: None,
		context_note_paths: vec![],
		binary_path: path_str(binary),
	}
}

/// An env with only the system PATH, as a captured env would be.
fn system_env() -> TurnEnv {
	TurnEnv { vars: EnvVars::from([("PATH".into(), SYSTEM_PATH.into())]), captured: true }
}

/// Starts a run with a fake `claude` and returns its id and event receiver.
fn start(runs: &ClaudeRuns, dir: &Path, req: ClaudeTurnRequest) -> Result<(String, Receiver<ClaudeEventPayload>), String> {
	start_with_env(runs, dir, req, &system_env())
}

fn start_with_env(
	runs: &ClaudeRuns,
	dir: &Path,
	req: ClaudeTurnRequest,
	env: &TurnEnv,
) -> Result<(String, Receiver<ClaudeEventPayload>), String> {
	let (tx, rx) = channel();
	let shell = script(dir, "fake-shell-none", "exit 1");
	let run_id = run_turn_with(runs, req, env, &shell, &[], move |payload| {
		let _ = tx.send(payload);
	})?;
	Ok((run_id, rx))
}

/// A fake `claude` whose `result` text is the shell expansion `expr`.
fn reporting_claude(dir: &Path, expr: &str) -> PathBuf {
	script(
		dir,
		"claude",
		&format!(r#"printf '{{"type":"result","subtype":"success","is_error":false,"session_id":"s","result":"%s"}}\n' "{expr}""#),
	)
}

fn result_text(events: &[ClaudeEvent]) -> String {
	events
		.iter()
		.find_map(|e| match e {
			ClaudeEvent::Result { text, .. } => Some(text.clone()),
			_ => None,
		})
		.unwrap_or_else(|| panic!("no Result event: {events:?}"))
}

/// Receives events until `Done`, checking every one carries `run_id`.
fn collect_until_done(rx: &Receiver<ClaudeEventPayload>, run_id: &str) -> Vec<ClaudeEvent> {
	let mut events = Vec::new();
	loop {
		let payload = rx.recv_timeout(WAIT).expect("run did not end with Done in time");
		assert_eq!(payload.run_id, run_id);
		let done = matches!(payload.event, ClaudeEvent::Done { .. });
		events.push(payload.event);
		if done {
			assert!(rx.recv_timeout(Duration::from_millis(200)).is_err(), "an event followed Done");
			return events;
		}
	}
}

// --- args and system prompt --------------------------------------------------

#[test]
fn args_for_a_first_turn() {
	let req = ClaudeTurnRequest {
		vault_path: "/vault".into(),
		prompt: "summarize".into(),
		resume_session_id: None,
		model: None,
		context_note_paths: vec![],
		binary_path: String::new(),
	};

	assert_eq!(
		build_args(&req),
		vec![
			"-p",
			"--output-format",
			"stream-json",
			"--verbose",
			"--include-partial-messages",
			"--permission-mode",
			"bypassPermissions",
			"--append-system-prompt",
			&system_prompt("/vault", &[]),
			"--",
			"summarize",
		]
	);
}

#[test]
fn a_prompt_starting_with_a_dash_follows_the_end_of_options_marker() {
	for prompt in ["- [ ] buy milk", "--help"] {
		let mut req = request(Path::new("/vault"), Path::new(""));
		req.prompt = prompt.into();

		let args = build_args(&req);

		// Without `--` the CLI parses the leading `-` as an option and fails
		// with `unknown option`.
		assert_eq!(args[args.len() - 2..], ["--", prompt], "{args:?}");
		assert_eq!(args.iter().filter(|a| a.as_str() == "--").count(), 1, "{args:?}");
	}
}

#[test]
fn args_with_resume_model_and_a_slash_prompt() {
	let req = ClaudeTurnRequest {
		vault_path: "/vault".into(),
		prompt: "/review notes/a.md please".into(),
		resume_session_id: Some("sess-1".into()),
		model: Some("opus".into()),
		context_note_paths: vec!["notes/a.md".into()],
		binary_path: String::new(),
	};

	let args = build_args(&req);

	// The prompt is passed exactly as typed after `--`; the CLI still expands
	// a leading /name as a skill or command there.
	assert_eq!(args[0], "-p");
	let tail: Vec<&str> = args[7..].iter().map(String::as_str).collect();
	assert_eq!(
		tail,
		[
			"--resume",
			"sess-1",
			"--model",
			"opus",
			"--append-system-prompt",
			&system_prompt("/vault", &["notes/a.md".to_string()]),
			"--",
			"/review notes/a.md please",
		]
	);
	for forbidden in ["--setting-sources", "--strict-mcp-config", "--tools"] {
		assert!(!args.iter().any(|a| a == forbidden), "{forbidden} must not be passed");
	}
}

#[test]
fn blank_resume_and_model_are_left_out() {
	let mut req = request(Path::new("/vault"), Path::new(""));
	req.resume_session_id = Some("  ".into());
	req.model = Some(String::new());

	let args = build_args(&req);

	assert!(!args.iter().any(|a| a == "--resume" || a == "--model"), "{args:?}");
}

#[test]
fn system_prompt_names_the_vault_root_without_context() {
	let text = system_prompt("/Users/me/vault", &[]);

	assert!(text.contains("/Users/me/vault"), "{text}");
	assert!(!text.contains("attached"), "{text}");
}

#[test]
fn system_prompt_lists_the_context_notes() {
	let text = system_prompt("/v", &["a.md".to_string(), "dir/b c.md".to_string()]);

	assert!(text.contains("/v"), "{text}");
	assert!(text.contains("- a.md\n"), "{text}");
	assert!(text.ends_with("- dir/b c.md"), "{text}");
}

#[test]
fn turn_command_runs_in_the_vault_with_the_given_env_without_claudecode() {
	let req = request(Path::new("/vault"), Path::new("/bin/claude"));
	let env = EnvVars::from([("PATH".into(), "/x/bin".into()), ("CLAUDECODE".into(), "1".into())]);

	let cmd = turn_command(Path::new("/bin/claude"), &req, &env);

	assert_eq!(cmd.get_program(), "/bin/claude");
	assert_eq!(cmd.get_current_dir(), Some(Path::new("/vault")));
	let args: Vec<_> = cmd.get_args().map(|a| a.to_string_lossy().into_owned()).collect();
	assert_eq!(args, build_args(&req));
	// After `env_clear` the child gets exactly the listed vars.
	let envs: Vec<_> = cmd.get_envs().collect();
	assert_eq!(envs, [("PATH".as_ref(), Some("/x/bin".as_ref()))]);
}

// --- the turn's environment ------------------------------------------------------

#[test]
fn claude_gets_the_login_shell_env_and_not_the_app_env() {
	let dir = TempDir::new().unwrap();
	let home = TempDir::new().unwrap();
	// Set only in this test process, as a dev launch from a terminal would.
	std::env::set_var("KOKO_TEST_APP_ONLY_TURN", "leaked");
	let shell = script(dir.path(), "fake-login-shell", "export KOKO_LOGIN_VAR=from-login-shell\nexec /bin/sh -c \"$4\"");
	let mut base = clean_base(std::env::vars_os());
	base.insert("HOME".into(), home.path().into());
	let captured = capture_with(&shell, &base, Duration::from_secs(5)).unwrap();
	let env = TurnEnv { vars: child_env(&captured), captured: true };
	let claude = reporting_claude(dir.path(), "$KOKO_LOGIN_VAR|${KOKO_TEST_APP_ONLY_TURN:-absent}");
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start_with_env(&runs, dir.path(), request(vault.path(), &claude), &env).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert_eq!(result_text(&events), "from-login-shell|absent");
}

#[test]
fn claude_is_found_on_the_env_path() {
	let dir = TempDir::new().unwrap();
	let bin = TempDir::new().unwrap();
	reporting_claude(bin.path(), "from-path");
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();
	let path = format!("{}:{SYSTEM_PATH}", path_str(bin.path()));
	let env = TurnEnv { vars: EnvVars::from([("PATH".into(), OsString::from(path))]), captured: true };

	let (run_id, rx) = start_with_env(&runs, dir.path(), request(vault.path(), Path::new("")), &env).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert_eq!(result_text(&events), "from-path");
}

#[test]
fn captured_env_without_claude_runs_no_login_shell() {
	let dir = TempDir::new().unwrap();
	let marker = dir.path().join("shell-ran");
	let shell = script(dir.path(), "fake-shell-marker", &format!("touch '{}'\nexit 1", path_str(&marker)));
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();
	let req = request(vault.path(), Path::new(""));

	let error = run_turn_with(&runs, req.clone(), &system_env(), &shell, &[], |_| {}).unwrap_err();

	assert!(error.contains("not found"), "{error}");
	assert!(!marker.exists(), "a captured env must not run the login-shell lookup");

	// With the fallback env, Issue 01's login-shell lookup still runs.
	let fallback = TurnEnv { captured: false, ..system_env() };
	let _ = run_turn_with(&runs, req, &fallback, &shell, &[], |_| {}).unwrap_err();
	assert!(marker.exists(), "the fallback env keeps the login-shell lookup");
}

// --- runs ----------------------------------------------------------------------

#[test]
fn recorded_stream_is_emitted_in_order_and_ends_in_done() {
	let dir = TempDir::new().unwrap();
	let fixture = dir.path().join("stream.ndjson");
	fs::write(&fixture, RECORDED).unwrap();
	let args_file = dir.path().join("args");
	let claude = script(
		dir.path(),
		"claude",
		&format!(
			"pwd > '{args}'\nprintf '%s\\n' \"$@\" >> '{args}'\necho 'warning: on stderr' >&2\necho 'not json'\ncat '{fixture}'",
			args = path_str(&args_file),
			fixture = path_str(&fixture),
		),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	let mut state = StreamState::default();
	let mut expected: Vec<ClaudeEvent> = RECORDED.lines().flat_map(|l| dispatch_line(l, &mut state)).collect();
	expected.push(ClaudeEvent::Done { exit_code: Some(0) });
	assert_eq!(events, expected);

	let recorded_args = fs::read_to_string(&args_file).unwrap();
	let mut lines = recorded_args.lines();
	assert_eq!(fs::canonicalize(lines.next().unwrap()).unwrap(), fs::canonicalize(vault.path()).unwrap());
	let argv: Vec<&str> = lines.collect();
	assert_eq!(argv[0], "-p");
	assert_eq!(argv[argv.len() - 2..], ["--", "hello"]);
	assert!(runs.is_empty(), "a finished run removes itself");
}

#[test]
fn sleeping_run_cancelled_mid_run_ends_in_done() {
	let dir = TempDir::new().unwrap();
	let init = r#"{"type":"system","subtype":"init","session_id":"s","model":"m","slash_commands":[]}"#;
	// No `exec`: the kill must reach the sleeping grandchild through the group.
	// The grandchild starts before Init is printed, so the cancel never lands
	// while `sh` is still forking it (a child forked during `killpg` can miss
	// the signal on macOS: `.scratch/claude-code-integration/issues/07-cancel-
	// misses-a-child-forked-during-killpg.md`).
	let claude = script(dir.path(), "claude", &format!("sleep 30 &\necho '{init}'\nwait\necho 'never'"));
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let first = rx.recv_timeout(WAIT).unwrap();
	assert!(matches!(first.event, ClaudeEvent::Init { .. }), "{first:?}");

	runs.cancel(&run_id);
	let rest = collect_until_done(&rx, &run_id);

	assert_eq!(rest, vec![ClaudeEvent::Done { exit_code: None }]);
	assert!(runs.is_empty());
	runs.cancel(&run_id); // finished run: no-op
}

#[test]
fn grandchild_holding_stderr_does_not_hold_back_done() {
	let dir = TempDir::new().unwrap();
	let result = r#"{"type":"result","subtype":"success","is_error":false,"session_id":"s","result":"ok"}"#;
	// The background job keeps claude's stderr open, but not its stdout, for
	// 8 s after claude exits (a stdio MCP server can do the same).
	let claude = script(dir.path(), "claude", &format!("sleep 8 >/dev/null &\necho '{result}'\nexit 0"));
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let started = std::time::Instant::now();
	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert!(started.elapsed() < Duration::from_secs(5), "Done took {:?}", started.elapsed());
	assert_eq!(events.last(), Some(&ClaudeEvent::Done { exit_code: Some(0) }));
	assert!(runs.is_empty());
}

#[test]
fn cancel_of_an_unknown_run_is_a_no_op() {
	let runs = ClaudeRuns::default();

	runs.cancel("no-such-run");

	assert!(runs.is_empty());
}

#[test]
fn second_turn_for_the_same_vault_is_refused_while_one_runs() {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", "exec sleep 30");
	let vault = TempDir::new().unwrap();
	let other_vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let error = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap_err();
	assert!(error.contains("already running"), "{error}");

	// Another vault may run at the same time.
	let (other_id, other_rx) = start(&runs, dir.path(), request(other_vault.path(), &claude)).unwrap();

	runs.cancel(&run_id);
	runs.cancel(&other_id);
	collect_until_done(&rx, &run_id);
	collect_until_done(&other_rx, &other_id);

	// Once the first run ended the vault takes a new one.
	let (third, third_rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	runs.cancel(&third);
	collect_until_done(&third_rx, &third);
}

#[test]
fn non_zero_exit_without_result_reports_stderr() {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", "echo 'Error: not logged in' >&2\nexit 2");
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert_eq!(events.len(), 2, "{events:?}");
	let ClaudeEvent::Error { message } = &events[0] else { panic!("{events:?}") };
	assert!(message.contains("Error: not logged in"), "{message}");
	assert!(message.contains('2'), "{message}");
	assert_eq!(events[1], ClaudeEvent::Done { exit_code: Some(2) });
}

#[test]
fn non_zero_exit_after_a_result_adds_no_error() {
	let dir = TempDir::new().unwrap();
	let result = r#"{"type":"result","subtype":"error_during_execution","is_error":true,"session_id":"s","result":"failed"}"#;
	let claude = script(dir.path(), "claude", &format!("echo '{result}'\necho 'oops' >&2\nexit 1"));
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert!(matches!(events[0], ClaudeEvent::Result { is_error: true, .. }), "{events:?}");
	assert_eq!(events[1..], [ClaudeEvent::Done { exit_code: Some(1) }]);
}

#[test]
fn spawn_failure_emits_error_then_done() {
	let dir = TempDir::new().unwrap();
	// Executable and named claude, so the resolver accepts it, but the
	// interpreter does not exist, so the spawn fails.
	let claude = dir.path().join("claude");
	fs::write(&claude, "#!/no/such/interpreter\n").unwrap();
	fs::set_permissions(&claude, fs::Permissions::from_mode(0o755)).unwrap();
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(vault.path(), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert_eq!(events.len(), 2, "{events:?}");
	assert!(matches!(&events[0], ClaudeEvent::Error { message } if message.contains("could not start")), "{events:?}");
	assert_eq!(events[1], ClaudeEvent::Done { exit_code: None });
	assert!(runs.is_empty());
}

#[test]
fn missing_vault_directory_is_a_spawn_failure() {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", "echo hi");
	let runs = ClaudeRuns::default();

	let (run_id, rx) = start(&runs, dir.path(), request(&dir.path().join("gone"), &claude)).unwrap();
	let events = collect_until_done(&rx, &run_id);

	assert!(matches!(events[0], ClaudeEvent::Error { .. }), "{events:?}");
	assert_eq!(events[1], ClaudeEvent::Done { exit_code: None });
}

#[test]
fn binary_not_named_claude_is_refused_without_spawning() {
	let dir = TempDir::new().unwrap();
	let marker = dir.path().join("ran");
	let sh = script(dir.path(), "sh", &format!("touch '{}'", path_str(&marker)));
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let error = start(&runs, dir.path(), request(vault.path(), &sh)).unwrap_err();

	assert!(error.contains("named claude"), "{error}");
	assert!(!marker.exists(), "the refused binary must not run");
	assert!(runs.is_empty());
}

#[test]
fn turn_request_deserializes_from_camel_case() {
	let req: ClaudeTurnRequest = serde_json::from_value(serde_json::json!({
		"vaultPath": "/v",
		"prompt": "/hello world",
		"contextNotePaths": ["a.md"],
		"binaryPath": "",
	}))
	.unwrap();

	assert_eq!(req.vault_path, "/v");
	assert_eq!(req.prompt, "/hello world");
	assert_eq!(req.resume_session_id, None);
	assert_eq!(req.model, None);
	assert_eq!(req.context_note_paths, ["a.md"]);
}

#[test]
fn event_payload_serializes_run_id_in_camel_case() {
	let payload = ClaudeEventPayload { run_id: "r1".into(), event: ClaudeEvent::TextDelta { text: "x".into() } };

	assert_eq!(
		serde_json::to_value(&payload).unwrap(),
		serde_json::json!({ "runId": "r1", "event": { "type": "TextDelta", "text": "x" } })
	);
}
