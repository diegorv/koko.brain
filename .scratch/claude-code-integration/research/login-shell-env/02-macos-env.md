# 02: Getting a Terminal-like environment from a macOS GUI app

Scout 2 of 4. Research only. No repo files were changed. Scratch scripts are in
`/tmp/kk-deepdive/scripts/` (bench.sh, capture.py, envnames.py), with hazard rc
fixtures in `/tmp/kk-deepdive/zdot/<case>/.zshrc`.

Machine: macOS 26.6.2 (25G83), zsh 5.9.2 (`/bin/zsh`), bash 3.2 (`/bin/bash`),
Homebrew bash 5 and fish 4.9.3, mise 2026.11.4. The owner's dotfiles: `~/.zshenv`,
`~/.zprofile` (OrbStack init), `~/.zshrc` (PATH setup, mise, starship, atuin,
fzf, compinit, gpg and more), `~/.profile` (bash only). No `.zlogin`, no `.bash_profile`.

Legend: **[V]** verified here (by measurement, man page or source), **[S]** read
in a primary source (linked), **[I]** inference or from memory.

---

## 1. Which startup files run, and which flags reproduce a Terminal window

### zsh [S] (zsh manual, "Startup/Shutdown Files": https://zsh.sourceforge.io/Doc/Release/Files.html)

Order: `/etc/zshenv` (always) -> `$ZDOTDIR/.zshenv` (always) -> if login:
`/etc/zprofile`, `.zprofile` -> if interactive: `/etc/zshrc`, `.zshrc` -> if login:
`/etc/zlogin`, `.zlogin`. A login shell also reads `.zlogout` when it exits.
`RCS`/`GLOBAL_RCS` can switch later files off; `-f` skips everything except `/etc/zshenv`.

| flags | zshenv | zprofile | zshrc | zlogin |
|---|---|---|---|---|
| `-c` | yes | no | no | no |
| `-lc` | yes | yes | no | yes |
| `-ic` | yes | no | yes | no |
| `-ilc` | yes | yes | yes | yes |

On macOS, **`/etc/zprofile` runs `eval $(/usr/libexec/path_helper -s)`** [V: read the
file]. It also sets `LANG=C.UTF-8` when LANG is unset (GUI apps get no LANG) [V].
`path_helper` builds PATH from `/etc/paths` + `/etc/paths.d/*`, then appends
the PATH it inherited, so the system dirs move to the front [S: `man path_helper`; V: output].
`/etc/zshrc` sets HISTFILE, keymaps and so on, and sources `/etc/zshrc_$TERM_PROGRAM` [V].

### bash [V: `man bash` INVOCATION on this machine]

An interactive login shell, or a non-interactive one started with `--login`, reads
`/etc/profile`, then the first of `~/.bash_profile`, `~/.bash_login`, `~/.profile`.
An interactive non-login shell reads `~/.bashrc`. A login shell does **not** read
`.bashrc` unless `.bash_profile` sources it. A non-interactive shell reads only `$BASH_ENV`.
macOS `/etc/profile` also runs path_helper [I: standard macOS file, not re-read here].

### What Terminal does

Terminal.app's "Shells open with: Default login shell" is the default
[S: https://support.apple.com/guide/terminal/change-general-settings-trmlstrtup/mac].
New windows start in the home directory. It starts the shell as a **login interactive** shell (argv0 `-zsh` via
`login -pf`) [I: well-known behavior; I found no live Terminal window to inspect].
iTerm2 does the same by default [I]. Apple's own note says `.zprofile` runs at login
and `.zshrc` "for each new Terminal session" [S: https://support.apple.com/en-au/HT208050].

=> **`$SHELL -l -i -c '<cmd>'` with cwd = `$HOME` reproduces a new Terminal window.**
VS Code (`['-i','-l','-c']`), sindresorhus/shell-env (`-ilc`), tauri-apps/fix-path-env-rs
(`-ilc`) and Zed (`-l` + `-i -c`) all made the same choice [S, links in section 7].

### What is lost with `-lc` only [V, measured on this machine]

PATH entries, from a simulated GUI parent (`env -i HOME USER LOGNAME SHELL PATH=/usr/bin:/bin:/usr/sbin:/sbin`):

- `-c`: `/usr/bin /bin /usr/sbin /sbin` (4)
- `-lc`: path_helper output (`/usr/local/bin`, cryptex dirs, `/Library/Apple/usr/bin`,
  MacGPG2, Little Snitch, `/opt/homebrew/bin` from paths.d) + `~/.orbstack/bin` (15)
- `-ilc`: everything above **plus** `~/.local/bin` (**where the native Claude Code
  install lives**), all mise tool dirs (node 26, python, pnpm, go, deno, java, uv ...),
  `~/.local/share/mise/shims`, `/opt/homebrew/sbin`, `~/.cargo/bin`, `~/.ghcup/bin`,
  `~/.bun/bin`, `~/Library/pnpm`, `~/.cabal/bin` (35)
- `-ic` (non-login interactive) lacks the `/etc/paths.d` entries (path_helper never runs).

So on the owner's machine `-lc` finds **neither `claude` nor `node`/`npx`**: an MCP
server started through npx would fail. Variables: `-lc` yields 15 names, and `-ilc` adds
62 more (EDITOR, JAVA_HOME, GNUPGHOME, CARGO_HOME, PNPM_HOME, MISE_SHELL, `__MISE_*`, several
API tokens ...). I printed names only, never values. **Most real setups (nvm, mise, asdf, pyenv, conda,
Homebrew users who put `brew shellenv` in .zshrc) live in .zshrc, so `-i` is required.**

mise detail [V: read `mise activate zsh` output]: activation calls `_mise_hook --force`
immediately, not only from the precmd hook. A `-ilc` shell that never draws a prompt still
gets the tool PATH. The PATH holds version-specific install dirs, so a capture goes
stale after `mise use node@X` until it is recaptured. The mise env is per directory (hook-env),
so capturing with cwd=`$HOME` gives the global tool set, the same as a new Terminal window.

---

## 2. What a Finder/Dock-launched app actually gets [V]

I read the initial environment of running Dock-launched apps (Raycast, AltTab, a Tauri app)
via `sysctl KERN_PROCARGS2`, printing names only:
`USER LOGNAME HOME SHELL TMPDIR PATH SSH_AUTH_SOCK __CF_USER_TEXT_ENCODING XPC_SERVICE_NAME
XPC_FLAGS COMMAND_MODE __CFBundleIdentifier OSLogRateLimit`, with
`PATH=/usr/bin:/bin:/usr/sbin:/sbin` and **`SHELL=/bin/zsh` set**. There is no LANG and no TERM.

- `launchctl getenv PATH` / `SHELL` / `HOME`: **empty output**, exit 0.
- `launchctl print gui/$UID` -> `environment = { SSH_AUTH_SOCK }` only. No PATH is configured.
- `launchctl config user path <p>` exists, but per `man launchctl` it is PATH-only ("intentionally
  scoped to the PATH environment variable ... for security reasons"), needs sudo
  [I] and a reboot, and is a user action, not something an app should do. `launchctl setenv`
  also affects only future launches and does not survive a reboot [I]. Neither is a capture source.
- `dscl . -read /Users/$USER UserShell` -> `UserShell: /bin/zsh` (12-16 ms). It is a good fallback
  when `$SHELL` is missing or not executable. After `chsh`, GUI apps keep the old `$SHELL`
  until the next login, while dscl shows the new one [I].
- `/usr/libexec/path_helper -s` (2 ms) gives only `/etc/paths` + `/etc/paths.d`. With Homebrew's
  paths.d entry that includes `/opt/homebrew/bin`, but not `~/.local/bin` and no version managers.

---

## 3. Measurements (3 runs each, ms, cwd `/`, no TTY) [V]

Timed with zsh `$EPOCHREALTIME`. stdin is `/dev/null` unless stated. GUI = `env -i HOME USER LOGNAME SHELL=/bin/zsh PATH=/usr/bin:/bin:/usr/sbin:/sbin`.

| mode | run1 | run2 | run3 |
|---|---|---|---|
| GUI `zsh -ilc exit` | 473 (cold) | 176 | 172 |
| GUI `zsh -ilc '/usr/bin/env -0'` | 215 | 306 | 178 |
| GUI `zsh -ic exit` | 177 | 198 | 213 |
| GUI `zsh -lc exit` | 9 | 10 | 7 |
| GUI `zsh -c exit` | 7 | 5 | 4 |
| inherited env `zsh -ilc exit` (tty-less, stdin inherited) | 399 | 125 | 126 |
| inherited env `zsh -ilc exit` </dev/null | 125 | 126 | 124 |
| `path_helper -s` / `launchctl getenv PATH` / `dscl` | 2 / 4 / 12-16 | | |
| prototype capture (section 6) | 293 | 115 | 118 |

- With no TTY, the owner's startup **printed 0 bytes on stdout and 0 on stderr** in every mode.
- The capture output is 26.5 KB with 79 variables. ARG_MAX is 1 MiB, so there is plenty of room.
- Homebrew bash 5 `-il` with no TTY prints 112 bytes to stderr
  ("cannot set terminal process group ... no job control"). It is harmless, and one reason to ignore stderr.
- Side finding: `mise --version` on this machine blocked for over 90 s on HTTP version-check retries
  (`releases.tsv`, 30 s timeout x 3). `mise activate`/`hook-env` did not hit the network.
  Any rc line that calls a networked CLI can stall the capture, which is why a hard timeout is needed.

---

## 4. Failure modes and how each was handled [V unless marked]

I ran the hazards through the prototype (section 6) with `ZDOTDIR` fixtures, a 3 s timeout, and both
output modes (markers on stdout, and the env written to fd 0 Zed-style):

| hazard in .zshrc | result |
|---|---|
| `echo motd; print -n "\e]0;title\a"; print -P colour` | 48 noise bytes on stdout; markers isolated them, parse OK. fd0 mode: 0 noise |
| `read -q "?Update? [y/N]"` (oh-my-zsh style prompt) | instant: "not interactive and can't open terminal" on stderr |
| `read x </dev/tty` | with `setsid`: instant ENXIO ("device not configured"). **Without setsid, under a pty (dev mode, `pnpm tauri dev`) it read from the controlling terminal**: in a real terminal that blocks on the keyboard |
| `(sleep 30 &); sleep 30 &!` (daemon keeps the pipe open) | OK in 11-16 ms, because the reader **stops at the end marker instead of waiting for EOF**. A reader that waits for EOF (e.g. `Command::output()`) waits the full 30 s; I reproduced this incidentally |
| `exec /bin/zsh -f -i` (exec into another shell) | exits fast and the `-c` never runs; **no markers -> detected as failure** |
| `exec zsh -i` that re-reads the same rc | infinite exec loop until the timeout; killpg cleaned up |
| `sleep 60` | timeout at 3.0 s; `killpg(SIGTERM)` killed the group, no orphans left |
| `trap "" TERM; sleep 60` | timeout; group killed with SIGTERM->SIGKILL escalation; no orphans (`pgrep` empty) |
| `stty -ixon; bindkey -v; compinit` | "stty: stdin isn't a terminal" on stderr; no hang |
| `env(){...}; alias env=fake; printenv(){...}` | unaffected: the command calls `/usr/bin/env` by absolute path |
| `export KK_ML=$'a\nb' KK_BIN=$'\xff\xfe' KK_EQ=a=b=c` | byte-exact round trip with `env -0` + split at the first `=` |
| `false; return 3` at the end of .zshrc | exit 0, env OK (still: parse first, then check status, as Zed does) |
| tmux auto-attach | tmux is not installed here, so not tested. shell-env sets `ZSH_TMUX_AUTOSTART=false`, `ZSH_TMUX_AUTOSTARTED=true` [S] |

**Interactive shells ignore SIGTERM** [V + S]. `kill(shell_pid, SIGTERM)` on `zsh -f -i -c`
and `bash --norc -i -c` did nothing (the shell finished its command), while non-interactive
`zsh -c` died. `man bash`: "When bash is interactive, in the absence of any traps, it ignores
SIGTERM". VS Code's `child.kill()` (SIGTERM to the pid) would therefore not stop a hung
interactive shell [I from that]. Rust `Child::kill()` sends SIGKILL, but only to the
shell pid: grandchildren survive and keep the pipe open [I]. **Kill the process group.**

Hazards I did not reproduce, from sources or inference:
- oh-my-zsh auto-update: it returns early when `DISABLE_AUTO_UPDATE=true`, or when
  `[[ ! -t 1 ]]` and p10k instant prompt is off. Its prompt is `read -r -k 1`
  [S: https://github.com/ohmyzsh/ohmyzsh/blob/master/tools/check_for_upgrade.sh].
  So with p10k instant prompt on, OMZ may still run its check: set `DISABLE_AUTO_UPDATE=true`.
- p10k instant prompt / prompt frameworks: may print escape sequences or warnings. Markers
  or the fd0 trick contain this [I].
- nvm: 0.5-2 s is typical. VS Code's FAQ names nvm as the usual cause of its 10 s timeout
  [S: https://code.visualstudio.com/docs/supporting/faq "Resolving shell environment fails"].
  conda init is similar [I].
- GUI prompts are **not** stopped by a missing TTY: `gpg` -> pinentry-mac dialog, `op read`
  (1Password) -> Touch ID, `security find-generic-password` -> keychain prompt, all called
  from rc to load secrets. The capture waits for the user; only the timeout bounds it [I].
- `compinit` "insecure directories" prompt: it uses a `read -q`-style prompt, so it fails fast like the test above [I].
- `.zlogout` (login shell exit) may print, for example `clear`. That comes after the end marker, so it is ignored [I].

---

## 5. Capturing values safely

- Use **`/usr/bin/env -0`** by absolute path. A user PATH, alias or function cannot shadow it;
  `command env` (shell-env's choice) still depends on PATH order. NUL-delimited records keep
  multi-line values intact. Names cannot contain `=` and values can, so split each record at the first `=` [V].
- **Keep bytes, not strings**: in Rust, `OsString::from_vec`/`OsStr::from_bytes` per record and
  `Command::envs`. Avoid `from_utf8_lossy` (shell-env, fix-path-env-rs and Zed all do a lossy
  or line-based parse; fix-path-env-rs and shell-env split on `\n` and break on multi-line values) [S].
- Markers: random per-run nonce tokens, printed with `/usr/bin/printf '%s\0'` as their own
  NUL records before and after. Noise before START or after END is discarded [V].
- Zed's extra defense: it redirects the dump to **fd 0** (`>&0`). It passes a pipe write end
  as the child's stdin, because "file descriptors greater than 2 cannot be used in interactive
  mode ... zsh, old bash" [S: zed `crates/util/src/shell_env.rs`]. I confirmed this:
  `>&3` failed in `/bin/bash -il` (bash 3.2: "3: Bad file descriptor") and worked in zsh.
  `>&0` worked in zsh, bash 3.2, bash 5 and fish. fd0 mode also gives `read` in the rc a write-only fd, so it fails
  instantly. It is more robust than stdout, but less conventional. Markers on stdout are enough
  in practice. fd0 + markers is the belt-and-braces option.
- Size: 26.5 KB here. Read with a cap (e.g. 4 MiB) to bound memory [I].
- Secrets: the captured env contains the user's tokens (as a Terminal child would). **Never log
  values**: log only timing, exit status, var count, marker found yes/no, stderr byte count [I].

---

## 6. Recommended capture procedure (concrete)

A prototype of exactly this is in `/tmp/kk-deepdive/scripts/capture.py` (Python standing in for Rust).
It handled every case in section 4.

**When:** start it asynchronously at app startup (not at the first chat turn). Keep the result
in memory for the app session; do not persist it to disk (it contains secrets). The first
`claude -p` spawn awaits it, bounded by the remaining timeout. Offer a "re-read shell
environment" action, for after the user edits .zshrc or installs tools.

**Shell resolution:** `$SHELL` if it is absolute and executable; else `dscl . -read /Users/$USER UserShell`; else `/bin/zsh`.

**Command:**
```
argv:  [<shell>, "-l", "-i", "-c",
        "/usr/bin/printf '%s\\0' __KK_ENV_START_<nonce>__; /usr/bin/env -0; /usr/bin/printf '%s\\0' __KK_ENV_END_<nonce>__"]
cwd:   $HOME
env:   the app's own (launchd) environment, plus
       KOKOBRAIN_RESOLVING_ENVIRONMENT=1   (documented sentinel users can test in rc, as VS Code does)
       DISABLE_AUTO_UPDATE=true            (oh-my-zsh)
       ZSH_TMUX_AUTOSTART=false, ZSH_TMUX_AUTOSTARTED=true (oh-my-zsh tmux plugin)
       optionally VSCODE_RESOLVING_ENVIRONMENT=1, so existing user guards already apply
       (pragmatic, but it borrows another product's contract; owner decision)
stdin: /dev/null   (or the pipe write end + `>&0` redirects, Zed style)
stdout: pipe       stderr: pipe, drained concurrently (avoids pipe-full deadlock), size only logged
pre_exec: setsid() (new session: no controlling TTY, so /dev/tty fails fast in dev mode; also a new process group)
```
Notes: fish 4.9 accepted the same `-l -i -c` command line [V]. For nu, xonsh, elvish, pwsh and
csh, use the fallback path (below), or per-shell args as VS Code does (nu: `-i -l -c` and `^` prefix).

**Reading:** a non-blocking read loop. Stop as soon as the END marker record arrives (**do not
wait for EOF**). If the shell exits without END, allow a 200 ms grace for in-flight bytes, then stop.

**Timeout and kill:** a hard deadline of **10 s** from spawn. That is VS Code's default, chosen
for nvm-heavy rc files. The owner measures 0.12-0.47 s, so there is 20x headroom; with an eager
start the first turn rarely waits. On deadline, or after END while the shell is still alive (wait
up to 1 s): `killpg(pgid, SIGTERM)`, wait 500 ms, then `killpg(pgid, SIGKILL)`, then reap.
Always reap (`waitpid`) to avoid zombies.

**Validation:** success = both markers found and PATH present. Parse before looking at the exit
status, and warn on a non-zero exit (Zed's rule: rc files often end non-zero).

**Post-processing:** drop shell-session variables `PWD OLDPWD SHLVL _` and the sentinel vars we
injected. Keep the rest (`__MISE_*`, `ATUIN_SESSION` and so on are what a Terminal child would also see).

**Fallback order** (each is cheap and cannot hang badly):
1. `-l -i -c` capture (above).
2. On failure or timeout: the same procedure with `-l -c` and a 3 s timeout (7-10 ms here). It gets
   path_helper + `.zprofile`, where Homebrew's installer puts `brew shellenv` [I].
3. Else: the launchd env, with PATH = `path_helper -s` output + known dirs that exist
   (`~/.local/bin`, `/opt/homebrew/bin`, `/opt/homebrew/sbin`, `/usr/local/bin`, `~/.claude/local`? [I]).
4. Always spawn `claude` by the absolute path found at detection time (Issue 01), so a bad PATH
   breaks at most the MCP children, not claude itself. Show the capture status (ok, fallback +
   reason) in settings so a wrong PATH is visible, not silent.

### Hazards this procedure still leaves
- An rc that blocks on a **GUI prompt** (pinentry-mac, 1Password Touch ID, keychain) or on the
  network delays capture up to the timeout, and then the fallback env lacks the `.zshrc` setup [I].
- An rc that `exec`s into another program, or branches on `TERM_PROGRAM`/`$TTY`, produces a
  different env than Terminal does. This is detected only when the markers are missing [V/I].
- A **stale snapshot**: a tool upgrade (mise node version dirs), `.zshrc` edits or `chsh` are not
  seen until recapture or restart.
- **Per-directory env** (mise local `mise.toml`, direnv `.envrc`) in the vault is not applied,
  because capture runs in `$HOME`. Matches a new Terminal window, not a terminal `cd`'d into the vault.
- Side effects of running the rc: it starts agents/daemons (gpg-agent, ssh-agent), appends
  history in some setups, may touch caches. Each capture is one more "terminal opened" [I].
- **Secrets flow into the child**: every token exported in .zshrc reaches `claude` and its MCP
  servers. That is the same as Terminal, but note (from memory, not verified here): if the user
  exports `ANTHROPIC_API_KEY` in rc, `claude -p` uses API-key billing instead of the
  subscription. Worth a check by the CLI scout.
- Non-POSIX login shells (nu, xonsh) go to the fallback unless per-shell args are added.

---

## 7. Sources

- zsh startup files: https://zsh.sourceforge.io/Doc/Release/Files.html
- bash INVOCATION and SIGTERM: `man bash` (macOS bash 3.2, read locally)
- `man path_helper`, `man launchctl` (config/path, getenv/setenv), `/etc/zprofile`, `/etc/zshrc` (read locally)
- Apple Terminal settings: https://support.apple.com/guide/terminal/change-general-settings-trmlstrtup/mac ; zsh default and startup files: https://support.apple.com/en-au/HT208050
- VS Code implementation: https://github.com/microsoft/vscode/blob/main/src/vs/platform/shell/node/shellEnv.ts (args `-i -l -c`, `VSCODE_RESOLVING_ENVIRONMENT=1`, `detached: true`, `stdio: ['ignore','pipe','pipe']`, 10 s default timeout, clamp 1-120 s via `application.shellEnvironmentResolutionTimeout`, nonce marker + JSON, deletes `XDG_RUNTIME_DIR`)
- VS Code FAQ "Resolving shell environment fails": https://code.visualstudio.com/docs/supporting/faq ; bug reports https://github.com/microsoft/vscode/issues/136346 , https://github.com/microsoft/vscode/issues/116527 , https://github.com/microsoft/vscode/issues/113869
- Zed: https://github.com/zed-industries/zed/blob/main/crates/util/src/shell_env.rs (`-l` + `-i -c`, `cd <dir>`, fd0 redirection, `stdin null`, new session, parse before status; no timeout in that file)
- sindresorhus/shell-env: https://github.com/sindresorhus/shell-env/blob/main/index.js (`-ilc`, delimiter, `command env`, DISABLE_AUTO_UPDATE, ZSH_TMUX_*, fallback to /bin/zsh, /bin/bash)
- tauri-apps/fix-path-env-rs: https://github.com/tauri-apps/fix-path-env-rs/blob/dev/src/lib.rs (`$SHELL -ilc`, cwd home, `Command::output()`: **no timeout, inherits stdin, waits for EOF, line-based lossy parse**. Not suitable as-is for "no hangs")
- oh-my-zsh update check: https://github.com/ohmyzsh/ohmyzsh/blob/master/tools/check_for_upgrade.sh
