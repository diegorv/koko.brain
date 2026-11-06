# 10: Agent runs from a mod

**What to build:** a mod can start LLM agent jobs, stream their output into `run.log`, and stop them with Stop. Shape depends on the owner's decisions; the recommended one is below.

## Owner decisions needed

PRD "Owner decisions needed" 1, 2 and 4:

1. **Engine:** the `claude` CLI (recommended, if Issue 09 passes) or the Messages API with a per-machine key.
2. **Command shape** (if the CLI): D1's typed `mods_run_agent` (recommended) or D3's generic `ctx.exec(programKey, argv)` with a per-machine allowlist. App commands have no ACL (`src-tauri/build.rs:23`): either is callable by any webview JS, QueryJS in any vault included. The owner should accept that explicitly.
3. **Spend and tools:** a per-machine spend ceiling per run, and Bash off unless a machine setting allows it (both recommended).

## Recommended shape

- **Rust:** `mods_run_agent { prompt, model, agents?, mcpConfig?, maxBudgetUsd, wantBash } -> runId` (`maxBudgetUsd` is clamped to the machine ceiling; `wantBash` is honored only if the machine config allows Bash), in a new `src-tauri/src/commands/mods_agent.rs`, registered in `src-tauri/src/lib.rs`. Rust builds the argv: the executable path from the Rust-side machine config below (never from the vault or the request), cwd an app-owned empty temp dir, `--add-dir <vault>`, `--setting-sources user`, `--strict-mcp-config` with an `--mcp-config` file Rust writes, `--tools` without Bash unless allowed, `--max-budget-usd` capped by the machine ceiling, `--output-format json` (or `stream-json` for a single job). Stream lines and the exit over a `tauri::ipc::Channel` (no app command uses one yet; the updater plugin does). `mods_kill_agent { runId }` and kill-all; children held in managed state next to `lib.rs:319-324`, killed on `teardownVault` and on `RunEvent::ExitRequested`, spawned in a process group.
- **Machine config lives in Rust, not in arguments.** The `claude` path and the spend ceiling are stored on the Rust side (a JSON file in the app data dir, outside every vault), written by a `mods_set_agent_config` command that only the Labs fields call, and read by `mods_run_agent`. They are never `mods_run_agent` arguments, and never in `localStorage`, which Rust cannot read. Honest limit: with no ACL on app commands, any webview JS can still call the setter. This keeps the mod API from naming a program; it is not a boundary (that needs an `AppManifest` ACL, Later).
- **Frontend:** `ctx.agents.run({ prompt, model, ... }, { onLine })` resolving to `{ code, result, costUsd }`; `run.signal` kills. Labs fields for the `claude` path and the ceiling.
- No program spawn other than `claude`. No `sh -c`.
- ts-rs DTOs (commit the regenerated `src/lib/contracts/generated/`), `CommandMap`, an E2E `HANDLERS` entry in `e2e/mocks/tauri-core.ts`.
- Docs and a mods ADR amendment: the spawn command, its reach, the soft budget cap ("spend can pass the cap", CLI reference).

**Blocked by:** 06, 07

Also waits on owner decisions 1, 2 and 4 (above), and on the findings of the spike in Issue 09. 09 merges nothing, so it is not on the Blocked by line: the ledger would never mark it done.

**Status:** needs-info

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first: Rust integration tests in `src-tauri/tests/` spawning a stand-in executable (echo lines, exit code, kill a sleeper, budget cap refused above the ceiling, argv never contains Bash unless allowed); a vitest for the wrapper with `@tauri-apps/api/core` mocked (signal kills, lines reach `onLine`).
- [ ] Manual pass in a Finder-launched build with real `claude`, steps in the commit.

## Notes

- Dozens of Node-based child processes: the mod (Issue 11) must use a small concurrency pool. Prefer `--output-format json` per worker job; streaming many children could flood IPC.
- macOS first. Windows (`claude.cmd`, PATH) is not handled.
- **Size:** L.

## Comments
