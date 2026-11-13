# 192: `ctx.agents.run` and the agent setting in Labs

**Origin:** `vault-mods` Issue 13, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/vault-mods/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** the frontend half of agent runs, on top of Issue 10's Rust runner. A mod action can start agent jobs, see their output in `run.log`, and stop them with Stop.

- **`ctx.agents.run({ prompt, model, agents?, mcpConfig?, maxBudgetUsd? }, { onLine? })`** resolving to `{ code, result, costUsd }`. It calls `mods_run_agent` through the typed `call()` (raw `invoke` is banned outside `src/lib/contracts/ipc.ts`), forwards streamed lines to `onLine`, and rejects with a host-tagged error (Issue 12) on a non-zero exit.
- **Cancel:** `run.signal` (Issue 06) calls `mods_kill_agent` for every job that run started. Mod unload and `teardownVault` call the kill-all (next to the run aborts Issue 06 added, `src/lib/app/lifecycle/app-lifecycle.service.ts:622`).
- **Labs field:** the `claude` path, written through `mods_set_agent_config` (Issue 10) and shown under the mods toggle. No spend ceiling and no Bash switch (owner decision, PRD 2026-11-06).
- Add the members to `contract/mod-api.v1.ts` and its freeze test.
- **Docs:** if Issue 07 has landed, extend `28-mods.md` and amend the mods ADR (the command, its reach, no spend ceiling; `maxBudgetUsd` is a client-side estimate and "spend can pass the cap", CLI reference). Otherwise 07 covers it.

**Blocked by:** 191

**Blocked by (origin):** closed blockers dropped: vault-mods 06.

**Status:** needs-info

Waits on the spike (Issue 09), like Issue 10.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first: the wrapper with `@tauri-apps/api/core` mocked: lines reach `onLine`; a non-zero exit rejects with the tag; aborting `run.signal` kills every job of that run; a mod unload kills its jobs; the Labs field calls the setter with the path.
- [ ] E2E: an action calls `ctx.agents.run` against the E2E stub and logs its result in the run view.

## Notes

- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** S.

## Comments
