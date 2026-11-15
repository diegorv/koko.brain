# Scout 04: where Issue 05 (login shell env for `claude`) lives in the codebase

Paths are relative to the `mvp-claude` worktree unless prefixed `I02:` (= `/Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/mvp-claude.worktrees/issue-02-rust-turn-runner`, HEAD 680751aa0, clean, still changing).

Legend: **[V]** verified by reading code or running a harmless command; **[I]** inference; **[M]** from memory, not checked against a source.

---

## 1. Process spawns in Issue 01 and Issue 02

### Issue 01 (`src-tauri/src/commands/claude.rs`, merged on `mvp-claude`)

| What | Where | How |
|---|---|---|
| Login-shell lookup | `claude.rs:136-147` `lookup_login_shell` | `std::process::Command::new(shell).args(["-lc", "command -v claude"]).env_remove("CLAUDECODE")`; **non-interactive** (`-lc`, no `-i`). Last non-empty stdout line, kept only if absolute + executable. [V] |
| `--version` | `claude.rs:70-74` `version_command`, `153-166` `read_version` | `Command::new(binary).arg("--version").env_remove(CLAUDECODE)`. [V] |
| Timeout | `claude.rs:175-199` `run_with_timeout(cmd, timeout) -> Result<Output, String>` (private) | stdin null, stdout/stderr piped, `try_wait` poll every 20 ms, on deadline `child.kill()` + `wait()` (kills the direct child only, no process group). Output read with `wait_with_output` after exit. Doc comment `172-174` names the known limit: a background process holding the pipe blocks `wait_with_output` past the timeout. [V] |
| Env | only `env_remove(CLAUDECODE)`; no `env_clear` anywhere in `src-tauri/src`. [V] |
| Async | `claude_status` (`claude.rs:123-131`) is `async` and wraps everything in `tokio::task::spawn_blocking` (the lookup and `--version` block up to 5 s each). [V] |
| Shell choice | `login_shell()` `claude.rs:56-58` -> `shell_from_env(var_os("SHELL"))` `62-67`, fallback `/bin/zsh`. [V] |
| Error strings | built from `cmd.get_program()` only (`181,188,193,196`), never `{cmd:?}`. [V] |

### Issue 02 (in progress, `I02:`)

- Committed so far: `resolve_claude(override, shell, candidates, timeout) -> Result<PathBuf, String>` (I02 `claude.rs`, the diff splits it out of `claude_status_with`), `pub mod stream;`, `I02:src-tauri/src/commands/claude/stream.rs` (`ClaudeEvent` ts-rs enum `:19`, `StreamState` `:86`, `dispatch_line` `:92`). [V]
- **Not written yet**: `turn.rs` (spawn, cancel, `ClaudeRuns`, `run_turn_with`). Plan in `I02:.scratch/claude-code-integration/work/02/discovery.md` (Plan 3-5): [V, plan text]
  - std threads, "no new tokio features"; `Command` with cwd = vault, `CLAUDECODE` removed, stdin null, stdout/stderr piped, `process_group(0)`.
  - stdout thread: `read_until` + lossy UTF-8 -> `dispatch_line` -> sink; stderr thread logs, keeps last 20 lines.
  - Cancel: cancelled flag + `libc::killpg(pgid, SIGKILL)`; run removed from the map before `wait` so `killpg` never targets a reaped pgid.
  - `claude_run_turn` runs resolve + spawn on `spawn_blocking`; signature planned `run_turn_with(request, shell, candidates, sink)`.
- Consequence [I]: every turn without an override runs `$SHELL -lc 'command -v claude'` again (resolve per turn), so the first turn after Issue 05 would run two login shells (`-lc` lookup and `-lic` capture).

### Deps relevant to the choice [V] (`src-tauri/Cargo.toml`)

- `tokio = { features = ["rt-multi-thread", "fs", "io-util"] }` (`:67`): **no `process`, no `sync` declared**. `tokio::sync::OnceCell` may compile through feature unification from tauri/reqwest [I], but relying on it is fragile. `tokio::process` is not available without adding the feature.
- `libc = "0.2"` (`:49`) present (needed for `setsid`/`killpg`). `uuid` v4 (`:39`) present (for unique markers). `tempfile` dev-only (`:105`).
- `std::sync::OnceLock` / `LazyLock` already used: `utils/logger.rs:17`, `semantic/mod.rs:17`, `vault/aliases.rs:9`, `vault/parsing.rs:1448ff`. [V]

## 2. Other spawns / shell env readers / reusable helpers

- `quick_capture/source.rs:243-259` `run_osascript`: plain `Command::new("osascript").output()`, no timeout, no env handling. Nothing reusable. [V]
- No other `Command::new` in `src-tauri/src`; nothing reads the shell environment; `std::env::var` only at `commands/semantic.rs:83` (a cache-mode flag). [V]
- The old terminal plugin (ADR-0022, portable-pty) was removed (`f5cc43cf2 refactor: remove terminal plugin entirely`); no env code survives. [V]
- `src-tauri/src/utils/`: `fs.rs`, `logger.rs`, `main_heartbeat.rs`, `resource_usage.rs`. No process helper. [V]
- Only reusable piece: `run_with_timeout` (`claude.rs:175`, private). Making it `pub(crate)` is the cheap reuse, but see section 5 for why the capture needs a session/group kill it does not do.
- `lib.rs` setup (`lib.rs:283-307`): builds the menu, installs the log sink, builds the composer window, registers shortcuts. **No background task is started at startup today**, no `thread::spawn` / `async_runtime::spawn` in setup. Managed state via `.manage(...)` at `lib.rs:319-324`. Background threads elsewhere are started lazily from commands (`utils/main_heartbeat.rs:70`, `utils/resource_usage.rs:169`, `quick_capture/commands.rs:378`). [V]
- `src-tauri/tests/core_tauri_free_test.rs:9` ratchets `vault, db, search, semantic, utils` to be Tauri-free; `commands/` is exempt. A new module under `commands/claude/` with no Tauri import is fine either way. [V]

## 3. Timing options

Facts that decide it:
- `debug_log` is a no-op until the frontend enables debug mode (`utils/logger.rs:54-57`), and the frontend does that only after the vault settings load (`src/lib/app/lifecycle/app-lifecycle.service.ts:227-230`). A capture started in `lib.rs` setup would fail-log into nothing, breaking the AC "failure goes to debug_log once". [V]
- The feature is off by default (spec). Startup capture would run the user's interactive rc files on every launch for users who never enable it. [V spec / I cost]
- `claude_status` runs only when the Settings Claude Code section mounts (`src/lib/features/claude-code/ClaudeCodeSection.svelte:25-39`, `$effect` + `untrack`). [V] Issue 03's panel may also call it [I].
- `std::sync::OnceLock::get_or_init` / `LazyLock::force`: concurrent callers block until the single in-flight init finishes [M, std docs]. That gives option (c) semantics without an async primitive.

| Option | Settings status | First turn | Terminal launch | Tests |
|---|---|---|---|---|
| (a) startup task | unaffected | warm | wasted on every launch | needs Tauri wiring; log lost (debug mode off) |
| (b) lazy on first use, cached | if status awaits the capture, status grows by up to 5 s (already up to 10 s: lookup + `--version`) | pays capture (rc time, typically 0.1-2 s [I]) | one capture, harmless | easy: commands never run in tests |
| (c) prewarm on first status, await on first turn | status unchanged if prewarm is a detached thread | warm if Settings was opened first | same as (b) | same as (b) |

**Recommendation [I]:** (b)+(c) with no startup wiring: `claude_status` fires a detached prewarm (`std::thread::spawn(|| { LazyLock::force(&LOGIN_ENV); })`) and returns without waiting; `claude_run_turn` forces it inside its existing `spawn_blocking`. Matches the AC text ("on the first `claude_run_turn` or `claude_status`").

**Skip when the env is already full?** Possible heuristic: `SHLVL` is set by shells and absent under launchd [I/M]. Recommend **not** skipping: the capture is once per run, merging over a full env changes nothing, and skipping would mean `pnpm tauri dev` never exercises the Finder code path. But see section 5 (controlling-tty hazard), which is the real terminal-launch difference.

## 4. Testing

Existing infra [V]:
- Integration tests live in `src-tauri/tests/commands/*.rs`, registered in `src-tauri/tests/commands/mod.rs` and compiled through `src-tauri/tests/commands_test.rs` (one test binary, shared process: a global `OnceLock` cannot be reset between tests).
- `tests/commands/claude_test.rs:22-27` `script(dir, name, body, mode)` writes `#!/bin/sh` fakes into a `TempDir`; `:30` `failing_shell`; `:244-262` hanging `--version` with `exec sleep 30` and a 300 ms timeout, asserting `< 5 s`. Every test passes its own shell and candidates (`claude_status_with`), the `#[tauri::command]` wrapper is never called. `#![cfg(unix)]` at `:7`.
- I02 adds `tests/commands/claude_stream_test.rs` and fixture `tests/fixtures/claude/stream.ndjson`; planned `claude_turn_test.rs`.
- In-module `#[cfg(test)]` is used too (`utils/logger.rs:77`), but the repo rule is `src-tauri/tests/` for Rust (CLAUDE.md Conventions).

ts-rs: Issue 05 adds no `#[ts(export)]` type if the env stays out of `ClaudeTurnRequest`/`ClaudeStatus` and their doc comments are untouched. Gate stays Rust only, as the Issue says. [V AC / I design]

Fast hang/marker tests [I]:
- Fake login shell: receives `-lic <script>` as `$1 $2`; body `echo 'prompt noise'; export KOKO_TEST_LOGIN=from-login; exec /bin/sh -c "$2"`. This runs the real marker script, so parsing is exercised end to end.
- Hang: `exec sleep 30`, timeout 300 ms, assert elapsed < 5 s and fallback env returned.
- No markers: `echo hi` -> `None`, returns immediately.
- `/usr/bin/env -0` works on this Mac (macOS 26.6.2; `env -0` alone OK, `env -0 <cmd>` is refused with "cannot specify command with -0"). [V]

## 5. Risks specific to this repo

1. **Interactive shell + controlling tty (terminal launch).** [M, zsh source behavior; VS Code does the same capture with `spawn(shell, ['-i','-l','-c', ...], { detached: true })`, from memory] `zsh -i` with no tty on stdin opens `/dev/tty`, and with job control tries to become the tty's foreground group (`acquire_pgrp`), sending itself `SIGTTIN` when it is in a background group. Under `pnpm tauri dev` the app has the terminal as controlling tty, so: with `process_group(0)` the capture shell can stop until the timeout every time; without it, the shell can steal the terminal's foreground group from pnpm. Fix: start the capture shell in a new session (`pre_exec(|| { libc::setsid(); Ok(()) })`, `unsafe`, `libc` already a dep), which drops the controlling tty and makes the shell a group leader so a timeout can `killpg` the rc-file children too. Finder launches have no controlling tty, so this only bites dev runs, which is why the probes would not show it. Needs a real check by the implementer in `pnpm tauri dev`.
2. **Pipe held past exit.** `run_with_timeout`'s known limit (`claude.rs:172-174`) is likelier with `-i` rc files (background `&!` jobs, e.g. zcompile in some zsh frameworks [M]). After the shell exits, `killpg` on its group before reading closes leftovers; on timeout `killpg` instead of `kill`. Per CLAUDE.md §2 this is a named, rare case: the owner decides whether the helper handles it.
3. **`Command`'s `Debug` prints env assignments** [M, std `impl Debug for Command`]. Once the turn `Command` carries the merged env (`env_clear().envs(...)`), any `{cmd:?}` in an error string or `debug_log` leaks every captured secret to the webview, the session log file (`src/lib/utils/debug.ts:128-132` writes `TAURI:RUST:*` lines) and, through frontend `error()` (`debug.ts:29-31`), to Sentry. Issue 01 uses `get_program()` only [V]; keep that rule in I02's `turn.rs`.
4. **Sentry (Rust)** `error_monitoring.rs:49-55`: `send_default_pii(false)`, `max_breadcrumbs(0)`, features `backtrace, contexts, panic, transport` (`Cargo.toml:72`). It does not attach the process env [M for the `contexts` integration: OS/device/rust only]. A panic message containing an env value would be reported: no `expect`/`unwrap` messages that format values. [V config / I]
5. **Logging.** `debug_log(tag, msg)` (`utils/logger.rs:54`) goes to stderr + the frontend sink -> log file. Log the variable count and elapsed ms only; never the stdout/stderr of the capture shell (rc files can print secrets), never keys or values. Existing stream code logs a whole non-JSON stdout line (`I02:stream.rs:100`), which is claude's output, not the env; fine.
6. **Privacy CI** (`.github/workflows/privacy.yml:84-113`): greps `src-tauri/src/**/*.rs` for `reqwest`, `TcpStream::connect`, `https?://` etc. Skips `_test\.rs`, `tests/`, `localhost`, `privacy-ok`, and lines matching `:\s*///`. A URL in a `//!` module doc or `//` comment in the new module **trips it** (only `///` is skipped). No URLs in the new file. Runs only on push to main, not in relay deliver (memory note). [V]
7. **Overlaying `PATH` changes `claude` resolution in the child only**, not Issue 01's resolver (still `-lc`, which misses PATH set only in `.zshrc`, e.g. nvm-installed claude). [I] Optional follow-up: resolve `claude` against the captured `PATH` (pure, no spawn) and drop the per-turn `-lc` run. Not in Issue 05's AC; owner call.
8. **Failure is cached for the run** (AC "once per app run"): a cold-start timeout leaves every turn on the fallback until restart. AC-consistent; mention to owner. [I]
9. Non-POSIX `$SHELL` (nushell, xonsh) will not run the `printf ...; /usr/bin/env -0; printf ...` script; the fallback covers it. fish accepts `-l -i -c` [M]; `-lic` combined flags in fish unverified.

## 6. Placement proposal

**File:** `src-tauri/src/commands/claude/shell_env.rs`, declared `pub mod shell_env;` in `commands/claude.rs` next to `pub mod stream;` (same file + directory module layout I02 uses). Claude-only, so not `utils/`.

**Public API** (byte-safe: env values are not guaranteed UTF-8, use `OsString` via `std::os::unix::ffi::OsStringExt`):

```rust
pub type EnvVars = Vec<(OsString, OsString)>;

/// How long the login-shell capture may run.
pub const CAPTURE_TIMEOUT: Duration = Duration::from_secs(5);

/// The shell script run as `$SHELL -lic <script>`: start marker, `/usr/bin/env -0`, end marker.
pub fn capture_script(start: &str, end: &str) -> String;

/// Pure. Entries between the markers, split on NUL, each at its first '='.
/// `None` when either marker is missing or nothing lies between them.
pub fn parse_env_output(stdout: &[u8], start: &str, end: &str) -> Option<EnvVars>;

/// Pure. `app` overlaid with `captured` minus PWD, OLDPWD, SHLVL, _, CLAUDECODE;
/// then CLAUDECODE removed.
pub fn merge_env(app: EnvVars, captured: &EnvVars) -> EnvVars;

/// Pure. `app` with PATH extended by ~/.local/bin, /opt/homebrew/bin, /usr/local/bin
/// (those not already in it), CLAUDECODE removed.
pub fn fallback_env(app: EnvVars, home: Option<&Path>) -> EnvVars;

/// Runs `shell -lic` in a new session with a timeout; unique markers from uuid.
/// Error text names the shell and the reason only.
pub fn capture_login_env(shell: &Path, timeout: Duration) -> Result<EnvVars, String>;

/// Pure glue: merge on success, fallback on failure.
pub fn child_env(app: EnvVars, captured: Result<&EnvVars, &str>, home: Option<&Path>) -> EnvVars;

/// Production only (never called by tests): the cached capture for this run,
/// logged once with debug_log (count + ms, or the failure reason).
pub fn login_env() -> &'static Result<EnvVars, String>;   // static LazyLock
/// Starts the capture on a detached thread; returns at once.
pub fn prewarm();
```

**Caching primitive:** `static LOGIN_ENV: LazyLock<Result<EnvVars, String>>` (std; pattern already in `vault/aliases.rs:9`). No `app.manage`, no tokio `sync`/`process` features.

**Call sites:**
- `claude_status` (`claude.rs:123`): call `shell_env::prewarm()` before/after its `spawn_blocking`; do not await.
- I02 `claude_run_turn`: inside the existing `spawn_blocking`, compute `child_env(std::env::vars_os().collect(), shell_env::login_env().as_ref().map_err(String::as_str), home)` and pass it to `run_turn_with`.
- I02 `run_turn_with(request, shell, candidates, env: &EnvVars, sink)`: `cmd.env_clear().envs(env.iter().map(...))` before spawn (keep the `env_remove(CLAUDECODE)` too or rely on `merge_env`). The extra parameter is the only change to Issue 02's runner, so tests inject env without the global.

**Startup wiring:** none in `lib.rs`.

**Tests** (`src-tauri/tests/commands/claude_shell_env_test.rs`, add to `tests/commands/mod.rs`, `#![cfg(unix)]`, reuse a local `script()` helper like `claude_test.rs:22`):
1. parse: noise before the start marker ignored; value with `\n` kept; value with `=` kept (split at first `=`).
2. parse: missing start marker -> None; missing end marker -> None; empty between markers -> None.
3. parse: entry without `=` and empty key skipped; non-UTF-8 bytes preserved.
4. merge: captured overrides app; app-only vars kept; PWD/OLDPWD/SHLVL/_/CLAUDECODE from captured not applied; CLAUDECODE from app removed.
5. fallback: adds only missing dirs, keeps order, no duplicates; PATH absent -> the three dirs; `home: None` skips `~/.local/bin`; CLAUDECODE removed.
6. capture_script: contains both markers and `/usr/bin/env -0`.
7. capture with a fake shell that prints noise, exports `KOKO_TEST_LOGIN`, and `exec /bin/sh -c "$2"`: result contains it and no noise.
8. capture with a hanging fake shell (`exec sleep 30`), 300 ms timeout: Err, elapsed < 5 s.
9. capture with a fake shell that prints no markers: Err, fast.
10. capture with a fake shell that leaves `sleep 30 &` behind: returns before 5 s (only if the owner accepts the group kill from risk 2).
11. integration (needs I02's `run_turn_with`): fake shell exports `KOKO_TEST_LOGIN`; `child_env(..)` -> `run_turn_with(.., &env, sink)` with a fake `claude` printing a `result` line containing `$KOKO_TEST_LOGIN`; the `Result` event text carries it.
12. integration fallback: capture fails -> fake `claude` prints `$PATH`; `Result` text contains `/opt/homebrew/bin`.

Unverified: std `Command` Debug env printing, zsh `/dev/tty` + `acquire_pgrp` behavior, VS Code's `detached: true`, fish flag parsing, tokio feature unification. The implementer should check the first two against the Rust std source and `pnpm tauri dev` before relying on them.
