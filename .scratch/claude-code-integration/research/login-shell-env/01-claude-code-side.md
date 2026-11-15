# 01: What Claude Code does about the environment, and what breaks when a GUI app starts it

Scout 1 of 4. Research only; no repo file changed. Claude Code 2.1.325 at
`/Users/diegorv/.local/bin/claude` (Bun-compiled Mach-O; source read from
`strings` of the binary), macOS, zsh, 2026-11-14.

Label key: **[probe]** = measured on this machine below, **[source]** = read in
the 2.1.325 binary, **[docs]** = code.claude.com docs, **[issue]** = GitHub
issue text (not maintainer-confirmed unless stated), **[inference]** = my
reasoning, not verified.

## TL;DR

Claude Code (the CLI) does **not** repair a minimal environment for any of the
four channels. Everything it spawns (Bash tool, command hooks, stdio MCP
servers, status line) gets **PATH from its own process environment** (or from a
`PATH` in a settings `env` block). The shell snapshot sources `~/.zshrc` in a
login shell, but it keeps only functions, aliases and shell options, then writes
`export PATH=<the claude process's PATH>`, so the login-shell PATH is computed
and thrown away. Anthropic's own GUI hosts (Claude Desktop, the VS Code
extension) fix the environment in the host, not in the CLI.

Probe result with the Finder-like env (`PATH=/usr/bin:/bin:/usr/sbin:/sbin`):
auth works (Keychain), but **all 5 local stdio MCP servers fail**, two plugin
hooks fail with `node: command not found`, and the Bash tool sees the minimal
PATH (`node`, `npx`, `uvx` not found). With only `PATH` replaced by the
login-shell PATH, the user-scope MCP server, hooks and Bash all match the
terminal.

**Minimum Kokobrain must give the child:** the user's login-shell `PATH`, plus
`SHELL`, `HOME`, `USER`, `LOGNAME`, `TMPDIR` (and keep `SSH_AUTH_SOCK`,
`LANG`/`LC_*`, `__CF_USER_TEXT_ENCODING` that launchd provides). For full
terminal parity, the right source is the whole exported environment of a login
interactive shell (`$SHELL -l -i -c 'env -0'` style), not PATH alone, because
non-PATH exports from `~/.zshrc`/`~/.zprofile` (API keys referenced by
`${VAR}` in MCP configs, `NVM_DIR`, proxy vars, `ANTHROPIC_*`) reach MCP
servers and hooks only through the process environment.

Side effect to know before testing: one run with a bad PATH marks every
**plugin** stdio MCP server as failed for **15 minutes for all later `claude -p`
runs**, including runs with a correct env (recorded in
`~/.claude/mcp-needs-auth-cache.json`). A Kokobrain bug here would leak into
the user's terminal `-p` runs too. See section 6.

---

## 1. Bash tool: shell selection and the shell snapshot

### Shell selection [source]
Candidate order: `$CLAUDE_CODE_SHELL`, `$SHELL` (each only if the path contains
`bash` or `zsh`), then `which zsh`/`which bash`, then `/bin`, `/usr/bin`,
`/usr/local/bin`, `/opt/homebrew/bin` × (`zsh`,`bash`), zsh first unless
`$SHELL` is bash. First executable wins. Error if none: "No suitable shell
found ... Please ensure you have a valid shell installed and the SHELL
environment variable set." `CLAUDE_CODE_SHELL` added in 2.0.65 (changelog).
[probe] With `SHELL` unset, the Bash tool still ran `/bin/zsh` and exported
`SHELL=/bin/zsh` to the command.

### Snapshot creation [source]
- Config file: `~/.zshrc` for zsh, `~/.bashrc` for bash, else `~/.profile`
  (function `vkt`).
- Runs `<shell> -c -l <script>` (a **login** shell, so `/etc/zprofile`
  (path_helper), `~/.zshenv`, `~/.zprofile` run), env =
  `{...process env (+settings env), SHELL, GIT_EDITOR=true, CLAUDECODE=1}`.
- The script does `source "~/.zshrc" < /dev/null`, then writes to
  `~/.claude/shell-snapshots/snapshot-zsh-<ts>-<rand>.sh`: `unalias -a`,
  all functions, `setopt` lines, aliases (max 1000), rg/find/grep/pkill shims,
  and finally `export PATH=<value>`.
- On macOS/Linux the PATH value is computed **in JS before the shell runs**:
  `xei() ?? process.env.PATH`, where `xei()` is `PATH` from the settings `env`
  block (`settingsEnvForChildren.PATH`), plus plugin `bin/` dirs appended.
  Only on Windows does it probe `<shell> -lc 'echo "$PATH"'` and use the
  shell's PATH. So the login shell's PATH is never captured on macOS.
- Other exported variables from `~/.zshrc` are **not** in the snapshot. There
  is a branch that dumps `ENVIRON` after sourcing the rc file and imports new
  variables into Bash commands ("claude-code-shell-exports"), but it is gated
  on entrypoint `claude-desktop` / `claude-desktop-3p` and not a child
  session (`DP()`), so it never runs for `claude -p` from Kokobrain.
- Snapshot timeout leads to a partial file without the trailing PATH line
  (issue #68066, closed not planned).

### Command execution [source + probe]
- With a snapshot, commands run as `/bin/zsh -c 'source <snapshot> ... && eval
  <cmd>'` without `-l` (changelog 2.1.51: "BashTool now skips login shell (`-l`
  flag) by default when a shell snapshot is available"). So per command, zsh
  reads `/etc/zshenv` and `~/.zshenv` only, then the snapshot **overwrites
  PATH**. PATH edits in `~/.zshenv` are therefore also lost; non-PATH exports
  in `~/.zshenv` survive. [probe] `VITEST_MAX_WORKERS` and `XDG_CONFIG_HOME`
  (set in this user's `~/.zshenv`) were present in Bash under the minimal env,
  PATH was not.
- After the snapshot, the contents of `CLAUDE_ENV_FILE` (hook-written, or a
  script path the user sets before launch) are evaluated before each command
  (docs: "Each Bash command runs the file's contents as shell code before the
  command itself"). This is the one documented in-CLI fix point.
- Command env = `Ts()`: process env with settings `env` applied, minus OTEL_*
  (changelog 2.1.128), plus `CLAUDECODE=1`, `CLAUDE_CODE_CHILD_SESSION=1`,
  `TMPDIR` override, etc.

### Issues
- #43800 (Desktop, closed as dup of #42248): snapshot writes JS
  `process.env.PATH`, the minimal GUI PATH; reporter says settings `env.PATH`
  did not help **at that time** (2.1.87) because the snapshot overrode it.
  In 2.1.325 the snapshot uses settings `env.PATH` first ([source], `xei()`).
- #42602 / #42639: regression in 2.1.87; snapshot has 4 launchd entries,
  functions and aliases present. Workaround: put PATH in `~/.zshenv` (does not
  work in 2.1.325 per my probe, the snapshot export runs after zshenv).
- #43127 (closed not planned): workaround is a SessionStart hook that writes
  the login-shell PATH to `CLAUDE_ENV_FILE`.
- #44649: Claude Desktop launched from Dock does not inherit shell PATH.
- #104181 (open, 2026-10-22): daemon background sessions get the 4-entry PATH,
  MCP `uvx` ENOENT, status line `node` fails; a community tester (not a
  maintainer) reports `"env": {"PATH": ...}` in `~/.claude/settings.json`
  reached Bash, hooks and the MCP child.
- #89422 (open): snapshot taken before nvm/fnm/asdf adjusts PATH.
- Changelog 2.1.78 "[VSCode] Fixed Bash tool not finding Homebrew ... when VS
  Code is launched from Dock/Spotlight" and 2.1.311 "[VSCode] Fixed the
  extension host freezing while the login shell ran its start-up files to read
  PATH": the VS Code host reads the login-shell PATH itself and hands it to
  the CLI. [inference] This is the model Kokobrain should copy.

## 2. stdio MCP servers [source + docs + probe]

- Env built in the stdio connect path:
  `baseEnv = Oei() ? {HOME,LOGNAME,PATH,SHELL,TERM,USER from process env, ...proxy env} : {...Ts()}`
  then `{...baseEnv minus CLAUDE_CODE_CHILD_SESSION, CLAUDE_PROJECT_DIR,
  CLAUDE_CODE_SESSION_ID, CLAUDECODE:"1", ...server.env}`.
  `Oei()` is true only with `CLAUDE_CODE_MCP_ALLOWLIST_ENV` truthy or
  entrypoint `local-agent`. So by default a server gets the **full claude
  process env (with settings `env`) plus its own `env` block on top**.
  (Old issue #1254 said an `env` block stripped everything else; not the case
  in 2.1.325 source.)
- `CLAUDE_CODE_SHELL_PREFIX`, when set, wraps the server command.
- The server is spawned by the MCP SDK `StdioClientTransport` with that env;
  a bare `command` such as `node`/`npx`/`uvx` is resolved through the `PATH`
  in that env, i.e. the claude process PATH (or settings `env.PATH`, or a
  `PATH` in the server's own `env`). No login shell, no snapshot.
  [probe] `google-workspace` (`command: "node"`) failed with the minimal PATH
  and connected once PATH was the login PATH.
- `${VAR}` / `${VAR:-default}` expansion in `command`, `args`, `env`, `url`,
  `headers` reads Claude Code's own environment [docs]. Unset vars stay as
  literal `${VAR}` text with a warning. So secrets the user exports in
  `~/.zshrc` and references in `.mcp.json` arrive only if Kokobrain puts them
  in the child env.
- `-p` behavior [docs, MCP page "Stdio servers that exit or fail to start"]:
  "The run continues without the server's tools ... When a plugin provides
  the server, new runs skip the connection for 15 minutes after a failure".
  [probe] confirmed, see section 6.
- Plugin `.mcp.json` entries get `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`,
  `CLAUDE_PROJECT_DIR` added to `env` [source].

## 3. Command hooks [docs + source + probe]

- Shell form runs `sh -c` on macOS/Linux [docs: "Exec form and shell form"];
  exec form (`args`) resolves `command` on PATH. [probe] `$0` was `/bin/sh`.
  `sh` (bash in POSIX mode) reads no zsh startup file, so hooks see exactly
  the claude process env. [probe] `VITEST_MAX_WORKERS` (from `~/.zshenv`) was
  `unset` in the hook under the minimal env, set under the terminal env.
- "A hook process inherits the parent environment, apart from the `OTEL_*`
  exporter variables ... and, when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set
  to `1`, the variables it strips" [docs, hooks "Common input fields"].
  [source] env = `{...Ts(), ...}` + `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`,
  `CLAUDE_PLUGIN_DATA`, `COLUMNS`/`LINES`; `CLAUDE_CODE_SHELL_PREFIX` applies.
- `CLAUDE_ENV_FILE` is given to SessionStart, Setup, CwdChanged and FileChanged
  hooks; what they write reaches **Bash tool commands only** (and PowerShell
  under rules) [docs]. Nothing says it reaches other hooks or MCP servers
  [inference: it does not; MCP servers start before/independently of it].
- [probe] With the minimal env, two plugin SessionStart hooks exited 127
  `/bin/sh: node: command not found`.

## 4. Settings `env` and other injection points [docs]

- `env` in `~/.claude/settings.json`: "Claude Code reads them directly from
  the file, so they take effect no matter how `claude` was launched ...
  Claude Code copies these values into its environment as written. No shell
  processes them, so shorthand such as `~` or `$HOME` stays as typed." Settings
  value replaces an inherited shell value in most sessions. Reapplied on file
  change. Applies to Bash, hooks and MCP children through `Ts()` [source], and
  `PATH` there is also what the snapshot exports [source].
- `--settings '<json>'` on the command line can carry an `env` block for one
  run [docs: "Change a setting for one session"]; it sits above user/project
  files. [inference] Kokobrain could pass `{"env":{"PATH":...}}` this way
  without writing the user's files, but putting it in the process env is
  simpler and also covers `${VAR}` expansion.
- `CLAUDE_ENV_FILE` set before launch to a script path: docs mention "any
  script you set `CLAUDE_ENV_FILE` to before launch"; changelog 2.1.108 cites
  `~/.zprofile` as an example value. Bash tool only.
- `CLAUDE_CODE_SHELL_PREFIX`: wraps Bash commands, hooks and MCP server
  commands [source]. Could wrap in a login shell, but it costs startup time per
  command and changes quoting; not recommended for the MVP [inference].
- `CLAUDE_CODE_DONT_INHERIT_ENV`: if set, the snapshot builder does not pass
  the process env [source]; irrelevant for Kokobrain.

## 5. Auth [docs + probe]

Precedence [docs, Authentication precedence]: cloud provider
(`CLAUDE_CODE_USE_BEDROCK` / `_VERTEX` / `_FOUNDRY`) > `ANTHROPIC_AUTH_TOKEN`
> `ANTHROPIC_API_KEY` (always used in `-p` when present) > `apiKeyHelper` >
`CLAUDE_CODE_OAUTH_TOKEN` > Anthropic profiles > `/login` subscription OAuth.
macOS stores the `/login` credential in the Keychain (fallback
`~/.claude/.credentials.json`); the entry is keyed to `CLAUDE_CONFIG_DIR`.
`ANTHROPIC_BASE_URL` routes through a gateway.

[probe] With `env -i` (no `ANTHROPIC_*`), the run authenticated from the
Keychain item `Claude Code-credentials` (`apiKeySource: "none"`, model
answered). So a `/login` user needs no env. A user who authenticates via shell
exports (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`+`ANTHROPIC_BASE_URL`,
Bedrock/Vertex vars, `AWS_PROFILE`, `CLAUDE_CONFIG_DIR`) loses that auth from a
Finder launch unless Kokobrain forwards the login-shell env. (This user's
`~/.zshrc` defines functions that export `ANTHROPIC_BASE_URL`/`AUTH_TOKEN` for
an alternate provider; those are functions, not startup exports, so they do not
apply to a fresh shell anyway.)

## 6. Probes

Script: `/tmp/kk-deepdive/probe/run.sh`, summarizer
`/tmp/kk-deepdive/probe/summarize.py`, raw stream-json in
`/tmp/kk-deepdive/probe/out-*.jsonl`. Each run: empty `mktemp -d` cwd,
`claude -p <prompt> --output-format stream-json --verbose --model haiku
--permission-mode bypassPermissions --no-session-persistence --settings
<SessionStart hook that records $PATH, node, $0, a ~/.zshenv var>`. The Bash
command printed `$PATH`, `command -v node npx uvx mise`, the shell, a
`~/.zshenv` variable, and `alias | wc -l`.

| Run | Env | Auth | Local stdio MCP (5) | Hooks | Bash PATH / node |
|---|---|---|---|---|---|
| terminal | current env minus `CLAUDE*`, `ANTHROPIC_*`, `T3CODE_*` | Keychain OK | playwright, koko-agents-observe, ai-memory, google-workspace connected; chrome-devtools failed (fails in the terminal too) | all OK; hook PATH full | full PATH (36 entries), node/npx/uvx found |
| minimal | `env -i HOME USER LOGNAME TMPDIR PATH=/usr/bin:/bin:/usr/sbin:/sbin` | Keychain OK | **all 5 failed** | 2 plugin hooks exit 127 `node: command not found`; hook PATH minimal, `~/.zshenv` var unset | `/usr/bin:/bin:/usr/sbin:/sbin`; node/npx/uvx missing; 113 aliases and `~/.zshenv` vars present (snapshot and zshenv ran) |
| loginpath | minimal + `SHELL=/bin/zsh` + PATH from `zsh -lic 'printf %s "$PATH"'` (35 entries) | Keychain OK | google-workspace **connected**; 4 plugin servers failed (15-min skip from previous run, see below) | all OK; hook PATH full | full login PATH; node/npx/uvx found |
| terminal2 | same as terminal, right after | - | 4 plugin servers **still failed** | - | - |

Findings from the table:
- The snapshot did not fix PATH (minimal run) although it sourced the rc file
  (aliases present). Matches the source reading.
- Replacing PATH alone is enough for the user-scope server, hooks and Bash.
- **15-minute plugin skip confirmed**: after the minimal run, even the full
  terminal env got `failed` for every plugin server. The marker is
  `~/.claude/mcp-needs-auth-cache.json` (`{"plugin:<p>:<s>": {"timestamp":
  ms}}`), shared by every session using `~/.claude`. Consequence for Kokobrain:
  never run `claude` with a bad env "to see what happens"; a single bad run
  degrades the user's terminal `-p` runs for 15 minutes. The docs list this
  only for `-p`; I did not test interactive sessions.
- Init event also differed in `plugins` (19 vs 18: `cc-plugin-easel` missing in
  the minimal run) and `tools` (497 vs 391, the missing MCP tools). Cause of
  the missing plugin not investigated.

(Follow-up probes after the skip window expired are appended in section 8.)

## 7. What Claude Code fixes, what it does not, and the minimum for Kokobrain

Claude Code fixes on its own:
- Shell selection without `SHELL` (finds `/bin/zsh`), and sets `SHELL` for
  Bash commands. [probe]
- Aliases, functions and options from `~/.zshrc` in Bash (snapshot). [probe]
- Non-PATH exports from `~/.zshenv` in Bash (zsh reads it on every `-c`).
  [probe]
- Plugin `bin/` dirs appended to the Bash PATH. [source]
- Auth from the Keychain without any env. [probe]
- `CLAUDE_PROJECT_DIR`, `CLAUDECODE`, plugin root vars for children. [docs]

Claude Code does not fix:
- PATH for anything: Bash (snapshot exports the process PATH), hooks (`sh -c`,
  inherited env), MCP command lookup and the server's own PATH, status line.
  [probe + source]
- Exports from `~/.zprofile`/`~/.zshrc` (other than functions/aliases) for
  Bash, and exports from any startup file for hooks and MCP. [source + probe]
- `${VAR}` in MCP configs, auth env vars, `CLAUDE_CONFIG_DIR`, proxy and
  CA vars (`HTTPS_PROXY`, `NODE_EXTRA_CA_CERTS`): read only from the process
  env or settings `env`. [docs]

Minimum Kokobrain must provide (child env of `claude`), in priority order:
1. `PATH` = the user's login interactive shell PATH (resolved with
   `$SHELL -l -i -c`, bounded by a timeout, cached for the app session).
   Without it MCP, hooks and Bash all break. [probe]
2. `HOME`, `USER`, `LOGNAME`, `TMPDIR`, `SHELL` (launchd provides these to
   GUI apps [inference, from memory]; forward them unchanged).
3. For parity beyond PATH: the rest of the login shell's exported env
   (API keys used by `${VAR}` in `.mcp.json`, `ANTHROPIC_*` / Bedrock /
   Vertex auth, `CLAUDE_CONFIG_DIR`, `NVM_DIR`, `LANG`, proxy/CA vars),
   minus `CLAUDECODE` and other `CLAUDE_CODE_*` session vars. Merge: shell
   env as the base, then Kokobrain's own overrides.
4. Do not rely on `--settings {"env":...}` or `CLAUDE_ENV_FILE` as the main
   fix: `CLAUDE_ENV_FILE` reaches Bash only, and settings `env` does not feed
   `${VAR}` expansion of shell secrets unless Kokobrain copies them in.
   [inference]

Unknowns left open:
- Whether a `$SHELL -l -i -c` capture is safe for users whose rc files print,
  prompt, or wait on a tty (atuin, tmux autostart, p10k instant prompt);
  other scouts may cover the capture method.
- Status line env: not probed (status line does not run in `-p`).
- Interactive-session effect of the 15-minute plugin skip.
