# 191: Rust agent runner (`mods_run_agent`)

**Origin:** `vault-mods` Issue 10, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/vault-mods/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** the native half of agent runs. A Rust command that starts a `claude` job, streams its output, and kills it on request. The frontend half (`ctx.agents.run`, the Labs field) is Issue 13. This half touches no frontend mod files, so it can run in parallel with 03 to 06.

**Owner decisions (PRD, 2026-11-06):** the `claude` CLI, through a typed command, with no spend ceiling and no Bash block. Not a boundary: app commands have no ACL (`src-tauri/build.rs:23`), so any webview JS, QueryJS in any vault included, can call it; the owner accepted that.

- **Command:** `mods_run_agent { prompt, model, agents?, mcpConfig?, maxBudgetUsd? } -> runId`, in a new `src-tauri/src/commands/mods_agent.rs`, registered in `src-tauri/src/lib.rs`. Rust builds the argv: the executable path from the machine config below (never from the vault or the request), cwd an app-owned empty temp dir, `--add-dir <vault>`, `--setting-sources user`, `--strict-mcp-config` with an `--mcp-config` file Rust writes when `mcpConfig` is given, `--model`, `--agents` when given, `--max-budget-usd` only when the request passes one, `--output-format json` (or `stream-json` for a single job). No `--tools` restriction. The cwd and settings flags are not limits: they stop a vault's own `.claude/settings.json` hooks and `.mcp.json` from loading into every job (D1 R4, V6). Stream lines and the exit over a `tauri::ipc::Channel` (no app command uses one yet; the updater plugin does).
- **Kill:** `mods_kill_agent { runId }` and a kill-all; children held in managed state next to `lib.rs:319-324`, spawned in a process group, killed on `RunEvent::ExitRequested`. Issue 13 calls the kill-all from `teardownVault`.
- **Machine config lives in Rust.** The `claude` path is stored on the Rust side (a JSON file in the app data dir, outside every vault), written by `mods_set_agent_config` and read by `mods_run_agent`; never a `mods_run_agent` argument and never in `localStorage`, which Rust cannot read. This keeps the mod API from naming a program; it is not a boundary.
- No program spawn other than `claude`. No `sh -c`.
- ts-rs DTOs (commit the regenerated `src/lib/contracts/generated/`), the `CommandMap` entries, and E2E `HANDLERS` stubs in `e2e/mocks/tauri-core.ts`.

**Blocked by:** none

Waits on the findings of the spike in Issue 09: if a GUI-launched `claude` cannot use the owner's login, the engine falls back to the Messages API and this Issue is rewritten. 09 merges nothing, so it is not on the Blocked by line: the ledger would never mark it done.

**Status:** needs-info

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first: Rust integration tests in `src-tauri/tests/` spawning a stand-in executable: lines stream, the exit code arrives, kill stops a sleeper, kill-all stops several, `--max-budget-usd` appears only when passed, the executable comes only from the config, cwd is outside the vault.
- [ ] Manual pass in a Finder-launched build with real `claude`, steps in the commit.

## Notes

- One cargo build at a time on this machine; do not overlap with other cargo work.
- Dozens of Node-based child processes: the mod (Issue 11) must use a small concurrency pool. Prefer `--output-format json` per worker job; streaming many children could flood IPC.
- No spend ceiling by owner decision: the mod (Issue 11) should print the reported cost per job.
- macOS first. Windows (`claude.cmd`, PATH) is not handled.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** M.

## Comments
