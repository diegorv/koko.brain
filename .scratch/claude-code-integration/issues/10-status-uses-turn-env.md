# 10: The status check finds `claude` the way a turn does

**What to build:** `claude_status` resolves and runs `claude --version` with the same login shell environment and resolver as a turn. Only the Settings section refreshes that environment, and a failed refresh keeps the last good one. The panel sees a status fixed in Settings without being remounted, and the override must be an absolute path.

**Blocked by:** 05

**Files:** src-tauri/src/commands/claude.rs,src-tauri/src/commands/claude/shell_env.rs,src-tauri/tests/commands/,src/lib/features/claude-code/,src/tests/lib/features/claude-code/,help/documentation/19-settings.md,docs/adr/0038-claude-code-cli-subprocess.md,.scratch/claude-code-integration/spec.md

**Status:** ready-for-agent

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`.

- [ ] Failing test first (Rust): a fake login shell exports a `PATH` whose only `claude` is a script outside `default_candidates`, and that script needs a variable from that env to answer `--version`. `claude_status_with` (or its replacement) reports `installed: true` with that path and version. Today it reports not found.
- [ ] `claude_status` waits for the captured env (`ShellEnv::get`) inside its blocking task, resolves with `resolve_turn_claude` on the turn env, and runs `--version` with `env_clear().envs(env)`. `lookup_login_shell` (`$SHELL -lc 'command -v claude'`) goes away if nothing else uses it. The status then reports the binary a turn would run.
- [ ] The env is refreshed only from the Settings section (on mount and "Check again"), not on every `claude_status` call: `ClaudePanel.svelte` mounts on every canvas, kanban or view tab switch and must not start a capture. Use an explicit argument or a separate command; tested on both sides.
- [ ] A refresh that fails (timeout, no markers, spawn error) leaves a cached successful capture in place; only a first capture that fails caches the failure, as today. Tested with fake shells: good, then hanging, then `get()` returns the good env.
- [ ] The panel and the Settings section share one status: after "Check again" in Settings reports `installed`, the open panel shows the chat without being hidden and shown again. Component test.
- [ ] An override that is not absolute (`./claude`, `bin/claude`, `~/.local/bin/claude`) is refused with a message saying it must be an absolute path and that `~` is not expanded. Tested next to `resolve_refuses_a_relative_override`.
- [ ] The Settings field description (`ClaudeCodeSection.svelte`) and `help/documentation/19-settings.md` (Claude Code section) say the override is an absolute path to a file named `claude`, and describe when the environment is read. The `-lc` lookup in spec.md (Constraints, GUI PATH) and ADR-0038 is updated to match.

## Problem

From the PR #247 review (2026-11-15), confirmed by verifiers:

1. `claude_status` (`src-tauri/src/commands/claude.rs:197-205`) looks `claude` up with `$SHELL -lc` (`:246-257`), which skips `.zshrc`, and runs `--version` with the app's own env (`version_command`, `:82-86`). A turn resolves on the captured `-l -i` PATH (`resolve_turn_claude`, `:165-187`). With the app started from Finder and `claude` reachable only through `.zshrc` (nvm, fnm, bun, `~/.npm-global`), or a `#!/usr/bin/env node` launcher, the status says not installed. `ClaudePanel.svelte:45,149` then blocks the chat although a turn would run, and the override cannot fix it. The owner's native `~/.local/bin/claude` is a candidate, so it does not show for them today.
2. Every `claude_status` call runs `shell_env.refresh()` (`claude.rs:198`), and `ClaudePanel` calls it on each mount (`ClaudePanel.svelte:57-69`). Each canvas, kanban or view tab switch reruns the interactive login shell. A turn sent right after waits on the capture, and a failed capture replaces a good one (`shell_env.rs:253-262`), so later turns use the fallback env without MCP servers and hooks. Issue 05 and the help page say only the Settings section and "Check again" refresh it.
3. The panel checks the status once per mount into local state. After the user fixes the path in Settings (an overlay, so the panel stays mounted), the panel still says "not available".
4. `resolve_claude` (`claude.rs:143-147`) never checks `is_absolute()`: `./claude` resolves against the app's cwd and `~/.local/bin/claude` fails with "not an executable file".
5. The help row and the Settings description do not say the file must be named `claude`.
