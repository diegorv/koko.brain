# 09: Spike: can the app run `claude -p` jobs?

**What to build:** nothing that ships. A throwaway check, on the owner's Mac, of the assumptions behind the recommended LLM engine (PRD "Owner decisions needed" 1(a)). The output is a findings note, `.scratch/vault-mods/spike-claude-cli.md`, that decides between the CLI and the Messages API.

Check, with the app launched from Finder (not from a terminal):

1. **PATH.** Does a process spawned by the GUI app find `claude`? A GUI app gets a minimal PATH (V4, INFERRED). If not, an absolute path set per machine fixes it.
2. **Auth.** Does a GUI-spawned `claude -p` use the owner's existing login (keychain), with no prompt?
3. **Fan-out.** 10 concurrent `claude -p --model haiku --output-format json` runs: rate limits on the owner's plan, memory per process, wall time.
4. **Config isolation.** With cwd set to an empty temp dir and `--add-dir <vault>`: are the vault's `.claude/settings.json` hooks and `.mcp.json` loaded? (The CLI reference, read 2026-11-05, says `--add-dir` "doesn't discover most `.claude/` configuration".) Do user-level hooks and plugins (`~/.claude`) run in each job, and with what side effects?
5. **Flags.** `--setting-sources user`, `--strict-mcp-config --mcp-config <file>`, `--tools`, `--max-budget-usd`, `--agents` with a per-agent model, and the cost fields in `--output-format json`.
6. **Kill.** Does killing the child stop billing and its subprocesses (process group)?

A minimal Rust command or a test binary is fine for the spawn; keep it on a throwaway branch.

**Blocked by:** none

**Status:** ready-for-human

It needs the owner's machine, Claude login and a Finder-launched build.

**Gate:** none (nothing merges).

- [ ] Findings note with the answer to each question and a recommendation for owner decision 1.

## Notes

- **Size:** S.

## Comments
