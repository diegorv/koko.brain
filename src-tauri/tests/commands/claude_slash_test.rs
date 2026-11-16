//! Tests for `commands::claude::slash`: the `initialize` reply parser, and
//! whole requests against fake `claude` scripts in a temp dir. The scripts
//! read one stdin line and echo its `request_id` in the reply, and exit 3 when
//! no request arrives. The resolver gets a failing login shell and no
//! candidates, so the developer's real `claude` never runs. Rows use built-in
//! or invented names only.

#![cfg(unix)]

use kokobrain_lib::commands::claude::shell_env::{EnvVars, TurnEnv, SYSTEM_PATH};
use kokobrain_lib::commands::claude::slash::{
	initialize_request, parse_initialize_line, slash_args, slash_commands_with, InitializeLine, SlashCommandInfo,
};
use kokobrain_lib::commands::claude::turn::{run_turn_with, ClaudeRuns, ClaudeTurnRequest};
use serde_json::json;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tempfile::TempDir;

const ID: &str = "req-1";
const LONG: Duration = Duration::from_secs(20);
const SHORT: Duration = Duration::from_secs(1);

fn script(dir: &Path, name: &str, body: &str) -> PathBuf {
	let path = dir.join(name);
	fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
	fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
	path
}

fn path_str(path: &Path) -> String {
	path.to_string_lossy().into_owned()
}

fn system_env() -> TurnEnv {
	TurnEnv { vars: EnvVars::from([("PATH".into(), SYSTEM_PATH.into())]), captured: true }
}

/// Reads the request line (exit 3 without one) and sets `$id` to its `request_id`.
const READ_REQUEST: &str = r#"IFS= read -r line || exit 3
id=$(printf '%s\n' "$line" | sed 's/.*"request_id":"\([^"]*\)".*/\1/')"#;

/// The success reply to `$id`, with the one row of `rows()`.
const REPLY: &str = r#"printf '{"type":"control_response","response":{"subtype":"success","request_id":"%s","response":{"commands":[{"name":"debug","description":"Enable debug logging","argumentHint":"[issue description]","builtin":true}]}}}\n' "$id""#;

const HOOK_LINES: &str = r#"echo '{"type":"system","subtype":"hook_started","hook_name":"SessionStart"}'
echo '{"type":"system","subtype":"hook_response","hook_name":"SessionStart"}'"#;

fn rows() -> Vec<SlashCommandInfo> {
	vec![SlashCommandInfo {
		name: "debug".into(),
		description: "Enable debug logging".into(),
		argument_hint: "[issue description]".into(),
		aliases: vec![],
	}]
}

/// A fake `claude` with `body`, and the vault it runs in.
fn fake(body: &str) -> (TempDir, TempDir, PathBuf) {
	let dir = TempDir::new().unwrap();
	let claude = script(dir.path(), "claude", body);
	(dir, TempDir::new().unwrap(), claude)
}

fn request(runs: &ClaudeRuns, dir: &Path, vault: &Path, claude: &Path, deadline: Duration) -> Result<Vec<SlashCommandInfo>, String> {
	let shell = script(dir, "fake-shell-none", "exit 1");
	slash_commands_with(runs, &path_str(claude), &path_str(vault), &system_env(), &shell, &[], deadline)
}

/// Waits for the script to write its pid (its process group id) to `file`.
fn read_pgid(file: &Path) -> libc::pid_t {
	let deadline = Instant::now() + Duration::from_secs(10);
	loop {
		if let Some(pid) = fs::read_to_string(file).ok().and_then(|s| s.trim().parse().ok()) {
			return pid;
		}
		assert!(Instant::now() < deadline, "the script did not start");
		std::thread::sleep(Duration::from_millis(20));
	}
}

fn assert_group_gone(pgid: libc::pid_t) {
	// An orphaned `sleep` is reaped by init, so its group can outlive the call for a moment.
	let deadline = Instant::now() + Duration::from_secs(2);
	while unsafe { libc::killpg(pgid, 0) } == 0 && Instant::now() < deadline {
		std::thread::sleep(Duration::from_millis(20));
	}
	assert_eq!(unsafe { libc::killpg(pgid, 0) }, -1, "group {pgid} still has a process");
	assert_eq!(std::io::Error::last_os_error().raw_os_error(), Some(libc::ESRCH));
}

// --- parser ------------------------------------------------------------------

fn reply_line(request_id: &str, commands: serde_json::Value) -> String {
	json!({
		"type": "control_response",
		"response": { "subtype": "success", "request_id": request_id, "response": { "commands": commands, "pid": 1 } },
	})
	.to_string()
}

#[test]
fn request_line_is_an_initialize_control_request() {
	let line = initialize_request(ID);
	assert!(line.ends_with('\n'));
	let value: serde_json::Value = serde_json::from_str(&line).unwrap();
	assert_eq!(value, json!({ "type": "control_request", "request_id": ID, "request": { "subtype": "initialize" } }));
}

#[test]
fn lines_that_are_not_this_requests_reply_are_other() {
	let other_success = reply_line("req-2", json!([{ "name": "debug" }]));
	let other_error = json!({ "type": "control_response", "response": { "subtype": "error", "request_id": "req-2", "error": "x" } }).to_string();
	for line in [
		"",
		"not json",
		"[1,2]",
		r#"{"type":"system","subtype":"hook_started","hook_name":"SessionStart"}"#,
		r#"{"type":"system","subtype":"init","slash_commands":["debug"]}"#,
		r#"{"type":"control_response"}"#,
		other_success.as_str(),
		other_error.as_str(),
	] {
		assert_eq!(parse_initialize_line(line, ID), InitializeLine::Other, "{line}");
	}
}

#[test]
fn this_requests_reply_gives_its_rows() {
	let line = reply_line(
		ID,
		json!([
			{ "name": "debug", "description": "Enable debug logging", "argumentHint": "[issue description]", "builtin": true },
			{ "name": "my-tool:sketch", "description": "Draw a sketch (my-tool)", "argumentHint": "", "aliases": ["sketch-internal"], "plugin": "my-tool" },
		]),
	);
	assert_eq!(
		parse_initialize_line(&format!("{line}\n"), ID),
		InitializeLine::Commands(vec![
			SlashCommandInfo {
				name: "debug".into(),
				description: "Enable debug logging".into(),
				argument_hint: "[issue description]".into(),
				aliases: vec![],
			},
			SlashCommandInfo {
				name: "my-tool:sketch".into(),
				description: "Draw a sketch (my-tool)".into(),
				argument_hint: String::new(),
				aliases: vec!["sketch-internal".into()],
			},
		])
	);
}

#[test]
fn an_empty_commands_list_gives_no_rows() {
	assert_eq!(parse_initialize_line(&reply_line(ID, json!([])), ID), InitializeLine::Commands(vec![]));
}

#[test]
fn a_missing_or_non_string_description_or_hint_is_empty() {
	let line = reply_line(
		ID,
		json!([
			{ "name": "a" },
			{ "name": "b", "description": 7, "argumentHint": null },
			{ "name": "c", "description": ["x"], "argumentHint": { "x": 1 } },
		]),
	);
	let InitializeLine::Commands(rows) = parse_initialize_line(&line, ID) else { panic!("{line}") };
	for row in rows {
		assert_eq!((row.description.as_str(), row.argument_hint.as_str()), ("", ""), "{}", row.name);
	}
}

#[test]
fn aliases_that_are_missing_or_not_a_string_array_are_empty() {
	let line = reply_line(
		ID,
		json!([
			{ "name": "a" },
			{ "name": "b", "aliases": "b2" },
			{ "name": "c", "aliases": ["c2", 3] },
			{ "name": "d", "aliases": null },
			{ "name": "e", "aliases": ["e2", "e3"] },
		]),
	);
	let InitializeLine::Commands(rows) = parse_initialize_line(&line, ID) else { panic!("{line}") };
	let aliases: Vec<(String, Vec<String>)> = rows.into_iter().map(|r| (r.name, r.aliases)).collect();
	assert_eq!(
		aliases,
		vec![
			("a".into(), vec![]),
			("b".into(), vec![]),
			("c".into(), vec![]),
			("d".into(), vec![]),
			("e".into(), vec!["e2".to_string(), "e3".to_string()]),
		]
	);
}

#[test]
fn an_error_reply_is_malformed() {
	let line = json!({ "type": "control_response", "response": { "subtype": "error", "request_id": ID, "error": "Already initialized" } }).to_string();
	let InitializeLine::Malformed(message) = parse_initialize_line(&line, ID) else { panic!("{line}") };
	assert!(message.contains("Already initialized"), "{message}");
}

#[test]
fn a_reply_without_a_commands_array_is_malformed() {
	for response in [json!({}), json!({ "commands": {} }), json!({ "commands": "debug" }), json!(null)] {
		let line = json!({ "type": "control_response", "response": { "subtype": "success", "request_id": ID, "response": response } }).to_string();
		assert!(matches!(parse_initialize_line(&line, ID), InitializeLine::Malformed(_)), "{line}");
	}
	let no_inner = json!({ "type": "control_response", "response": { "subtype": "success", "request_id": ID } }).to_string();
	assert!(matches!(parse_initialize_line(&no_inner, ID), InitializeLine::Malformed(_)));
}

#[test]
fn a_row_without_a_string_name_is_malformed_with_no_row_text_in_the_message() {
	for rows in [json!([{ "name": "a" }, { "description": "Secret text" }]), json!([{ "name": 3, "description": "Secret text" }]), json!(["a"])] {
		let line = reply_line(ID, rows);
		let InitializeLine::Malformed(message) = parse_initialize_line(&line, ID) else { panic!("{line}") };
		assert!(!message.contains("Secret"), "{message}");
	}
}

// --- runner ------------------------------------------------------------------

#[test]
fn runs_in_the_vault_with_the_stream_json_args_and_no_hook_switch() {
	let dir = TempDir::new().unwrap();
	let record = dir.path().join("record");
	let claude = script(
		dir.path(),
		"claude",
		&format!(
			"pwd > '{r}'\necho \"${{CLAUDECODE-unset}}\" >> '{r}'\nprintf '%s\\n' \"$@\" >> '{r}'\n{READ_REQUEST}\n{REPLY}",
			r = path_str(&record)
		),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();
	let mut env = system_env();
	env.vars.insert("CLAUDECODE".into(), "1".into());
	let shell = script(dir.path(), "fake-shell-none", "exit 1");

	let result = slash_commands_with(&runs, &path_str(&claude), &path_str(vault.path()), &env, &shell, &[], LONG);

	assert_eq!(result, Ok(rows()));
	let recorded = fs::read_to_string(&record).unwrap();
	let mut lines = recorded.lines();
	assert_eq!(fs::canonicalize(lines.next().unwrap()).unwrap(), fs::canonicalize(vault.path()).unwrap());
	assert_eq!(lines.next(), Some("unset"));
	let argv: Vec<&str> = lines.collect();
	assert_eq!(argv, slash_args());
	assert!(argv.windows(2).any(|w| w == ["--input-format", "stream-json"]), "{argv:?}");
	assert!(argv.contains(&"--no-session-persistence"), "{argv:?}");
	for refused in ["--bare", "--settings"] {
		assert!(!argv.contains(&refused), "{argv:?}");
	}
	assert!(!argv.iter().any(|a| a.contains("disableAllHooks")), "{argv:?}");
	assert!(runs.is_empty(), "a finished request unlists itself");
}

#[test]
fn skips_hook_lines_and_replies_to_other_requests() {
	let other_success = reply_line("req-other", json!([{ "name": "wrong" }]));
	let other_error = json!({ "type": "control_response", "response": { "subtype": "error", "request_id": "req-other", "error": "x" } }).to_string();
	let (dir, vault, claude) = fake(&format!(
		"{READ_REQUEST}\n{HOOK_LINES}\necho 'not json'\necho '{other_success}'\necho '{other_error}'\n{REPLY}"
	));
	let runs = ClaudeRuns::default();

	assert_eq!(request(&runs, dir.path(), vault.path(), &claude, LONG), Ok(rows()));
}

#[test]
fn reads_past_the_reply_until_the_script_exits_on_stdin_eof() {
	// `cat` returns only once stdin closes, so this ends only if the runner
	// closes stdin after the reply.
	let (dir, vault, claude) = fake(&format!("{READ_REQUEST}\n{REPLY}\ncat > /dev/null\n{HOOK_LINES}"));
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	assert_eq!(request(&runs, dir.path(), vault.path(), &claude, LONG), Ok(rows()));
	assert!(started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
}

#[test]
fn a_script_that_ignores_stdin_eof_after_the_reply_still_returns_the_rows_at_the_deadline() {
	let (dir, vault, claude) = fake(&format!("{READ_REQUEST}\n{REPLY}\n{HOOK_LINES}\nsleep 30"));
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	assert_eq!(request(&runs, dir.path(), vault.path(), &claude, SHORT), Ok(rows()));
	assert!(started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
	assert!(runs.is_empty());
}

#[test]
fn a_script_that_closes_stdout_and_keeps_running_is_killed_at_the_deadline() {
	let dir = TempDir::new().unwrap();
	let pid_file = dir.path().join("pid");
	let claude = script(
		dir.path(),
		"claude",
		&format!("printf '%s' \"$$\" > '{}'\n{READ_REQUEST}\n{REPLY}\nexec >&-\nsleep 30", path_str(&pid_file)),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	assert_eq!(request(&runs, dir.path(), vault.path(), &claude, SHORT), Ok(rows()));

	assert!(started.elapsed() >= SHORT && started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
	assert_group_gone(read_pgid(&pid_file));
	assert!(runs.is_empty());
}

#[test]
fn a_script_that_never_answers_is_killed_at_the_deadline_with_its_grandchild() {
	let dir = TempDir::new().unwrap();
	let pid_file = dir.path().join("pid");
	let claude = script(
		dir.path(),
		"claude",
		&format!("printf '%s' \"$$\" > '{}'\nsleep 30 &\n{READ_REQUEST}\nwait", path_str(&pid_file)),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	let result = request(&runs, dir.path(), vault.path(), &claude, SHORT);

	assert!(started.elapsed() >= SHORT && started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
	let message = result.unwrap_err();
	assert!(message.contains("did not answer"), "{message}");
	assert_group_gone(read_pgid(&pid_file));
	assert!(runs.is_empty());
}

#[test]
fn a_script_that_exits_without_a_reply_fails_at_once() {
	let (dir, vault, claude) = fake(&format!("{READ_REQUEST}\nexit 1"));
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	let message = request(&runs, dir.path(), vault.path(), &claude, LONG).unwrap_err();

	assert!(started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
	assert!(message.contains("without answering"), "{message}");
	assert!(runs.is_empty());
}

#[test]
fn an_error_reply_fails_at_once() {
	let (dir, vault, claude) = fake(&format!(
		"{READ_REQUEST}\nprintf '{{\"type\":\"control_response\",\"response\":{{\"subtype\":\"error\",\"request_id\":\"%s\",\"error\":\"nope\"}}}}\\n' \"$id\"\nsleep 30"
	));
	let runs = ClaudeRuns::default();

	let started = Instant::now();
	let message = request(&runs, dir.path(), vault.path(), &claude, LONG).unwrap_err();

	assert!(started.elapsed() < Duration::from_secs(5), "took {:?}", started.elapsed());
	assert!(message.contains("nope"), "{message}");
	assert!(runs.is_empty());
}

#[test]
fn a_refused_override_runs_nothing() {
	let dir = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();
	let shell = script(dir.path(), "fake-shell-none", "exit 1");

	let result = slash_commands_with(&runs, "/bin/sh", &path_str(vault.path()), &system_env(), &shell, &[], LONG);

	assert!(result.unwrap_err().contains("named claude"));
	assert!(runs.is_empty());
}

#[test]
fn cancel_all_kills_a_running_request_and_its_process_group() {
	let dir = TempDir::new().unwrap();
	let pid_file = dir.path().join("pid");
	let claude = script(
		dir.path(),
		"claude",
		&format!("printf '%s' \"$$\" > '{}'\nsleep 30 &\n{READ_REQUEST}\nwait", path_str(&pid_file)),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();

	let worker = {
		let (runs, dir, vault, claude) = (runs.clone(), dir.path().to_path_buf(), vault.path().to_path_buf(), claude.clone());
		std::thread::spawn(move || request(&runs, &dir, &vault, &claude, Duration::from_secs(30)))
	};
	let pgid = read_pgid(&pid_file);
	assert!(!runs.is_empty(), "a running request is listed");

	let cancelled_at = Instant::now();
	runs.cancel_all();
	let result = worker.join().unwrap();

	assert!(cancelled_at.elapsed() < Duration::from_secs(5), "took {:?}", cancelled_at.elapsed());
	assert!(result.is_err());
	assert_group_gone(pgid);
	assert!(runs.is_empty());
}

#[test]
fn a_running_request_does_not_keep_a_turn_from_starting_in_its_vault() {
	let dir = TempDir::new().unwrap();
	let pid_file = dir.path().join("pid");
	let claude = script(
		dir.path(),
		"claude",
		&format!("printf '%s' \"$$\" > '{}'\n{READ_REQUEST}\nsleep 30", path_str(&pid_file)),
	);
	let vault = TempDir::new().unwrap();
	let runs = ClaudeRuns::default();
	let worker = {
		let (runs, dir, vault, claude) = (runs.clone(), dir.path().to_path_buf(), vault.path().to_path_buf(), claude.clone());
		std::thread::spawn(move || request(&runs, &dir, &vault, &claude, Duration::from_secs(30)))
	};
	read_pgid(&pid_file);

	let turn_dir = TempDir::new().unwrap();
	let turn_claude = script(turn_dir.path(), "claude", "exit 0");
	let shell = script(turn_dir.path(), "fake-shell-none", "exit 1");
	let turn = ClaudeTurnRequest {
		vault_path: path_str(vault.path()),
		prompt: "hello".into(),
		resume_session_id: None,
		model: None,
		context_note_paths: vec![],
		binary_path: path_str(&turn_claude),
	};
	let started = run_turn_with(&runs, turn, &system_env(), &shell, &[], |_| {});

	runs.cancel_all();
	let _ = worker.join();
	assert!(started.is_ok(), "{started:?}");
}
