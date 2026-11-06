# 10: Rust agent runner (`mods_run_agent`)

**What to build:** the native half of agent runs. A Rust command that starts a `claude` job, streams its output, and kills it on request. The frontend half (`ctx.agents.run`, Labs fields) is Issue 13. This half touches no frontend mod files, so it can run in parallel with 03 to 06.

## Owner decisions needed

PRD "Owner decisions needed" 1, 2 and 4:

1. **Engine:** the `claude` CLI (recommended, if Issue 09 passes) or the Messages API with a per-machine key. If the Messages API wins, this Issue is rewritten.
2. **Command shape** (if the CLI): D1's typed `mods_run_agent` (recommended) or D3's generic `ctx.exec(programKey, argv)` with a per-machine allowlist. App commands have no ACL (`src-tauri/build.rs:23`): either is callable by any webview JS, QueryJS in any vault included. The owner should accept that explicitly.
3. **Spend and tools:** a per-machine spend ceiling per run, and Bash off unless a machine setting allows it (both recommended).

## Recommended shape

- **Command:** `mods_run_agent { prompt, model, agents?, mcpConfig?, maxBudgetUsd, wantBash } -> runId` (`maxBudgetUsd` is clamped to the machine ceiling; `wantBash` is honored only if the machine config allows Bash), in a new `src-tauri/src/commands/mods_agent.rs`, registered in `src-tauri/src/lib.rs`. Rust builds the argv: the executable path from the machine config below (never from the vault or the request), cwd an app-owned empty temp dir, `--add-dir <vault>`, `--setting-sources user`, `--strict-mcp-config` with an `--mcp-config` file Rust writes, `--tools` without Bash unless allowed, `--max-budget-usd` capped by the machine ceiling, `--output-format json` (or `stream-json` for a single job). Stream lines and the exit over a `tauri::ipc::Channel` (no app command uses one yet; the updater plugin does).
- **Kill:** `mods_kill_agent { runId }` and a kill-all; children held in managed state next to `lib.rs:319-324`, spawned in a process group, killed on `RunEvent::ExitRequested`. The kill-all is called from `teardownVault` by Issue 13.
- **Machine config lives in Rust, not in arguments.** The `claude` path, the spend ceiling and the Bash switch are stored on the Rust side (a JSON file in the app data dir, outside every vault), written by `mods_set_agent_config` and read by `mods_run_agent`. They are never `mods_run_agent` arguments, and never in `localStorage`, which Rust cannot read. Honest limit: with no ACL on app commands, any webview JS can call the setter. This keeps the mod API from naming a program; it is not a boundary (that needs an `AppManifest` ACL, Later).
- No program spawn other than `claude`. No `sh -c`.
- ts-rs DTOs (commit the regenerated `src/lib/contracts/generated/`), the `CommandMap` entries, and E2E `HANDLERS` stubs in `e2e/mocks/tauri-core.ts`.

**Blocked by:** none

Waits on owner decisions 1, 2 and 4 (above) and on the findings of the spike in Issue 09. 09 merges nothing, so it is not on the Blocked by line: the ledger would never mark it done.

**Status:** needs-info

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first: Rust integration tests in `src-tauri/tests/` spawning a stand-in executable: lines stream, the exit code arrives, kill stops a sleeper, kill-all stops several, a budget above the ceiling is clamped, the argv never contains Bash unless the machine config allows it, the executable comes only from the config.
- [ ] Manual pass in a Finder-launched build with real `claude`, steps in the commit.

## Notes

- One cargo build at a time on this machine; do not overlap with other cargo work.
- Dozens of Node-based child processes: the mod (Issue 11) must use a small concurrency pool. Prefer `--output-format json` per worker job; streaming many children could flood IPC.
- macOS first. Windows (`claude.cmd`, PATH) is not handled.
- **Size:** M.

## Comments
