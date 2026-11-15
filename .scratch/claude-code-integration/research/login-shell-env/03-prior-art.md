# 03: Prior art, "GUI app needs the user's shell environment"

Scout 3 of 4. Research only, no repo changed. Sources were read on 2026-11-14 through `gh api` (raw file contents at default-branch HEAD) and `gh issue/pr view`. Local copies of every file quoted are in `/tmp/kk-deepdive/src/`.

Labels: **[V]** is verified in source, an issue, a PR or a commit. **[I]** is my inference.

---

## 1. Zed (zed-industries/zed, Rust)

Files: `crates/util/src/shell_env.rs`, `crates/util/src/util.rs` (`load_login_shell_environment`, `load_shell_from_passwd`, `set_pre_exec_to_start_new_session`), `crates/zed/src/main.rs:453-464`, `crates/project/src/environment.rs`, `crates/project/src/agent_server_store.rs`.

### When it captures
- **[V] Process-wide, at startup, in the background.** `main.rs:453-463` spawns `util::load_login_shell_environment()` on the background executor **only if `!stdout_is_a_pty()`**. A launch from a terminal skips it because the env is already right. A oneshot `shell_env_loaded_tx` signals completion, and `NodeRuntime::new(..., Some(shell_env_loaded_rx), ...)` (main.rs:569) waits on it before resolving `node`.
- **[V] Per directory, lazily, cached for the project's lifetime.** `ProjectEnvironment::local_directory_environment` keeps a `HashMap<(Shell, Arc<Path>), Shared<Task<Option<HashMap>>>>`. The first request for a directory spawns a capture that runs `cd <dir>` first, and every later caller shares the same future. Nothing refreshes it. If the project was opened from the `zed` CLI, the CLI's inherited env is used and no shell is spawned.
- **[V] Agent servers (Claude ACP, MCP-like external agents) use `default_environment()`**, which is the directory environment of the first visible worktree, or `$HOME` when there is none (`agent_server_store.rs:1170, 1367, 1562`). The command's own `env` and `extra_env` are layered on top: `env.extend(command.env); env.extend(extra_env)`.

### Command
- **[V]** `<shell> -l -i -c "cd '<dir>'; '<zed-exe>' --printenv >&0"` for POSIX shells. Variants: csh/tcsh get `arg0("-")` instead of `-l`; fish gets `emit fish_prompt;` first "in fish, asdf, direnv attach to the `fish_prompt` event"; nushell gets `-l -e '<cmd>; exit'`. A directory starting with `-` gets a `./` prefix.
- **[V] The output goes to a separate fd, not stdout.** The env is printed by Zed's own binary (`zed --printenv` dumps `std::env::vars()` as JSON) and redirected to **fd 0**, which Zed replaces with a pipe through `command_fds::FdMapping`. Stdout and stderr are piped separately and ignored except for diagnostics. Comment: "In some shells, file descriptors greater than 2 cannot be used in interactive mode, so file descriptor 0 (stdin) is used instead. This impacts zsh, old bash" (zed PR #32136). This makes startup noise on stdout (prompt themes, banners) irrelevant.
- **[V]** `set_pre_exec_to_start_new_session` calls `libc::setsid()` in `pre_exec`, "to prevent interactive shells from taking control of the terminal" (links Thorsten Ball, "How to lose control of your shell").

### Parsing
- **[V]** `parse_env_map_from_noisy_output` tries `serde_json` deserialization from every `{` in the output until one parses, so it tolerates noise before the JSON.
- **[V] It parses before checking the exit status.** When the JSON parses but the shell exited non-zero, it logs a warning and accepts the env. Comment: "The user's shell rc files may contain commands that fail (e.g. editor integrations that call posix_spawnp outside a real PTY), causing a non-zero exit status even though `zed --printenv` ran successfully" (see issue #53873, inshellisense exits 1).

### Timeout and kill
- **[V] None.** `spawn_and_read_fd` does `reader.read_to_end()` and then `process.output().await`, with no deadline and no kill. A hanging rc file blocks node resolution and every directory env forever.

### Variables kept
- **[V] All of them.** The global capture skips only `SHLVL`: "The login shell used for env capture increments SHLVL, and if we propagate it, terminals spawned by Zed will inherit it and increment again" (issue #33958). It then `set_var`s everything into Zed's own process. The directory env keeps everything and adds a marker `ZED_ENVIRONMENT=worktree-shell|cli`.
- **[V]** On Windows it renames `Path` to `PATH`.

### Merge
- **[V]** The global capture overwrites the process env variable by variable (shell wins, PATH included, with no merge). Directory envs are used as the complete child env, with per-command `env` layered on top.

### Shell selection
- **[V]** `load_shell_from_passwd()` reads `getpwuid_r(getuid())` and sets `SHELL` from `pw_shell` when `$SHELL` is unset, or differs and does not exist.

### direnv
- **[V]** The `load_direnv` setting has three values. `ShellHook` relies on the user's shell hook firing on `cd`. `Direct` runs `direnv export json` with the captured env and `TERM=dumb` in the directory, then applies it (a `null` value removes the variable). `Disabled` returns an empty env.

### Known bugs [V]
- #60800 (open): stdio MCP servers that need `node`/`npx` fail with "Context server request timeout" on a Finder/Dock launch "before login shell PATH is loaded". This is the same failure Kokobrain is fixing, caused by a race with the async capture.
- #58386 (closed): the terminal takes 6+ s to open because the env capture blocks the shell spawn, with heavy rc files (nvm, pyenv, conda).
- #35759 (open): bash `-i` without a TTY prints "cannot set terminal process group", and a `.bashrc` that does `exec fish` breaks the capture with exit 127. The user asks why the shell is interactive at all.
- #53873 (closed): inshellisense in `.zshrc` crashes (ENOTCONN) under capture, so the shell exits 1. This is the reason for the parse-before-status rule above.
- #45798, #52061, #52518, #64913: fish and nushell capture failures.
- #33958: SHLVL inflation.
- #52054 (closed): Claude ACP got the first window's environment, not the second's (a cache-key regression).

---

## 2. VS Code (microsoft/vscode)

File: `src/vs/platform/shell/node/shellEnv.ts` (`getResolvedShellEnv`, `doResolveUnixShellEnv`). Callers: `code/electron-main/app.ts:1833`, `platform/terminal/node/ptyHostService.ts:130`, `platform/agentHost/electron-main/electronAgentHostStarter.ts:370`, and others. Merge: `base/parts/sandbox/electron-browser/preload.ts:78-88`.

### When
- **[V] Once per main process, lazily, memoized as a module-level promise** (`unixShellEnvPromise`). It is skipped on Windows, with `--force-disable-user-env`, and when launched from the CLI (`VSCODE_CLI` set) unless `--force-user-env` is passed. Issue #108804 changed it so the window no longer waits on it. Consumers (pty host, extension host, agent host) await it on their own.

### Command
- **[V]** `<shell> -i -l -c "'<electron-exe>' -p '\"<mark>\" + JSON.stringify(process.env) + \"<mark>\"'"`, with `ELECTRON_RUN_AS_NODE=1`. Electron runs as node and prints its env as JSON between the marks. csh/tcsh get `-ic`, pwsh gets `-Login -Command`, nu gets `^'path'`, and xonsh uses a native Python one-liner (#200374).
- **[V]** `<mark>` is a random 12-hex-char UUID slice made per call. Regex: `new RegExp(mark + '({.*})' + mark)`.
- **[V]** Spawn options: `detached: true, stdio: ['ignore','pipe','pipe']`. The env is `process.env` plus `ELECTRON_RUN_AS_NODE=1`, `ELECTRON_NO_ATTACH_CONSOLE=1` and **`VSCODE_RESOLVING_ENVIRONMENT=1`**. The docs (`vscode-docs/docs/configure/command-line.md:318-322`) say users can test that variable in their rc files to skip slow or interactive things. The docs also explain the interactive login choice: VS Code "needs [it] in order to try to align `$PATH` with the exact value in a user created terminal".

### Timeout and kill
- **[V]** The default is 10 s, configurable through `application.shellEnvironmentResolutionTimeout` and clamped to 1..120 s (issue #152655). On timeout, `cts.dispose(true)` cancels, `child.kill()` sends SIGTERM to the shell only, and the promise rejects with "Unable to resolve your shell environment in a reasonable time. Please review your shell configuration and restart." `app.ts` shows that as a notification, and other callers log it and use `{}`.
- **[V] Any non-zero exit code or signal rejects** ("Unexpected exit code from spawned shell (code {0}, signal {1})"), even when the JSON was printed.

### Variables kept
- **[V] All of them.** It removes `VSCODE_RESOLVING_ENVIRONMENT` and `XDG_RUNTIME_DIR` (#22593), and restores or removes `ELECTRON_RUN_AS_NODE` and `ELECTRON_NO_ATTACH_CONSOLE` to their pre-probe values.

### Merge
- **[V]** `{ ...process.env, ...shellEnv, ...userEnv }`: the shell wins over the app env, and the CLI/user env wins over both. PATH is replaced whole, with no merge.

### Caching and refresh
- **[V]** Once per run, never refreshed. A rejected promise stays cached, so the user has to restart.

### Known bugs [V]
- #113869: the timeout fires after a macOS restart that restores windows, because the machine is busy at login.
- #251957, #251328, #251901: "Bad escaped character / Unterminated string / Unexpected end of JSON". Corrupt or truncated output fails the whole resolution.
- #243644 (exit code 9), #138708 (SIGSEGV), #320001 (SIGABRT): a non-zero exit from rc-file side effects fails the whole resolution.
- #244694: `$SHELL` pointed to a removed Homebrew bash (ENOENT), and there was no fallback shell.
- #226384: `NODE_OPTIONS` in `.zshrc` broke Electron-as-node. This hazard comes from using your own runtime to print the env.
- #167335, #146719, #135626: nushell, fish and elvish support.

---

## 3. tauri-apps/fix-path-env-rs and sindresorhus shell-env / shell-path / fix-path

### fix-path-env-rs [V]
- `src/lib.rs` is the whole crate (~90 lines of logic). It runs `$SHELL` (default `/bin/zsh` on macOS, `/bin/sh` elsewhere) as `-ilc 'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`, with `DISABLE_AUTO_UPDATE=true` (oh-my-zsh) and `current_dir(home)`. It uses blocking `Command::output()`.
- Parsing: split on the fixed delimiter, take part 1, `strip_ansi_escapes`, split on `\n`, `splitn(2,'=')`.
- `fix()` keeps PATH only, `fix_vars(&[..])` an allowlist, `fix_all_vars()` everything. It always **`std::env::set_var` into the app process**, and no API returns the map (open issue #23 asks for `get_*` variants "without polluting the main app's environment").
- **No timeout, no kill, no fallback shell, no PATH merge** (the shell PATH replaces the app's). Any non-zero exit returns `Err(EchoFailed)`.
- Known bugs: #7 (open since 2023), values containing newlines are truncated to their first line (line-based `env` parsing). #22, a `.zshrc` error such as `$(npm bin -g)` sets PATH to `Unknown command: "bin"` and still returns `Ok`. #14, nushell fails.
- Maintenance: last code commit 2025-08-25, repo pushed 2025-09-25, 82 stars, 12 open issues. **It is not published on crates.io** (`crates.io/api/v1/crates/fix-path-env` returns "does not exist"). The README says to use a git dependency, and issues #11/#12 ask for a release or tags.
- **Verdict [I]: not a reasonable dependency for this case.** It is git-only, has no timeout (a hanging rc file blocks `main` before Tauri starts), breaks multi-line values, writes into the global process env (unsound with threads in Rust 2024: `set_var` is `unsafe`), and covers less than a 60-line in-house function. Its useful ideas are `DISABLE_AUTO_UPDATE` and running from `$HOME`.

### sindresorhus/shell-env (and shell-path, fix-path) [V]
- `shell-env`: `-ilc 'echo -n "_SHELL_ENV_DELIMITER_"; command env; echo -n "_SHELL_ENV_DELIMITER_"; exit'`. `command env` avoids aliases and functions named `env`. The env sets `DISABLE_AUTO_UPDATE=true`, `ZSH_TMUX_AUTOSTARTED=true` and `ZSH_TMUX_AUTOSTART=false`, which stops the oh-my-zsh tmux plugin from exec'ing tmux and hanging. When the default shell fails it falls back to `/bin/zsh`, then `/bin/bash`, then `process.env`. Parsing is line-based and has the same newline limit as above. There is no timeout (`execa` with no `timeout` option).
- `shell-path` returns `shellEnv().PATH`. `fix-path` sets `process.env.PATH` to the shell PATH, or a hardcoded fallback (`./node_modules/.bin:/.nodebrew/current/bin:/usr/local/bin:$PATH`).
- These are the origin of the `-ilc` plus delimiter pattern that fix-path-env-rs copies.

---

## 4. t3code (pingdotgg/t3code)

Files: `apps/desktop/src/shell/DesktopShellEnvironment.ts` (802 lines), `packages/shared/src/shell.ts` (1175 lines).

### Brief vs source
| Claim in brief | Verified? |
|---|---|
| `<shell> -ilc` with printenv per name | **[V]** `args: ["-ilc", buildEnvironmentCaptureCommand(shell, names)]`. For each name: `printf '%s\n' '__T3CODE_ENV_<NAME>_START__'; printenv NAME \|\| "$__T3CODE_PRINTENV" NAME \|\| true; printf ... _END__`. |
| Allowlist listed | **[V], and longer than the brief.** `LOGIN_SHELL_ENV_NAMES` = PATH, ANDROID_HOME, ANDROID_SDK_ROOT, DBUS_SESSION_BUS_ADDRESS, DISPLAY, LANG, LC_ALL, LC_CTYPE, SSH_AUTH_SOCK, HOMEBREW_PREFIX/CELLAR/REPOSITORY, XDG_CONFIG_HOME, XDG_CURRENT_DESKTOP, XDG_DATA_HOME, XDG_RUNTIME_DIR, XDG_SESSION_DESKTOP, XDG_SESSION_TYPE, WAYLAND_DISPLAY, SSL_CERT_FILE, SSL_CERT_DIR, NODE_EXTRA_CA_CERTS, T3CODE_TELEMETRY_ENABLED, T3CODE_GITHUB_APP_CLIENT_ID, __MISE_DIFF, JAVA_HOME. Not `LC_*` as a wildcard: only LC_ALL and LC_CTYPE. |
| Candidates $SHELL, os.userInfo().shell, /bin/zsh | **[V]** `listLoginShellCandidates`: $SHELL, `os.userInfo().shell` (passwd), then `/bin/zsh` on darwin or `/bin/bash` on linux, deduped. It stops at the first shell that yields a PATH. |
| 5 s timeout and one 20 s retry | **[V]** plus more. `LOGIN_SHELL_TIMEOUT=5s`. The first shell that times out is read once more with `SLOW_LOGIN_SHELL_TIMEOUT=20s` ("A profile can be slow only while the machine boots", PR #35033). If the result is still not from the user's own shell, it retries in the background after 30 s, up to 10 times, with `RETRY_PROBE` (2 min timeout, 10 s SIGTERM grace) "to outlast pyenv's 60 s wait on its rehash lock" and because "A Mac asleep at launch fails the first probe on wake" (PR #30667, merged 2026-11-14). |
| launchctl getenv PATH fallback | **[V]** `/bin/launchctl getenv PATH` with a 2 s timeout, used only on darwin when no shell gave a PATH. |
| Shell PATH merged before inherited PATH | **[V]** `mergePathValues(shellPATH ?? launchctlPATH, inherited PATH)`: shell entries first, then inherited entries not already present, deduped (case-insensitive on Windows). On POSIX it does not trim whitespace (PR #33840). |
| Installs into its own process env at startup | **[V]** `publish()` calls `applyShellEnvironment(process.env, patch)`. The server child receives updates over fd4. |

### Details the brief did not have [V]
- **Merge policy per variable.** PATH is merged. `SSH_AUTH_SOCK` is filled only if missing. DBUS/XDG_SESSION*/`__MISE_DIFF` are **shell-preferred** (overwrite). DISPLAY, HOMEBREW_*, XDG_CONFIG/DATA/RUNTIME, WAYLAND_DISPLAY, SSL_CERT_*, NODE_EXTRA_CA_CERTS and JAVA_HOME are **filled only if missing**. LANG/LC_ALL/LC_CTYPE are hydrated together only when all three are unset, and otherwise fall back to `LC_CTYPE=en_US.UTF-8` (launchd has no locale, and pbcopy decodes as MacRoman, PR #6236). Android SDK variables are also hydrated as a group.
- **Kill handling.** `killSignal: SIGTERM`, `forceKillAfter` grace 1 s (10 s on retries). The probe runs in a detached fiber and the caller waits only for the timeout: "Interrupting awaits the child's exit, which a shell stuck in the kernel never reaches" (PR #27938, a Windows volume hang). The shared sync reader uses `killSignal: SIGKILL` because `execFileSync` waits for exit and a profile that traps SIGTERM blocked startup for 16 s (PR #7295). It uses `detached: true` "so job control on an inherited controlling TTY cannot stop the probe".
- **stderr.** It is set to `stderr: "ignore"`. With it piped and unread, a noisy profile filled the pipe and stalled until the timeout (PR #21913, regression test with 2 MiB of stderr).
- **Requires exit 0.** A non-zero exit gives empty output and falls through to the next shell.
- **DEBUG trap.** It prefixes `(trap - DEBUG) 2>/dev/null && trap - DEBUG;` because a DEBUG trap that echoes each command (for example into the terminal title) printed the markers (PR #32646).
- **printenv lookup.** It finds `printenv` through the profile PATH, then the inherited PATH, then `/usr/bin/printenv`, because a profile that does `export PATH="$HOME/bin"` made `printenv` unfindable and every value was lost (PR #35617).
- **Cache across runs.** `shell-environment-cache.json` in the state dir (mode 0600, atomic rename) holds only PATH, `__MISE_DIFF`, HOMEBREW_*, JAVA_HOME and the SSL/CA variables. Its key is `[platform, home, SHELL, ZDOTDIR]`. At startup the cached PATH is applied at once and the probe refreshes in the background (PR #28556, "discover shell environment without blocking startup"). A refresh starts from the inherited baseline "so removed cached paths and values do not survive".

### Why each allowlist entry exists [V]
Every entry was added by a bug-driven PR:
- SSH_AUTH_SOCK: #972, git over SSH from Finder.
- `__MISE_DIFF`: #19340, "Claude and Codex no longer time out behind mise wrappers". Without it, `mise x` re-resolves to the wrapper and loops forever. Only `__MISE_DIFF` matters.
- SSL_CERT_FILE, SSL_CERT_DIR, NODE_EXTRA_CA_CERTS: #19604, a Node without bundled roots failed TLS with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`.
- LANG, LC_ALL, LC_CTYPE: #6236.
- JAVA_HOME: #22856.
- Android SDK variables: #24623.
- T3CODE_TELEMETRY_ENABLED: #16563.

### Allowlist vs all variables
- **Users pushed for all variables and maintainers held the line.** PR #12494 ("hydrate the whole login-shell environment ... NUL-delimited `env -0` capture", backfill-only) and PR #11286 (an `allowlist|all` setting) were both closed. The author's reason for wanting all: "My agents expect to be working in my shell with my tools, and they were endlessly confused when entire package managers, runtime versions, etc disappeared" (BUN_INSTALL, CARGO_HOME, RUSTUP_HOME, nvm/fnm). Maintainer (juliusmarminge): "Could you clarify why server startup should import every exported login-shell variable rather than the missing variables needed by the reported tools, and link maintainer agreement on that scope? #972 established a narrower desktop backfill". A review bot flagged "potentially sensitive variables". PR #10312 (SSH agent recovery) was left unmerged "for credential-propagation review".
- **[I]** The allowlist rationale is scope control and credential caution, and no technical failure of the all-variables approach is cited. Its cost is visible in roughly 8 follow-up PRs, each adding one variable after a user hit a missing one. It does not give terminal parity, which is what the Kokobrain owner wants.

---

## 5. Tolaria (refactoringhq/tolaria, Tauri and Rust)

Files: `src-tauri/src/cli_agent_runtime.rs`, `src-tauri/src/cli_agent_runtime/shell_env.rs` (361 lines), `src-tauri/src/claude_cli.rs`.

### Does it parse startup files without running them?
**[V] No. It runs them.** `user_shell_bindings_from_shell` runs `<shell> -lc "<rc_source>; for name in N1 N2 ...; do value=$(printenv "$name" 2>/dev/null || true); if [ -n "$value" ]; then printf '__TOLARIA_ENV__:%s=%s\n' "$name" "$value"; fi; done"`.
- The shell is login but **not interactive** (`-lc`). It explicitly sources the rc file instead: for zsh, `. "${ZDOTDIR}/.zshrc"` or `. "$HOME/.zshrc"`, and for bash `. "$HOME/.bashrc"`, each with `>/dev/null 2>&1 || true`. Other shells (fish) get no rc sourcing.
- Candidates: $SHELL, then `/bin/zsh`, then `/bin/bash`, taking the first existing one that exits 0 and yields at least one binding. `stdin(Stdio::null())`, `.output()`.
- **No timeout, no kill, no cache.** The probe runs on **every claude command build** (`build_claude_command`, then `configure_claude_command_environment`, then `apply_user_shell_env_vars_if_missing`), but only for allowlisted names that are missing or empty in both the app process and the `Command`.
- Parsing is line-based with a prefix. It trims values and drops empty ones. A multi-line value is cut at the first newline and later lines are ignored [I from the code].

### Variables kept [V]
`CLAUDE_PROVIDER_ENV_KEYS`: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL, ANTHROPIC_CUSTOM_HEADERS, ANTHROPIC_MODEL, ANTHROPIC_SMALL_FAST_MODEL, CLAUDE_CODE_USE_BEDROCK, CLAUDE_CODE_USE_VERTEX, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, AWS_PROFILE, AWS_REGION, AWS_DEFAULT_REGION, GOOGLE_APPLICATION_CREDENTIALS, CLOUD_ML_REGION, VERTEX_REGION, HTTPS_PROXY, HTTP_PROXY, NO_PROXY, SSL_CERT_FILE, SSL_CERT_DIR, NODE_EXTRA_CA_CERTS. They are added with commit af9cc118e "fix: inherit shell ai provider env", whose message gives no other rationale. **PATH is not captured from the shell.**

### PATH [V]
`configure_agent_command_environment` sets the child PATH to the app PATH plus, appended only if absent: the resolved binary's directory, `~/.local/bin`, `~/.local/share/mise/shims`, `~/.asdf/shims`, `~/.npm-global/bin`, `~/.npm/bin`, `~/.bun/bin`, `~/.linuxbrew/bin`, Windows npm/pnpm/scoop directories, `/opt/homebrew/bin`, `/usr/local/bin`, `/home/linuxbrew/.linuxbrew/bin`. The `claude` command also gets `.env_remove("CLAUDECODE")` "to prevent 'nested session' guard". Binary discovery is `which`, then `<shell> -lc 'command -v <name>'`, then hardcoded candidates.

### Known bugs [V]
- #1315: agent detection reports every CLI as missing when the login-shell lookup is slow (~1 s `.zprofile` × 8 parallel probes within a shared 5 s budget). Fixed 2026-11-06.
- #643: Linux AppImage `LD_LIBRARY_PATH` leaked into the `node` children of MCP.
- #980: git was not found on macOS (PATH).
- **[I]** The hardcoded directory list does not cover nvm (`~/.nvm/versions/node/<v>/bin`), fnm, volta or pnpm on macOS. So `npx`-launched MCP servers still fail for nvm users, which is the Kokobrain failure.

---

## 6. Comparison

| | Zed | VS Code | fix-path-env-rs | shell-env (npm) | t3code | Tolaria |
|---|---|---|---|---|---|---|
| When | startup (bg, skipped if stdout is a pty) and per-directory lazy | lazy, once per run (skipped if launched from CLI) | when the app calls it (README: start of `main`) | caller | startup (bg), with disk cache applied first | every claude spawn, only for missing names |
| Shell flags | `-l -i -c` (fish: `emit fish_prompt`; csh: argv0 `-`) | `-i -l -c` (csh: `-ic`) | `-ilc` | `-ilc` | `-ilc` | `-lc` + explicit `. ~/.zshrc` |
| cwd | `cd <dir>` in the command (home for global) | inherited | `$HOME` | inherited | inherited | inherited |
| Print / parse | own binary `--printenv` JSON to **fd 0**, scan for first parseable `{` | own binary `-p` JSON between random marks, regex | fixed delimiter + `env`, line split | fixed delimiter + `command env`, line split | per-name START/END markers + `printenv` | prefix lines + `printenv` |
| Multi-line values | yes | yes | **no** (#7) | **no** | yes | **no** |
| Timeout | **none** | 10 s (1..120 configurable) | **none** | **none** | 5 s, 20 s once, bg retries (2 min) ×10 | **none** |
| Kill | n/a | SIGTERM to shell | n/a | n/a | SIGTERM, then SIGKILL after grace; detached; caller does not wait | n/a |
| Non-zero exit | accepted if output parses | **rejects** | rejects | rejects, then fallback shells | rejects, then next shell | rejects, then next shell |
| Vars kept | **all** minus SHLVL | **all** minus XDG_RUNTIME_DIR, own sentinels | PATH / list / all | all | allowlist (~26) | allowlist (23 auth/proxy/CA) |
| PATH merge | shell replaces | shell replaces | shell replaces | n/a | shell first + inherited appended, deduped | app PATH + hardcoded dirs appended |
| Other merge | shell overwrites | app < shell < CLI user env | overwrite | n/a | per-var: fill-if-missing or shell-preferred | fill-if-missing only |
| Fallbacks | none (env stays launchd's) | `{}` + notification | Err | /bin/zsh, /bin/bash, process.env | next shell, launchctl PATH, cached PATH | next shell, hardcoded PATH dirs |
| Cache / refresh | per process / per (shell, dir), never refreshed | per process, failure cached too | none | none | memory + disk, bg refresh, retry until user shell answers | none |
| Sentinel for rc files | none | `VSCODE_RESOLVING_ENVIRONMENT=1` | `DISABLE_AUTO_UPDATE` | `DISABLE_AUTO_UPDATE`, `ZSH_TMUX_AUTOSTART*` | none | none |
| TTY isolation | `setsid()` in pre_exec | `detached: true` | none | none | `detached: true` | none |

---

## 7. Recommendation for Kokobrain's Rust implementation (Issue 05)

### Which approach to copy
**[I]** Copy Zed's model (interactive login shell, keep everything, home directory, accept output despite a non-zero exit, `setsid`), with VS Code's timeout and t3code's kill and PATH-merge discipline. Zed is the only Rust desktop app of the six that spawns agent CLIs and MCP-like servers with full terminal parity, and it has years of field reports. Its two real weaknesses are both on the list below: no timeout, and a race between the capture and the first spawn.

### All variables vs allowlist
- **All (minus a denylist).** Recommended, because the owner asked for terminal parity. Evidence:
  - [V] Zed and VS Code, the two most-used editors, keep all variables. My issue searches ("shell environment", "Unable to resolve your shell environment") turned up no report of harm from keeping all of them, though I did not search specifically for secret leaks.
  - [V] t3code's allowlist needed roughly 8 bug-driven additions (mise, CA certs, locale, JAVA_HOME, SSH_AUTH_SOCK, Android), and its users still report missing CARGO_HOME, BUN_INSTALL and nvm (closed PRs #12494 and #11286).
  - [V] Tolaria's allowlist covers auth variables only, so tool variables are still missing.
  - [I] `claude` run from a terminal already sees every exported variable, so propagating all of them adds no exposure beyond what the user does by hand. The secret concern t3code raises is about broad fan-out to many child types; here there is one child, `claude`.
- **Denylist** (strip from the capture before the merge):
  - `SHLVL` (Zed #33958), `PWD`, `OLDPWD`, `_`.
  - The app's own sentinel (VS Code strips `VSCODE_RESOLVING_ENVIRONMENT`).
  - `CLAUDECODE` (Tolaria `env_remove`).
  - **[I]** Also consider `TERM_PROGRAM`, `TERM_SESSION_ID` and `ITERM_*`, which appear only if the probe inherited them (from a terminal launch, irrelevant from Finder). `XDG_RUNTIME_DIR` matters on Linux only (VS Code #22593).
  - Issue 05's list (`PWD`, `OLDPWD`, `SHLVL`, `_`, `CLAUDECODE`) matches the prior art. Adding the sentinel name is the only gap.
- **Never log values** (no project logs them except VS Code at trace level). Issue 05 already says so.

### Concrete design points, each tied to a bug it avoids
1. **Shell.** Use `$SHELL`, else `getpwuid_r(getuid()).pw_shell` (Zed's `load_shell_from_passwd`), else `/bin/zsh`. Skip a `$SHELL` that does not exist (VS Code #244694, a deleted Homebrew bash). [I] Issue 05's "$SHELL, fallback /bin/zsh" is fine for an MVP. The passwd step is cheap insurance.
2. **Flags.** Use `-l -i -c` (all four mature tools use interactive login; Tolaria's `-lc` plus manual sourcing misses `.zprofile`-only and `ZDOTDIR` edge cases). Accept that bash `-i` without a TTY prints job-control warnings on stderr (Zed #35759). Ignore stderr.
3. **Print to a channel startup noise cannot reach.** Options in order of robustness [I]:
   - (a) A temp file: `/usr/bin/env -0 > "$KOKO_ENV_OUT"`, with the path passed as an env var or argument and the file read after exit. No extra crate, immune to stdout noise, DEBUG traps (t3code #32646) and prompt themes.
   - (b) Zed's fd-0 trick, which needs the `command-fds` crate.
   - (c) Issue 05's markers on stdout around `env -0`. Workable, but make the marker random per run (VS Code), use an absolute `/usr/bin/env` (t3code #35617: a profile that replaces PATH loses `printenv`/`env`), and accept that a DEBUG trap that echoes commands can print the marker text twice. Take the last start-marker occurrence that is followed by an end marker.
   - [V] `/usr/bin/env -0` works on macOS and emits `FOO=a\nb\0`, so values with newlines survive (checked locally).
4. **Parse even when the exit is non-zero**, if the markers or file are complete (Zed's rule, inshellisense #53873, VS Code #243644 and #138708). Treat "no output" as the failure, not the exit code.
5. **Timeout plus process-group kill.** Spawn with `CommandExt::process_group(0)` or `setsid` in `pre_exec` (Zed). On deadline, `kill(-pgid, SIGTERM)`, wait about 1 s, then `SIGKILL` (t3code #7295: profiles that trap SIGTERM). Never block on `read_to_end` of stdout after the deadline. A grandchild (gpg-agent, inshellisense node) can hold the pipe open (t3code #27938 class). With option 3(a) you only wait on the shell's exit.
   - [I] Use 10 s rather than 5 s. VS Code's 10 s default and t3code's 5 s plus 20 s retry both exist because 5 s fails at boot or after wake (VS Code #113869, t3code #35033/#30667). Since Issue 05 captures lazily on the first turn, the user is already waiting.
6. **stdin null, stderr drained or null** (t3code #21913: an unread stderr pipe deadlocked a noisy profile).
7. **Child env for the probe.** The app env plus a sentinel `KOKOBRAIN_RESOLVING_ENVIRONMENT=1` (VS Code's documented pattern, so the owner can guard `exec tmux` or slow plugins), `DISABLE_AUTO_UPDATE=true`, `ZSH_TMUX_AUTOSTART=false` and `ZSH_TMUX_AUTOSTARTED=true` (shell-env). `current_dir($HOME)` (fix-path-env, Zed's global capture: "the env a user would have when spawning a shell in home directory", which makes mise and direnv home hooks fire).
8. **PATH merge.** Shell PATH first, then app PATH entries not already present (t3code `mergePathValues`). This keeps `/usr/bin:/bin` reachable when a profile replaced PATH, and costs nothing. Other variables: shell overwrites app (Zed and VS Code; this is parity).
9. **Cache.** Cache success for the run (Issue 05's OnceCell). [I] **Do not cache a failure permanently.** VS Code caches its rejected promise and users must restart (#113869). t3code added background retries for exactly this. The simplest form: store `Option<Env>` and let a failed capture be retried on the next turn. [I] Optionally kick the capture off in the background at app start, so the first turn rarely waits (Zed's startup capture). Zed #60800 shows that the first spawn must still **await** the in-flight capture rather than race it.
10. **Fallback when capture fails.** The app env with PATH extended by known directories (Tolaria's list is more complete than Issue 05's three: add `~/.local/share/mise/shims`, `~/.asdf/shims`, `~/.bun/bin`, `~/.npm-global/bin`). [I] On macOS, `launchctl getenv PATH` is a cheap second fallback (t3code), though it is usually empty unless the user set it.
11. **Locale.** [I] If the capture fails, `LANG`/`LC_CTYPE` are absent under launchd (t3code #6236). With an all-variables capture this is moot on success. On failure, setting `LC_CTYPE=en_US.UTF-8` when all locale variables are unset is a one-liner t3code found worth it.
12. **Out of scope for an MVP** [I]: per-directory capture with `cd <vault>` (Zed's project env), relevant only if a vault has `.envrc` or a mise config; fish/nushell special cases (the owner uses zsh); disk cache across runs (t3code).

### Bugs to write tests against
- [V] These come from the trackers above: a hanging rc file (`sleep 60`), one that ignores SIGTERM (`trap '' TERM; sleep 60`), noise on stdout before the markers, 2 MiB on stderr, exit 1 after printing a valid env, a profile that sets `PATH=$HOME/bin` only, a value containing a newline, and a background grandchild that keeps stdout open (`sleep 60 &` without redirection).
- Issue 05's tests (a hanging fake shell, one with no markers) cover only the first and part of the third.
